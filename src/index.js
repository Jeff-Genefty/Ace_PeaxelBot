import { Client, GatewayIntentBits, Collection, Events, REST, Routes, ActivityType } from 'discord.js';
import { config } from 'dotenv';
import fs, { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import multer from 'multer';

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
const UPLOADS_DIR = resolve('./uploads');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const FEEDBACK_FILE = join(DATA_DIR, 'feedbacks.json');
const LIVE_LOGS_FILE = join(DATA_DIR, 'live_logs.json');
const USERS_FILE = join(DATA_DIR, 'users.json');
const GIVEAWAY_FILE = join(DATA_DIR, 'giveaways.json'); // File to track active giveaway entries

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: 'uploads/' });

// --- INITIALIZE ADMIN ---
if (!fs.existsSync(USERS_FILE)) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        writeFileSync(USERS_FILE, JSON.stringify([{ email: adminEmail, password: hashedPassword }], null, 2));
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
    resave: true, // Fixed for Railway memory warning
    saveUninitialized: true,
    cookie: { maxAge: 3600000, secure: false } // Set secure: true if using HTTPS
}));

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// --- ROUTES ---

app.get('/login', (req, res) => {
    res.send(`<html><head><title>Peaxel Login</title><style>body{font-family:'Inter',sans-serif;background:#0b0b0b;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{background:#161616;padding:30px;border-radius:12px;border-top:4px solid #FACC15;width:320px}input{width:100%;padding:12px;margin:10px 0;background:#222;border:1px solid #333;color:white;border-radius:6px;box-sizing:border-box}button{width:100%;padding:12px;background:#FACC15;border:none;border-radius:6px;font-weight:bold;cursor:pointer}h2{text-align:center;color:#FACC15}</style></head><body><div class="card"><h2>PEAXEL LOGIN</h2><form action="/login" method="POST"><input type="email" name="email" placeholder="Email" required><input type="password" name="password" placeholder="Password" required><button type="submit">Access Dashboard</button></form></div></body></html>`);
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
    const user = users.find(u => u.email === email);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { email: user.email };
        res.redirect('/dashboard');
    } else res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// NEW: Giveaway Registration Logic (Called by InteractionCreate)
const registerGiveawayEntry = (user) => {
    let entries = [];
    if (fs.existsSync(GIVEAWAY_FILE)) entries = JSON.parse(readFileSync(GIVEAWAY_FILE, 'utf-8'));
    if (!entries.find(e => e.id === user.id)) {
        entries.push({ id: user.id, tag: user.tag, time: new Date().toLocaleString() });
        writeFileSync(GIVEAWAY_FILE, JSON.stringify(entries, null, 2));
        return true;
    }
    return false;
};

app.get('/dashboard', isAuthenticated, async (req, res) => {
    const dates = Object.keys(stats.dailyHistory).sort().slice(-7);
    const counts = dates.map(d => stats.dailyHistory[d]);
    const liveLogs = fs.existsSync(LIVE_LOGS_FILE) ? JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')) : [];
    const currentConfig = getConfig();
    let feedbacks = fs.existsSync(FEEDBACK_FILE) ? JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8')) : [];
    let giveawayEntries = fs.existsSync(GIVEAWAY_FILE) ? JSON.parse(readFileSync(GIVEAWAY_FILE, 'utf-8')) : [];

    // Action: Export Feedback
    if (req.query.action === 'export_feedback') {
        if (feedbacks.length === 0) return res.status(404).send('No data');
        const keys = Object.keys(feedbacks[0]);
        const csvRows = [keys.join(','), ...feedbacks.map(fb => keys.map(k => `"${(fb[k] || '').toString().replace(/"/g, '""')}"`).join(','))];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=feedbacks_export.csv');
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
                    h2 { color: #FACC15; border-bottom: 1px solid #333; padding-bottom: 10px; font-size: 1em; margin-top:0; }
                    input, textarea { width: 100%; padding: 10px; margin: 8px 0; background: #222; border: 1px solid #333; color: white; border-radius: 6px; box-sizing: border-box; }
                    .btn { background: #FACC15; color: #000; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; width: 100%; text-decoration: none; display: inline-block; text-align: center; }
                    .btn-red { background: #ff4444; color: white; }
                    .log-box { background: #000; padding: 10px; border-radius: 6px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 0.8em; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85em; }
                    th { text-align: left; color: #FACC15; border-bottom: 1px solid #333; padding: 10px; }
                    td { padding: 10px; border-bottom: 1px solid #222; }
                    .scroll-table { max-height: 250px; overflow-y: auto; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 PEAXEL COMMAND CENTER <a href="/logout" style="font-size:0.5em; color:#888; text-decoration:none;">LOGOUT</a></h1>
                    <div class="grid">
                        <div class="card">
                            <h2>⚙️ Configuration</h2>
                            <form action="/dashboard/save-config" method="POST">
                                <label>Log Channel</label><input type="text" name="logs" value="${currentConfig.channels?.logs || ''}">
                                <label>Announce Channel</label><input type="text" name="announce" value="${currentConfig.channels?.announce || ''}">
                                <button class="btn">Save Config</button>
                            </form>
                            <hr style="border:0; border-top:1px solid #333; margin:15px 0;">
                            <form action="/dashboard/bot-status" method="POST">
                                <label>Bot Status (Watching...)</label>
                                <input type="text" name="activity" placeholder="Ex: Peaxel Community">
                                <button class="btn">Update Status</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>🛡️ Moderation</h2>
                            <form action="/dashboard/mod-action" method="POST">
                                <input type="text" name="userId" placeholder="User ID" required>
                                <input type="text" name="reason" placeholder="Reason (Optional)">
                                <div style="display:flex; gap:10px;">
                                    <button name="action" value="kick" class="btn">Kick</button>
                                    <button name="action" value="ban" class="btn btn-red">Ban</button>
                                </div>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📣 Quick Announce</h2>
                            <form action="/dashboard/send-announce" method="POST" enctype="multipart/form-data">
                                <textarea name="message" placeholder="Votre message..." rows="3" required></textarea>
                                <input type="text" name="chanId" value="${currentConfig.channels?.announce || ''}">
                                <input type="file" name="footerImage">
                                <button class="btn">Send Broadcast</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📡 Live Logs</h2>
                            <div class="log-box">${liveLogs.map(l => `<div><span style="color:#555">[${l.time}]</span> <b>${l.action}</b>: ${l.detail}</div>`).join('')}</div>
                        </div>
                    </div>

                    <div class="grid">
                        <div class="card">
                            <h2>🎁 Giveaway Entries (${giveawayEntries.length})</h2>
                            <div class="scroll-table">
                                <table>
                                    <thead><tr><th>User ID</th><th>Pseudo</th><th>Joined At</th></tr></thead>
                                    <tbody>${giveawayEntries.map(e => `<tr><td>${e.id}</td><td>${e.tag}</td><td>${e.time}</td></tr>`).join('')}</tbody>
                                </table>
                            </div>
                            <form action="/dashboard/clear-giveaway" method="POST" onsubmit="return confirm('Reset all entries?');">
                                <button class="btn btn-red" style="margin-top:10px;">Reset Giveaway List</button>
                            </form>
                        </div>

                        <div class="card">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <h2>💬 Feedback</h2>
                                <a href="/dashboard?action=export_feedback" class="btn" style="width:auto; padding:5px 10px;">Export CSV</a>
                            </div>
                            <div class="scroll-table">
                                <table>
                                    <thead><tr><th>User</th><th>Rating</th><th>Improve</th></tr></thead>
                                    <tbody>${feedbacks.slice(-10).reverse().map(f => `<tr><td>${f.userTag}</td><td>${f.rating}⭐</td><td>${f.improve || f.comment || '-'}</td></tr>`).join('')}</tbody>
                                </table>
                            </div>
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
                        }
                    });
                </script>
            </body>
        </html>
    `);
});

// --- POST ACTIONS ---

app.post('/dashboard/mod-action', isAuthenticated, async (req, res) => {
    const { userId, reason, action } = req.body;
    try {
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId);
        if (action === 'kick') await member.kick(reason);
        if (action === 'ban') await member.ban({ reason });
        addLiveLog("MOD", `${action.toUpperCase()}: ${member.user.tag}`);
        res.redirect('/dashboard');
    } catch (e) { res.status(500).send("Error: User not found or permission denied."); }
});

app.post('/dashboard/bot-status', isAuthenticated, (req, res) => {
    const { activity } = req.body;
    client.user.setActivity(activity, { type: ActivityType.Watching });
    addLiveLog("SYSTEM", `Status: ${activity}`);
    res.redirect('/dashboard');
});

app.post('/dashboard/clear-giveaway', isAuthenticated, (req, res) => {
    writeFileSync(GIVEAWAY_FILE, JSON.stringify([], null, 2));
    addLiveLog("GIVEAWAY", "Entries list cleared");
    res.redirect('/dashboard');
});

app.post('/dashboard/save-config', isAuthenticated, (req, res) => {
    const { logs, announce, welcome } = req.body;
    setChannel('logs', logs);
    setChannel('announce', announce);
    if (welcome) setChannel('welcome', welcome);
    addLiveLog("CONFIG", "Settings saved");
    res.redirect('/dashboard');
});

app.post('/dashboard/send-announce', isAuthenticated, upload.single('footerImage'), async (req, res) => {
    const { message, chanId } = req.body;
    const file = req.file;
    try {
        const channel = await client.channels.fetch(chanId);
        const payload = { content: message };
        if (file) payload.files = [{ attachment: file.path, name: file.originalname }];
        await channel.send(payload);
        if (file) fs.unlinkSync(file.path);
        addLiveLog("ANNOUNCE", `Broadcast sent to ${chanId}`);
        res.redirect('/dashboard');
    } catch (e) { res.status(500).send("Discord Error: " + e.message); }
});

app.listen(PORT, () => console.log(`${logPrefix} Dashboard live on port ${PORT}`));

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});

client.commands = new Collection();

async function loadAndRegisterCommands() {
    const commandsPath = join(__dirname, 'commands');
    const commandsToRegister = [];
    try {
        if (!fs.existsSync(commandsPath)) return;
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
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) {
            trackEvent('commandsExecuted');
            await command.execute(interaction);
            addLiveLog("COMMAND", `${interaction.user.tag} : /${interaction.commandName}`);
        }
    } 
    // Logic for Giveaway Button
    else if (interaction.isButton() && interaction.customId === 'join_giveaway') {
        const added = registerGiveawayEntry(interaction.user);
        await interaction.reply({ content: added ? "✅ Inscription enregistrée !" : "❌ Tu es déjà inscrit !", ephemeral: true });
        addLiveLog("GIVEAWAY", `${interaction.user.tag} joined`);
    }
    else if (interaction.isButton() && interaction.customId === 'feedback_button') {
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