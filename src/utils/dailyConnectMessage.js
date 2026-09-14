import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { getChannel } from '../utils/configManager.js';
import { getParisDate, getCurrentWeekNumber } from '../utils/week.js';
import { addLiveLog } from '../web/services/liveLogService.js';
import { applyHubFooter } from './hubFooter.js';

const WEB_BASE = () => process.env.WEB_BASE_URL || 'https://peaxel.genefty.com';

/**
 * Message quotidien Daily Connect — invite à /daily.
 */
export async function sendDailyConnectMessage(client) {
    const channelId = getChannel('welcome') || getChannel('announce');
    if (!channelId) {
        return { success: false, reason: 'NO_CHANNEL' };
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
        return { success: false, reason: 'CHANNEL_UNAVAILABLE' };
    }

    const paris = getParisDate();
    const dateLabel = paris.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    });
    const gw = getCurrentWeekNumber();

    const embed = new EmbedBuilder()
        .setTitle('☀️ Daily Connect — claim today’s Hub XP')
        .setColor(0x22d3ee)
        .setDescription(
            `**${dateLabel}** · Gameweek ${gw}\n\n`
            + 'Type **`/daily`** once today to:\n'
            + '• Earn **+40 Hub XP**\n'
            + '• Keep your **streak** (milestones at 7 · 14 · 30 days)\n'
            + '• Progress weekly Hub challenges when Daily is one of the missions\n\n'
            + `Track your level & ranking on the [Peaxel Hub](${WEB_BASE()}/app).\n`
            + 'Still need a lineup? → [game.peaxel.me](https://game.peaxel.me)',
        )
        .setFooter({ text: 'Peaxel Hub · 1 claim / day · Europe/Paris' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Open Hub')
            .setStyle(ButtonStyle.Link)
            .setURL(`${WEB_BASE()}/app`),
        new ButtonBuilder()
            .setLabel('Play on Peaxel')
            .setStyle(ButtonStyle.Link)
            .setURL('https://game.peaxel.me'),
    );

    const footerFile = applyHubFooter(embed, 'daily');
    await channel.send({
        embeds: [embed],
        components: [row],
        files: footerFile ? [footerFile] : [],
    });
    addLiveLog('SYSTEM', `Daily Connect message posted · GW ${gw}`);
    return { success: true };
}
