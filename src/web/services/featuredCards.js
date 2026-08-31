import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ATHLETES_FILE = join(dirname(fileURLToPath(import.meta.url)), '../../config/athletes.json');

const FALLBACK_CARDS = [
    'https://media.peaxel.me/yoong.png',
    'https://media.peaxel.me/kaiza.png',
    'https://media.peaxel.me/claudialeon.png',
    'https://media.peaxel.me/domiger.png',
    'https://media.peaxel.me/evansantangel.png',
    'https://media.peaxel.me/kubicek.png',
];

/** Sélection stable de cartes athlètes pour le décor de la homepage. */
export function getFeaturedCards(count = 8) {
    let athletes = [];
    try {
        athletes = JSON.parse(readFileSync(ATHLETES_FILE, 'utf-8'));
    } catch {
        return FALLBACK_CARDS.slice(0, count).map((url, i) => ({ url, name: `card-${i}` }));
    }

    const withCards = athletes.filter((a) => a.talent_card_image_url);
    if (!withCards.length) {
        return FALLBACK_CARDS.slice(0, count).map((url, i) => ({ url, name: `card-${i}` }));
    }

    const picked = [];
    const step = Math.max(1, Math.floor(withCards.length / count));
    for (let i = 0; i < withCards.length && picked.length < count; i += step) {
        picked.push({ url: withCards[i].talent_card_image_url, name: withCards[i].name });
    }
    for (const a of withCards) {
        if (picked.length >= count) break;
        if (!picked.some((p) => p.url === a.talent_card_image_url)) {
            picked.push({ url: a.talent_card_image_url, name: a.name });
        }
    }
    return picked.slice(0, count);
}
