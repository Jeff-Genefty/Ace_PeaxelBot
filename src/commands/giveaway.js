import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { openGiveaway } from '../web/services/giveawayService.js';

export const data = new SlashCommandBuilder()
    .setName('giveaway-start')
    .setDescription('Launch a manual Giveaway with @everyone tag')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    openGiveaway('manual');

    const embed = new EmbedBuilder()
        .setTitle('🎟️ PEAXEL GIVEAWAY EVENT')
        .setDescription(
            'Participate to win a **Random Athlete Card** for your roster!\n\n'
            + '**How to enter:**\n'
            + 'Click the button below to register your entry. The winner will be drawn and announced by the administration once the event closes!',
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
            .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({ content: '✅ Giveaway broadcast initialized.', flags: [MessageFlags.Ephemeral] });

    await interaction.channel.send({
        content: '@everyone 📢 **New Giveaway Alert!** A new opportunity to upgrade your roster has appeared. Check the details below! 👇',
        embeds: [embed],
        components: [row],
    });
}
