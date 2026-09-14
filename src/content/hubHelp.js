/**
 * Contenu d’aide Hub — partagé entre /help Discord et la FAQ landing.
 * Discord : topics EN (slash commands EN).
 * Landing : FAQ bilingue via i18n (home.faq / faq).
 */

/** Topics Discord pour le menu /help */
export const HELP_TOPICS = {
    hub_xp: {
        title: '⚡ Hub XP & Levels',
        color: 0x22d3ee,
        description:
            'The **Peaxel Hub Pass** tracks your community activity on Discord.\n'
            + 'Earn XP → level up → climb titles from **Rookie** to **Hall of Fame**.',
        fields: [
            {
                name: 'How XP works',
                value:
                    '• Messages: **15–25 XP** (max 1 counted / 60s — anti-farm)\n'
                    + '• `/daily`: **+40 XP** (once per Paris day)\n'
                    + '• Weekly challenge tasks: **+25 XP** each\n'
                    + '• Full weekly quest: **+100 XP**\n'
                    + '• Feedback: **+30** · Quiz join: **+15** · Quiz win: **+50**\n'
                    + '• Giveaway entry: **+10** · Weekly #1: **+150**',
            },
            {
                name: 'Where to track it',
                value:
                    '• Discord: `/rank` — level, GW XP, streak, pending cards\n'
                    + '• Web: [Peaxel Hub `/app`](https://peaxel.genefty.com/app) after Discord login',
            },
        ],
    },
    hub_daily: {
        title: '☀️ Daily Connect & Streaks',
        color: 0xfbbf24,
        description:
            'Claim once per day (**Europe/Paris**). A server message is required first.',
        fields: [
            {
                name: 'How to claim',
                value:
                    '1. Write **at least one message** on the Discord server today\n'
                    + '2. Run **`/daily`**\n'
                    + '3. Get **+40 Hub XP** and keep your streak alive',
            },
            {
                name: 'Streak milestones',
                value:
                    '• **7 days** → +100 XP + Athlete Card\n'
                    + '• **14 days** → +200 XP + Athlete Card\n'
                    + '• **30 days** → +500 XP + Athlete Card\n'
                    + '_Miss a day → streak resets to 1._',
            },
        ],
    },
    hub_challenges: {
        title: '🎯 Weekly Challenges',
        color: 0xa855f7,
        description:
            'Every **Monday**, new missions appear on your Hub (`/app`) and are **auto-validated** from Discord actions.',
        fields: [
            {
                name: 'What you get',
                value:
                    '• **3 rotating missions** + fixed quest **“send 10 messages”**\n'
                    + '• **+25 XP** per task · **+100 XP** when all are done\n'
                    + '• Completing the full quest also grants a **pending Athlete Card**',
            },
            {
                name: 'Example missions',
                value:
                    '`/daily` ×3 · quiz · giveaway · feedback · reacts · welcome · share a card · GW react…',
            },
            {
                name: 'Claim proof',
                value:
                    'When done, screenshot your Hub panel (PEAXEL HUB stamp + GW + username) and open a Discord ticket if staff asks.',
            },
        ],
    },
    hub_vault: {
        title: '🃏 Card Vault',
        color: 0x34d399,
        description:
            'Won cards land in your **Hub chest** until you claim them.',
        fields: [
            {
                name: 'How to earn cards',
                value:
                    '• Finish the **weekly quest**\n'
                    + '• Hit a **daily streak** milestone (7 / 14 / 30)\n'
                    + '• Win the **Scout Quiz**\n'
                    + '• Finish **#1** on the weekly XP leaderboard',
            },
            {
                name: 'How to claim',
                value:
                    '1. Open [Hub `/app`](https://peaxel.genefty.com/app) → **Card vault**\n'
                    + '2. Click **Claim**\n'
                    + '3. Open a Discord ticket with a Hub screenshot — staff delivers the card',
            },
        ],
    },
    hub_leaderboard: {
        title: '🏆 GW Leaderboard',
        color: 0xf472b6,
        description:
            'XP earned **this Gameweek** builds the Hub ranking (not lifetime XP).',
        fields: [
            {
                name: 'Weekly champion',
                value:
                    '• Top 10 on `/app` · preview in `/rank`\n'
                    + '• **#1** every Sunday evening → **+150 XP** + Athlete Card\n'
                    + '• Announced on Discord after the Gameweek closes',
            },
        ],
    },
    hub_commands: {
        title: '🤖 Hub Commands',
        color: 0x818cf8,
        description: 'Useful slash commands on this Discord:',
        fields: [
            {
                name: 'Progression',
                value:
                    '• `/daily` — claim daily XP (message required)\n'
                    + '• `/rank [user]` — level, GW XP, streak, vault preview\n'
                    + '• `/help` — this menu',
            },
            {
                name: 'Community & game',
                value:
                    '• `/scoutQuiz` — launch / join the scout quiz\n'
                    + '• `/how-to-play` — Peaxel game rules (lineups & scoring)\n'
                    + '• `/feedback` — share feedback when available',
            },
            {
                name: 'Web Hub',
                value: '[peaxel.genefty.com/app](https://peaxel.genefty.com/app) — challenges, vault, leaderboard, GW reminder.',
            },
        ],
    },
    hub_faq: {
        title: '❓ Hub FAQ',
        color: 0x94a3b8,
        description: 'Quick answers about the Community Hub:',
        fields: [
            {
                name: 'Why can’t I `/daily`?',
                value: 'You must send **one Discord message today** (Paris timezone) before claiming.',
            },
            {
                name: 'Do I get a card on level up?',
                value: 'No — cards come from quests, streaks, quiz wins, and weekly #1.',
            },
            {
                name: 'When does the weekly ranking reset?',
                value: 'With each new Gameweek (Monday). Podium reward is settled Sunday evening.',
            },
            {
                name: 'Is message XP unlimited?',
                value: 'No — only **one message every 60 seconds** grants XP (15–25).',
            },
        ],
    },
};

export const HELP_MENU_OPTIONS = [
    { label: 'Hub XP & Levels', description: 'Earn XP, levels & titles.', value: 'hub_xp', emoji: '⚡' },
    { label: 'Daily & Streaks', description: '/daily, milestones, cards.', value: 'hub_daily', emoji: '☀️' },
    { label: 'Weekly Challenges', description: 'Missions & quest rewards.', value: 'hub_challenges', emoji: '🎯' },
    { label: 'Card Vault', description: 'Earn & claim Athlete Cards.', value: 'hub_vault', emoji: '🃏' },
    { label: 'GW Leaderboard', description: 'Weekly XP ranking & #1 prize.', value: 'hub_leaderboard', emoji: '🏆' },
    { label: 'Hub Commands', description: 'Slash commands & /app.', value: 'hub_commands', emoji: '🤖' },
    { label: 'Hub FAQ', description: 'Common Hub questions.', value: 'hub_faq', emoji: '❓' },
    { label: 'How to Play', description: 'Official game guide.', value: 'link_play', emoji: '🎮' },
    { label: 'Cards & Rarity', description: 'Athlete cards docs.', value: 'link_cards', emoji: '💎' },
    { label: 'Support / Ace AI', description: 'Chat with Ace.', value: 'link_support', emoji: '🛠️' },
    { label: 'Review Peaxel', description: 'Trustpilot + Zealy XP.', value: 'link_trustpilot', emoji: '⭐' },
];

/** Discord select menus max 25 options — we have 11, OK. Max 5 if we need to split — fine. */
