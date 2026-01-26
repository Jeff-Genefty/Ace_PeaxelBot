import express from 'express';
import fs, { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { getConfig, setChannel } from '../utils/configManager.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// --- DATA PATHS ---
const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const FEEDBACK_FILE = join(DATA_DIR, 'feedbacks.json');
const LIVE_LOGS_FILE = join(DATA_DIR, 'live_logs.json');
const USERS_FILE = join(DATA_DIR, 'users.json');
const GIVEAWAYS_FILE = join(DATA_DIR, 'giveaways.json');

// --- COLORS ---
const PRIMARY_PURPLE = '#a855f7';
const NEON_BLUE = '#2dd4bf';

// --- HELPERS ---
// Helper for logging web actions to the live console
const addLiveLog = (action, detail) => {
    let logs = [];
    if (fs.existsSync(LIVE_LOGS_FILE)) {
        try { logs = JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')); } catch (e) { }
    }
    logs.unshift({ time: new Date().toLocaleTimeString('fr-FR'), action, detail });
    // Keep only the latest 50 logs
    writeFileSync(LIVE_LOGS_FILE, JSON.stringify(logs.slice(0, 50), null, 2));
};

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// --- AUTH ROUTES ---
router.get('/login', (req, res) => {
    res.send(`<html><head><title>Peaxel Auth</title><style>body{font-family:'Inter',sans-serif;background:#050505;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{background:#0f0f15;padding:30px;border-radius:12px;border-top:4px solid ${PRIMARY_PURPLE};width:320px;box-shadow: 0 0 20px rgba(168, 85, 247, 0.2)}input{width:100%;padding:12px;margin:10px 0;background:#1a1a24;border:1px solid #333;color:white;border-radius:6px;box-sizing:border-box}button{width:100%;padding:12px;background:linear-gradient(90deg, ${PRIMARY_PURPLE}, ${NEON_BLUE});border:none;border-radius:6px;font-weight:bold;color:white;cursor:pointer}h2{text-align:center;color:${PRIMARY_PURPLE};letter-spacing:2px}</style></head><body><div class="card"><h2>PEAXEL LOGIN</h2><form action="/login" method="POST"><input type="email" name="email" placeholder="Admin ID" required><input type="password" name="password" placeholder="Passkey" required><button type="submit">INITIALIZE</button></form></div></body></html>`);
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const users = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
        const user = users.find(u => u.email === email);
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = { email: user.email };
            res.redirect('/dashboard');
        } else res.redirect('/login?error=1');
    } catch (e) { res.redirect('/login?error=fs'); }
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// --- API & DASHBOARD ---
router.get('/api/logs', isAuthenticated, (req, res) => {
    const logs = fs.existsSync(LIVE_LOGS_FILE) ? JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')) : [];
    const client = req.app.get('discordClient');
    // Inject bot status into the log response for live UI updates
    res.json({
        logs,
        emergency: !client.isReady() || client.ws.ping > 250,
        ping: client.ws.ping
    });
});

router.get('/api/user/:id', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    try {
        const user = await client.users.fetch(req.params.id);
        res.json({
            id: user.id,
            tag: user.tag,
            avatar: user.displayAvatarURL({ extension: 'png' })
        });
    } catch (e) { res.status(404).json({ error: "Not found" }); }
});

// --- NEW ROUTE: DEEP ANALYTICS ---
router.get('/dashboard/analytics', isAuthenticated, (req, res) => {
    let stats = { history: {} };
    if (fs.existsSync(STATS_FILE)) {
        try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch (e) { }
    }

    const history = stats.history || {};
    const labels = Object.keys(history).sort(); 
    const roleData = labels.map(d => history[d].roleActivity);
    const arrivalData = labels.map(d => history[d].arrivals);
    const memberData = labels.map(d => history[d].totalMembers);

    res.send(`
        <html>
            <head>
                <title>Peaxel Deep Analytics</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    :root { --primary: ${PRIMARY_PURPLE}; --neon: ${NEON_BLUE}; }
                    body { font-family: 'Inter', sans-serif; background: #050505; color: white; padding: 30px; }
                    .card { background: #0f0f15; padding: 20px; border-radius: 12px; border: 1px solid #1a1a24; margin-bottom: 20px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .full { grid-column: span 2; }
                    .btn { color: var(--neon); text-decoration: none; border: 1px solid var(--neon); padding: 8px 15px; border-radius: 4px; font-size: 0.8em; display: inline-block; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <a href="/dashboard" class="btn">← BACK TO TERMINAL</a>
                <h1 style="color:var(--primary)">📊 DEEP-DIVE ANALYTICS</h1>
                <div class="grid">
                    <div class="card full">
                        <h2>Evolution Totale Membres</h2>
                        <canvas id="growthChart" height="100"></canvas>
                    </div>
                    <div class="card">
                        <h2>Taux d'Activité Rôle @i (%)</h2>
                        <canvas id="roleChart"></canvas>
                    </div>
                    <div class="card">
                        <h2>Nouveaux Arrivants (Quotidien)</h2>
                        <canvas id="arrivalChart"></canvas>
                    </div>
                </div>
                <script>
                    const opt = { responsive: true, plugins: { legend: { display: false } } };
                    new Chart(document.getElementById('growthChart'), { type: 'line', data: { labels: ${JSON.stringify(labels)}, datasets: [{ data: ${JSON.stringify(memberData)}, borderColor: '${PRIMARY_PURPLE}', fill: true, backgroundColor: 'rgba(168, 85, 247, 0.1)', tension: 0.3 }] }, options: opt });
                    new Chart(document.getElementById('roleChart'), { type: 'bar', data: { labels: ${JSON.stringify(labels)}, datasets: [{ data: ${JSON.stringify(roleData)}, backgroundColor: '${NEON_BLUE}' }] }, options: opt });
                    new Chart(document.getElementById('arrivalChart'), { type: 'line', data: { labels: ${JSON.stringify(labels)}, datasets: [{ data: ${JSON.stringify(arrivalData)}, borderColor: '#ef4444', tension: 0.3 }] }, options: opt });
                </script>
            </body>
        </html>
    `);
});

router.get('/dashboard', isAuthenticated, async (req, res) => {
    const client = req.app.get('discordClient');
    
    // Perform initial health check for UI styling
    const isEmergency = !client.isReady() || client.ws.ping > 250;

    let stats = { messagesSent: 0, commandsExecuted: 0, feedbacksReceived: 0, dailyHistory: {}, arrivalsToday: 0, dailyActiveRoleUsers: [], history: {} };
    if (fs.existsSync(STATS_FILE)) {
        try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch (e) { }
    }

    const feedbacks = fs.existsSync(FEEDBACK_FILE) ? JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8')) : [];

    // Fetch guild data
    const guildId = process.env.DISCORD_GUILD_ID;
    const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;

    // KPI 1 - Active Pop (Specific Role Activity)
    const targetRoleId = "1371904297498841148"; 
    const roleMembers = guild?.roles.cache.get(targetRoleId)?.members.size || 1;
    const activeToday = stats.dailyActiveRoleUsers?.length || 0;
    const activePopRate = ((activeToday / roleMembers) * 100).toFixed(1);

    // Daily Arrivals
    const arrivalsToday = stats.arrivalsToday || 0;

    // KPI 3 - Weekly Growth (Today vs D-7)
    let weeklyGrowth = "0.0";
    const historyDates = Object.keys(stats.history || {}).sort();
    if (historyDates.length >= 7) {
        const last = stats.history[historyDates[historyDates.length - 1]].totalMembers;
        const first = stats.history[historyDates[historyDates.length - 7]].totalMembers;
        weeklyGrowth = (((last - first) / first) * 100).toFixed(1);
    }

    // Calculate average rating and feedback count
const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((acc, curr) => acc + (curr.rating || 0), 0) / feedbacks.length).toFixed(1) 
    : "0.0";

// Push calculated data into the stats object for the HTML template
stats.averageRating = avgRating;
stats.feedbacksReceived = feedbacks.length;

    // Prepare data for the Activity Chart (Last 7 days)
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

    // Process Giveaway entries
    let giveawayData = { participants: [], participantTags: [] };
    if (fs.existsSync(GIVEAWAYS_FILE)) {
        try { giveawayData = JSON.parse(readFileSync(GIVEAWAYS_FILE, 'utf-8')); } catch (e) { }
    }

    const participants = giveawayData.participants || [];
    const tags = giveawayData.participantTags || [];
    let fullDisplayList = [];
    for (let i = 0; i < participants.length; i++) {
        const userId = participants[i];
        const tag = tags[i];
        if (tag) fullDisplayList.push(tag);
        else {
            const cachedUser = client.users.cache.get(userId);
            fullDisplayList.push(cachedUser ? cachedUser.tag : `Unknown (${userId})`);
        }
    }

    const participantCount = participants.length;
    const participantList = fullDisplayList.length > 0 ? fullDisplayList.join(', ') : "No entries yet";

    // Fetch guild channels for the searchable dropdowns
    let guildChannels = [];
    if (guild) {
        const channels = await guild.channels.fetch();
        guildChannels = channels
            .filter(c => c && (c.type === 0 || c.type === 5))
            .map(c => ({ id: c.id, name: c.name, isNews: c.type === 5 }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Render HTML for the custom searchable channel select
    const renderChannelSelect = (name, currentId) => {
        if (guildChannels.length === 0) return `<input type="text" name="${name}" value="${currentId || ''}" placeholder="Guild not synced">`;
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
                    :root { --primary: ${PRIMARY_PURPLE}; --neon: ${NEON_BLUE}; --alert: #ef4444; }
                    body { font-family: 'Inter', sans-serif; background: #050505; color: #e0e0e0; padding: 20px; margin: 0; transition: background 0.5s ease; }
                    .emergency-mode { background: #1a0505 !important; }
                    .emergency-mode .card { border-top-color: var(--alert) !important; box-shadow: 0 0 15px rgba(239, 68, 68, 0.1); }
                    .emergency-mode h1, .emergency-mode .kpi-value { color: var(--alert) !important; }
                    
                    .container { max-width: 1300px; margin: auto; }
                    .status-bar { display: flex; gap: 10px; margin-bottom: 20px; }
                    .pill { background: #0f0f15; padding: 6px 12px; border-radius: 50px; border: 1px solid #1a1a24; font-size: 0.7em; font-weight: bold; color: #888; display: flex; align-items: center; gap: 6px; }
                    .pill-online { color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
                    .pill-error { color: var(--alert) !important; border-color: var(--alert) !important; animation: pulse 1.5s infinite; }

                    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

                    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
                    .kpi-card { background: #0f0f15; padding: 15px; border-radius: 10px; border: 1px solid #1a1a24; text-align: center; transition: all 0.3s; position: relative; }
                    .kpi-value { display: block; font-size: 1.5em; font-weight: 900; color: white; }
                    .kpi-label { font-size: 0.65em; text-transform: uppercase; color: #555; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 5px; }

                    .info-icon { width: 12px; height: 12px; background: #333; color: #888; border-radius: 50%; font-size: 9px; line-height: 12px; cursor: help; }
                    .info-icon:hover::after {
                        content: attr(data-tip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
                        background: #1a1a24; color: white; padding: 8px; border-radius: 4px; font-size: 11px; width: 160px; z-index: 100;
                        border: 1px solid var(--primary); box-shadow: 0 5px 15px rgba(0,0,0,0.5); text-transform: none;
                    }

                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
                    .card { background: #0f0f15; padding: 20px; border-radius: 12px; border: 1px solid #1a1a24; border-top: 3px solid var(--primary); margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); transition: border 0.5s; }
                    h1 { color: var(--primary); display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;}
                    h2 { color: var(--neon); border-bottom: 1px solid #1a1a24; padding-bottom: 10px; font-size: 0.9em; text-transform: uppercase; margin-top:0; }
                    label { font-size: 0.75em; color: #888; display: block; margin-top: 10px; }
                    input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; background: #1a1a24; border: 1px solid #333; color: white; border-radius: 6px; box-sizing: border-box; }
                    .btn { background: linear-gradient(90deg, var(--primary), #7c3aed); color: white; padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; width: 100%; text-align: center; display: block; text-decoration: none; }
                    .btn-blue { background: linear-gradient(90deg, var(--neon), #0891b2); }
                    .btn-analytics { background: var(--neon); color: black !important; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 0.6em; }
                    
                    .terminal-console { grid-column: 1 / -1; background: #08080c; border: 1px solid #1a1a24; border-left: 4px solid var(--primary); border-radius: 8px; margin-bottom: 25px; overflow: hidden; }
                    .console-header { background: #11111b; padding: 8px 15px; display: flex; justify-content: space-between; align-items: center; font-size: 0.8em; }
                    .console-body { height: 180px; overflow-y: auto; padding: 12px; font-family: monospace; font-size: 0.82em; }
                    .status-dot { height: 8px; width: 8px; background-color: #10b981; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #10b981; }
                    
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 10px; border-bottom: 1px solid #1a1a24; font-size: 0.85em; }
                    .truncate { max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    
                    #modalOverlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:1000; align-items:center; justify-content:center; }
                    .modal { background:#0f0f15; padding:25px; border-radius:12px; border:1px solid var(--primary); width:90%; max-width:500px; }
                    
                    .log-entry { margin-bottom: 4px; display: flex; gap: 10px; }
                    .type-SYSTEM { color: #3b82f6; } .type-COMMAND { color: #a855f7; } .type-BROADCAST { color: #2dd4bf; } .type-CONFIG { color: #f59e0b; } .type-MOD { color: #ef4444; }
                </style>
            </head>
            <body class="${isEmergency ? 'emergency-mode' : ''}">
                <div id="modalOverlay" onclick="closeFocus()">
                    <div class="modal" onclick="event.stopPropagation()">
                        <h2 id="modalTitle">Feedback Details</h2>
                        <p id="modalText" style="line-height:1.6; color:#bbb;"></p>
                        <button class="btn" onclick="closeFocus()">CLOSE VAULT</button>
                    </div>
                </div>

                <div class="container">
                    <h1>⚡ PEAXEL OS v1.1
                        <div>
                            <a href="/analytics" class="btn-analytics">OPEN ANALYTICS</a>
                            <a href="/logout" style="font-size:0.4em; color:#444; text-decoration:none; margin-left:10px;">DISCONNECT</a>
                        </div>
                    </h1>
                    
                    <div class="status-bar">
                        <div id="status-pill" class="pill ${isEmergency ? 'pill-error' : 'pill-online'}">
                            <span id="status-dot" class="status-dot" style="${isEmergency ? 'background:var(--alert); box-shadow:0 0 8px var(--alert);' : ''}"></span> 
                            <span id="status-text">${isEmergency ? 'SYSTEM_CRITICAL' : 'BOT ONLINE'}</span>
                        </div>
                        <div class="pill">👥 ${guild?.memberCount || 0} MEMBERS</div>
                        <div class="pill">📡 <span id="ping-val">${client.ws.ping}</span>ms PING</div>
                    </div>

                    <div class="kpi-row">
                        <div class="kpi-card">
                            <span class="kpi-label">Activité @Verified <span class="info-icon" data-tip="Membres avec le rôle @verified actifs aujourd'hui.">i</span></span>
                            <span class="kpi-value">${activePopRate}%</span>
                        </div>
                        <div class="kpi-card">
                            <span class="kpi-label">Arrivées <span class="info-icon" data-tip="Nouveaux membres ayant rejoint aujourd'hui.">i</span></span>
                            <span class="kpi-value">${arrivalsToday}</span>
                        </div>
                        <div class="kpi-card">
                            <span class="kpi-label">Growth (7d) <span class="info-icon" data-tip="Croissance du nombre de membres sur 7 jours.">i</span></span>
                            <span class="kpi-value" style="color:var(--neon)">${weeklyGrowth >= 0 ? '+' : ''}${weeklyGrowth}%</span>
                        </div>
                    </div>

                    <div class="terminal-console">
                        <div class="console-header">
                            <span><span class="status-dot" id="console-dot"></span> LIVE_SYSTEM_LOGS.EXE</span>
                            <span id="log-counter" style="color: #444;">-- sync</span>
                        </div>
                        <div class="console-body" id="console-output">
                            ${liveLogs.map(l => `<div class="log-entry"><span class="log-time">[${l.time}]</span> <span class="log-action type-${l.action}">${l.action}</span> <span class="log-detail">${l.detail}</span></div>`).join('')}
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
                                <div id="user-preview" style="display:none; align-items:center; gap:10px; margin-top:10px; font-size:0.8em; color:var(--neon)">
                                    <img id="user-avatar" src="" style="width:30px; border-radius:50%">
                                    <span id="user-name"></span>
                                </div>
                            </div>
                            <form action="/dashboard/mod-action" method="POST" id="mod-form">
                                <input type="hidden" name="userId" id="hidden-mod-id">
                                <input type="text" name="reason" placeholder="Reason (required)" required>
                                <label>Duration</label>
                                <select name="duration"><option value="60">1 Hour</option><option value="1440">24 Hours</option><option value="10080">7 Days</option></select>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
                                    <button name="action" value="timeout" class="btn" style="background:#f59e0b;">Timeout</button>
                                    <button name="action" value="kick" class="btn">Kick</button>
                                    <button name="action" value="ban" class="btn" style="background:#ef4444; grid-column: span 2;" onclick="return confirm('EXTERMINATE?')">Ban Database</button>
                                </div>
                            </form>
                        </div>

                        <div class="card">
                            <h2>📣 Cyber Broadcast</h2>
                            <form action="/dashboard/send-announce" method="POST" enctype="multipart/form-data">
                                <label>Target Channel</label> ${renderChannelSelect('chanId', currentConfig.channels?.announce)}
                                <textarea name="message" placeholder="Input message data..." rows="3" required></textarea>
                                <label>Broadcast Image</label> <input type="file" name="footerImage">
                                <button class="btn btn-blue">Transmit Signal</button>
                            </form>
                        </div>
                    </div>

                    <div class="card">
                        <h2>🎁 Giveaway Status</h2>
                        <table>
                            <thead><tr style="text-align:left;"><th style="padding:10px;">Event</th><th>Count</th><th>Participants</th></tr></thead>
                            <tbody><tr><td style="color:var(--neon); font-weight:bold;">Weekend Draw</td><td>${participantCount}</td><td style="font-size:0.8em; color:#aaa;">${participantList}</td></tr></tbody>
                        </table>
                    </div>

                    <div class="card">
    <h2>⭐ Feedbacks</h2>
    <table>
        <thead>
            <tr style="text-align:left;">
                <th style="padding:10px;">Indicateur</th>
                <th>Valeur</th>
                <th style="text-align: right;">Action</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="color:var(--neon); font-weight:bold;">Moyenne Managers</td>
                <td>
                    <span style="color: #fbbf24; font-weight: 800;">${stats.averageRating || '0.0'}</span> 
                    <span style="font-size: 0.8em; color: #555;">/ 5</span>
                </td>
                <td style="text-align: right;">
                    <a href="/feedbacks" class="btn-analytics" style="display: inline-block;">VOIR LE DÉTAIL →</a>
                </td>
            </tr>
            <tr>
                <td style="color:var(--neon); font-weight:bold;">Total Feedbacks</td>
                <td>${stats.feedbacksReceived || 0} reçus</td>
                <td></td>
            </tr>
        </tbody>
    </table>
</div>

                       <div class="card">
                        <h2>📈 Global Traffic</h2>
                        <canvas id="activityChart" height="80"></canvas>
                    </div>
                </div>

                <script>
                    let isEmergencyActive = ${isEmergency};
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

                    function playEmergencyBeep() {
                        if(!isEmergencyActive) return;
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
                        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.5);
                    }

                    function updateHiddenId(input, name) {
                        const list = document.getElementById('list-' + name);
                        const hidden = document.getElementById('hidden-' + name);
                        const option = Array.from(list.options).find(o => o.value === input.value);
                        hidden.value = option ? option.dataset.id : input.value;
                    }

                    function openFocus(user, text) {
                        document.getElementById('modalTitle').innerText = "Feedback: " + user;
                        document.getElementById('modalText').innerText = text;
                        document.getElementById('modalOverlay').style.display = 'flex';
                    }
                    function closeFocus() { document.getElementById('modalOverlay').style.display = 'none'; }

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

                    async function refreshData() {
                        try {
                            const res = await fetch('/api/logs');
                            const data = await res.json();
                            
                            document.getElementById('console-output').innerHTML = data.logs.map(l => \`
                                <div class="log-entry">
                                    <span class="log-time">[\${l.time}]</span>
                                    <span class="log-action type-\${l.action}">\${l.action}</span>
                                    <span class="log-detail">\${l.detail}</span>
                                </div>\`).join('');
                            document.getElementById('log-counter').innerText = data.logs.length + ' cached';
                            document.getElementById('ping-val').innerText = data.ping;

                            isEmergencyActive = data.emergency;
                            if(isEmergencyActive) {
                                document.body.classList.add('emergency-mode');
                                document.getElementById('status-pill').className = 'pill pill-error';
                                document.getElementById('status-text').innerText = 'SYSTEM_CRITICAL';
                                document.getElementById('status-dot').style.background = 'var(--alert)';
                                document.getElementById('status-dot').style.boxShadow = '0 0 8px var(--alert)';
                                playEmergencyBeep();
                            } else {
                                document.body.classList.remove('emergency-mode');
                                document.getElementById('status-pill').className = 'pill pill-online';
                                document.getElementById('status-text').innerText = 'BOT ONLINE';
                                document.getElementById('status-dot').style.background = '#10b981';
                                document.getElementById('status-dot').style.boxShadow = '0 0 8px #10b981';
                            }
                        } catch (e) {
                            document.body.classList.add('emergency-mode');
                        }
                    }
                    setInterval(refreshData, 3000);

                    const ctx = document.getElementById('activityChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(dates)},
                            datasets: [{ label: 'Activity', data: ${JSON.stringify(counts)}, borderColor: '${PRIMARY_PURPLE}', backgroundColor: 'rgba(168, 85, 247, 0.1)', tension: 0.4, fill: true }]
                        },
                        options: { scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
                    });
                </script>
            </body>
        </html>
    `);
});

// --- POST ACTIONS ---
router.post('/dashboard/mod-action', isAuthenticated, async (req, res) => {
    const { userId, reason, action, duration } = req.body;
    const client = req.app.get('discordClient');
    try {
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(404).send("Error: User not in guild.");
        let logMsg = "";
        if (action === 'timeout') {
            await member.timeout(parseInt(duration) * 60 * 1000, reason);
            logMsg = `TIMEOUT: ${member.user.tag} (${duration}m)`;
        } else if (action === 'kick') {
            await member.kick(reason);
            logMsg = `KICK: ${member.user.tag}`;
        } else if (action === 'ban') {
            await member.ban({ reason });
            logMsg = `BAN: ${member.user.tag}`;
        }
        addLiveLog("MOD", logMsg);
        res.redirect('/dashboard');
    } catch (e) { res.status(500).send("Mod Error: " + e.message); }
});

router.post('/dashboard/save-config', isAuthenticated, (req, res) => {
    const { logs, announce, welcome, spotlight, feedback } = req.body;
    if (logs) setChannel('logs', logs);
    if (announce) setChannel('announce', announce);
    if (welcome) setChannel('welcome', welcome);
    if (spotlight) setChannel('spotlight', spotlight);
    if (feedback) setChannel('feedback', feedback);
    addLiveLog("CONFIG", "Neural links synchronized");
    res.redirect('/dashboard');
});

router.post('/dashboard/send-announce', isAuthenticated, upload.single('footerImage'), async (req, res) => {
    const { message, chanId } = req.body;
    const client = req.app.get('discordClient');
    try {
        const channel = await client.channels.fetch(chanId);
        const payload = { content: message };
        if (req.file) payload.files = [{ attachment: req.file.path, name: 'broadcast.png' }];
        await channel.send(payload);
        if (req.file) fs.unlinkSync(req.file.path);
        addLiveLog("BROADCAST", `Signal sent to #${channel.name}`);
        res.redirect('/dashboard');
    } catch (e) { res.status(500).send("Broadcast Error: " + e.message); }
});

export default router;