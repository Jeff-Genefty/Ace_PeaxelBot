import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder,
} from 'discord.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

const CHANNEL_ID = '1369976257047167059';
const IMAGE_PATH = resolve('./assets/ace-moderation-announce.png');

const DESCRIPTION = [
    'Managers, Ace here.',
    '',
    'We’re tightening chat quality on Ace so real conversation wins — not noise farming.',
    '',
    '🛡️ **What’s changing**',
    '• Empty / emoji-only / one-letter spam gets **deleted**',
    '• You’ll get a clear **warning** when it happens',
    '• Warnings stack over **24h** → mute escalates: **1 min → 5 → 15 → 60 → 24h**',
    '',
    '✅ **What still works**',
    'Real messages. Screenshots. Actual takes.',
    'That’s how Hub XP & quests stay fair.',
    '',
    'Keep it sharp. Keep it useful.',
    'Collect. Compete. Connect. 🔥',
    '— Ace',
].join('\n');

if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN missing');
    process.exit(1);
}
if (!existsSync(IMAGE_PATH)) {
    console.error('Image missing:', IMAGE_PATH);
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel?.isTextBased()) {
            throw new Error('Channel not text-based or not found');
        }

        const file = new AttachmentBuilder(IMAGE_PATH, { name: 'ace-moderation-announce.png' });
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Fair Play Update — Ace Anti-Spam')
            .setDescription(DESCRIPTION)
            .setColor(0xa855f7)
            .setImage('attachment://ace-moderation-announce.png')
            .setFooter({ text: 'Peaxel · Fair play · Collect · Compete · Connect' })
            .setTimestamp();

        const msg = await channel.send({
            content: '@everyone',
            embeds: [embed],
            files: [file],
            allowedMentions: { parse: ['everyone'] },
        });

        console.log('Posted OK:', msg.url || msg.id);
    } catch (err) {
        console.error('Post failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.destroy();
    }
});

await client.login(process.env.DISCORD_TOKEN);
