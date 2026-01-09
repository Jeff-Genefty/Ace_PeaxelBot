import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { exportFeedbackCSV } from '../handlers/feedbackHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('admin-export')
        .setDescription('Export all feedbacks to a CSV file')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Sécurité Admin

    async execute(interaction) {
        await exportFeedbackCSV(interaction);
    },
};