import { escapeHtml } from './render.js';

export function renderGameweekLive({ t, gw, checkinCount, checkedIn, showCheckin = false, csrf = '' }) {
    const phaseLabel = t(`gw.phase.${gw.phase}`);
    const countdownTarget = gw.isLineupOpen ? gw.deadlineUnix : gw.nextOpeningUnix;
    const countdownLabel = gw.isLineupOpen ? t('gw.deadlineLabel') : t('gw.nextOpenLabel');

    const checkinBlock = showCheckin ? (checkedIn
        ? `<p class="gw-checkin-done">${t('gw.checkinDone')}</p>`
        : `<form action="/app/checkin" method="POST" class="gw-checkin-form">${csrf}
                <button type="submit" class="btn btn-primary btn-sm"${gw.isLineupOpen ? '' : ' disabled'}>${t('gw.checkinCta')}</button>
           </form>`) : '';

    return `
    <section class="gw-live" data-gw-countdown="${countdownTarget}">
        <div class="gw-live-glow" aria-hidden="true"></div>
        <div class="gw-live-inner">
            <div class="gw-live-head">
                <span class="gw-live-badge gw-phase-${escapeHtml(gw.phase)}">${phaseLabel}</span>
                <h2>${t('gw.liveTitle', { n: gw.gameweek })}</h2>
            </div>
            <p class="gw-live-desc">${t(`gw.desc.${gw.phase}`)}</p>
            <div class="gw-live-meta">
                <div class="gw-countdown">
                    <span class="gw-countdown-label">${countdownLabel}</span>
                    <span class="gw-countdown-value" data-countdown>${t('gw.loading')}</span>
                </div>
                <div class="gw-checkins">
                    <span class="gw-checkins-value">${checkinCount}</span>
                    <span class="gw-checkins-label">${t('gw.checkins')}</span>
                </div>
            </div>
            <div class="gw-live-actions">
                <a href="https://game.peaxel.me" class="btn btn-primary" target="_blank" rel="noopener">${t('gw.playCta')}</a>
                ${checkinBlock}
            </div>
        </div>
    </section>`;
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
