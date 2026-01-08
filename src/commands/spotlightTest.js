import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { getPreviewAthlete } from '../utils/spotlightManager.js';

export const data = new SlashCommandBuilder()
    .setName('spotlight-test')
    .setDescription('Test l\'affichage aéré du Spotlight')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const athlete = getPreviewAthlete();

    if (!athlete) {
        return await interaction.reply({ content: "❌ Aucun athlète trouvé.", ephemeral: true });
    }

    const generalChannelId = '1369976259613954059'; 

    let prizesText = "";
    for (let i = 1; i <= 5; i++) {
        if (athlete[`prize${i}`]) {
            prizesText += `• ${athlete[`prize${i}`]}\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`🌟 SPOTLIGHT OF THE WEEK: ${athlete.name.toUpperCase()}`)
        .setURL(athlete.peaxelLink)
        .setColor("#FACC15")
        .setThumbnail(athlete.talent_profile_image_url || null)
        .setImage(athlete.talent_card_image_url || null)
        .addFields(
            { name: "🌍 Nationality", value: athlete.main_nationality || "N/A", inline: true },
            { name: "🗂️ Category", value: athlete.main_category || "N/A", inline: true },
            { name: "🏆 Sport", value: athlete.occupation || "N/A", inline: true },
            // Champ vide pour forcer le passage à la ligne et aérer
            { name: '\u200B', value: '\u200B' }
        )
        .addFields({ name: "📝 Description", value: athlete.description || "No description available." });

    if (athlete.birthdate) {
        embed.addFields({ name: "🎂 Birthdate", value: athlete.birthdate, inline: true });
    }

    if (athlete.city || athlete.club) {
        const location = `${athlete.city || ''}${athlete.city && athlete.club ? ' - ' : ''}${athlete.club || ''}`;
        embed.addFields({ name: "📍 Location & Club", value: location || "N/A", inline: true });
    }

    if (athlete.goal) {
        embed.addFields({ name: "🎯 Personal Goal", value: athlete.goal });
    }

    if (prizesText) {
        embed.addFields({ name: "⭐ Achievements", value: prizesText });
    }

    embed.addFields(
        { name: '\u200B', value: '\u200B' },
        { 
            name: "📣 COACH ACE CHALLENGE", 
            value: `Is **${athlete.name.toUpperCase()}** part of your strategy? 🔥\n\n` +
                   `Drop a screenshot in <#${generalChannelId}> if you have this athlete! 🏟️` 
        }
    );

    embed.setFooter({ text: "Peaxel • Athlete Spotlight Series", iconURL: 'https://media.peaxel.me/logo.png' })
         .setTimestamp();

    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    row1.addComponents(
        new ButtonBuilder().setLabel('View Profile 🃏').setStyle(ButtonStyle.Link).setURL(athlete.peaxelLink)
    );
    
    if (athlete.gameLink) {
        row1.addComponents(
            new ButtonBuilder().setLabel('Play on Peaxel 🎮').setStyle(ButtonStyle.Link).setURL("https://game.peaxel.me")
        );
    }

    if (athlete.instagram_talent) row1.addComponents(new ButtonBuilder().setLabel('Instagram').setStyle(ButtonStyle.Link).setURL(athlete.instagram_talent));
    if (athlete.tiktok) row1.addComponents(new ButtonBuilder().setLabel('TikTok').setStyle(ButtonStyle.Link).setURL(athlete.tiktok));
    if (athlete.x_twitter) row1.addComponents(new ButtonBuilder().setLabel('X (Twitter)').setStyle(ButtonStyle.Link).setURL(athlete.x_twitter));

    if (athlete.facebook) row2.addComponents(new ButtonBuilder().setLabel('Facebook').setStyle(ButtonStyle.Link).setURL(athlete.facebook));
    if (athlete.linkedin) row2.addComponents(new ButtonBuilder().setLabel('LinkedIn').setStyle(ButtonStyle.Link).setURL(athlete.linkedin));

    const components = [row1];
    if (row2.components.length > 0) components.push(row2);

    await interaction.reply({ 
        content: "🛠️ **Rendu du Spotlight (Aéré) :**", 
        embeds: [embed], 
        components: components 
    });
}