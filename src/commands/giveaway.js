import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { openGiveaway } from '../web/services/giveawayService.js';
import { gameUrl, DISCORD_REFS } from '../utils/peaxelLinks.js';

export const data = new SlashCommandBuilder()
    .setName('giveaway-start')
    .setDescription('Launch a manual Giveaway with @everyone tag')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    openGiveaway('manual');
    const playUrl = gameUrl(DISCORD_REFS.giveaway);

    const embed = new EmbedBuilder()
        .setTitle('🎟️ Peaxel Giveaway — win an Athlete Card')
        .setDescription(
            `Enter for a chance to win an **Athlete Card** for your roster on [game.peaxel.me](${playUrl}).\n\n`
            + '**How to enter**\n'
            + 'Click **Enter giveaway** below (one entry per manager). '
            + 'The winner is drawn when the event closes — claim via ticket.\n\n'
            + 'Joining also grants **Hub XP**.',
        )
        .addFields({ name: 'Status', value: '🟢 Open', inline: true })
        .setColor('#a855f7')
        .setFooter({ text: 'Peaxel · Free cards · Collect · Compete' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('Enter giveaway')
            .setEmoji('🎟️')
            .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({ content: '✅ Giveaway launched.', flags: [MessageFlags.Ephemeral] });

    await interaction.channel.send({
        content: '@everyone — New Peaxel giveaway is open. Enter in one click 👇',
        embeds: [embed],
        components: [row],
    });
}
