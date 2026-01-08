import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { getPreviewAthlete } from '../utils/spotlightManager.js';

export const data = new SlashCommandBuilder()
    .setName('spotlight-test')
    .setDescription('Test l\'affichage du Spotlight avec la section engagement')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const athlete = getPreviewAthlete();

    if (!athlete) {
        return await interaction.reply({ content: "❌ Aucun athlète trouvé.", ephemeral: true });
    }

    const generalChannelId = '1369976255746805770'; // ID de ton salon général

    const embed = new EmbedBuilder()
        .setTitle(`🌟 TEST SPOTLIGHT: ${athlete.name.toUpperCase()}`)
        .setDescription(`Discover this week's featured talent from the Peaxel ecosystem!`)
        .setColor("#FACC15")
        .addFields(
            { name: "📍 Nationality", value: athlete.nationality, inline: true },
            { name: "🗂️ Category", value: athlete.category, inline: true },
            { name: "🏆 Sport", value: athlete.sport, inline: true },
            { name: "📝 Description", value: athlete.description },
            // --- NOUVELLE SECTION D'ENGAGEMENT AJOUTÉE ---
            { 
                name: "📣 COACH ACE CHALLENGE", 
                value: `Is **${athlete.name.toUpperCase()}** part of your strategy this week? 🔥\n\n` +
                       `If you have this athlete in your lineup, drop a screenshot in <#${generalChannelId}> to prove your management skills! 🏟️` 
            }
        )
        .setImage(athlete.image)
        .setFooter({ text: "Peaxel • Athlete Spotlight Series (Test Mode)" })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Profile 🃏').setStyle(ButtonStyle.Link).setURL(athlete.peaxelLink),
        new ButtonBuilder().setLabel('Instagram 📸').setStyle(ButtonStyle.Link).setURL(athlete.igLink || "https://instagram.com"),
        new ButtonBuilder().setLabel('Play Peaxel 🎮').setStyle(ButtonStyle.Link).setURL("https://game.peaxel.me")
    );

    await interaction.reply({ 
        content: "🛠️ **Rendu du Spotlight (Mode Test) :**", 
        embeds: [embed], 
        components: [row] 
    });
}