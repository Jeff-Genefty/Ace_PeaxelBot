import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
    .setName('giveaway-end')
    .setDescription('End the giveaway and draw a winner')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const GIVEAWAY_FILE = path.join(process.cwd(), 'data', 'giveaways.json');
    
    // Read data
    if (!fs.existsSync(GIVEAWAY_FILE)) {
        return interaction.reply({ content: "No giveaway data found.", ephemeral: true });
    }

    const data = JSON.parse(fs.readFileSync(GIVEAWAY_FILE, 'utf-8'));
    const participants = data.participants || [];

    if (participants.length === 0) {
        return interaction.reply({ content: "❌ No one participated this week.", ephemeral: true });
    }

    // DRAW LOGIC: Pick a random index
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winnerId = participants[winnerIndex];
    const winnerTag = data.participantTags ? data.participantTags[winnerIndex] : `<@${winnerId}>`;

    const endEmbed = new EmbedBuilder()
        .setTitle('🎊 GIVEAWAY RESULTS')
        .setDescription(`The draw is over!\n\n**Winner:** ${winnerTag}\n**Total Entries:** ${participants.length}`)
        .setColor('#2dd4bf') // Neon Blue
        .setFooter({ text: 'Congratulations to the winner!' })
        .setTimestamp();

    // Announcement in the channel
    await interaction.reply({ embeds: [endEmbed] });

    // Reset file after draw
fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify({ participants: [], participantTags: [] }, null, 2));
}