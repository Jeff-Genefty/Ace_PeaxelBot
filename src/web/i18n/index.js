import en from './en.js';
import fr from './fr.js';

export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en', 'fr'];
const COOKIE_NAME = 'peaxel_lang';

const dictionaries = { en, fr };

function getNested(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

export function translate(locale, key, vars = {}) {
    const dict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
    let str = getNested(dict, key);
    if (str === undefined) {
        str = getNested(dictionaries[DEFAULT_LOCALE], key) ?? key;
    }
    if (typeof str !== 'string') return key;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function resolveLocale(req) {
    const fromCookie = req.cookies?.[COOKIE_NAME];
    if (fromCookie && LOCALES.includes(fromCookie)) return fromCookie;

    const fromQuery = req.query?.lang;
    if (fromQuery && LOCALES.includes(fromQuery)) return fromQuery;

    const accept = req.headers['accept-language'];
    if (accept?.toLowerCase().startsWith('fr')) return 'fr';

    return DEFAULT_LOCALE;
}

export function attachI18n(req, res, next) {
    const locale = resolveLocale(req);
    req.locale = locale;
    req.t = (key, vars) => translate(locale, key, vars);
    next();
}

export function setLocaleCookie(res, locale, isProd) {
    res.cookie(COOKIE_NAME, locale, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
    });
}

export function langSwitcher(returnPath, locale, t) {
    const path = encodeURIComponent(returnPath || '/');
    const mk = (code) => {
        const active = locale === code ? ' is-active' : '';
        return `<a href="/lang/${code}?return=${path}" class="lang-btn${active}" hreflang="${code}">${t(`lang.${code}`)}</a>`;
    };
    return `<div class="lang-switch" aria-label="${t('lang.label')}">${mk('en')}${mk('fr')}</div>`;
}

export function localeDateString(date, locale) {
    return new Date(date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US');
}
