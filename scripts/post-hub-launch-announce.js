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
const IMAGE_PATH = resolve('./assets/hub-launch-announce.png');

const DESCRIPTION = [
    'Managers, Ace here.',
    '',
    'The **Peaxel Community Hub** is officially open — Discord + web, built to reward activity, progression, and weekly competition.',
    '',
    '🌐 **Open the Hub**',
    '➡️ https://peaxel.genefty.com',
    'Sign in with Discord to access your manager space (`/app`).',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '✨ **EVERYTHING INCLUDED SINCE LAUNCH**',
    '',
    '**1) Hub Pass — XP & levels**',
    '• Earn Hub XP by chatting on Discord (15–25 XP, anti-farm: 1 message / 60s)',
    '• Level up on the Hub Pass (titles from Rookie to Hall of Fame)',
    '• Track your progress bar live on the Hub',
    '',
    '**2) Daily Connect**',
    '• Claim once per day with `/daily` (+40 XP)',
    '• Rule: send at least 1 Discord message the same day (Paris time), then run `/daily`',
    '• Daily reminder every morning at 09:00',
    '• Streaks at **7 / 14 / 30 days** → bonus XP + Athlete Card',
    '',
    '**3) Weekly challenges**',
    '• Every Monday: **3 rotating missions** (auto-validated)',
    '• Fixed quest every week: **send 10 messages**',
    '• Complete all missions → **+100 XP + card** in your vault',
    '',
    '**4) Rankings & weekly champion**',
    '• **GW leaderboard** — Top 10 XP this Gameweek',
    '• **Public Hub leaderboards** — weekly + all-time',
    '• Check your profile anytime with `/rank`',
    '• **#1 of the week** wins **+150 XP + Athlete Card** every **Sunday evening**',
    '',
    '**5) Card vault**',
    '• Claim rewards from the Hub (`/app` → Card vault)',
    '• Cards from: weekly quest, streaks, Scout Quiz wins, weekly #1',
    '• After claiming, open a Discord ticket for delivery',
    '• Level-ups give titles only — no automatic card drop',
    '',
    '**6) Hub dashboard (`/app`)**',
    '• Gameweek status + countdown · Giveaway · Challenges · Leaderboard · Vault',
    '• Optional GW deadline reminder · Light/dark theme · FR/EN',
    '',
    '**7) Discord commands**',
    '`/daily` · `/rank` · `/help` · `/how-to-play` · `/feedback`',
    '',
    '**8) Community events**',
    'Monday GW opening · Tuesday Scout Quiz · Wednesday Spotlight',
    'Thursday lineup reminder · Weekend Giveaway · Coach Ace chat rewards',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '🎮 **Play Peaxel** → https://game.peaxel.me',
    '',
    '📌 **Start in 60 seconds**',
    '1️⃣ Open https://peaxel.genefty.com',
    '2️⃣ Send a Discord message, then type `/daily`',
    '3️⃣ Check `/rank` + your weekly challenges on the Hub',
    '',
    'Collect. Compete. Connect.',
    'Welcome to the Peaxel Hub. 🔥',
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

        const file = new AttachmentBuilder(IMAGE_PATH, { name: 'hub-launch-announce.png' });
        const embed = new EmbedBuilder()
            .setTitle('🚀 PEAXEL HUB IS LIVE')
            .setDescription(DESCRIPTION)
            .setColor(0x22d3ee)
            .setImage('attachment://hub-launch-announce.png')
            .setFooter({ text: 'Peaxel · Collect · Compete · Connect' })
            .setTimestamp();

        if (DESCRIPTION.length > 4096) {
            throw new Error(`Embed description too long: ${DESCRIPTION.length}`);
        }

        const msg = await channel.send({
            content: '@everyone',
            embeds: [embed],
            files: [file],
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
