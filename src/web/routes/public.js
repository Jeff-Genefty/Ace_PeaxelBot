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
import { gatherPublicStats, invalidateStatsCache } from '../services/statsService.js';
import { getFeaturedCards } from '../services/featuredCards.js';
import { renderHomeBackground } from '../utils/homeBackground.js';
import {
    renderGameweekLive,
    renderGiveawayStrip,
    renderHeroCarousel,
    renderLinkStatus,
} from '../utils/widgets.js';
import { getGameweekStatus } from '../services/gameweekService.js';
import { getGiveawayState } from '../services/giveawayService.js';
import { verifyLinkCode, getAccountLink, updatePeaxelUsername } from '../services/linkService.js';
import { hasCheckedIn, recordCheckin, getCheckinCount } from '../services/gwCheckinService.js';
import { addLiveLog } from '../services/liveLogService.js';
import { csrfInput, validateCsrf, initSessionCsrf } from '../../utils/csrf.js';

const HOME_CSS = '<link rel="stylesheet" href="/css/home.css">';
const APP_CSS = '<link rel="stylesheet" href="/css/app.css">';
const HOME_JS = '<script src="/js/home.js" defer></script>';
const APP_JS = '<script src="/js/app.js" defer></script>';
const SHARED_JS = '<script src="/js/countdown.js" defer></script>';

const router = express.Router();

function shellOpts(req, extra = {}) {
    const base = process.env.WEB_BASE_URL || '';
    return {
        locale: req.locale,
        theme: req.theme,
        description: req.t('meta.siteDescription'),
        ogUrl: base ? `${base}${req.originalUrl.split('?')[0]}` : '',
        ...extra,
    };
}

router.get('/api/public/stats', async (req, res) => {
    const client = req.app.get('discordClient');
    const discordId = req.session.discordUser?.id || null;
    const stats = await gatherPublicStats(client, req.locale, discordId);
    res.json(stats);
});

router.get('/', async (req, res) => {
    const { t, locale, theme } = req;
    const client = req.app.get('discordClient');
    const loginRequired = req.query.login === 'required';
    const oauthError = req.query.error;
    const featuredCards = getFeaturedCards(8);
    const discordUser = req.session.discordUser || null;
    const publicStats = await gatherPublicStats(client, locale, discordUser?.id);
    const gw = publicStats.gameweekStatus;
    const checkedIn = discordUser ? hasCheckedIn(discordUser.id, gw.gameweek) : false;
    const csrf = discordUser ? csrfInput(req.session) : '';

    const body = `
    <div class="landing landing-home">
        ${renderHomeBackground(featuredCards)}
        ${publicNav({
        user: discordUser ? { username: escapeHtml(discordUser.username), avatarUrl: discordUser.avatarUrl } : null,
        t,
        locale,
        returnPath: '/',
    })}
        ${renderGiveawayStrip({ t, giveaway: publicStats.giveaway })}
        ${renderGameweekLive({
        t,
        gw,
        checkinCount: publicStats.checkinCount,
        checkedIn,
        showCheckin: Boolean(discordUser),
        csrf,
    })}
        <section class="hero hero-glass">
            ${renderHeroCarousel(featuredCards.slice(0, 5))}
            <div class="hero-logo hero-logo-pulse">
                <img src="/img/favicon.ico" alt="Peaxel">
            </div>
            <span class="hero-badge hero-badge-glow">${t('home.badge')}</span>
            <h1>${t('home.title')}</h1>
            <p>${t('home.subtitle')}</p>
            <div class="hero-actions">
                ${loginRequired ? `<div class="alert alert-info">${t('home.loginRequired')}</div>` : ''}
                ${oauthError ? `<div class="alert alert-error">${t('home.oauthError')}</div>` : ''}
                ${discordUser
        ? `<a href="/app" class="btn btn-primary btn-glow">${t('meta.hubApp')}</a>`
        : `<a href="/auth/discord" class="btn btn-discord btn-glow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.664-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    ${t('home.discordLogin')}
                </a>`}
                <a href="https://game.peaxel.me" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">${t('home.playCta')}</a>
            </div>
        </section>
        <section class="features features-elevated">
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
        ${peaxelFooter({ t, locale, returnPath: '/', theme })}
    </div>`;

    res.send(pageShell({
        title: t('meta.hubHome'),
        body,
        extraCss: HOME_CSS,
        extraJs: HOME_JS + SHARED_JS,
        ...shellOpts(req),
    }));
});

router.get('/link', requireDiscordUser, (req, res) => {
    const { t, locale, theme } = req;
    const user = req.session.discordUser;
    const link = getAccountLink(user.id);
    const error = req.query.error;
    const success = req.query.linked === '1';

    const body = `
    <div class="landing landing-app">
        ${publicNav({ user: { username: escapeHtml(user.username), avatarUrl: user.avatarUrl }, t, locale, returnPath: '/link' })}
        <div class="app-layout">
            ${renderLinkStatus({ t, link, csrf: csrfInput(req.session), error, success: success && !error })}
        </div>
        ${peaxelFooter({ t, locale, returnPath: '/link', theme })}
    </div>`;

    res.send(pageShell({
        title: t('link.title'),
        body,
        extraCss: APP_CSS,
        ...shellOpts(req),
    }));
});

router.post('/link/verify', requireDiscordUser, validateCsrf, (req, res) => {
    const user = req.session.discordUser;
    const result = verifyLinkCode(req.body.code, user.id, req.body.peaxelUsername);
    invalidateStatsCache('public');
    if (!result.ok) {
        addLiveLog('LINK', `${user.username} link failed: ${result.error}`);
        return res.redirect(`/link?error=${result.error}`);
    }
    addLiveLog('LINK', `${user.username} linked Peaxel account`);
    res.redirect('/link?linked=1');
});

router.post('/link/username', requireDiscordUser, validateCsrf, (req, res) => {
    const user = req.session.discordUser;
    const result = updatePeaxelUsername(user.id, req.body.peaxelUsername);
    if (!result.ok) return res.redirect(`/link?error=${result.error}`);
    res.redirect('/link?linked=1');
});

router.post('/app/checkin', requireDiscordUser, validateCsrf, (req, res) => {
    const user = req.session.discordUser;
    const gw = getGameweekStatus();
    if (!gw.isLineupOpen) return res.redirect('/app?checkin=closed');
    if (hasCheckedIn(user.id, gw.gameweek)) return res.redirect('/app?checkin=done');

    recordCheckin(user.id, gw.gameweek, user.tag || user.username);
    addLiveLog('CHECKIN', `${user.username} checked in GW${gw.gameweek}`);
    invalidateStatsCache('public');
    res.redirect('/app?checkin=ok');
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
        initSessionCsrf(req.session);
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
    const { t, locale, theme } = req;
    const publicStats = await gatherPublicStats(client, locale, user.id);
    const botLabel = publicStats.botOnline ? t('app.botOnline') : t('app.botOffline');
    const link = getAccountLink(user.id);
    const gw = publicStats.gameweekStatus;
    const checkedIn = hasCheckedIn(user.id, gw.gameweek);
    const checkinMsg = req.query.checkin === 'ok' ? t('gw.checkinDone')
        : req.query.checkin === 'done' ? t('gw.checkinDone') : '';

    const body = `
    <div class="landing landing-app landing-home">
        ${renderHomeBackground(getFeaturedCards(4))}
        ${publicNav({ user: { username: escapeHtml(user.username), avatarUrl: user.avatarUrl }, t, locale, returnPath: '/app' })}
        <div class="app-layout app-layout-live">
            ${renderGiveawayStrip({ t, giveaway: publicStats.giveaway })}
            ${renderGameweekLive({
        t,
        gw,
        checkinCount: publicStats.checkinCount,
        checkedIn,
        showCheckin: true,
        csrf: csrfInput(req.session),
    })}
            ${checkinMsg ? `<div class="alert alert-info">${checkinMsg}</div>` : ''}

            <div class="profile-card profile-card-glow">
                <img class="profile-avatar" src="${escapeHtml(user.avatarUrl)}" alt="Avatar">
                <div>
                    <h2 style="margin:0 0 0.25rem;">${escapeHtml(user.username)}</h2>
                    <p style="margin:0;color:var(--text-dim);font-size:0.85rem;">${t('app.manager')} / ${t('app.discordId', { id: escapeHtml(user.id) })}</p>
                    ${link ? `<span class="linked-badge">${t('app.linkedBadge')}${link.peaxelUsername ? `: ${escapeHtml(link.peaxelUsername)}` : ''}</span>` : ''}
                    <p style="margin:0.5rem 0 0;font-size:0.8rem;color:${publicStats.botOnline ? 'var(--success)' : 'var(--danger)'};">
                        ${botLabel} / ${publicStats.ping}ms
                    </p>
                </div>
            </div>

            <div class="stat-row stat-row-animated">
                <div class="stat-pill">
                    <span class="value" data-count-up="${publicStats.gameweek}">0</span>
                    <span class="label">${t('app.gameweek')}</span>
                </div>
                <div class="stat-pill">
                    <span class="value" data-count-up="${publicStats.memberCount}">0</span>
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
                <a href="/link" class="link-card">
                    <div style="font-size:1.5rem;">🔗</div>
                    <strong>${t('app.linkAccount')}</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">${t('app.linkAccountDesc')}</p>
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

            <div class="panel panel-glass" style="margin-top:1.5rem;">
                <h2>${t('app.comingSoon')}</h2>
                <p style="color:var(--text-muted);margin:0;font-size:0.9rem;">${t('app.comingSoonDesc')}</p>
            </div>
        </div>
        ${peaxelFooter({ t, locale, returnPath: '/app', theme })}
    </div>`;

    res.send(pageShell({
        title: t('meta.hubApp'),
        body,
        extraCss: HOME_CSS + APP_CSS,
        extraJs: APP_JS + SHARED_JS,
        ...shellOpts(req),
    }));
});

export default router;
