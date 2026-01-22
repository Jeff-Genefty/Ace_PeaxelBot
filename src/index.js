import { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags, EmbedBuilder, ActivityType } from 'discord.js';
import { config } from 'dotenv';
import fs, { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import os from 'os';

// Utility Imports
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit, updateFeedbackStatsChannel } from './handlers/feedbackHandler.js';
import { initDiscordLogger, logCommandUsage } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { setupWelcomeListener } from './listeners/welcomeListener.js';
import { handleMessageReward } from './utils/rewardSystem.js';
import { getConfig, setChannel } from './utils/configManager.js'; // Correction: Use setChannel instead of saveConfig
import { getParisDate } from './utils/week.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logPrefix = '[Peaxel Bot]';

// --- DATA PATHS ---
const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const FEEDBACK_FILE = join(DATA_DIR, 'feedbacks.json');
const GIVEAWAY_FILE = join(DATA_DIR, 'giveaways.json');
const LIVE_LOGS_FILE = join(DATA_DIR, 'live_logs.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- ANALYTICS & LOGS ENGINE ---
let stats = { messagesSent: 0, membersJoined: 0, membersLeft: 0, commandsExecuted: 0, feedbacksReceived: 0, dailyHistory: {} };
if (fs.existsSync(STATS_FILE)) {
    try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch (e) { console.error("Stats load error", e); }
}

const trackEvent = (type) => {
    if (stats[type] !== undefined) {
        stats[type]++;
        if (type === 'messagesSent') {
            const today = new Date().toISOString().split('T')[0];
            stats.dailyHistory[today] = (stats.dailyHistory[today] || 0) + 1;
        }
        writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    }
};

const addLiveLog = (action, detail) => {
    let logs = [];
    if (fs.existsSync(LIVE_LOGS_FILE)) logs = JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8'));
    logs.unshift({ time: new Date().toLocaleTimeString('fr-FR'), action, detail });
    writeFileSync(LIVE_LOGS_FILE, JSON.stringify(logs.slice(0, 15), null, 2));
};

// --- WEB DASHBOARD ---
const app = express();
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

app.get('/dashboard', async (req, res) => {
    if (req.query.auth !== 'PEAXEL_ADMIN_2026') return res.status(403).send('Access Denied');

    // Handle CSV Export
    if (req.query.action === 'export_feedback') {
        if (!fs.existsSync(FEEDBACK_FILE)) return res.status(404).send('No file');
        const fbData = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8'));
        const csv = "Date,User,Rating,Comment\n" + fbData.map(f => `"${f.timestamp}","${f.userId}","${f.rating}","${(f.comment || '').replace(/"/g, '""')}"`).join("\n");
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=feedbacks.csv');
        return res.send(csv);
    }

    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const dates = Object.keys(stats.dailyHistory).sort().slice(-7);
    const counts = dates.map(d => stats.dailyHistory[d]);
    const liveLogs = fs.existsSync(LIVE_LOGS_FILE) ? JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')) : [];
    const giveawayCount = fs.existsSync(GIVEAWAY_FILE) ? JSON.parse(readFileSync(GIVEAWAY_FILE, 'utf-8')).participants.length : 0;
    const currentConfig = getConfig();

    res.send(`
        <html>
            <head>
                <title>Peaxel Admin | 2026</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: 'Inter', sans-serif; background: #0b0b0b; color: #e0e0e0; padding: 20px; margin: 0; }
                    .container { max-width: 1200px; margin: auto; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
                    .card { background: #161616; padding: 20px; border-radius: 12px; border-top: 4px solid #FACC15; }
                    h1 { text-align: center; color: #FACC15; }
                    h2 { color: #FACC15; border-bottom: 1px solid #333; padding-bottom: 10px; font-size: 1.1em; }
                    input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; background: #222; border: 1px solid #333; color: white; border-radius: 6px; box-sizing: border-box; }
                    .btn { background: #FACC15; color: #000; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; width: 100%; transition: 0.2s; }
                    .btn:hover { background: #fff; }
                    .btn-red { background: #e74c3c; color: white; }
                    .log-box { background: #000; padding: 10px; border-radius: 6px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 0.85em; }
                    .log-entry { margin-bottom: 5px; border-bottom: 1px solid #111; padding-bottom: 2px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 PEAXEL <span style="color:white">COMMAND CENTER</span></h1>
                    <div style="text-align:center; margin-bottom: 20px; color: #888;">
                        RAM: ${memUsage}MB | Uptime: ${Math.floor(process.uptime()/60)}m | Participants: ${giveawayCount}
                    </div>

                    <div class="grid">
                        <div class="card">
                            <h2>🤖 Bot Presence</h2>
                            <form action="/dashboard/update-status?auth=${req.query.auth}" method="POST">
                                <input type="text" name="statusText" placeholder="Status message...">
                                <select name="statusType">
                                    <option value="Watching">Watching</option>
                                    <option value="Playing">Playing</option>
                                    <option value="Listening">Listening</option>
                                    <option value="Competing">Competing</option>
                                </select>
                                <button class="btn">Update Status</button>
                            </form>
                            <h2 style="margin-top:20px">🛡️ Fast Mod</h2>
                            <form action="/dashboard/mod-action?auth=${req.query.auth}" method="POST">
                                <input type="text" name="targetId" placeholder="User ID">
                                <select name="actionType">
                                    <option value="kick">Kick User</option>
                                    <option value="ban">Ban User</option>
                                </select>
                                <input type="text" name="reason" placeholder="Reason...">
                                <button class="btn btn-red">Execute Action</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📣 Send Announcement</h2>
                            <form action="/dashboard/send-announce?auth=${req.query.auth}" method="POST">
                                <input type="text" name="title" placeholder="Title">
                                <textarea name="message" placeholder="Content..." rows="3"></textarea>
                                <input type="text" name="chanId" value="${currentConfig.channels?.announce || ''}" placeholder="Channel ID">
                                <button class="btn">Ship to Discord</button>
                            </form>
                            <h2 style="margin-top:20px">🎁 Giveaway</h2>
                            <form action="/dashboard/giveaway-tool?auth=${req.query.auth}" method="POST">
                                <button name="tool" value="draw" class="btn" style="margin-bottom:5px">🎲 Draw Random Winner</button>
                                <button name="tool" value="reset" class="btn btn-red">🧹 Reset Participants List</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>⚙️ Configuration Editor</h2>
                            <form action="/dashboard/save-config?auth=${req.query.auth}" method="POST">
                                <label style="font-size:0.8em">Log Channel ID</label>
                                <input type="text" name="logs" value="${currentConfig.channels?.logs || ''}">
                                <label style="font-size:0.8em">Announces Channel ID</label>
                                <input type="text" name="announce" value="${currentConfig.channels?.announce || ''}">
                                <label style="font-size:0.8em">Welcome Channel ID</label>
                                <input type="text" name="welcome" value="${currentConfig.channels?.welcome || ''}">
                                <button class="btn">Save Configuration</button>
                            </form>
                            <a href="/dashboard?auth=${req.query.auth}&action=export_feedback" class="btn" style="margin-top:10px; display:block; text-align:center; text-decoration:none; color:black;">📥 Export Feedbacks CSV</a>
                        </div>

                        <div class="card">
                            <h2>🔍 User Lookup</h2>
                            <form action="/dashboard/user-search?auth=${req.query.auth}" method="POST">
                                <input type="text" name="searchId" placeholder="Discord User ID">
                                <button class="btn">Search Database</button>
                            </form>
                            <h2 style="margin-top:20px">🛰️ Live Logs</h2>
                            <div class="log-box">
                                ${liveLogs.map(l => `<div class="log-entry">
                                    <span style="color:#555">[${l.time}]</span> <b>${l.action}</b>: ${l.detail}
                                </div>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="card" style="margin-top:20px">
                        <h2>📈 Global Message Traffic</h2>
                        <canvas id="activityChart" height="100"></canvas>
                    </div>
                </div>

                <script>
                    const ctx = document.getElementById('activityChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(dates)},
                            datasets: [{ label: 'Messages', data: ${JSON.stringify(counts)}, borderColor: '#FACC15', tension: 0.3, fill: true, backgroundColor: 'rgba(250, 204, 21, 0.05)' }]
                        },
                        options: { scales: { y: { beginAtZero: true, ticks: { color: '#888' } }, x: { ticks: { color: '#888' } } }, plugins: { legend: { display: false } } }
                    });
                </script>
            </body>
        </html>
    `);
});

// --- POST ROUTES ---

app.post('/dashboard/update-status', (req, res) => {
    const { statusText, statusType } = req.body;
    client.user.setActivity(statusText, { type: ActivityType[statusType] });
    addLiveLog("STATUS", `Presence set to ${statusType} ${statusText}`);
    res.redirect(`/dashboard?auth=${req.query.auth}`);
});

app.post('/dashboard/send-announce', async (req, res) => {
    const { title, message, chanId } = req.body;
    try {
        const channel = await client.channels.fetch(chanId);
        const embed = new EmbedBuilder().setTitle(title).setDescription(message).setColor('#FACC15').setTimestamp();
        await channel.send({ embeds: [embed] });
        addLiveLog("ANNOUNCE", `Message sent to ${chanId}`);
        res.redirect(`/dashboard?auth=${req.query.auth}`);
    } catch (e) { res.status(500).send("Error: " + e.message); }
});

app.post('/dashboard/mod-action', async (req, res) => {
    const { targetId, actionType, reason } = req.body;
    try {
        const guild = client.guilds.cache.first();
        const member = await guild.members.fetch(targetId);
        if (actionType === 'kick') await member.kick(reason);
        if (actionType === 'ban') await member.ban({ reason });
        addLiveLog("MOD", `${actionType.toUpperCase()} applied to ${targetId}`);
        res.redirect(`/dashboard?auth=${req.query.auth}`);
    } catch (e) { res.status(500).send("Moderation Error: " + e.message); }
});

app.post('/dashboard/save-config', (req, res) => {
    const { logs, announce, welcome } = req.body;
    
    // Using your setChannel function from configManager.js
    setChannel('logs', logs);
    setChannel('announce', announce);
    setChannel('welcome', welcome);
    
    addLiveLog("CONFIG", "Channel IDs updated via Web Dashboard");
    res.redirect(`/dashboard?auth=${req.query.auth}`);
});

app.post('/dashboard/giveaway-tool', (req, res) => {
    const { tool } = req.body;
    if (tool === 'reset') {
        writeFileSync(GIVEAWAY_FILE, JSON.stringify({ participants: [] }, null, 2));
        addLiveLog("GIVEAWAY", "Participants list wiped clean.");
    } else {
        const data = fs.existsSync(GIVEAWAY_FILE) ? JSON.parse(readFileSync(GIVEAWAY_FILE, 'utf-8')) : { participants: [] };
        if (data.participants.length > 0) {
            const winner = data.participants[Math.floor(Math.random() * data.participants.length)];
            addLiveLog("GIVEAWAY", `Winner drawn: ${winner}`);
        }
    }
    res.redirect(`/dashboard?auth=${req.query.auth}`);
});

app.post('/dashboard/user-search', async (req, res) => {
    const { searchId } = req.body;
    try {
        const user = await client.users.fetch(searchId);
        res.send(`<h3>Result for ${user.tag}</h3><p>ID: ${user.id}</p><p>Bot: ${user.bot}</p><a href="/dashboard?auth=${req.query.auth}">Back</a>`);
    } catch (e) { res.send("User not found. <a href='/dashboard?auth=${req.query.auth}'>Back</a>"); }
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
    } catch (err) { console.error(`${logPrefix} Command sync error:`, err.message); }
}

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`${logPrefix} 🚀 System Online | ${readyClient.user.tag}`);
    addLiveLog("SYSTEM", "Bot started and connected to Discord");
    recordBotStart();
    await initDiscordLogger(readyClient);
    initScheduler(readyClient);
    await updateFeedbackStatsChannel(readyClient);
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.author.bot) trackEvent('messagesSent');
    await handleMessageReward(message);
});

client.on(Events.GuildMemberAdd, async (member) => {
    trackEvent('membersJoined');
    addLiveLog("JOIN", `${member.user.tag} joined the guild`);
    const configData = getConfig();
    const logChannelId = configData.channels?.logs;
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
        if (logChannel) {
            const embed = new EmbedBuilder().setTitle('📥 New Member').setDescription(`<@${member.id}> joined.`).setColor('#2ECC71').setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        trackEvent('commandsExecuted');
        try {
            await command.execute(interaction);
            addLiveLog("COMMAND", `${interaction.user.tag} used /${interaction.commandName}`);
        } catch (error) { console.error(error); }
    } else if (interaction.isButton() && interaction.customId === 'feedback_button') {
        await handleFeedbackButton(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'feedback_modal') {
        trackEvent('feedbacksReceived');
        await handleFeedbackSubmit(interaction);
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