import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
    .setName('giveaway-start')
    .setDescription('Launch the weekly Giveaway (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const GIVEAWAY_FILE = path.join(process.cwd(), 'data', 'giveaways.json');
    
    // Reset participants for the new GW
    const emptyData = { participants: [] };
    fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(emptyData, null, 2));

    const embed = new EmbedBuilder()
        .setTitle('🎟️ PEAXEL WEEKLY GIVEAWAY')
        .setDescription('Participate to win a **Random Athlete Card** for your roster!\n\n' +
                        'Click the button below to enter the draw. The winner will be announced automatically during the **Closing** on Thursday!')
        .setColor('#FACC15')
        .setFooter({ text: 'Good luck to all managers!' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('Join Giveaway')
            .setEmoji('🎟️')
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: '✅ Giveaway message sent!', flags: [MessageFlags.Ephemeral] });
    await interaction.channel.send({ embeds: [embed], components: [row] });
}