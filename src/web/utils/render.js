export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const DEFAULT_OG_IMAGE = '/img/favicon.ico';

export function pageShell({
    title,
    body,
    extraCss = '',
    extraJs = '',
    bodyClass = '',
    includeNav = true,
    locale = 'en',
    theme = 'dark',
    description = '',
    ogImage = DEFAULT_OG_IMAGE,
    ogUrl = '',
    ogType = 'website',
}) {
    const navScript = includeNav ? '<script src="/js/nav.js" defer></script>' : '';
    const themeScript = '<script src="/js/theme.js" defer></script>';
    const htmlLang = locale === 'fr' ? 'fr' : 'en';
    const themeClass = theme === 'light' ? 'theme-light' : '';
    const fullBodyClass = [bodyClass, themeClass].filter(Boolean).join(' ');
    const baseUrl = process.env.WEB_BASE_URL || '';
    const canonical = ogUrl || baseUrl || '';
    const imageUrl = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;

    return `<!DOCTYPE html>
<html lang="${htmlLang}" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="${theme === 'light' ? '#f0f4ff' : '#050508'}">
    <meta name="description" content="${escapeHtml(description)}">
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    ${canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <link rel="icon" href="/img/favicon.ico" type="image/x-icon">
    <link rel="apple-touch-icon" href="/img/favicon.ico">
    <link rel="manifest" href="/manifest.webmanifest">
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/peaxel.css">
    ${extraCss}
</head>
<body class="${fullBodyClass}">
${body}
${navScript}
${themeScript}
${extraJs}
</body>
</html>`;
}
