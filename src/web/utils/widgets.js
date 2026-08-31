import { escapeHtml } from './render.js';

function buildTickerRun({ phaseLabel, title, desc, deadlinePrefix, loading }) {
    const sep = '<span class="gw-ticker-sep" aria-hidden="true">•</span>';
    return [
        `<span class="gw-ticker-item"><strong>${escapeHtml(phaseLabel)}</strong></span>`,
        `<span class="gw-ticker-item"><strong>${escapeHtml(title)}</strong></span>`,
        `<span class="gw-ticker-item">${escapeHtml(desc)}</span>`,
        `<span class="gw-ticker-item gw-ticker-deadline">${escapeHtml(deadlinePrefix)} <span data-countdown>${escapeHtml(loading)}</span></span>`,
    ].join(sep);
}

/** Ruban défilant GW — une seule ligne, défile gauche → droite. */
export function renderGwTicker({ t, gw }) {
    if (!gw.isLineupOpen) return '';

    const run = buildTickerRun({
        phaseLabel: t(`gw.phase.${gw.phase}`),
        title: t('gw.liveTitle', { n: gw.gameweek }),
        desc: t(`gw.desc.${gw.phase}`),
        deadlinePrefix: t('gw.deadlineLabel'),
        loading: t('gw.loading'),
    });

    return `
    <div class="gw-ticker" data-gw-countdown="${gw.deadlineUnix}" role="marquee" aria-label="${escapeHtml(t('gw.liveTitle', { n: gw.gameweek }))}">
        <div class="gw-ticker-viewport">
            <div class="gw-ticker-track">
                <span class="gw-ticker-run">${run}</span>
                <span class="gw-ticker-run" aria-hidden="true">${run}</span>
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
