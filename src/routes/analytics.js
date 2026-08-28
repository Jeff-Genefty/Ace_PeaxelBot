import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { requireAdmin } from '../web/middleware/auth.js';
import { adminSidebar, adminTopbar, ADMIN_CSS } from '../web/utils/adminLayout.js';
import { pageShell } from '../web/utils/render.js';
import { adminUrl } from '../web/services/adminPath.js';

const router = express.Router();
const STATS_FILE = resolve('./data/analytics.json');

router.get('/', requireAdmin, (req, res) => {
    const { t, locale } = req;
    let stats = {
        messagesSent: 0,
        commandsExecuted: 0,
        feedbacksReceived: 0,
        arrivalsToday: 0,
        dailyActiveRoleUsers: [],
        totalBans: 0,
        history: {},
        dailyHistory: {},
    };

    if (existsSync(STATS_FILE)) {
        try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch { /* defaults */ }
    }

    const historyDates = Object.keys(stats.history || {}).sort();
    const last7Days = [...historyDates].slice(-7);
    const memberData = last7Days.map((d) => stats.history[d].totalMembers || 0);
    const arrivalData = last7Days.map((d) => stats.history[d].arrivals || 0);
    const roleData = last7Days.map((d) => stats.history[d].roleActivity || 0);
    const na = t('common.na');

    const base = adminUrl('');
    const body = `
    <div class="admin-body admin-v3">
        ${adminSidebar('/analytics', base, req.session.admin, { t, locale, returnPath: '/analytics' })}
        <main class="admin-main">
            ${adminTopbar({
                title: t('admin.intelligenceCenter'),
                subtitle: t('admin.intelligenceSub'),
                pills: `<a href="${base}" class="btn btn-ghost btn-sm">${t('admin.backConsole')}</a>`,
            })}

            <div class="stats-row">
                <article class="stat-card accent"><span class="stat-value">${(stats.messagesSent || 0).toLocaleString(locale)}</span><span class="stat-label">${t('admin.kpiMessages')}</span></article>
                <article class="stat-card"><span class="stat-value">${stats.commandsExecuted || 0}</span><span class="stat-label">${t('admin.kpiCommands')}</span></article>
                <article class="stat-card"><span class="stat-value">${stats.feedbacksReceived || 0}</span><span class="stat-label">${t('admin.feedbacks')}</span></article>
                <article class="stat-card danger"><span class="stat-value">${stats.totalBans || 0}</span><span class="stat-label">${t('admin.kpiBans')}</span></article>
                <article class="stat-card highlight"><span class="stat-value">+${stats.arrivalsToday || 0}</span><span class="stat-label">${t('admin.kpiArrivals')}</span></article>
            </div>

            <div class="panel-grid">
                <div class="panel" style="grid-column:1/-1;">
                    <h2>${t('admin.chartMemberGrowth')}</h2>
                    <div class="chart-wrap" style="height:280px;"><canvas id="growthChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>${t('admin.chartRoleActivity')}</h2>
                    <div class="chart-wrap"><canvas id="roleChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>${t('admin.chartDailyArrivals')}</h2>
                    <div class="chart-wrap"><canvas id="arrivalChart"></canvas></div>
                </div>
            </div>

            <div class="panel">
                <h2>${t('admin.dailyHistory')}</h2>
                <div class="table-scroll">
                <table>
                    <thead><tr><th>${t('admin.colDate')}</th><th>${t('admin.colMembers')}</th><th>${t('admin.colFlux')}</th><th>${t('admin.colActivity')}</th></tr></thead>
                    <tbody>
                        ${[...last7Days].reverse().map((date) => {
                            const d = stats.history[date];
                            return `<tr>
                                <td style="font-weight:700">${date}</td>
                                <td>${d?.totalMembers ?? na}</td>
                                <td style="color:var(--neon)">+${d?.arrivals ?? 0}</td>
                                <td>${d?.roleActivity ?? 0}%</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            </div>
        </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
    const chartOpt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { grid: { color: '#1e1e2e' }, ticks: { color: '#475569' } }, x: { grid: { display: false }, ticks: { color: '#475569' } } } };
    const labels = ${JSON.stringify(last7Days)};
    new Chart(document.getElementById('growthChart'), {
        type: 'line',
        data: { labels, datasets: [{ data: ${JSON.stringify(memberData)}, borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)', fill: true, tension: 0.4 }] },
        options: chartOpt
    });
    new Chart(document.getElementById('roleChart'), {
        type: 'bar',
        data: { labels, datasets: [{ data: ${JSON.stringify(roleData)}, backgroundColor: '#7c3aed' }] },
        options: chartOpt
    });
    new Chart(document.getElementById('arrivalChart'), {
        type: 'line',
        data: { labels, datasets: [{ data: ${JSON.stringify(arrivalData)}, borderColor: '#ef4444', tension: 0.3 }] },
        options: chartOpt
    });
    </script>`;

    res.send(pageShell({
        title: t('meta.adminAnalytics'),
        description: t('meta.siteDescription'),
        body,
        extraCss: ADMIN_CSS,
        locale,
    }));
});

export default router;
