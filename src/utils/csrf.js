import crypto from 'crypto';

/**
 * Génère ou récupère le token CSRF de session (formulaires authentifiés).
 */
export function getCsrfToken(session) {
    if (!session.csrfToken) {
        session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return session.csrfToken;
}

/**
 * Token CSRF one-shot pour la page de login.
 */
export function getLoginCsrfToken(session) {
    session.loginCsrf = crypto.randomBytes(32).toString('hex');
    return session.loginCsrf;
}

export function csrfInput(session) {
    return `<input type="hidden" name="_csrf" value="${getCsrfToken(session)}">`;
}

export function loginCsrfInput(session) {
    return `<input type="hidden" name="_csrf" value="${getLoginCsrfToken(session)}">`;
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
 * Valide le token CSRF de la page de login.
 */
export function validateLoginCsrf(req, res, next) {
    const token = req.body?._csrf;
    if (!token || !req.session?.loginCsrf || token !== req.session.loginCsrf) {
        return res.status(403).send('Requête refusée : token CSRF invalide.');
    }
    delete req.session.loginCsrf;
    next();
}

/**
 * Initialise le token CSRF après connexion réussie.
 */
export function initSessionCsrf(session) {
    session.csrfToken = crypto.randomBytes(32).toString('hex');
}
