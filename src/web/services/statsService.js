import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { getRole } from '../../utils/configManager.js';
import { getCurrentWeekNumber, getCurrentDayName } from '../../utils/week.js';
import { loadActivity, getNextScheduledRun, getUptime } from '../../utils/activityTracker.js';
import { getFeedbackStats } from '../../utils/feedbackStore.js';

const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const FEEDBACK_FILE = join(DATA_DIR, 'feedbacks.json');
const GIVEAWAYS_FILE = join(DATA_DIR, 'giveaways.json');
const LIVE_LOGS_FILE = join(DATA_DIR, 'live_logs.json');

function readJson(path, fallback) {
    if (!fs.existsSync(path)) return fallback;
    try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return fallback; }
}

export async function gatherAdminStats(client) {
    const stats = readJson(STATS_FILE, {
        messagesSent: 0, commandsExecuted: 0, feedbacksReceived: 0,
        arrivalsToday: 0, dailyActiveRoleUsers: [], dailyHistory: {}, history: {}, totalBans: 0,
    });
    const feedbacks = readJson(FEEDBACK_FILE, []);
    const giveawayData = readJson(GIVEAWAYS_FILE, { participants: [], participantTags: [] });
    const liveLogs = readJson(LIVE_LOGS_FILE, []);
    const activity = loadActivity();
    const feedbackStats = getFeedbackStats();
    const nextRun = getNextScheduledRun();

    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;
    const activityRoleId = getRole('activityTrack');
    const roleMembers = activityRoleId
        ? (guild?.roles.cache.get(activityRoleId)?.members.size || 1)
        : 1;
    const activeToday = stats.dailyActiveRoleUsers?.length || 0;

    let weeklyGrowth = '0.0';
    const historyDates = Object.keys(stats.history || {}).sort();
    if (historyDates.length >= 7) {
        const last = stats.history[historyDates.at(-1)].totalMembers;
        const first = stats.history[historyDates.at(-7)].totalMembers;
        weeklyGrowth = (((last - first) / first) * 100).toFixed(1);
    }

    const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : '0.0';

    const dates = [];
    const messageCounts = [];
    const commandCounts = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
        messageCounts.push(stats.dailyHistory?.[dateStr] || 0);
    }

    const last7History = historyDates.slice(-7);
    const memberTrend = last7History.map((d) => stats.history[d]?.totalMembers || 0);
    const arrivalTrend = last7History.map((d) => stats.history[d]?.arrivals || 0);
    const roleActivityTrend = last7History.map((d) => parseFloat(stats.history[d]?.roleActivity || 0));

    const participants = giveawayData.participants || [];
    const tags = giveawayData.participantTags || [];
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

    return {
        stats,
        feedbacks,
        liveLogs,
        guild,
        isEmergency: !client.isReady() || client.ws.ping > 250,
        ping: client.ws.ping ?? 0,
        kpis: {
            activePopRate: ((activeToday / roleMembers) * 100).toFixed(1),
            arrivalsToday: stats.arrivalsToday || 0,
            weeklyGrowth,
            avgRating,
            totalFeedbacks: feedbacks.length,
            totalBans: stats.totalBans || 0,
            memberCount: guild?.memberCount || 0,
            messagesSent: stats.messagesSent || 0,
            commandsExecuted: stats.commandsExecuted || 0,
            totalPosts: activity.totalPostsSent || 0,
            gameweek: getCurrentWeekNumber(),
            dayName: getCurrentDayName(),
        },
        charts: { dates, messageCounts, last7History, memberTrend, arrivalTrend, roleActivityTrend },
        giveaway: { count: participants.length, list: participantList.join(', ') || 'Aucun participant' },
        scheduler: {
            nextLabel: nextRun.label,
            hoursUntil: nextRun.hoursUntil,
            uptime: getUptime(activity.botStartedAt),
        },
        feedbackStats,
    };
}

export async function gatherPublicStats(client) {
    const stats = readJson(STATS_FILE, { history: {} });
    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;
    const historyDates = Object.keys(stats.history || {}).sort();
    const last7 = historyDates.slice(-7);

    return {
        memberCount: guild?.memberCount || 0,
        gameweek: getCurrentWeekNumber(),
        dayName: getCurrentDayName(),
        botOnline: client.isReady(),
        ping: client.ws.ping ?? 0,
        memberTrend: last7.map((d) => ({ date: d, members: stats.history[d]?.totalMembers || 0 })),
    };
}
