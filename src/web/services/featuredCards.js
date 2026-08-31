/** Cartes officielles Peaxel — format TA3 2026 (media.peaxel.me) */
const TA3_BASE = 'https://media.peaxel.me';

const SITE_CARDS = [
    { url: `${TA3_BASE}/pxl_shah_ta3_2026.png`, name: 'Shahmalarani Chandran' },
];

export function getFeaturedCards(count = 8) {
    if (!SITE_CARDS.length) return [];
    const out = [];
    for (let i = 0; i < count; i++) {
        out.push(SITE_CARDS[i % SITE_CARDS.length]);
    }
    return out;
}
