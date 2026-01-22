import { Client, GatewayIntentBits, Collection, Events, REST, Routes, EmbedBuilder, ActivityType } from 'discord.js';
import { config } from 'dotenv';
import fs, { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';

// Utility Imports
import { initScheduler } from './scheduler.js';
import { handleFeedbackButton, handleFeedbackSubmit, updateFeedbackStatsChannel } from './handlers/feedbackHandler.js';
import { initDiscordLogger } from './utils/discordLogger.js';
import { recordBotStart } from './utils/activityTracker.js';
import { setupWelcomeListener } from './listeners/welcomeListener.js';
import { handleMessageReward } from './utils/rewardSystem.js';
import { getConfig, setChannel } from './utils/configManager.js';

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
const USERS_FILE = join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- INITIALIZE ADMIN (Secure version) ---
if (!fs.existsSync(USERS_FILE)) {
    console.log(`${logPrefix} Creating initial admin user...`);
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const initialUser = [{ email: adminEmail, password: hashedPassword }];
        writeFileSync(USERS_FILE, JSON.stringify(initialUser, null, 2));
        console.log(`${logPrefix} Admin user created from .env config.`);
    } else {
        console.error(`${logPrefix} CRITICAL: ADMIN_EMAIL or ADMIN_PASSWORD not found in .env`);
    }
}

// --- ANALYTICS ENGINE ---
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

// --- WEB SERVER ---
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

const PORT = process.env.PORT || 3000;

// Middleware Auth
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// --- ROUTES ---

app.get('/login', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Peaxel Login</title>
                <style>
                    body { font-family: 'Inter', sans-serif; background: #0b0b0b; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #161616; padding: 30px; border-radius: 12px; border-top: 4px solid #FACC15; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    input { width: 100%; padding: 12px; margin: 10px 0; background: #222; border: 1px solid #333; color: white; border-radius: 6px; box-sizing: border-box; }
                    button { width: 100%; padding: 12px; background: #FACC15; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.3s; }
                    button:hover { background: #fff; }
                    h2 { text-align: center; color: #FACC15; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>PEAXEL LOGIN</h2>
                    <form action="/login" method="POST">
                        <input type="email" name="email" placeholder="Email" required>
                        <input type="password" name="password" placeholder="Password" required>
                        <button type="submit">Access Dashboard</button>
                    </form>
                    ${req.query.error ? '<p style="color:#ff4444; font-size:0.8em; text-align:center;">Email or password incorrect</p>' : ''}
                </div>
            </body>
        </html>
    `);
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
    const user = users.find(u => u.email === email);

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { email: user.email };
        res.redirect('/dashboard');
    } else {
        res.redirect('/login?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const dates = Object.keys(stats.dailyHistory).sort().slice(-7);
    const counts = dates.map(d => stats.dailyHistory[d]);
    const liveLogs = fs.existsSync(LIVE_LOGS_FILE) ? JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')) : [];
    const currentConfig = getConfig();
    
    // Feedback Logic
    let feedbacks = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
        feedbacks = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8'));
    }

    // CSV Export Logic
    if (req.query.action === 'export_feedback') {
        if (feedbacks.length === 0) return res.status(404).send('No data');
        const keys = Object.keys(feedbacks[0]);
        const csvRows = [];
        csvRows.push(keys.join(',')); // Header
        for (const fb of feedbacks) {
            const values = keys.map(key => {
                const val = fb[key] || '';
                return `"${val.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=feedbacks_full.csv');
        return res.send(csvRows.join('\n'));
    }

    res.send(`
        <html>
            <head>
                <title>Peaxel Admin</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: 'Inter', sans-serif; background: #0b0b0b; color: #e0e0e0; padding: 20px; margin: 0; }
                    .container { max-width: 1300px; margin: auto; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
                    .card { background: #161616; padding: 20px; border-radius: 12px; border-top: 4px solid #FACC15; margin-bottom: 20px; }
                    h1 { color: #FACC15; display: flex; justify-content: space-between; align-items: center; }
                    h2 { color: #FACC15; border-bottom: 1px solid #333; padding-bottom: 10px; font-size: 1em; }
                    input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; background: #222; border: 1px solid #333; color: white; border-radius: 6px; }
                    .btn { background: #FACC15; color: #000; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; width: 100%; text-decoration: none; display: inline-block; text-align: center; }
                    .btn-red { background: #e74c3c; color: white; }
                    .log-box { background: #000; padding: 10px; border-radius: 6px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 0.8em; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85em; }
                    th { text-align: left; color: #FACC15; border-bottom: 1px solid #333; padding: 10px; }
                    td { padding: 10px; border-bottom: 1px solid #222; }
                    .logout { font-size: 0.5em; background: #222; color: #888; padding: 5px 10px; border-radius: 4px; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>
                        🚀 PEAXEL COMMAND CENTER 
                        <a href="/logout" class="logout">LOGOUT</a>
                    </h1>

                    <div class="grid">
                        <div class="card">
                            <h2>⚙️ Configuration</h2>
                            <form action="/dashboard/save-config" method="POST">
                                <label>Log Channel</label><input type="text" name="logs" value="${currentConfig.channels?.logs || ''}">
                                <label>Welcome Channel</label><input type="text" name="welcome" value="${currentConfig.channels?.welcome || ''}">
                                <label>Announce Channel</label><input type="text" name="announce" value="${currentConfig.channels?.announce || ''}">
                                <button class="btn">Save Configuration</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📡 Live Monitoring</h2>
                            <div class="log-box">
                                ${liveLogs.map(l => `<div><span style="color:#555">[${l.time}]</span> <b>${l.action}</b>: ${l.detail}</div>`).join('')}
                            </div>
                            <h2 style="margin-top:15px">📣 Quick Announce</h2>
                            <form action="/dashboard/send-announce" method="POST">
                                <input type="text" name="title" placeholder="Title">
                                <textarea name="message" placeholder="Message..." rows="2"></textarea>
                                <input type="text" name="chanId" value="${currentConfig.channels?.announce || ''}">
                                <button class="btn">Broadcast</button>
                            </form>
                        </div>
                    </div>

                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h2>💬 Feedback Vault (Full Data)</h2>
                            <a href="/dashboard?action=export_feedback" class="btn" style="width:auto; padding: 5px 15px;">📥 Download CSV</a>
                        </div>
                        <div style="overflow-x: auto;">
                            <table>
                                <thead>
                                    <tr>
                                        ${feedbacks.length > 0 ? Object.keys(feedbacks[0]).map(k => `<th>${k.toUpperCase()}</th>`).join('') : '<th>No Feedbacks</th>'}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${feedbacks.map(f => `
                                        <tr>
                                            ${Object.values(f).map(v => `<td>${v || '-'}</td>`).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card">
                        <h2>📈 Global Traffic</h2>
                        <canvas id="activityChart" height="80"></canvas>
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
                        options: { scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
                    });
                </script>
            </body>
        </html>
    `);
});

// --- POST ACTIONS ---

app.post('/dashboard/save-config', isAuthenticated, (req, res) => {
    const { logs, announce, welcome } = req.body;
    setChannel('logs', logs);
    setChannel('announce', announce);
    setChannel('welcome', welcome);
    addLiveLog("CONFIG", "Updated channel settings");
    res.redirect('/dashboard');
});

app.post('/dashboard/send-announce', isAuthenticated, async (req, res) => {
    const { title, message, chanId } = req.body;
    try {
        const channel = await client.channels.fetch(chanId);
        const embed = new EmbedBuilder().setTitle(title).setDescription(message).setColor('#FACC15').setTimestamp();
        await channel.send({ embeds: [embed] });
        addLiveLog("ANNOUNCE", `Sent to ${chanId}`);
        res.redirect('/dashboard');
    } catch (e) { res.status(500).send(e.message); }
});

app.listen(PORT, () => console.log(`${logPrefix} Dashboard live on port ${PORT}`));

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
    console.log(`${logPrefix} 🚀 Online | ${readyClient.user.tag}`);
    addLiveLog("SYSTEM", "Bot connection established");
    recordBotStart();
    await initDiscordLogger(readyClient);
    initScheduler(readyClient);
    await updateFeedbackStatsChannel(readyClient);
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.author.bot) trackEvent('messagesSent');
    await handleMessageReward(message);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        trackEvent('commandsExecuted');
        try {
            await command.execute(interaction);
            addLiveLog("COMMAND", `${interaction.user.tag} : /${interaction.commandName}`);
        } catch (error) { console.error(error); }
    } else if (interaction.isButton() && interaction.customId === 'feedback_button') {
        await handleFeedbackButton(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'feedback_modal') {
        trackEvent('feedbacksReceived');
        await handleFeedbackSubmit(interaction);
    }
});

(async () => {
    setupWelcomeListener(client);
    await loadAndRegisterCommands();
    client.login(process.env.DISCORD_TOKEN);
})();