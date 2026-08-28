import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getChannel } from '../utils/configManager.js';
import { loadMessageConfig } from '../config/messageConfig.js';

const logPrefix = '[Peaxel Welcome]';

async function sendWelcomeMessage(member) {
    const welcomeChannelId = getChannel('welcome');

    if (!welcomeChannelId) {
        console.log(`${logPrefix} ⚠️ Aucun salon 'welcome' configuré.`);
        return;
    }

    const channel = await member.client.channels.fetch(welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const msgConfig = loadMessageConfig();
    const playUrl = msgConfig.opening.playUrl || 'https://game.peaxel.me/';
    const zealyUrl = 'https://zealy.io/cw/peaxel-quest/questboard';
    const trustpilotUrl = 'https://www.trustpilot.com/review/peaxel.me';

    const imagePath = resolve(process.cwd(), 'assets', 'welcome-image.png');

    const embed = new EmbedBuilder()
        .setTitle('🎙️ ACE NOTIFICATION | NEW MANAGER ON DECK')
        .setDescription(
            `Welcome to the arena, <@${member.id}>! I'm **Ace**, your Peaxel guide.\n\n` +
            `**Who are we?**\n` +
            `Peaxel is the ultimate Fantasy Sport ecosystem where you manage real-life athletes and earn rewards. 🏆\n\n` +
            `**🚀 YOUR NEXT STEPS:**\n\n` +
            `1️⃣ **Claim your Free Cards:** [Register here](${playUrl}) to get your first athlete.\n` +
            `2️⃣ **Get 5 FREE Cards:** Check our guide to expand your roster! 🎁\n` +
            `3️⃣ **Join Zealy Quests:** Complete missions for XP. [Join here](${zealyUrl}).\n` +
            `4️⃣ **Boost the Project:** Leave a review on [Trustpilot](${trustpilotUrl}) and claim **200 XP** on Zealy! ⭐\n\n` +
            `*Ready to own the game? Let us know if you need help!* 🚀`
        )
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({ text: 'Peaxel • Digital Sports Entertainment' });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Register & Get 1st Card').setStyle(ButtonStyle.Link).setURL(playUrl),
        new ButtonBuilder().setLabel('Zealy Quests').setStyle(ButtonStyle.Link).setURL(zealyUrl),
        new ButtonBuilder().setLabel('Review Us ⭐').setStyle(ButtonStyle.Link).setURL(trustpilotUrl)
    );

    const options = {
        content: `Welcome <@${member.id}>! Check your roadmap below. 👇`,
        embeds: [embed],
        components: [buttons],
    };

    if (existsSync(imagePath)) {
        const attachment = new AttachmentBuilder(imagePath, { name: 'welcome.jpg' });
        embed.setImage('attachment://welcome.jpg');
        options.files = [attachment];
    }

    await channel.send(options);
    console.log(`${logPrefix} ✅ Message de bienvenue envoyé pour ${member.user.username}`);
}

/**
 * Handler unique pour les nouveaux membres : analytics + message de bienvenue.
 * @param {import('discord.js').GuildMember} member
 * @param {(member: import('discord.js').GuildMember) => void} [onArrival] — callback analytics
 */
export async function handleGuildMemberAdd(member, onArrival) {
    try {
        onArrival?.(member);
    } catch (error) {
        console.error(`${logPrefix} Erreur tracking arrivée:`, error.message);
    }

    try {
        await sendWelcomeMessage(member);
    } catch (error) {
        console.error(`${logPrefix} ❌ Erreur envoi welcome:`, error.message);
    }
}

/**
 * Enregistre le listener GuildMemberAdd centralisé.
 */
export function registerMemberJoinHandler(client, onArrival) {
    client.on('guildMemberAdd', (member) => handleGuildMemberAdd(member, onArrival));
}
