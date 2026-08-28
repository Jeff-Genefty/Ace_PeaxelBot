import express from 'express';
import { DEFAULT_LOCALE, LOCALES, setLocaleCookie } from '../i18n/index.js';

const router = express.Router();

router.get('/:locale', (req, res) => {
    const locale = req.params.locale;
    if (!LOCALES.includes(locale)) {
        return res.redirect(req.query.return ? decodeURIComponent(req.query.return) : '/');
    }

    const isProd = process.env.NODE_ENV === 'production';
    setLocaleCookie(res, locale, isProd);

    let returnTo = '/';
    if (req.query.return) {
        try {
            returnTo = decodeURIComponent(req.query.return);
            if (!returnTo.startsWith('/')) returnTo = '/';
        } catch {
            returnTo = '/';
        }
    }

    res.redirect(returnTo);
});

export default router;
