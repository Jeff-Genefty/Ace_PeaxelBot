import fs, { readFileSync } from 'fs';
import crypto from 'crypto';
import { join, resolve } from 'path';
import { updateJsonSync } from '../../utils/jsonStore.js';

const LINKS_FILE = join(resolve('./data'), 'account_links.json');
const CODES_FILE = join(resolve('./data'), 'link_codes.json');
const CODE_TTL_MS = 10 * 60 * 1000;

function cleanExpiredCodes(codes) {
    const now = Date.now();
    return Object.fromEntries(
        Object.entries(codes).filter(([, v]) => v.expiresAt > now),
    );
}

export function generateLinkCode(discordId, discordTag) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const payload = {
        discordId,
        discordTag,
        expiresAt: Date.now() + CODE_TTL_MS,
        createdAt: new Date().toISOString(),
    };
    updateJsonSync(CODES_FILE, {}, (codes) => {
        const cleaned = cleanExpiredCodes(codes);
        cleaned[code] = payload;
        return cleaned;
    });
    return { code, expiresInMinutes: CODE_TTL_MS / 60000 };
}

export function verifyLinkCode(code, discordId, peaxelUsername = '') {
    const normalized = String(code || '').trim();
    if (!/^\d{6}$/.test(normalized)) {
        return { ok: false, error: 'INVALID_CODE' };
    }

    let matched = null;
    updateJsonSync(CODES_FILE, {}, (codes) => {
        const cleaned = cleanExpiredCodes(codes);
        matched = cleaned[normalized] || null;
        if (matched && matched.discordId === discordId) {
            delete cleaned[normalized];
        }
        return cleaned;
    });

    if (!matched) return { ok: false, error: 'CODE_NOT_FOUND' };
    if (matched.discordId !== discordId) return { ok: false, error: 'CODE_MISMATCH' };

    const link = {
        discordId,
        discordTag: matched.discordTag,
        peaxelUsername: String(peaxelUsername || '').trim().slice(0, 64),
        linkedAt: new Date().toISOString(),
        method: 'discord_code',
    };

    updateJsonSync(LINKS_FILE, {}, (links) => {
        links[discordId] = link;
        return links;
    });

    return { ok: true, link };
}

export function getAccountLink(discordId) {
    if (!fs.existsSync(LINKS_FILE)) return null;
    try {
        const links = JSON.parse(readFileSync(LINKS_FILE, 'utf-8'));
        return links[discordId] || null;
    } catch {
        return null;
    }
}

export function updatePeaxelUsername(discordId, peaxelUsername) {
    const username = String(peaxelUsername || '').trim().slice(0, 64);
    if (!username) return { ok: false, error: 'EMPTY_USERNAME' };

    let updated = null;
    updateJsonSync(LINKS_FILE, {}, (links) => {
        if (!links[discordId]) return links;
        links[discordId] = { ...links[discordId], peaxelUsername, updatedAt: new Date().toISOString() };
        updated = links[discordId];
        return links;
    });
    return updated ? { ok: true, link: updated } : { ok: false, error: 'NOT_LINKED' };
}

export function unlinkAccount(discordId) {
    updateJsonSync(LINKS_FILE, {}, (links) => {
        delete links[discordId];
        return links;
    });
    return { ok: true };
}
