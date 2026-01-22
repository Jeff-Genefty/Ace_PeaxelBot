import cron from 'node-cron';
import fs from 'fs';
import { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { sendWeeklyMessage } from './utils/sendWeeklyMessage.js';
import { getRandomAthlete, getPreviewAthlete } from './utils/spotlightManager.js';
import { getCurrentWeekNumber, getParisDate } from './utils/week.js';
import { getConfig } from './utils/configManager.js';
import { sendAceMotivation } from './utils/rewardSystem.js';

const logPrefix = '[Peaxel Scheduler]';
const GIVEAWAY_FILE = './data/giveaways.json';

let lastSentOpenWeek = null;
let lastSentCloseWeek = null;

/**
 * Updates bot presence based on the current day and event
 */
export function updatePresence(client, customText = null) {
    if (!client.user) return;
    const now = getParisDate();
    const dayIndex = now.getDay(); 
    let week = getCurrentWeekNumber();
    if (dayIndex === 0) week = week - 1;

    let statusText = customText || `Gameweek : ${week}`;
    client.user.setActivity(statusText, { type: ActivityType.Watching });
}

export function initScheduler(client) {
    const timezone = 'Europe/Paris';
    console.log(`${logPrefix} 🚀 Scheduler Online & Synced`);
    updatePresence(client);

    // --- 1. LINEUP OPENING (Monday 00:00) ---
    cron.schedule('0 0 * * 1', async () => {
        const weekKey = getWeekKey();
        if (lastSentOpenWeek === weekKey) return;
        try {
            const success = await sendWeeklyMessage(client, { isManual: false, type: 'opening' });
            if (success) { 
                lastSentOpenWeek = weekKey; 
                updatePresence(client); 
            }
        } catch (error) { console.error(`${logPrefix} [Opening] Error:`, error.message); }
    }, { scheduled: true, timezone });

    // --- 2. AUTOMATIC SCOUT QUIZ (Tuesday 19:00) ---
    cron.schedule('0 19 * * 2', async () => {
        try {
            const athlete = getPreviewAthlete();
            if (!athlete) return;
            
            const config = getConfig();
            const announceChannelId = config.channels?.announce || '1369976257047167059';
            const generalChannelId = config.channels?.welcome || '1369976259613954059'; 

            const announceChannel = await client.channels.fetch(announceChannelId);
            const generalChannel = await client.channels.fetch(generalChannelId);

            const quizEmbed = new EmbedBuilder()
                .setTitle('🎲 SCOUT QUIZ: THE TALENT HUNT IS ON!')
                .setDescription(
                    `🏆 **THE PRIZE:**\n` +
                    `The first Manager to find the correct answer wins a **Free Athlete Card**! 🃏✨\n\n` +
                    `📖 **HOW TO PLAY:**\n` +
                    `1️⃣ Analyze the scouting report below.\n` +
                    `2️⃣ Head over to <#${generalChannelId}>.\n` +
                    `3️⃣ Type the **EXACT NAME** of this athlete.\n\n` +
                    `⚠️ *Precision is key! Only the exact spelling will be validated.*`
                )
                .addFields(
                    { name: '📍 Nationality', value: athlete.main_nationality || "N/A", inline: true },
                    { name: '🏆 Sport', value: athlete.occupation || "N/A", inline: true },
                    { name: '🗂️ Category', value: athlete.main_category || "N/A", inline: true },
                    { name: '💡 Scouting Hint', value: `The name starts with the letter: **${athlete.name.charAt(0).toUpperCase()}**` }
                )
                .setColor('#a855f7')
                .setThumbnail('https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png') 
                .setFooter({ text: 'Tournament Points and Cards are at stake!' });

            await announceChannel.send({ content: '✨ **Weekly Scout Quiz is LIVE!** @everyone', embeds: [quizEmbed] });
            updatePresence(client, `Quiz Active 🎲`);

            const filter = m => m.content.toUpperCase().trim() === athlete.name.toUpperCase().trim();
            const collector = generalChannel.createMessageCollector({ filter, time: 7200000, max: 1 });

            collector.on('collect', async m => {
                const winEmbed = new EmbedBuilder()
                    .setTitle('🏆 WE HAVE A WINNER!')
                    .setDescription(`Congratulations <@${m.author.id}>! You found the correct athlete: **${athlete.name.toUpperCase()}**.\n\n` +
                                    `📩 To claim your reward, please open a ticket: <#1369976260066803794>`)
                    .setColor('#2ECC71')
                    .setThumbnail(athlete.talent_profile_image_url || null);

                await announceChannel.send({ embeds: [winEmbed] });
                await m.reply(`🏆 **Correct!** You won the Scout Quiz! Check <#${announceChannelId}> for details.`);
                updatePresence(client);
            });
        } catch (error) { console.error(`${logPrefix} [Quiz] Error:`, error.message); }
    }, { scheduled: true, timezone });

    // --- 3. ATHLETE SPOTLIGHT (Wednesday 16:00) ---
    cron.schedule('0 16 * * 3', async () => {
        try {
            const athlete = getRandomAthlete();
            if (!athlete) return;
            
            const config = getConfig();
            const spotlightChannelId = config.channels?.spotlight || config.channels?.welcome;
            const channel = await client.channels.fetch(spotlightChannelId);

            const athleteName = athlete.name.toUpperCase();
            let prizesText = "";
            for (let i = 1; i <= 5; i++) {
                if (athlete[`prize${i}`]) prizesText += `• ${athlete[`prize${i}`]}\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🌟 SPOTLIGHT OF THE WEEK: ${athleteName}`)
                .setURL(athlete.peaxelLink || "https://game.peaxel.me")
                .setColor("#a855f7")
                .setThumbnail(athlete.talent_profile_image_url || null)
                .addFields(
                    { name: "🌍 Nationality", value: athlete.main_nationality || "N/A", inline: true },
                    { name: "🗂️ Category", value: athlete.main_category || "N/A", inline: true },
                    { name: "🏆 Sport", value: athlete.occupation || "N/A", inline: true },
                    { name: "📝 Description", value: athlete.description ? (athlete.description.substring(0, 500) + '...') : "No description available." }
                );

            if (prizesText) embed.addFields({ name: "⭐ Achievements", value: prizesText });

            embed.addFields(
                { name: '\u200B', value: '\u200B', inline: false },
                { name: "📣 COACH ACE CHALLENGE", value: `Is **${athleteName}** part of your strategy? 🔥\nDrop a screenshot in <#${config.channels?.welcome}> if you have this athlete! 🏟️` }
            );

            embed.setImage(athlete.talent_card_image_url || null)
                .setFooter({ text: "Peaxel • Athlete Spotlight Series" })
                .setTimestamp();

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('View Profile 🃏').setStyle(ButtonStyle.Link).setURL(athlete.peaxelLink || "https://game.peaxel.me")
            );

            // Dynamic Social Buttons
            const socials = [
                { key: 'instagram_talent', label: 'IG', emoji: '📸' },
                { key: 'x_twitter', label: 'X', emoji: '🐦' },
                { key: 'tiktok', label: 'TikTok', emoji: '🎵' }
            ];

            socials.forEach(s => {
                if (athlete[s.key] && athlete[s.key].startsWith('http')) {
                    row1.addComponents(new ButtonBuilder().setLabel(s.label).setStyle(ButtonStyle.Link).setURL(athlete[s.key]));
                }
            });

            await channel.send({ content: `@everyone\n🚀 **Weekly Athlete Spotlight is LIVE!**`, embeds: [embed], components: [row1] });
            updatePresence(client, `Spotlight 🌟`);
        } catch (error) { console.error(`${logPrefix} [Spotlight] Error:`, error.message); }
    }, { scheduled: true, timezone });

    // --- 4. LINEUP CLOSING (Thursday 18:59) ---
    cron.schedule('59 18 * * 4', async () => {
        try {
            const success = await sendWeeklyMessage(client, { isManual: false, type: 'closing' });
            if (success) updatePresence(client);
        } catch (error) { console.error(`${logPrefix} [Closing] Error:`, error.message); }
    }, { scheduled: true, timezone });

    // --- 5. COACH ACE RANDOM MOTIVATION ---
    cron.schedule('0 * * * *', async () => {
        try { await sendAceMotivation(client); } catch (e) {}
    }, { scheduled: true, timezone });

    // --- 6. GIVEAWAY LAUNCH (Saturday 10:00) ---
    cron.schedule('0 10 * * 6', async () => {
        try {
            const config = getConfig();
            const channel = await client.channels.fetch(config.channels?.announce || '1369976257047167059');
            
            // Reset giveaway data
            if (!fs.existsSync('./data')) fs.mkdirSync('./data');
            fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify({ participants: [] }, null, 2));

            const giveawayEmbed = new EmbedBuilder()
                .setTitle('🎟️ WEEKEND GIVEAWAY IS LIVE!')
                .setDescription('Participate now to win a **Rare Athlete Card**!\n\nClick the button below to join.')
                .setColor('#a855f7');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('join_giveaway').setLabel('Join Giveaway').setEmoji('🎟️').setStyle(ButtonStyle.Primary)
            );

            await channel.send({ content: '🎊 **New Giveaway Alert!** @everyone', embeds: [giveawayEmbed], components: [row] });
        } catch (e) { console.error(`${logPrefix} [Giveaway Launch] Error:`, e.message); }
    }, { scheduled: true, timezone });

// --- 7. GIVEAWAY DRAW (Sunday 20:00) ---
cron.schedule('0 20 * * 0', async () => {
    try {
        if (!fs.existsSync(GIVEAWAY_FILE)) return;
        const config = getConfig();
        const data = JSON.parse(fs.readFileSync(GIVEAWAY_FILE, 'utf-8'));
        const channelId = config.channels?.announce || '1369976257047167059';
        const channel = await client.channels.fetch(channelId);

        if (!data.participants || data.participants.length === 0) {
            return await channel.send('😔 **Giveaway Results:** No one participated this weekend.');
        }

        const winnerId = data.participants[Math.floor(Math.random() * data.participants.length)];
        
        // 1. Prepare the local image as an attachment
        const imageFile = new AttachmentBuilder('./assets/announce.png');

        const winEmbed = new EmbedBuilder()
            .setTitle('🎊 GIVEAWAY RESULTS: WE HAVE A WINNER!')
            .setDescription(
                `Congratulations to <@${winnerId}>! You have been randomly selected as our lucky winner! 🥳\n\n` +
                `🎫 **HOW TO CLAIM:**\n` +
                `Please head over to <#1369976260066803794> and open a ticket to receive your reward.`
            )
            .setColor('#2ECC71')
            .setThumbnail('https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png')
            // 2. Reference the attachment in the image (or footer image)
            .setImage('attachment://announce.png') 
            .setFooter({ 
                text: 'Thank you for being part of the Peaxel community!', 
                iconURL: 'attachment://announce.png' 
            })
            .setTimestamp();

        // 3. Send the message with the attachment and the tag
        await channel.send({ 
            content: `🎉 Congratulations <@${winnerId}>! You just won the Peaxel Giveaway! 🏆`, 
            embeds: [winEmbed],
            files: [imageFile] 
        });

        // Reset the giveaway data
        fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify({ participants: [] }, null, 2));
        
    } catch (e) { 
        console.error(`${logPrefix} [Giveaway Draw] Error:`, e.message); 
    }
}, { scheduled: true, timezone });
}

function getWeekKey() {
    const now = getParisDate();
    return `${now.getFullYear()}-W${getCurrentWeekNumber()}`;
}