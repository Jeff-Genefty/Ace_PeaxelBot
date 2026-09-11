import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { 
  loadMessageConfig, 
  updateMessageConfig, 
  resetMessageConfig,
  parseColor
} from '../config/messageConfig.js';

/**
 * Command to dynamically configure weekly announcement embeds for both Opening and Closing.
 * Restricted to Administrators.
 */
export const data = new SlashCommandBuilder()
  .setName('set-weekly-message')
  .setDescription('Configure Peaxel announcement messages (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  // Subcommand: VIEW
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View current configuration for Opening or Closing')
      .addStringOption(option => 
        option.setName('type').setDescription('Select message type').setRequired(true)
        .addChoices({ name: '🚀 Opening', value: 'opening' }, { name: '⚠️ Closing', value: 'closing' })
      )
  )
  // Subcommand: SET (Content)
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Update embed content for a specific message type')
      .addStringOption(option => 
        option.setName('type').setDescription('Message type to update').setRequired(true)
        .addChoices({ name: '🚀 Opening', value: 'opening' }, { name: '⚠️ Closing', value: 'closing' })
      )
      .addStringOption(option => option.setName('title').setDescription('Embed title').setRequired(false).setMaxLength(256))
      .addStringOption(option => option.setName('description').setDescription('Embed description').setRequired(false).setMaxLength(1000))
      .addStringOption(option => option.setName('color').setDescription('Hex color code (e.g., #a855f7)').setRequired(false).setMaxLength(7))
      .addStringOption(option => option.setName('footer').setDescription('Footer text content').setRequired(false).setMaxLength(200))
  )
  // Subcommand: BUTTONS
  .addSubcommand(subcommand =>
    subcommand
      .setName('buttons')
      .setDescription('Configure buttons for a specific message type')
      .addStringOption(option => 
        option.setName('type').setDescription('Message type to update').setRequired(true)
        .addChoices({ name: '🚀 Opening', value: 'opening' }, { name: '⚠️ Closing', value: 'closing' })
      )
      .addStringOption(option => option.setName('play_url').setDescription('URL for Play Now button').setRequired(false))
      .addBooleanOption(option => option.setName('show_play').setDescription('Display Play Now button?').setRequired(false))
      .addBooleanOption(option => option.setName('show_leaderboard').setDescription('Display Leaderboard button?').setRequired(false))
  )
  // Subcommand: RESET
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('Revert a message type to factory defaults')
      .addStringOption(option => 
        option.setName('type').setDescription('Message type to reset').setRequired(true)
        .addChoices({ name: '🚀 Opening', value: 'opening' }, { name: '⚠️ Closing', value: 'closing' })
      )
  );

/**
 * Main execution handler
 */
export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const type = interaction.options.getString('type');

  switch (subcommand) {
    case 'view':
      await handleView(interaction, type);
      break;
    case 'set':
      await handleSet(interaction, type);
      break;
    case 'buttons':
      await handleButtons(interaction, type);
      break;
    case 'reset':
      await handleReset(interaction, type);
      break;
  }
}

/**
 * Displays settings and preview for the selected type (Opening/Closing)
 */
async function handleView(interaction, type) {
  const allConfigs = loadMessageConfig();
  const config = allConfigs[type]; 
  const color = parseColor(config.color);
  
  const previewEmbed = new EmbedBuilder()
    .setTitle(config.title.replace(/{WEEK_NUMBER}/g, '50'))
    .setDescription(config.description.replace(/{WEEK_NUMBER}/g, '50'))
    .setColor(color)
    .setFooter({ text: config.footerText })
    .setTimestamp();

  const configEmbed = new EmbedBuilder()
    .setTitle(`📋 Configuration: ${type.toUpperCase()}`)
    .setColor(color)
    .addFields(
      { name: '📝 Title Template', value: `\`${config.title}\``, inline: false },
      { name: '📄 Description Template', value: `\`${config.description}\``, inline: false },
      { name: '🎨 Theme Color', value: `\`${config.color}\``, inline: true },
      { name: '🔘 Play Button', value: config.showPlayButton ? `✅ Visible` : '❌ Hidden', inline: true },
      { name: '📊 Leaderboard', value: config.showLeaderboardButton ? `✅ Visible` : '❌ Hidden', inline: true }
    );

  await interaction.reply({
    content: `**Preview for ${type.toUpperCase()} (Week 50):**`,
    embeds: [configEmbed, previewEmbed],
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Updates text and color settings for the selected type
 */
async function handleSet(interaction, type) {
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');
  const color = interaction.options.getString('color');
  const footer = interaction.options.getString('footer');

  const updates = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (color) updates.color = color;
  if (footer) updates.footerText = footer;

  if (Object.keys(updates).length === 0) {
    return interaction.reply({ content: '❌ Provide at least one value to update.', flags: MessageFlags.Ephemeral });
  }

  updateMessageConfig(type, updates);

  await interaction.reply({
    content: `✅ **${type.toUpperCase()} message updated successfully!**`,
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Updates button URLs and visibility for the selected type
 */
async function handleButtons(interaction, type) {
  const playUrl = interaction.options.getString('play_url');
  const showPlay = interaction.options.getBoolean('show_play');
  const showLeaderboard = interaction.options.getBoolean('show_leaderboard');

  const updates = {};
  if (playUrl !== null) updates.playUrl = playUrl;
  if (showPlay !== null) updates.showPlayButton = showPlay;
  if (showLeaderboard !== null) updates.showLeaderboardButton = showLeaderboard;

  if (Object.keys(updates).length === 0) {
    return interaction.reply({ content: '❌ No changes detected.', flags: MessageFlags.Ephemeral });
  }

  updateMessageConfig(type, updates);

  await interaction.reply({
    content: `✅ **Button configuration for ${type.toUpperCase()} updated!**`,
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Resets the selected message type to factory defaults
 */
async function handleReset(interaction, type) {
  resetMessageConfig(type);

  await interaction.reply({
    content: `🔄 **${type.toUpperCase()} settings have been reset to default.**`,
    flags: MessageFlags.Ephemeral
  });
}