import cron from 'node-cron';
import { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { sendWeeklyMessage } from './utils/sendWeeklyMessage.js';
import { getRandomAthlete, getPreviewAthlete } from './utils/spotlightManager.js';
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

  if (dayIndex === 0) {
    week = week - 1;
  }

  let statusText = customText;

  if (!statusText) {
    const baseStatus = `Gameweek : ${week}`;

    if (dayIndex === 1) {
      statusText = `${baseStatus} | LIVE 🟢`;
    } 
    else if (dayIndex === 2 && hours >= 19) {
      statusText = `${baseStatus} | Quiz Time 🎲`;
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
  console.log(`${logPrefix} 🎲 Quiz: Tuesday at 19:00 (Paris)`);
  console.log(`${logPrefix} 🌟 Spotlight: Wednesday at 16:00 (Paris)`);
  console.log(`${logPrefix} ⚠️ Closing: Thursday at 18:59 (Paris)`);
  console.log(`${logPrefix} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

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

  // --- 2. AUTOMATIC SCOUT QUIZ (Tuesday 19:00) ---
  cron.schedule('0 19 * * 2', async () => {
    try {
      const athlete = getPreviewAthlete();
      if (!athlete) return;

      const config = getConfig();
      const channelId = config.channels?.announce || '1369976259613954059';
      const channel = await client.channels.fetch(channelId);

      const quizEmbed = new EmbedBuilder()
        .setTitle('🎲 SCOUT QUIZ: Guess the Athlete!')
        .setDescription('Find the **IN-GAME PSEUDO** of this athlete to win a reward!')
        .addFields(
          { name: '📍 Nationality', value: athlete.nationality, inline: true },
          { name: '🏆 Sport', value: athlete.sport, inline: true },
          { name: '🗂️ Category', value: athlete.category, inline: true },
          { name: '💡 Hint', value: `The pseudo starts with **${athlete.name.charAt(0).toUpperCase()}**` }
        )
        .setColor('#FACC15')
        .setFooter({ text: 'Note: You must provide the exact in-game pseudo (e.g., SHAHMALARANI)' });

      await channel.send({ content: '✨ **Weekly Scout Quiz is LIVE!** @everyone', embeds: [quizEmbed] });
      updatePresence(client, `Quiz Active 🎲`);

      const filter = m => m.content.toUpperCase() === athlete.name.toUpperCase();
      const collector = channel.createMessageCollector({ filter, time: 7200000, max: 1 });

      collector.on('collect', async m => {
        const winEmbed = new EmbedBuilder()
          .setTitle('🏆 WE HAVE A WINNER!')
          .setDescription(`Congratulations <@${m.author.id}>! You found the correct athlete: **${athlete.name.toUpperCase()}**.\n\n` +
                          `📩 To claim your reward, please open a ticket here: <#1369976260066803794>`)
          .setColor('#2ECC71')
          .setThumbnail(athlete.image);

        await channel.send({ embeds: [winEmbed] });
        updatePresence(client);
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          channel.send(`⏰ **Quiz Ended!** No one found the answer in time. It was **${athlete.name.toUpperCase()}**.`);
          updatePresence(client);
        }
      });
    } catch (error) {
      console.error(`${logPrefix} [Quiz] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 3. ATHLETE SPOTLIGHT (Wednesday 16:00) ---
  cron.schedule('0 16 * * 3', async () => {
    try {
      const athlete = getRandomAthlete();
      if (!athlete) return console.log(`${logPrefix} [Spotlight] No unposted athletes found.`);

      const config = getConfig();
      const channelId = config.channels?.spotlight || '1369976259613954059';
      const channel = await client.channels.fetch(channelId);

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

      await channel.send({ content: "✨ **New Athlete Spotlight is live!**", embeds: [embed], components: [row] });
      updatePresence(client);
    } catch (error) {
      console.error(`${logPrefix} [Spotlight] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 4. LINEUP CLOSING (Thursday 18:59) ---
  cron.schedule('59 18 * * 4', async () => {
    const weekKey = getWeekKey();
    if (lastSentCloseWeek === weekKey) return;

    try {
      const success = await sendWeeklyMessage(client, { isManual: false, type: 'closing' });
      if (success) {
        lastSentCloseWeek = weekKey;
        updatePresence(client);
      }
    } catch (error) {
      console.error(`${logPrefix} [Closing] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 5. HOURLY REFRESH ---
  cron.schedule('0 * * * *', () => {
    updatePresence(client);
  }, { scheduled: true, timezone });
}

function getWeekKey() {
  const now = getParisDate();
  return `${now.getFullYear()}-W${getCurrentWeekNumber()}`;
}