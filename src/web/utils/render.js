import { escapeHtml } from './render.js';

export function pageShell({
    title, body, extraCss = '', extraJs = '', bodyClass = '', includeNav = true, locale = 'en', description = '',
}) {
    const navScript = includeNav ? '<script src="/js/nav.js" defer></script>' : '';
    const htmlLang = locale === 'fr' ? 'fr' : 'en';
    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#050508">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="icon" href="/img/favicon.ico" type="image/x-icon">
    <link rel="apple-touch-icon" href="/img/favicon.ico">
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/peaxel.css">
    ${extraCss}
</head>
<body class="${bodyClass}">
${body}
${navScript}
${extraJs}
</body>
</html>`;
}

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
