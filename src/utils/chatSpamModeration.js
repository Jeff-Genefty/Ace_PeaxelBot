/**
 * Anti-spam chat Ace (#general) — suppressions, warnings, mute progressif.
 *
 * Escalade (strikes sur 24 h) :
 *  1 → warning seul
 *  2 → mute 1 min
 *  3 → mute 5 min
 *  4 → mute 15 min
 *  5 → mute 60 min
 *  6+ → mute 24 h
 */

import { EmbedBuilder } from 'discord.js';
import { resolve } from 'path';
import { readJsonSync, updateJsonSync, writeJsonSync } from './jsonStore.js';
import { getChannel, getMuteRoleId, getStaffExcludedRoles } from './configManager.js';
import { addLiveLog } from '../web/services/liveLogService.js';

const STORE_PATH = resolve('./data/chat_moderation.json');
const WARN_WINDOW_MS = 24 * 60 * 60 * 1000;
const ALERT_DELETE_MS = 12_000;

/** Durées de mute selon le n° de strike (après ce strike) */
const MUTE_MS_BY_STRIKE = {
    1: 0,
    2: 60_000,
    3: 5 * 60_000,
    4: 15 * 60_000,
    5: 60 * 60_000,
};

function muteMsForStrike(n) {
    if (n <= 1) return 0;
    if (n >= 6) return 24 * 60 * 60_000;
    return MUTE_MS_BY_STRIKE[n] ?? 60_000;
}

function formatDuration(ms) {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)} min`;
    if (ms < 24 * 60 * 60_000) return `${Math.round(ms / (60 * 60_000))}h`;
    return `${Math.round(ms / (24 * 60 * 60_000))}d`;
}

function defaultStore() {
    return { users: {}, activeMutes: {} };
}

function loadStore() {
    return { ...defaultStore(), ...readJsonSync(STORE_PATH, defaultStore()) };
}

function saveStore(store) {
    writeJsonSync(STORE_PATH, store);
}

/**
 * Détecte un message sans intérêt communautaire (farm XP / bruit).
 */
export function isChatSpamMessage(content, { attachmentCount = 0 } = {}) {
    const raw = String(content || '');
    // Retire les emoji Discord custom <:name:id> / <a:name:id>
    const trimmed = raw.replace(/<a?:\w+:\d+>/g, '').trim();

    // Image seule sans légende : OK (partage de cartes)
    if (!trimmed && attachmentCount > 0) return false;
    if (!trimmed) return true;

    // Uniquement emoji / ponctuation / symboles (pas de lettre ni chiffre)
    const alnum = trimmed.replace(/[^\p{L}\p{N}]+/gu, '');
    if (alnum.length === 0) return true;

    // Trop court après nettoyage (K, L, M, Z, La, ..)
    if (alnum.length < 3) return true;

    const emojiMatches = trimmed.match(/\p{Extended_Pictographic}/gu) || [];
    // Emoji + mot très court (ex. 🙂niche, files🦋)
    if (emojiMatches.length >= 1 && alnum.length <= 5) return true;
    // Plusieurs emoji et peu de lettres
    if (emojiMatches.length >= 2 && alnum.length <= 8) return true;

    // Mot unique très court (Image, yeah, lol, TWIMC..)
    const words = alnum.match(/[\p{L}\p{N}]+/gu) || [];
    if (words.length === 1 && words[0].length <= 5) return true;

    // Répétition du même caractère (aaaa, ...., 🥹🥹🥹)
    const collapsed = trimmed.replace(/(.)\1{3,}/gu, '$1');
    if (collapsed.length <= 2 && trimmed.length >= 4) return true;

    return false;
}

function pruneOldWarnings(warnings, now = Date.now()) {
    return (warnings || []).filter((ts) => now - ts < WARN_WINDOW_MS);
}

function recordStrike(userId) {
    const now = Date.now();
    let strikeCount = 1;
    updateJsonSync(STORE_PATH, defaultStore(), (store) => {
        if (!store.users) store.users = {};
        const uid = String(userId);
        const current = store.users[uid] || { warnings: [] };
        current.warnings = pruneOldWarnings(current.warnings, now);
        current.warnings.push(now);
        current.lastStrikeAt = new Date(now).toISOString();
        store.users[uid] = current;
        strikeCount = current.warnings.length;
        return store;
    });
    return strikeCount;
}

async function applyMute(member, muteRoleId, durationMs) {
    if (!muteRoleId || durationMs <= 0) return { muted: false };

    await member.roles.add(muteRoleId, 'Peaxel Ace anti-spam');
    const until = Date.now() + durationMs;

    updateJsonSync(STORE_PATH, defaultStore(), (store) => {
        if (!store.activeMutes) store.activeMutes = {};
        store.activeMutes[member.id] = {
            until,
            roleId: muteRoleId,
            startedAt: new Date().toISOString(),
        };
        return store;
    });

    scheduleUnmute(member.client, member.guild.id, member.id, muteRoleId, durationMs);
    return { muted: true, until, durationMs };
}

const unmuteTimers = new Map();

function scheduleUnmute(client, guildId, userId, roleId, delayMs) {
    const key = `${guildId}:${userId}`;
    const existing = unmuteTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
        unmuteTimers.delete(key);
        await clearMute(client, guildId, userId, roleId);
    }, Math.max(delayMs, 500));

    if (typeof timer.unref === 'function') timer.unref();
    unmuteTimers.set(key, timer);
}

export async function clearMute(client, guildId, userId, roleId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId).catch(() => null);
        const muteRole = roleId || getMuteRoleId();
        if (member && muteRole && member.roles.cache.has(muteRole)) {
            await member.roles.remove(muteRole, 'Peaxel Ace mute expired');
        }
    } catch (err) {
        console.error('[ChatMod] Unmute failed:', err.message);
    }

    updateJsonSync(STORE_PATH, defaultStore(), (store) => {
        if (store.activeMutes?.[userId]) delete store.activeMutes[userId];
        return store;
    });
}

/** Au boot : reprogrammer / nettoyer les mutes actifs. */
export async function restoreActiveMutes(client) {
    const store = loadStore();
    const now = Date.now();
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) return;

    for (const [userId, mute] of Object.entries(store.activeMutes || {})) {
        const roleId = mute.roleId || getMuteRoleId();
        const remaining = (mute.until || 0) - now;
        if (remaining <= 0) {
            await clearMute(client, guildId, userId, roleId);
        } else {
            scheduleUnmute(client, guildId, userId, roleId, remaining);
        }
    }
}

function buildWarningEmbed({ strikeCount, muteMs, localeHint = 'en' }) {
    const muteLine = muteMs > 0
        ? (localeHint === 'fr'
            ? `\n🔇 **Mute :** ${formatDuration(muteMs)}`
            : `\n🔇 **Mute:** ${formatDuration(muteMs)}`)
        : '';

    return new EmbedBuilder()
        .setColor(muteMs > 0 ? 0xef4444 : 0xf59e0b)
        .setTitle(localeHint === 'fr' ? '⚠️ Ace — anti-spam' : '⚠️ Ace — anti-spam')
        .setDescription(
            (localeHint === 'fr'
                ? `Ton message a été **supprimé** : trop court / emojis seuls / sans contenu utile pour la communauté.\n\n`
                  + `**Warning ${strikeCount}/6** (fenêtre 24 h).`
                  + muteLine
                  + `\n\nÉcris des messages réels — le farm XP / quêtes avec du bruit mène à des mutes plus longs.`
                : `Your message was **deleted**: too short / emoji-only / no useful content for the community.\n\n`
                  + `**Warning ${strikeCount}/6** (24h window).`
                  + muteLine
                  + `\n\nPost real messages — farming XP/quests with noise leads to longer mutes.`),
        )
        .setFooter({ text: 'Peaxel Hub · Fair play' })
        .setTimestamp();
}

/**
 * @returns {Promise<boolean>} true si le message a été traité comme spam (ne pas XP/quête)
 */
export async function handleChatSpamModeration(message) {
    const generalId = getChannel('welcome');
    if (!generalId || message.channel?.id !== generalId) return false;
    if (message.author?.bot) return false;
    if (!message.guild || message.guild.id !== process.env.DISCORD_GUILD_ID) return false;

    const staffRoles = getStaffExcludedRoles();
    if (message.member?.roles.cache.some((r) => staffRoles.includes(r.id))) return false;

    const attachmentCount = message.attachments?.size || 0;
    if (!isChatSpamMessage(message.content, { attachmentCount })) return false;

    // Supprimer le message spam
    await message.delete().catch(() => null);

    const strikeCount = recordStrike(message.author.id);
    const muteMs = muteMsForStrike(strikeCount);
    const muteRoleId = getMuteRoleId();

    let muted = false;
    if (muteMs > 0 && muteRoleId && message.member) {
        try {
            const result = await applyMute(message.member, muteRoleId, muteMs);
            muted = result.muted;
        } catch (err) {
            console.error('[ChatMod] Mute apply failed:', err.message);
            addLiveLog('MOD', `Anti-spam mute FAILED for ${message.author.tag}: ${err.message}`);
        }
    }

    const embed = buildWarningEmbed({ strikeCount, muteMs: muted ? muteMs : 0 });
    const alert = await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [embed],
    }).catch(() => null);

    if (alert) {
        setTimeout(() => alert.delete().catch(() => null), ALERT_DELETE_MS);
    }

    addLiveLog(
        'MOD',
        `Anti-spam · ${message.author.tag} · strike ${strikeCount}`
        + (muted ? ` · mute ${formatDuration(muteMs)}` : ''),
    );

    return true;
}
