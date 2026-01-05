import { 
  AttachmentBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { getCurrentWeekNumber } from './week.js';
import { 
  loadMessageConfig, 
  getFormattedTitle, 
  getFormattedDescription,
  getImageName,
  parseColor 
} from '../config/messageConfig.js';
import { loadReactionsConfig } from '../config/reactionsConfig.js';
import { recordWeeklyPost } from './activityTracker.js';
import { logWeeklyPost } from './discordLogger.js';
import { getConfig } from './configManager.js';

// ES Modules helpers for paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Sends the Peaxel weekly announcement (Opening or Closing)
 * @param {import('discord.js').Client} client 
 * @param {Object} options 
 */
export async function sendWeeklyMessage(client, { isManual = false, type = 'opening' } = {}) {
  const logPrefix = '[Peaxel Send]';
  
  // 1. Dynamic fetch of the announcement channel
  const configDB = getConfig();
  const channelId = configDB.channels.announce || process.env.ANNOUNCE_CHANNEL_ID;
  
  // Role ID for pings (@betatester or Manager role)
  const ROLE_ID = "1369976254685642925"; 

  if (!channelId) {
    console.error(`${logPrefix} Missing ANNOUNCE_CHANNEL_ID (DB or Env)`);
    return false;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    console.error(`${logPrefix} Invalid channel: ${channelId}`);
    return false;
  }

  // 2. Load context and handle Sunday date logic
  const now = new Date();
  let weekNumber = getCurrentWeekNumber();
  
  // SUNDAY FIX: If it's Sunday, we are still closing/referencing the "current" week
  if (now.getDay() === 0) {
    weekNumber = weekNumber - 1;
  }

  const config = loadMessageConfig();
  const reactionsConfig = loadReactionsConfig();
  const validType = (type === 'opening' || type === 'closing') ? type : 'opening';
  const typeConfig = config[validType]; 

  // 3. Professional "Ace" Message Content
  let finalDescription = "";

  if (validType === 'opening') {
    finalDescription = `Hello <@&${ROLE_ID}>, Ace here! 🎙️ The arena is ready and the registration for **Game Week ${weekNumber}** is officially open.\n\n` +
                       `It’s time to step up and lock in your winning squad!\n\n` +
                       `**Your Action Plan:**\n` +
                       `📋 **Scout:** Analyze your cards and select your top-performing athletes.\n` +
                       `🧠 **Strategize:** Optimize your lineup to dominate the leaderboard.\n` +
                       `🏆 **Earn:** Secure your spot at the top for XP and exclusive rewards.\n\n` +
                       `Good luck, Managers! Let's see those dream teams. 🚀`;
  } else {
    finalDescription = `Hello <@&${ROLE_ID}>, Ace here! 📢 Attention Managers, the clock is ticking for **Game Week ${weekNumber}**!\n\n` +
                       `The stadium gates are about to close. This is your final chance to finalize your strategy before the matches begin.\n\n` +
                       `**Final Check:**\n` +
                       `✅ **Review:** Ensure your best athletes are in the starting lineup.\n` +
                       `⚔️ **Challenge:** Double-check your captain selection for maximum points.\n` +
                       `🔒 **Lock:** Submit your team before the deadline hits!`;
  }

  // 4. Image Handling (Corrected path for Railway)
  const imageFileName = getImageName(validType);
  // Path logic: From src/utils, go up twice to reach root, then into assets/
  const imagePath = resolve(__dirname, '../../assets', imageFileName);
  
  let attachment = null;
  if (existsSync(imagePath)) {
    attachment = new AttachmentBuilder(imagePath, { name: imageFileName });
    console.log(`${logPrefix} ✅ Image found: ${imageFileName}`);
  } else {
    console.error(`${logPrefix} ❌ Image NOT found at: ${imagePath}`);
  }

  // 5. Dynamic Countdown for Closing
  let countdownText = "";
  if (validType === 'closing') {
    const deadline = new Date(now);
    // Target: Next (or current) Thursday at 18:59
    const dayDiff = (4 - now.getDay() + 7) % 7;
    deadline.setDate(now.getDate() + dayDiff);
    deadline.setHours(18, 59, 0, 0);

    const unix = Math.floor(deadline.getTime() / 1000);
    countdownText = `\n\n⏱️ **TIME REMAINING:**\n> Lineups lock in **<t:${unix}:R>**\n> Deadline: <t:${unix}:f>`;
  }

  // 6. Build Embed
  const embed = new EmbedBuilder()
    .setTitle(`ACE NOTIFICATION | GW #${weekNumber} ${validType.toUpperCase()} IS NOW LIVE`)
    .setDescription(finalDescription + countdownText)
    .setColor(parseColor(typeConfig.color))
    .setTimestamp()
    .setFooter({ text: `Peaxel • Game Week ${weekNumber}` });

  if (attachment) embed.setImage(`attachment://${imageFileName}`);

  // 7. Build Buttons
  const buttons = [];
  if (typeConfig.showPlayButton && typeConfig.playUrl) {
    buttons.push(new ButtonBuilder().setLabel(typeConfig.playButtonLabel).setStyle(ButtonStyle.Link).setURL(typeConfig.playUrl));
  }
  if (typeConfig.showLeaderboardButton && typeConfig.leaderboardUrl) {
    buttons.push(new ButtonBuilder().setLabel(typeConfig.leaderboardButtonLabel).setStyle(ButtonStyle.Link).setURL(typeConfig.leaderboardUrl));
  }
  if (config.opening.showFeedbackButton || typeConfig.showFeedbackButton) {
     buttons.push(new ButtonBuilder().setCustomId('feedback_button').setLabel("💬 Give Feedback").setStyle(ButtonStyle.Primary));
  }

  const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];

  // 8. Execution
  try {
    const messageOptions = { 
      content: `<@&${ROLE_ID}>`, 
      embeds: [embed], 
      components 
    };
    if (attachment) messageOptions.files = [attachment];

    const sentMessage = await channel.send(messageOptions);

    // Add reactions
    if (reactionsConfig.enabled) {
      for (const emoji of reactionsConfig.reactions) {
        await sentMessage.react(emoji).catch(() => null);
      }
    }

    // Analytics & Logging
    recordWeeklyPost(isManual, weekNumber);
    await logWeeklyPost(isManual, weekNumber, channel.name);

    console.log(`${logPrefix} ✅ Weekly ${type} successfully sent to #${channel.name}`);
    return true;
  } catch (error) {
    console.error(`${logPrefix} ❌ Send failed:`, error);
    return false;
  }
}