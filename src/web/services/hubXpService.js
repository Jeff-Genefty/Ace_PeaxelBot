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
    react: 5,
};

/** Jalons streak daily → bonus XP (+ carte optionnelle) */
export const STREAK_MILESTONES = {
    7: { xp: 100, cardTier: 'common', label: '7-day streak' },
    14: { xp: 200, cardTier: 'rare', label: '14-day streak' },
    30: { xp: 500, cardTier: 'epic', label: '30-day streak' },
};

/** Récompenses fin de GW (top XP hebdo) */
export const WEEKLY_PODIUM = [
    { rank: 1, cardTier: 'epic', xp: 150, emoji: '🥇' },
    { rank: 2, cardTier: 'rare', xp: 100, emoji: '🥈' },
    { rank: 3, cardTier: 'common', xp: 50, emoji: '🥉' },
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

function tierForLevel(level) {
    if (level >= 10) return 'epic';
    if (level >= 5) return 'rare';
    return 'common';
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
    };
}

function pushHistory(p, entry) {
    p.history.push({ at: new Date().toISOString(), ...entry });
    if (p.history.length > 50) p.history = p.history.slice(-50);
}

function maybeGrantLevelCards(p, oldLevel, newLevel) {
    const granted = [];
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const card = {
            id: `lvl_${lvl}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            reason: 'level_up',
            level: lvl,
            tier: tierForLevel(lvl),
            createdAt: new Date().toISOString(),
        };
        p.pendingCards.push(card);
        granted.push(card);
    }
    return granted;
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
    let cards = [];
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
            cards = maybeGrantLevelCards(p, oldLevel, next.level);
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
        cards,
    };
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
            maybeGrantLevelCards(p, oldLevel, next.level);
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
            maybeGrantLevelCards(p, oldLevel, next.level);
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
        card = { ...p.pendingCards[idx], claimedAt: new Date().toISOString() };
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
            + `**Tier:** ${card.tier || 'common'}\n`
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
                content: `🎁 <@${discordId}> a cliqué **Réclamer** · \`${card.reason}\` · ${card.tier || 'common'}`,
                embeds: [embed],
            });
        }
    } catch (err) {
        console.error('[HubXP] Card claim notify failed:', err.message);
    }
}

export function getWeeklyLeaderboard(limit = 10) {
    return getLeaderboardForWeek(weekKeyNow(), limit);
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
 * Récompense le podium XP de la semaine écoulée (appeler lundi avant reset naturel).
 * Anti-doublon via lastWeeklyPodiumWeekKey sur chaque user + flag global dans history.
 */
export function settleWeeklyPodium(previousWeekKey = weekKeyDaysAgo(1)) {
    const top = getLeaderboardForWeek(previousWeekKey, 3);
    const rewarded = [];

    for (const podium of WEEKLY_PODIUM) {
        const row = top.find((r) => r.rank === podium.rank);
        if (!row || row.xpWeek <= 0) continue;

        let granted = false;
        saveProfile(row.discordId, (p) => {
            if (p.lastWeeklyPodiumWeekKey === previousWeekKey) return p;
            p.lastWeeklyPodiumWeekKey = previousWeekKey;

            const oldLevel = computeLevelProgress(p.xpTotal).level;
            p.xpTotal = (p.xpTotal || 0) + podium.xp;
            // Ne pas ajouter à xpThisWeek (nouvelle GW) — bonus hors classement actuel
            pushHistory(p, {
                type: 'xp',
                amount: podium.xp,
                source: 'weekly_podium',
                rank: podium.rank,
                weekKey: previousWeekKey,
            });

            const card = {
                id: `podium_${podium.rank}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                reason: 'leaderboard_top3',
                tier: podium.cardTier,
                rank: podium.rank,
                weekKey: previousWeekKey,
                createdAt: new Date().toISOString(),
            };
            p.pendingCards.push(card);
            pushHistory(p, { type: 'card_pending', reason: 'leaderboard_top3', cardId: card.id, rank: podium.rank });

            const next = computeLevelProgress(p.xpTotal);
            p.level = next.level;
            if (next.level > oldLevel) {
                maybeGrantLevelCards(p, oldLevel, next.level);
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
            addLiveLog('XP', `Podium GW ${previousWeekKey} #${podium.rank} → ${row.username || row.discordId}`);
        }
    }

    return { weekKey: previousWeekKey, rewarded };
}

export async function announceWeeklyPodium(client, settlement) {
    if (!settlement?.rewarded?.length) return { success: false, reason: 'EMPTY' };
    const { getChannel } = await import('../../utils/configManager.js');
    const { EmbedBuilder } = await import('discord.js');
    const { applyHubFooter } = await import('../../utils/hubFooter.js');

    const channelId = getChannel('announce') || getChannel('welcome');
    if (!channelId) return { success: false, reason: 'NO_CHANNEL' };
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return { success: false, reason: 'CHANNEL_UNAVAILABLE' };

    const hubBase = process.env.WEB_BASE_URL || 'https://ace.peaxel.me';
    const lines = settlement.rewarded.map((r) =>
        `${r.emoji} <@${r.discordId}> — **${r.xpWeek} XP** this GW · bonus **+${r.bonusXp} XP** · **${r.cardTier}** card`,
    ).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`🏆 Hub podium · ${settlement.weekKey}`)
        .setColor(0xa855f7)
        .setDescription(
            'Top Hub XP earners of the last gameweek — rewards are in your **Hub chest**.\n\n'
            + `${lines}\n\n`
            + `Open the [Peaxel Hub](${hubBase}/app) → **Claim** your card, then finish via ticket.`,
        )
        .setFooter({ text: 'Peaxel Hub Pass · weekly XP podium' })
        .setTimestamp();

    const footerFile = applyHubFooter(embed, 'podium');
    await channel.send({
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
