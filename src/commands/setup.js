import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setChannel } from '../utils/configManager.js';

export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure les salons du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Quel salon configurer ?')
            .setRequired(true)
            .addChoices(
                { name: 'Annonces (Opening/Closing)', value: 'announce' },
                { name: 'Spotlight', value: 'spotlight' },
                { name: 'Logs Admin', value: 'logs' },
                { name: 'Feedback', value: 'feedback' }
            ))
    .addChannelOption(option =>
        option.setName('salon')
            .setDescription('Le salon à utiliser')
            .setRequired(true));

export async function execute(interaction) {
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('salon');

    setChannel(type, channel.id);

    await interaction.reply({
        content: `✅ Le salon pour **${type}** a été défini sur ${channel}.`,
        ephemeral: true
    });
}