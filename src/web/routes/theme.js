import express from 'express';
import { DEFAULT_THEME, THEMES, setThemeCookie } from '../i18n/index.js';

const router = express.Router();

router.get('/:theme', (req, res) => {
    const theme = req.params.theme;
    if (!THEMES.includes(theme)) {
        return res.redirect(req.query.return ? decodeURIComponent(req.query.return) : '/');
    }

    const isProd = process.env.NODE_ENV === 'production';
    setThemeCookie(res, theme, isProd);

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
