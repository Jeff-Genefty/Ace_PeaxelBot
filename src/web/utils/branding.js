/** Composants branding Peaxel — alignés sur peaxel.me */
export function peaxelLogo({ href = '/', size = 'md', showText = true, subtitle = '' } = {}) {
    const sizes = { sm: 28, md: 36, lg: 48 };
    const px = sizes[size] || sizes.md;
    const textClass = size === 'lg' ? 'logo-text logo-text-lg' : 'logo-text';

    const inner = `
        <img src="/img/favicon.ico" alt="Peaxel" class="logo-mark" width="${px}" height="${px}" loading="eager">
        ${showText ? `<span class="${textClass}">Peaxel<span class="logo-dot">.</span></span>` : ''}
        ${subtitle ? `<span class="logo-sub">${subtitle}</span>` : ''}`;

    if (href) {
        return `<a href="${href}" class="logo-link logo-${size}" aria-label="Peaxel — Accueil">${inner}</a>`;
    }
    return `<div class="logo-link logo-${size}">${inner}</div>`;
}

export function peaxelFooter() {
    return `
    <footer class="site-footer">
        <div class="footer-inner">
            ${peaxelLogo({ href: 'https://peaxel.me', size: 'sm', subtitle: 'Community Hub' })}
            <nav class="footer-links" aria-label="Liens Peaxel">
                <a href="https://peaxel.me" target="_blank" rel="noopener">Site officiel</a>
                <a href="https://game.peaxel.me" target="_blank" rel="noopener">Jouer</a>
                <a href="https://docs.peaxel.me" target="_blank" rel="noopener">Guide</a>
                <a href="https://discord.gg/PNyAqI8hio" target="_blank" rel="noopener">Discord</a>
            </nav>
            <p class="footer-copy">© Peaxel · Collect. Compete. Win.</p>
        </div>
    </footer>`;
}

export function publicNav({ user = null } = {}) {
    const userBlock = user
        ? `<div class="nav-user">
                <img src="${user.avatarUrl}" alt="" class="nav-avatar" width="32" height="32">
                <span class="nav-username">${user.username}</span>
                <a href="/auth/logout" class="btn btn-ghost btn-sm">Déconnexion</a>
           </div>`
        : `<a href="https://game.peaxel.me" class="btn btn-primary btn-sm" target="_blank" rel="noopener">Jouer</a>`;

    return `
    <nav class="landing-nav" aria-label="Navigation principale">
        ${peaxelLogo({ href: user ? '/app' : '/', size: 'md', subtitle: 'Hub' })}
        <button type="button" class="nav-toggle" aria-label="Menu" aria-expanded="false" data-nav-toggle>
            <span></span><span></span><span></span>
        </button>
        <div class="nav-actions" data-nav-menu>
            <a href="https://peaxel.me" class="nav-link" target="_blank" rel="noopener">peaxel.me</a>
            <a href="https://docs.peaxel.me" class="nav-link" target="_blank" rel="noopener">Guide</a>
            ${userBlock}
        </div>
    </nav>`;
}

export function adminBrand() {
    return `
    <div class="admin-brand">
        <img src="/img/favicon.ico" alt="Peaxel" class="logo-mark" width="32" height="32">
        <div>
            <span class="admin-brand-title">Peaxel Console</span>
            <span class="admin-brand-sub">Staff only</span>
        </div>
    </div>`;
}
