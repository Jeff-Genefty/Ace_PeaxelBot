import { escapeHtml } from './render.js';

function buildTickerGroup({ t, gw, phaseLabel, title, desc, deadlinePrefix }) {
    const items = [
        `<span class="gw-ticker-item"><strong>${escapeHtml(phaseLabel)}</strong></span>`,
        `<span class="gw-ticker-item"><strong>${escapeHtml(title)}</strong></span>`,
        `<span class="gw-ticker-item">${escapeHtml(desc)}</span>`,
        `<span class="gw-ticker-item gw-ticker-deadline">${escapeHtml(deadlinePrefix)} <span data-countdown>${escapeHtml(t('gw.loading'))}</span></span>`,
    ];
    return items.join('<span class="gw-ticker-sep" aria-hidden="true">•</span>');
}

/** Ruban défilant GW en haut du site (lineups ouverts / closing). */
export function renderGwTicker({ t, gw }) {
    if (!gw.isLineupOpen) return '';

    const phaseLabel = t(`gw.phase.${gw.phase}`);
    const title = t('gw.liveTitle', { n: gw.gameweek });
    const desc = t(`gw.desc.${gw.phase}`);
    const deadlinePrefix = t('gw.deadlineLabel');
    const payload = { t, gw, phaseLabel, title, desc, deadlinePrefix };
    const group = buildTickerGroup(payload);

    return `
    <div class="gw-ticker" data-gw-countdown="${gw.deadlineUnix}" role="marquee" aria-live="polite">
        <div class="gw-ticker-viewport">
            <div class="gw-ticker-track">
                <div class="gw-ticker-group">${group}</div>
                <div class="gw-ticker-group" aria-hidden="true">${group}</div>
            </div>
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
