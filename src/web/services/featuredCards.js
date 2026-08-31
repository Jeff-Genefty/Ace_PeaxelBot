/** Cartes officielles Peaxel (media.peaxel.me) — liste fixe, alignée sur le hub / peaxel.me */
const SITE_CARDS = [
    { url: 'https://media.peaxel.me/claudialeon.png', name: 'claudialeon' },
    { url: 'https://media.peaxel.me/yoong.png', name: 'yoong' },
    { url: 'https://media.peaxel.me/kaiza.png', name: 'kaiza' },
    { url: 'https://media.peaxel.me/domiger.png', name: 'domikiger' },
    { url: 'https://media.peaxel.me/evansantangel.png', name: 'evansantangelo' },
    { url: 'https://media.peaxel.me/kubicek.png', name: 'kubicek' },
    { url: 'https://media.peaxel.me/overbeek.png', name: 'jamie_overbeek' },
    { url: 'https://media.peaxel.me/crouin.png', name: 'victor_crouin' },
];

export function getFeaturedCards(count = 8) {
    return SITE_CARDS.slice(0, count);
}
