import { adminUrl } from '../services/adminPath.js';
import { adminBrand } from './branding.js';
import { isSuperAdmin } from '../services/adminUsers.js';
import { escapeHtml } from './render.js';
import { langSwitcher } from '../i18n/index.js';

export function adminSidebar(active, base = adminUrl(''), admin = null, { t, locale, returnPath } = {}) {
    const navItems = [
        { path: '', key: 'admin.overview', icon: '◉' },
        { path: '/analytics', key: 'admin.analytics', icon: '▤', absolute: true },
        { path: '/feedbacks', key: 'admin.feedbacks', icon: '◈', absolute: true },
    ];

    const links = navItems.map(({ path, key, icon, absolute }) => {
        const href = absolute ? path : `${base}${path}`;
        const isActive = absolute ? active === path : (active === path || (path === '' && active === ''));
        return `<a href="${href}" class="admin-nav-link ${isActive ? 'is-active' : ''}">
            <span class="admin-nav-icon">${icon}</span>
            <span>${t(key)}</span>
        </a>`;
    }).join('');

    const roleBadge = admin && isSuperAdmin({ admin })
        ? `<span class="role-badge role-super">${t('admin.superAdmin')}</span>`
        : admin
            ? `<span class="role-badge">${t('admin.staff')}</span>`
            : '';

    const userBlock = admin
        ? `<div class="admin-user-block">
            ${roleBadge}
            <span class="admin-user-email">${escapeHtml(admin.email)}</span>
           </div>`
        : '';

    return `
        <aside class="admin-sidebar">
            <div class="sidebar-header">
                ${adminBrand(t)}
                <button type="button" class="nav-toggle sidebar-toggle" aria-label="${t('nav.menu')}" aria-expanded="false" data-nav-toggle>
                    <span></span><span></span><span></span>
                </button>
            </div>
            <nav class="admin-nav" data-nav-menu>
                <p class="admin-nav-label">${t('admin.navLabel')}</p>
                ${links}
            </nav>
            ${userBlock}
            <div class="admin-lang-wrap">${langSwitcher(returnPath || base, locale, t)}</div>
            <a href="${base}/logout" class="admin-logout-btn">${t('admin.logout')}</a>
        </aside>`;
}

export function adminTopbar({ title, subtitle, pills = '' }) {
    return `
    <header class="admin-topbar">
        <div class="admin-topbar-text">
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        ${pills ? `<div class="admin-topbar-pills">${pills}</div>` : ''}
    </header>`;
}

export function kpiCard(value, label, variant = '') {
    return `<article class="stat-card ${variant}">
        <span class="stat-value">${value}</span>
        <span class="stat-label">${label}</span>
    </article>`;
}

export function toolPanel(title, icon, content) {
    return `<section class="tool-panel">
        <header class="tool-panel-head">
            <span class="tool-panel-icon">${icon}</span>
            <h2>${title}</h2>
        </header>
        <div class="tool-panel-body">${content}</div>
    </section>`;
}

export const ADMIN_CSS = '<link rel="stylesheet" href="/css/admin.css">';
