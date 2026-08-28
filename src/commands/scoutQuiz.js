import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { runScoutQuiz } from '../utils/scoutQuizRunner.js';
import { getChannel } from '../utils/configManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('scout-quiz')
        .setDescription('Lance manuellement le Scout Quiz')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const result = await runScoutQuiz(interaction.client, { pingEveryone: true });

        if (!result.success) {
            const messages = {
                no_athlete: '❌ No athlete available. Check `src/config/athletes.json`.',
                missing_channels: '❌ Announce or welcome channel not configured.',
                channels_not_found: '❌ Could not access configured channels (check bot permissions).',
            };
            return interaction.editReply({ content: messages[result.reason] || '❌ Quiz launch failed.' });
        }

        const announceId = getChannel('announce');
        const generalId = getChannel('welcome');
        await interaction.editReply({
            content: `✅ Quiz launched in <#${announceId}>. Answers tracked in <#${generalId}>.`,
        });
    },
};
