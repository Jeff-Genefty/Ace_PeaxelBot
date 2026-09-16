/**
 * One-shot: post Peaxel FAQ embeds to a Discord channel.
 * Usage: node scripts/post-faq-channel.js
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
import { resolve } from 'path';

config();

const CHANNEL_ID = '1370054311949631648';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1369976254647898152';
const TICKET_CHANNEL_ID = process.env.TICKET_CHANNEL_ID || '1369976260066803794';
const HUB_URL = process.env.WEB_BASE_URL || 'https://peaxel.genefty.com';
const ASSETS = resolve('./assets');

function asset(name) {
    return new AttachmentBuilder(resolve(ASSETS, name), { name });
}

function embedImage(fileName) {
    return `attachment://${fileName}`;
}

const messages = [
    {
        files: ['faq-welcome.png'],
        embed: () => new EmbedBuilder()
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
            .setImage(embedImage('faq-welcome.png'))
            .setFooter({ text: 'Peaxel · Own the Game. Manage Real Athletes.' })
            .setTimestamp(),
    },
    {
        files: ['faq-what-is-peaxel.png'],
        embed: () => new EmbedBuilder()
            .setColor(0x22d3ee)
            .setTitle('💎 What is Peaxel?')
            .setDescription(
                'Peaxel is a platform where **talents and fans connect through collectible athlete cards**.\n'
                + 'It is an innovative way to **support and engage with rising stars** — and to compete every Gameweek with your lineup.',
            )
            .addFields(
                {
                    name: 'The game (scouting)',
                    value:
                        'Build a lineup of **1–5 athlete cards**, score from **real-world performances**, climb the weekly ranking, '
                        + 'and earn rewards in your Peaxel wallet.\n'
                        + 'Play at **https://game.peaxel.me** · full rules: `/how-to-play` or https://docs.peaxel.me',
                },
                {
                    name: 'Alpha & Beta access',
                    value:
                        '• **Alpha** is an early live version of the platform (selected testers).\n'
                        + '• Core loops available today include **card collecting**, **Gameweeks**, and the **Community Hub** on Discord.\n'
                        + '• Features keep evolving — marketplace filters, collections, talent evolution and deeper engagement tools arrive progressively.\n'
                        + '• Watch **#announcements** for invite campaigns and new openings.',
                },
                {
                    name: 'How do I join / get more access?',
                    value:
                        '1. Get the **🌐 • Beta Tester** role (when available)\n'
                        + '2. Complete quests in **🪄│zealy-quests** — https://zealy.io/c/peaxel\n'
                        + '3. Stay active on Discord + in-game to unlock rewards and roles',
                },
            )
            .setImage(embedImage('faq-what-is-peaxel.png'))
            .setFooter({ text: 'Peaxel · Platform overview' }),
    },
    {
        files: ['faq-community-hub.png'],
        embed: () => new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle('🏟️ Community Hub on Discord')
            .setDescription(
                'The **Peaxel Community Hub** tracks your Discord activity and turns it into progression:\n'
                + '**Hub XP → levels → weekly challenges → card vault → Gameweek leaderboards.**\n\n'
                + 'It lives in two places:\n'
                + '• **Discord** — `/daily`, `/rank`, `/help`\n'
                + `• **Web** — ${HUB_URL}/app (Discord login required · Peaxel server members only)`,
            )
            .addFields(
                {
                    name: 'What you can do on /app',
                    value:
                        '• See your **level, XP bar, streak** and weekly rank\n'
                        + '• Track **weekly challenges** (auto-validated from Discord actions)\n'
                        + '• Open your **card vault** and claim rewards\n'
                        + '• Browse **weekly & all-time leaderboards** + manager profiles\n'
                        + '• Enable a **GW deadline reminder** (Discord DM)',
                },
                {
                    name: 'Bugs, support & tickets',
                    value:
                        `Report issues or claim deliveries via <#${TICKET_CHANNEL_ID}>.\n`
                        + 'Top contributors may be rewarded for useful bug reports and community help.',
                },
            )
            .setImage(embedImage('faq-community-hub.png'))
            .setFooter({ text: 'Peaxel Hub · Discord + Web' }),
    },
    {
        files: ['faq-hub-xp.png'],
        embed: () => new EmbedBuilder()
            .setColor(0xfbbf24)
            .setTitle('⚡ Earning Hub XP')
            .setDescription(
                'Hub XP powers your **Hub Pass** progression (titles from Rookie → Hall of Fame).\n'
                + 'XP is earned from Discord activity — not from in-game lineup score.',
            )
            .addFields(
                {
                    name: 'Main XP sources',
                    value:
                        '• **Messages** — 15–25 XP (max **1 counted / 60 seconds** — anti-farm)\n'
                        + '• **`/daily`** — +40 XP once per day (**Europe/Paris**)\n'
                        + '• **Weekly challenge task** — +25 XP each\n'
                        + '• **Full weekly quest** — +100 XP\n'
                        + '• **Feedback** +30 · **Quiz join** +15 · **Quiz win** +50\n'
                        + '• **Giveaway entry** +10 · **Weekly XP #1** +150',
                },
                {
                    name: 'How /daily works',
                    value:
                        '1. Send **at least one message** on this Discord server today (Paris day)\n'
                        + '2. Run **`/daily`**\n'
                        + '3. Keep your **streak** alive for milestone bonuses',
                },
                {
                    name: 'Streak milestones',
                    value:
                        '• **7 days** → +100 XP + Athlete Card\n'
                        + '• **14 days** → +200 XP + Athlete Card\n'
                        + '• **30 days** → +500 XP + Athlete Card\n'
                        + '_Miss a day → streak resets to 1._\n\n'
                        + '**Important:** leveling up unlocks **titles only** — it does **not** drop a card.',
                },
            )
            .setImage(embedImage('faq-hub-xp.png'))
            .setFooter({ text: 'Peaxel Hub · /daily · /rank' }),
    },
    {
        files: ['faq-challenges-vault.png'],
        embed: () => new EmbedBuilder()
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
                    name: 'Alpha / community rewards (beyond Hub XP)',
                    value:
                        'Active testers can also earn physical goodies, collectible cards/NFTs, special Discord roles '
                        + '(Beta Tester, Bug Hunter, Verified Ambassador), Zealy boosts, lootboxes, weekly spotlights, '
                        + 'and access to private channels — mostly via **Zealy + Discord + in-game activity**.',
                },
            )
            .setImage(embedImage('faq-challenges-vault.png'))
            .setFooter({ text: 'Peaxel Hub · Challenges · Vault' }),
    },
    {
        files: ['faq-leaderboards.png'],
        embed: () => new EmbedBuilder()
            .setColor(0xf472b6)
            .setTitle('🏆 Hub leaderboards')
            .setDescription(
                'There are **two Hub rankings**. Both are visible on the web Hub after Discord login.',
            )
            .addFields(
                {
                    name: 'This week (Gameweek board)',
                    value:
                        '• Ranks **XP earned during the current Gameweek** (not lifetime XP)\n'
                        + '• Resets every **Monday** with the new GW\n'
                        + '• Top 10 preview on `/app`\n'
                        + '• Full board: `/app/leaderboard?tab=week`\n'
                        + '• **#1 every Sunday ~20:05 (Paris)** → **+150 XP + Athlete Card** + Discord announcement',
                },
                {
                    name: 'All-time (global board)',
                    value:
                        '• Ranks your **total Hub Pass XP**\n'
                        + '• Does **not** reset each week\n'
                        + '• Full board: `/app/leaderboard?tab=global`\n'
                        + '• Click any manager name to open their **profile card** (avatar, roles, XP, streak…)',
                },
                {
                    name: 'Discord shortcut',
                    value: 'Use **`/rank`** anytime for your level, weekly rank, streak and a Top 3 preview.',
                },
            )
            .setImage(embedImage('faq-leaderboards.png'))
            .setFooter({ text: 'Peaxel Hub · Weekly #1 · All-time XP' }),
    },
    {
        files: ['faq-withdrawals.png'],
        embed: () => new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('💸 Withdrawals & payouts')
            .setDescription(
                'Rewards go to your **Peaxel wallet**. Cash withdrawals are paid out via **wire transfer** or **Stripe**, '
                + 'depending on your **location / region**. Payouts follow a fixed schedule — they are **not** instant or on-demand.',
            )
            .addFields(
                {
                    name: 'Payout methods',
                    value:
                        '• **Wire transfer** or **Stripe** — available method depends on your **geolocation**\n'
                        + '• The option shown in your Peaxel account is the one enabled for your region\n'
                        + '• We cannot force a method that is unavailable in your country',
                },
                {
                    name: 'Processing schedule',
                    value:
                        '• Withdrawals are processed **once per day**\n'
                        + '• **Monday to Friday only** (no weekend processing)\n'
                        + '• Instant / on-demand payouts are **not available**',
                },
                {
                    name: 'Important notice',
                    value:
                        'Please **do not open repeated tickets** asking when your payment will arrive or which method you “should” get.\n\n'
                        + 'If ticket volume about payment timing continues, we will:\n'
                        + '1. **Auto-close** those tickets\n'
                        + '2. Move payout processing to **once per week** instead of daily\n\n'
                        + 'Thanks for your understanding — this keeps payouts fast and fair for everyone.',
                },
                {
                    name: 'Need help?',
                    value:
                        'Open a ticket only for **real payout issues** (missing transfer after the expected window, '
                        + 'failed Stripe payout, wrong bank details, etc.) — not for “when will I get paid?” '
                        + 'or “can I switch to Stripe/wire?” questions.',
                },
            )
            .setImage(embedImage('faq-withdrawals.png'))
            .setFooter({ text: 'Peaxel · Withdrawals · Wire / Stripe by region · Mon–Fri' }),
    },
    {
        files: ['faq-need-help.png'],
        components: true,
        embed: () => new EmbedBuilder()
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
                        'Use the buttons below for Play, Docs, Community Hub, Zealy, Ace AI, and tickets.\n'
                        + 'On Discord you can also run `/help` (Hub Pass) or `/how-to-play` anytime.',
                },
            )
            .setImage(embedImage('faq-need-help.png'))
            .setFooter({ text: 'Peaxel · The Next Generation of Scouting' }),
    },
];

function howToPlayButtons() {
    const ticketUrl = `https://discord.com/channels/${GUILD_ID}/${TICKET_CHANNEL_ID}`;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Play Now').setStyle(ButtonStyle.Link).setURL('https://game.peaxel.me'),
            new ButtonBuilder().setLabel('Full Guide').setStyle(ButtonStyle.Link).setURL('https://docs.peaxel.me/'),
            new ButtonBuilder().setLabel('Community Hub').setStyle(ButtonStyle.Link).setURL(`${HUB_URL}/app`),
            new ButtonBuilder().setLabel('Leaderboards').setStyle(ButtonStyle.Link).setURL(`${HUB_URL}/app/leaderboard`),
            new ButtonBuilder().setLabel('Zealy Quests').setStyle(ButtonStyle.Link).setURL('https://zealy.io/c/peaxel'),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Ace AI Support').setStyle(ButtonStyle.Link).setURL('https://ace.peaxel.me'),
            new ButtonBuilder().setLabel('Open a Ticket').setStyle(ButtonStyle.Link).setURL(ticketUrl),
            new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL('https://peaxel.me'),
            new ButtonBuilder().setLabel('Trustpilot').setStyle(ButtonStyle.Link).setURL('https://www.trustpilot.com/review/peaxel.me'),
        ),
    ];
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel?.isTextBased()) throw new Error(`Channel ${CHANNEL_ID} not text-based`);

        console.log(`Posting ${messages.length} FAQ messages to #${channel.name || CHANNEL_ID}…`);

        for (let i = 0; i < messages.length; i++) {
            const spec = messages[i];
            const files = spec.files.map((f) => asset(f));
            const payload = {
                embeds: [spec.embed()],
                files,
            };
            if (spec.components) payload.components = howToPlayButtons();

            const sent = await channel.send(payload);
            console.log(`✅ ${i + 1}/${messages.length} → ${sent.id}`);
            await new Promise((r) => setTimeout(r, 1200));
        }

        console.log('Done.');
    } catch (err) {
        console.error('Failed:', err);
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
