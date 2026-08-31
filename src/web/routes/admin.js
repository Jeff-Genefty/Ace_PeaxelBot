import express from 'express';
import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import multer from 'multer';
import { pageShell, escapeHtml } from '../utils/render.js';
import { adminSidebar, adminTopbar, kpiCard, toolPanel, ADMIN_CSS } from '../utils/adminLayout.js';
import { requireAdmin, requireAdminApi } from '../middleware/auth.js';
import { adminUrl } from '../services/adminPath.js';
import { authenticateAdmin } from '../services/adminUsers.js';
import { gatherAdminStats, invalidateStatsCache } from '../services/statsService.js';
import { addLiveLog, getLiveLogs, LOG_ACTIONS } from '../services/liveLogService.js';
import { getConfig, setChannel } from '../../utils/configManager.js';
import { updateJsonSync } from '../../utils/jsonStore.js';
import { langSwitcher } from '../i18n/index.js';
import {
    csrfInput, createLoginCsrfToken, loginCsrfInput,
    setLoginCsrfCookie, validateCsrf, validateLoginCsrf, initSessionCsrf,
} from '../../utils/csrf.js';
import { loginRateLimit, recordFailedLogin, clearLoginAttempts } from '../../utils/loginRateLimit.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const DATA_DIR = resolve('./data');
const STATS_FILE = join(DATA_DIR, 'analytics.json');

function renderChannelSelect(name, currentId, guildChannels, t) {
    if (!guildChannels.length) {
        return `<input type="text" name="${name}" value="${escapeHtml(currentId || '')}" placeholder="${t('admin.channelId')}">`;
    }
    const current = guildChannels.find(c => c.id === currentId);
    const displayName = current ? `${current.isNews ? '📢' : '#'} ${current.name}` : '';
    const listId = `list-${name}`;
    const options = guildChannels.map(c =>
        `<option value="${c.isNews ? '📢' : '#'} ${escapeHtml(c.name)}" data-id="${c.id}"></option>`
    ).join('');
    return `
        <input type="text" class="channel-search-input" list="${listId}" placeholder="${t('admin.searchChannel')}" value="${escapeHtml(displayName)}" oninput="updateHiddenId(this,'${name}')" autocomplete="off">
        <input type="hidden" name="${name}" id="hidden-${name}" value="${escapeHtml(currentId || '')}">
        <datalist id="${listId}">${options}</datalist>`;
}

const i18nOpts = (req) => ({ t: req.t, locale: req.locale, returnPath: req.originalUrl });

router.get('/login', (req, res) => {
    if (req.session.admin) return res.redirect(adminUrl('/'));
    const { t, locale } = req;
    const isProd = process.env.NODE_ENV === 'production';
    const token = createLoginCsrfToken();
    setLoginCsrfCookie(res, token, isProd);
    const csrf = loginCsrfInput(token);
    const loginPath = adminUrl('/login');
    const error = req.query.error === '1' ? `<div class="alert alert-error">${t('admin.loginError')}</div>` : '';
    const body = `
    <div class="login-page">
        <div class="login-card">
            <div class="login-brand">
                <img src="/img/favicon.ico" alt="Peaxel">
                <h1>${t('admin.loginTitle')}</h1>
                <p class="subtitle">${t('admin.loginSub')}</p>
            </div>
            ${langSwitcher(loginPath, locale, t)}
            ${error}
            <form action="${adminUrl('/login')}" method="POST">
                ${csrf}
                <label>${t('admin.email')}</label>
                <input type="email" name="email" required autocomplete="username">
                <label>${t('admin.password')}</label>
                <input type="password" name="password" required autocomplete="current-password">
                <button type="submit" class="btn btn-primary btn-block">${t('admin.loginBtn')}</button>
            </form>
            <p class="login-secure-note">${t('admin.loginSecure')}</p>
        </div>
    </div>`;
    res.send(pageShell({
        title: t('meta.adminLogin'),
        description: t('meta.siteDescription'),
        body,
        bodyClass: 'login-page',
        includeNav: false,
        extraCss: ADMIN_CSS,
        locale,
    }));
});

router.post('/login', loginRateLimit, validateLoginCsrf, async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await authenticateAdmin(email, password);
        if (admin) {
            clearLoginAttempts(req);
            initSessionCsrf(req.session);
            req.session.admin = admin;
            return req.session.save((err) => {
                if (err) return res.status(500).send(req.t('admin.sessionError'));
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

router.get('/api/logs', requireAdminApi, (req, res) => {
    const { action = 'ALL', q = '', limit = '50', offset = '0' } = req.query;
    const result = getLiveLogs({
        action,
        q,
        limit: Math.min(parseInt(limit, 10) || 50, 200),
        offset: parseInt(offset, 10) || 0,
    });
    const client = req.app.get('discordClient');
    res.json({
        ...result,
        emergency: !client.isReady() || client.ws.ping > 250,
        ping: client.ws.ping,
    });
});

router.get('/api/user/:id', requireAdminApi, async (req, res) => {
    try {
        const user = await req.app.get('discordClient').users.fetch(req.params.id);
        res.json({ id: user.id, tag: user.tag, avatar: user.displayAvatarURL({ extension: 'png' }) });
    } catch { res.status(404).json({ error: 'Not found' }); }
});

router.get('/', requireAdmin, async (req, res) => {
    const { t, locale } = req;
    const client = req.app.get('discordClient');
    const data = await gatherAdminStats(client, locale);
    const csrf = csrfInput(req.session);
    const base = adminUrl('');
    const currentConfig = getConfig();
    const i18n = i18nOpts(req);

    let guildChannels = [];
    if (data.guild) {
        const channels = await data.guild.channels.fetch();
        guildChannels = channels.filter(c => c && (c.type === 0 || c.type === 5))
            .map(c => ({ id: c.id, name: c.name, isNews: c.type === 5 }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    const statusPills = `
        <span id="status-pill" class="pill ${data.isEmergency ? 'pill-error' : 'pill-online'}">
            <span class="status-dot ${data.isEmergency ? 'critical' : ''}"></span>
            <span id="status-text">${data.isEmergency ? t('admin.statusCritical') : t('admin.statusOnline')}</span>
        </span>
        <span class="pill">${t('admin.membersShort', { count: data.kpis.memberCount.toLocaleString(locale) })}</span>
        <span class="pill"><span id="ping-val">${data.ping}</span>ms</span>
        <span class="pill">${t('admin.nextIn', { label: data.scheduler.nextLabel, hours: data.scheduler.hoursUntil })}</span>`;

    const configForm = `
        <form action="${base}/save-config" method="POST">${csrf}
            <label>${t('admin.chLogs')}</label>${renderChannelSelect('logs', currentConfig.channels?.logs, guildChannels, t)}
            <label>${t('admin.chAnnounce')}</label>${renderChannelSelect('announce', currentConfig.channels?.announce, guildChannels, t)}
            <label>${t('admin.chWelcome')}</label>${renderChannelSelect('welcome', currentConfig.channels?.welcome, guildChannels, t)}
            <label>${t('admin.chSpotlight')}</label>${renderChannelSelect('spotlight', currentConfig.channels?.spotlight, guildChannels, t)}
            <label>${t('admin.chFeedback')}</label>${renderChannelSelect('feedback', currentConfig.channels?.feedback, guildChannels, t)}
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">${t('admin.save')}</button>
        </form>`;

    const modForm = `
        <label>${t('admin.userId')}</label>
        <input type="text" id="mod-target-id" placeholder="${t('admin.userIdPh')}" onchange="fetchUserInfo(this.value)">
        <div id="user-preview" class="user-preview">
            <img id="user-avatar" src="" alt="">
            <span id="user-name"></span>
        </div>
        <form action="${base}/mod-action" method="POST">${csrf}
            <input type="hidden" name="userId" id="hidden-mod-id">
            <label>${t('admin.reason')}</label><input type="text" name="reason" required placeholder="${t('admin.reasonPh')}">
            <label>${t('admin.timeoutDuration')}</label>
            <select name="duration">
                <option value="60">${t('admin.timeout1h')}</option>
                <option value="1440">${t('admin.timeout24h')}</option>
                <option value="10080">${t('admin.timeout7d')}</option>
            </select>
            <div class="mod-actions">
                <button name="action" value="timeout" class="btn btn-ghost" style="background:rgba(245,158,11,0.15);">${t('admin.timeout')}</button>
                <button name="action" value="kick" class="btn btn-ghost">${t('admin.kick')}</button>
                <button name="action" value="ban" class="btn btn-ghost btn-ban" onclick="return confirm('${t('admin.banConfirm')}')">${t('admin.ban')}</button>
            </div>
        </form>`;

    const broadcastForm = `
        <form action="${base}/send-announce" method="POST" enctype="multipart/form-data">${csrf}
            <label>${t('admin.targetChannel')}</label>${renderChannelSelect('chanId', currentConfig.channels?.announce, guildChannels, t)}
            <label>${t('admin.message')}</label><textarea name="message" rows="3" required placeholder="${t('admin.messagePh')}"></textarea>
            <label>${t('admin.imageOptional')}</label><input type="file" name="footerImage" accept="image/*">
            <button type="submit" class="btn btn-neon btn-block" style="margin-top:0.75rem;">${t('admin.sendBroadcast')}</button>
        </form>`;

    const body = `
    <div class="admin-body admin-v3 ${data.isEmergency ? 'emergency-mode' : ''}"
         data-logs-api="${base}/api/logs"
         data-admin-base="${base}"
         data-i18n-online="${escapeHtml(t('admin.statusOnline'))}"
         data-i18n-critical="${escapeHtml(t('admin.statusCritical'))}"
         data-i18n-entries="${escapeHtml(t('admin.logEntries', { count: '{n}' }))}"
         data-i18n-sync="${escapeHtml(t('common.sync'))}"
         data-i18n-no-results="${escapeHtml(t('admin.logNoResults'))}">
        ${adminSidebar('', base, req.session.admin, i18n)}
        <main class="admin-main">
            ${adminTopbar({
                title: t('admin.commandCenter'),
                subtitle: t('admin.subtitleGw', {
                    gw: data.kpis.gameweek,
                    day: data.kpis.dayName,
                    uptime: data.scheduler.uptime,
                }),
                pills: statusPills,
            })}

            <div class="stats-row">
                ${kpiCard(`${data.kpis.activePopRate}%`, t('admin.kpiRoleActivity'), 'highlight')}
                ${kpiCard(data.kpis.arrivalsToday, t('admin.kpiArrivals'), '')}
                ${kpiCard(`${data.kpis.weeklyGrowth >= 0 ? '+' : ''}${data.kpis.weeklyGrowth}%`, t('admin.kpiGrowth'), 'highlight')}
                ${kpiCard(data.kpis.messagesSent.toLocaleString(locale), t('admin.kpiMessages'), 'accent')}
                ${kpiCard(data.kpis.commandsExecuted, t('admin.kpiCommands'), '')}
                ${kpiCard(`${data.kpis.avgRating}*`, t('admin.kpiNps', { count: data.kpis.totalFeedbacks }), 'highlight')}
                ${kpiCard(data.kpis.totalBans, t('admin.kpiBans'), 'danger')}
                ${kpiCard(data.kpis.totalPosts, t('admin.kpiPosts'), '')}
            </div>

            <div class="admin-zones">
                <div class="admin-zone-main">
                    <div class="live-panel">
                        <div class="live-panel-head">
                            <span class="live-indicator">${t('admin.liveLogs')}</span>
                            <span id="log-counter">${t('common.sync')}</span>
                        </div>
                        <div class="log-filters" id="log-filters">
                            <label class="sr-only" for="log-action-filter">${t('admin.logFilter')}</label>
                            <select id="log-action-filter" aria-label="${t('admin.logFilter')}">
                                <option value="ALL">${t('admin.logAll')}</option>
                                ${LOG_ACTIONS.map((a) => `<option value="${a}">${a}</option>`).join('')}
                            </select>
                            <input type="search" id="log-search" placeholder="${t('admin.logSearch')}" autocomplete="off">
                        </div>
                        <div class="console-body" id="console-output">
                            ${data.liveLogs.map(l => `<div class="log-entry"><span class="log-time">[${escapeHtml(l.time)}]</span><span class="type-${l.action}">${escapeHtml(l.action)}</span><span>${escapeHtml(l.detail)}</span></div>`).join('')}
                        </div>
                    </div>
                    <div class="charts-duo">
                        <div class="chart-panel">
                            <h3>${t('admin.chartMessages')}</h3>
                            <div class="chart-wrap"><canvas id="trafficChart"></canvas></div>
                        </div>
                        <div class="chart-panel">
                            <h3>${t('admin.chartMembers')}</h3>
                            <div class="chart-wrap"><canvas id="memberChart"></canvas></div>
                        </div>
                    </div>
                </div>
                <div class="admin-zone-side">
                    ${toolPanel(t('admin.config'), '⚙', configForm)}
                    ${toolPanel(t('admin.moderation'), '🛡', modForm)}
                    ${toolPanel(t('admin.broadcast'), '📣', broadcastForm)}
                    ${toolPanel(t('admin.giveaway'), '🎁', `
                        <div class="giveaway-box">
                            <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.06em;">${t('admin.weekendDraw')}</div>
                            <div class="giveaway-count">${data.giveaway.count}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">${t('admin.participants')}</div>
                            <div class="giveaway-list">${escapeHtml(data.giveaway.list)}</div>
                        </div>`)}
                </div>
            </div>
        </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="/js/admin-console.js"></script>
    <script>
    const chartDefaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#1a1a28' } }, x: { grid: { display: false } } } };
    new Chart(document.getElementById('trafficChart'), {
        type: 'line',
        data: { labels: ${JSON.stringify(data.charts.dates)}, datasets: [{ data: ${JSON.stringify(data.charts.messageCounts)}, borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.08)', fill: true, tension: 0.4, pointRadius: 3 }] },
        options: chartDefaults
    });
    new Chart(document.getElementById('memberChart'), {
        type: 'line',
        data: { labels: ${JSON.stringify(data.charts.last7History)}, datasets: [{ data: ${JSON.stringify(data.charts.memberTrend)}, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)', fill: true, tension: 0.4, pointRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { color: '#1a1a28' } }, x: { grid: { display: false } } } }
    });
    </script>`;

    res.send(pageShell({
        title: t('meta.adminConsole'),
        description: t('meta.siteDescription'),
        body,
        bodyClass: data.isEmergency ? 'emergency-mode' : '',
        extraCss: ADMIN_CSS,
        locale,
    }));
});

router.get('/analytics', requireAdmin, (_req, res) => res.redirect('/analytics'));
router.get('/feedbacks', requireAdmin, (_req, res) => res.redirect('/feedbacks'));

router.post('/mod-action', requireAdmin, validateCsrf, async (req, res) => {
    const { userId, reason, action, duration } = req.body;
    const client = req.app.get('discordClient');
    try {
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(404).send(req.t('admin.userNotFound'));
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
        invalidateStatsCache('admin');
        res.redirect(adminUrl('/'));
    } catch (e) { res.status(500).send(req.t('admin.modError', { msg: e.message })); }
});

router.post('/save-config', requireAdmin, validateCsrf, (req, res) => {
    const { logs, announce, welcome, spotlight, feedback } = req.body;
    if (logs) setChannel('logs', logs);
    if (announce) setChannel('announce', announce);
    if (welcome) setChannel('welcome', welcome);
    if (spotlight) setChannel('spotlight', spotlight);
    if (feedback) setChannel('feedback', feedback);
    addLiveLog('CONFIG', req.t('admin.configUpdated'));
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
        addLiveLog('BROADCAST', `Signal > #${channel.name}`);
        res.redirect(adminUrl('/'));
    } catch (e) { res.status(500).send(req.t('admin.broadcastError', { msg: e.message })); }
});

export default router;
