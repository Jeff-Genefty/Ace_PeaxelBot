import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { resolve } from 'path';
import { readJsonSync, updateJsonSync } from './jsonStore.js';
import { loadRewardState, saveRewardState } from './rewardState.js';
import { getChannel, getStaffExcludedRoles } from './configManager.js';
import { gameUrl, DISCORD_REFS } from './peaxelLinks.js';
import { buildClaimDeliveryRow, createClaimTicket } from './claimTicketService.js';
import { getHubProfile } from '../web/services/hubXpService.js';

const REWARDS_PATH = './data/userRewards.json';

/** Seuil global de messages Ace avant un tirage (réduit la fréquence des drops) */
const THRESHOLD_MIN = 250;
const THRESHOLD_MAX = 500;
/** Probabilité de drop une fois le seuil atteint */
const DROP_CHANCE = 0.35;

function rollNextThreshold() {
    return Math.floor(Math.random() * (THRESHOLD_MAX - THRESHOLD_MIN + 1)) + THRESHOLD_MIN;
}

const rewardState = loadRewardState();
let messageCounter = rewardState.messageCounter;
let nextThreshold = rewardState.nextThreshold;

// Appliquer immédiatement le nouveau barème si un ancien seuil bas est encore en mémoire
if (nextThreshold < THRESHOLD_MIN) {
    nextThreshold = rollNextThreshold();
    saveRewardState({ messageCounter, nextThreshold });
}

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
        nextThreshold = rollNextThreshold();
        persistRewardCounters();

        if (Math.random() < DROP_CHANCE) {
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

    saveRewardDate(user.id);

    const variations = [
        'sharp takes in chat — that’s how Managers climb.',
        'love the energy you’re bringing to the community today.',
        'active managers fuel Peaxel — this one’s on Ace.',
    ];

    const playUrl = gameUrl(DISCORD_REFS.reward);
    const profile = getHubProfile(user.id);
    const hasContact = Boolean(profile.peaxelContact);

    const embed = new EmbedBuilder()
        .setTitle('🃏 Ace reward — Free Athlete Card')
        .setDescription(
            `Hey <@${user.id}>, ${variations[Math.floor(Math.random() * variations.length)]}\n\n`
            + `You’ve earned a **Free Athlete Card** for your roster on [game.peaxel.me](${playUrl}).\n\n`
            + (hasContact
                ? 'Ace is opening your **private delivery ticket** with staff now.'
                : 'Click **Open delivery ticket** and share your Peaxel **in-game username or email** — Ace will open a private ticket with staff and tag you.'),
        )
        .setColor('#a855f7')
        .setThumbnail('attachment://unnamed.png')
        .setTimestamp()
        .setFooter({ text: 'Peaxel · Chat reward · Fair play only' });

    const components = hasContact ? [] : [buildClaimDeliveryRow('ace_chat')];

    await message.reply({
        content: `⚡ <@${user.id}> — Ace just dropped a free card for you.`,
        embeds: [embed],
        files: [file],
        components,
    });

    if (hasContact) {
        const result = await createClaimTicket(message.client, {
            userId: user.id,
            discordUsername: user.username,
            peaxelContact: profile.peaxelContact,
            reason: 'ace_chat',
        });
        if (result.ok) {
            await message.channel.send({
                content: `<@${user.id}> your delivery ticket is ready — Ace tagged you there with staff.`,
            }).catch(() => null);
        } else {
            await message.channel.send({
                content: `<@${user.id}> auto-ticket failed — use the button below.`,
                components: [buildClaimDeliveryRow('ace_chat')],
            }).catch(() => null);
        }
    }
}
