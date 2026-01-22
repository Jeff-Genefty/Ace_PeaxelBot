import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getNextScheduledRun, getUptime, getGlobalStats, loadActivity } from '../utils/activityTracker.js'; // Added getGlobalStats
import { loadMessageConfig, parseColor } from '../config/messageConfig.js';
import { getCurrentWeekNumber } from '../utils/week.js';
import { getUnpostedAthletesCount } from '../utils/spotlightManager.js';
import { getChannel } from '../utils/configManager.js'; 

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Display bot status, next publication, and recent activity')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const activity = loadActivity();
  const allConfigs = loadMessageConfig();
  const athletesLeft = getUnpostedAthletesCount();
  
  // Fetch synchronized stats (Feedback count + Average)
  const stats = getGlobalStats();
  
  const primaryConfig = allConfigs.opening || allConfigs; 
  const nextRun = getNextScheduledRun(); 
  const currentWeek = getCurrentWeekNumber();
  const uptime = getUptime(activity.botStartedAt);
  
  const channelAnnounce = getChannel('announce');
  const channelWelcome = getChannel('welcome');
  const channelSpotlight = getChannel('spotlight');

  const nextRunTimestamp = Math.floor(nextRun.nextRun.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle('📊 Peaxel Bot Operational Status')
    .setColor(parseColor(primaryConfig.color || '#a855f7'))
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .addFields(
      {
        name: '🤖 System',
        value: `**Status:** 🟢 Online\n**Uptime:** \`${uptime}\`\n**Week:** \`${currentWeek}\``,
        inline: true
      },
      {
        name: '📢 Configured Channels',
        value: `**Main:** ${channelAnnounce ? `<#${channelAnnounce}>` : '`Not Set`'}\n` +
                `**Welcome:** ${channelWelcome ? `<#${channelWelcome}>` : '`Not Set`'}\n` +
                `**Spotlight:** ${channelSpotlight ? `<#${channelSpotlight}>` : '`Not Set`'}`,
        inline: true
      },
      { name: '\u200B', value: '📅 **Publication Schedule**', inline: false },
      {
        name: '⏰ Next Post',
        value: `**Type:** \`${nextRun.label}\`\n<t:${nextRunTimestamp}:F>\n(<t:${nextRunTimestamp}:R>)`,
        inline: true
      },
      {
        name: '📆 Standard Times (Paris)',
        value: '• Mon: 00:00 (**Opening**)\n• Wed: 16:00 (**Spotlight**)\n• Thu: 18:59 (**Closing**)',
        inline: true
      },
      { name: '\u200B', value: '📈 **Performance & Activity**', inline: false },
      {
        name: '📊 Global Stats',
        value: `**Total Posts:** \`${stats.totalPosts}\`\n**Feedback:** \`${stats.feedbackCount}\` (\`${stats.averageRating}/5\` ⭐)`,
        inline: true
      },
      {
        name: '🌟 Spotlight Queue',
        value: `**Remaining:** \`${athletesLeft} athletes\``,
        inline: true
      },
      {
        name: '⏱️ Latency',
        value: `\`${interaction.client.ws.ping}ms\``,
        inline: true
      }
    )
    .setFooter({ text: 'Ace System Monitor • Version 1.2.1' })
    .setTimestamp();

  if (activity.lastError) {
    const errorTime = `<t:${Math.floor(new Date(activity.lastError.timestamp).getTime() / 1000)}:R>`;
    embed.addFields({
      name: '⚠️ Last Known Error',
      value: `\`\`\`${activity.lastError.message}\`\`\nOccurred: ${errorTime}`,
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}