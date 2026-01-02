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

/**
 * Sends the Peaxel weekly announcement (Opening or Closing)
 * @param {import('discord.js').Client} client 
 * @param {Object} options 
 */
export async function sendWeeklyMessage(client, { isManual = false, type = 'opening' } = {}) {
  const channelId = process.env.ANNOUNCE_CHANNEL_ID;
  const ROLE_ID = "1369976254685642925"; // @betatester
  const logPrefix = '[Peaxel Send]';

  if (!channelId) {
    console.error(`${logPrefix} Missing ANNOUNCE_CHANNEL_ID`);
    return false;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    console.error(`${logPrefix} Invalid channel: ${channelId}`);
    return false;
  }

  // 1. Load context
  const weekNumber = getCurrentWeekNumber();
  const config = loadMessageConfig();
  const reactionsConfig = loadReactionsConfig();
  const validType = (type === 'opening' || type === 'closing') ? type : 'opening';
  const typeConfig = config[validType]; 

  // 2. Image Handling
  const imageFileName = getImageName(validType);
  const imagePath = resolve(process.cwd(), `./assets/${imageFileName}`);
  let attachment = null;

  if (existsSync(imagePath)) {
    attachment = new AttachmentBuilder(readFileSync(imagePath), { name: imageFileName });
  }

  // 3. Dynamic Countdown for Closing
  let countdownText = "";
  if (validType === 'closing') {
    const now = new Date();
    const deadline = new Date(now);
    // Target: Next Thursday at 23:59
    const dayDiff = (4 - now.getDay() + 7) % 7;
    deadline.setDate(now.getDate() + dayDiff);
    deadline.setHours(23, 59, 0, 0);

    const unix = Math.floor(deadline.getTime() / 1000);
    countdownText = `\n\n⏱️ **TIME REMAINING:**\n> Lineups lock in **<t:${unix}:R>**\n> Deadline: <t:${unix}:f>`;
  }

  // 4. Build Embed
  const embed = new EmbedBuilder()
    .setTitle(getFormattedTitle(weekNumber, validType))
    .setDescription(getFormattedDescription(weekNumber, validType) + countdownText)
    .setColor(parseColor(typeConfig.color))
    .setTimestamp()
    .setFooter({ text: typeConfig.footerText || config.opening.footerText });

  if (attachment) embed.setImage(`attachment://${imageFileName}`);

  // 5. Build Buttons
  const buttons = [];
  if (typeConfig.showPlayButton && typeConfig.playUrl) {
    buttons.push(new ButtonBuilder().setLabel(typeConfig.playButtonLabel).setStyle(ButtonStyle.Link).setURL(typeConfig.playUrl));
  }
  if (typeConfig.showLeaderboardButton && typeConfig.leaderboardUrl) {
    buttons.push(new ButtonBuilder().setLabel(typeConfig.leaderboardButtonLabel).setStyle(ButtonStyle.Link).setURL(typeConfig.leaderboardUrl));
  }
  // Feedback button is usually for opening or general
  if (config.opening.showFeedbackButton || typeConfig.showFeedbackButton) {
     buttons.push(new ButtonBuilder().setCustomId('feedback_button').setLabel("💬 Give Feedback").setStyle(ButtonStyle.Primary));
  }

  const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];

  // 6. Execution
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

    return true;
  } catch (error) {
    console.error(`${logPrefix} Send failed:`, error);
    return false;
  }
}