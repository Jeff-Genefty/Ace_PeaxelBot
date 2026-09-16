/**
 * Liens Peaxel + tracking UTM (`ref`) pour attribution Discord → game.peaxel.me.
 */

export const GAME_BASE = 'https://game.peaxel.me';
export const ZEALY_URL = 'https://zealy.io/c/peaxel';
export const DOCS_URL = 'https://docs.peaxel.me';
export const SITE_URL = 'https://peaxel.me';
export const ACE_URL = 'https://ace.peaxel.me';
export const TRUSTPILOT_URL = 'https://www.trustpilot.com/review/peaxel.me';
export const FREE_CARDS_URL = 'https://peaxel.me/win-freecards-on-peaxel';

/** Refs Discord standards */
export const DISCORD_REFS = {
    welcome: 'discord_welcome',
    opening: 'discord_opening',
    closing: 'discord_closing',
    spotlight: 'discord_spotlight',
    daily: 'discord_daily',
    help: 'discord_help',
    howToPlay: 'discord_howtoplay',
    giveaway: 'discord_giveaway',
    reward: 'discord_ace_reward',
    reminder: 'discord_gw_reminder',
    faq: 'discord_faq',
    hub: 'discord_hub',
};

/**
 * URL jeu avec `?ref=` (+ params optionnels, ex. talent).
 * @param {string} [ref]
 * @param {Record<string, string>} [extra]
 */
export function gameUrl(ref, extra = {}) {
    const u = new URL(`${GAME_BASE}/`);
    if (ref) u.searchParams.set('ref', ref);
    for (const [key, value] of Object.entries(extra)) {
        if (value != null && value !== '') u.searchParams.set(key, String(value));
    }
    return u.toString();
}

/**
 * Ajoute `ref` à une URL game.peaxel.me sans écraser un ref existant.
 * Préserve `talent` et autres query params.
 */
export function withGameRef(url, ref) {
    if (!ref) return url || `${GAME_BASE}/`;
    try {
        const u = new URL(url || GAME_BASE, GAME_BASE);
        if (u.hostname !== 'game.peaxel.me') return url;
        if (!u.searchParams.has('ref')) u.searchParams.set('ref', ref);
        return u.toString();
    } catch {
        return gameUrl(ref);
    }
}

/** Remplace les liens game.peaxel.me dans un texte markdown / embed. */
export function applyGameRefsInText(text, ref) {
    if (!text || !ref) return text;
    return String(text).replace(
        /https:\/\/game\.peaxel\.me\/?(?:\?[^\s)\]>"']*)?/gi,
        (match) => withGameRef(match, ref),
    );
}
