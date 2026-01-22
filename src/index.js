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
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Pre-load Guild ID

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

// Multer setup for image uploads
const upload = multer({ dest: 'uploads/' });

// --- COLORS ---
const PRIMARY_PURPLE = '#a855f7';
const NEON_BLUE = '#2dd4bf';
const ERROR_RED = '#ef4444';
const SUCCESS_GREEN = '#22c55e';

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

const addLiveLog = (action, detail, type = 'info') => {
    let logs = [];
    if (fs.existsSync(LIVE_LOGS_FILE)) {
        try { logs = JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')); } catch(e) {}
    }
    logs.unshift({ 
        time: new Date().toLocaleTimeString('fr-FR'), 
        action, 
        detail, 
        type 
    });
    writeFileSync(LIVE_LOGS_FILE, JSON.stringify(logs.slice(0, 30), null, 2));
    console.log(`${logPrefix} [${action}] ${detail}`);
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
    let giveaways = fs.existsSync(GIVEAWAYS_FILE) ? JSON.parse(readFileSync(GIVEAWAYS_FILE, 'utf-8')) : [];

    // Fetch all text channels for the broadcast selector
    let textChannels = [];
    if (client.isReady() && GUILD_ID) {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channels = await guild.channels.fetch();
        textChannels = channels.filter(c => c.type === 0); // 0 is GuildText
    }

    const getLogColor = (type) => {
        if (type === 'error') return ERROR_RED;
        if (type === 'success') return SUCCESS_GREEN;
        if (type === 'command') return NEON_BLUE;
        return '#fff';
    };

    res.send(`
        <html>
            <head>
                <title>Peaxel OS</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: 'Inter', sans-serif; background: #050505; color: #e0e0e0; padding: 20px; margin: 0; }
                    .container { max-width: 1400px; margin: auto; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
                    .card { background: #0f0f15; padding: 20px; border-radius: 12px; border: 1px solid #1a1a24; border-top: 3px solid ${PRIMARY_PURPLE}; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                    h1 { color: ${PRIMARY_PURPLE}; display: flex; justify-content: space-between; align-items: center; }
                    h2 { color: ${NEON_BLUE}; border-bottom: 1px solid #1a1a24; padding-bottom: 10px; font-size: 0.9em; text-transform: uppercase; margin-top:0; }
                    label { font-size: 0.75em; color: #888; display: block; margin-top: 10px; }
                    input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; background: #1a1a24; border: 1px solid #333; color: white; border-radius: 6px; box-sizing:border-box; }
                    .btn { background: linear-gradient(90deg, ${PRIMARY_PURPLE}, #7c3aed); color: white; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; width: 100%; text-align: center; text-decoration: none; display: block; }
                    .btn-blue { background: linear-gradient(90deg, ${NEON_BLUE}, #0891b2); }
                    .log-box { background: #000; padding: 15px; border-radius: 8px; height: 350px; overflow-y: auto; font-family: 'Fira Code', monospace; font-size: 0.85em; border: 1px solid #333; }
                    .log-entry { margin-bottom: 5px; border-bottom: 1px solid #111; padding-bottom: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; color: ${PRIMARY_PURPLE}; padding: 10px; border-bottom: 1px solid #1a1a24; font-size: 0.8em; }
                    td { padding: 10px; border-bottom: 1px solid #1a1a24; font-size: 0.85em; }
                    .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; }
                    .badge-active { background: #166534; color: #fff; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚡ PEAXEL OS v2.5 <a href="/logout" style="font-size:0.4em; color:#444; text-decoration:none;">DISCONNECT</a></h1>
                    
                    <div class="grid">
                        <div class="card">
                            <h2>⚙️ Configuration</h2>
                            <form action="/dashboard/save-config" method="POST">
                                <label>Announce Channel ID</label><input type="text" name="announce" value="${currentConfig.channels?.announce || ''}">
                                <label>Feedback Channel ID</label><input type="text" name="feedback" value="${currentConfig.channels?.feedback || ''}">
                                <label>Welcome Channel ID</label><input type="text" name="welcome" value="${currentConfig.channels?.welcome || ''}">
                                <button class="btn">Save Systems</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>🛡️ Moderation & 📣 Broadcast</h2>
                            <form action="/dashboard/mod-action" method="POST">
                                <input type="text" name="userId" placeholder="User ID" required>
                                <div style="display:flex; gap:10px;">
                                    <button name="action" value="kick" class="btn">Kick</button>
                                    <button name="action" value="ban" class="btn" style="background:${ERROR_RED};">Ban</button>
                                </div>
                            </form>
                            <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
                            <form action="/dashboard/send-announce" method="POST" enctype="multipart/form-data">
                                <label>Target Sector</label>
                                <select name="targetChannel">
                                    ${textChannels.map(c => `<option value="${c.id}" ${c.id === currentConfig.channels?.announce ? 'selected' : ''}>#${c.name}</option>`).join('')}
                                </select>
                                <textarea name="message" placeholder="Broadcast message..." rows="3"></textarea>
                                <label>Visual Data (Image)</label>
                                <input type="file" name="image" accept="image/*">
                                <button class="btn btn-blue">Transmit Signal</button>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📡 Console Output</h2>
                            <div class="log-box">
                                ${liveLogs.map(l => `<div class="log-entry"><span style="color:#555">[${l.time}]</span> <b style="color:${getLogColor(l.type)}">${l.action}</b>: ${l.detail}</div>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
                        <div class="card">
                            <h2>🎁 Active Giveaways</h2>
                            <table>
                                <tr><th>Prize</th><th>Status</th><th>Entries</th><th>Ends</th></tr>
                                ${giveaways.slice(-5).reverse().map(g => `
                                    <tr>
                                        <td style="color:${PRIMARY_PURPLE}">${g.prize}</td>
                                        <td><span class="badge ${g.ended ? 'badge-ended' : 'badge-active'}">${g.ended ? 'OFF' : 'LIVE'}</span></td>
                                        <td>${g.participants?.length || 0}</td>
                                        <td>${new Date(g.endTime).toLocaleTimeString()}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                        <div class="card">
                            <h2>📊 Feedback stream</h2>
                            <div style="max-height: 250px; overflow-y:auto;">
                                ${feedbacks.slice(-10).reverse().map(f => `
                                    <div style="font-size:0.8em; padding:10px; background:#000; margin-bottom:5px; border-left:3px solid ${PRIMARY_PURPLE}">
                                        <b>${f.userTag}</b> - ${f.rating}⭐<br>
                                        <span style="color:#aaa">${f.comment || 'N/A'}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <a href="/dashboard/export-feedbacks" class="btn btn-blue" style="margin-top:10px; font-size:0.7em;">Download CSV</a>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `);
});

// --- ACTIONS ---

app.post('/dashboard/mod-action', isAuthenticated, async (req, res) => {
    const { userId, reason, action } = req.body;
    try {
        if (!client.isReady()) throw new Error("Bot Discord offline.");
        if (!GUILD_ID) throw new Error("GUILD_ID is missing in .env");

        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) return res.status(404).send("User not found.");

        if (action === 'kick') await member.kick(reason || 'Cyber-kick via Dashboard');
        else if (action === 'ban') await member.ban({ reason: reason || 'Cyber-ban via Dashboard' });

        addLiveLog("MOD", `${action.toUpperCase()}: ${member.user.tag}`, "success");
        res.redirect('/dashboard');
    } catch (e) { 
        addLiveLog("MOD ERROR", e.message, "error");
        res.status(500).send(e.message); 
    }
});

app.post('/dashboard/send-announce', isAuthenticated, upload.single('image'), async (req, res) => {
    const { message, targetChannel } = req.body;
    try {
        const channel = await client.channels.fetch(targetChannel);
        const options = { content: message || '' };
        
        if (req.file) {
            options.files = [req.file.path];
        }

        await channel.send(options);
        
        // Cleanup file after sending
        if (req.file) fs.unlinkSync(req.file.path);

        addLiveLog("BROADCAST", `Sent to #${channel.name}`, "success");
        res.redirect('/dashboard');
    } catch (e) { 
        addLiveLog("BROADCAST ERROR", e.message, "error");
        res.status(500).send(e.message); 
    }
});

app.post('/dashboard/save-config', isAuthenticated, (req, res) => {
    const { announce, feedback, welcome } = req.body;
    if (announce) setChannel('announce', announce);
    if (feedback) setChannel('feedback', feedback);
    if (welcome) setChannel('welcome', welcome);
    addLiveLog("CONFIG", "Neural links updated", "success");
    res.redirect('/dashboard');
});

app.get('/dashboard/export-feedbacks', isAuthenticated, (req, res) => {
    if (!fs.existsSync(FEEDBACK_FILE)) return res.status(404).send("No data.");
    const feedbacks = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8'));
    const header = "Date,User,Rating,Comment\n";
    const rows = feedbacks.map(f => `"${f.timestamp}","${f.userTag}","${f.rating}","${f.comment || ''}"`).join("\n");
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=feedbacks.csv');
    res.send(header + rows);
});

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions
    ]
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
        const route = GUILD_ID 
            ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID)
            : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
        await rest.put(route, { body: commandsToRegister });
    } catch (err) { console.error(`${logPrefix} Sync error:`, err.message); }
}

client.once(Events.ClientReady, async (readyClient) => {
    addLiveLog("SYSTEM", `Online as ${readyClient.user.tag}`, "success");
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
            addLiveLog("COMMAND", `${interaction.user.tag} used /${interaction.commandName}`, "command");
        }
    } else if (interaction.isButton() && interaction.customId === 'feedback_button') {
        await handleFeedbackButton(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'feedback_modal') {
        trackEvent('feedbacksReceived');
        await handleFeedbackSubmit(interaction);
        addLiveLog("FEEDBACK", `New entry from ${interaction.user.tag}`, "success");
    }
});

// Boot Process
(async () => {
    app.listen(PORT, () => console.log(`${logPrefix} Dashboard active on port ${PORT}`));
    setupWelcomeListener(client);
    await loadAndRegisterCommands();
    client.login(process.env.DISCORD_TOKEN);
})();