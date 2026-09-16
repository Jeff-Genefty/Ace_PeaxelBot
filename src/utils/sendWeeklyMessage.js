import {
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getCurrentWeekNumber } from './week.js';
import {
  loadMessageConfig,
  getFormattedTitle,
  getFormattedDescription,
  getImageName,
  parseColor,
} from '../config/messageConfig.js';
import { loadReactionsConfig } from '../config/reactionsConfig.js';
import { recordWeeklyPost } from './activityTracker.js';
import { logWeeklyPost } from './discordLogger.js';
import { getChannel, getRole } from './configManager.js';
import { withGameRef, applyGameRefsInText, DISCORD_REFS } from './peaxelLinks.js';

export async function sendWeeklyMessage(client, { isManual = false, type = 'opening' } = {}) {
  const logPrefix = '[Peaxel Send]';

  const channelId = getChannel('announce');
  const ROLE_ID = getRole('verified');

  if (!channelId || !ROLE_ID) {
    console.error(`${logPrefix} Missing announce channel or verified role in config`);
    return false;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return false;

  const now = new Date();
  let weekNumber = getCurrentWeekNumber();
  if (now.getDay() === 0) weekNumber = weekNumber - 1;

  const config = loadMessageConfig();
  const reactionsConfig = loadReactionsConfig();
  const validType = (type === 'opening' || type === 'closing') ? type : 'opening';
  const typeConfig = config[validType];
  const roleMention = `<@&${ROLE_ID}>`;
  const gameRef = validType === 'closing' ? DISCORD_REFS.closing : DISCORD_REFS.opening;

  let finalDescription = applyGameRefsInText(
    getFormattedDescription(weekNumber, validType, roleMention),
    gameRef,
  );

  const imageFileName = getImageName(validType);
  const imagePath = resolve(process.cwd(), `./assets/${imageFileName}`);
  let attachment = null;
  if (existsSync(imagePath)) {
    attachment = new AttachmentBuilder(readFileSync(imagePath), { name: imageFileName });
  }

  let countdownText = '';
  if (validType === 'closing') {
    const deadline = new Date(now);
    const dayDiff = (4 - now.getDay() + 7) % 7;
    deadline.setDate(now.getDate() + dayDiff);
    deadline.setHours(23, 59, 0, 0);
    const unix = Math.floor(deadline.getTime() / 1000);
    countdownText =
      `\n\n⏱️ **Deadline**\n`
      + `> Lineups lock **tonight at 23:59 (Paris)** — <t:${unix}:R>\n`
      + `> Exact time: <t:${unix}:f>`;
  }

  const title = getFormattedTitle(weekNumber, validType);
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(finalDescription + countdownText)
    .setColor(parseColor(typeConfig.color))
    .setTimestamp()
    .setFooter({
      text: typeConfig.footerText || `Peaxel · Gameweek ${weekNumber}`,
    });

  if (attachment) embed.setImage(`attachment://${imageFileName}`);

  const playUrl = withGameRef(typeConfig.playUrl, gameRef);

  const buttons = [];
  if (typeConfig.showPlayButton && playUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel(typeConfig.playButtonLabel || 'Play on Peaxel')
        .setStyle(ButtonStyle.Link)
        .setURL(playUrl),
    );
  }
  if (typeConfig.showLeaderboardButton && typeConfig.leaderboardUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel(typeConfig.leaderboardButtonLabel || 'Leaderboard')
        .setStyle(ButtonStyle.Link)
        .setURL(typeConfig.leaderboardUrl),
    );
  }
  if (typeConfig.showFeedbackButton) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('feedback_button')
        .setLabel('💬 Give Feedback')
        .setStyle(ButtonStyle.Primary),
    );
  }

  const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];

  try {
    const messageOptions = {
      content: roleMention,
      embeds: [embed],
      components,
    };
    if (attachment) messageOptions.files = [attachment];

    const sentMessage = await channel.send(messageOptions);

    if (reactionsConfig.enabled) {
      for (const emoji of reactionsConfig.reactions) {
        await sentMessage.react(emoji).catch(() => null);
      }
    }

    recordWeeklyPost(isManual, weekNumber);
    await logWeeklyPost(isManual, weekNumber, channel.name);

    console.log(`${logPrefix} ✅ Weekly ${validType} sent to #${channel.name}`);
    return true;
  } catch (error) {
    console.error(`${logPrefix} ❌ Send failed:`, error);
    return false;
  }
}
