/**
 * Update FAQ welcome Discord message image (correct peaxel.genefty.com URL).
 * Message ID from post-faq-channel.js run.
 */
import { config } from 'dotenv';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder,
} from 'discord.js';
import { resolve } from 'path';

config();

const CHANNEL_ID = '1370054311949631648';
const MESSAGE_ID = '1549446809187778560';
const HUB_URL = process.env.WEB_BASE_URL || 'https://peaxel.genefty.com';
const fileName = 'faq-welcome.png';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const msg = await channel.messages.fetch(MESSAGE_ID);
        const file = new AttachmentBuilder(resolve('./assets', fileName), { name: fileName });
        const embed = new EmbedBuilder()
            .setColor(0xa855f7)
            .setTitle('❓ Peaxel FAQ — Welcome')
            .setDescription(
                'Welcome to the **official Peaxel FAQ**.\n\n'
                + 'This channel explains **what Peaxel is**, how the **Community Hub** works on Discord, '
                + 'how to earn **Hub XP / cards**, and how to **play the Gameweek**.\n\n'
                + 'Read the messages below in order — each section covers one topic.\n\n'
                + '**Quick links**\n'
                + `• Web Hub: ${HUB_URL}/app\n`
                + '• Play: https://game.peaxel.me\n'
                + '• Docs: https://docs.peaxel.me\n'
                + '• Interactive help on Discord: `/help`',
            )
            .setImage(`attachment://${fileName}`)
            .setFooter({ text: 'Peaxel · Own the Game. Manage Real Athletes.' })
            .setTimestamp();

        await msg.edit({ embeds: [embed], files: [file] });
        console.log('Updated welcome message image.');
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        client.destroy();
    }
});

client.login(process.env.DISCORD_TOKEN);
