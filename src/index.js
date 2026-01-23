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
    // Keeping a bit more history for the scrolling console
    logs.unshift({ time: new Date().toLocaleTimeString('fr-FR'), action, detail });
    writeFileSync(LIVE_LOGS_FILE, JSON.stringify(logs.slice(0, 50), null, 2));
};

// --- DISCORD CLIENT INITIALIZATION ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});
client.commands = new Collection();

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

// API route for live polling
app.get('/api/logs', isAuthenticated, (req, res) => {
    const logs = fs.existsSync(LIVE_LOGS_FILE) ? JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')) : [];
    res.json(logs);
});

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

// Get user info for Moderation Preview
app.get('/api/user/:id', isAuthenticated, async (req, res) => {
    try {
        const user = await client.users.fetch(req.params.id);
        res.json({
            id: user.id,
            tag: user.tag,
            avatar: user.displayAvatarURL({ extension: 'png' })
        });
    } catch (e) { res.status(404).json({ error: "Not found" }); }
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
    const feedbacks = fs.existsSync(FEEDBACK_FILE) ? JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8')) : [];
    const giveaways = fs.existsSync(GIVEAWAYS_FILE) ? JSON.parse(readFileSync(GIVEAWAYS_FILE, 'utf-8')) : [];

    let guildChannels = [];
    if (client.isReady() && process.env.DISCORD_GUILD_ID) {
        try {
            const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID).catch(() => null);
            if (guild) {
                const channels = await guild.channels.fetch();
                guildChannels = channels
                    .filter(c => c && (c.type === 0 || c.type === 5))
                    .map(c => ({ id: c.id, name: c.name, isNews: c.type === 5 }))
                    .sort((a, b) => a.name.localeCompare(b.name));
            }
        } catch (e) { console.error("Dashboard channel fetch error:", e.message); }
    }

    const renderChannelSelect = (name, currentId) => {
        if (guildChannels.length === 0) return `<input type="text" name="${name}" value="${currentId || ''}" placeholder="Guild not synced - Enter ID">`;
        const currentChannel = guildChannels.find(c => c.id === currentId);
        const displayName = currentChannel ? `${currentChannel.isNews ? '📢' : '#'} ${currentChannel.name}` : '';
        const listId = `list-${name}`;
        const options = guildChannels.map(c => `<option value="${c.isNews ? '📢' : '#'} ${c.name}" data-id="${c.id}"></option>`).join('');
        
        return `
            <div class="searchable-select-container">
                <input type="text" class="channel-search-input" list="${listId}" placeholder="Search channel..." value="${displayName}" oninput="updateHiddenId(this, '${name}')" autocomplete="off">
                <input type="hidden" name="${name}" id="hidden-${name}" value="${currentId || ''}">
                <datalist id="${listId}">${options}</datalist>
            </div>`;
    };

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
                    input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; background: #1a1a24; border: 1px solid #333; color: white; border-radius: 6px; box-sizing: border-box; font-family: inherit; }
                    .btn { background: linear-gradient(90deg, ${PRIMARY_PURPLE}, #7c3aed); color: white; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; width: 100%; text-align: center; text-decoration: none; display: block; }
                    .btn-blue { background: linear-gradient(90deg, ${NEON_BLUE}, #0891b2); }
                    
                    /* Railway Terminal Console Style */
                    .terminal-console { grid-column: 1 / -1; background: #08080c; border: 1px solid #1a1a24; border-left: 4px solid ${PRIMARY_PURPLE}; border-radius: 8px; margin-bottom: 25px; box-shadow: inset 0 0 15px rgba(0,0,0,0.8); overflow: hidden; }
                    .console-header { background: #11111b; padding: 8px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a24; font-size: 0.8em; }
                    .console-body { height: 200px; overflow-y: auto; padding: 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.82em; display: flex; flex-direction: column; }
                    .status-dot { height: 8px; width: 8px; background-color: #10b981; border-radius: 50%; display: inline-block; margin-right: 5px; box-shadow: 0 0 8px #10b981; }
                    .log-entry { margin-bottom: 4px; display: flex; gap: 10px; }
                    .log-time { color: #555; }
                    .log-action { font-weight: bold; text-transform: uppercase; min-width: 100px; }
                    .type-SYSTEM { color: #3b82f6; } .type-COMMAND { color: #a855f7; } .type-BROADCAST { color: #2dd4bf; } .type-CONFIG { color: #f59e0b; } .type-MOD { color: #ef4444; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; color: ${PRIMARY_PURPLE}; padding: 10px; border-bottom: 1px solid #1a1a24; font-size: 0.8em; }
                    td { padding: 10px; border-bottom: 1px solid #1a1a24; font-size: 0.85em; vertical-align: top; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚡ PEAXEL OS v2.2 <a href="/logout" style="font-size:0.4em; color:#444; text-decoration:none;">DISCONNECT</a></h1>

                    <div class="terminal-console">
                        <div class="console-header">
                            <span><span class="status-dot"></span> LIVE_SYSTEM_LOGS.EXE</span>
                            <span id="log-counter" style="color: #444;">-- synchronizing</span>
                        </div>
                        <div class="console-body" id="console-output">
                            ${liveLogs.map(l => `
                                <div class="log-entry">
                                    <span class="log-time">[${l.time}]</span>
                                    <span class="log-action type-${l.action}">${l.action}</span>
                                    <span class="log-detail">${l.detail}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="grid">
                        <div class="card">
                            <h2>⚙️ Configuration</h2>
                            <form action="/dashboard/save-config" method="POST">
                                <label>Log Channel</label> ${renderChannelSelect('logs', currentConfig.channels?.logs)}
                                <label>Announce Channel</label> ${renderChannelSelect('announce', currentConfig.channels?.announce)}
                                <label>Welcome Channel</label> ${renderChannelSelect('welcome', currentConfig.channels?.welcome)}
                                <label>Spotlight Channel</label> ${renderChannelSelect('spotlight', currentConfig.channels?.spotlight)}
                                <label>Feedback Channel</label> ${renderChannelSelect('feedback', currentConfig.channels?.feedback)}
                                <button class="btn" style="margin-top:10px;">Update Matrix</button>
                            </form>
                        </div>

                        <div class="card">
    <h2>🛡️ Moderation Core</h2>
    <div style="margin-bottom: 15px; padding: 10px; background: #08080c; border-radius: 6px; border: 1px dashed #333;">
        <label>Target Identity</label>
        <input type="text" id="mod-target-id" placeholder="Discord User ID..." onchange="fetchUserInfo(this.value)">
        <div id="user-preview" style="display:none; align-items:center; gap:10px; margin-top:10px; font-size:0.8em; color:${NEON_BLUE}">
            <img id="user-avatar" src="" style="width:30px; border-radius:50%">
            <span id="user-name"></span>
        </div>
    </div>

    <form action="/dashboard/mod-action" method="POST" id="mod-form">
        <input type="hidden" name="userId" id="hidden-mod-id">
        <input type="text" name="reason" placeholder="Reason for action (required)" required>
        
        <label>Duration (for Timeout)</label>
        <select name="duration">
            <option value="60">1 Hour</option>
            <option value="1440">24 Hours</option>
            <option value="10080">7 Days</option>
        </select>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
            <button name="action" value="timeout" class="btn" style="background:#f59e0b;">Timeout</button>
            <button name="action" value="kick" class="btn">Kick</button>
            <button name="action" value="ban" class="btn" style="background:#ef4444; grid-column: span 2;" onclick="return confirm('EXTERMINATE USER? This action is permanent.')">Ban Database</button>
        </div>
    </form>
</div>

<script>
    // Logic for User Preview
    async function fetchUserInfo(id) {
        if(id.length < 17) return;
        document.getElementById('hidden-mod-id').value = id;
        try {
            const res = await fetch(\`/api/user/\${id}\`);
            const data = await res.json();
            if(data.id) {
                document.getElementById('user-preview').style.display = 'flex';
                document.getElementById('user-avatar').src = data.avatar;
                document.getElementById('user-name').innerText = data.tag;
            }
        } catch(e) {}
    }
</script>

                        <div class="card">
                            <h2>📣 Cyber Broadcast</h2>
                            <form action="/dashboard/send-announce" method="POST" enctype="multipart/form-data">
                                <label>Target Frequency (Channel)</label> ${renderChannelSelect('chanId', currentConfig.channels?.announce)}
                                <textarea name="message" placeholder="Input message data..." rows="3" required></textarea>
                                <label>Broadcast Image</label> <input type="file" name="footerImage">
                                <button class="btn btn-blue">Transmit Signal</button>
                            </form>
                        </div>
                    </div>

                    <div class="grid">
                        <div class="card">
                            <h2>🎁 Active Giveaways</h2>
                            <table>
                                <thead><tr><th>Prize</th><th>End</th><th>Action</th></tr></thead>
                                <tbody>
                                    ${giveaways.length > 0 ? giveaways.map(g => `
                                        <tr>
                                            <td>${g.prize}</td>
                                            <td style="color:#888;">${new Date(g.endTime).toLocaleDateString()}</td>
                                            <td><a href="/dashboard/end-giveaway?id=${g.messageId}" style="color:#ef4444; font-size:0.8em;">TERMINATE</a></td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="3" style="text-align:center; color:#444;">No active data streams</td></tr>'}
                                </tbody>
                            </table>
                        </div>

                        <div class="card">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                <h2 style="border:none; margin:0;">💬 Feedback Vault</h2>
                                <a href="/dashboard/export-feedbacks" class="btn btn-blue" style="width:auto; padding:5px 15px; font-size:0.7em;">CSV</a>
                            </div>
                            <table>
                                <thead><tr><th>User</th><th>Rating</th><th>Comment</th></tr></thead>
                                <tbody>${feedbacks.slice(-5).reverse().map(f => `
                                    <tr>
                                        <td>${f.userTag}</td>
                                        <td style="color:${NEON_BLUE}">${f.rating}⭐</td>
                                        <td style="font-size:0.8em; color:#aaa;">${f.comment ? f.comment.substring(0, 30) + '...' : '-'}</td>
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
                    function updateHiddenId(input, name) {
                        const list = document.getElementById('list-' + name);
                        const hidden = document.getElementById('hidden-' + name);
                        const option = Array.from(list.options).find(o => o.value === input.value);
                        hidden.value = option ? option.dataset.id : input.value;
                    }

                    // Railway Auto-Refresh Logic
                    const consoleOutput = document.getElementById('console-output');
                    async function refreshLogs() {
                        try {
                            const res = await fetch('/api/logs');
                            const logs = await res.json();
                            consoleOutput.innerHTML = logs.map(l => \`
                                <div class="log-entry">
                                    <span class="log-time">[\${l.time}]</span>
                                    <span class="log-action type-\${l.action}">\${l.action}</span>
                                    <span class="log-detail">\${l.detail}</span>
                                </div>
                            \`).join('');
                            document.getElementById('log-counter').innerText = logs.length + ' operations cached';
                        } catch (e) { console.error("Log sync failed"); }
                    }
                    setInterval(refreshLogs, 2000);

                    const ctx = document.getElementById('activityChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(dates)},
                            datasets: [{ label: 'Network Activity', data: ${JSON.stringify(counts)}, borderColor: '${PRIMARY_PURPLE}', backgroundColor: 'rgba(168, 85, 247, 0.1)', tension: 0.4, fill: true }]
                        },
                        options: { scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
                    });
                </script>
            </body>
        </html>
    `);
});

// --- ACTIONS ---

app.get('/dashboard/end-giveaway', isAuthenticated, async (req, res) => {
    const { id } = req.query;
    addLiveLog("GIVEAWAY", `Manual termination requested for ${id}`);
    res.redirect('/dashboard');
});

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
    const { userId, reason, action, duration } = req.body;
    try {
        if (!client.isReady()) throw new Error("Bot offline");
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);

        if (!member) return res.status(404).send("Error: User not in guild.");

        let logMsg = "";
        switch (action) {
            case 'timeout':
                const ms = parseInt(duration) * 60 * 1000;
                await member.timeout(ms, reason || 'Cyber-timeout');
                logMsg = `TIMEOUT: ${member.user.tag} (${duration}m)`;
                break;
            case 'kick':
                await member.kick(reason || 'Cyber-kick');
                logMsg = `KICK: ${member.user.tag}`;
                break;
            case 'ban':
                await member.ban({ reason: reason || 'Cyber-ban' });
                logMsg = `BAN: ${member.user.tag}`;
                break;
        }

        addLiveLog("MOD", logMsg);
        res.redirect('/dashboard');
    } catch (e) { 
        console.error(e);
        res.status(500).send("Mod Error: " + e.message); 
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

app.post('/dashboard/send-announce', isAuthenticated, upload.single('footerImage'), async (req, res) => {
    const { message, chanId } = req.body;
    const file = req.file;
    try {
        const channel = await client.channels.fetch(chanId);
        const payload = { content: message };
        if (file) payload.files = [{ attachment: file.path, name: 'broadcast.png' }];
        await channel.send(payload);
        if (file) fs.unlinkSync(file.path);
        addLiveLog("BROADCAST", `Signal sent to #${channel.name}`);
        res.redirect('/dashboard');
    } catch (e) { res.status(500).send("Transmission failed: " + e.message); }
});

// --- COMMAND LOADER ---
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

// --- EVENTS ---
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

// --- STARTUP ---
(async () => {
    app.listen(PORT, () => console.log(`${logPrefix} Dashboard active on port ${PORT}`));
    setupWelcomeListener(client);
    await loadAndRegisterCommands();
    client.login(process.env.DISCORD_TOKEN);
})();