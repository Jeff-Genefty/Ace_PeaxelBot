import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { requireAdmin } from '../web/middleware/auth.js';
import { adminSidebar, adminTopbar, ADMIN_CSS } from '../web/utils/adminLayout.js';
import { pageShell, escapeHtml } from '../web/utils/render.js';
import { adminUrl } from '../web/services/adminPath.js';
import { localeDateString } from '../web/i18n/index.js';

const router = express.Router();
const FEEDBACKS_FILE = resolve('./data/feedbacks.json');

router.get('/export', requireAdmin, (req, res) => {
    if (!existsSync(FEEDBACKS_FILE)) return res.status(404).send(req.t('admin.fileNotFound'));

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
    const { t, locale } = req;
    let feedbacks = [];
    if (existsSync(FEEDBACKS_FILE)) {
        try { feedbacks = JSON.parse(readFileSync(FEEDBACKS_FILE, 'utf-8')); } catch { /* empty */ }
    }

    const avg = feedbacks.length
        ? (feedbacks.reduce((a, f) => a + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : '0.0';
    const base = adminUrl('');
    const na = t('common.na');

    const body = `
    <div class="admin-body admin-v3">
        ${adminSidebar('/feedbacks', base, req.session.admin, { t, locale, returnPath: '/feedbacks' })}
        <main class="admin-main">
            ${adminTopbar({
                title: t('admin.feedbackVault'),
                subtitle: t('admin.feedbackSub', { avg }),
                pills: `<a href="/feedbacks/export" class="btn btn-neon btn-sm">${t('admin.exportCsv')}</a><a href="${base}" class="btn btn-ghost btn-sm">${t('admin.backConsole')}</a>`,
            })}

            <div class="stats-row" style="max-width:420px;">
                <article class="stat-card accent"><span class="stat-value">${feedbacks.length}</span><span class="stat-label">${t('admin.total')}</span></article>
                <article class="stat-card highlight"><span class="stat-value">${avg}*</span><span class="stat-label">${t('admin.average')}</span></article>
            </div>

            <div class="tool-panel">
                <div class="tool-panel-body" style="padding-top:1rem;">
                <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>${t('admin.colManager')}</th>
                            <th>${t('admin.colScore')}</th>
                            <th>${t('admin.colPositive')}</th>
                            <th>${t('admin.colImprove')}</th>
                            <th>${t('admin.colComments')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${feedbacks.length > 0 ? [...feedbacks].reverse().map(f => `
                            <tr>
                                <td>
                                    <strong style="color:var(--primary)">${escapeHtml(f.userTag)}</strong><br>
                                    <small style="color:var(--text-dim)">${localeDateString(f.date, locale)}</small>
                                </td>
                                <td><span class="pill" style="color:#fbbf24;">${f.rating}/5</span></td>
                                <td>${escapeHtml(f.liked)}</td>
                                <td style="color:var(--text-muted)">${escapeHtml(f.improve)}</td>
                                <td style="color:var(--text-dim);font-style:italic;">${escapeHtml(f.comments || na)}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--text-dim);">${t('admin.noFeedback')}</td></tr>`}
                    </tbody>
                </table>
                </div>
                </div>
            </div>
        </main>
    </div>`;

    res.send(pageShell({
        title: t('meta.adminFeedbacks'),
        description: t('meta.siteDescription'),
        body,
        extraCss: ADMIN_CSS,
        locale,
    }));
});

export default router;
