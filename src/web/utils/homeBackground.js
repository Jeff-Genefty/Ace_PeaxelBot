import { escapeHtml } from './render.js';

export function renderHomeBackground(cards) {
    const cardHtml = cards.map((c, i) => `
        <div class="home-float-card home-float-card-${i + 1}">
            <div class="home-float-card-inner">
                <img src="${escapeHtml(c.url)}" alt="" loading="lazy" decoding="async" width="140" height="196" class="img-blur-load">
            </div>
        </div>`).join('');

    return `
    <div class="home-bg" aria-hidden="true">
        <div class="home-bg-orb home-bg-orb-1"></div>
        <div class="home-bg-orb home-bg-orb-2"></div>
        <div class="home-bg-orb home-bg-orb-3"></div>
        <div class="home-bg-shimmer"></div>
        <div class="home-bg-grid"></div>
        <div class="home-bg-cards">${cardHtml}</div>
    </div>`;
}
