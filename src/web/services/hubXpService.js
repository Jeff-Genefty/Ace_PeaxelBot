/**
 * Hub XP — courbe exponentielle + anti-farming.
 *
 * XP pour passer du niveau L → L+1 :
 *   5 * L² + 50 * L + 100
 *
 * Messages : 15–25 XP aléatoires, cooldown 60 s (1 message comptabilisé / minute).
 */

import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { updateJsonSync } from '../../utils/jsonStore.js';
import { getParisDate, getCurrentWeekNumber, getISOWeekNumber } from '../../utils/week.js';
import { addLiveLog } from './liveLogService.js';

const PROFILES_FILE = join(resolve('./data'), 'hub_profiles.json');

export const MESSAGE_XP_MIN = 15;
export const MESSAGE_XP_MAX = 25;
export const MESSAGE_XP_COOLDOWN_MS = 60_000;

/** Bonus fixes (hors messages) */
export const XP_REWARDS = {
    daily: 40,
    challenge_task: 25,
    challenge_complete: 100,
    feedback: 30,
    quiz_join: 15,
    quiz_win: 50,
    giveaway: 10,
};

/** Jalons streak daily → bonus XP (+ carte optionnelle) */
export const STREAK_MILESTONES = {
    7: { xp: 100, cardTier: 'common', label: '7-day streak' },
    14: { xp: 200, cardTier: 'common', label: '14-day streak' },
    30: { xp: 500, cardTier: 'common', label: '30-day streak' },
};

/** Récompense fin de GW — #1 XP hebdo (annonce dimanche soir) */
export const WEEKLY_PODIUM = [
    { rank: 1, cardTier: 'common', xp: 150, emoji: '🥇' },
];

const LEVEL_TITLES = [
    'Rookie', 'Prospect', 'Scout', 'Analyst', 'Strategist',
    'Elite', 'Captain', 'Champion', 'Legend', 'Hall of Fame',
];

function readProfiles() {
    if (!fs.existsSync(PROFILES_FILE)) return {};
    try { return JSON.parse(readFileSync(PROFILES_FILE, 'utf-8')); } catch { return {}; }
}

function defaultProfile() {
    return {
        xpTotal: 0,
        level: 0,
        username: null,
        lastMessageXpAt: null,
        lastDailyKey: null,
        dailyStreak: 0,
        streakMilestonesClaimed: [],
        lastWeeklyPodiumWeekKey: null,
        lastMessageDayKey: null,
        xpThisWeek: { weekKey: weekKeyNow(), amount: 0 },
        pendingCards: [],
        claimedCards: [],
        history: [],
    };
}

export function weekKeyNow() {
    const d = getParisDate();
    return `${d.getUTCFullYear()}-W${getCurrentWeekNumber()}`;
}

/** Week key for a Paris date N days ago (used for podium end-of-GW). */
export function weekKeyDaysAgo(days = 1) {
    const d = getParisDate();
    d.setUTCDate(d.getUTCDate() - days);
    return `${d.getUTCFullYear()}-W${getISOWeekNumber(d)}`;
}

export function parisDayKey() {
    const d = getParisDate();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** XP nécessaire pour passer du niveau `level` au suivant. */
export function xpToNextLevel(level) {
    const L = Math.max(0, Math.floor(level));
    return 5 * (L ** 2) + 50 * L + 100;
}

/** XP total cumulé requis pour atteindre un niveau. */
export function totalXpForLevel(level) {
    let total = 0;
    for (let i = 0; i < level; i++) total += xpToNextLevel(i);
    return total;
}

/** Calcule niveau + progression depuis un XP total. */
export function computeLevelProgress(xpTotal) {
    let level = 0;
    let remaining = Math.max(0, Math.floor(xpTotal));
    while (remaining >= xpToNextLevel(level)) {
        remaining -= xpToNextLevel(level);
        level += 1;
        if (level > 500) break; // safety
    }
    const need = xpToNextLevel(level);
    return {
        level,
        xpIntoLevel: remaining,
        xpToNext: need,
        progressPct: need ? Math.min(100, Math.round((remaining / need) * 100)) : 0,
        title: levelTitle(level),
    };
}

export function levelTitle(level) {
    if (level < LEVEL_TITLES.length) return LEVEL_TITLES[level];
    return LEVEL_TITLES[LEVEL_TITLES.length - 1];
}

function ensureWeekBucket(p) {
    const wk = weekKeyNow();
    if (!p.xpThisWeek || p.xpThisWeek.weekKey !== wk) {
        p.xpThisWeek = { weekKey: wk, amount: 0 };
    }
}

function saveProfile(discordId, updater, meta = {}) {
    let result = defaultProfile();
    updateJsonSync(PROFILES_FILE, {}, (all) => {
        const uid = String(discordId);
        const current = { ...defaultProfile(), ...(all[uid] || {}) };
        if (!current.pendingCards) current.pendingCards = [];
        if (!current.claimedCards) current.claimedCards = [];
        if (!current.history) current.history = [];
        ensureWeekBucket(current);
        if (meta.username) current.username = meta.username;
        result = updater(current);
        all[uid] = result;
        return all;
    });
    return result;
}

export function getHubProfile(discordId) {
    const raw = readProfiles()[String(discordId)] || defaultProfile();
    const progress = computeLevelProgress(raw.xpTotal || 0);
    ensureWeekBucket(raw);
    return {
        ...raw,
        ...progress,
        xpWeek: raw.xpThisWeek?.amount || 0,
        claimedDailyToday: raw.lastDailyKey === parisDayKey(),
        messagedToday: raw.lastMessageDayKey === parisDayKey(),
    };
}

/** Enregistre qu'un manager a écrit sur le serveur (requis pour /daily). */
export function recordServerMessage(discordId, meta = {}) {
    const today = parisDayKey();
    saveProfile(discordId, (p) => {
        p.lastMessageDayKey = today;
        return p;
    }, meta);
}

function pushHistory(p, entry) {
    p.history.push({ at: new Date().toISOString(), ...entry });
    if (p.history.length > 50) p.history = p.history.slice(-50);
}

/**
 * Ajoute de l'XP (sources hors message — pas de cooldown).
 * @returns {{ awarded: number, leveledUp: boolean, profile, cards: array }}
 */
export function addHubXp(discordId, amount, source, meta = {}) {
    const award = Math.max(0, Math.floor(amount));
    if (!award) {
        return { awarded: 0, leveledUp: false, profile: getHubProfile(discordId), cards: [] };
    }

    let leveledUp = false;
    let oldLevel = 0;

    const saved = saveProfile(discordId, (p) => {
        oldLevel = computeLevelProgress(p.xpTotal).level;
        p.xpTotal = (p.xpTotal || 0) + award;
        ensureWeekBucket(p);
        p.xpThisWeek.amount += award;
        pushHistory(p, { type: 'xp', amount: award, source });

        const next = computeLevelProgress(p.xpTotal);
        p.level = next.level;
        if (next.level > oldLevel) {
            leveledUp = true;
            pushHistory(p, { type: 'level_up', from: oldLevel, to: next.level });
        }
        return p;
    }, meta);

    if (!meta.silent) {
        addLiveLog('XP', `${meta.username || discordId} +${award} XP (${source})`);
    }
    if (leveledUp && !meta.silent) {
        addLiveLog('XP', `${meta.username || discordId} leveled up → ${saved.level}`);
    }

    return {
        awarded: award,
        leveledUp,
        oldLevel,
        profile: getHubProfile(discordId),
        cards: [],
    };
}

/**
 * Retire de l'XP (admin). Ne descend pas sous 0. Ajuste aussi xpThisWeek.
 * @returns {{ removed: number, profile }}
 */
export function removeHubXp(discordId, amount, source = 'admin_remove', meta = {}) {
    const remove = Math.max(0, Math.floor(amount));
    if (!remove) {
        return { removed: 0, profile: getHubProfile(discordId) };
    }

    let removed = 0;
    saveProfile(discordId, (p) => {
        const before = p.xpTotal || 0;
        removed = Math.min(before, remove);
        p.xpTotal = before - removed;
        ensureWeekBucket(p);
        p.xpThisWeek.amount = Math.max(0, (p.xpThisWeek.amount || 0) - removed);
        const next = computeLevelProgress(p.xpTotal);
        p.level = next.level;
        pushHistory(p, { type: 'xp', amount: -removed, source });
        return p;
    }, meta);

    if (removed && !meta.silent) {
        addLiveLog('XP', `${meta.username || discordId} −${removed} XP (${source})`);
    }
    return { removed, profile: getHubProfile(discordId) };
}

/** Remet xpThisWeek à 0 pour un user (ou tous si discordId null). */
export function resetWeeklyXp(discordId = null, meta = {}) {
    const wk = weekKeyNow();
    if (discordId) {
        saveProfile(discordId, (p) => {
            p.xpThisWeek = { weekKey: wk, amount: 0 };
            pushHistory(p, { type: 'admin', action: 'reset_weekly_xp' });
            return p;
        }, meta);
        if (!meta.silent) addLiveLog('XP', `Weekly XP reset · ${meta.username || discordId}`);
        return { ok: true, count: 1 };
    }

    let count = 0;
    updateJsonSync(PROFILES_FILE, {}, (all) => {
        for (const uid of Object.keys(all)) {
            const p = { ...defaultProfile(), ...all[uid] };
            p.xpThisWeek = { weekKey: wk, amount: 0 };
            if (!p.history) p.history = [];
            pushHistory(p, { type: 'admin', action: 'reset_weekly_xp_all' });
            all[uid] = p;
            count += 1;
        }
        return all;
    });
    if (!meta.silent) addLiveLog('XP', `Weekly XP reset for all · ${count} profiles`);
    return { ok: true, count };
}

/** Remet xpTotal + level + xpThisWeek à zéro pour un user. */
export function resetHubXp(discordId, meta = {}) {
    saveProfile(discordId, (p) => {
        p.xpTotal = 0;
        p.level = 0;
        p.xpThisWeek = { weekKey: weekKeyNow(), amount: 0 };
        pushHistory(p, { type: 'admin', action: 'reset_all_xp' });
        return p;
    }, meta);
    if (!meta.silent) addLiveLog('XP', `Full XP reset · ${meta.username || discordId}`);
    return { ok: true, profile: getHubProfile(discordId) };
}

/**
 * XP message : 15–25 XP, max 1 message / 60 s.
 * @returns {{ awarded: number, skipped: boolean, reason?: string, profile }}
 */
export function tryAwardMessageXp(discordId, meta = {}) {
    const now = Date.now();
    let skipped = false;
    let reason = null;
    let awarded = 0;

    saveProfile(discordId, (p) => {
        const last = p.lastMessageXpAt ? Date.parse(p.lastMessageXpAt) : 0;
        if (last && now - last < MESSAGE_XP_COOLDOWN_MS) {
            skipped = true;
            reason = 'cooldown';
            return p;
        }

        awarded = MESSAGE_XP_MIN + Math.floor(Math.random() * (MESSAGE_XP_MAX - MESSAGE_XP_MIN + 1));
        const oldLevel = computeLevelProgress(p.xpTotal).level;
        p.xpTotal = (p.xpTotal || 0) + awarded;
        p.lastMessageXpAt = new Date(now).toISOString();
        ensureWeekBucket(p);
        p.xpThisWeek.amount += awarded;
        pushHistory(p, { type: 'xp', amount: awarded, source: 'message' });

        const next = computeLevelProgress(p.xpTotal);
        p.level = next.level;
        if (next.level > oldLevel) {
            pushHistory(p, { type: 'level_up', from: oldLevel, to: next.level });
        }
        return p;
    }, meta);

    if (skipped) {
        return { awarded: 0, skipped: true, reason, profile: getHubProfile(discordId) };
    }

    return { awarded, skipped: false, profile: getHubProfile(discordId) };
}

/**
 * Daily connect — 1 fois par jour (timezone Paris).
 * Jalons streak 7 / 14 / 30 → bonus XP (+ carte).
 */
export function claimDailyConnect(discordId, meta = {}) {
    const today = parisDayKey();
    let result = { ok: false };

    saveProfile(discordId, (p) => {
        if (p.lastDailyKey === today) {
            result = { ok: false, reason: 'already_claimed', streak: p.dailyStreak || 0 };
            return p;
        }

        if (p.lastMessageDayKey !== today) {
            result = { ok: false, reason: 'need_message', streak: p.dailyStreak || 0 };
            return p;
        }

        const yesterday = (() => {
            const d = getParisDate();
            d.setUTCDate(d.getUTCDate() - 1);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        })();

        if (p.lastDailyKey === yesterday) {
            p.dailyStreak = (p.dailyStreak || 0) + 1;
        } else {
            p.dailyStreak = 1;
        }
        p.lastDailyKey = today;
        if (!p.streakMilestonesClaimed) p.streakMilestonesClaimed = [];

        let award = XP_REWARDS.daily;
        const milestonesHit = [];
        const streak = p.dailyStreak;

        for (const [n, bonus] of Object.entries(STREAK_MILESTONES)) {
            const dayN = Number(n);
            if (streak === dayN && !p.streakMilestonesClaimed.includes(dayN)) {
                award += bonus.xp;
                p.streakMilestonesClaimed.push(dayN);
                milestonesHit.push({ days: dayN, ...bonus });
                if (bonus.cardTier) {
                    const card = {
                        id: `streak_${dayN}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        reason: 'streak_milestone',
                        tier: bonus.cardTier,
                        streakDays: dayN,
                        createdAt: new Date().toISOString(),
                    };
                    p.pendingCards.push(card);
                    pushHistory(p, { type: 'card_pending', reason: 'streak_milestone', cardId: card.id, days: dayN });
                }
            }
        }

        const oldLevel = computeLevelProgress(p.xpTotal).level;
        p.xpTotal = (p.xpTotal || 0) + award;
        ensureWeekBucket(p);
        p.xpThisWeek.amount += award;
        pushHistory(p, { type: 'xp', amount: award, source: 'daily', streak });

        const next = computeLevelProgress(p.xpTotal);
        p.level = next.level;
        if (next.level > oldLevel) {
            pushHistory(p, { type: 'level_up', from: oldLevel, to: next.level });
        }

        result = {
            ok: true,
            awarded: award,
            baseAward: XP_REWARDS.daily,
            streak,
            milestonesHit,
            leveledUp: next.level > oldLevel,
            level: next.level,
        };
        return p;
    }, meta);

    if (result.ok && !meta.silent) {
        const mile = result.milestonesHit?.length
            ? ` · milestone ${result.milestonesHit.map((m) => m.days + 'd').join(',')}`
            : '';
        addLiveLog('XP', `${meta.username || discordId} daily +${result.awarded} XP · streak ${result.streak}${mile}`);
    }

    return { ...result, profile: getHubProfile(discordId) };
}

/** Ajoute une carte pending (quête hebdo, etc.) */
export function grantPendingCard(discordId, reason, extra = {}) {
    let card = null;
    saveProfile(discordId, (p) => {
        card = {
            id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            reason,
            tier: extra.tier || 'common',
            gameweek: extra.gameweek || getCurrentWeekNumber(),
            createdAt: new Date().toISOString(),
            ...extra,
        };
        p.pendingCards.push(card);
        pushHistory(p, { type: 'card_pending', reason, cardId: card.id });
        return p;
    }, { username: extra.username });
    return card;
}

/**
 * Marque une carte pending comme claimée (V1 — ticket Discord).
 * @returns {{ ok: boolean, card?: object, reason?: string, ticketUrl?: string }}
 */
export function claimPendingCard(discordId, cardId, meta = {}) {
    let card = null;
    let ok = false;

    saveProfile(discordId, (p) => {
        const idx = (p.pendingCards || []).findIndex((c) => c.id === cardId);
        if (idx < 0) return p;
        card = {
            ...p.pendingCards[idx],
            claimedAt: new Date().toISOString(),
            fulfilled: false,
        };
        p.pendingCards.splice(idx, 1);
        if (!p.claimedCards) p.claimedCards = [];
        p.claimedCards.push(card);
        pushHistory(p, { type: 'card_claimed', cardId, reason: card.reason });
        ok = true;
        return p;
    }, meta);

    if (!ok) return { ok: false, reason: 'not_found' };

    addLiveLog('XP', `${meta.username || discordId} claimed card ${cardId} (${card.reason})`);
    return { ok: true, card };
}

export async function notifyCardClaim(client, discordId, username, card) {
    const { CHALLENGE_LOG_CHANNEL_ID } = await import('./weeklyChallengeService.js');
    const { getTicketChannelId } = await import('../../utils/configManager.js');
    const { EmbedBuilder } = await import('discord.js');

    const ticketId = getTicketChannelId();
    const ticketHint = ticketId ? `<#${ticketId}>` : 'the ticket channel';

    const embed = new EmbedBuilder()
        .setTitle('🎁 Claim carte Hub')
        .setColor(0xa855f7)
        .setDescription(
            `<@${discordId}> réclame une carte Hub.\n\n`
            + `**Manager:** ${username}\n`
            + `**Raison:** ${card.reason}\n`
            + `**ID:** \`${card.id}\`\n`
            + (card.gameweek ? `**GW:** ${card.gameweek}\n` : '')
            + (card.level ? `**Level-up:** ${card.level}\n` : '')
            + `\n📩 Attendu via ticket ${ticketHint}.`,
        )
        .setTimestamp();

    try {
        const channel = await client.channels.fetch(CHALLENGE_LOG_CHANNEL_ID);
        if (channel?.isTextBased()) {
            await channel.send({
                content: `🎁 <@${discordId}> a cliqué **Réclamer** · \`${card.reason}\``,
                embeds: [embed],
            });
        }
    } catch (err) {
        console.error('[HubXP] Card claim notify failed:', err.message);
    }
}

/** Marque une carte claimée comme livrée (admin). */
export function fulfillClaimedCard(discordId, cardId, meta = {}) {
    let ok = false;
    saveProfile(discordId, (p) => {
        const card = (p.claimedCards || []).find((c) => c.id === cardId);
        if (!card) return p;
        card.fulfilled = true;
        card.fulfilledAt = new Date().toISOString();
        pushHistory(p, { type: 'card_fulfilled', cardId });
        ok = true;
        return p;
    }, meta);
    if (ok && !meta.silent) {
        addLiveLog('XP', `Card fulfilled · ${meta.username || discordId} · ${cardId}`);
    }
    return { ok };
}

/** Vue d'ensemble coffre — pending + claims en attente de livraison. */
export function getCardVaultOverview() {
    const all = readProfiles();
    const pending = [];
    const awaitingDelivery = [];
    const fulfilled = [];

    for (const [discordId, p] of Object.entries(all)) {
        const username = p.username || null;
        for (const card of p.pendingCards || []) {
            pending.push({
                discordId,
                username,
                ...card,
                status: 'pending_claim',
            });
        }
        for (const card of p.claimedCards || []) {
            const row = { discordId, username, ...card };
            if (card.fulfilled) fulfilled.push(row);
            else awaitingDelivery.push({ ...row, status: 'awaiting_delivery' });
        }
    }

    const byDate = (a, b) => String(b.claimedAt || b.createdAt || '').localeCompare(String(a.claimedAt || a.createdAt || ''));
    pending.sort(byDate);
    awaitingDelivery.sort(byDate);
    fulfilled.sort(byDate);

    return {
        pending,
        awaitingDelivery,
        fulfilled: fulfilled.slice(0, 50),
        counts: {
            pending: pending.length,
            awaitingDelivery: awaitingDelivery.length,
            fulfilled: fulfilled.length,
        },
    };
}

export function getWeeklyLeaderboard(limit = 10) {
    return getLeaderboardForWeek(weekKeyNow(), limit);
}

export function getGlobalLeaderboard(limit = 25) {
    const all = readProfiles();
    const rows = Object.entries(all).map(([discordId, p]) => {
        const progress = computeLevelProgress(p.xpTotal || 0);
        const wk = weekKeyNow();
        const weekAmt = p.xpThisWeek?.weekKey === wk ? (p.xpThisWeek.amount || 0) : 0;
        return {
            discordId,
            username: p.username || null,
            xpWeek: weekAmt,
            xpTotal: p.xpTotal || 0,
            level: progress.level,
            title: progress.title,
        };
    }).filter((r) => r.xpTotal > 0);
    rows.sort((a, b) => b.xpTotal - a.xpTotal || b.xpWeek - a.xpWeek);
    return rows.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

export function getLeaderboardForWeek(weekKey, limit = 10) {
    const all = readProfiles();
    const rows = Object.entries(all).map(([discordId, p]) => {
        const weekAmt = p.xpThisWeek?.weekKey === weekKey ? (p.xpThisWeek.amount || 0) : 0;
        const progress = computeLevelProgress(p.xpTotal || 0);
        return {
            discordId,
            username: p.username || null,
            xpWeek: weekAmt,
            xpTotal: p.xpTotal || 0,
            level: progress.level,
            title: progress.title,
        };
    }).filter((r) => r.xpWeek > 0);
    rows.sort((a, b) => b.xpWeek - a.xpWeek || b.xpTotal - a.xpTotal);
    return rows.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Récompense le #1 XP de la semaine (appeler dimanche soir — weekKey courante).
 * Anti-doublon via lastWeeklyPodiumWeekKey.
 */
export function settleWeeklyPodium(weekKey = weekKeyNow()) {
    const top = getLeaderboardForWeek(weekKey, 1);
    const rewarded = [];

    for (const podium of WEEKLY_PODIUM) {
        const row = top.find((r) => r.rank === podium.rank);
        if (!row || row.xpWeek <= 0) continue;

        let granted = false;
        saveProfile(row.discordId, (p) => {
            if (p.lastWeeklyPodiumWeekKey === weekKey) return p;
            p.lastWeeklyPodiumWeekKey = weekKey;

            const oldLevel = computeLevelProgress(p.xpTotal).level;
            p.xpTotal = (p.xpTotal || 0) + podium.xp;
            // Bonus hors classement hebdo courant (déjà figé pour l'annonce)
            pushHistory(p, {
                type: 'xp',
                amount: podium.xp,
                source: 'weekly_podium',
                rank: podium.rank,
                weekKey,
            });

            const card = {
                id: `podium_${podium.rank}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                reason: 'leaderboard_weekly',
                tier: podium.cardTier,
                rank: podium.rank,
                weekKey,
                createdAt: new Date().toISOString(),
            };
            p.pendingCards.push(card);
            pushHistory(p, { type: 'card_pending', reason: 'leaderboard_weekly', cardId: card.id, rank: podium.rank });

            const next = computeLevelProgress(p.xpTotal);
            p.level = next.level;
            if (next.level > oldLevel) {
                pushHistory(p, { type: 'level_up', from: oldLevel, to: next.level });
            }
            granted = true;
            return p;
        }, { username: row.username });

        if (granted) {
            rewarded.push({
                ...row,
                emoji: podium.emoji,
                cardTier: podium.cardTier,
                bonusXp: podium.xp,
            });
            addLiveLog('XP', `Weekly XP #1 ${weekKey} → ${row.username || row.discordId}`);
        }
    }

    return { weekKey, rewarded };
}

export async function announceWeeklyPodium(client, settlement) {
    if (!settlement?.rewarded?.length) return { success: false, reason: 'EMPTY' };
    const { getChannel, getTicketChannelId } = await import('../../utils/configManager.js');
    const { EmbedBuilder } = await import('discord.js');
    const { applyHubFooter } = await import('../../utils/hubFooter.js');

    const channelId = getChannel('announce') || getChannel('welcome');
    if (!channelId) return { success: false, reason: 'NO_CHANNEL' };
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return { success: false, reason: 'CHANNEL_UNAVAILABLE' };

    const winner = settlement.rewarded[0];
    const ticketId = getTicketChannelId();
    const ticketMention = ticketId ? `<#${ticketId}>` : 'the support ticket channel';
    const hubBase = process.env.WEB_BASE_URL || 'https://peaxel.genefty.com';

    const embed = new EmbedBuilder()
        .setTitle(`🏆 Weekly XP champion · ${settlement.weekKey}`)
        .setColor(0xa855f7)
        .setDescription(
            `${winner.emoji} <@${winner.discordId}> topped the Hub leaderboard this week with **${winner.xpWeek} XP**!\n\n`
            + `You've won an **Athlete Card** (+${winner.bonusXp} bonus XP already added).\n\n`
            + `**Claim your card**\n`
            + `1. Open the [Peaxel Hub](${hubBase}/app) → **Claim** in your card vault\n`
            + `2. Open a ticket in ${ticketMention} to receive your card`,
        )
        .setFooter({ text: 'Peaxel Hub · weekly XP winner' })
        .setTimestamp();

    const footerFile = applyHubFooter(embed, 'podium');
    await channel.send({
        content: `🏆 <@${winner.discordId}> — you earned the most Hub XP this week! Open a ticket to claim your Athlete Card.`,
        embeds: [embed],
        files: footerFile ? [footerFile] : [],
    });
    return { success: true };
}

export function getUserWeekRank(discordId) {
    const wk = weekKeyNow();
    const all = readProfiles();
    const rows = Object.entries(all).map(([id, p]) => ({
        discordId: id,
        xpWeek: p.xpThisWeek?.weekKey === wk ? (p.xpThisWeek.amount || 0) : 0,
        xpTotal: p.xpTotal || 0,
    }));
    rows.sort((a, b) => b.xpWeek - a.xpWeek || b.xpTotal - a.xpTotal);
    const idx = rows.findIndex((r) => r.discordId === String(discordId));
    if (idx < 0) return { rank: null, xpWeek: 0, total: rows.length };
    return { rank: idx + 1, xpWeek: rows[idx].xpWeek, total: rows.length };
}

export function getUserGlobalRank(discordId) {
    const all = readProfiles();
    const rows = Object.entries(all)
        .map(([id, p]) => ({
            discordId: id,
            xpTotal: p.xpTotal || 0,
            xpWeek: p.xpThisWeek?.weekKey === weekKeyNow() ? (p.xpThisWeek.amount || 0) : 0,
        }))
        .filter((r) => r.xpTotal > 0);
    rows.sort((a, b) => b.xpTotal - a.xpTotal || b.xpWeek - a.xpWeek);
    const idx = rows.findIndex((r) => r.discordId === String(discordId));
    if (idx < 0) return { rank: null, xpTotal: 0, total: rows.length };
    return { rank: idx + 1, xpTotal: rows[idx].xpTotal, total: rows.length };
}
