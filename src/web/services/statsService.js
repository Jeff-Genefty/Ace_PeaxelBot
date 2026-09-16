import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { getRole } from '../../utils/configManager.js';
import { getCurrentWeekNumber, getCurrentDayName } from '../../utils/week.js';
import { loadActivity, getNextScheduledRun, getUptime } from '../../utils/activityTracker.js';
import { getFeedbackStats } from '../../utils/feedbackStore.js';
import { getGiveawayState } from './giveawayService.js';
import { getGameweekStatus } from './gameweekService.js';
import { getLiveLogs } from './liveLogService.js';
import {
    getHubEngagementStats,
    getCardVaultOverview,
    parisDayKey,
    parisDayKeyDaysAgo,
} from './hubXpService.js';
import { getChallengeWeekStats } from './weeklyChallengeService.js';

const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const FEEDBACK_FILE = join(DATA_DIR, 'feedbacks.json');
const VAULT_SLA_MS = 48 * 60 * 60 * 1000;

const cache = {
    admin: { data: null, expiresAt: 0 },
    public: { data: null, expiresAt: 0 },
};

const ADMIN_TTL = 30_000;
const PUBLIC_TTL = 60_000;

export function invalidateStatsCache(scope = 'all') {
    if (scope === 'all' || scope === 'admin') cache.admin = { data: null, expiresAt: 0 };
    if (scope === 'all' || scope === 'public') cache.public = { data: null, expiresAt: 0 };
}

function readJson(path, fallback) {
    if (!fs.existsSync(path)) return fallback;
    try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return fallback; }
}

function emptyBreakdown() {
    return { messages: 0, commands: 0, feedbacks: 0 };
}

/** Compteurs journaliers séparés (messages / commandes / feedbacks). */
function dayBreakdown(stats, dayKey) {
    const modern = stats.dailyBreakdown?.[dayKey];
    if (modern) {
        return {
            messages: modern.messages || 0,
            commands: modern.commands || 0,
            feedbacks: modern.feedbacks || 0,
        };
    }
    // Legacy : dailyHistory mélangeait tout — on ne l'utilise que comme proxy messages
    const legacy = stats.dailyHistory?.[dayKey];
    if (typeof legacy === 'number') {
        return { messages: legacy, commands: 0, feedbacks: 0 };
    }
    const hist = stats.history?.[dayKey];
    if (hist && (hist.messages != null || hist.commands != null)) {
        return {
            messages: hist.messages || 0,
            commands: hist.commands || 0,
            feedbacks: hist.feedbacks || 0,
        };
    }
    return emptyBreakdown();
}

function sumBreakdown(stats, dayKeys, field) {
    return dayKeys.reduce((acc, d) => acc + (dayBreakdown(stats, d)[field] || 0), 0);
}

function parisLastNDays(n) {
    const keys = [];
    for (let i = n - 1; i >= 0; i--) keys.push(parisDayKeyDaysAgo(i));
    return keys;
}

function pctChange(current, previous) {
    if (previous == null || previous === 0) {
        if (current === 0) return '0.0';
        return current > 0 ? '+100.0' : '0.0';
    }
    const raw = ((current - previous) / Math.abs(previous)) * 100;
    const fixed = raw.toFixed(1);
    return raw > 0 ? `+${fixed}` : fixed;
}

function vaultSlaStats() {
    const vault = getCardVaultOverview();
    const now = Date.now();
    let slaBreaches = 0;
    for (const card of vault.awaitingDelivery || []) {
        const ts = Date.parse(card.claimedAt || card.createdAt || '');
        if (Number.isFinite(ts) && now - ts > VAULT_SLA_MS) slaBreaches += 1;
    }
    return {
        pending: vault.counts.pending,
        awaitingDelivery: vault.counts.awaitingDelivery,
        slaBreaches,
    };
}

export async function gatherAdminStats(client, locale = 'en') {
    const now = Date.now();
    if (cache.admin.data && now < cache.admin.expiresAt) {
        return cache.admin.data;
    }

    const stats = readJson(STATS_FILE, {
        messagesSent: 0, commandsExecuted: 0, feedbacksReceived: 0,
        arrivalsToday: 0, dailyActiveRoleUsers: [], dailyHistory: {},
        dailyBreakdown: {}, history: {}, totalBans: 0,
    });
    const feedbacks = readJson(FEEDBACK_FILE, []);
    const { logs: liveLogs } = getLiveLogs({ limit: 50 });
    const activity = loadActivity();
    const feedbackStats = getFeedbackStats();
    const nextRun = getNextScheduledRun();
    const hubToday = getHubEngagementStats();
    const hubYesterdayLive = getHubEngagementStats(parisDayKeyDaysAgo(1));
    const challenges = getChallengeWeekStats();
    const vault = vaultSlaStats();
    const today = parisDayKey();
    const yesterday = parisDayKeyDaysAgo(1);
    const last7 = parisLastNDays(7);
    const prev7 = parisLastNDays(14).slice(0, 7);
    const dacYesterday = stats.history?.[yesterday]?.dac ?? hubYesterdayLive.dac;

    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;
    const activityRoleId = getRole('activityTrack');
    const roleMembers = activityRoleId
        ? (guild?.roles.cache.get(activityRoleId)?.members.size || 0)
        : 0;
    const activeToday = stats.dailyActiveRoleUsers?.length || 0;
    const activePopRate = roleMembers > 0
        ? ((activeToday / roleMembers) * 100).toFixed(1)
        : '0.0';

    const historyDates = Object.keys(stats.history || {}).sort();
    let weeklyGrowth = '0.0';
    if (historyDates.length >= 7) {
        const last = stats.history[historyDates.at(-1)].totalMembers;
        const first = stats.history[historyDates.at(-7)].totalMembers;
        if (first > 0) weeklyGrowth = (((last - first) / first) * 100).toFixed(1);
    } else if (guild?.memberCount && historyDates.length >= 1) {
        const first = stats.history[historyDates[0]].totalMembers;
        if (first > 0) {
            weeklyGrowth = (((guild.memberCount - first) / first) * 100).toFixed(1);
        }
    }

    const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : '0.0';

    const todayBd = dayBreakdown(stats, today);
    const messages7d = sumBreakdown(stats, last7, 'messages');
    const commands7d = sumBreakdown(stats, last7, 'commands');
    const messagesPrev7d = sumBreakdown(stats, prev7, 'messages');

    const arrivalsToday = stats.arrivalsToday || 0;
    const arrivals7d = last7.reduce((acc, d, idx) => {
        if (idx === last7.length - 1) return acc + arrivalsToday;
        return acc + (stats.history?.[d]?.arrivals || 0);
    }, 0);
    const arrivalsPrev7d = prev7.reduce((acc, d) => acc + (stats.history?.[d]?.arrivals || 0), 0);

    const dacTrend = last7.map((d) => {
        if (d === today) return hubToday.dac;
        if (stats.history?.[d]?.dac != null) return stats.history[d].dac;
        if (d === yesterday) return dacYesterday;
        return 0;
    });
    const arrivalTrend = last7.map((d, idx) => {
        if (idx === last7.length - 1) return arrivalsToday;
        return stats.history?.[d]?.arrivals || 0;
    });
    const memberTrend = last7.map((d, idx) => {
        if (idx === last7.length - 1) return guild?.memberCount || stats.history?.[d]?.totalMembers || 0;
        return stats.history?.[d]?.totalMembers || 0;
    });
    const roleActivityTrend = last7.map((d, idx) => {
        if (idx === last7.length - 1) return parseFloat(activePopRate);
        return parseFloat(stats.history?.[d]?.roleActivity || 0);
    });
    const messageCounts = last7.map((d) => dayBreakdown(stats, d).messages);
    const commandCounts = last7.map((d) => dayBreakdown(stats, d).commands);

    const giveaway = getGiveawayState();
    const giveawayFile = readJson(join(DATA_DIR, 'giveaways.json'), {});
    const participants = giveaway.participantCount ? giveawayFile.participants || [] : [];
    const tags = giveawayFile.participantTags || [];
    const participantList = [];
    for (let i = 0; i < participants.length; i++) {
        const userId = participants[i];
        const tag = tags[i];
        if (tag) participantList.push(tag);
        else {
            const cached = client.users.cache.get(userId);
            participantList.push(cached ? cached.tag : `Unknown (${userId})`);
        }
    }

    const historyTable = [...last7].reverse().map((date) => {
        const h = stats.history?.[date] || {};
        const bd = dayBreakdown(stats, date);
        const isToday = date === today;
        return {
            date,
            isToday,
            totalMembers: isToday ? (guild?.memberCount || h.totalMembers || 0) : (h.totalMembers ?? null),
            arrivals: isToday ? arrivalsToday : (h.arrivals || 0),
            dac: isToday
                ? hubToday.dac
                : (h.dac ?? (date === yesterday ? dacYesterday : null)),
            roleActivity: isToday ? activePopRate : (h.roleActivity ?? '0.0'),
            messages: bd.messages,
            commands: bd.commands,
        };
    });

    const result = {
        stats,
        feedbacks,
        liveLogs,
        guild,
        isEmergency: !client.isReady() || client.ws.ping > 250,
        ping: client.ws.ping ?? 0,
        period: { today, timezone: 'Europe/Paris', last7, prev7 },
        kpis: {
            // Growth
            dac: hubToday.dac,
            dacYesterday,
            dacDelta: pctChange(hubToday.dac, dacYesterday),
            streakGe3: hubToday.streakGe3,
            streakGe7: hubToday.streakGe7,
            arrivalsToday,
            arrivals7d,
            arrivalsDelta7d: pctChange(arrivals7d, arrivalsPrev7d),
            activeToday,
            activePopRate,
            challengeParticipants: challenges.participants,
            challengeQuestComplete: challenges.questComplete,
            challengeTaskCount: challenges.taskCount,
            giveawayCount: giveaway.participantCount,
            vaultPending: vault.pending,
            vaultAwaiting: vault.awaitingDelivery,
            vaultSlaBreaches: vault.slaBreaches,
            avgRating,
            totalFeedbacks: feedbacks.length,
            weeklyGrowth,
            // Ops
            messagesToday: todayBd.messages,
            commandsToday: todayBd.commands,
            feedbacksToday: todayBd.feedbacks,
            messages7d,
            commands7d,
            messagesDelta7d: pctChange(messages7d, messagesPrev7d),
            totalBans: stats.totalBans || 0,
            memberCount: guild?.memberCount || 0,
            messagesSent: stats.messagesSent || 0,
            commandsExecuted: stats.commandsExecuted || 0,
            totalPosts: activity.totalPostsSent || 0,
            gameweek: getCurrentWeekNumber(),
            dayName: getCurrentDayName(locale),
        },
        charts: {
            dates: last7,
            messageCounts,
            commandCounts,
            dacTrend,
            last7History: last7,
            memberTrend,
            arrivalTrend,
            roleActivityTrend,
        },
        historyTable,
        giveaway: {
            count: giveaway.participantCount,
            list: participantList.join(', ') || (locale === 'fr' ? 'Aucun participant' : 'No participants'),
            status: giveaway.status,
        },
        scheduler: {
            nextLabel: nextRun.label,
            hoursUntil: nextRun.hoursUntil,
            uptime: getUptime(activity.botStartedAt),
        },
        feedbackStats,
        challenges,
        vault,
    };

    cache.admin = { data: result, expiresAt: now + ADMIN_TTL };
    return result;
}

export async function gatherPublicStats(client, locale = 'en', discordId = null) {
    const now = Date.now();
    const cacheKey = discordId || 'anon';
    if (cache.public.data && cache.public.cacheKey === cacheKey && now < cache.public.expiresAt) {
        return cache.public.data;
    }

    const stats = readJson(STATS_FILE, { history: {} });
    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;
    const last7 = parisLastNDays(7);
    const gw = getGameweekStatus();
    const giveaway = getGiveawayState(discordId);

    const result = {
        memberCount: guild?.memberCount || 0,
        gameweek: gw.gameweek,
        dayName: getCurrentDayName(locale),
        botOnline: client.isReady(),
        ping: client.ws.ping ?? 0,
        memberTrend: last7.map((d) => ({
            date: d,
            members: d === parisDayKey()
                ? (guild?.memberCount || stats.history?.[d]?.totalMembers || 0)
                : (stats.history?.[d]?.totalMembers || 0),
        })),
        gameweekStatus: gw,
        giveaway,
    };

    cache.public = { data: result, expiresAt: now + PUBLIC_TTL, cacheKey };
    return result;
}
