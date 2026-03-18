import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('how-to-play')
    .setDescription('Learn the game mechanics in 60 seconds 🌶️');

export async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("🎮 HOW TO PLAY PEAXEL | Official Guide")
        .setDescription("Master the scouting game! Here is everything you need to know to dominate the leaderboard.\n\u200b")
        .setColor("#a855f7")
        .setThumbnail("https://peaxel.me/wp-content/uploads/2025/06/peaxel_logo_beta-1.png")
        .addFields(
            { name: "🏃 1. Build your Lineup", value: "• **Where:** Go to *Team → All My Cards*.\n• **Size:** Min 1, Max 5 cards per lineup.\n• **Tip:** Cards are locked during the week.\n\u200b" },
            { name: "📈 2. Scoring System", value: "• **Formula:** Base Score (Real Performance) + Force + XP + Collection boost.\n\u200b" },
            { name: "⏱️ 3. Weekly Deadlines", value: "• **Monday:** Opening.\n• **Thursday 23:59:** Lineup Freeze.\n• **Monday:** Results & Rewards.\n\u200b" },
            { name: "🤖 4. Autoplay Feature", value: "• **Ace Bot:** Automatically drafts your best cards from Mon. to Wed.\n\u200b" },
            { name: "🏆 5. Rewards", value: "• **Rankings:** Earn rewards based on your performance.\n• **Wallet:** Payments sent straight to your Peaxel wallet.\n\u200b" },
            { name: "⭐ 6. Community Power", value: "• **Support us:** Help Peaxel grow by leaving a [Trustpilot review](https://www.trustpilot.com/review/peaxel.me)!\n• **Rewards:** Claim **200 XP on Zealy** for every verified review." }
        )
        .setFooter({ text: "Peaxel • The Next Generation of Scouting", iconURL: "https://peaxel.me/wp-content/uploads/2025/06/peaxel_logo_beta-1.png" })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Play Now 🎮').setStyle(ButtonStyle.Link).setURL('https://game.peaxel.me'),
        new ButtonBuilder().setLabel('Full Guide 📖').setStyle(ButtonStyle.Link).setURL('https://docs.peaxel.me/'),
        new ButtonBuilder().setLabel('Review Us ⭐').setStyle(ButtonStyle.Link).setURL('https://www.trustpilot.com/review/peaxel.me'),
        new ButtonBuilder().setLabel('Zealy XP 🏆').setStyle(ButtonStyle.Link).setURL('https://zealy.io/c/peaxel')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}