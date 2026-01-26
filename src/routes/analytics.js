import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const router = express.Router();
const STATS_FILE = resolve('./data/analytics.json');

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

router.get('/', isAuthenticated, (req, res) => {
    let stats = { 
        messagesSent: 0, 
        commandsExecuted: 0, 
        feedbacksReceived: 0, 
        arrivalsToday: 0, 
        dailyActiveRoleUsers: [], 
        totalBans: 0,
        history: {} 
    };

    if (existsSync(STATS_FILE)) {
        try { stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8')); } catch (e) { }
    }

    const historyDates = Object.keys(stats.history || {}).sort();
    const last7Days = historyDates.slice(-7);
    
    // English comment: Prepare chart data
    const memberData = last7Days.map(d => stats.history[d].totalMembers || 0);
    const arrivalData = last7Days.map(d => stats.history[d].arrivals || 0);

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Peaxel | Analytics Deep-Dive</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                :root { --bg: #030305; --card: #0a0a0f; --primary: #a855f7; --neon: #2dd4bf; --text: #f8fafc; --danger: #ef4444; }
                body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); padding: 40px; margin: 0; line-height: 1.5; }
                
                .header { margin-bottom: 40px; border-left: 4px solid var(--primary); padding-left: 20px; }
                .header h1 { margin: 0; font-size: 2.5em; font-weight: 800; }
                
                /* --- RAW STATS GRID --- */
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 40px; }
                .stat-box { background: var(--card); border: 1px solid #1e1e2e; padding: 20px; border-radius: 12px; transition: transform 0.2s; }
                .stat-box:hover { transform: translateY(-5px); border-color: var(--primary); }
                .stat-label { color: #64748b; font-size: 0.75em; text-transform: uppercase; font-weight: 700; }
                .stat-number { font-size: 2em; font-weight: 800; display: block; margin: 5px 0; color: var(--primary); }
                .stat-desc { font-size: 0.8em; color: #475569; }

                /* --- LAYOUT --- */
                .main-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
                .panel { background: var(--card); border: 1px solid #1e1e2e; border-radius: 20px; padding: 25px; }
                .panel-title { font-size: 1.1em; font-weight: 700; margin-bottom: 20px; color: #94a3b8; display: flex; align-items: center; gap: 10px; }

                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { text-align: left; color: #475569; font-size: 0.7em; padding: 12px; border-bottom: 1px solid #1e1e2e; }
                td { padding: 15px 12px; font-size: 0.85em; border-bottom: 1px solid #0f0f15; }
                
                .btn-back { display: inline-block; margin-bottom: 20px; color: var(--primary); text-decoration: none; font-weight: 600; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <a href="/dashboard" class="btn-back">← RETOUR DASHBOARD</a>
            <div class="header">
                <h1>Intelligence Center</h1>
                <p style="color: #64748b">Analyse granulaire des données du serveur</p>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Messages Totaux</span>
                    <span class="stat-number">${stats.messagesSent.toLocaleString()}</span>
                    <span class="stat-desc">Volume de discussion</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Slash Commands</span>
                    <span class="stat-number">${stats.commandsExecuted}</span>
                    <span class="stat-desc">Interactions bot</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Retours Clients</span>
                    <span class="stat-number">${stats.feedbacksReceived}</span>
                    <span class="stat-desc">Feedbacks reçus</span>
                </div>
                <div class="stat-box" style="border-bottom: 3px solid var(--danger)">
                    <span class="stat-label">Modération</span>
                    <span class="stat-number" style="color: var(--danger)">${stats.totalBans || 0}</span>
                    <span class="stat-desc">Bans définitifs</span>
                </div>
                <div class="stat-box" style="border-bottom: 3px solid var(--neon)">
                    <span class="stat-label">Arrivées Jour</span>
                    <span class="stat-number" style="color: var(--neon)">+${stats.arrivalsToday || 0}</span>
                    <span class="stat-desc">Nouveaux membres</span>
                </div>
            </div>

            <div class="main-layout">
                <div class="panel">
                    <div class="panel-title">📈 Courbe de croissance (7j)</div>
                    <canvas id="growthChart" height="200"></canvas>
                </div>

                <div class="panel">
                    <div class="panel-title">🗓️ Historique Quotidien</div>
                    <table>
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>MEMBRES</th>
                                <th>FLUX (+)</th>
                                <th>ACTIVITÉ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${last7Days.reverse().map(date => {
                                const d = stats.history[date];
                                return `
                                    <tr>
                                        <td style="font-weight:700">${date}</td>
                                        <td>${d.totalMembers}</td>
                                        <td style="color:var(--neon)">+${d.arrivals}</td>
                                        <td>${d.roleActivity}%</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
                new Chart(document.getElementById('growthChart'), {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(last7Days.reverse())},
                        datasets: [{
                            label: 'Membres',
                            data: ${JSON.stringify(memberData)},
                            borderColor: '#a855f7',
                            backgroundColor: 'rgba(168, 85, 247, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { 
                            y: { grid: { color: '#1e1e2e' }, ticks: { color: '#475569' } },
                            x: { grid: { display: false }, ticks: { color: '#475569' } }
                        }
                    }
                });
            </script>
        </body>
        </html>
    `);
});

export default router;