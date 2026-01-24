import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
    .setName('giveaway-start')
    .setDescription('Launch a manual Giveaway with @everyone tag')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const GIVEAWAY_FILE = path.join(process.cwd(), 'data', 'giveaways.json');
    
    // Initialize data structure
    // English comment: Ensure both arrays are clean for the new session
    const emptyData = { participants: [], participantTags: [] };
    fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(emptyData, null, 2));

    const embed = new EmbedBuilder()
        .setTitle('🎟️ PEAXEL GIVEAWAY EVENT')
        .setDescription(
            'Participate to win a **Random Athlete Card** for your roster!\n\n' +
            '**How to enter:**\n' +
            'Click the button below to register your entry. The winner will be drawn and announced by the administration once the event closes!'
        )
        .addFields({ name: 'Status', value: '🟢 Open / Joinable', inline: true })
        .setColor('#a855f7')
        .setFooter({ text: 'May the luck be with you, Managers!' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('Enter Draw')
            .setEmoji('🎟️')
            .setStyle(ButtonStyle.Primary)
    );

    // Ephemeral response for the admin only
    await interaction.reply({ content: '✅ Giveaway broadcast initialized.', flags: [MessageFlags.Ephemeral] });
    
    // Public message with the @everyone tag and intro text
    await interaction.channel.send({ 
        content: "@everyone 📢 **New Giveaway Alert!** A new opportunity to upgrade your roster has appeared. Check the details below! 👇",
        embeds: [embed], 
        components: [row] 
    });
}