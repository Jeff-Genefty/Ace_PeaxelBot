import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { requireAdmin } from '../web/middleware/auth.js';
import { adminSidebar } from '../web/utils/adminLayout.js';
import { pageShell } from '../web/utils/render.js';
import { adminUrl } from '../web/services/adminPath.js';

const router = express.Router();
const STATS_FILE = resolve('./data/analytics.json');

router.get('/', requireAdmin, (req, res) => {
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

    const base = adminUrl('');
    const body = `
    <div class="admin-body">
        ${adminSidebar('/analytics', base)}
        <main class="admin-main">
            <div class="admin-header">
                <div>
                    <h1>Intelligence Center</h1>
                    <p style="margin:0.25rem 0 0;color:var(--text-dim);font-size:0.85rem;">Analyse granulaire des données serveur</p>
                </div>
                <div class="admin-header-actions">
                    <a href="${base}" class="btn btn-ghost btn-sm">← Console</a>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card"><span class="kpi-value">${(stats.messagesSent || 0).toLocaleString()}</span><span class="kpi-label">Messages</span></div>
                <div class="kpi-card"><span class="kpi-value">${stats.commandsExecuted || 0}</span><span class="kpi-label">Commandes</span></div>
                <div class="kpi-card"><span class="kpi-value">${stats.feedbacksReceived || 0}</span><span class="kpi-label">Feedbacks</span></div>
                <div class="kpi-card danger"><span class="kpi-value">${stats.totalBans || 0}</span><span class="kpi-label">Bans</span></div>
                <div class="kpi-card highlight"><span class="kpi-value">+${stats.arrivalsToday || 0}</span><span class="kpi-label">Arrivées jour</span></div>
            </div>

            <div class="panel-grid">
                <div class="panel" style="grid-column:1/-1;">
                    <h2>📈 Évolution membres (7j)</h2>
                    <div class="chart-wrap" style="height:280px;"><canvas id="growthChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>📊 Activité rôle (%)</h2>
                    <div class="chart-wrap"><canvas id="roleChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>🆕 Arrivants quotidiens</h2>
                    <div class="chart-wrap"><canvas id="arrivalChart"></canvas></div>
                </div>
            </div>

            <div class="panel">
                <h2>🗓️ Historique quotidien</h2>
                <div class="table-scroll">
                <table>
                    <thead><tr><th>Date</th><th>Membres</th><th>Flux (+)</th><th>Activité</th></tr></thead>
                    <tbody>
                        ${[...last7Days].reverse().map((date) => {
                            const d = stats.history[date];
                            return `<tr>
                                <td style="font-weight:700">${date}</td>
                                <td>${d?.totalMembers ?? '—'}</td>
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

    res.send(pageShell({ title: 'Analytics — Ace Console', body }));
});

export default router;
