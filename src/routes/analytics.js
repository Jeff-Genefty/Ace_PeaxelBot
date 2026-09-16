import express from 'express';
import { requireAdmin } from '../web/middleware/auth.js';
import { adminSidebar, adminTopbar, kpiCard, kpiSection, ADMIN_CSS } from '../web/utils/adminLayout.js';
import { pageShell } from '../web/utils/render.js';
import { adminUrl } from '../web/services/adminPath.js';
import { gatherAdminStats } from '../web/services/statsService.js';
import { csrfInput } from '../utils/csrf.js';

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
    const { t, locale } = req;
    const client = req.app.get('discordClient');
    const data = await gatherAdminStats(client, locale);
    const na = t('common.na');
    const base = adminUrl('');

    const body = `
    <div class="admin-body admin-v3">
        ${adminSidebar('/analytics', base, req.session.admin, { t, locale, returnPath: '/analytics', csrf: csrfInput(req.session) })}
        <main class="admin-main">
            ${adminTopbar({
                title: t('admin.intelligenceCenter'),
                subtitle: t('admin.intelligenceSub'),
                pills: `<a href="${base}" class="btn btn-ghost btn-sm">${t('admin.backConsole')}</a>
                    <span class="pill">${t('admin.periodTz')}</span>`,
            })}

            ${kpiSection(t('admin.sectionGrowth'))}
            <div class="stats-row">
                ${kpiCard(data.kpis.dac, t('admin.kpiDac'), 'highlight', t('admin.hintVsYesterday', { delta: data.kpis.dacDelta }))}
                ${kpiCard(data.kpis.arrivals7d, t('admin.kpiArrivals7d'), '', t('admin.hintVsPrevWeek', { delta: data.kpis.arrivalsDelta7d }))}
                ${kpiCard(data.kpis.challengeParticipants, t('admin.kpiChallenges'), '', t('admin.hintQuestDone', { n: data.kpis.challengeQuestComplete }))}
                ${kpiCard(`${data.kpis.avgRating}★`, t('admin.kpiFeedbackAvg', { count: data.kpis.totalFeedbacks }), 'highlight')}
                ${kpiCard(
                    data.kpis.vaultAwaiting,
                    t('admin.kpiVaultSla'),
                    data.kpis.vaultSlaBreaches > 0 ? 'danger' : '',
                    t('admin.hintVaultSla', { pending: data.kpis.vaultPending, sla: data.kpis.vaultSlaBreaches }),
                )}
            </div>

            ${kpiSection(t('admin.sectionOps'))}
            <div class="stats-row">
                ${kpiCard(data.kpis.messages7d.toLocaleString(locale), t('admin.kpiMessages7d'), 'accent', t('admin.hintVsPrevWeek', { delta: data.kpis.messagesDelta7d }))}
                ${kpiCard(data.kpis.commands7d, t('admin.kpiCommands7d'), '')}
                ${kpiCard(data.kpis.messagesToday.toLocaleString(locale), t('admin.kpiMessagesToday'), '')}
                ${kpiCard(data.kpis.commandsToday, t('admin.kpiCommandsToday'), '')}
                ${kpiCard(data.kpis.totalBans, t('admin.kpiBans'), 'danger')}
            </div>

            <div class="panel-grid">
                <div class="panel" style="grid-column:1/-1;">
                    <h2>${t('admin.chartMemberGrowth')}</h2>
                    <div class="chart-wrap" style="height:280px;"><canvas id="growthChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>${t('admin.chartDac')}</h2>
                    <div class="chart-wrap"><canvas id="dacChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>${t('admin.chartDailyArrivals')}</h2>
                    <div class="chart-wrap"><canvas id="arrivalChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>${t('admin.chartMessages')}</h2>
                    <div class="chart-wrap"><canvas id="msgChart"></canvas></div>
                </div>
                <div class="panel">
                    <h2>${t('admin.chartRoleActivity')}</h2>
                    <div class="chart-wrap"><canvas id="roleChart"></canvas></div>
                </div>
            </div>

            <div class="panel">
                <h2>${t('admin.dailyHistory')}</h2>
                <div class="table-scroll">
                <table>
                    <thead><tr>
                        <th>${t('admin.colDate')}</th>
                        <th>${t('admin.colMembers')}</th>
                        <th>${t('admin.colFlux')}</th>
                        <th>${t('admin.colDac')}</th>
                        <th>${t('admin.colActivity')}</th>
                        <th>${t('admin.colMessages')}</th>
                        <th>${t('admin.colCommands')}</th>
                    </tr></thead>
                    <tbody>
                        ${data.historyTable.map((row) => `
                            <tr>
                                <td style="font-weight:700">${row.date}${row.isToday ? ` · ${t('admin.colToday')}` : ''}</td>
                                <td>${row.totalMembers ?? na}</td>
                                <td style="color:var(--neon)">+${row.arrivals ?? 0}</td>
                                <td>${row.dac ?? na}</td>
                                <td>${row.roleActivity ?? 0}%</td>
                                <td>${row.messages ?? 0}</td>
                                <td>${row.commands ?? 0}</td>
                            </tr>`).join('')}
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
    const labels = ${JSON.stringify(data.charts.dates)};
    new Chart(document.getElementById('growthChart'), {
        type: 'line',
        data: { labels, datasets: [{ data: ${JSON.stringify(data.charts.memberTrend)}, borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)', fill: true, tension: 0.4 }] },
        options: chartOpt
    });
    new Chart(document.getElementById('dacChart'), {
        type: 'bar',
        data: { labels, datasets: [{ data: ${JSON.stringify(data.charts.dacTrend)}, backgroundColor: '#22d3ee' }] },
        options: chartOpt
    });
    new Chart(document.getElementById('arrivalChart'), {
        type: 'line',
        data: { labels, datasets: [{ data: ${JSON.stringify(data.charts.arrivalTrend)}, borderColor: '#ef4444', tension: 0.3 }] },
        options: chartOpt
    });
    new Chart(document.getElementById('msgChart'), {
        type: 'line',
        data: { labels, datasets: [{ data: ${JSON.stringify(data.charts.messageCounts)}, borderColor: '#a78bfa', tension: 0.3 }] },
        options: chartOpt
    });
    new Chart(document.getElementById('roleChart'), {
        type: 'bar',
        data: { labels, datasets: [{ data: ${JSON.stringify(data.charts.roleActivityTrend)}, backgroundColor: '#7c3aed' }] },
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
