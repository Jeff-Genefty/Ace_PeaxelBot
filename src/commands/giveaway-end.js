import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { drawGiveawayWinner } from '../web/services/giveawayService.js';
import { openClaimTicketOrPrompt } from '../utils/claimTicketService.js';

export const data = new SlashCommandBuilder()
    .setName('giveaway-end')
    .setDescription('End the giveaway and draw a winner')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply();

    const drawn = drawGiveawayWinner();
    if (!drawn.ok) {
        const messages = {
            NO_PARTICIPANTS: '❌ No entries for this giveaway.',
            NOT_OPEN: '❌ Giveaway is not open.',
            ALREADY_DRAWN: '❌ Winner already drawn for this giveaway.',
        };
        return interaction.editReply({
            content: messages[drawn.reason] || `❌ Could not draw (${drawn.reason}).`,
        });
    }

    const winnerId = drawn.winner.id;
    let winnerTag = drawn.winner.tag || winnerId;
    try {
        const user = await interaction.client.users.fetch(winnerId);
        winnerTag = user.username || user.tag || winnerTag;
    } catch { /* keep tag */ }

    const endEmbed = new EmbedBuilder()
        .setTitle('🎊 Giveaway winner')
        .setDescription(
            `Congrats <@${winnerId}> — you won this Peaxel giveaway!\n\n`
            + `**Next:** Ace opens a private delivery ticket with staff once your Peaxel username/email is on file.`,
        )
        .setColor('#2dd4bf')
        .setFooter({ text: 'Peaxel · Thanks for competing' })
        .setTimestamp();

    await openClaimTicketOrPrompt(interaction.client, {
        userId: winnerId,
        discordUsername: winnerTag,
        reason: 'giveaway',
        channel: interaction.channel,
        mentionContent: `🎉 <@${winnerId}> wins the giveaway!`,
        embed: endEmbed,
    });
    await interaction.editReply({ content: `✅ Winner drawn: <@${winnerId}>` });
}
