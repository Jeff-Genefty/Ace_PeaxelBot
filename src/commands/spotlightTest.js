import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { getPreviewAthlete } from '../utils/spotlightManager.js';

export const data = new SlashCommandBuilder()
    .setName('spotlight-test')
    .setDescription('Test the final airy Spotlight layout')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const athlete = getPreviewAthlete();

    if (!athlete) {
        return await interaction.reply({ content: "❌ No athlete found.", ephemeral: true });
    }

    const generalChannelId = '1369976259613954059'; 
    const athleteName = (athlete.name || "Athlete").toUpperCase();

    let prizesText = "";
    for (let i = 1; i <= 5; i++) {
        if (athlete[`prize${i}`]) {
            prizesText += `• ${athlete[`prize${i}`]}\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`🌟 SPOTLIGHT OF THE WEEK: ${athleteName}`)
        .setURL(athlete.peaxelLink || "https://game.peaxel.me")
        .setDescription(
            `It's time for our **Weekly Athlete Spotlight**! 🚀\n\n` +
            `Every week, we focus on a new rising talent from the Peaxel ecosystem. Discover their journey, achievements, and goals below! 👇`
        )
        .setColor("#FACC15")
        .setThumbnail(athlete.talent_profile_image_url || null)
        .setImage(athlete.talent_card_image_url || null)
        .addFields(
            { name: "🌍 Nationality", value: athlete.main_nationality || "N/A", inline: true },
            { name: "🗂️ Category", value: athlete.main_category || "N/A", inline: true },
            { name: "🏆 Sport", value: athlete.occupation || "N/A", inline: true }
        )
        .addFields(
            { name: "📝 Description", value: athlete.description || "No description available." },
            { name: '\u200B', value: '\u200B' }
        );

    if (athlete.birthdate || athlete.city || athlete.club) {
        const location = `${athlete.city || ''}${athlete.city && athlete.club ? ' - ' : ''}${athlete.club || ''}` || "N/A";
        embed.addFields(
            { name: "🎂 Birthdate", value: athlete.birthdate || "N/A", inline: true },
            { name: "📍 Location & Club", value: location, inline: true }
        );
    }

    if (athlete.goal) {
        embed.addFields({ name: "🎯 Personal Goal", value: athlete.goal });
    }

    if (prizesText) {
        embed.addFields({ name: "⭐ Achievements", value: prizesText });
    }

    embed.addFields({ 
        name: "📣 COACH ACE CHALLENGE", 
        value: `Is **${athleteName}** part of your strategy? 🔥\n` +
               `Drop a screenshot in <#${generalChannelId}> if you have this athlete! 🏟️` 
    });

    embed.setFooter({ text: "Peaxel • Athlete Spotlight Series", iconURL: 'https://media.peaxel.me/logo.png' })
         .setTimestamp();

    const row = new ActionRowBuilder();
    
    row.addComponents(
        new ButtonBuilder()
            .setLabel('View Profile 🃏')
            .setStyle(ButtonStyle.Link)
            .setURL(athlete.peaxelLink || "https://game.peaxel.me"),
        
        new ButtonBuilder()
            .setLabel('Play on Peaxel 🎮')
            .setStyle(ButtonStyle.Link)
            .setURL("https://game.peaxel.me")
    );

    if (athlete.instagram_talent && typeof athlete.instagram_talent === 'string') {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Instagram')
                .setStyle(ButtonStyle.Link)
                .setURL(athlete.instagram_talent)
        );
    }

    await interaction.reply({ 
        content: "🛠️ **Spotlight Rendering (Final Version):**", 
        embeds: [embed], 
        components: [row] 
    });
}