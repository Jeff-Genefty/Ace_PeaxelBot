import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getTicketChannelId } from '../utils/configManager.js';
import { closeGiveaway } from '../web/services/giveawayService.js';

export const data = new SlashCommandBuilder()
    .setName('giveaway-end')
    .setDescription('End the giveaway and draw a winner')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const GIVEAWAY_FILE = path.join(process.cwd(), 'data', 'giveaways.json');

    if (!fs.existsSync(GIVEAWAY_FILE)) {
        return interaction.reply({ content: 'No giveaway data found.', flags: MessageFlags.Ephemeral });
    }

    const data = JSON.parse(fs.readFileSync(GIVEAWAY_FILE, 'utf-8'));
    const participants = data.participants || [];

    if (participants.length === 0) {
        return interaction.reply({ content: '❌ No entries for this giveaway.', flags: MessageFlags.Ephemeral });
    }

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winnerId = participants[winnerIndex];
    const ticketChannelId = getTicketChannelId();
    const ticketMention = ticketChannelId ? `<#${ticketChannelId}>` : 'the support ticket channel';

    const endEmbed = new EmbedBuilder()
        .setTitle('🎊 Giveaway winner')
        .setDescription(
            `Congrats <@${winnerId}> — you won this Peaxel giveaway!\n\n`
            + `**Entries:** ${participants.length}\n`
            + `**Claim:** open a ticket in ${ticketMention} and mention this giveaway.`,
        )
        .setColor('#2dd4bf')
        .setFooter({ text: 'Peaxel · Thanks for competing' })
        .setTimestamp();

    await interaction.reply({
        content: `🎉 <@${winnerId}> wins the giveaway!`,
        embeds: [endEmbed],
    });

    closeGiveaway();
}
