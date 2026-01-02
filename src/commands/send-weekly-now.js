import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { sendWeeklyMessage } from '../utils/sendWeeklyMessage.js';

/**
 * Command to manually trigger specific weekly announcements.
 * Allows the admin to explicitly choose between 'Opening' and 'Closing'.
 */
export const data = new SlashCommandBuilder()
    .setName('send-weekly-now')
    .setDescription('Manually send a Peaxel announcement (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Which announcement do you want to broadcast?')
            .setRequired(true)
            .addChoices(
                { name: '🚀 Opening (Monday Message)', value: 'opening' },
                { name: '⚠️ Closing (Thursday Message)', value: 'closing' }
            ));

/**
 * Execute the command logic
 * @param {import('discord.js').CommandInteraction} interaction 
 */
export async function execute(interaction) {
    // Defer the reply to give the bot time to process local assets/files
    await interaction.deferReply({ ephemeral: true });

    // Retrieve the selected type from the user input
    const messageType = interaction.options.getString('type');
    
    try {
        console.log(`[Peaxel Bot] Manual trigger for: ${messageType.toUpperCase()} by ${interaction.user.tag}`);

        // We pass the 'type' to our utility function so it knows which 
        // local image and text to use (Opening vs Closing)
        const success = await sendWeeklyMessage(interaction.client, { 
            isManual: true, 
            type: messageType 
        });

        if (success) {
            const label = messageType === 'opening' ? 'Opening' : 'Closing';
            await interaction.editReply({
                content: `✅ **${label} announcement** has been broadcasted successfully!`,
            });
        } else {
            await interaction.editReply({
                content: '❌ **Broadcast failed.** Please ensure the images exist in the /assets folder.',
            });
        }
    } catch (error) {
        console.error('[Peaxel Bot] Error in manual announcement command:', error);
        await interaction.editReply({
            content: '❌ An unexpected error occurred. Check the bot logs for more info.',
        });
    }
}