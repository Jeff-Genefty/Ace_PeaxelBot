import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { updateJsonSync } from '../../utils/jsonStore.js';

const CHECKINS_FILE = join(resolve('./data'), 'gw_checkins.json');

function checkinKey(discordId, gameweek) {
    return `${discordId}_${gameweek}`;
}

export function hasCheckedIn(discordId, gameweek) {
    if (!fs.existsSync(CHECKINS_FILE)) return false;
    try {
        const data = JSON.parse(readFileSync(CHECKINS_FILE, 'utf-8'));
        return Boolean(data[checkinKey(discordId, gameweek)]);
    } catch {
        return false;
    }
}

export function recordCheckin(discordId, gameweek, discordTag = '') {
    const key = checkinKey(discordId, gameweek);
    const entry = {
        discordId,
        gameweek,
        discordTag,
        checkedAt: new Date().toISOString(),
    };
    updateJsonSync(CHECKINS_FILE, {}, (data) => {
        data[key] = entry;
        return data;
    });
    return entry;
}

export function getCheckinCount(gameweek) {
    if (!fs.existsSync(CHECKINS_FILE)) return 0;
    try {
        const data = JSON.parse(readFileSync(CHECKINS_FILE, 'utf-8'));
        return Object.values(data).filter((c) => c.gameweek === gameweek).length;
    } catch {
        return 0;
    }
}
