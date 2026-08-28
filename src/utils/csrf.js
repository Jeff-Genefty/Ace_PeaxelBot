import crypto from 'crypto';

const LOGIN_CSRF_COOKIE = 'login_csrf';

/**
 * Génère ou récupère le token CSRF de session (formulaires authentifiés).
 */
export function getCsrfToken(session) {
    if (!session.csrfToken) {
        session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return session.csrfToken;
}

export function createLoginCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function csrfInput(session) {
    return `<input type="hidden" name="_csrf" value="${getCsrfToken(session)}">`;
}

export function loginCsrfInput(token) {
    return `<input type="hidden" name="_csrf" value="${token}">`;
}

export function setLoginCsrfCookie(res, token, isProd) {
    res.cookie(LOGIN_CSRF_COOKIE, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
    });
}

/**
 * Valide le token CSRF sur les requêtes POST authentifiées.
 */
export function validateCsrf(req, res, next) {
    const token = req.body?._csrf;
    if (!token || !req.session?.csrfToken || token !== req.session.csrfToken) {
        return res.status(403).send('Requête refusée : token CSRF invalide.');
    }
    next();
}

/**
 * Valide le CSRF login via double-submit cookie (fiable derrière proxy Railway).
 */
export function validateLoginCsrf(req, res, next) {
    const bodyToken = req.body?._csrf;
    const cookieToken = req.cookies?.[LOGIN_CSRF_COOKIE];
    const isProd = process.env.NODE_ENV === 'production';

    if (!bodyToken || !cookieToken || bodyToken !== cookieToken) {
        return res.status(403).send('Requête refusée : token CSRF invalide.');
    }

    res.clearCookie(LOGIN_CSRF_COOKIE, { path: '/', secure: isProd, sameSite: 'lax' });
    next();
}

/**
 * Initialise le token CSRF après connexion réussie.
 */
export function initSessionCsrf(session) {
    session.csrfToken = crypto.randomBytes(32).toString('hex');
}
