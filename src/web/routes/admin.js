import express from 'express';
import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { pageShell, escapeHtml } from '../utils/render.js';
import { adminSidebar } from '../utils/adminLayout.js';
import { requireAdmin, requireAdminApi } from '../middleware/auth.js';
import { adminUrl } from '../services/adminPath.js';
import { gatherAdminStats } from '../services/statsService.js';
import { getConfig, setChannel } from '../../utils/configManager.js';
import { updateJsonSync } from '../../utils/jsonStore.js';
import {
    csrfInput, createLoginCsrfToken, loginCsrfInput,
    setLoginCsrfCookie, validateCsrf, validateLoginCsrf, initSessionCsrf,
} from '../../utils/csrf.js';
import { loginRateLimit, recordFailedLogin, clearLoginAttempts } from '../../utils/loginRateLimit.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');
const LIVE_LOGS_FILE = join(DATA_DIR, 'live_logs.json');
const USERS_FILE = join(DATA_DIR, 'users.json');

const addLiveLog = (action, detail) => {
    updateJsonSync(LIVE_LOGS_FILE, [], (logs) => {
        logs.unshift({ time: new Date().toLocaleTimeString('fr-FR'), action, detail });
        return logs.slice(0, 50);
    });
};

function renderChannelSelect(name, currentId, guildChannels) {
    if (!guildChannels.length) {
        return `<input type="text" name="${name}" value="${escapeHtml(currentId || '')}" placeholder="Channel ID">`;
    }
    const current = guildChannels.find(c => c.id === currentId);
    const displayName = current ? `${current.isNews ? '📢' : '#'} ${current.name}` : '';
    const listId = `list-${name}`;
    const options = guildChannels.map(c =>
        `<option value="${c.isNews ? '📢' : '#'} ${escapeHtml(c.name)}" data-id="${c.id}"></option>`
    ).join('');
    return `
        <input type="text" class="channel-search-input" list="${listId}" placeholder="Rechercher..." value="${escapeHtml(displayName)}" oninput="updateHiddenId(this,'${name}')" autocomplete="off">
        <input type="hidden" name="${name}" id="hidden-${name}" value="${escapeHtml(currentId || '')}">
        <datalist id="${listId}">${options}</datalist>`;
}

// ─── Auth ───
router.get('/login', (req, res) => {
    if (req.session.admin) return res.redirect(adminUrl('/'));
    const isProd = process.env.NODE_ENV === 'production';
    const token = createLoginCsrfToken();
    setLoginCsrfCookie(res, token, isProd);
    const csrf = loginCsrfInput(token);
    const error = req.query.error === '1' ? '<div class="alert alert-error">Identifiants incorrects.</div>' : '';
    const body = `
    <div class="login-page">
        <div class="login-card">
            <div class="login-brand">
                <img src="/img/favicon.ico" alt="Peaxel">
                <h1>PEAXEL CONSOLE</h1>
                <p class="subtitle">Accès staff · non indexé</p>
            </div>
            ${error}
            <form action="${adminUrl('/login')}" method="POST">
                ${csrf}
                <label>Email admin</label>
                <input type="email" name="email" required autocomplete="username">
                <label>Mot de passe</label>
                <input type="password" name="password" required autocomplete="current-password">
                <button type="submit" class="btn btn-primary btn-block" style="margin-top:1.25rem;">Connexion sécurisée</button>
            </form>
        </div>
    </div>`;
    res.send(pageShell({ title: 'Staff Login — Peaxel', body, bodyClass: 'login-page', includeNav: false }));
});

router.post('/login', loginRateLimit, validateLoginCsrf, async (req, res) => {
    const { email, password } = req.body;
    try {
        const users = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
        const user = users.find(u => u.email === email);
        if (user && await bcrypt.compare(password, user.password)) {
            clearLoginAttempts(req);
            initSessionCsrf(req.session);
            req.session.admin = { email: user.email };
            return req.session.save((err) => {
                if (err) return res.status(500).send('Erreur session');
                res.redirect(adminUrl('/'));
            });
        }
        recordFailedLogin(req);
        res.redirect(`${adminUrl('/login')}?error=1`);
    } catch {
        recordFailedLogin(req);
        res.redirect(`${adminUrl('/login')}?error=fs`);
    }
});

router.get('/logout', (req, res) => {
    delete req.session.admin;
    req.session.save(() => res.redirect(adminUrl('/login')));
});

// ─── API ───
router.get('/api/logs', requireAdminApi, (req, res) => {
    const logs = fs.existsSync(LIVE_LOGS_FILE) ? JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')) : [];
    const client = req.app.get('discordClient');
    res.json({ logs, emergency: !client.isReady() || client.ws.ping > 250, ping: client.ws.ping });
});

router.get('/api/user/:id', requireAdminApi, async (req, res) => {
    try {
        const user = await req.app.get('discordClient').users.fetch(req.params.id);
        res.json({ id: user.id, tag: user.tag, avatar: user.displayAvatarURL({ extension: 'png' }) });
    } catch { res.status(404).json({ error: 'Not found' }); }
});

// ─── Dashboard ───
router.get('/', requireAdmin, async (req, res) => {
    const client = req.app.get('discordClient');
    const data = await gatherAdminStats(client);
    const csrf = csrfInput(req.session);
    const base = adminUrl('');
    const currentConfig = getConfig();

    let guildChannels = [];
    if (data.guild) {
        const channels = await data.guild.channels.fetch();
        guildChannels = channels.filter(c => c && (c.type === 0 || c.type === 5))
            .map(c => ({ id: c.id, name: c.name, isNews: c.type === 5 }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    const body = `
    <div class="admin-body ${data.isEmergency ? 'emergency-mode' : ''}" data-logs-api="${base}/api/logs" data-admin-base="${base}">
        ${adminSidebar('', base)}
        <main class="admin-main">
            <div class="admin-header">
                <div>
                    <h1>Command Center</h1>
                    <p style="margin:0.25rem 0 0;color:var(--text-dim);font-size:0.85rem;">
                        GW ${data.kpis.gameweek} · ${escapeHtml(data.kpis.dayName)} · Uptime ${escapeHtml(data.scheduler.uptime)}
                    </p>
                </div>
                <div class="status-pills">
                    <span id="status-pill" class="pill ${data.isEmergency ? 'pill-error' : 'pill-online'}">
                        <span id="status-text">${data.isEmergency ? 'CRITIQUE' : 'EN LIGNE'}</span>
                    </span>
                    <span class="pill">👥 ${data.kpis.memberCount.toLocaleString()}</span>
                    <span class="pill">📡 <span id="ping-val">${data.ping}</span>ms</span>
                    <span class="pill">⏭ Prochain: ${escapeHtml(data.scheduler.nextLabel)} (${data.scheduler.hoursUntil}h)</span>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card highlight"><span class="kpi-value">${data.kpis.activePopRate}%</span><span class="kpi-label">Activité rôle</span></div>
                <div class="kpi-card"><span class="kpi-value">${data.kpis.arrivalsToday}</span><span class="kpi-label">Arrivées jour</span></div>
                <div class="kpi-card highlight"><span class="kpi-value">${data.kpis.weeklyGrowth >= 0 ? '+' : ''}${data.kpis.weeklyGrowth}%</span><span class="kpi-label">Croissance 7j</span></div>
                <div class="kpi-card"><span class="kpi-value">${data.kpis.messagesSent.toLocaleString()}</span><span class="kpi-label">Messages total</span></div>
                <div class="kpi-card"><span class="kpi-value">${data.kpis.commandsExecuted}</span><span class="kpi-label">Commandes</span></div>
                <div class="kpi-card"><span class="kpi-value">${data.kpis.avgRating}⭐</span><span class="kpi-label">NPS (${data.kpis.totalFeedbacks})</span></div>
                <div class="kpi-card danger"><span class="kpi-value">${data.kpis.totalBans}</span><span class="kpi-label">Bans</span></div>
                <div class="kpi-card"><span class="kpi-value">${data.kpis.totalPosts}</span><span class="kpi-label">Posts hebdo</span></div>
            </div>

            <div class="console">
                <div class="console-header"><span>🔴 LIVE LOGS</span><span id="log-counter">sync</span></div>
                <div class="console-body" id="console-output">
                    ${data.liveLogs.map(l => `<div class="log-entry"><span class="log-time">[${escapeHtml(l.time)}]</span><span class="type-${l.action}">${escapeHtml(l.action)}</span><span>${escapeHtml(l.detail)}</span></div>`).join('')}
                </div>
            </div>

            <div class="panel-grid">
                <div class="panel">
                    <h2>⚙️ Configuration salons</h2>
                    <form action="${base}/save-config" method="POST">${csrf}
                        <label>Logs</label>${renderChannelSelect('logs', currentConfig.channels?.logs, guildChannels)}
                        <label>Annonces</label>${renderChannelSelect('announce', currentConfig.channels?.announce, guildChannels)}
                        <label>Welcome / General</label>${renderChannelSelect('welcome', currentConfig.channels?.welcome, guildChannels)}
                        <label>Spotlight</label>${renderChannelSelect('spotlight', currentConfig.channels?.spotlight, guildChannels)}
                        <label>Feedback</label>${renderChannelSelect('feedback', currentConfig.channels?.feedback, guildChannels)}
                        <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Sauvegarder</button>
                    </form>
                </div>
                <div class="panel">
                    <h2>🛡️ Modération</h2>
                    <label>Discord User ID</label>
                    <input type="text" id="mod-target-id" placeholder="ID utilisateur..." onchange="fetchUserInfo(this.value)">
                    <div id="user-preview" class="user-preview">
                        <img id="user-avatar" src="" alt="">
                        <span id="user-name"></span>
                    </div>
                    <form action="${base}/mod-action" method="POST">${csrf}
                        <input type="hidden" name="userId" id="hidden-mod-id">
                        <label>Raison</label><input type="text" name="reason" required>
                        <label>Durée timeout</label>
                        <select name="duration"><option value="60">1h</option><option value="1440">24h</option><option value="10080">7j</option></select>
                        <div class="mod-actions">
                            <button name="action" value="timeout" class="btn btn-ghost" style="background:#f59e0b33;">Timeout</button>
                            <button name="action" value="kick" class="btn btn-ghost">Kick</button>
                            <button name="action" value="ban" class="btn btn-ghost btn-ban" onclick="return confirm('Ban définitif ?')">Ban</button>
                        </div>
                    </form>
                </div>
                <div class="panel">
                    <h2>📣 Broadcast</h2>
                    <form action="${base}/send-announce" method="POST" enctype="multipart/form-data">${csrf}
                        <label>Salon</label>${renderChannelSelect('chanId', currentConfig.channels?.announce, guildChannels)}
                        <label>Message</label><textarea name="message" rows="3" required></textarea>
                        <label>Image</label><input type="file" name="footerImage" accept="image/*">
                        <button type="submit" class="btn btn-neon btn-block" style="margin-top:0.75rem;">Envoyer</button>
                    </form>
                </div>
            </div>

            <div class="panel-grid">
                <div class="panel">
                    <h2>🎁 Giveaway</h2>
                    <table><tr><td><strong>Weekend Draw</strong></td><td>${data.giveaway.count} participants</td></tr>
                    <tr><td colspan="2" style="color:var(--text-dim);font-size:0.8rem;">${escapeHtml(data.giveaway.list)}</td></tr></table>
                </div>
                <div class="panel">
                    <h2>📈 Trafic messages (7j)</h2>
                    <div class="chart-wrap"><canvas id="trafficChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>👥 Croissance membres (7j)</h2>
                    <div class="chart-wrap"><canvas id="memberChart"></canvas></div>
                </div>
            </div>
        </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="/js/admin-console.js"></script>
    <script>
    new Chart(document.getElementById('trafficChart'), {
        type: 'line',
        data: { labels: ${JSON.stringify(data.charts.dates)}, datasets: [{ data: ${JSON.stringify(data.charts.messageCounts)}, borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    new Chart(document.getElementById('memberChart'), {
        type: 'line',
        data: { labels: ${JSON.stringify(data.charts.last7History)}, datasets: [{ data: ${JSON.stringify(data.charts.memberTrend)}, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }
    });
    </script>`;

    res.send(pageShell({ title: 'Ace Console — Peaxel', body, bodyClass: data.isEmergency ? 'emergency-mode' : '' }));
});

router.get('/analytics', requireAdmin, (_req, res) => res.redirect('/analytics'));
router.get('/feedbacks', requireAdmin, (_req, res) => res.redirect('/feedbacks'));

// ─── POST actions ───
router.post('/mod-action', requireAdmin, validateCsrf, async (req, res) => {
    const { userId, reason, action, duration } = req.body;
    const client = req.app.get('discordClient');
    try {
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(404).send('Utilisateur introuvable.');
        let logMsg = '';
        if (action === 'timeout') {
            await member.timeout(parseInt(duration, 10) * 60 * 1000, reason);
            logMsg = `TIMEOUT: ${member.user.tag} (${duration}m)`;
        } else if (action === 'kick') {
            await member.kick(reason);
            logMsg = `KICK: ${member.user.tag}`;
        } else if (action === 'ban') {
            await member.ban({ reason });
            logMsg = `BAN: ${member.user.tag}`;
            updateJsonSync(STATS_FILE, { totalBans: 0 }, (s) => { s.totalBans = (s.totalBans || 0) + 1; return s; });
        }
        addLiveLog('MOD', logMsg);
        res.redirect(adminUrl('/'));
    } catch (e) { res.status(500).send('Erreur modération: ' + e.message); }
});

router.post('/save-config', requireAdmin, validateCsrf, (req, res) => {
    const { logs, announce, welcome, spotlight, feedback } = req.body;
    if (logs) setChannel('logs', logs);
    if (announce) setChannel('announce', announce);
    if (welcome) setChannel('welcome', welcome);
    if (spotlight) setChannel('spotlight', spotlight);
    if (feedback) setChannel('feedback', feedback);
    addLiveLog('CONFIG', 'Salons mis à jour');
    res.redirect(adminUrl('/'));
});

router.post('/send-announce', requireAdmin, validateCsrf, upload.single('footerImage'), async (req, res) => {
    const { message, chanId } = req.body;
    try {
        const channel = await req.app.get('discordClient').channels.fetch(chanId);
        const payload = { content: message };
        if (req.file) payload.files = [{ attachment: req.file.path, name: 'broadcast.png' }];
        await channel.send(payload);
        if (req.file) fs.unlinkSync(req.file.path);
        addLiveLog('BROADCAST', `Signal → #${channel.name}`);
        res.redirect(adminUrl('/'));
    } catch (e) { res.status(500).send('Erreur broadcast: ' + e.message); }
});

export default router;
