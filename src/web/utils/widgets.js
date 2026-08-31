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
