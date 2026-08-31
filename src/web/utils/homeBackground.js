import { escapeHtml } from './render.js';

/** Ratio cartes TA3 ~ 5:7 */
const CARD_W = 160;
const CARD_H = 224;

export function renderHomeBackground(cards) {
    const cardHtml = cards.map((c, i) => `
        <div class="home-float-card home-float-card-${i + 1}">
            <div class="home-float-card-inner">
                <img src="${escapeHtml(c.url)}" alt="" loading="lazy" decoding="async" width="${CARD_W}" height="${CARD_H}" class="img-blur-load ta3-card">
            </div>
        </div>`).join('');

    return `
    <div class="home-bg" aria-hidden="true">
        <div class="home-bg-orb home-bg-orb-1"></div>
        <div class="home-bg-orb home-bg-orb-2"></div>
        <div class="home-bg-orb home-bg-orb-3"></div>
        <div class="home-bg-shimmer"></div>
        <div class="home-bg-vignette"></div>
        <div class="home-bg-cards">${cardHtml}</div>
    </div>`;
}
