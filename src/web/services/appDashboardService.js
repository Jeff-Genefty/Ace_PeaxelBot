import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { getGameweekStatus } from './gameweekService.js';
import { getGiveawayState } from './giveawayService.js';
import { getNextScheduledRun } from '../../utils/activityTracker.js';
import { getFeedbackStats, hasAlreadySubmitted } from '../../utils/feedbackStore.js';
import { fetchMemberProfile } from './memberProfileService.js';
import { getChallengeState, syncExternalTasks, getTicketUrl } from './weeklyChallengeService.js';
import { getHubProfile, getUserWeekRank, getWeeklyLeaderboard, XP_REWARDS, parisDayKey } from './hubXpService.js';
import { hasGwReminder } from './gwReminderService.js';
import { getCurrentDayName } from '../../utils/week.js';
import { getChannel } from '../../utils/configManager.js';

const STATS_FILE = join(resolve('./data'), 'analytics.json');

function readStats() {
    if (!fs.existsSync(STATS_FILE)) {
        return { dailyActiveRoleUsers: [], dailyHistory: {}, dailyBreakdown: {}, messagesSent: 0 };
    }
    try { return JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch {
        return { dailyActiveRoleUsers: [], dailyHistory: {}, dailyBreakdown: {}, messagesSent: 0 };
    }
}

function discordChannelUrl(channelId) {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId || !channelId) return null;
    return `https://discord.com/channels/${guildId}/${channelId}`;
}

export async function gatherAppDashboard(client, locale, discordId, discordUser) {
    const stats = readStats();
    const today = parisDayKey();
    const gw = getGameweekStatus();
    const giveaway = getGiveawayState(discordId);
    const feedbackStats = getFeedbackStats();
    const nextEvent = getNextScheduledRun();
    const profile = await fetchMemberProfile(client, discordId);
    syncExternalTasks(discordId, gw.gameweek);
    const challenge = getChallengeState(discordId, gw.gameweek);
    challenge.ticketUrl = getTicketUrl();
    const hub = getHubProfile(discordId);
    const hubRank = getUserWeekRank(discordId);
    const leaderboard = getWeeklyLeaderboard(10).map((row) => ({
        ...row,
        isYou: row.discordId === String(discordId),
        displayName: row.username || (row.discordId === String(discordId) ? discordUser.username : `Manager ${row.rank}`),
    }));
    const announceChannelId = getChannel('announce');
    const feedbackChannelId = getChannel('feedback');
    const messagesToday = stats.dailyBreakdown?.[today]?.messages
        ?? stats.dailyHistory?.[today]
        ?? 0;

    return {
        user: discordUser,
        profile,
        gameweek: gw.gameweek,
        dayName: getCurrentDayName(locale),
        gameweekStatus: gw,
        giveaway: {
            ...giveaway,
            discordUrl: discordChannelUrl(announceChannelId),
        },
        activity: {
            activeManagers: stats.dailyActiveRoleUsers?.length || 0,
            messagesToday,
        },
        nextEvent: {
            label: nextEvent.label,
            hoursUntil: nextEvent.hoursUntil,
        },
        feedback: {
            submitted: hasAlreadySubmitted(discordId),
            average: feedbackStats.average,
            total: feedbackStats.total,
            channelUrl: discordChannelUrl(feedbackChannelId),
        },
        challenge,
        hub: {
            level: hub.level,
            title: hub.title,
            xpIntoLevel: hub.xpIntoLevel,
            xpToNext: hub.xpToNext,
            progressPct: hub.progressPct,
            xpTotal: hub.xpTotal,
            xpWeek: hub.xpWeek,
            rankWeek: hubRank.rank,
            dailyStreak: hub.dailyStreak || 0,
            claimedDailyToday: hub.claimedDailyToday,
            pendingCards: hub.pendingCards || [],
            pendingCount: (hub.pendingCards || []).length,
            ticketUrl: getTicketUrl(),
            xpRewards: {
                task: XP_REWARDS.challenge_task,
                complete: XP_REWARDS.challenge_complete,
            },
        },
        leaderboard,
        reminder: {
            enabled: hasGwReminder(discordId),
        },
    };
}
