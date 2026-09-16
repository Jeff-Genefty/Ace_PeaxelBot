/**
 * Update live FAQ channel embeds for launch (no Alpha/Beta) + UTM play links.
 * Matches messages by embed title — does not re-post (no duplicates).
 *
 * Usage: node scripts/update-faq-launch.js
 */
import { config } from 'dotenv';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { gameUrl, ZEALY_URL, DOCS_URL, SITE_URL, ACE_URL, TRUSTPILOT_URL, DISCORD_REFS } = await import(
    pathToFileURL(resolve(__dirname, '../src/utils/peaxelLinks.js')).href
);

const CHANNEL_ID = process.env.FAQ_CHANNEL_ID || '1370054311949631648';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1369976254647898152';
const TICKET_CHANNEL_ID = process.env.TICKET_CHANNEL_ID || '1369976260066803794';
const HUB_URL = process.env.WEB_BASE_URL || 'https://peaxel.genefty.com';
const PLAY_URL = gameUrl(DISCORD_REFS.faq);
const ASSETS = resolve('./assets');

function asset(name) {
    return new AttachmentBuilder(resolve(ASSETS, name), { name });
}

const updates = [
    {
        matchTitle: '❓ Peaxel FAQ — Welcome',
        files: ['faq-welcome.png'],
        build: () => new EmbedBuilder()
            .setColor(0xa855f7)
            .setTitle('❓ Peaxel FAQ — Welcome')
            .setDescription(
                'Welcome to the **official Peaxel FAQ**.\n\n'
                + 'The Arena is **open to everyone** — play free, collect athlete cards, and compete every Gameweek.\n\n'
                + 'This channel explains **what Peaxel is**, how the **Community Hub** works on Discord, '
                + 'how to earn **Hub XP / cards**, and how to **play the Gameweek**.\n\n'
                + 'Read the messages below in order — each section covers one topic.\n\n'
                + '**Quick links**\n'
                + `• **Play free:** ${PLAY_URL}\n`
                + `• Web Hub: ${HUB_URL}/app\n`
                + `• Docs: ${DOCS_URL}\n`
                + '• Interactive help on Discord: `/help`',
            )
            .setImage('attachment://faq-welcome.png')
            .setFooter({ text: 'Peaxel · Own the Game. Manage Real Athletes.' })
            .setTimestamp(),
    },
    {
        matchTitle: '💎 What is Peaxel?',
        files: ['faq-what-is-peaxel.png'],
        build: () => new EmbedBuilder()
            .setColor(0x22d3ee)
            .setTitle('💎 What is Peaxel?')
            .setDescription(
                'Peaxel is a **free** platform where **talents and fans connect through collectible athlete cards**.\n'
                + 'Scout rising stars, build weekly lineups, and compete for rewards — no invite gate.',
            )
            .addFields(
                {
                    name: 'The game (scouting)',
                    value:
                        'Build a lineup of **1–5 athlete cards**, score from **real-world performances**, climb the weekly ranking, '
                        + `and earn rewards in your Peaxel wallet.\n`
                        + `**Play free:** ${PLAY_URL} · full rules: \`/how-to-play\` or ${DOCS_URL}`,
                },
                {
                    name: 'Open Arena — public launch',
                    value:
                        '• Anyone can create an account and claim starter cards\n'
                        + '• Core loops live today: **card collecting**, **Gameweeks**, and the **Community Hub** on Discord\n'
                        + '• Features keep evolving — watch **#announcements** for updates',
                },
                {
                    name: 'How do I get started?',
                    value:
                        `1. **Play free** → ${PLAY_URL}\n`
                        + '2. Join Discord activity — `/daily`, weekly challenges, Scout Quiz\n'
                        + `3. Optional quests on **Zealy** — ${ZEALY_URL}`,
                },
            )
            .setImage('attachment://faq-what-is-peaxel.png')
            .setFooter({ text: 'Peaxel · Platform overview · Open Arena' }),
    },
    {
        matchTitle: '🎯 Weekly challenges & card vault',
        files: ['faq-challenges-vault.png'],
        build: () => new EmbedBuilder()
            .setColor(0x34d399)
            .setTitle('🎯 Weekly challenges & card vault')
            .setDescription(
                'Every **Monday**, new Hub missions appear on `/app` and are **auto-validated** from your Discord actions '
                + '(no manual checkboxes).',
            )
            .addFields(
                {
                    name: 'Weekly quest structure',
                    value:
                        '• **3 rotating missions** (quiz, giveaway, feedback, reacts, welcome, share a card, GW react…)\n'
                        + '• **1 fixed quest** — send **10 messages** on the server\n'
                        + '• Completing everything grants **+100 XP** and a **pending Athlete Card**',
                },
                {
                    name: 'How to get Athlete Cards (Hub)',
                    value:
                        '• Finish the **weekly quest**\n'
                        + '• Hit a **daily streak** milestone (7 / 14 / 30)\n'
                        + '• Win the **Scout Quiz**\n'
                        + '• Finish **#1** on the weekly Hub XP leaderboard (Sunday evening)',
                },
                {
                    name: 'How to claim',
                    value:
                        `1. Open ${HUB_URL}/app → **Card vault**\n`
                        + '2. Click **Claim** (staff is notified)\n'
                        + `3. Open a ticket in <#${TICKET_CHANNEL_ID}> with a Hub screenshot (PEAXEL HUB stamp + GW + username)\n`
                        + 'Staff delivers the card manually (Claim V1).',
                },
                {
                    name: 'Community rewards (beyond Hub XP)',
                    value:
                        'Active managers can also earn collectible cards, Discord roles, Zealy boosts, lootboxes, '
                        + 'weekly spotlights, and more — mostly via **Zealy + Discord + in-game activity**.',
                },
            )
            .setImage('attachment://faq-challenges-vault.png')
            .setFooter({ text: 'Peaxel Hub · Challenges · Vault' }),
    },
    {
        matchTitle: '🎮 HOW TO PLAY PEAXEL | Official Guide',
        files: ['faq-need-help.png'],
        withButtons: true,
        build: () => new EmbedBuilder()
            .setColor(0xa855f7)
            .setTitle('🎮 HOW TO PLAY PEAXEL | Official Guide')
            .setDescription(
                'Master the scouting game! Here is everything you need to dominate the Gameweek leaderboard.\n\u200b',
            )
            .addFields(
                {
                    name: '🏃 1. Build your Lineup',
                    value:
                        '• **Where:** Team → All My Cards (or Competition page)\n'
                        + '• **Size:** Min **1**, Max **5** cards\n'
                        + '• **How:** Tap a card → **Lineup** to add/remove\n'
                        + '• **Tip:** Cards in a lineup are **locked from sale** until the week ends',
                },
                {
                    name: '📈 2. Scoring System',
                    value:
                        '• **Base:** weekly score from real athlete performance\n'
                        + '• **Bonuses:** Force + Experience (XP) + Collection size\n'
                        + '• **Formula:** Base Score + Force + XP + Collection boost',
                },
                {
                    name: '⏱️ 3. Weekly Deadlines (Paris)',
                    value:
                        '• **Cycle:** Monday 00:01 → Sunday 23:59\n'
                        + '• **Editing:** Monday → **Thursday 23:59**\n'
                        + '• **Lock:** Friday → Sunday\n'
                        + '• **Results:** rankings & rewards every Monday',
                },
                {
                    name: '🏆 4. In-game Rewards',
                    value:
                        '• Tiered rewards by rank — every participant earns something\n'
                        + '• Payouts go to your **Peaxel wallet**\n'
                        + '• Consistent weekly play increases reward potential',
                },
                {
                    name: 'Need more help?',
                    value:
                        '**Step 1 — play free** with the button below.\n'
                        + 'Also: Docs, Community Hub, Zealy, Ace AI, and tickets.\n'
                        + 'On Discord: `/help` (Hub Pass) or `/how-to-play` anytime.',
                },
            )
            .setImage('attachment://faq-need-help.png')
            .setFooter({ text: 'Peaxel · The Next Generation of Scouting' }),
    },
];

function howToPlayButtons() {
    const ticketUrl = `https://discord.com/channels/${GUILD_ID}/${TICKET_CHANNEL_ID}`;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Play Now').setStyle(ButtonStyle.Link).setURL(PLAY_URL),
            new ButtonBuilder().setLabel('Full Guide').setStyle(ButtonStyle.Link).setURL(DOCS_URL),
            new ButtonBuilder().setLabel('Community Hub').setStyle(ButtonStyle.Link).setURL(`${HUB_URL}/app`),
            new ButtonBuilder().setLabel('Leaderboards').setStyle(ButtonStyle.Link).setURL(`${HUB_URL}/app/leaderboard`),
            new ButtonBuilder().setLabel('Zealy Quests').setStyle(ButtonStyle.Link).setURL(ZEALY_URL),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Ace AI Support').setStyle(ButtonStyle.Link).setURL(ACE_URL),
            new ButtonBuilder().setLabel('Open a Ticket').setStyle(ButtonStyle.Link).setURL(ticketUrl),
            new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(SITE_URL),
            new ButtonBuilder().setLabel('Trustpilot').setStyle(ButtonStyle.Link).setURL(TRUSTPILOT_URL),
        ),
    ];
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel?.isTextBased()) throw new Error(`Channel ${CHANNEL_ID} not text-based`);

        const fetched = await channel.messages.fetch({ limit: 50 });
        const byTitle = new Map();
        for (const msg of fetched.values()) {
            const title = msg.embeds?.[0]?.title;
            if (title && !byTitle.has(title)) byTitle.set(title, msg);
        }

        let updated = 0;
        for (const spec of updates) {
            const msg = byTitle.get(spec.matchTitle);
            if (!msg) {
                console.warn(`⚠️ Not found: ${spec.matchTitle}`);
                continue;
            }
            const payload = {
                embeds: [spec.build()],
                files: spec.files.map((f) => asset(f)),
            };
            if (spec.withButtons) payload.components = howToPlayButtons();
            await msg.edit(payload);
            console.log(`✅ Updated: ${spec.matchTitle} (${msg.id})`);
            updated++;
            await new Promise((r) => setTimeout(r, 800));
        }

        console.log(`Done — ${updated}/${updates.length} FAQ embeds updated.`);
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        client.destroy();
    }
});

if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN missing');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
