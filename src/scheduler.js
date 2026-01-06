import cron from 'node-cron';
import { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { sendWeeklyMessage } from './utils/sendWeeklyMessage.js';
import { getRandomAthlete } from './utils/spotlightManager.js';
import { getCurrentWeekNumber, getParisDate, getCurrentDayName } from './utils/week.js';
import { getConfig } from './utils/configManager.js';

const logPrefix = '[Peaxel Scheduler]';

// Tracking variables to prevent double-posting upon restart
let lastSentOpenWeek = null;
let lastSentCloseWeek = null;

/**
 * Updates the Bot's Presence (Status) based on the current schedule
 */
export function updatePresence(client, customText = null) {
  if (!client.user) return;

  const now = getParisDate();
  const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hours = now.getHours();
  let week = getCurrentWeekNumber();

  // SUNDAY FIX: Keep showing current week number
  if (dayIndex === 0) {
    week = week - 1;
  }

  let statusText = customText;

  if (!statusText) {
    const baseStatus = `Gameweek : ${week}`;

    if (dayIndex === 1) {
      statusText = `${baseStatus} | LIVE 🟢`;
    } 
    else if (dayIndex === 3 && hours >= 16) {
      statusText = `${baseStatus} | Spotlight 🌟`;
    } 
    else if (dayIndex === 4) {
      if (hours < 19) {
        statusText = `${baseStatus} | Closing Soon ⏳`;
      } else {
        statusText = `${baseStatus} | Locked 🚫`;
      }
    } 
    else {
      statusText = baseStatus;
    }
  }

  client.user.setActivity(statusText, { type: ActivityType.Watching });
  console.log(`${logPrefix} Status updated to: ${statusText}`);
}

/**
 * Initializes all scheduled tasks for the bot
 */
export function initScheduler(client) {
  const timezone = 'Europe/Paris';
  
  console.log(`${logPrefix} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${logPrefix} 🚀 Scheduler online:`);
  console.log(`${logPrefix} 📅 Opening: Monday at 00:00 (Paris)`);
  console.log(`${logPrefix} 🌟 Spotlight: Wednesday at 16:00 (Paris)`);
  console.log(`${logPrefix} ⚠️ Closing: Thursday at 18:59 (Paris)`);
  console.log(`${logPrefix} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Initial presence update on startup
  updatePresence(client);

  // --- 1. LINEUP OPENING (Monday 00:00) ---
  cron.schedule('0 0 * * 1', async () => {
    const weekKey = getWeekKey();
    if (lastSentOpenWeek === weekKey) return;

    try {
      console.log(`${logPrefix} [Opening] Executing weekly opening post...`);
      const success = await sendWeeklyMessage(client, { isManual: false, type: 'opening' });
      if (success) {
        lastSentOpenWeek = weekKey;
        updatePresence(client);
      }
    } catch (error) {
      console.error(`${logPrefix} [Opening] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 2. ATHLETE SPOTLIGHT (Wednesday 16:00) ---
  cron.schedule('0 16 * * 3', async () => {
    try {
      const athlete = getRandomAthlete();
      if (!athlete) return console.log(`${logPrefix} [Spotlight] No unposted athletes found.`);

      const config = getConfig();
      const channelId = config.channels?.spotlight || '1369976259613954059';
      
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return console.error(`${logPrefix} [Spotlight] Target channel not found.`);

      const embed = new EmbedBuilder()
        .setTitle(`🌟 WEEKLY SPOTLIGHT: ${athlete.name.toUpperCase()}`)
        .setDescription(`Discover this week's featured talent from the Peaxel ecosystem!`)
        .setColor("#FACC15")
        .addFields(
          { name: "📍 Nationality", value: athlete.nationality, inline: true },
          { name: "🗂️ Category", value: athlete.category, inline: true },
          { name: "🏆 Sport", value: athlete.sport, inline: true },
          { name: "📝 Description", value: athlete.description }
        )
        .setImage(athlete.image)
        .setFooter({ text: "Peaxel • Athlete Spotlight Series" })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Profile 🃏').setStyle(ButtonStyle.Link).setURL(athlete.peaxelLink),
        new ButtonBuilder().setLabel('Instagram 📸').setStyle(ButtonStyle.Link).setURL(athlete.igLink),
        new ButtonBuilder().setLabel('Play Peaxel 🎮').setStyle(ButtonStyle.Link).setURL("https://game.peaxel.me")
      );

      await channel.send({ 
        content: "✨ **New Athlete Spotlight is live!**",
        embeds: [embed], 
        components: [row] 
      });
      
      console.log(`${logPrefix} [Spotlight] Posted: ${athlete.name}`);
      updatePresence(client);

    } catch (error) {
      console.error(`${logPrefix} [Spotlight] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 3. LINEUP CLOSING (Thursday 18:59) ---
  cron.schedule('59 18 * * 4', async () => {
    const weekKey = getWeekKey();
    if (lastSentCloseWeek === weekKey) return;

    try {
      console.log(`${logPrefix} [Closing] Executing weekly closing post...`);
      const success = await sendWeeklyMessage(client, { isManual: false, type: 'closing' });
      if (success) {
        lastSentCloseWeek = weekKey;
        updatePresence(client);
      }
    } catch (error) {
      console.error(`${logPrefix} [Closing] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 4. HOURLY REFRESH ---
  cron.schedule('0 * * * *', () => {
    updatePresence(client);
  }, { scheduled: true, timezone });
}

/**
 * Generates a unique key for the current week to prevent duplicate posts
 */
function getWeekKey() {
  const now = getParisDate();
  return `${now.getFullYear()}-W${getCurrentWeekNumber()}`;
}