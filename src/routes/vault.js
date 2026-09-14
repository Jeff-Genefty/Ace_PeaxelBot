import express from 'express';
import { pageShell, escapeHtml } from '../web/utils/render.js';
import { adminSidebar, adminTopbar, kpiCard, ADMIN_CSS } from '../web/utils/adminLayout.js';
import { requireAdmin } from '../web/middleware/auth.js';
import { adminUrl } from '../web/services/adminPath.js';
import { csrfInput, validateCsrf } from '../utils/csrf.js';
import { getCardVaultOverview, fulfillClaimedCard } from '../web/services/hubXpService.js';

const router = express.Router();

function reasonLabel(t, reason) {
    const key = `app.rewardReason.${reason}`;
    const label = t(key);
    return label === key ? reason : label;
}

function cardRows(rows, t, csrf, { fulfill = false } = {}) {
    if (!rows.length) {
        return `<tr><td colspan="6" class="muted">${t('admin.vaultEmpty')}</td></tr>`;
    }
    return rows.map((r) => {
        const when = r.claimedAt || r.createdAt || '—';
        const action = fulfill
            ? `<form method="POST" action="/vault/fulfill" class="inline-form">
                ${csrf}
                <input type="hidden" name="discordId" value="${escapeHtml(r.discordId)}">
                <input type="hidden" name="cardId" value="${escapeHtml(r.id)}">
                <button type="submit" class="btn btn-primary btn-sm">${t('admin.vaultMarkDone')}</button>
               </form>`
            : '—';
        return `<tr>
            <td>${escapeHtml(r.username || r.discordId)}</td>
            <td><code>${escapeHtml(r.discordId)}</code></td>
            <td>${escapeHtml(reasonLabel(t, r.reason))}</td>
            <td>${r.gameweek != null ? `GW ${r.gameweek}` : (r.weekKey || '—')}</td>
            <td>${escapeHtml(String(when).slice(0, 19).replace('T', ' '))}</td>
            <td>${action}</td>
        </tr>`;
    }).join('');
}

router.get('/', requireAdmin, (req, res) => {
    const { t, locale } = req;
    const base = adminUrl('');
    const csrf = csrfInput(req.session);
    const vault = getCardVaultOverview();
    const flash = req.query.ok
        ? `<div class="alert alert-success">${escapeHtml(String(req.query.ok))}</div>`
        : req.query.err
            ? `<div class="alert alert-error">${escapeHtml(String(req.query.err))}</div>`
            : '';

    const body = `
    <div class="admin-body admin-v3">
        ${adminSidebar('/vault', base, req.session.admin, { t, locale, returnPath: '/vault' })}
        <main class="admin-main">
            ${adminTopbar({
                title: t('admin.vaultTitle'),
                subtitle: t('admin.vaultSub'),
                pills: `<a href="${base}" class="btn btn-ghost btn-sm">${t('admin.backConsole')}</a>`,
            })}
            ${flash}

            <div class="stats-row">
                ${kpiCard(vault.counts.awaitingDelivery, t('admin.vaultAwaiting'), 'highlight')}
                ${kpiCard(vault.counts.pending, t('admin.vaultPending'), '')}
                ${kpiCard(vault.counts.fulfilled, t('admin.vaultFulfilled'), '')}
            </div>

            <section class="panel">
                <h2>⏳ ${t('admin.vaultAwaiting')}</h2>
                <p class="panel-desc">${t('admin.vaultAwaitingDesc')}</p>
                <div class="table-scroll">
                    <table>
                        <thead><tr>
                            <th>${t('admin.colManager')}</th><th>ID</th><th>${t('admin.vaultReason')}</th>
                            <th>GW</th><th>${t('admin.colDate')}</th><th></th>
                        </tr></thead>
                        <tbody>${cardRows(vault.awaitingDelivery, t, csrf, { fulfill: true })}</tbody>
                    </table>
                </div>
            </section>

            <section class="panel">
                <h2>🎁 ${t('admin.vaultPending')}</h2>
                <p class="panel-desc">${t('admin.vaultPendingDesc')}</p>
                <div class="table-scroll">
                    <table>
                        <thead><tr>
                            <th>${t('admin.colManager')}</th><th>ID</th><th>${t('admin.vaultReason')}</th>
                            <th>GW</th><th>${t('admin.colDate')}</th><th></th>
                        </tr></thead>
                        <tbody>${cardRows(vault.pending, t, csrf)}</tbody>
                    </table>
                </div>
            </section>

            <section class="panel">
                <h2>✓ ${t('admin.vaultFulfilled')}</h2>
                <div class="table-scroll">
                    <table>
                        <thead><tr>
                            <th>${t('admin.colManager')}</th><th>ID</th><th>${t('admin.vaultReason')}</th>
                            <th>GW</th><th>${t('admin.colDate')}</th><th></th>
                        </tr></thead>
                        <tbody>${cardRows(vault.fulfilled, t, csrf)}</tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>`;

    res.send(pageShell({
        title: t('admin.vaultTitle'),
        description: t('meta.siteDescription'),
        body,
        includeNav: false,
        extraCss: ADMIN_CSS,
        locale,
    }));
});

router.post('/fulfill', requireAdmin, validateCsrf, (req, res) => {
    const discordId = String(req.body.discordId || '').trim();
    const cardId = String(req.body.cardId || '').trim();
    if (!discordId || !cardId) {
        return res.redirect('/vault?err=missing');
    }
    const r = fulfillClaimedCard(discordId, cardId, { username: discordId });
    if (!r.ok) return res.redirect(`/vault?err=${encodeURIComponent(req.t('admin.vaultFulfillErr'))}`);
    return res.redirect(`/vault?ok=${encodeURIComponent(req.t('admin.vaultFulfillOk'))}`);
});

export default router;
