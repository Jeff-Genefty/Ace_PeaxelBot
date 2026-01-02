import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit } from './handlers/feedbackHandler.js';
import { initDiscordLogger, logCommandUsage } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Bot]';

// 1. Setup Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions
  ]
});

client.commands = new Collection();

// 2. Command Loader
async function loadCommands() {
  const commandsPath = join(__dirname, 'commands');
  try {
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
      }
    }
    console.log(`${logPrefix} ✅ ${client.commands.size} commands loaded.`);
  } catch (err) {
    console.error(`${logPrefix} Error loading commands:`, err.message);
  }
}

// 3. Ready Event
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`${logPrefix} 🚀 System Online | ${readyClient.user.tag}`);
  
  recordBotStart();
  await initDiscordLogger(readyClient);
  initScheduler(readyClient);
});

// 4. Interaction Router
client.on(Events.InteractionCreate, async (interaction) => {
  // --- Slash Commands ---
  if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
      if (!['status', 'ping'].includes(interaction.commandName)) {
        await logCommandUsage(interaction.commandName, interaction.user.tag, interaction.guild?.name);
      }
    } catch (error) {
      console.error(`${logPrefix} Error in /${interaction.commandName}:`, error);
      const msg = { content: '❌ Command error.', ephemeral: true };
      interaction.replied || interaction.deferred ? await interaction.followUp(msg) : await interaction.reply(msg);
    }
  }

  // --- Buttons ---
  else if (interaction.isButton()) {
    if (interaction.customId === 'feedback_button') {
      await handleFeedbackButton(interaction).catch(err => console.error(err));
    }
  }

  // --- Modals ---
  else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'feedback_modal') {
      await handleFeedbackSubmit(interaction).catch(err => console.error(err));
    }
  }
});

// 5. Graceful Shutdown
const shutdown = () => {
  console.log(`${logPrefix} Shutting down...`);
  client.destroy();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 6. Start
(async () => {
  await loadCommands();
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error(`${logPrefix} Login failed:`, err.message);
    process.exit(1);
  });
})();