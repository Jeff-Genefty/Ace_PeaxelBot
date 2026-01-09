import cron from 'node-cron';
import fs from 'fs';
import { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { sendWeeklyMessage } from './utils/sendWeeklyMessage.js';
import { getRandomAthlete, getPreviewAthlete } from './utils/spotlightManager.js';
import { getCurrentWeekNumber, getParisDate } from './utils/week.js';
import { getConfig } from './utils/configManager.js';
import { sendAceMotivation } from './utils/rewardSystem.js';

const logPrefix = '[Peaxel Scheduler]';
const GIVEAWAY_FILE = './data/giveaways.json';

let lastSentOpenWeek = null;
let lastSentCloseWeek = null;

export function updatePresence(client, customText = null) {
  if (!client.user) return;

  const now = getParisDate();
  const dayIndex = now.getDay(); 
  const hours = now.getHours();
  const minutes = now.getMinutes();
  let week = getCurrentWeekNumber();

  if (dayIndex === 0) week = week - 1;

  let statusText = customText;

  if (!statusText) {
    const baseStatus = `Gameweek : ${week}`;

    if (dayIndex === 1) {
      statusText = `${baseStatus} | LIVE 🟢`;
    } 
    else if (dayIndex === 2 && hours >= 19) {
      statusText = `${baseStatus} | Quiz Active 🎲`;
    }
    else if (dayIndex === 3 && hours >= 16) {
      statusText = `${baseStatus} | Spotlight 🌟`;
    } 
    else if (dayIndex === 4) {
      if (hours < 18 || (hours === 18 && minutes < 59)) {
        statusText = `${baseStatus} | Closing Soon ⏳`;
      } else {
        statusText = `${baseStatus} | Locked 🚫`;
      }
    }
    else if (dayIndex === 6 || dayIndex === 0) {
        statusText = `${baseStatus} | Weekend Event 🎟️`;
    }
    else {
      statusText = baseStatus;
    }
  }

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
      const announceChannelId = config.channels?.announce || '1369976257047167059';
      const generalChannelId = '1369976259613954059'; 

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
              `3️⃣ Type the **EXACT IN-GAME PSEUDO** of this athlete.\n\n` +
              `⚠️ *Precision is key! Only the exact spelling will be validated.*`
          )
          .addFields(
              { name: '📍 Nationality', value: athlete.nationality || "N/A", inline: true },
              { name: '🏆 Sport', value: athlete.sport || "N/A", inline: true },
              { name: '🗂️ Category', value: athlete.category || "N/A", inline: true },
              { name: '💡 Scouting Hint', value: `The pseudo starts with the letter: **${athlete.name.charAt(0).toUpperCase()}**` }
          )
          .setColor('#FACC15')
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
                          `📩 To claim your reward, please open a ticket here: <#1369976260066803794>`)
          .setColor('#2ECC71')
          .setThumbnail(athlete.image);

        await announceChannel.send({ embeds: [winEmbed] });
        await m.reply(`🏆 **Correct!** You won the Scout Quiz! Check <#${announceChannelId}> for details.`);
        updatePresence(client);
      });

      collector.on('collect', () => collector.stop());
    } catch (error) {
      console.error(`${logPrefix} [Quiz] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 3. ATHLETE SPOTLIGHT (Wednesday 16:00) ---
  cron.schedule('0 16 * * 3', async () => {
    try {
      const athlete = getRandomAthlete();
      if (!athlete) return;
      
      const config = getConfig();
      const channelId = config.channels?.spotlight || '1369976259613954059';
      const generalChannelId = '1369976259613954059'; 
      const channel = await client.channels.fetch(channelId);

      const athleteName = (athlete.name || "Athlete").toUpperCase();
      let prizesText = "";
      for (let i = 1; i <= 5; i++) {
        if (athlete[`prize${i}`]) prizesText += `• ${athlete[`prize${i}`]}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🌟 SPOTLIGHT OF THE WEEK: ${athleteName}`)
        .setURL(athlete.peaxelLink || "https://game.peaxel.me")
        .setColor("#FACC15")
        .setThumbnail(athlete.talent_profile_image_url || null)
        .addFields(
          { name: "🌍 Nationality", value: athlete.main_nationality || "N/A", inline: true },
          { name: "🗂️ Category", value: athlete.main_category || "N/A", inline: true },
          { name: "🏆 Sport", value: athlete.occupation || "N/A", inline: true },
          { name: "📝 Description", value: athlete.description || "No description available." }
        );

      if (athlete.birthdate) {
        embed.addFields({ name: "🎂 Birthdate", value: athlete.birthdate, inline: true });
      }

      const locationValue = `${athlete.city || ''} ${athlete.club || ''}`.trim();
      if (locationValue && locationValue.toUpperCase() !== "N/A") {
        embed.addFields({ name: "📍 Location & Club", value: locationValue, inline: true });
      }

      if (athlete.goal && athlete.goal.toUpperCase() !== "N/A") {
        embed.addFields({ name: '\u200B', value: '\u200B', inline: false }, { name: "🎯 Personal Goal", value: athlete.goal });
      }

      if (prizesText) {
        embed.addFields({ name: '\u200B', value: '\u200B', inline: false }, { name: "⭐ Achievements", value: prizesText });
      }

      embed.addFields(
        { name: '\u200B', value: '\u200B', inline: false },
        { name: "📣 COACH ACE CHALLENGE", value: `Is **${athleteName}** part of your strategy? 🔥\nDrop a screenshot in <#${generalChannelId}> if you have this athlete! 🏟️` }
      );

      embed.setImage(athlete.talent_card_image_url || null)
        .setFooter({ text: "Peaxel • Athlete Spotlight Series", iconURL: 'https://media.peaxel.me/logo.png' })
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Profile 🃏').setStyle(ButtonStyle.Link).setURL(athlete.peaxelLink || "https://game.peaxel.me"),
        new ButtonBuilder().setLabel('Play on Peaxel 🎮').setStyle(ButtonStyle.Link).setURL("https://game.peaxel.me")
      );

      const row2 = new ActionRowBuilder();
      const socialMedia = [
        { key: 'instagram_talent', label: 'Instagram', emoji: '📸' },
        { key: 'tiktok', label: 'TikTok', emoji: '🎵' },
        { key: 'x_twitter', label: 'X (Twitter)', emoji: '🐦' },
        { key: 'facebook', label: 'Facebook', emoji: '👥' },
        { key: 'linkedin', label: 'LinkedIn', emoji: '💼' },
        { key: 'card_video', label: 'Watch Video', emoji: '🎥' }
      ];

      for (const social of socialMedia) {
        const url = athlete[social.key];
        if (url && typeof url === 'string' && url.startsWith('http')) {
          const btn = new ButtonBuilder().setLabel(`${social.emoji} ${social.label}`).setStyle(ButtonStyle.Link).setURL(url);
          if (row1.components.length < 5) row1.addComponents(btn);
          else if (row2.components.length < 5) row2.addComponents(btn);
        }
      }

      const components = [row1];
      if (row2.components.length > 0) components.push(row2);

      const introText = `@everyone\n\nIt's time for our **Weekly Athlete Spotlight**! 🚀\nEvery week, we focus on a new rising talent from the Peaxel ecosystem. Discover their journey, achievements, and goals below! 👇`;

      await channel.send({ content: introText, embeds: [embed], components: components });
      updatePresence(client, `Spotlight 🌟`);

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

  // --- 5. COACH ACE RANDOM MOTIVATION ---
  // Runs EVERY HOUR, but Ace only speaks if he "feels like it" (random check inside)
  cron.schedule('0 * * * *', async () => {
    try {
      await sendAceMotivation(client);
    } catch (error) {
      console.error(`${logPrefix} [Motivation] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 6. GIVEAWAY LAUNCH (Saturday 10:00) ---
  cron.schedule('0 10 * * 6', async () => {
    try {
      if (!fs.existsSync('./data')) fs.mkdirSync('./data');
      fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify({ participants: [] }, null, 2));
      const channel = await client.channels.fetch('1369976257047167059');
      const giveawayEmbed = new EmbedBuilder()
        .setTitle('🎟️ WEEKEND GIVEAWAY IS LIVE!')
        .setDescription('Participate now to win a **Rare Athlete Card**!\n\n' +
                        'Click the button below to join. Draw this **Sunday at 20:00**.')
        .setColor('#FACC15');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_giveaway').setLabel('Join Giveaway').setEmoji('🎟️').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: '🎊 **New Giveaway Alert!** @everyone', embeds: [giveawayEmbed], components: [row] });
    } catch (error) {
      console.error(`${logPrefix} [Giveaway Launch] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 7. GIVEAWAY DRAW (Sunday 20:00) ---
  cron.schedule('0 20 * * 0', async () => {
    try {
      if (!fs.existsSync(GIVEAWAY_FILE)) return;
      const data = JSON.parse(fs.readFileSync(GIVEAWAY_FILE, 'utf-8'));
      const channel = await client.channels.fetch('1369976257047167059');

      if (data.participants.length === 0) {
        return await channel.send('😔 **Giveaway Results:** No one participated.');
      }

      const winnerId = data.participants[Math.floor(Math.random() * data.participants.length)];
      const winEmbed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY WINNER!')
        .setDescription(`Congratulations to <@${winnerId}>! You won!\n\n` +
                        `📩 Claim your reward here: <#1369976260066803794>`)
        .setColor('#2ECC71');

      await channel.send({ content: `🎊 **The Giveaway has ended!**`, embeds: [winEmbed] });
      fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify({ participants: [] }, null, 2));
    } catch (error) {
      console.error(`${logPrefix} [Giveaway Draw] Error:`, error.message);
    }
  }, { scheduled: true, timezone });

  // --- 8. HOURLY REFRESH ---
  cron.schedule('0 * * * *', () => updatePresence(client), { scheduled: true, timezone });
}

function getWeekKey() {
  const now = getParisDate();
  return `${now.getFullYear()}-W${getCurrentWeekNumber()}`;
}