import { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync, readFileSync, writeFileSync } from 'fs'; // Ajout de read/write
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

// 1. Setup Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages 
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
      const msg = { content: '❌ Command error.', flags: [MessageFlags.Ephemeral] };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  }
  
  // GESTION DES BOUTONS
  else if (interaction.isButton()) {
    // Bouton de Feedback existant
    if (interaction.customId === 'feedback_button') {
      await handleFeedbackButton(interaction).catch(err => console.error(err));
    }
    
    // NOUVEAU : Bouton de Giveaway Automatique
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
        await interaction.reply({ content: '❌ Database error. Try again later.', flags: [MessageFlags.Ephemeral] });
      }
    }
  }
  
  // GESTION DES MODALS
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
  setupWelcomeListener(client);
  await loadAndRegisterCommands();
  
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error(`${logPrefix} Login failed:`, err.message);
    process.exit(1);
  });
})();