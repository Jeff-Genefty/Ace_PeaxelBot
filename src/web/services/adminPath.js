/**
 * Chemin secret du panel admin — non listé, non lié depuis le site public.
 * Définir ADMIN_PANEL_PATH en production (ex: ace-staff-x7k2m9).
 */
export function getAdminPath() {
    return process.env.ADMIN_PANEL_PATH || 'staff-console';
}

export function adminUrl(subpath = '') {
    const base = `/${getAdminPath()}`;
    if (!subpath) return base;
    return `${base}${subpath.startsWith('/') ? subpath : `/${subpath}`}`;
}
