import { SlashCommandBuilder } from 'discord.js';
import { handleFeedbackButton } from '../handlers/feedbackHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Submit your feedback about the game and the platform'),

    async execute(interaction) {
        // On réutilise la fonction du bouton pour afficher le même Modal
        await handleFeedbackButton(interaction);
    },
};