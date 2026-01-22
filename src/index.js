import { Client, GatewayIntentBits, Collection, Events, REST, Routes, ActivityType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
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

// --- CONFIGURATION ---
const PORT = process.env.PORT || 8080;

// --- DATA PATHS ---
const DATA_DIR = resolve('./data');
const UPLOADS_DIR = resolve('./uploads');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const FEEDBACK_FILE = join(DATA_DIR, 'feedbacks.json');
const LIVE_LOGS_FILE = join(DATA_DIR, 'live_logs.json');
const USERS_FILE = join(DATA_DIR, 'users.json');
const GIVEAWAYS_FILE = join(DATA_DIR, 'giveaways.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: 'uploads/' });

// --- COLORS ---
const PRIMARY_PURPLE = '#a855f7';
const NEON_BLUE = '#2dd4bf';

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
let stats = { messagesSent: 0, commandsExecuted: 0, feedbacksReceived: 0, dailyHistory: {} };
if (fs.existsSync(STATS_FILE)) {
    try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch (e) { console.error("Stats load error", e); }
}

const trackEvent = (type) => {
    if (stats[type] !== undefined) {
        stats[type]++;
        const today = new Date().toISOString().split('T')[0];
        if (!stats.dailyHistory) stats.dailyHistory = {};
        stats.dailyHistory[today] = (stats.dailyHistory[today] || 0) + 1;
        writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    }
};

const addLiveLog = (action, detail) => {
    let logs = [];
    if (fs.existsSync(LIVE_LOGS_FILE)) {
        try { logs = JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')); } catch(e) {}
    }
    logs.unshift({ time: new Date().toLocaleTimeString('fr-FR'), action, detail });
    writeFileSync(LIVE_LOGS_FILE, JSON.stringify(logs.slice(0, 15), null, 2));
};

// --- WEB SERVER ---
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'cyber-secret-key',
    resave: true, 
    saveUninitialized: true,
    cookie: { maxAge: 3600000, secure: false }
}));

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// --- ROUTES ---

app.get('/login', (req, res) => {
    res.send(`<html><head><title>Peaxel Auth</title><style>body{font-family:'Inter',sans-serif;background:#050505;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{background:#0f0f15;padding:30px;border-radius:12px;border-top:4px solid ${PRIMARY_PURPLE};width:320px;box-shadow: 0 0 20px rgba(168, 85, 247, 0.2)}input{width:100%;padding:12px;margin:10px 0;background:#1a1a24;border:1px solid #333;color:white;border-radius:6px;box-sizing:border-box}button{width:100%;padding:12px;background:linear-gradient(90deg, ${PRIMARY_PURPLE}, ${NEON_BLUE});border:none;border-radius:6px;font-weight:bold;color:white;cursor:pointer}h2{text-align:center;color:${PRIMARY_PURPLE};letter-spacing:2px}</style></head><body><div class="card"><h2>PEAXEL LOGIN</h2><form action="/login" method="POST"><input type="email" name="email" placeholder="Admin ID" required><input type="password" name="password" placeholder="Passkey" required><button type="submit">INITIALIZE</button></form></div></body></html>`);
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

app.get('/dashboard', isAuthenticated, async (req, res) => {
    // Analytics: Last 7 days
    const dates = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
        counts.push(stats.dailyHistory?.[dateStr] || 0);
    }

    const liveLogs = fs.existsSync(LIVE_LOGS_FILE) ? JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')) : [];
    const currentConfig = getConfig();
    let feedbacks = fs.existsSync(FEEDBACK_FILE) ? JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8')) : [];
    
    // Giveaways Data
    let giveaways = [];
    if (fs.existsSync(GIVEAWAYS_FILE)) {
        try { giveaways = JSON.parse(readFileSync(GIVEAWAYS_FILE, 'utf-8')); } catch(e) {}
    }

    res.send(`
        <html>
            <head>
                <title>Peaxel OS</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: 'Inter', sans-serif; background: #050505; color: #e0e0e0; padding: 20px; margin: 0; }
                    .container { max-width: 1300px; margin: auto; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
                    .card { background: #0f0f15; padding: 20px; border-radius: 12px; border: 1px solid #1a1a24; border-top: 3px solid ${PRIMARY_PURPLE}; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                    h1 { color: ${PRIMARY_PURPLE}; display: flex; justify-content: space-between; align-items: center; }
                    h2 { color: ${NEON_BLUE}; border-bottom: 1px solid #1a1a24; padding-bottom: 10px; font-size: 0.9em; text-transform: uppercase; margin-top:0; }
                    label { font-size: 0.75em; color: #888; display: block; margin-top: 10px; }
                    input, textarea { width: 100%; padding: 10px; margin: 8px 0; background: #1a1a24; border: 1px solid #333; color: white; border-radius: 6px; box-sizing: border-box; }
                    .btn { background: linear-gradient(90deg, ${PRIMARY_PURPLE}, #7c3aed); color: white; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; width: 100%; text-align: center; text-decoration: none; display: block; }
                    .btn-blue { background: linear-gradient(90deg, ${NEON_BLUE}, #0891b2); }
                    .log-box { background: #000; padding: 10px; border-radius: 6px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 0.8em; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; color: ${PRIMARY_PURPLE}; padding: 10px; border-bottom: 1px solid #1a1a24; font-size: 0.8em; }
                    td { padding: 10px; border-bottom: 1px solid #1a1a24; font-size: 0.85em; vertical-align: top; }
                    .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; }
                    .badge-active { background: #166534; color: #fff; }
                    .badge-ended { background: #333; color: #aaa; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚡ PEAXEL OS v2.2 <a href="/logout" style="font-size:0.4em; color:#444; text-decoration:none;">DISCONNECT</a></h1>
                    
                    <div class="grid">
                        <div class="card">
                            <h2>⚙️ Configuration</h2>
                            <form action="/dashboard/save-config" method="POST">
                                <label>Log Channel</label><input type="text" name="logs" value="${currentConfig.channels?.logs || ''}">
                                <label>Announce Channel</label><input type="text" name="announce" value="${currentConfig.channels?.announce || ''}">
                                <label>Welcome Channel</label><input type="text" name="welcome" value="${currentConfig.channels?.welcome || ''}">
                                <label>Spotlight Channel</label><input type="text" name="spotlight" value="${currentConfig.channels?.spotlight || ''}">
                                <label>Feedback Channel</label><input type="text" name="feedback" value="${currentConfig.channels?.feedback || ''}">
                                <button class="btn">Update Matrix</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>🛡️ Moderation Core</h2>
                            <form action="/dashboard/mod-action" method="POST">
                                <input type="text" name="userId" placeholder="Target User ID" required>
                                <input type="text" name="reason" placeholder="Reason for action">
                                <div style="display:flex; gap:10px;">
                                    <button name="action" value="kick" class="btn">Kick</button>
                                    <button name="action" value="ban" class="btn" style="background:#ef4444;">Ban</button>
                                </div>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📣 Cyber Broadcast</h2>
                            <form action="/dashboard/send-announce" method="POST" enctype="multipart/form-data">
                                <label>Channel ID (Frequency)</label>
                                <input type="text" name="chanId" placeholder="Paste Channel ID here" value="${currentConfig.channels?.announce || ''}" required>
                                <textarea name="message" placeholder="Input message data..." rows="3" required></textarea>
                                <label>Broadcast Image</label>
                                <input type="file" name="footerImage">
                                <button class="btn btn-blue">Transmit Signal</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📡 Live Feed</h2>
                            <div class="log-box">${liveLogs.map(l => `<div><span style="color:${NEON_BLUE}">[${l.time}]</span> <b style="color:${PRIMARY_PURPLE}">${l.action}</b>: ${l.detail}</div>`).join('')}</div>
                        </div>
                    </div>

                    <div class="card">
                        <h2>🎁 Giveaway Tracking (Live)</h2>
                        <div style="overflow-x:auto;">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Prize</th>
                                        <th>Status</th>
                                        <th>Count</th>
                                        <th>Registered Managers</th>
                                        <th>Ends At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${giveaways.length > 0 ? giveaways.slice(-5).reverse().map(g => `
                                        <tr>
                                            <td style="font-weight:bold; color:${PRIMARY_PURPLE}">${g.prize}</td>
                                            <td><span class="badge ${g.ended ? 'badge-ended' : 'badge-active'}">${g.ended ? 'ENDED' : 'ACTIVE'}</span></td>
                                            <td>👥 ${g.participants ? g.participants.length : 0}</td>
                                            <td style="font-size:0.75em; max-width: 300px; color:#aaa;">
                                                ${g.participants && g.participants.length > 0 ? g.participants.join(', ') : 'No entries yet'}
                                            </td>
                                            <td style="color:#666; font-size:0.8em;">${new Date(g.endTime).toLocaleString()}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="5" style="text-align:center; padding:20px;">No giveaways found.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <h2 style="border:none; margin:0;">💬 Feedback Vault</h2>
                            <a href="/dashboard/export-feedbacks" class="btn btn-blue" style="width:auto; padding:5px 15px; font-size:0.7em;">DOWNLOAD CSV</a>
                        </div>
                        <div style="overflow-x:auto;">
                            <table>
                                <thead><tr><th>Date</th><th>Manager</th><th>Rating</th><th>Liked</th><th>Improve</th><th>Comment</th></tr></thead>
                                <tbody>${feedbacks.slice(-10).reverse().map(f => `
                                    <tr>
                                        <td style="color:#666; white-space:nowrap;">${f.timestamp ? new Date(f.timestamp).toLocaleDateString() : 'N/A'}</td>
                                        <td>${f.userTag}</td>
                                        <td style="color:${NEON_BLUE}">${f.rating}⭐</td>
                                        <td style="font-size:0.8em;">${f.liked || '-'}</td>
                                        <td style="font-size:0.8em;">${f.improve || '-'}</td>
                                        <td style="font-size:0.8em; color:#aaa;">${f.comment || '-'}</td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card">
                        <h2>📈 Global Traffic (Last 7 Days)</h2>
                        <canvas id="activityChart" height="80"></canvas>
                    </div>
                </div>
                <script>
                    const ctx = document.getElementById('activityChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(dates)},
                            datasets: [{ label: 'Signals', data: ${JSON.stringify(counts)}, borderColor: '${PRIMARY_PURPLE}', backgroundColor: 'rgba(168, 85, 247, 0.1)', tension: 0.4, fill: true }]
                        },
                        options: { 
                            scales: { 
                                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#1a1a24' } }, 
                                x: { grid: { display: false } } 
                            },
                            plugins: { legend: { display: false } }
                        }
                    });
                </script>
            </body>
        </html>
    `);
});

// --- POST & EXPORT ACTIONS ---

app.get('/dashboard/export-feedbacks', isAuthenticated, (req, res) => {
    if (!fs.existsSync(FEEDBACK_FILE)) return res.status(404).send("No feedbacks found.");
    const feedbacks = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8'));
    
    const header = "Date,User,Rating,Liked,Improve,Comment\n";
    const rows = feedbacks.map(f => {
        const date = f.timestamp ? new Date(f.timestamp).toISOString() : '';
        const user = f.userTag || 'Unknown';
        const rating = f.rating || '0';
        const liked = (f.liked || '').replace(/"/g, '""');
        const improve = (f.improve || '').replace(/"/g, '""');
        const comment = (f.comment || '').replace(/"/g, '""');
        return `"${date}","${user}","${rating}","${liked}","${improve}","${comment}"`;
    }).join("\n");
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=peaxel_feedbacks.csv');
    res.status(200).send(header + rows);
});

app.post('/dashboard/mod-action', isAuthenticated, async (req, res) => {
    const { userId, reason, action } = req.body;
    try {
        if (!client.isReady()) throw new Error("Bot is not online.");
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) return res.status(404).send("Error: User not found.");

        const botMember = guild.members.me;
        if (member.roles.highest.position >= botMember.roles.highest.position) {
            return res.status(403).send("Error: Higher hierarchy detected.");
        }

        if (action === 'kick') await member.kick(reason || 'Cyber-kick via Dashboard');
        else if (action === 'ban') await member.ban({ reason: reason || 'Cyber-ban via Dashboard' });

        addLiveLog("MOD", `${action.toUpperCase()}: ${member.user.tag}`);
        res.redirect('/dashboard');
    } catch (e) { 
        res.status(500).send("Critical Mod Error: " + e.message); 
    }
});

app.post('/dashboard/save-config', isAuthenticated, (req, res) => {
    const { logs, announce, welcome, spotlight, feedback } = req.body;
    if (logs) setChannel('logs', logs);
    if (announce) setChannel('announce', announce);
    if (welcome) setChannel('welcome', welcome);
    if (spotlight) setChannel('spotlight', spotlight);
    if (feedback) setChannel('feedback', feedback);
    addLiveLog("CONFIG", "Neural links synchronized");
    res.redirect('/dashboard');
});

// BROADCAST: Text + File (No Embed)
app.post('/dashboard/send-announce', isAuthenticated, upload.single('footerImage'), async (req, res) => {
    const { message, chanId } = req.body;
    const file = req.file;
    try {
        if (!client.isReady()) throw new Error("Bot not connected.");
        const channel = await client.channels.fetch(chanId);
        if (!channel) throw new Error("Channel not found.");

        const payload = { content: message };
        if (file) payload.files = [{ attachment: file.path, name: 'broadcast.png' }];
        
        await channel.send(payload);
        if (file) fs.unlinkSync(file.path);
        
        addLiveLog("BROADCAST", `Signal sent to #${channel.name}`);
        res.redirect('/dashboard');
    } catch (e) { res.status(500).send("Transmission failed: " + e.message); }
});

app.listen(PORT, () => console.log(`${logPrefix} Dashboard active on port ${PORT}`));

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
    } catch (err) { console.error(`${logPrefix} Sync error:`, err.message); }
}

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`${logPrefix} 🚀 Online | ${readyClient.user.tag}`);
    addLiveLog("SYSTEM", "Bot online");
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