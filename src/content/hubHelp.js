/**
 * Contenu d’aide Hub — partagé entre /help Discord et la FAQ landing.
 * Discord : topics EN/FR selon interaction.locale.
 */

import { discordLang } from '../utils/discordLocale.js';

const HELP_TOPICS_EN = {
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
    withdrawals: {
        title: '💸 Withdrawals & payouts',
        color: 0x10b981,
        description:
            'Rewards go to your **Peaxel wallet**. Cash withdrawals are paid out via **wire transfer** or **Stripe**, '
            + 'depending on your **location / region**. Payouts follow a fixed schedule — they are **not** instant or on-demand.',
        fields: [
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
        ],
    },
};

const HELP_TOPICS_FR = {
    hub_xp: {
        title: '⚡ XP Hub & niveaux',
        color: 0x22d3ee,
        description:
            'Le **Peaxel Hub Pass** suit ton activité communauté sur Discord.\n'
            + 'Gagne de l’XP → monte de niveau → titres de **Rookie** à **Hall of Fame**.',
        fields: [
            {
                name: 'Comment marche l’XP',
                value:
                    '• Messages : **15–25 XP** (max 1 / 60 s — anti-farm)\n'
                    + '• `/daily` : **+40 XP** (1× / jour Paris)\n'
                    + '• Tâches défi hebdo : **+25 XP** chacune\n'
                    + '• Quête hebdo complète : **+100 XP**\n'
                    + '• Feedback : **+30** · Quiz join : **+15** · Quiz win : **+50**\n'
                    + '• Giveaway : **+10** · #1 hebdo : **+150**',
            },
            {
                name: 'Où suivre',
                value:
                    '• Discord : `/rank` — niveau, XP GW, streak, cartes pending\n'
                    + '• Web : [Hub Peaxel `/app`](https://peaxel.genefty.com/app) après login Discord',
            },
        ],
    },
    hub_daily: {
        title: '☀️ Daily Connect & streaks',
        color: 0xfbbf24,
        description:
            'Claim 1× / jour (**Europe/Paris**). Un message serveur est requis avant.',
        fields: [
            {
                name: 'Comment claim',
                value:
                    '1. Envoie **au moins un message** sur le Discord aujourd’hui\n'
                    + '2. Lance **`/daily`**\n'
                    + '3. Reçois **+40 XP Hub** et garde ton streak',
            },
            {
                name: 'Jalons streak',
                value:
                    '• **7 jours** → +100 XP + carte Athlete\n'
                    + '• **14 jours** → +200 XP + carte Athlete\n'
                    + '• **30 jours** → +500 XP + carte Athlete\n'
                    + '_Un jour manqué → streak remis à 1._',
            },
        ],
    },
    hub_challenges: {
        title: '🎯 Défis hebdo',
        color: 0xa855f7,
        description:
            'Chaque **lundi**, de nouvelles missions apparaissent sur le Hub (`/app`) et sont **auto-validées** depuis Discord.',
        fields: [
            {
                name: 'Ce que tu gagnes',
                value:
                    '• **3 missions rotatives** + quête fixe **« envoyer 10 messages »**\n'
                    + '• **+25 XP** / tâche · **+100 XP** quand tout est fait\n'
                    + '• La quête complète donne aussi une **carte Athlete pending**',
            },
            {
                name: 'Exemples de missions',
                value:
                    '`/daily` ×3 · quiz · giveaway · feedback · reacts · welcome · partager une carte · GW react…',
            },
            {
                name: 'Preuve de claim',
                value:
                    'Une fois terminé, capture ton panel Hub (tampon PEAXEL HUB + GW + pseudo) et ouvre un ticket Discord si le staff le demande.',
            },
        ],
    },
    hub_vault: {
        title: '🃏 Coffre de cartes',
        color: 0x34d399,
        description:
            'Les cartes gagnées arrivent dans ton **coffre Hub** jusqu’au claim.',
        fields: [
            {
                name: 'Comment gagner des cartes',
                value:
                    '• Finir la **quête hebdo**\n'
                    + '• Atteindre un jalon **streak daily** (7 / 14 / 30)\n'
                    + '• Gagner le **Scout Quiz**\n'
                    + '• Finir **#1** au classement XP hebdo',
            },
            {
                name: 'Comment claim',
                value:
                    '1. Ouvre [Hub `/app`](https://peaxel.genefty.com/app) → **Coffre**\n'
                    + '2. Clique **Réclamer**\n'
                    + '3. Ouvre un ticket Discord avec capture Hub — le staff livre la carte',
            },
        ],
    },
    hub_leaderboard: {
        title: '🏆 Classement GW',
        color: 0xf472b6,
        description:
            'L’XP gagnée **cette Gameweek** forme le classement Hub (pas l’XP lifetime).',
        fields: [
            {
                name: 'Champion hebdo',
                value:
                    '• Top 10 sur `/app` · aperçu dans `/rank`\n'
                    + '• **#1** chaque dimanche soir → **+150 XP** + carte Athlete\n'
                    + '• Annoncé sur Discord après la clôture de la GW',
            },
        ],
    },
    hub_commands: {
        title: '🤖 Commandes Hub',
        color: 0x818cf8,
        description: 'Slash commands utiles sur ce Discord :',
        fields: [
            {
                name: 'Progression',
                value:
                    '• `/daily` — claim XP du jour (message requis)\n'
                    + '• `/rank [user]` — niveau, XP GW, streak, coffre\n'
                    + '• `/help` — ce menu',
            },
            {
                name: 'Communauté & jeu',
                value:
                    '• `/scoutQuiz` — lancer / rejoindre le quiz\n'
                    + '• `/how-to-play` — règles Peaxel (lineups & scoring)\n'
                    + '• `/feedback` — laisser un feedback si dispo',
            },
            {
                name: 'Hub web',
                value: '[peaxel.genefty.com/app](https://peaxel.genefty.com/app) — défis, coffre, classement, rappel GW.',
            },
        ],
    },
    hub_faq: {
        title: '❓ FAQ Hub',
        color: 0x94a3b8,
        description: 'Réponses rapides sur le Community Hub :',
        fields: [
            {
                name: 'Pourquoi je ne peux pas `/daily` ?',
                value: 'Tu dois envoyer **un message Discord aujourd’hui** (fuseau Paris) avant de claim.',
            },
            {
                name: 'Est-ce que j’ai une carte au level-up ?',
                value: 'Non — les cartes viennent des quêtes, streaks, quiz wins et du #1 hebdo.',
            },
            {
                name: 'Quand le classement hebdo reset ?',
                value: 'À chaque nouvelle Gameweek (lundi). La récompense podium est le dimanche soir.',
            },
            {
                name: 'L’XP message est-elle illimitée ?',
                value: 'Non — **un message toutes les 60 secondes** donne de l’XP (15–25).',
            },
        ],
    },
    withdrawals: {
        title: '💸 Retraits & paiements',
        color: 0x10b981,
        description:
            'Les rewards vont dans ton **wallet Peaxel**. Les retraits cash passent par **virement** ou **Stripe**, '
            + 'selon ta **localisation / région**. Les paiements suivent un planning fixe — ce n’est **pas** instantané ni à la demande.',
        fields: [
            {
                name: 'Méthodes de paiement',
                value:
                    '• **Virement** ou **Stripe** — la méthode disponible dépend de ta **géolocalisation**\n'
                    + '• L’option affichée sur ton compte Peaxel est celle activée pour ta région\n'
                    + '• On ne peut pas forcer une méthode indisponible dans ton pays',
            },
            {
                name: 'Planning de traitement',
                value:
                    '• Les retraits sont traités **une fois par jour**\n'
                    + '• **Du lundi au vendredi uniquement** (pas le week-end)\n'
                    + '• Les paiements instantanés / à la demande ne sont **pas disponibles**',
            },
            {
                name: 'Avertissement important',
                value:
                    'Merci de **ne pas ouvrir des tickets répétés** pour demander quand ton paiement arrivera ou quelle méthode tu « devrais » avoir.\n\n'
                    + 'Si le volume de tickets sur le timing des paiements continue, nous :\n'
                    + '1. **Fermerons automatiquement** ces tickets\n'
                    + '2. Passerons à un traitement **une fois par semaine** au lieu de quotidien\n\n'
                    + 'Merci de ta compréhension — ça garde les paiements rapides et équitables pour tout le monde.',
            },
            {
                name: 'Besoin d’aide ?',
                value:
                    'Ouvre un ticket uniquement pour un **vrai problème de payout** (virement manquant après la fenêtre attendue, '
                    + 'échec Stripe, mauvaises coordonnées bancaires, etc.) — pas pour « quand suis-je payé ? » '
                    + 'ou « puis-je passer en Stripe/virement ? ».',
            },
        ],
    },
};

const HELP_MENU_OPTIONS_EN = [
    { label: 'Hub XP & Levels', description: 'Earn XP, levels & titles.', value: 'hub_xp', emoji: '⚡' },
    { label: 'Daily & Streaks', description: '/daily, milestones, cards.', value: 'hub_daily', emoji: '☀️' },
    { label: 'Weekly Challenges', description: 'Missions & quest rewards.', value: 'hub_challenges', emoji: '🎯' },
    { label: 'Card Vault', description: 'Earn & claim Athlete Cards.', value: 'hub_vault', emoji: '🃏' },
    { label: 'GW Leaderboard', description: 'Weekly XP ranking & #1 prize.', value: 'hub_leaderboard', emoji: '🏆' },
    { label: 'Hub Commands', description: 'Slash commands & /app.', value: 'hub_commands', emoji: '🤖' },
    { label: 'Hub FAQ', description: 'Common Hub questions.', value: 'hub_faq', emoji: '❓' },
    { label: 'Withdrawals & payouts', description: 'Wire / Stripe, schedule, tickets.', value: 'withdrawals', emoji: '💸' },
    { label: 'How to Play', description: 'Official game guide.', value: 'link_play', emoji: '🎮' },
    { label: 'Cards & Rarity', description: 'Athlete cards docs.', value: 'link_cards', emoji: '💎' },
    { label: 'Support / Ace AI', description: 'Chat with Ace.', value: 'link_support', emoji: '🛠️' },
    { label: 'Review Peaxel', description: 'Trustpilot + Zealy XP.', value: 'link_trustpilot', emoji: '⭐' },
];

const HELP_MENU_OPTIONS_FR = [
    { label: 'XP Hub & niveaux', description: 'XP, niveaux & titres.', value: 'hub_xp', emoji: '⚡' },
    { label: 'Daily & streaks', description: '/daily, jalons, cartes.', value: 'hub_daily', emoji: '☀️' },
    { label: 'Défis hebdo', description: 'Missions & récompenses.', value: 'hub_challenges', emoji: '🎯' },
    { label: 'Coffre de cartes', description: 'Gagner & claimer des cartes.', value: 'hub_vault', emoji: '🃏' },
    { label: 'Classement GW', description: 'XP hebdo & prix #1.', value: 'hub_leaderboard', emoji: '🏆' },
    { label: 'Commandes Hub', description: 'Slash commands & /app.', value: 'hub_commands', emoji: '🤖' },
    { label: 'FAQ Hub', description: 'Questions fréquentes.', value: 'hub_faq', emoji: '❓' },
    { label: 'Retraits & paiements', description: 'Virement / Stripe, planning, tickets.', value: 'withdrawals', emoji: '💸' },
    { label: 'Comment jouer', description: 'Guide officiel du jeu.', value: 'link_play', emoji: '🎮' },
    { label: 'Cartes & rareté', description: 'Docs cartes Athlete.', value: 'link_cards', emoji: '💎' },
    { label: 'Support / Ace AI', description: 'Parler à Ace.', value: 'link_support', emoji: '🛠️' },
    { label: 'Avis Peaxel', description: 'Trustpilot + XP Zealy.', value: 'link_trustpilot', emoji: '⭐' },
];

/** @deprecated Prefer getHelpTopics(locale) */
export const HELP_TOPICS = HELP_TOPICS_EN;
/** @deprecated Prefer getHelpMenuOptions(locale) */
export const HELP_MENU_OPTIONS = HELP_MENU_OPTIONS_EN;

export function getHelpTopics(locale) {
    return discordLang(locale) === 'fr' ? HELP_TOPICS_FR : HELP_TOPICS_EN;
}

export function getHelpMenuOptions(locale) {
    return discordLang(locale) === 'fr' ? HELP_MENU_OPTIONS_FR : HELP_MENU_OPTIONS_EN;
}
