import { getChannel } from '../utils/configManager.js';
import { getCurrentWeekNumber } from '../utils/week.js';
import {
    incrementChallengeMetric,
    markTaskComplete,
} from '../web/services/weeklyChallengeService.js';
import { isQuizActiveInChannel } from '../utils/scoutQuizRunner.js';

function guildOk(guildId) {
    return guildId === process.env.DISCORD_GUILD_ID;
}

function channelId(channel) {
    return channel?.id || null;
}

/** Message utilisateur — compteurs et détections contextuelles */
export function handleChallengeMessage(message) {
    if (message.author.bot || !message.guild || !guildOk(message.guild.id)) return;

    const userId = message.author.id;
    const gw = getCurrentWeekNumber();
    const welcomeId = getChannel('welcome');
    const spotlightId = getChannel('spotlight');
    const announceId = getChannel('announce');
    const ch = channelId(message.channel);

    incrementChallengeMetric(userId, gw, 'messages', message.client, {
        username: message.author.username,
    });

    if (ch === welcomeId && message.mentions.users.size > 0) {
        const mentionedOther = [...message.mentions.users.values()].some((u) => u.id !== userId && !u.bot);
        if (mentionedOther) {
            markTaskComplete(userId, gw, 'welcome', message.client, { username: message.author.username });
        }
    }

    if (ch === spotlightId) {
        markTaskComplete(userId, gw, 'spotlight', message.client, { username: message.author.username });
    }

    if (ch === welcomeId && message.attachments.size > 0) {
        markTaskComplete(userId, gw, 'share', message.client, { username: message.author.username });
    }

    if (isQuizActiveInChannel(ch)) {
        markTaskComplete(userId, gw, 'quiz', message.client, { username: message.author.username });
    }

    if (ch === announceId && message.author.id === message.client.user?.id) {
        // tracked via reactions on announce messages
    }
}

/** Réaction emoji — annonces GW ou toute réaction valide */
export function handleChallengeReaction(reaction, user) {
    if (user.bot) return;
    const message = reaction.message;
    if (!message.guild || !guildOk(message.guild.id)) return;

    const gw = getCurrentWeekNumber();
    const announceId = getChannel('announce');
    const ch = channelId(message.channel);

    if (ch === announceId) {
        const content = (message.content || '') + (message.embeds?.[0]?.title || '') + (message.embeds?.[0]?.description || '');
        const isGwPost = /gameweek|lineup|opening|closing|week-end|giveaway|quiz|spotlight/i.test(content);
        if (isGwPost || message.author?.id === message.client?.user?.id) {
            markTaskComplete(user.id, gw, 'react', message.client, { username: user.username });
            if (/gameweek|lineup|opening|closing/i.test(content)) {
                markTaskComplete(user.id, gw, 'gw_react', message.client, { username: user.username });
            }
        }
    } else {
        markTaskComplete(user.id, gw, 'react', message.client, { username: user.username });
    }
}

export function handleChallengeGiveawayJoin(userId, username, client) {
    markTaskComplete(userId, getCurrentWeekNumber(), 'giveaway', client, { username });
}

export function handleChallengeFeedback(userId, username, client) {
    markTaskComplete(userId, getCurrentWeekNumber(), 'feedback', client, { username });
}

export function handleChallengeQuizParticipation(userId, username, client) {
    markTaskComplete(userId, getCurrentWeekNumber(), 'quiz', client, { username });
}
