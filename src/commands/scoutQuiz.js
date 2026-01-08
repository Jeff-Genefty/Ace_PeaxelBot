import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getPreviewAthlete } from '../utils/spotlightManager.js';
import { getConfig } from '../utils/configManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('scout-quiz')
        .setDescription('Lance manuellement le Scout Quiz')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const athlete = getPreviewAthlete();
        if (!athlete) {
            return interaction.reply({ content: "❌ Aucun athlète disponible pour le quiz.", ephemeral: true });
        }

        const config = getConfig();
        const announceChannelId = config.channels?.announce || interaction.channelId;
        const generalChannelId = '1369976259613954059'; // Salon général fixe

        const announceChannel = await interaction.client.channels.fetch(announceChannelId);
        const generalChannel = await interaction.client.channels.fetch(generalChannelId);

        await interaction.reply({ content: `✅ Quiz lancé dans <#${announceChannelId}>. Réponses écoutées dans <#${generalChannelId}>.`, ephemeral: true });

        const quizEmbed = new EmbedBuilder()
            .setTitle('🎲 SCOUT QUIZ: Guess the Athlete!')
            .setDescription(
                `Find the **IN-GAME PSEUDO** of this athlete to win a reward!\n\n` +
                `👉 **HOW TO PLAY:**\n` +
                `Go to <#${generalChannelId}> and type the **EXACT** pseudo.`
            )
            .addFields(
                { name: '📍 Nationality', value: athlete.nationality, inline: true },
                { name: '🏆 Sport', value: athlete.sport, inline: true },
                { name: '🗂️ Category', value: athlete.category, inline: true },
                { name: '💡 Hint', value: `The pseudo starts with **${athlete.name.charAt(0).toUpperCase()}**` }
            )
            .setColor('#FACC15')
            .setFooter({ text: 'Note: Provide the exact in-game pseudo (e.g., SHAHMALARANI)' });

        await announceChannel.send({ content: '✨ **Manual Scout Quiz is LIVE!** @everyone', embeds: [quizEmbed] });

        const filter = m => m.content.toUpperCase().trim() === athlete.name.toUpperCase();
        const collector = generalChannel.createMessageCollector({ filter, time: 7200000, max: 1 });

        collector.on('collect', async m => {
            const winEmbed = new EmbedBuilder()
                .setTitle('🏆 WE HAVE A WINNER!')
                .setDescription(`Congratulations <@${m.author.id}>! You found the correct athlete: **${athlete.name.toUpperCase()}**.\n\n` +
                                `📩 To claim your reward, please open a ticket here: <#1369976260066803794>`)
                .setColor('#2ECC71')
                .setThumbnail(athlete.image);

            await announceChannel.send({ embeds: [winEmbed] });
            await m.reply(`🏆 **Correct!** You won the Scout Quiz! Check <#${announceChannelId}> for details.`);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                announceChannel.send(`⏰ **Quiz Ended!** No one found the answer. It was **${athlete.name.toUpperCase()}**.`);
            }
        });
    },
};