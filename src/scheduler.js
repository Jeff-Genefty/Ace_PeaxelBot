import cron from 'node-cron';
import { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { sendWeeklyMessage } from './utils/sendWeeklyMessage.js';
import { getRandomAthlete } from './utils/spotlightManager.js';
import { buildSpotlightPayload } from './utils/spotlightMessage.js';
import { getCurrentWeekNumber, getParisDate } from './utils/week.js';
import { getChannel, getTicketChannelId } from './utils/configManager.js';
import { runScoutQuiz } from './utils/scoutQuizRunner.js';
import { loadSchedulerState, saveSchedulerState } from './utils/schedulerState.js';
import { readJsonSync } from './utils/jsonStore.js';
import { openGiveaway, closeGiveaway } from './web/services/giveawayService.js';
import { generateWeeklyChallenges } from './web/services/weeklyChallengeService.js';
import { settleWeeklyPodium, announceWeeklyPodium } from './web/services/hubXpService.js';
import { sendDailyConnectMessage } from './utils/dailyConnectMessage.js';
import { sendGwDeadlineReminders } from './web/services/gwReminderService.js';
import { addLiveLog } from './web/services/liveLogService.js';
import {
    generateQuizSchedule,
    getDueQuizSlot,
    markQuizSlotFired,
    unmarkQuizSlotFired,
    getQuizScheduleSummary,
} from './utils/quizSchedule.js';

const logPrefix = '[Peaxel Scheduler]';
const GIVEAWAY_FILE = './data/giveaways.json';

const schedulerState = loadSchedulerState();
let lastSentOpenWeek = schedulerState.lastSentOpenWeek;
let lastSentCloseWeek = schedulerState.lastSentCloseWeek;

async function fireScoutQuiz(client, reason = 'scheduled') {
    const result = await runScoutQuiz(client, {
        onStart: () => updatePresence(client, 'Quiz Active 🎲'),
        onWinner: () => updatePresence(client),
    });
    if (!result.success) {
        console.warn(`${logPrefix} [Quiz] Skipped (${reason}): ${result.reason}`);
        return false;
    }
    addLiveLog('SYSTEM', `Scout Quiz launched · ${reason}`);
    return true;
}

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
    const quizSummary = getQuizScheduleSummary();
    console.log(`${logPrefix} Quiz schedule ${quizSummary.weekKey}: ${quizSummary.total} slot(s), ${quizSummary.remaining} remaining`);

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

    // --- 2. SCOUT QUIZ ALÉATOIRE (3–4 / semaine, créneaux tirés — check toutes les 5 min) ---
    cron.schedule('*/5 * * * *', async () => {
        try {
            const due = getDueQuizSlot();
            if (!due) return;
            markQuizSlotFired(due.id); // anti-doublon avant l'envoi
            const ok = await fireScoutQuiz(client, `random-slot ${due.id}`);
            if (!ok) unmarkQuizSlotFired(due.id);
        } catch (error) {
            console.error(`${logPrefix} [Quiz random] Error:`, error.message);
        }
    }, { scheduled: true, timezone });

    // --- 3. ATHLETE SPOTLIGHT (Wednesday 16:00) ---
    cron.schedule('0 16 * * 3', async () => {
        try {
            const athlete = getRandomAthlete();
            if (!athlete) return;

            const spotlightChannelId = getChannel('spotlight') || getChannel('welcome');
            const generalChannelId = getChannel('welcome');
            const channel = await client.channels.fetch(spotlightChannelId);
            const { content, embed, components, athleteName } = buildSpotlightPayload(athlete, generalChannelId);

            const sent = await channel.send({ content, embeds: [embed], components });
            for (const emoji of ['⭐', '🔥', '🃏']) {
                await sent.react(emoji).catch(() => null);
            }
            client.user.setActivity(`Spotlight: ${athleteName}`, { type: ActivityType.Watching });
        } catch (error) {
            console.error(`[Peaxel Bot] [Spotlight Scheduler] Error:`, error.message);
        }
    }, { scheduled: true, timezone });

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

    // --- 6. GIVEAWAY LAUNCH (Saturday 10:00) ---
    cron.schedule('0 10 * * 6', async () => {
        try {
            const announceId = getChannel('announce');
            if (!announceId) return;
            const channel = await client.channels.fetch(announceId);
            
            // Reset giveaway data
            openGiveaway('scheduler');

            const giveawayEmbed = new EmbedBuilder()
                .setTitle('🎟️ Weekend Giveaway — win an Athlete Card')
                .setDescription(
                    'One lucky manager walks away with an **Athlete Card** for their Peaxel roster.\n\n'
                    + '**How it works**\n'
                    + '1️⃣ Click **Enter giveaway** below (one entry per person)\n'
                    + '2️⃣ Stay entered until Sunday 20:00 (Paris)\n'
                    + '3️⃣ Winner is drawn live — claim via ticket\n\n'
                    + 'Bonus: joining also grants **Hub XP** and can complete a weekly challenge.',
                )
                .setColor('#a855f7')
                .setFooter({ text: 'Peaxel · Free cards · Collect · Compete' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('join_giveaway')
                    .setLabel('Enter giveaway')
                    .setEmoji('🎟️')
                    .setStyle(ButtonStyle.Primary),
            );

            await channel.send({
                content: '@everyone — Weekend giveaway is open. Enter in one click 👇',
                embeds: [giveawayEmbed],
                components: [row],
            });
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
            return await channel.send(
                '🎟️ **Weekend giveaway closed** — no entries this time. Next draw opens Saturday 10:00 (Paris).',
            );
        }

        const winnerId = data.participants[Math.floor(Math.random() * data.participants.length)];
        const imageFile = new AttachmentBuilder('./assets/announce.png');

        const winEmbed = new EmbedBuilder()
            .setTitle('🎊 Giveaway winner — Athlete Card')
            .setDescription(
                `Congrats <@${winnerId}> — you won this weekend’s **Athlete Card**!\n\n`
                + `**Claim your card**\n`
                + `Open a ticket in ${ticketMention} and mention this giveaway so the team can deliver your reward.`,
            )
            .setColor('#2ECC71')
            .setThumbnail('https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png')
            .setImage('attachment://announce.png')
            .setFooter({ text: 'Peaxel · Thanks for competing, Managers' })
            .setTimestamp();

        await channel.send({
            content: `🎉 <@${winnerId}> just won the Peaxel weekend giveaway!`,
            embeds: [winEmbed],
            files: [imageFile],
        });

        let winnerTag = winnerId;
        try {
            const user = await client.users.fetch(winnerId);
            winnerTag = user.username || user.tag || winnerId;
        } catch { /* keep id */ }
        closeGiveaway({ id: winnerId, tag: winnerTag });
    } catch (e) {
        console.error(`${logPrefix} [Giveaway Draw] Error:`, e.message);
    }
    }, { scheduled: true, timezone });

    // --- 7b. WEEKLY XP WINNER (Sunday 20:05) ---
    cron.schedule('5 20 * * 0', async () => {
        try {
            const settlement = settleWeeklyPodium();
            if (settlement.rewarded.length) {
                await announceWeeklyPodium(client, settlement);
                addLiveLog('SYSTEM', `Weekly XP #1 settled · ${settlement.weekKey} · ${settlement.rewarded[0]?.discordId}`);
            } else {
                addLiveLog('SYSTEM', `Weekly XP #1 skipped · ${settlement.weekKey} · empty board`);
            }
        } catch (e) {
            console.error(`${logPrefix} [Weekly XP Winner] Error:`, e.message);
        }
    }, { scheduled: true, timezone });

    // --- 8. WEEKLY CHALLENGES + QUIZ SCHEDULE (Monday 00:05) ---
    cron.schedule('5 0 * * 1', async () => {
        try {
            const gw = getCurrentWeekNumber();
            generateWeeklyChallenges(gw);
            const quiz = generateQuizSchedule();
            addLiveLog('SYSTEM', `Weekly challenges generated · GW ${gw}`);
            addLiveLog('SYSTEM', `Scout Quiz schedule · ${quiz.slots?.length || 0} random slot(s)`);
        } catch (e) {
            console.error(`${logPrefix} [Weekly Challenges] Error:`, e.message);
        }
    }, { scheduled: true, timezone });

    // --- 8b. DAILY CONNECT MESSAGE (every day 09:00 Paris) ---
    cron.schedule('0 9 * * *', async () => {
        try {
            const result = await sendDailyConnectMessage(client);
            if (!result.success) {
                console.warn(`${logPrefix} [Daily Connect] Skipped: ${result.reason}`);
            }
        } catch (e) {
            console.error(`${logPrefix} [Daily Connect] Error:`, e.message);
        }
    }, { scheduled: true, timezone });

    // --- 9. GW DEADLINE REMINDERS (Thursday 21:59 — 2h before 23:59) ---
    cron.schedule('59 21 * * 4', async () => {
        try {
            const result = await sendGwDeadlineReminders(client);
            addLiveLog('SYSTEM', `GW reminders sent: ${result.sent} ok, ${result.failed} failed`);
        } catch (e) {
            console.error(`${logPrefix} [GW Reminders] Error:`, e.message);
        }
    }, { scheduled: true, timezone });
}

function getWeekKey() {
    const now = getParisDate();
    return `${now.getFullYear()}-W${getCurrentWeekNumber()}`;
}