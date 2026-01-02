import cron from 'node-cron';
import { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { sendWeeklyMessage } from './utils/sendWeeklyMessage.js';
import { getRandomAthlete } from './utils/spotlightManager.js';
import { getCurrentWeekNumber, getParisDate, getCurrentDayName } from './utils/week.js';

const logPrefix = '[Peaxel Scheduler]';

// Distinct tracking to prevent double-posting on restart
let lastSentOpenWeek = null;
let lastSentCloseWeek = null;

/**
 * Updates the Bot's Presence (Status) based on the current schedule
 * @param {import('discord.js').Client} client 
 * @param {string|null} customText 
 */
export function updatePresence(client, customText = null) {
  const week = getCurrentWeekNumber();
  const day = getCurrentDayName();
  let statusText = customText;

  // If no custom text provided, determine status based on the day
  if (!statusText) {
    switch (day) {
      case 'Monday':
        statusText = `Week ${week} is LIVE! 🟢`;
        break;
      case 'Wednesday':
        statusText = `New Spotlight is out! 🌟`;
        break;
      case 'Thursday':
        statusText = `Week ${week} closing soon... 🔴`;
        break;
      default:
        statusText = `Peaxel • Week ${week} 🎮`;
    }
  }

  client.user.setActivity(statusText, { type: ActivityType.Playing });
  console.log(`${logPrefix} Status updated to: ${statusText}`);
}

export function initScheduler(client) {
  const timezone = process.env.TZ || 'Europe/Paris';
  
  console.log(`${logPrefix} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${logPrefix} 🚀 Scheduler online:`);
  console.log(`${logPrefix} 📅 Opening: Monday at 00:00 (Paris)`);
  console.log(`${logPrefix} 🌟 Spotlight: Wednesday at 16:00 (Paris)`);
  console.log(`${logPrefix} ⚠️ Closing: Thursday at 18:59 (Paris)`);
  console.log(`${logPrefix} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Set initial status on startup
  updatePresence(client);

  // --- 1. LINEUP OPENING (Monday 00:00) ---
  cron.schedule('0 0 * * 1', async () => {
    const weekKey = getWeekKey();
    if (lastSentOpenWeek === weekKey) return;

    try {
      console.log(`${logPrefix} [Opening] Starting weekly post...`);
      const success = await sendWeeklyMessage(client, { isManual: false, type: 'opening' });
      if (success) {
        lastSentOpenWeek = weekKey;
        updatePresence(client, `Week ${getCurrentWeekNumber()} is LIVE! 🟢`);
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

      const channelId = process.env.SPOTLIGHT_CHANNEL_ID || '1369976259613954059';
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return;

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
      updatePresence(client, `Discover: ${athlete.name} 🌟`);

    } catch (error) {
      console.error(`${logPrefix} [Spotlight] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 3. LINEUP CLOSING (Thursday 18:59) ---
  cron.schedule('59 18 * * 4', async () => {
    const weekKey = getWeekKey();
    if (lastSentCloseWeek === weekKey) return;

    try {
      console.log(`${logPrefix} [Closing] Starting closing post...`);
      const success = await sendWeeklyMessage(client, { isManual: false, type: 'closing' });
      if (success) {
        lastSentCloseWeek = weekKey;
        updatePresence(client, `Lineups locking! 🔴`);
      }
    } catch (error) {
      console.error(`${logPrefix} [Closing] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 4. MIDNIGHT REFRESH (Every day at 00:00) ---
  // Ensures the presence is updated if the bot stays on for days
  cron.schedule('0 0 * * *', () => {
    updatePresence(client);
  }, { scheduled: true, timezone });
}

/**
 * Generates a unique key for the current week/year
 */
function getWeekKey() {
  const now = getParisDate();
  return `${now.getFullYear()}-W${getCurrentWeekNumber()}`;
}