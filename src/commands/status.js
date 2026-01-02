import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { loadActivity, getNextScheduledRun, getUptime } from '../utils/activityTracker.js';
import { loadMessageConfig, parseColor } from '../config/messageConfig.js';
import { getCurrentWeekNumber } from '../utils/week.js';
import { getUnpostedAthletesCount } from '../utils/spotlightManager.js'; // Importation nécessaire

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Display bot status, next publication, and recent activity')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator); // Sécurité Admin

export async function execute(interaction) {
  const activity = loadActivity();
  const allConfigs = loadMessageConfig();
  const athletesLeft = getUnpostedAthletesCount(); // Nouvelle stat
  
  const primaryConfig = allConfigs.opening || allConfigs; 
  const nextRun = getNextScheduledRun();
  const currentWeek = getCurrentWeekNumber();
  const uptime = getUptime(activity.botStartedAt);
  
  const lastScheduled = activity.lastWeeklyPost 
    ? `<t:${Math.floor(new Date(activity.lastWeeklyPost).getTime() / 1000)}:R>` 
    : '`Never`';
  
  const nextRunTimestamp = Math.floor(nextRun.nextRun.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle('📊 Peaxel Bot Operational Status')
    .setColor(parseColor(primaryConfig.color || '#FACC15'))
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .addFields(
      {
        name: '🤖 System',
        value: `**Status:** 🟢 Online\n**Uptime:** \`${uptime}\`\n**Week:** \`${currentWeek}\``,
        inline: true
      },
      {
        name: '📢 Channels',
        value: `**Main:** <#${process.env.ANNOUNCE_CHANNEL_ID}>\n**Spotlight:** <#${process.env.SPOTLIGHT_CHANNEL_ID || '1369976259613954059'}>`,
        inline: true
      },
      { name: '\u200B', value: '📅 **Publication Schedule**', inline: false },
      {
        name: '⏰ Next Post',
        value: `<t:${nextRunTimestamp}:F>\n(<t:${nextRunTimestamp}:R>)`,
        inline: true
      },
      {
        name: '📆 Standard Times (Paris)',
        value: '• Mon: 00:00 (Open)\n• Wed: 16:00 (Spotlight)\n• Thu: 18:59 (Close)',
        inline: true
      },
      { name: '\u200B', value: '📈 **Performance & Activity**', inline: false },
      {
        name: '📊 Global Stats',
        value: `**Total Posts:** \`${activity.totalPostsSent}\`\n**Feedback:** \`${activity.totalFeedbackReceived}\``,
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
    .setFooter({ text: 'Ace System Monitor • Version 1.1.0' })
    .setTimestamp();

  if (activity.lastError) {
    const errorTime = `<t:${Math.floor(new Date(activity.lastError.timestamp).getTime() / 1000)}:R>`;
    embed.addFields({
      name: '⚠️ Last Known Error',
      value: `\`\`\`${activity.lastError.message}\`\`\`\nOccurred: ${errorTime}`,
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}