import { escapeHtml } from './render.js';

/** Ruban défilant GW en haut du site (lineups ouverts / closing). */
export function renderGwTicker({ t, gw }) {
    if (!gw.isLineupOpen) return '';

    const phaseLabel = t(`gw.phase.${gw.phase}`);
    const title = t('gw.liveTitle', { n: gw.gameweek });
    const desc = t(`gw.desc.${gw.phase}`);
    const deadlinePrefix = t('gw.deadlineLabel');

    const items = [
        `<strong>${escapeHtml(phaseLabel)}</strong>`,
        `<strong>${escapeHtml(title)}</strong>`,
        escapeHtml(desc),
        `<span class="gw-ticker-deadline">${escapeHtml(deadlinePrefix)} <span data-countdown>${escapeHtml(t('gw.loading'))}</span></span>`,
    ];

    const segment = items.map((item) => `<span class="gw-ticker-item">${item}</span>`).join('<span class="gw-ticker-sep" aria-hidden="true">•</span>');
    const track = `${segment}<span class="gw-ticker-sep" aria-hidden="true">•</span>${segment}`;

    return `
    <div class="gw-ticker" data-gw-countdown="${gw.deadlineUnix}" role="marquee" aria-live="polite">
        <div class="gw-ticker-viewport">
            <div class="gw-ticker-track">${track}</div>
        </div>
    </div>`;
}

export function renderAppCheckin({ t, gw, checkedIn, csrf }) {
    if (checkedIn) {
        return `<p class="gw-checkin-done app-checkin-banner">${t('gw.checkinDone')}</p>`;
    }
    return `
    <form action="/app/checkin" method="POST" class="app-checkin-banner">
        ${csrf}
        <button type="submit" class="btn btn-primary btn-sm"${gw.isLineupOpen ? '' : ' disabled'}>${t('gw.checkinCta')}</button>
    </form>`;
}

export function renderGiveawayStrip({ t, giveaway }) {
    if (giveaway.status !== 'open') return '';

    return `
    <aside class="giveaway-strip" ${giveaway.closesAt ? `data-gw-countdown="${Math.floor(Date.parse(giveaway.closesAt) / 1000)}"` : ''}>
        <span class="giveaway-strip-icon">🎟️</span>
        <div>
            <strong>${t('giveaway.liveTitle')}</strong>
            <p>${t('giveaway.liveDesc', { count: giveaway.participantCount })}</p>
        </div>
        <a href="https://discord.gg/PNyAqI8hio" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">${t('giveaway.joinDiscord')}</a>
    </aside>`;
}

export function renderHeroCarousel(cards) {
    if (!cards.length) return '';
    const slides = cards.map((c, i) => `
        <div class="hero-carousel-slide${i === 0 ? ' is-active' : ''}" data-slide="${i}">
            <img src="${escapeHtml(c.url)}" alt="" loading="lazy" decoding="async" width="120" height="168" class="img-blur-load">
        </div>`).join('');

    return `
    <div class="hero-carousel" aria-hidden="true">
        <div class="hero-carousel-track">${slides}</div>
    </div>`;
}

export function renderLinkStatus({ t, link, csrf, error, success }) {
    if (link) {
        return `
        <div class="link-status link-status-ok">
            <h2>${t('link.linkedTitle')}</h2>
            <p>${t('link.linkedDesc')}</p>
            <dl class="link-dl">
                <dt>${t('link.peaxelUsername')}</dt>
                <dd>${escapeHtml(link.peaxelUsername || t('link.notSet'))}</dd>
                <dt>${t('link.linkedAt')}</dt>
                <dd>${escapeHtml(new Date(link.linkedAt).toLocaleString())}</dd>
            </dl>
            <form action="/link/username" method="POST" class="link-form">${csrf}
                <label>${t('link.updateUsername')}</label>
                <input type="text" name="peaxelUsername" value="${escapeHtml(link.peaxelUsername || '')}" maxlength="64" placeholder="${t('link.usernamePh')}">
                <button type="submit" class="btn btn-primary btn-sm">${t('link.save')}</button>
            </form>
        </div>`;
    }

    return `
    <div class="link-status">
        ${error ? `<div class="alert alert-error">${t(`link.error.${error}`)}</div>` : ''}
        ${success ? `<div class="alert alert-info">${t('link.success')}</div>` : ''}
        <h2>${t('link.title')}</h2>
        <p>${t('link.desc')}</p>
        <ol class="link-steps">
            <li>${t('link.step1')}</li>
            <li>${t('link.step2')}</li>
            <li>${t('link.step3')}</li>
        </ol>
        <form action="/link/verify" method="POST" class="link-form">${csrf}
            <label>${t('link.codeLabel')}</label>
            <input type="text" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="000000" autocomplete="one-time-code">
            <label>${t('link.usernameOptional')}</label>
            <input type="text" name="peaxelUsername" maxlength="64" placeholder="${t('link.usernamePh')}">
            <button type="submit" class="btn btn-primary">${t('link.verify')}</button>
        </form>
    </div>`;
}
