import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { getChannel } from '../utils/configManager.js';
import { loadMessageConfig } from '../config/messageConfig.js';

const logPrefix = '[Peaxel Welcome]';
const WEB_BASE = () => process.env.WEB_BASE_URL || 'https://ace.peaxel.me';

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
    const hubUrl = `${WEB_BASE()}/app`;
    const freeCardsUrl = 'https://peaxel.me/win-freecards-on-peaxel';

    const imagePath = resolve(process.cwd(), 'assets', 'welcome-image.png');

    const embed = new EmbedBuilder()
        .setTitle('👋 Welcome to Peaxel — Ace here')
        .setDescription(
            `Hey <@${member.id}> — glad you’re here.\n\n`
            + '**Peaxel** is the free fantasy game where you scout real action-sports athletes, '
            + 'build weekly lineups on [game.peaxel.me](https://game.peaxel.me), and compete for rewards.\n\n'
            + '**Start in 4 steps**\n'
            + `1️⃣ **Play free** — [create your account](${playUrl}) and claim your first card\n`
            + `2️⃣ **Stack more free cards** — [see every free-card path](${freeCardsUrl})\n`
            + `3️⃣ **Hub XP** — use \`/daily\` and join weekly Discord challenges ([open Hub](${hubUrl}))\n`
            + `4️⃣ **Zealy quests** — [earn XP & cards](${zealyUrl}) · boost with a [Trustpilot review](${trustpilotUrl})\n\n`
            + 'Need help? Ask in chat or check docs.peaxel.me.',
        )
        .setColor('#22d3ee')
        .setTimestamp()
        .setFooter({ text: 'Peaxel · Collect · Compete · Win' });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Play free').setStyle(ButtonStyle.Link).setURL(playUrl),
        new ButtonBuilder().setLabel('Zealy quests').setStyle(ButtonStyle.Link).setURL(zealyUrl),
        new ButtonBuilder().setLabel('Open Hub').setStyle(ButtonStyle.Link).setURL(hubUrl),
    );

    const options = {
        content: `Welcome <@${member.id}> — your Peaxel roadmap is below 👇`,
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
