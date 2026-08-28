import { adminUrl } from '../services/adminPath.js';
import { adminBrand } from './branding.js';

/**
 * Sidebar partagée du panel admin v2.
 * @param {string} active — '' | '/analytics' | '/feedbacks'
 */
export function adminSidebar(active, base = adminUrl('')) {
    const navLink = (path, label, icon, abs = false) => {
        const href = abs ? path : `${base}${path}`;
        const isActive = abs ? active === path : (active === path || (path === '' && active === ''));
        return `<a href="${href}" class="${isActive ? 'active' : ''}">${icon} ${label}</a>`;
    };

    return `
        <aside class="admin-sidebar">
            <div class="sidebar-header">
                ${adminBrand()}
                <button type="button" class="nav-toggle sidebar-toggle" aria-label="Menu admin" aria-expanded="false" data-nav-toggle>
                    <span></span><span></span><span></span>
                </button>
            </div>
            <nav class="admin-nav" data-nav-menu>
                ${navLink('', 'Overview', '📊')}
                ${navLink('/analytics', 'Analytics', '📈', true)}
                ${navLink('/feedbacks', 'Feedbacks', '💬', true)}
                <a href="${base}/logout" class="nav-logout">🚪 Déconnexion</a>
            </nav>
        </aside>`;
}
