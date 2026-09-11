import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { 
  loadReactionsConfig, 
  updateReactionsConfig,
  getDefaultReactionsConfig
} from '../config/reactionsConfig.js';
import { logConfigChange } from '../utils/discordLogger.js';

/**
 * Command to manage automatic reactions for weekly announcements
 * Restricted to Administrators
 */
export const data = new SlashCommandBuilder()
  .setName('reactions')
  .setDescription('Manage automatic reactions on announcements (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('Display current reaction settings')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('toggle')
      .setDescription('Enable or disable automatic reactions')
      .addBooleanOption(option =>
        option
          .setName('enabled')
          .setDescription('Toggle status')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Define emojis to add (space-separated)')
      .addStringOption(option =>
        option
          .setName('emojis')
          .setDescription('Space-separated emojis (e.g., 🎮 🔥 🙌)')
          .setRequired(true)
          .setMaxLength(100)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('Reset to default reaction settings')
  );

/**
 * Execute command logic based on subcommand
 */
export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view':
      await handleView(interaction);
      break;
    case 'toggle':
      await handleToggle(interaction);
      break;
    case 'set':
      await handleSet(interaction);
      break;
    case 'reset':
      await handleReset(interaction);
      break;
  }
}

/**
 * Display current configuration in a clean embed
 */
async function handleView(interaction) {
  const config = loadReactionsConfig();
  
  const embed = new EmbedBuilder()
    .setTitle('🎭 Auto-Reactions Configuration')
    .setColor(config.enabled ? "#a855f7" : "#EF4444")
    .addFields(
      {
        name: '📊 Status',
        value: config.enabled ? '✅ Enabled' : '❌ Disabled',
        inline: true
      },
      {
        name: '🎭 Reactions',
        value: config.reactions.length > 0 ? config.reactions.join(' ') : 'None',
        inline: true
      },
      {
        name: '📝 Total',
        value: `${config.reactions.length} emoji(s)`,
        inline: true
      }
    )
    .setFooter({ text: 'Reactions are added automatically to weekly announcements' });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Toggle the activation state of auto-reactions
 */
async function handleToggle(interaction) {
  const enabled = interaction.options.getBoolean('enabled');
  updateReactionsConfig({ enabled });
  
  await logConfigChange(`Reactions ${enabled ? 'enabled' : 'disabled'}`, interaction.user.tag);

  await interaction.reply({
    content: enabled 
      ? '✅ **Auto-reactions enabled!**'
      : '❌ **Auto-reactions disabled!**',
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Set a custom list of emojis (limit: 5 for UI cleanliness)
 */
async function handleSet(interaction) {
  const emojisInput = interaction.options.getString('emojis');
  const emojis = emojisInput.split(/\s+/).filter(e => e.length > 0);
  
  if (emojis.length === 0) {
    return interaction.reply({ content: '❌ Provide at least one emoji.', flags: MessageFlags.Ephemeral });
  }
  
  if (emojis.length > 5) {
    return interaction.reply({ content: '❌ Maximum 5 reactions allowed for optimal UI.', flags: MessageFlags.Ephemeral });
  }
  
  updateReactionsConfig({ reactions: emojis });
  await logConfigChange(`Reactions set to: ${emojis.join(' ')}`, interaction.user.tag);

  await interaction.reply({
    content: `✅ **Reactions updated!**\nCurrent list: ${emojis.join(' ')}`,
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Revert to default factory settings
 */
async function handleReset(interaction) {
  const defaultConfig = getDefaultReactionsConfig();
  updateReactionsConfig(defaultConfig);
  
  await logConfigChange('Reactions reset to default', interaction.user.tag);

  await interaction.reply({
    content: `🔄 **Reactions reset to default!** (${defaultConfig.reactions.join(' ')})`,
    flags: MessageFlags.Ephemeral
  });
}