import { EmbedBuilder } from 'discord.js';
import { getConfig } from './configManager.js';

const logPrefix = '[Peaxel Logger]';
let logChannel = null;

const LOG_LEVELS = {
  info: { color: 0x3B82F6, emoji: 'ℹ️', label: 'INFO' },
  success: { color: 0x22C55E, emoji: '✅', label: 'SUCCESS' },
  warning: { color: 0xF59E0B, emoji: '⚠️', label: 'WARNING' },
  error: { color: 0xEF4444, emoji: '❌', label: 'ERROR' },
  activity: { color: 0x8B5CF6, emoji: '📊', label: 'ACTIVITY' }
};

/**
 * Initialize the Logger
 */
export async function initDiscordLogger(client) {
const config = getConfig();
  const channelId = config.channels?.logs;
  
  if (!channelId) {
    console.log(`${logPrefix} LOG_CHANNEL_ID not set. Discord logging disabled.`);
    return false;
  }
  
  try {
    logChannel = await client.channels.fetch(channelId);
    if (logChannel?.isTextBased()) {
      console.log(`${logPrefix} Discord logging active in: #${logChannel.name}`);
      
      await logToDiscord('info', 'System Online', `Peaxel Bot has successfully started.`, {
        'Node.js': process.version,
        'Servers': client.guilds.cache.size.toString()
      });
      return true;
    }
  } catch (error) {
    console.error(`${logPrefix} Failed to init logger:`, error.message);
    return false;
  }
}

/**
 * Core logging function
 */
export async function logToDiscord(level, title, description, fields = {}) {
  // Console fallback
  console.log(`${logPrefix} [${level.toUpperCase()}] ${title}: ${description}`);
  
  if (!logChannel) return;
  const config = LOG_LEVELS[level] || LOG_LEVELS.info;
  
  try {
    const embed = new EmbedBuilder()
      .setColor(config.color)
      .setTitle(`${config.emoji} ${title}`)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: `Peaxel • ${config.label}` });
    
    const fieldEntries = Object.entries(fields);
    if (fieldEntries.length > 0) {
      embed.addFields(fieldEntries.map(([name, value]) => ({
        name, value: String(value), inline: true
      })));
    }
    
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`${logPrefix} Discord send error:`, err.message);
  }
}

/**
 * Specialized Loggers
 */
export async function logWeeklyPost(isManual, weekNumber, channelName) {
  await logToDiscord('success', 'Announcement Published', `Weekly message for **Week ${weekNumber}** is live.`, {
    'Method': isManual ? 'Manual (/send-weekly-now)' : 'Scheduled',
    'Channel': `#${channelName}`
  });
}

export async function logFeedbackReceived(username, rating) {
  await logToDiscord('activity', 'New Feedback', `User **${username}** submitted a rating.`, {
    'Rating': `${'⭐'.repeat(rating)} (${rating}/5)`
  });
}

export async function logError(context, error) {
  await logToDiscord('error', `Critical Error: ${context}`, `\`\`\`${error.message}\`\`\``, {
    'Location': context
  });
}

export async function logCommandUsage(commandName, username, guildName) {
  await logToDiscord('info', 'Command Executed', `User used **/${commandName}**`, {
    'User': username,
    'Guild': guildName || 'DMs'
  });
}

export async function logConfigChange(setting, username) {
  await logToDiscord('warning', 'Config Modified', `A configuration setting was updated.`, {
    'Target': setting,
    'Admin': username
  });
}