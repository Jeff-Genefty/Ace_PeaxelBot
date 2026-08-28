import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { resolve } from 'path';
import { readJsonSync, updateJsonSync } from './jsonStore.js';
import { loadRewardState, saveRewardState } from './rewardState.js';
import { getChannel, getStaffExcludedRoles, getTicketChannelId } from './configManager.js';

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
        `Your tactical analysis is spot on! 🏟️`,
        `I love the energy you're bringing to the stadium today! 🚀`,
        `Your passion for the Peaxel ecosystem deserves a reward. 🏆`,
    ];

    const embed = new EmbedBuilder()
        .setTitle(`👨‍🏫 COACH ACE IS WATCHING...`)
        .setDescription(
            `Hey <@${user.id}>, ${variations[Math.floor(Math.random() * variations.length)]}\n\n` +
            `I'm granting you a **Free Athlete Card 🃏**!`
        )
        .addFields({
            name: '📩 HOW TO CLAIM',
            value: `Open a ticket in ${ticketMention} and provide a screenshot of this message!`,
        })
        .setColor('#a855f7')
        .setThumbnail('attachment://unnamed.png')
        .setTimestamp()
        .setFooter({ text: 'Peaxel Loyalty Reward • Play Fair, Win Big!' });

    await message.reply({
        content: `⚡ **Congratulations Manager!**`,
        embeds: [embed],
        files: [file],
    });
}

export async function sendAceMotivation(client) {
    const channelId = getChannel('welcome');
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    if (Math.random() > 0.10) return;

    const imagePath = resolve(process.cwd(), './assets/unnamed.png');
    const file = new AttachmentBuilder(imagePath);

    const motivations = [
        "🏟️ **The stadium feels a bit quiet!** Who's ready for the next Gameweek? I'm scouting for the most active managers... rewards drop when you least expect them! 👀",
        "🔥 **Managers, is your strategy locked in?** Share your gems and tactical tips! The most passionate among you might just get a surprise gift from me. 🎁",
        "📢 **Scout Alert!** Free Athlete Cards are in play for active managers. But remember: spamming to force your luck will lead to disqualification. Stay natural, stay sharp. 🚫",
        "✨ **Coach Ace in the building...** I love seeing managers helping each other out. Keep the chat alive, and the rewards will keep dropping! 🃏",
        "🧠 **Knowledge is power.** Who's tracking the latest athlete performances? Active discussion is the key to victory, and victory leads to prizes! 🏆",
    ];

    const embed = new EmbedBuilder()
        .setTitle("👨‍🏫 COACH ACE'S BRIEFING")
        .setDescription(motivations[Math.floor(Math.random() * motivations.length)])
        .setColor('#a855f7')
        .setThumbnail('attachment://unnamed.png')
        .setFooter({ text: 'Peaxel • Fair Play & Activity' });

    await channel.send({ embeds: [embed], files: [file] });
}
