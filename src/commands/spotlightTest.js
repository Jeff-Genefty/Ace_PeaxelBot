import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getPreviewAthlete } from '../utils/spotlightManager.js';
import { getChannel } from '../utils/configManager.js';
import { buildSpotlightPayload } from '../utils/spotlightMessage.js';

export const data = new SlashCommandBuilder()
    .setName('spotlight-test')
    .setDescription('Preview the Athlete Spotlight layout (does not consume the queue)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const athlete = getPreviewAthlete();

    if (!athlete) {
        return await interaction.reply({ content: '❌ No athlete found.', flags: MessageFlags.Ephemeral });
    }

    const generalChannelId = getChannel('welcome');
    const { content, embed, components } = buildSpotlightPayload(athlete, generalChannelId);

    const reply = await interaction.reply({
        content,
        embeds: [embed],
        components,
        fetchReply: true,
    });

    for (const emoji of ['⭐', '🔥', '🃏']) {
        await reply.react(emoji).catch(() => null);
    }
}
