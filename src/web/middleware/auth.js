import { adminUrl } from '../services/adminPath.js';

export function requireDiscordUser(req, res, next) {
    if (req.session.discordUser) return next();
    res.redirect('/?login=required');
}

export function requireAdmin(req, res, next) {
    if (req.session.admin) return next();
    res.redirect(adminUrl('/login'));
}

/** Bloque l'accès si quelqu'un tente d'accéder sans être admin (404 pour obscurcir). */
export function requireAdminApi(req, res, next) {
    if (req.session.admin) return next();
    res.status(404).json({ error: 'Not found' });
}
