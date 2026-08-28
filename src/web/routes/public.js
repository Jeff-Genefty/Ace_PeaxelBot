import express from 'express';
import { pageShell, escapeHtml } from '../utils/render.js';
import { requireDiscordUser } from '../middleware/auth.js';
import { publicNav, peaxelFooter } from '../utils/branding.js';
import {
    createOAuthState,
    validateOAuthState,
    getDiscordAuthUrl,
    exchangeDiscordCode,
    fetchDiscordUser,
    formatDiscordUser,
} from '../services/discordAuth.js';
import { gatherPublicStats } from '../services/statsService.js';

const router = express.Router();

router.get('/', async (req, res) => {
    if (req.session.discordUser) return res.redirect('/app');

    const { t, locale } = req;
    const loginRequired = req.query.login === 'required';
    const oauthError = req.query.error;

    const body = `
    <div class="landing">
        ${publicNav({ t, locale, returnPath: '/' })}
        <section class="hero">
            <div class="hero-logo">
                <img src="/img/favicon.ico" alt="Peaxel">
            </div>
            <span class="hero-badge">${t('home.badge')}</span>
            <h1>${t('home.title')}</h1>
            <p>${t('home.subtitle')}</p>
            <div class="hero-actions">
                ${loginRequired ? `<div class="alert alert-info">${t('home.loginRequired')}</div>` : ''}
                ${oauthError ? `<div class="alert alert-error">${t('home.oauthError')}</div>` : ''}
                <a href="/auth/discord" class="btn btn-discord">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.664-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    ${t('home.discordLogin')}
                </a>
                <a href="https://game.peaxel.me" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">${t('home.playCta')}</a>
            </div>
        </section>
        <section class="features">
            <div class="feature-card">
                <div class="feature-icon">🃏</div>
                <h3>${t('home.feature1Title')}</h3>
                <p>${t('home.feature1Desc')}</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🏆</div>
                <h3>${t('home.feature2Title')}</h3>
                <p>${t('home.feature2Desc')}</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>${t('home.feature3Title')}</h3>
                <p>${t('home.feature3Desc')}</p>
            </div>
        </section>
        ${peaxelFooter({ t, locale, returnPath: '/' })}
    </div>`;

    res.send(pageShell({
        title: t('meta.hubHome'),
        description: t('meta.siteDescription'),
        body,
        locale,
    }));
});

router.get('/auth/discord', (req, res) => {
    if (!process.env.DISCORD_CLIENT_SECRET) {
        return res.status(503).send(req.t('admin.oauthMissing'));
    }
    const state = createOAuthState(req.session);
    req.session.save(() => res.redirect(getDiscordAuthUrl(req, state)));
});

router.get('/auth/discord/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !validateOAuthState(req.session, state)) {
            return res.redirect('/?error=oauth');
        }
        const tokenData = await exchangeDiscordCode(req, code);
        const user = await fetchDiscordUser(tokenData.access_token);
        req.session.discordUser = formatDiscordUser(user);
        req.session.save((err) => {
            if (err) return res.redirect('/?error=oauth');
            res.redirect('/app');
        });
    } catch {
        res.redirect('/?error=oauth');
    }
});

router.get('/auth/logout', (req, res) => {
    delete req.session.discordUser;
    req.session.save(() => res.redirect('/'));
});

router.get('/app', requireDiscordUser, async (req, res) => {
    const client = req.app.get('discordClient');
    const user = req.session.discordUser;
    const { t, locale } = req;
    const publicStats = await gatherPublicStats(client, locale);
    const botLabel = publicStats.botOnline ? t('app.botOnline') : t('app.botOffline');

    const body = `
    <div class="landing">
        ${publicNav({ user: { username: escapeHtml(user.username), avatarUrl: user.avatarUrl }, t, locale, returnPath: '/app' })}
        <div class="app-layout">
            <div class="profile-card">
                <img class="profile-avatar" src="${escapeHtml(user.avatarUrl)}" alt="Avatar">
                <div>
                    <h2 style="margin:0 0 0.25rem;">${escapeHtml(user.username)}</h2>
                    <p style="margin:0;color:var(--text-dim);font-size:0.85rem;">${t('app.manager')} / ${t('app.discordId', { id: escapeHtml(user.id) })}</p>
                    <p style="margin:0.5rem 0 0;font-size:0.8rem;color:${publicStats.botOnline ? 'var(--success)' : 'var(--danger)'};">
                        ${botLabel} / ${publicStats.ping}ms
                    </p>
                </div>
            </div>

            <div class="stat-row">
                <div class="stat-pill">
                    <span class="value">GW ${publicStats.gameweek}</span>
                    <span class="label">${t('app.gameweek')}</span>
                </div>
                <div class="stat-pill">
                    <span class="value">${publicStats.memberCount.toLocaleString(locale)}</span>
                    <span class="label">${t('app.members')}</span>
                </div>
                <div class="stat-pill">
                    <span class="value">${escapeHtml(publicStats.dayName)}</span>
                    <span class="label">${t('app.today')}</span>
                </div>
            </div>

            <h3 class="section-title">${t('app.quickLinks')}</h3>
            <div class="link-grid">
                <a href="https://game.peaxel.me" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">🎮</div>
                    <strong>${t('app.linkPlay')}</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">game.peaxel.me</p>
                </a>
                <a href="https://peaxel.me" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">🃏</div>
                    <strong>${t('app.linkPeaxel')}</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">${t('app.linkPeaxelDesc')}</p>
                </a>
                <a href="https://discord.gg/PNyAqI8hio" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">💬</div>
                    <strong>${t('app.linkDiscord')}</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">${t('app.linkDiscordDesc')}</p>
                </a>
                <a href="https://docs.peaxel.me" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">📖</div>
                    <strong>${t('app.linkGuide')}</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">docs.peaxel.me</p>
                </a>
                <a href="https://zealy.io/cw/peaxel-quest/questboard" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">⚡</div>
                    <strong>${t('app.linkZealy')}</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">${t('app.linkZealyDesc')}</p>
                </a>
            </div>

            <div class="panel" style="margin-top:1.5rem;">
                <h2>${t('app.comingSoon')}</h2>
                <p style="color:var(--text-muted);margin:0;font-size:0.9rem;">${t('app.comingSoonDesc')}</p>
            </div>
        </div>
        ${peaxelFooter({ t, locale, returnPath: '/app' })}
    </div>`;

    res.send(pageShell({
        title: t('meta.hubApp'),
        description: t('meta.siteDescription'),
        body,
        locale,
    }));
});

export default router;
