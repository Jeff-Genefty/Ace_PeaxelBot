import { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags, EmbedBuilder } from 'discord.js'; 
import { config } from 'dotenv';
import fs, { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit, updateFeedbackStatsChannel } from './handlers/feedbackHandler.js';
import { initDiscordLogger, logCommandUsage } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { setupWelcomeListener } from './listeners/welcomeListener.js';
import { handleMessageReward } from './utils/rewardSystem.js';
import { getConfig } from './utils/configManager.js'; 

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
      
      if (command?.data && command.execute) {
        client.commands.set(command.data.name, command);
        commandsToRegister.push(command.data.toJSON());
        console.log(`${logPrefix} Command detected: /${command.data.name}`);
      }
    }

    if (process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID) {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      const route = process.env.DISCORD_GUILD_ID 
        ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
        : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

      await rest.put(route, { body: commandsToRegister });
      console.log(`${logPrefix} ✅ Commands synchronized.`);
    }
  } catch (err) {
    console.error(`${logPrefix} ❌ Error loading commands:`, err.message);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`${logPrefix} 🚀 System Online | ${readyClient.user.tag}`);
  recordBotStart();
  await initDiscordLogger(readyClient);
  initScheduler(readyClient);
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
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  }
  
  else if (interaction.isButton()) {
    if (interaction.customId === 'feedback_button') {
      await handleFeedbackButton(interaction).catch(err => console.error(err));
    }
    
else if (interaction.customId === 'join_giveaway') {
    const DATA_DIR = resolve('./data');
    const GIVEAWAY_FILE = join(DATA_DIR, 'giveaways.json');
    
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        let data = { participants: [] };
        if (fs.existsSync(GIVEAWAY_FILE)) {
            data = JSON.parse(readFileSync(GIVEAWAY_FILE, 'utf-8'));
        }

        if (data.participants.includes(interaction.user.id)) {
            return await interaction.reply({ 
                content: '❌ You are already registered for this giveaway!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        data.participants.push(interaction.user.id);
        writeFileSync(GIVEAWAY_FILE, JSON.stringify(data, null, 2));

        // 1. Calculate time remaining until Sunday 20:00 (Paris Time)
        const now = getParisDate(); // Make sure this is imported from ./utils/week.js
        const drawDate = new Date(now);
        drawDate.setDate(now.getDate() + (7 - now.getDay()) % 7); // Move to next Sunday
        drawDate.setHours(20, 0, 0, 0);
        
        // If it's already Sunday after 20:00, it's for next week (safety)
        if (now > drawDate) drawDate.setDate(drawDate.getDate() + 7);
        
        const diffMs = drawDate - now;
        const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

        // 2. Send hype message to General Channel
        const configData = getConfig();
        const generalChannelId = configData.channels?.welcome || '1369976259613954059';
        const generalChannel = await interaction.client.channels.fetch(generalChannelId).catch(() => null);

        if (generalChannel) {
            await generalChannel.send({
                content: `🎟️ **New Entry!** <@${interaction.user.id}> just joined the giveaway!\n` +
                         `👥 **Total participants:** ${data.participants.length}\n` +
                         `⏳ **Time left:** ${diffHours} hours until the draw!`
            });
        }

        // 3. Keep the log in #log (as we did before)
        const logChannelId = configData.channels?.logs;
        if (logChannelId) {
            const logChannel = await interaction.client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🎟️ New Giveaway Entry')
                    .setDescription(`**User:** <@${interaction.user.id}>\n**Total Participants:** ${data.participants.length}`)
                    .setColor('#3498DB')
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

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
  client.destroy();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

(async () => {
  setupWelcomeListener(client);
  await loadAndRegisterCommands();
  client.login(process.env.DISCORD_TOKEN);
})();