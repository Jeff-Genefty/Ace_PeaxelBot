import { langSwitcher } from '../i18n/index.js';

export function peaxelLogo({ href = '/', size = 'md', showText = true, subtitle = '', t }) {
    const sizes = { sm: 28, md: 36, lg: 48 };
    const px = sizes[size] || sizes.md;
    const textClass = size === 'lg' ? 'logo-text logo-text-lg' : 'logo-text';
    const aria = t ? t('footer.hub') : 'Peaxel Hub';

    const inner = `
        <img src="/img/favicon.ico" alt="Peaxel" class="logo-mark" width="${px}" height="${px}" loading="eager">
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
            ${peaxelLogo({ href: 'https://peaxel.me', size: 'sm', subtitle: t('footer.hub'), t })}
            <nav class="footer-links" aria-label="Peaxel">
                <a href="https://peaxel.me" target="_blank" rel="noopener">${t('footer.official')}</a>
                <a href="https://game.peaxel.me" target="_blank" rel="noopener">${t('footer.play')}</a>
                <a href="https://docs.peaxel.me" target="_blank" rel="noopener">${t('footer.guide')}</a>
                <a href="https://discord.gg/PNyAqI8hio" target="_blank" rel="noopener">${t('footer.discord')}</a>
            </nav>
            <p class="footer-copy">&copy; ${t('footer.copy')}</p>
            <p class="footer-genefty">${t('footer.geneftyPrefix')} <a href="https://genefty.com" target="_blank" rel="noopener noreferrer">${t('footer.geneftyName')}</a></p>
            ${langSwitcher(returnPath, locale, t)}
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
        : `<a href="https://game.peaxel.me" class="btn btn-primary btn-sm" target="_blank" rel="noopener">${t('nav.play')}</a>`;

    return `
    <nav class="landing-nav" aria-label="Navigation">
        ${peaxelLogo({ href: user ? '/app' : '/', size: 'md', subtitle: t('footer.hub'), t })}
        <button type="button" class="nav-toggle" aria-label="${t('nav.menu')}" aria-expanded="false" data-nav-toggle>
            <span></span><span></span><span></span>
        </button>
        <div class="nav-actions" data-nav-menu>
            ${langSwitcher(returnPath, locale, t)}
            <a href="https://peaxel.me" class="nav-link" target="_blank" rel="noopener">${t('nav.peaxelSite')}</a>
            <a href="https://docs.peaxel.me" class="nav-link" target="_blank" rel="noopener">${t('nav.guide')}</a>
            ${userBlock}
        </div>
    </nav>`;
}

export function adminBrand(t) {
    return `
    <div class="admin-brand">
        <img src="/img/favicon.ico" alt="Peaxel" class="logo-mark" width="32" height="32">
        <div>
            <span class="admin-brand-title">Peaxel Console</span>
            <span class="admin-brand-sub">${t('admin.brandSub')}</span>
        </div>
    </div>`;
}
