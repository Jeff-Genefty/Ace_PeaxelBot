import { 
  AttachmentBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
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

/**
 * Sends the Peaxel weekly announcement (Opening or Closing)
 * @param {import('discord.js').Client} client 
 * @param {Object} options 
 */
export async function sendWeeklyMessage(client, { isManual = false, type = 'opening' } = {}) {
  // 1. Dynamic fetch of the announcement channel
  const configDB = getConfig();
  const channelId = configDB.channels.announce || process.env.ANNOUNCE_CHANNEL_ID;
  
  // Professional Role ID Management
  const ROLE_ID = "1369976254685642925"; 
  const logPrefix = '[Peaxel Send]';

  if (!channelId) {
    console.error(`${logPrefix} Missing ANNOUNCE_CHANNEL_ID (DB or Env)`);
    return false;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    console.error(`${logPrefix} Invalid channel: ${channelId}`);
    return false;
  }

  // 2. Load context and fix Sunday offset for display
  const now = new Date();
  let weekNumber = getCurrentWeekNumber();
  
  // SUNDAY FIX: If sending/calculating on Sunday, show the previous week's number
  // specifically for the "Closing" message or "Status"
  if (now.getDay() === 0 && type === 'closing') {
    weekNumber = weekNumber - 1;
  }

  const config = loadMessageConfig();
  const reactionsConfig = loadReactionsConfig();
  const validType = (type === 'opening' || type === 'closing') ? type : 'opening';
  const typeConfig = config[validType]; 

  // 3. Professional "Ace" Message Content
  let finalDescription = "";

  if (validType === 'opening') {
    finalDescription = `Hello <@&${1369976254685642925}>, Ace here! 🎙️ The arena is ready and the registration for **Game Week ${weekNumber}** is officially open.\n\n` +
                       `It’s time to step up and lock in your winning squad!\n\n` +
                       `**Your Action Plan:**\n` +
                       `📋 **Scout:** Analyze your cards and select your top-performing athletes.\n` +
                       `🧠 **Strategize:** Optimize your lineup to dominate the leaderboard.\n` +
                       `🏆 **Earn:** Secure your spot at the top for XP and exclusive rewards.\n\n` +
                       `Good luck, Managers! Let's see those dream teams. 🚀`;
  } else {
    // Standard closing description from your config
    finalDescription = getFormattedDescription(weekNumber, validType);
  }

  // 4. Image Handling
  const imageFileName = getImageName(validType);
  const imagePath = resolve(process.cwd(), `./assets/${imageFileName}`);
  let attachment = null;

  if (existsSync(imagePath)) {
    attachment = new AttachmentBuilder(readFileSync(imagePath), { name: imageFileName });
  }

  // 5. Dynamic Countdown for Closing
  let countdownText = "";
  if (validType === 'closing') {
    const deadline = new Date(now);
    // Target: Thursday at 18:59 (matching your scheduler)
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
      content: `<@&${ROLE_ID}>`, // This triggers the ping
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