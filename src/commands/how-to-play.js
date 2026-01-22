import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Command to display Peaxel game mechanics and useful links
 */
export const data = new SlashCommandBuilder()
    .setName('how-to-play')
    .setDescription('Learn the game mechanics in 60 seconds 🌶️');

export async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("🎮 HOW TO PLAY PEAXEL | Official Guide")
        .setDescription("Master the scouting game! Here is everything you need to know to dominate the leaderboard.\n\u200b")
        .setColor("#a855f7") // Official Peaxel Gold
        .setThumbnail("https://peaxel.me/wp-content/uploads/2025/06/peaxel_logo_beta-1.png")
        .addFields(
            { 
                name: "🏃 1. Build your Lineup", 
                value: "• **Where:** Go to *Team → All My Cards* or the *Competition* page.\n• **Size:** Minimum 1 card, maximum 5 cards per lineup.\n• **How:** Tap a card and select 'Lineup' to add/remove it.\n• **Tip:** Cards in a lineup are locked from sale until the week ends.\n\u200b" 
            },
            { 
                name: "📈 2. Scoring System", 
                value: "• **Base:** Weekly Score based on real-world athlete performance.\n• **Bonuses:** Based on card **Force**, **Experience (XP)**, and **Collection** size.\n• **Formula:** Base Score + Force + XP + Collection boost.\n\u200b" 
            },
            { 
                name: "⏱️ 3. Weekly Deadlines", 
                value: "• **Cycle:** Gameweek runs Monday 00:01 → Sunday 23:59.\n• **Editing:** Open from **Monday** to **Thursday 23:59 (Paris Time)**.\n• **Lock:** Lineups are frozen from Friday to Sunday.\n• **Results:** Rankings and rewards are published every Monday.\n\u200b" 
            },
            { 
                name: "🤖 4. Autoplay Feature", 
                value: "• **Ace Bot:** Automatically drafts your top 5 cards from Mon. to Wed.\n• **Manual:** You retain full control to override choices on Thursday.\n• **Security:** Ensures you never miss a reward cycle.\n\u200b" 
            },
            { 
                name: "🏆 5. Rewards", 
                value: "• **Tiered System:** Every participant earns rewards based on rank.\n• **Direct Pay:** Earnings are sent straight to your Peaxel wallet.\n• **Loyalty:** Consistent weekly play increases your reward potential." 
            }
        )
        .setFooter({ 
            text: "Peaxel • The Next Generation of Scouting", 
            iconURL: "https://peaxel.me/wp-content/uploads/2025/06/peaxel_logo_beta-1.png" 
        })
        .setTimestamp();

    // Grouping all primary links into a single row for cleaner UI
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Play Now 🎮')
            .setStyle(ButtonStyle.Link)
            .setURL('https://game.peaxel.me'),
        new ButtonBuilder()
            .setLabel('Athlete List 📋')
            .setStyle(ButtonStyle.Link)
            .setURL('https://peaxel.me/list-of-all-athletes-on-peaxel/'),
        new ButtonBuilder()
            .setLabel('Full Guide 📖')
            .setStyle(ButtonStyle.Link)
            .setURL('https://docs.peaxel.me/'),
        new ButtonBuilder()
            .setLabel('Free Cards 🃏')
            .setStyle(ButtonStyle.Link)
            .setURL('https://peaxel.me/win-5-freecards-of-athletes/')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
}