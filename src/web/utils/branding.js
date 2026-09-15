import { langSwitcher } from '../i18n/index.js';

const LOGO_SRC = '/img/peaxel-mark.png';

/** Liens officiels Peaxel (écosystème) */
export const PEAXEL_LINKS = {
    site: 'https://peaxel.me',
    game: 'https://game.peaxel.me',
    docs: 'https://docs.peaxel.me',
    help: 'https://ace.peaxel.me',
    discord: 'https://discord.com/invite/p2K6kquXHU',
    hub: 'https://peaxel.genefty.com',
};

const ICON_MOON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>`;
const ICON_SUN = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

/** Bascule thème clair / sombre (client — localStorage) */
export function themeSwitcher(t) {
    return `<div class="theme-switch" role="group" aria-label="${t('theme.label')}">
        <button type="button" class="theme-btn" data-theme-set="dark" aria-pressed="false" title="${t('theme.dark')}">
            ${ICON_MOON}<span>${t('theme.dark')}</span>
        </button>
        <button type="button" class="theme-btn" data-theme-set="light" aria-pressed="false" title="${t('theme.light')}">
            ${ICON_SUN}<span>${t('theme.light')}</span>
        </button>
    </div>`;
}

function externalLink(href, label) {
    return `<a href="${href}" class="nav-link" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

export function peaxelExternalNav({ t }) {
    return `
        ${externalLink(PEAXEL_LINKS.game, t('nav.play'))}
        ${externalLink(PEAXEL_LINKS.docs, t('nav.docs'))}
        ${externalLink(PEAXEL_LINKS.help, t('nav.help'))}
    `;
}

export function peaxelLogo({ href = '/', size = 'md', showText = true, subtitle = '', t }) {
    const sizes = { sm: 28, md: 36, lg: 56 };
    const px = sizes[size] || sizes.md;
    const textClass = size === 'lg' ? 'logo-text logo-text-lg' : 'logo-text';
    const aria = t ? t('footer.hub') : 'Peaxel Hub';

    const inner = `
        <img src="${LOGO_SRC}" alt="" class="logo-mark" width="${px}" height="${px}" loading="eager" decoding="async">
        ${showText ? `<span class="${textClass}">Peaxel<span class="logo-dot">.</span></span>` : ''}
        ${subtitle ? `<span class="logo-sub">${subtitle}</span>` : ''}`;

    if (href) {
        return `<a href="${href}" class="logo-link logo-${size}" aria-label="${aria}">${inner}</a>`;
    }
    return `<div class="logo-link logo-${size}">${inner}</div>`;
}

export function peaxelFooter({ t, locale, returnPath = '/' }) {
    return `
    <footer class="site-footer">
        <div class="footer-inner">
            ${peaxelLogo({ href: '/', size: 'sm', subtitle: t('footer.hub'), t })}
            <nav class="footer-links" aria-label="Peaxel">
                <a href="/#faq">${t('footer.faq')}</a>
                <a href="${PEAXEL_LINKS.game}" target="_blank" rel="noopener noreferrer">${t('footer.play')}</a>
                <a href="${PEAXEL_LINKS.docs}" target="_blank" rel="noopener noreferrer">${t('footer.docs')}</a>
                <a href="${PEAXEL_LINKS.help}" target="_blank" rel="noopener noreferrer">${t('footer.help')}</a>
                <a href="${PEAXEL_LINKS.discord}" target="_blank" rel="noopener noreferrer">${t('footer.discord')}</a>
                <a href="${PEAXEL_LINKS.site}" target="_blank" rel="noopener noreferrer">${t('footer.website')}</a>
            </nav>
            <p class="footer-copy">&copy; ${t('footer.copy')}</p>
            <p class="footer-genefty">${t('footer.geneftyPrefix')} <a href="https://genefty.com" target="_blank" rel="noopener noreferrer">${t('footer.geneftyName')}</a></p>
            <div class="footer-prefs">
                ${themeSwitcher(t)}
                ${langSwitcher(returnPath, locale, t)}
            </div>
        </div>
    </footer>`;
}

export function publicNav({ user = null, t, locale, returnPath = '/' } = {}) {
    const userBlock = user
        ? `<div class="nav-user">
                <img src="${user.avatarUrl}" alt="" class="nav-avatar" width="32" height="32">
                <span class="nav-username">${user.username}</span>
                <a href="/auth/logout" class="btn btn-ghost btn-sm">${t('nav.logout')}</a>
           </div>`
        : `<a href="/auth/discord" class="btn btn-primary btn-sm">${t('nav.signIn')}</a>`;

    return `
    <nav class="landing-nav" aria-label="Navigation">
        ${peaxelLogo({ href: user ? '/app' : '/', size: 'md', subtitle: t('footer.hub'), t })}
        <button type="button" class="nav-toggle" aria-label="${t('nav.menu')}" aria-expanded="false" data-nav-toggle>
            <span></span><span></span><span></span>
        </button>
        <div class="nav-actions" data-nav-menu>
            <div class="nav-links">
                ${user ? `<a href="/app/leaderboard" class="nav-link">${t('nav.leaderboard')}</a>` : ''}
                ${peaxelExternalNav({ t })}
            </div>
            ${themeSwitcher(t)}
            ${langSwitcher(returnPath, locale, t)}
            ${userBlock}
        </div>
    </nav>`;
}

export function adminBrand(t) {
    return `
    <div class="admin-brand">
        <img src="${LOGO_SRC}" alt="" class="logo-mark" width="32" height="32">
        <div>
            <span class="admin-brand-title">Peaxel Console</span>
            <span class="admin-brand-sub">${t('admin.brandSub')}</span>
        </div>
    </div>`;
}
