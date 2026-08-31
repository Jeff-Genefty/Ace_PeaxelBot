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
import { gatherAppDashboard } from '../services/appDashboardService.js';
import { getFeaturedCards } from '../services/featuredCards.js';
import { renderHomeBackground } from '../utils/homeBackground.js';
import { renderGwTicker, renderGiveawayStrip } from '../utils/widgets.js';
import { renderAppDashboard } from '../utils/appWidgets.js';
import { toggleGwReminder } from '../services/gwReminderService.js';
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
    const { t, locale } = req;
    const client = req.app.get('discordClient');
    const loginRequired = req.query.login === 'required';
    const oauthError = req.query.error;
    const featuredCards = getFeaturedCards(8);
    const discordUser = req.session.discordUser || null;
    const publicStats = await gatherPublicStats(client, locale, discordUser?.id);
    const gw = publicStats.gameweekStatus;

    const body = `
    <div class="landing landing-home">
        ${renderGwTicker({ t, gw })}
        ${renderHomeBackground(featuredCards)}
        ${publicNav({
        user: discordUser ? { username: escapeHtml(discordUser.username), avatarUrl: discordUser.avatarUrl } : null,
        t,
        locale,
        returnPath: '/',
    })}
        ${renderGiveawayStrip({ t, giveaway: publicStats.giveaway })}
        <section class="hero hero-peaxel">
            <div class="hero-brand">
                <img src="/img/peaxel-mark.svg" alt="" class="hero-mark" width="72" height="72" decoding="async">
            </div>
            <span class="hero-badge">${t('home.badge')}</span>
            <h1 class="hero-title">${t('home.title')}</h1>
            <p class="hero-lead">${t('home.subtitle')}</p>
            <div class="hero-actions">
                ${loginRequired ? `<div class="alert alert-info">${t('home.loginRequired')}</div>` : ''}
                ${oauthError ? `<div class="alert alert-error">${t('home.oauthError')}</div>` : ''}
                ${discordUser
        ? `<a href="/app" class="btn btn-primary btn-glow">${t('meta.hubApp')}</a>`
        : `<a href="/auth/discord" class="btn btn-discord btn-glow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.664-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    ${t('home.discordLogin')}
                </a>`}
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
        ${peaxelFooter({ t, locale, returnPath: '/' })}
    </div>`;

    res.send(pageShell({
        title: t('meta.hubHome'),
        body,
        extraCss: HOME_CSS,
        extraJs: HOME_JS + SHARED_JS,
        ...shellOpts(req),
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
    const { t, locale } = req;
    if (!req.session.csrfToken) initSessionCsrf(req.session);
    const dashboard = await gatherAppDashboard(client, locale, user.id, user);
    const gw = dashboard.gameweekStatus;
    const csrf = csrfInput(req.session);

    const body = `
    <div class="landing landing-app landing-home">
        ${renderGwTicker({ t, gw })}
        ${renderHomeBackground(getFeaturedCards(4))}
        ${publicNav({ user: { username: escapeHtml(user.username), avatarUrl: user.avatarUrl }, t, locale, returnPath: '/app' })}
        <div class="app-layout app-layout-live">
            ${renderGiveawayStrip({ t, giveaway: dashboard.giveaway })}
            ${renderAppDashboard({ dashboard, t, csrf, locale, user })}
        </div>
        ${peaxelFooter({ t, locale, returnPath: '/app' })}
    </div>`;

    res.send(pageShell({
        title: t('meta.hubApp'),
        body,
        extraCss: HOME_CSS + APP_CSS,
        extraJs: APP_JS + SHARED_JS,
        ...shellOpts(req),
    }));
});

router.post('/app/reminders/toggle', requireDiscordUser, validateCsrf, (req, res) => {
    toggleGwReminder(req.session.discordUser.id);
    res.redirect('/app');
});

export default router;
