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
  const now = getParisDate();
  const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hours = now.getHours();
  let week = getCurrentWeekNumber();

  // SUNDAY FIX: If it's Sunday, we keep showing the current week number 
  // instead of jumping to the next one prematurely.
  if (dayIndex === 0) {
    week = week - 1;
  }

  const dayName = getCurrentDayName();
  let statusText = customText;

  if (!statusText) {
    switch (dayName) {
      case 'Monday':
        statusText = `GW ${week} is LIVE! 🟢`;
        break;
      case 'Wednesday':
        statusText = `New Spotlight is out! 🌟`;
        break;
      case 'Thursday':
        // Dynamic Thursday status: Show "closing soon" before 7 PM Paris time.
        if (hours < 19) {
          statusText = `⌛ GW ${week} closing soon!`;
        } else {
          statusText = `🚫 GW ${week} is CLOSED`;
        }
        break;
      case 'Friday':
      case 'Saturday':
      case 'Sunday':
        statusText = `Peaxel • Game Week ${week} 🎮`;
        break;
      default:
        statusText = `Peaxel • GW ${week}`;
    }
  }

  client.user.setActivity(statusText, { type: ActivityType.Playing });
  console.log(`${logPrefix} Status updated to: ${statusText}`);
}

/**
 * Initializes all scheduled tasks for the bot
 */
export function initScheduler(client) {
  const timezone = process.env.TZ || 'Europe/Paris';
  
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
        // Force "LIVE" status immediately after posting
        updatePresence(client, `GW ${getCurrentWeekNumber()} is LIVE! 🟢`);
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
      const channelId = config.channels.spotlight || process.env.SPOTLIGHT_CHANNEL_ID || '1369976259613954059';
      
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
        new ButtonBuilder().setLabel('Play Peaxel 🎮').setStyle(ButtonStyle.Link).setURL("https://peaxel.me/game")
      );

      await channel.send({ 
        content: "✨ **New Athlete Spotlight is live!**",
        embeds: [embed], 
        components: [row] 
      });
      
      console.log(`${logPrefix} [Spotlight] Posted: ${athlete.name}`);
      updatePresence(client, `Spotlight: ${athlete.name} 🌟`);

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
        // Update presence to "CLOSED" immediately after posting
        updatePresence(client, `🚫 GW ${getCurrentWeekNumber()} is CLOSED`);
      }
    } catch (error) {
      console.error(`${logPrefix} [Closing] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 4. HOURLY REFRESH ---
  // Refreshes every hour to ensure Thursday status changes (Closing/Closed) are accurate
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