import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getPreviewAthlete } from '../utils/spotlightManager.js';
import { getConfig } from '../utils/configManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('scout-quiz')
        .setDescription('Lance manuellement le Scout Quiz')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Fetch a random athlete from the source (Git config)
        const athlete = getPreviewAthlete();
        
        if (!athlete) {
            return interaction.reply({ 
                content: "❌ No athlete available for the quiz. Check your src/config/athletes.json file.", 
                ephemeral: true 
            });
        }

        const config = getConfig();
        const announceChannelId = config.channels?.announce || interaction.channelId;
        const generalChannelId = config.channels?.welcome || '1369976259613954059'; // Fallback to your fixed ID

        try {
            const announceChannel = await interaction.client.channels.fetch(announceChannelId);
            const generalChannel = await interaction.client.channels.fetch(generalChannelId);

            if (!generalChannel || !announceChannel) {
                return interaction.reply({ 
                    content: "❌ Could not find the required channels. Check your config.json.", 
                    ephemeral: true 
                });
            }

            await interaction.reply({ 
                content: `✅ Quiz launched in <#${announceChannelId}>. Answers tracked in <#${generalChannelId}>.`, 
                ephemeral: true 
            });

            const quizEmbed = new EmbedBuilder()
                .setTitle('🎲 SCOUT QUIZ: THE TALENT HUNT IS ON!')
                .setDescription(
                    `🏆 **THE PRIZE:**\n` +
                    `The first Manager to find the correct answer wins a **Free Athlete Card**! 🃏✨\n\n` +
                    `📖 **HOW TO PLAY:**\n` +
                    `1️⃣ Analyze the scouting report below.\n` +
                    `2️⃣ Head over to <#${generalChannelId}>.\n` +
                    `3️⃣ Type the **EXACT NAME** of this athlete.\n\n` +
                    `⚠️ *Precision is key! Only exact spelling will be validated.*`
                )
                .addFields(
                    // Using correct properties from your JSON format
                    { name: '📍 Nationality', value: athlete.main_nationality || 'Unknown', inline: true },
                    { name: '🏆 Occupation', value: athlete.occupation || 'Professional', inline: true },
                    { name: '🗂️ Category', value: athlete.main_category || 'Elite', inline: true },
                    { name: '💡 Scouting Hint', value: `Our sources tell us the name starts with: **${athlete.name.charAt(0).toUpperCase()}**` }
                )
                .setColor('#FACC15')
                .setThumbnail('https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png') 
                .setFooter({ text: 'Tournament Points and Cards are at stake! Good luck, Managers.' });

            await announceChannel.send({ content: '✨ **Manual Scout Quiz is LIVE!** @everyone', embeds: [quizEmbed] });

            // Filter for the collector
            const filter = m => {
                const userGuess = m.content.toUpperCase().trim();
                const correctAnswer = athlete.name.toUpperCase().trim();
                return userGuess === correctAnswer;
            };

            // 2-hour window for the quiz
            const collector = generalChannel.createMessageCollector({ filter, time: 7200000, max: 1 });

            collector.on('collect', async m => {
                const winEmbed = new EmbedBuilder()
                    .setTitle('🏆 WE HAVE A SCOUTING WINNER!')
                    .setDescription(
                        `Incredible work <@${m.author.id}>! You spotted the talent.\n\n` +
                        `The correct athlete was: **${athlete.name.toUpperCase()}**\n\n` +
                        `📩 **CLAIM YOUR REWARD:**\n` +
                        `Please open a ticket to receive your **Free Athlete Card**!`
                    )
                    .setColor('#2ECC71')
                    .setThumbnail(athlete.talent_profile_image_url || 'https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png')
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
                await interaction.reply({ content: "❌ An error occurred (Check bot permissions).", ephemeral: true });
            }
        }
    },
};