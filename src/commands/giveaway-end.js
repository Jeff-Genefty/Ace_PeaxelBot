import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { closeGiveaway } from '../web/services/giveawayService.js';
import { openClaimTicketOrPrompt } from '../utils/claimTicketService.js';

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

    let winnerTag = winnerId;
    try {
        const user = await interaction.client.users.fetch(winnerId);
        winnerTag = user.username || user.tag || winnerId;
    } catch { /* keep id */ }

    const endEmbed = new EmbedBuilder()
        .setTitle('🎊 Giveaway winner')
        .setDescription(
            `Congrats <@${winnerId}> — you won this Peaxel giveaway!\n\n`
            + `**Entries:** ${participants.length}\n`
            + `**Next:** Ace opens a private delivery ticket with staff once your Peaxel username/email is on file.`,
        )
        .setColor('#2dd4bf')
        .setFooter({ text: 'Peaxel · Thanks for competing' })
        .setTimestamp();

    await interaction.deferReply();
    await openClaimTicketOrPrompt(interaction.client, {
        userId: winnerId,
        discordUsername: winnerTag,
        reason: 'giveaway',
        channel: interaction.channel,
        mentionContent: `🎉 <@${winnerId}> wins the giveaway!`,
        embed: endEmbed,
    });
    await interaction.editReply({ content: `✅ Winner drawn: <@${winnerId}>` });

    closeGiveaway({ id: winnerId, tag: winnerTag });
}
