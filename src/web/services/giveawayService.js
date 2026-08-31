import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { updateJsonSync } from '../../utils/jsonStore.js';
import { getParisDate } from '../../utils/week.js';

const GIVEAWAYS_FILE = join(resolve('./data'), 'giveaways.json');

const EMPTY = {
    status: 'closed',
    participants: [],
    participantTags: [],
    openedAt: null,
    closesAt: null,
};

function readGiveawayRaw() {
    if (!fs.existsSync(GIVEAWAYS_FILE)) return { ...EMPTY };
    try {
        const data = JSON.parse(readFileSync(GIVEAWAYS_FILE, 'utf-8'));
        return { ...EMPTY, ...data };
    } catch {
        return { ...EMPTY };
    }
}

function inferOpenFromSchedule() {
    const paris = getParisDate();
    const day = paris.getUTCDay();
    const hour = paris.getUTCHours();
    if (day === 6 && hour >= 10) return true;
    if (day === 0 && hour < 20) return true;
    return false;
}

export function openGiveaway(source = 'manual') {
    const now = new Date();
    const closesAt = new Date(now);
    const paris = getParisDate();
    const day = paris.getUTCDay();
    if (day === 6) {
        closesAt.setUTCDate(closesAt.getUTCDate() + 1);
    }
    closesAt.setUTCHours(20, 0, 0, 0);

    const payload = {
        status: 'open',
        participants: [],
        participantTags: [],
        openedAt: now.toISOString(),
        closesAt: closesAt.toISOString(),
        source,
    };
    updateJsonSync(GIVEAWAYS_FILE, { ...EMPTY }, () => payload);
    return payload;
}

export function closeGiveaway() {
    updateJsonSync(GIVEAWAYS_FILE, { ...EMPTY }, (data) => ({
        ...data,
        status: 'closed',
        openedAt: data.openedAt,
        closesAt: data.closesAt,
    }));
}

export function joinGiveaway(userId, userTag) {
    return updateJsonSync(GIVEAWAYS_FILE, { ...EMPTY }, (data) => {
        if (!data.participants) data.participants = [];
        if (!data.participantTags) data.participantTags = [];
        if (data.participants.includes(userId)) throw new Error('ALREADY_JOINED');
        data.participants.push(userId);
        data.participantTags.push(userTag);
        if (!data.status || data.status === 'closed') {
            data.status = inferOpenFromSchedule() ? 'open' : 'closed';
        }
        return data;
    });
}

export function getGiveawayState(discordId = null) {
    const data = readGiveawayRaw();
    let status = data.status || 'closed';

    if (status === 'closed' && data.participants?.length && inferOpenFromSchedule()) {
        status = 'open';
    }
    if (status === 'open' && data.closesAt && Date.now() > Date.parse(data.closesAt)) {
        status = 'closed';
    }

    return {
        status,
        participantCount: data.participants?.length || 0,
        joined: discordId ? (data.participants || []).includes(discordId) : false,
        openedAt: data.openedAt,
        closesAt: data.closesAt,
    };
}

export function resetGiveawayParticipants() {
    return openGiveaway('reset');
}
