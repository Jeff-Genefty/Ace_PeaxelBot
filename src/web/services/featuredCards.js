/** Cartes officielles Peaxel — format 2026 (media.peaxel.me) */
const TA3_BASE = 'https://media.peaxel.me';

const SITE_CARDS = [
    { url: `${TA3_BASE}/pxl_CroinTa_2026.png`, name: 'Victor Crouin' },
    { url: `${TA3_BASE}/pxl_major3_2026.png`, name: 'TheMajorBMX' },
    { url: `${TA3_BASE}/pxl_claudia__2026.png`, name: 'Claudia León' },
    { url: `${TA3_BASE}/pxl_dariiata_2026.png`, name: 'Dariia Bulay' },
    { url: `${TA3_BASE}/pxl_tphy_2026.png`, name: 'Tumi Phillips' },
    { url: `${TA3_BASE}/pxl_shah_ta3_2026.png`, name: 'Shahmalarani Chandran' },
    { url: `${TA3_BASE}/pxl_gregorio_2026.png`, name: 'Gregorio Pugliese' },
    { url: `${TA3_BASE}/pxl_fernando_2026.png`, name: 'Fernando' },
    { url: `${TA3_BASE}/pxl_amy_2026.png`, name: 'Amy Rainbow Skates' },
    { url: `${TA3_BASE}/pxl_han_2026.png`, name: 'Master Han' },
    { url: `${TA3_BASE}/pxl_melnyk_2026.png`, name: 'Tetyana Melnyk' },
    { url: `${TA3_BASE}/pxl_meyer_2026.png`, name: 'Kevin Meyer' },
    { url: `${TA3_BASE}/pxl_shauna_2026.png`, name: 'Shauna O\'Keeffe' },
    { url: `${TA3_BASE}/pxl_somi_2026.png`, name: 'Somi Romdhani' },
    { url: `${TA3_BASE}/pxl_tomic_2026.png`, name: 'Tomic 13' },
];

export function getFeaturedCards(count = 8) {
    if (!SITE_CARDS.length) return [];
    const limit = Math.min(count, SITE_CARDS.length);
    return SITE_CARDS.slice(0, limit);
}
