import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { discordLang, pick } from '../utils/discordLocale.js';
import { gameUrl, ZEALY_URL, DOCS_URL, DISCORD_REFS } from '../utils/peaxelLinks.js';

const LOGO_URL = 'https://media.peaxel.me/logo.png';

export const data = new SlashCommandBuilder()
    .setName('how-to-play')
    .setDescription('Learn the game mechanics in 60 seconds')
    .setDescriptionLocalizations({
        fr: 'Les mécaniques du jeu en 60 secondes',
    });

export async function execute(interaction) {
    const locale = interaction.locale;
    const fr = discordLang(locale) === 'fr';
    const playUrl = gameUrl(DISCORD_REFS.howToPlay);

    const embed = fr
        ? new EmbedBuilder()
            .setTitle('🎮 COMMENT JOUER À PEAXEL | Guide officiel')
            .setDescription('Maîtrise le jeu de scouting ! Voici l’essentiel pour dominer le classement.\n\u200b')
            .setColor('#a855f7')
            .setThumbnail(LOGO_URL)
            .addFields(
                { name: '🏃 1. Compose ton lineup', value: '• **Où :** *Team → All My Cards*.\n• **Taille :** min 1, max 5 cartes.\n• **Astuce :** les cartes sont verrouillées pendant la semaine.\n\u200b' },
                { name: '📈 2. Scoring', value: '• **Formule :** Score de base (perf réelle) + Force + XP + boost collection.\n\u200b' },
                { name: '⏱️ 3. Deadlines hebdo', value: '• **Lundi :** ouverture.\n• **Jeudi 23:59 :** freeze du lineup.\n• **Lundi :** résultats & rewards.\n\u200b' },
                { name: '🤖 4. Autoplay', value: '• **Ace Bot :** draft auto de tes meilleures cartes du lundi au mercredi.\n\u200b' },
                { name: '🏆 5. Rewards', value: '• **Classements :** rewards selon ta perf.\n• **Wallet :** paiements vers ton wallet Peaxel.\n\u200b' },
                { name: '⭐ 6. Communauté', value: '• **Soutiens-nous :** laisse un [avis Trustpilot](https://www.trustpilot.com/review/peaxel.me) !\n• **Rewards :** **200 XP Zealy** par avis vérifié.' },
            )
            .setFooter({ text: 'Peaxel • The Next Generation of Scouting', iconURL: LOGO_URL })
            .setTimestamp()
        : new EmbedBuilder()
            .setTitle('🎮 HOW TO PLAY PEAXEL | Official Guide')
            .setDescription('Master the scouting game! Here is everything you need to know to dominate the leaderboard.\n\u200b')
            .setColor('#a855f7')
            .setThumbnail(LOGO_URL)
            .addFields(
                { name: '🏃 1. Build your Lineup', value: '• **Where:** Go to *Team → All My Cards*.\n• **Size:** Min 1, Max 5 cards per lineup.\n• **Tip:** Cards are locked during the week.\n\u200b' },
                { name: '📈 2. Scoring System', value: '• **Formula:** Base Score (Real Performance) + Force + XP + Collection boost.\n\u200b' },
                { name: '⏱️ 3. Weekly Deadlines', value: '• **Monday:** Opening.\n• **Thursday 23:59:** Lineup Freeze.\n• **Monday:** Results & Rewards.\n\u200b' },
                { name: '🤖 4. Autoplay Feature', value: '• **Ace Bot:** Automatically drafts your best cards from Mon. to Wed.\n\u200b' },
                { name: '🏆 5. Rewards', value: '• **Rankings:** Earn rewards based on your performance.\n• **Wallet:** Payments sent straight to your Peaxel wallet.\n\u200b' },
                { name: '⭐ 6. Community Power', value: '• **Support us:** Help Peaxel grow by leaving a [Trustpilot review](https://www.trustpilot.com/review/peaxel.me)!\n• **Rewards:** Claim **200 XP on Zealy** for every verified review.' },
            )
            .setFooter({ text: 'Peaxel • The Next Generation of Scouting', iconURL: LOGO_URL })
            .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel(pick(locale, 'Play Now 🎮', 'Jouer 🎮'))
            .setStyle(ButtonStyle.Link)
            .setURL(playUrl),
        new ButtonBuilder()
            .setLabel(pick(locale, 'Full Guide 📖', 'Guide complet 📖'))
            .setStyle(ButtonStyle.Link)
            .setURL(DOCS_URL),
        new ButtonBuilder()
            .setLabel(pick(locale, 'Review Us ⭐', 'Avis Trustpilot ⭐'))
            .setStyle(ButtonStyle.Link)
            .setURL('https://www.trustpilot.com/review/peaxel.me'),
        new ButtonBuilder()
            .setLabel(pick(locale, 'Zealy XP 🏆', 'XP Zealy 🏆'))
            .setStyle(ButtonStyle.Link)
            .setURL(ZEALY_URL),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}
