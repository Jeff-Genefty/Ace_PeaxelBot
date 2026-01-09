import { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit, updateFeedbackStatsChannel } from './handlers/feedbackHandler.js'; // Added update import
import { initDiscordLogger, logCommandUsage } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { setupWelcomeListener } from './listeners/welcomeListener.js';
import { handleMessageReward } from './utils/rewardSystem.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Bot]';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

async function loadAndRegisterCommands() {
  const commandsPath = join(__dirname, 'commands');
  const commandsToRegister = [];

  try {
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const commandModule = await import(`file://${filePath}`);
      const command = commandModule.default || commandModule;
      
      if (command && command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commandsToRegister.push(command.data.toJSON());
        console.log(`${logPrefix} Command detected: /${command.data.name}`);
      } else {
        console.warn(`${logPrefix} ⚠️ Failed to load ${file}: missing data or execute.`);
      }
    }
    console.log(`${logPrefix} ✅ ${client.commands.size} commands successfully loaded.`);

    if (process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID) {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      console.log(`${logPrefix} 🔄 Syncing commands with Discord...`);
      
      const route = process.env.DISCORD_GUILD_ID 
        ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
        : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

      await rest.put(route, { body: commandsToRegister });
      console.log(`${logPrefix} ✅ Commands synchronized.`);
    }
  } catch (err) {
    console.error(`${logPrefix} ❌ Error during command loading:`, err.message);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`${logPrefix} 🚀 System Online | ${readyClient.user.tag}`);
  recordBotStart();
  await initDiscordLogger(readyClient);
  initScheduler(readyClient);
  
  // Refresh feedback stats channel on startup
  await updateFeedbackStatsChannel(readyClient);
});

client.on(Events.MessageCreate, async (message) => {
  await handleMessageReward(message);
});

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
      const msg = { content: '❌ Command error.', flags: [MessageFlags.Ephemeral] };
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
    
    else if (interaction.customId === 'join_giveaway') {
      const GIVEAWAY_FILE = './data/giveaways.json';
      try {
        const rawData = readFileSync(GIVEAWAY_FILE, 'utf-8');
        const data = JSON.parse(rawData);

        if (data.participants.includes(interaction.user.id)) {
          return await interaction.reply({ 
            content: '❌ You are already registered for this giveaway!', 
            flags: [MessageFlags.Ephemeral] 
          });
        }

        data.participants.push(interaction.user.id);
        writeFileSync(GIVEAWAY_FILE, JSON.stringify(data, null, 2));

        await interaction.reply({ 
          content: '✅ You have successfully joined the giveaway! Good luck! 🍀', 
          flags: [MessageFlags.Ephemeral] 
        });
      } catch (error) {
        console.error(`${logPrefix} Giveaway Join Error:`, error);
        await interaction.reply({ content: '❌ Database error.', flags: [MessageFlags.Ephemeral] });
      }
    }
  }
  
  else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'feedback_modal') {
      await handleFeedbackSubmit(interaction).catch(err => console.error(err));
    }
  }
});

const shutdown = () => {
  console.log(`${logPrefix} Shutting down...`);
  client.destroy();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

(async () => {
  setupWelcomeListener(client);
  await loadAndRegisterCommands();
  
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error(`${logPrefix} Login failed:`, err.message);
    process.exit(1);
  });
})();