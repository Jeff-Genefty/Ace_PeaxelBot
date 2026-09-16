import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getChannel } from '../utils/configManager.js';
import {
    gameUrl,
    ZEALY_URL,
    DOCS_URL,
    FREE_CARDS_URL,
    DISCORD_REFS,
} from '../utils/peaxelLinks.js';

const logPrefix = '[Peaxel Welcome]';
const WEB_BASE = () => process.env.WEB_BASE_URL || 'https://peaxel.genefty.com';

async function sendWelcomeMessage(member) {
    const welcomeChannelId = getChannel('welcome');

    if (!welcomeChannelId) {
        console.log(`${logPrefix} ⚠️ Aucun salon 'welcome' configuré.`);
        return;
    }

    const channel = await member.client.channels.fetch(welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const playUrl = gameUrl(DISCORD_REFS.welcome);
    const hubUrl = `${WEB_BASE()}/app`;
    const imagePath = resolve(process.cwd(), 'assets', 'welcome-image.png');

    const embed = new EmbedBuilder()
        .setTitle('👋 Welcome to Peaxel — the Arena is open')
        .setDescription(
            `Hey <@${member.id}> — glad you’re here.\n\n`
            + '**Peaxel** is free: scout real action-sports athletes, build weekly lineups, '
            + 'and compete for rewards.\n\n'
            + `**Step 1 — play free**\n`
            + `[Create your account & claim your first card →](${playUrl})\n\n`
            + '**Then on Discord**\n'
            + `• Hub XP — \`/daily\` + weekly challenges → [Open Hub](${hubUrl})\n`
            + `• Free-card paths — [peaxel.me/win-freecards](${FREE_CARDS_URL})\n`
            + `• Quests — [Zealy](${ZEALY_URL})\n\n`
            + `Stuck? \`/how-to-play\` · [docs](${DOCS_URL}) · Ace AI`,
        )
        .setColor('#22d3ee')
        .setTimestamp()
        .setFooter({ text: 'Peaxel · Collect · Compete · Win' });

    // 1 CTA primaire + 2 secondaires (ordre : Jouer → Hub → Docs)
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Play free').setStyle(ButtonStyle.Link).setURL(playUrl),
        new ButtonBuilder().setLabel('Open Hub').setStyle(ButtonStyle.Link).setURL(hubUrl),
        new ButtonBuilder().setLabel('How to play').setStyle(ButtonStyle.Link).setURL(DOCS_URL),
    );

    const options = {
        content: `Welcome <@${member.id}> — **start by playing free** 👇`,
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

export function registerMemberJoinHandler(client, onArrival) {
    client.on('guildMemberAdd', (member) => handleGuildMemberAdd(member, onArrival));
}
