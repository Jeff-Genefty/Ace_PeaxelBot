import { AttachmentBuilder } from 'discord.js';
import { resolve } from 'path';
import fs from 'fs';

const ASSETS = resolve(process.cwd(), 'assets');

const FOOTERS = {
    daily: 'hub-footer-daily.png',
    rank: 'hub-footer-rank.png',
    podium: 'hub-footer-podium.png',
    pass: 'hub-footer-pass.png',
};

/**
 * Bannière Peaxel pour le bas d'un embed Discord.
 * @param {'daily'|'rank'|'podium'|'pass'} kind
 * @returns {{ file: AttachmentBuilder, imageName: string } | null}
 */
export function getHubFooterAttachment(kind = 'pass') {
    const filename = FOOTERS[kind] || FOOTERS.pass;
    const path = resolve(ASSETS, filename);
    if (!fs.existsSync(path)) return null;
    return {
        file: new AttachmentBuilder(path, { name: filename }),
        imageName: filename,
    };
}

/** Applique setImage + retourne le fichier à joindre (ou null). */
export function applyHubFooter(embed, kind = 'pass') {
    const asset = getHubFooterAttachment(kind);
    if (!asset) return null;
    embed.setImage(`attachment://${asset.imageName}`);
    return asset.file;
}
