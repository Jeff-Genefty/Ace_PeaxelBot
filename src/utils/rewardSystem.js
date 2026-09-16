import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { resolve } from 'path';
import { readJsonSync, updateJsonSync } from './jsonStore.js';
import { loadRewardState, saveRewardState } from './rewardState.js';
import { getChannel, getStaffExcludedRoles, getTicketChannelId } from './configManager.js';
import { gameUrl, DISCORD_REFS } from './peaxelLinks.js';

const REWARDS_PATH = './data/userRewards.json';

const rewardState = loadRewardState();
let messageCounter = rewardState.messageCounter;
let nextThreshold = rewardState.nextThreshold;

function persistRewardCounters() {
    saveRewardState({ messageCounter, nextThreshold });
}

function isOnCooldown(userId) {
    const data = readJsonSync(REWARDS_PATH, {});
    const lastReward = data[userId];
    if (!lastReward) return false;
    return (Date.now() - lastReward) / (1000 * 60 * 60) < 24;
}

function saveRewardDate(userId) {
    updateJsonSync(REWARDS_PATH, {}, (data) => {
        data[userId] = Date.now();
        return data;
    });
}

export async function handleMessageReward(message) {
    const generalChannelId = getChannel('welcome');
    if (!generalChannelId || message.author.bot || message.channel.id !== generalChannelId) return;

    if (Math.random() < 0.25) {
        const emojis = ['⚽', '🏟️', '🔥', '🧠', '⭐', '📈', '🤝'];
        await message.react(emojis[Math.floor(Math.random() * emojis.length)]).catch(() => null);
    }

    messageCounter++;

    if (messageCounter >= nextThreshold) {
        const staffRoles = getStaffExcludedRoles();
        const isExcluded = message.member?.roles.cache.some((role) => staffRoles.includes(role.id)) ?? false;

        if (isExcluded || isOnCooldown(message.author.id)) {
            messageCounter = Math.floor(nextThreshold * 0.9);
            persistRewardCounters();
            return;
        }

        messageCounter = 0;
        nextThreshold = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
        persistRewardCounters();

        if (Math.random() < 0.75) {
            await triggerAceRecognition(message);
        }
    } else {
        persistRewardCounters();
    }
}

async function triggerAceRecognition(message) {
    const user = message.author;
    const imagePath = resolve(process.cwd(), './assets/unnamed.png');
    const file = new AttachmentBuilder(imagePath);
    const ticketChannelId = getTicketChannelId();
    const ticketMention = ticketChannelId ? `<#${ticketChannelId}>` : 'the support ticket channel';

    saveRewardDate(user.id);

    const variations = [
        'sharp takes in chat — that’s how Managers climb.',
        'love the energy you’re bringing to the community today.',
        'active managers fuel Peaxel — this one’s on Ace.',
    ];

    const playUrl = gameUrl(DISCORD_REFS.reward);

    const embed = new EmbedBuilder()
        .setTitle('🃏 Ace reward — Free Athlete Card')
        .setDescription(
            `Hey <@${user.id}>, ${variations[Math.floor(Math.random() * variations.length)]}\n\n`
            + `You’ve earned a **Free Athlete Card** for your roster on [game.peaxel.me](${playUrl}).`,
        )
        .addFields({
            name: '📩 How to claim',
            value: `Open a ticket in ${ticketMention} and attach a screenshot of this message.`,
        })
        .setColor('#a855f7')
        .setThumbnail('attachment://unnamed.png')
        .setTimestamp()
        .setFooter({ text: 'Peaxel · Chat reward · Fair play only' });

    await message.reply({
        content: `⚡ <@${user.id}> — Ace just dropped a free card for you.`,
        embeds: [embed],
        files: [file],
    });
}
