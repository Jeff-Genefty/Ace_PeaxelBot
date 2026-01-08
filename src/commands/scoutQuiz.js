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

        const generalChannelId = '1369976259613954059'; // Salon General fixe

        try {
            const announceChannel = await interaction.client.channels.fetch(announceChannelId);
            const generalChannel = await interaction.client.channels.fetch(generalChannelId);

            if (!generalChannel) {
                return interaction.reply({ content: "❌ Impossible de trouver le salon General. Vérifie l'ID et mes permissions.", ephemeral: true });
            }

            await interaction.reply({ content: `✅ Quiz lancé dans <#${announceChannelId}>. Réponses écoutées dans <#${generalChannelId}>.`, ephemeral: true });

            const quizEmbed = new EmbedBuilder()
                .setTitle('🎲 SCOUT QUIZ: THE TALENT HUNT IS ON!')
                .setDescription(
                    `🏆 **THE PRIZE:**\n` +
                    `The first Manager to find the correct answer wins a **Free Athlete Card** to strengthen their Peaxel lineup! 🃏✨\n\n` +
                    `📖 **HOW TO PLAY:**\n` +
                    `1️⃣ Analyze the scouting report below.\n` +
                    `2️⃣ Head over to <#${generalChannelId}>.\n` +
                    `3️⃣ Type the **EXACT IN-GAME PSEUDO** of this athlete.\n\n` +
                    `⚠️ *Precision is key! Only the exact spelling (e.g., SHAHMALARANI) will be validated by Coach Ace.*`
                )
                .addFields(
                    { name: '📍 Nationality', value: athlete.nationality, inline: true },
                    { name: '🏆 Sport', value: athlete.sport, inline: true },
                    { name: '🗂️ Category', value: athlete.category, inline: true },
                    { name: '💡 Scouting Hint', value: `Our sources tell us the pseudo starts with the letter: **${athlete.name.charAt(0).toUpperCase()}**` }
                )
                .setColor('#FACC15')
                .setThumbnail('https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png') 
                .setFooter({ text: 'Tournament Points and Cards are at stake! Good luck, Managers.' });

            await announceChannel.send({ content: '✨ **Manual Scout Quiz is LIVE!** @everyone', embeds: [quizEmbed] });

            const filter = m => {
                const userGuess = m.content.toUpperCase().trim();
                const correctAnswer = athlete.name.toUpperCase().trim();
                return userGuess === correctAnswer;
            };

            const collector = generalChannel.createMessageCollector({ filter, time: 7200000, max: 1 });

            collector.on('collect', async m => {
                const winEmbed = new EmbedBuilder()
                    .setTitle('🏆 WE HAVE A SCOUTING WINNER!')
                    .setDescription(
                        `Incredible work <@${m.author.id}>! You spotted the talent.\n\n` +
                        `The correct athlete was: **${athlete.name.toUpperCase()}**\n\n` +
                        `📩 **CLAIM YOUR REWARD:**\n` +
                        `Please open a ticket here: <#1369976260066803794> to receive your **Free Athlete Card**!`
                    )
                    .setColor('#2ECC71')
                    .setThumbnail(athlete.image || 'https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png')
                    .setFooter({ text: 'Peaxel • Identification Successful' })
                    .setTimestamp();

                await announceChannel.send({ content: `🎊 Congratulations <@${m.author.id}>!`, embeds: [winEmbed] });
                await m.reply(`🏆 **Correct!** You won the Scout Quiz! Check <#${announceChannelId}> for details.`);
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    announceChannel.send(`⏰ **Quiz Ended!** No one found the answer in time. It was **${athlete.name.toUpperCase()}**.`);
                }
            });

        } catch (error) {
            console.error("[ScoutQuiz] Error:", error);
            if (!interaction.replied) {
                await interaction.reply({ content: "❌ Une erreur est survenue (Salon inconnu ou permissions manquantes).", ephemeral: true });
            }
        }
    },
};