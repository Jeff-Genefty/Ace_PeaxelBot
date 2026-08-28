import cron from 'node-cron';
import { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { sendWeeklyMessage } from './utils/sendWeeklyMessage.js';
import { getRandomAthlete } from './utils/spotlightManager.js';
import { getCurrentWeekNumber, getParisDate } from './utils/week.js';
import { getChannel, getTicketChannelId } from './utils/configManager.js';
import { sendAceMotivation } from './utils/rewardSystem.js';
import { runScoutQuiz } from './utils/scoutQuizRunner.js';
import { loadSchedulerState, saveSchedulerState } from './utils/schedulerState.js';
import { readJsonSync, writeJsonSync, updateJsonSync } from './utils/jsonStore.js';

const logPrefix = '[Peaxel Scheduler]';
const GIVEAWAY_FILE = './data/giveaways.json';

const schedulerState = loadSchedulerState();
let lastSentOpenWeek = schedulerState.lastSentOpenWeek;
let lastSentCloseWeek = schedulerState.lastSentCloseWeek;

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
                saveSchedulerState({ lastSentOpenWeek, lastSentCloseWeek });
                updatePresence(client); 
            }
        } catch (error) { console.error(`${logPrefix} [Opening] Error:`, error.message); }
    }, { scheduled: true, timezone });

    // --- 2. AUTOMATIC SCOUT QUIZ (Tuesday 19:00) ---
    cron.schedule('0 19 * * 2', async () => {
        try {
            const result = await runScoutQuiz(client, {
                onStart: () => updatePresence(client, 'Quiz Active 🎲'),
                onWinner: () => updatePresence(client),
            });
            if (!result.success) {
                console.warn(`${logPrefix} [Quiz] Skipped: ${result.reason}`);
            }
        } catch (error) { console.error(`${logPrefix} [Quiz] Error:`, error.message); }
    }, { scheduled: true, timezone });

    // --- 3. ATHLETE SPOTLIGHT (Wednesday 16:00) ---
cron.schedule('0 16 * * 3', async () => {
    try {
        const athlete = getRandomAthlete(); 
        if (!athlete) return;
        
        const spotlightChannelId = getChannel('spotlight') || getChannel('welcome');
        const generalChannelId = getChannel('welcome');
        const channel = await client.channels.fetch(spotlightChannelId);

        const athleteName = (athlete.name || "Athlete").toUpperCase();

        let prizesText = "";
        for (let i = 1; i <= 5; i++) {
            if (athlete[`prize${i}`]) {
                prizesText += `• ${athlete[`prize${i}`]}\n`;
            }
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
                { name: '\u200B', value: '\u200B', inline: false },
                { name: "📝 Description", value: athlete.description || "No description available." },
                { name: '\u200B', value: '\u200B', inline: false },
            );

        if (athlete.birthdate) {
            embed.addFields({ name: "🎂 Birthdate", value: athlete.birthdate, inline: true });
        }

        const locationValue = `${athlete.city || ''} ${athlete.club || ''}`.trim();
        if (locationValue && locationValue.toUpperCase() !== "N/A") {
            embed.addFields({ name: "📍 Location & Club", value: locationValue, inline: true });
        }

        if (athlete.goal && athlete.goal.toUpperCase() !== "N/A") {
            embed.addFields(
                { name: '\u200B', value: '\u200B', inline: false },
                { name: "🎯 Personal Goal", value: athlete.goal }
            );
        }

        if (prizesText) {
            embed.addFields(
                { name: '\u200B', value: '\u200B', inline: false },
                { name: "⭐ Achievements", value: prizesText }
            );
        }

        embed.addFields(
            { name: '\u200B', value: '\u200B', inline: false },
            { 
                name: "📣 COACH ACE CHALLENGE", 
                value: `Is **${athleteName}** part of your strategy? 🔥\n` +
                       `Drop a screenshot in <#${generalChannelId}> if you have this athlete! 🏟️` 
            }
        );

        embed.setImage(athlete.talent_card_image_url || null)
            .setFooter({ text: "Peaxel • Athlete Spotlight Series", iconURL: 'https://media.peaxel.me/logo.png' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('View Profile 🃏')
                .setStyle(ButtonStyle.Link)
                .setURL(athlete.peaxelLink || "https://game.peaxel.me"),
            new ButtonBuilder()
                .setLabel('Play on Peaxel 🎮')
                .setStyle(ButtonStyle.Link)
                .setURL("https://game.peaxel.me")
        );

        const socialMedia = [
            { key: 'instagram_talent', label: 'Instagram' },
            { key: 'tiktok', label: 'TikTok' },
            { key: 'x_twitter', label: 'X (Twitter)' },
            { key: 'facebook', label: 'Facebook' },
            { key: 'linkedin', label: 'LinkedIn' }
        ];

        for (const social of socialMedia) {
            const url = athlete[social.key];
            if (url && typeof url === 'string' && url.startsWith('http') && row.components.length < 5) {
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel(social.label)
                        .setStyle(ButtonStyle.Link)
                        .setURL(url)
                );
            }
        }

        const introText = `@everyone\n\nIt's time for our **Weekly Athlete Spotlight**! 🚀\n` +
                          `Every week, we focus on a new rising talent from the Peaxel ecosystem. Discover their journey, achievements, and goals below! 👇`;

        await channel.send({ 
            content: introText, 
            embeds: [embed], 
            components: [row] 
        });

        client.user.setActivity(`Spotlight: ${athleteName} 🌟`, { type: ActivityType.Watching });

    } catch (error) { 
        console.error(`[Peaxel Bot] [Spotlight Scheduler] Error:`, error.message); 
    }
}, { scheduled: true, timezone: "Europe/Paris" });

    // --- 4. LINEUP CLOSING (Thursday 18:59 — rappel 5h avant deadline 23:59) ---
    cron.schedule('59 18 * * 4', async () => {
        const weekKey = getWeekKey();
        if (lastSentCloseWeek === weekKey) return;
        try {
            const success = await sendWeeklyMessage(client, { isManual: false, type: 'closing' });
            if (success) {
                lastSentCloseWeek = weekKey;
                saveSchedulerState({ lastSentOpenWeek, lastSentCloseWeek });
                updatePresence(client);
            }
        } catch (error) { console.error(`${logPrefix} [Closing] Error:`, error.message); }
    }, { scheduled: true, timezone });

    // --- 5. COACH ACE RANDOM MOTIVATION ---
    cron.schedule('0 * * * *', async () => {
        try { await sendAceMotivation(client); } catch (e) {}
    }, { scheduled: true, timezone });

    // --- 6. GIVEAWAY LAUNCH (Saturday 10:00) ---
    cron.schedule('0 10 * * 6', async () => {
        try {
            const announceId = getChannel('announce');
            if (!announceId) return;
            const channel = await client.channels.fetch(announceId);
            
            // Reset giveaway data
            writeJsonSync(GIVEAWAY_FILE, { participants: [], participantTags: [] });

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
        const channelId = getChannel('announce');
        if (!channelId) return;
        const channel = await client.channels.fetch(channelId);
        const ticketChannelId = getTicketChannelId();
        const ticketMention = ticketChannelId ? `<#${ticketChannelId}>` : 'the support ticket channel';
        const data = readJsonSync(GIVEAWAY_FILE, { participants: [], participantTags: [] });

        if (!data.participants?.length) {
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
                `Please head over to ${ticketMention} and open a ticket to receive your reward.`
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

        writeJsonSync(GIVEAWAY_FILE, { participants: [], participantTags: [] });
        
    } catch (e) { 
        console.error(`${logPrefix} [Giveaway Draw] Error:`, e.message); 
    }
}, { scheduled: true, timezone });
}

function getWeekKey() {
    const now = getParisDate();
    return `${now.getFullYear()}-W${getCurrentWeekNumber()}`;
}