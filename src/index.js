import { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags, EmbedBuilder } from 'discord.js'; 
import { config } from 'dotenv';
import fs, { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express'; // Web Framework

// Utility Imports
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit, updateFeedbackStatsChannel } from './handlers/feedbackHandler.js';
import { initDiscordLogger, logCommandUsage } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { setupWelcomeListener } from './listeners/welcomeListener.js';
import { handleMessageReward } from './utils/rewardSystem.js';
import { getConfig } from './utils/configManager.js'; 
import { getParisDate } from './utils/week.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Bot]';

// --- ANALYTICS ENGINE ---
const STATS_FILE = resolve('./data/analytics.json');
const FEEDBACK_FILE = resolve('./data/feedbacks.json'); // To display recent feedbacks

let stats = { 
    messagesSent: 0, 
    membersJoined: 0, 
    membersLeft: 0, 
    commandsExecuted: 0, 
    feedbacksReceived: 0,
    dailyHistory: {} 
};

// Load existing stats from Volume
if (fs.existsSync(STATS_FILE)) {
    try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch (e) {}
}

const trackEvent = (type) => {
    if (stats[type] !== undefined) {
        stats[type]++;
        
        // Specifically track daily message volume
        if (type === 'messagesSent') {
            const today = new Date().toISOString().split('T')[0];
            stats.dailyHistory[today] = (stats.dailyHistory[today] || 0) + 1;
        }
        
        if (!fs.existsSync(resolve('./data'))) fs.mkdirSync(resolve('./data'));
        writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    }
};

// --- WEB DASHBOARD ---
const app = express(); // Define express app
const PORT = process.env.PORT || 3000;

app.get('/dashboard', (req, res) => {
    if (req.query.auth !== 'PEAXEL_ADMIN_2026') return res.status(403).send('Access Denied');

    // Prepare chart data (Last 7 days)
    const dates = Object.keys(stats.dailyHistory).sort().slice(-7);
    const counts = dates.map(d => stats.dailyHistory[d]);

    // Retrieve recent feedbacks
    let recentFeedbacks = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
        try {
            const fbData = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8'));
            recentFeedbacks = fbData.slice(-5).reverse(); // Get last 5
        } catch (e) {}
    }

    res.send(`
        <html>
            <head>
                <title>Peaxel Staff Analytics</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; background: #0b0b0b; color: white; padding: 20px; }
                    .stats-container { display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; flex-wrap: wrap; }
                    .card { background: #161616; padding: 15px; border-radius: 10px; border-bottom: 3px solid #FACC15; min-width: 140px; text-align: center; }
                    .value { font-size: 2em; font-weight: bold; display: block; }
                    .label { color: #888; font-size: 0.8em; text-transform: uppercase; }
                    .main-content { max-width: 900px; margin: 0 auto; }
                    .section { background: #161616; padding: 20px; border-radius: 15px; margin-bottom: 20px; }
                    h1 { text-align: center; color: #FACC15; }
                    h2 { color: #FACC15; border-bottom: 1px solid #333; padding-bottom: 10px; }
                    .fb-item { background: #222; padding: 10px; border-radius: 5px; margin-bottom: 10px; border-left: 3px solid #FACC15; }
                    .fb-meta { font-size: 0.8em; color: #888; }
                </style>
            </head>
            <body>
                <h1>🚀 PEAXEL PROJECT ANALYTICS</h1>
                
                <div class="stats-container">
                    <div class="card"><span class="value">${stats.messagesSent}</span><span class="label">Messages</span></div>
                    <div class="card"><span class="value">${stats.membersJoined}</span><span class="label">Joins</span></div>
                    <div class="card"><span class="value">${stats.commandsExecuted}</span><span class="label">Commands</span></div>
                    <div class="card"><span class="value">${stats.feedbacksReceived}</span><span class="label">Feedbacks</span></div>
                </div>

                <div class="main-content">
                    <div class="section">
                        <h2>Activity Chart (Last 7 Days)</h2>
                        <canvas id="activityChart"></canvas>
                    </div>

                    <div class="section">
                        <h2>Recent Feedbacks</h2>
                        ${recentFeedbacks.length > 0 ? recentFeedbacks.map(f => `
                            <div class="fb-item">
                                <div>${f.comment || 'No comment'}</div>
                                <div class="fb-meta">Rating: ${f.rating}/5 • User ID: ${f.userId}</div>
                            </div>
                        `).join('') : '<p>No feedbacks recorded yet.</p>'}
                    </div>
                </div>

                <script>
                    const ctx = document.getElementById('activityChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(dates)},
                            datasets: [{
                                label: 'Messages Sent',
                                data: ${JSON.stringify(counts)},
                                borderColor: '#FACC15',
                                backgroundColor: 'rgba(250, 204, 21, 0.1)',
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff'} },
                                x: { grid: { color: '#333' }, ticks: { color: '#fff'} }
                            },
                            plugins: { legend: { labels: { color: 'white' } } }
                        }
                    });
                </script>
            </body>
        </html>
    `);
});

app.listen(PORT, () => console.log(`${logPrefix} [Web] Dashboard live on port ${PORT}`));

// --- DISCORD CLIENT ---
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
      }
    }
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const route = process.env.DISCORD_GUILD_ID 
      ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
      : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
    await rest.put(route, { body: commandsToRegister });
    console.log(`${logPrefix} ✅ Commands synchronized.`);
  } catch (err) { console.error(`${logPrefix} ❌ Command error:`, err.message); }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`${logPrefix} 🚀 System Online | ${readyClient.user.tag}`);
  recordBotStart();
  await initDiscordLogger(readyClient);
  initScheduler(readyClient);
  await updateFeedbackStatsChannel(readyClient);
});

// --- LISTENERS ---
client.on(Events.MessageCreate, async (message) => {
  if (!message.author.bot) trackEvent('messagesSent');
  await handleMessageReward(message);
});

client.on(Events.GuildMemberAdd, async (member) => {
  trackEvent('membersJoined');
  const configData = getConfig();
  const logChannel = await client.channels.fetch(configData.channels?.logs).catch(() => null);
  if (logChannel) {
      const embed = new EmbedBuilder()
          .setTitle('📥 New Member')
          .setDescription(`<@${member.id}> joined the community.\nTotal members: **${member.guild.memberCount}**`)
          .setColor('#2ECC71').setTimestamp();
      await logChannel.send({ embeds: [embed] });
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  trackEvent('membersLeft');
  const configData = getConfig();
  const logChannel = await client.channels.fetch(configData.channels?.logs).catch(() => null);
  if (logChannel) {
      const embed = new EmbedBuilder()
          .setTitle('📤 Member Left')
          .setDescription(`<@${member.id}> (${member.user.tag}) left.`)
          .setColor('#E74C3C').setTimestamp();
      await logChannel.send({ embeds: [embed] });
  }
});

client.on(Events.MessageDelete, async (message) => {
    if (message.author?.bot) return;
    const configData = getConfig();
    const logChannel = await client.channels.fetch(configData.channels?.logs).catch(() => null);
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message Deleted')
            .addFields(
                { name: 'Author', value: `<@${message.author?.id}>`, inline: true },
                { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                { name: 'Content', value: message.content || '*No text content*' }
            )
            .setColor('#F39C12').setTimestamp();
        await logChannel.send({ embeds: [embed] });
    }
});

// --- INTERACTIONS ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    trackEvent('commandsExecuted');
    try {
      await command.execute(interaction);
      if (!['status', 'ping'].includes(interaction.commandName)) {
        await logCommandUsage(interaction.commandName, interaction.user.tag, interaction.guild?.name);
      }
    } catch (error) {
      console.error(`${logPrefix} Error:`, error);
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
            if (fs.existsSync(GIVEAWAY_FILE)) data = JSON.parse(readFileSync(GIVEAWAY_FILE, 'utf-8'));

            if (data.participants.includes(interaction.user.id)) {
                return await interaction.reply({ content: '❌ Already registered!', flags: [MessageFlags.Ephemeral] });
            }

            data.participants.push(interaction.user.id);
            writeFileSync(GIVEAWAY_FILE, JSON.stringify(data, null, 2));

            const now = getParisDate();
            const drawDate = new Date(now);
            drawDate.setDate(now.getDate() + (7 - now.getDay()) % 7);
            drawDate.setHours(20, 0, 0, 0);
            if (now > drawDate) drawDate.setDate(drawDate.getDate() + 7);
            const diffHours = Math.max(0, Math.floor((drawDate - now) / 3600000));

            const configData = getConfig();
            const genChan = await interaction.client.channels.fetch(configData.channels?.welcome || '1369976259613954059').catch(() => null);
            if (genChan) {
                await genChan.send({ content: `🎟️ **New Entry!** <@${interaction.user.id}> joined!\n👥 **Total:** ${data.participants.length} | ⏳ **Remaining:** ${diffHours}h` });
            }
            await interaction.reply({ content: '✅ Joined!', flags: [MessageFlags.Ephemeral] });
        } catch (error) { await interaction.reply({ content: '❌ Error.', flags: [MessageFlags.Ephemeral] }); }
    }
  }
  
  else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'feedback_modal') {
      trackEvent('feedbacksReceived');
      await handleFeedbackSubmit(interaction).catch(err => console.error(err));
    }
  }
});

const shutdown = () => { client.destroy(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

(async () => {
  setupWelcomeListener(client);
  await loadAndRegisterCommands();
  client.login(process.env.DISCORD_TOKEN);
})();