import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { requireAdmin } from '../web/middleware/auth.js';
import { adminSidebar } from '../web/utils/adminLayout.js';
import { pageShell, escapeHtml } from '../web/utils/render.js';
import { adminUrl } from '../web/services/adminPath.js';

const router = express.Router();
const FEEDBACKS_FILE = resolve('./data/feedbacks.json');

router.get('/export', requireAdmin, (req, res) => {
    if (!existsSync(FEEDBACKS_FILE)) return res.status(404).send('Fichier introuvable');

    const data = JSON.parse(readFileSync(FEEDBACKS_FILE, 'utf-8'));
    const header = 'Date,Manager,Rating,Liked,Improve,Comments\n';
    const csv = data.map(f => {
        const clean = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;
        return `${f.date},${clean(f.userTag)},${f.rating},${clean(f.liked)},${clean(f.improve)},${clean(f.comments)}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=feedbacks_peaxel.csv');
    res.status(200).send(header + csv);
});

router.get('/', requireAdmin, (req, res) => {
    let feedbacks = [];
    if (existsSync(FEEDBACKS_FILE)) {
        try { feedbacks = JSON.parse(readFileSync(FEEDBACKS_FILE, 'utf-8')); } catch { /* empty */ }
    }

    const avg = feedbacks.length
        ? (feedbacks.reduce((a, f) => a + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : '0.0';
    const base = adminUrl('');

    const body = `
    <div class="admin-body">
        ${adminSidebar('/feedbacks', base)}
        <main class="admin-main">
            <div class="admin-header">
                <div>
                    <h1>Feedback Vault</h1>
                    <p style="margin:0.25rem 0 0;color:var(--text-dim);font-size:0.85rem;">Retours managers · NPS moyen ${avg}⭐</p>
                </div>
                <div class="admin-header-actions">
                    <a href="/feedbacks/export" class="btn btn-neon btn-sm">📥 Export CSV</a>
                    <a href="${base}" class="btn btn-ghost btn-sm">← Console</a>
                </div>
            </div>

            <div class="kpi-grid" style="max-width:600px;">
                <div class="kpi-card"><span class="kpi-value">${feedbacks.length}</span><span class="kpi-label">Total</span></div>
                <div class="kpi-card highlight"><span class="kpi-value">${avg}⭐</span><span class="kpi-label">Moyenne</span></div>
            </div>

            <div class="panel">
                <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Manager</th>
                            <th>Score</th>
                            <th>Points positifs</th>
                            <th>Améliorations</th>
                            <th>Commentaires</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${feedbacks.length > 0 ? [...feedbacks].reverse().map(f => `
                            <tr>
                                <td>
                                    <strong style="color:var(--primary)">${escapeHtml(f.userTag)}</strong><br>
                                    <small style="color:var(--text-dim)">${new Date(f.date).toLocaleDateString('fr-FR')}</small>
                                </td>
                                <td><span class="pill" style="color:#fbbf24;">${f.rating}/5</span></td>
                                <td>${escapeHtml(f.liked)}</td>
                                <td style="color:var(--text-muted)">${escapeHtml(f.improve)}</td>
                                <td style="color:var(--text-dim);font-style:italic;">${escapeHtml(f.comments || '—')}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--text-dim);">Aucun feedback pour le moment.</td></tr>'}
                    </tbody>
                </table>
                </div>
            </div>
        </main>
    </div>`;

    res.send(pageShell({ title: 'Feedbacks — Ace Console', body }));
});

export default router;
