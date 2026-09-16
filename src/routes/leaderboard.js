import express from 'express';
import { pageShell, escapeHtml } from '../web/utils/render.js';
import { adminSidebar, adminTopbar, ADMIN_CSS } from '../web/utils/adminLayout.js';
import { requireAdmin } from '../web/middleware/auth.js';
import { adminUrl } from '../web/services/adminPath.js';
import { csrfInput, validateCsrf } from '../utils/csrf.js';
import {
    addHubXp,
    removeHubXp,
    resetWeeklyXp,
    resetHubXp,
    getWeeklyLeaderboard,
    getGlobalLeaderboard,
    getHubProfile,
    weekKeyNow,
} from '../web/services/hubXpService.js';

const router = express.Router();

function flashRedirect(res, query) {
    const qs = new URLSearchParams(query).toString();
    res.redirect(`/leaderboard${qs ? `?${qs}` : ''}`);
}

function renderRows(rows, mode) {
    if (!rows.length) {
        return `<tr><td colspan="5" class="muted">—</td></tr>`;
    }
    return rows.map((r) => `
        <tr>
            <td>#${r.rank}</td>
            <td>${escapeHtml(r.username || r.discordId)}</td>
            <td><code>${escapeHtml(r.discordId)}</code></td>
            <td>${mode === 'global' ? r.xpTotal : r.xpWeek}</td>
            <td>Lv.${r.level}</td>
        </tr>`).join('');
}

router.get('/', requireAdmin, (req, res) => {
    const { t, locale } = req;
    const base = adminUrl('');
    const csrf = csrfInput(req.session);
    const weekly = getWeeklyLeaderboard(25);
    const global = getGlobalLeaderboard(25);
    const flash = req.query.ok
        ? `<div class="alert alert-success">${escapeHtml(String(req.query.ok))}</div>`
        : req.query.err
            ? `<div class="alert alert-error">${escapeHtml(String(req.query.err))}</div>`
            : '';

    const body = `
    <div class="admin-body admin-v3">
        ${adminSidebar('/leaderboard', base, req.session.admin, { t, locale, returnPath: '/leaderboard', csrf })}
        <main class="admin-main">
            ${adminTopbar({
                title: t('admin.leaderboardTitle'),
                subtitle: t('admin.leaderboardSub', { week: weekKeyNow() }),
                pills: `<a href="${base}" class="btn btn-ghost btn-sm">${t('admin.backConsole')}</a>`,
            })}
            ${flash}

            <div class="panel-grid">
                <section class="panel">
                    <h2>${t('admin.xpAdjust')}</h2>
                    <form method="POST" action="/leaderboard/xp" class="admin-form-stack">
                        ${csrf}
                        <label>${t('admin.userId')}</label>
                        <input type="text" name="discordId" required placeholder="${t('admin.userIdPh')}" pattern="[0-9]{5,32}">
                        <label>${t('admin.xpAmount')}</label>
                        <input type="number" name="amount" required min="1" max="100000" value="50">
                        <div class="admin-btn-row">
                            <button type="submit" name="action" value="give" class="btn btn-primary btn-sm">${t('admin.xpGive')}</button>
                            <button type="submit" name="action" value="remove" class="btn btn-ghost btn-sm">${t('admin.xpRemove')}</button>
                        </div>
                    </form>
                </section>

                <section class="panel">
                    <h2>${t('admin.xpReset')}</h2>
                    <form method="POST" action="/leaderboard/reset" class="admin-form-stack" onsubmit="return confirm('${t('admin.xpResetConfirm')}');">
                        ${csrf}
                        <label>${t('admin.userId')} <span class="muted">(${t('admin.optionalUser')})</span></label>
                        <input type="text" name="discordId" placeholder="${t('admin.userIdPh')}" pattern="[0-9]{5,32}">
                        <div class="admin-btn-row">
                            <button type="submit" name="action" value="weekly_one" class="btn btn-ghost btn-sm">${t('admin.xpResetWeeklyUser')}</button>
                            <button type="submit" name="action" value="weekly_all" class="btn btn-ghost btn-sm">${t('admin.xpResetWeeklyAll')}</button>
                            <button type="submit" name="action" value="full_one" class="btn btn-danger btn-sm">${t('admin.xpResetFullUser')}</button>
                        </div>
                    </form>
                </section>
            </div>

            <div class="panel-grid">
                <section class="panel">
                    <h2>📅 ${t('admin.lbWeekly')}</h2>
                    <div class="table-scroll">
                        <table>
                            <thead><tr><th>#</th><th>${t('admin.colManager')}</th><th>ID</th><th>XP</th><th>Lv</th></tr></thead>
                            <tbody>${renderRows(weekly, 'weekly')}</tbody>
                        </table>
                    </div>
                </section>
                <section class="panel">
                    <h2>🌍 ${t('admin.lbGlobal')}</h2>
                    <div class="table-scroll">
                        <table>
                            <thead><tr><th>#</th><th>${t('admin.colManager')}</th><th>ID</th><th>XP</th><th>Lv</th></tr></thead>
                            <tbody>${renderRows(global, 'global')}</tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    </div>`;

    res.send(pageShell({
        title: t('admin.leaderboardTitle'),
        description: t('meta.siteDescription'),
        body,
        includeNav: false,
        extraCss: ADMIN_CSS,
        locale,
    }));
});

router.post('/xp', requireAdmin, validateCsrf, (req, res) => {
    const { discordId, amount, action } = req.body;
    const id = String(discordId || '').trim();
    const amt = parseInt(amount, 10);
    if (!/^\d{5,32}$/.test(id) || !Number.isFinite(amt) || amt < 1) {
        return flashRedirect(res, { err: req.t('admin.xpInvalid') });
    }

    const profile = getHubProfile(id);
    const meta = { username: profile.username || id };

    if (action === 'remove') {
        const r = removeHubXp(id, amt, 'admin_remove', meta);
        return flashRedirect(res, { ok: req.t('admin.xpRemovedOk', { n: r.removed, id }) });
    }

    const r = addHubXp(id, amt, 'admin_give', meta);
    return flashRedirect(res, { ok: req.t('admin.xpGivenOk', { n: r.awarded, id }) });
});

router.post('/reset', requireAdmin, validateCsrf, (req, res) => {
    const { discordId, action } = req.body;
    const id = String(discordId || '').trim();

    if (action === 'weekly_all') {
        const r = resetWeeklyXp(null);
        return flashRedirect(res, { ok: req.t('admin.xpResetWeeklyAllOk', { n: r.count }) });
    }

    if (!/^\d{5,32}$/.test(id)) {
        return flashRedirect(res, { err: req.t('admin.xpNeedUser') });
    }

    const profile = getHubProfile(id);
    const meta = { username: profile.username || id };

    if (action === 'full_one') {
        resetHubXp(id, meta);
        return flashRedirect(res, { ok: req.t('admin.xpResetFullOk', { id }) });
    }

    resetWeeklyXp(id, meta);
    return flashRedirect(res, { ok: req.t('admin.xpResetWeeklyOk', { id }) });
});

export default router;
