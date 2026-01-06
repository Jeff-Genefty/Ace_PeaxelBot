import { Client, GatewayIntentBits, Collection, Events, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit } from './handlers/feedbackHandler.js';
import { initDiscordLogger, logCommandUsage } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { setupWelcomeListener } from './listeners/welcomeListener.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Bot]';

// 1. Setup Client avec les INTENTS nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers, // INDISPENSABLE pour détecter les nouveaux membres
    GatewayIntentBits.GuildMessages // Utile pour la stabilité générale
  ]
});

client.commands = new Collection();

// 2. Command Loader & Auto-Register
async function loadAndRegisterCommands() {
  const commandsPath = join(__dirname, 'commands');
  const commandsToRegister = [];

  try {
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commandsToRegister.push(command.data.toJSON());
      }
    }
    console.log(`${logPrefix} ✅ ${client.commands.size} commands loaded in memory.`);

    if (process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID) {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      console.log(`${logPrefix} 🔄 Syncing commands with Discord...`);
      
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commandsToRegister }
      );
      console.log(`${logPrefix} ✅ Commands synchronized successfully.`);
    }
  } catch (err) {
    console.error(`${logPrefix} ❌ Error during command loading/registration:`, err.message);
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
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  }
  else if (interaction.isButton()) {
    if (interaction.customId === 'feedback_button') {
      await handleFeedbackButton(interaction).catch(err => console.error(err));
    }
  }
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
  // Initialisation du listener AVANT le login
  setupWelcomeListener(client);
  
  await loadAndRegisterCommands();
  
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error(`${logPrefix} Login failed:`, err.message);
    process.exit(1);
  });
})();