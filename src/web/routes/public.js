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

    const loginRequired = req.query.login === 'required';
    const oauthError = req.query.error;

    const body = `
    <div class="landing">
        ${publicNav()}
        <section class="hero">
            <div class="hero-logo">
                <img src="/img/favicon.ico" alt="Peaxel">
            </div>
            <span class="hero-badge">Community Hub · v2</span>
            <h1>Collect. Compete. Connect.</h1>
            <p>Ton hub communautaire Peaxel — connecte-toi avec Discord pour accéder à ton espace manager et rester synchronisé avec le jeu.</p>
            <div class="hero-actions">
                ${loginRequired ? '<div class="alert alert-info">Connecte-toi pour accéder à ton espace.</div>' : ''}
                ${oauthError ? '<div class="alert alert-error">Connexion Discord échouée. Réessaie.</div>' : ''}
                <a href="/auth/discord" class="btn btn-discord">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.664-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    Se connecter avec Discord
                </a>
                <a href="https://game.peaxel.me" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">Jouer sur game.peaxel.me →</a>
            </div>
        </section>
        <section class="features">
            <div class="feature-card">
                <div class="feature-icon">🃏</div>
                <h3>Collecte tes cartes</h3>
                <p>Scoute, collectionne et gère tes athlètes sur game.peaxel.me.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🏆</div>
                <h3>Événements Discord</h3>
                <p>Quiz, giveaways, spotlights et rewards communautaires.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>Stats Gameweek</h3>
                <p>Suis l'activité du serveur et la Gameweek en cours.</p>
            </div>
        </section>
        ${peaxelFooter()}
    </div>`;

    res.send(pageShell({ title: 'Peaxel Hub — Accueil', body }));
});

router.get('/auth/discord', (req, res) => {
    if (!process.env.DISCORD_CLIENT_SECRET) {
        return res.status(503).send('OAuth Discord non configuré (DISCORD_CLIENT_SECRET manquant).');
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
    const publicStats = await gatherPublicStats(client);

    const body = `
    <div class="landing">
        ${publicNav({ user: { username: escapeHtml(user.username), avatarUrl: user.avatarUrl } })}
        <div class="app-layout">
            <div class="profile-card">
                <img class="profile-avatar" src="${escapeHtml(user.avatarUrl)}" alt="Avatar">
                <div>
                    <h2 style="margin:0 0 0.25rem;">${escapeHtml(user.username)}</h2>
                    <p style="margin:0;color:var(--text-dim);font-size:0.85rem;">Athlete Manager · Discord ${escapeHtml(user.id)}</p>
                    <p style="margin:0.5rem 0 0;font-size:0.8rem;color:${publicStats.botOnline ? 'var(--success)' : 'var(--danger)'};">
                        ${publicStats.botOnline ? '🟢 Bot en ligne' : '🔴 Bot hors ligne'} · ${publicStats.ping}ms
                    </p>
                </div>
            </div>

            <div class="stat-row">
                <div class="stat-pill">
                    <span class="value">GW ${publicStats.gameweek}</span>
                    <span class="label">Gameweek</span>
                </div>
                <div class="stat-pill">
                    <span class="value">${publicStats.memberCount.toLocaleString()}</span>
                    <span class="label">Membres Discord</span>
                </div>
                <div class="stat-pill">
                    <span class="value">${escapeHtml(publicStats.dayName)}</span>
                    <span class="label">Aujourd'hui</span>
                </div>
            </div>

            <h3 class="section-title">Accès rapide</h3>
            <div class="link-grid">
                <a href="https://game.peaxel.me" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">🎮</div>
                    <strong>Jouer</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">game.peaxel.me</p>
                </a>
                <a href="https://peaxel.me" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">🃏</div>
                    <strong>Peaxel</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">Site officiel</p>
                </a>
                <a href="https://discord.gg/PNyAqI8hio" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">💬</div>
                    <strong>Discord</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">Communauté</p>
                </a>
                <a href="https://docs.peaxel.me" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">📖</div>
                    <strong>Playbook</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">docs.peaxel.me</p>
                </a>
                <a href="https://zealy.io/cw/peaxel-quest/questboard" target="_blank" rel="noopener" class="link-card">
                    <div style="font-size:1.5rem;">⚡</div>
                    <strong>Zealy</strong>
                    <p style="font-size:0.8rem;color:var(--text-dim);margin:0.25rem 0 0;">Quêtes & XP</p>
                </a>
            </div>

            <div class="panel" style="margin-top:1.5rem;">
                <h2>Prochainement</h2>
                <p style="color:var(--text-muted);margin:0;font-size:0.9rem;">
                    Leaderboard quiz, historique rewards, liaison compte Peaxel et check-in Gameweek — Phase 1.
                </p>
            </div>
        </div>
        ${peaxelFooter()}
    </div>`;

    res.send(pageShell({ title: 'Mon espace — Peaxel Hub', body }));
});

export default router;
