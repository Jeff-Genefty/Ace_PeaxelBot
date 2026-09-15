/**
 * Locale Discord (interaction.locale / guildLocale) → 'fr' | 'en'
 */
export function discordLang(locale) {
    const raw = String(locale || '').toLowerCase();
    return raw.startsWith('fr') ? 'fr' : 'en';
}

export function pick(locale, en, fr) {
    return discordLang(locale) === 'fr' ? fr : en;
}
