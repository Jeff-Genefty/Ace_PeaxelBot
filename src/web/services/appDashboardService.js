import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { getGameweekStatus } from './gameweekService.js';
import { getGiveawayState } from './giveawayService.js';
import { getLiveLogs } from './liveLogService.js';
import { getNextScheduledRun } from '../../utils/activityTracker.js';
import { getFeedbackStats, hasAlreadySubmitted } from '../../utils/feedbackStore.js';
import { fetchMemberProfile } from './memberProfileService.js';
import { getChallengeState, syncExternalTasks, notifyQuestComplete, getTicketUrl } from './weeklyChallengeService.js';
import { hasGwReminder } from './gwReminderService.js';
import { getCurrentDayName } from '../../utils/week.js';
import { getChannel } from '../../utils/configManager.js';

const STATS_FILE = join(resolve('./data'), 'analytics.json');

function readStats() {
    if (!fs.existsSync(STATS_FILE)) {
        return { dailyActiveRoleUsers: [], dailyHistory: {}, messagesSent: 0 };
    }
    try { return JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch {
        return { dailyActiveRoleUsers: [], dailyHistory: {}, messagesSent: 0 };
    }
}

function discordChannelUrl(channelId) {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId || !channelId) return null;
    return `https://discord.com/channels/${guildId}/${channelId}`;
}

export async function gatherAppDashboard(client, locale, discordId, discordUser) {
    const stats = readStats();
    const today = new Date().toISOString().split('T')[0];
    const gw = getGameweekStatus();
    const giveaway = getGiveawayState(discordId);
    const feedbackStats = getFeedbackStats();
    const nextEvent = getNextScheduledRun();
    const { logs } = getLiveLogs({ limit: 8 });
    const profile = await fetchMemberProfile(client, discordId);
    syncExternalTasks(discordId, gw.gameweek);
    let challenge = getChallengeState(discordId, gw.gameweek);
    if (challenge.allDone && !challenge.questNotified && client?.isReady?.()) {
        await notifyQuestComplete(client, discordId, discordUser.username, gw.gameweek, challenge.set.tasks);
        challenge = getChallengeState(discordId, gw.gameweek);
    }
    challenge.ticketUrl = getTicketUrl();
    const announceChannelId = getChannel('announce');
    const feedbackChannelId = getChannel('feedback');

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
            messagesToday: stats.dailyHistory?.[today] || 0,
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
        liveFeed: logs.slice(0, 5),
        reminder: {
            enabled: hasGwReminder(discordId),
        },
    };
}
