import fs from 'fs';
import { resolve } from 'path';

const CONFIG_FILE = resolve('./src/config/config.json');

const ENV_CHANNEL_KEYS = {
    announce: 'ANNOUNCE_CHANNEL_ID',
    spotlight: 'SPOTLIGHT_CHANNEL_ID',
    welcome: 'WELCOME_CHANNEL_ID',
    feedback: 'FEEDBACK_CHANNEL_ID',
    logs: 'LOG_CHANNEL_ID',
    tickets: 'TICKET_CHANNEL_ID',
};

const ENV_ROLE_KEYS = {
    verified: 'VERIFIED_ROLE_ID',
    activityTrack: 'ACTIVITY_TRACK_ROLE_ID',
    mute: 'MUTE_ROLE_ID',
};

/** Rôle mute Ace (anti-spam chat) — défaut serveur Peaxel */
const DEFAULT_MUTE_ROLE_ID = '1369976254719070278';

/** Catégorie Discord des tickets claim cartes */
const DEFAULT_TICKET_CATEGORY_ID = '1369976260066803793';

/** Rôles staff autorisés dans les tickets claim + bouton close */
const DEFAULT_CLAIM_STAFF_ROLE_IDS = [
    '1370009354442379344',
    '1369985998913667123',
    '1369976254757081174',
];

const defaultConfig = {
    channels: {
        announce: null,
        spotlight: null,
        welcome: null,
        feedback: null,
        logs: null,
        tickets: null,
    },
    roles: {
        verified: null,
        activityTrack: null,
        mute: DEFAULT_MUTE_ROLE_ID,
        staffExcluded: [],
    },
    ticketCategoryId: DEFAULT_TICKET_CATEGORY_ID,
    claimStaffRoleIds: DEFAULT_CLAIM_STAFF_ROLE_IDS,
};

function loadFileConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return {};
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {
        console.error('[Config Manager] Error reading file:', e.message);
        return {};
    }
}

function parseStaffRoleIds() {
    const raw = process.env.STAFF_EXCLUDED_ROLE_IDS;
    if (!raw?.trim()) return null;
    return raw.split(',').map((id) => id.trim()).filter(Boolean);
}

function parseClaimStaffRoleIds(file) {
    const fromEnv = process.env.CLAIM_STAFF_ROLE_IDS;
    if (fromEnv?.trim()) {
        return fromEnv.split(',').map((id) => id.trim()).filter(Boolean);
    }
    if (Array.isArray(file.claimStaffRoleIds) && file.claimStaffRoleIds.length) {
        return file.claimStaffRoleIds;
    }
    return DEFAULT_CLAIM_STAFF_ROLE_IDS;
}

/**
 * Source unique de vérité : .env > config.json > null
 */
export function getConfig() {
    const file = loadFileConfig();

    const channels = { ...defaultConfig.channels };
    for (const [key, envKey] of Object.entries(ENV_CHANNEL_KEYS)) {
        channels[key] = process.env[envKey] || file.channels?.[key] || null;
    }

    const staffFromEnv = parseStaffRoleIds();
    const roles = {
        verified: process.env[ENV_ROLE_KEYS.verified] || file.roles?.verified || null,
        activityTrack: process.env[ENV_ROLE_KEYS.activityTrack] || file.roles?.activityTrack || null,
        mute: process.env[ENV_ROLE_KEYS.mute] || file.roles?.mute || DEFAULT_MUTE_ROLE_ID,
        staffExcluded: staffFromEnv ?? file.roles?.staffExcluded ?? [],
    };

    return {
        channels,
        roles,
        ticketCategoryId: process.env.TICKET_CATEGORY_ID || file.ticketCategoryId || DEFAULT_TICKET_CATEGORY_ID,
        claimStaffRoleIds: parseClaimStaffRoleIds(file),
    };
}

export function getChannel(type) {
    return getConfig().channels?.[type] || null;
}

export function getRole(type) {
    return getConfig().roles?.[type] || null;
}

export function getStaffExcludedRoles() {
    return getConfig().roles?.staffExcluded ?? [];
}

export function getMuteRoleId() {
    return getConfig().roles?.mute || DEFAULT_MUTE_ROLE_ID;
}

export function getTicketCategoryId() {
    return getConfig().ticketCategoryId || DEFAULT_TICKET_CATEGORY_ID;
}

export function getClaimStaffRoleIds() {
    return getConfig().claimStaffRoleIds || DEFAULT_CLAIM_STAFF_ROLE_IDS;
}

export function getTicketChannelId() {
    return getChannel('tickets');
}

export function requireChannel(type) {
    const id = getChannel(type);
    if (!id) throw new Error(`Missing channel config: ${type}`);
    return id;
}

/**
 * Met à jour config.json (dashboard /setup). Les .env gardent la priorité au runtime.
 */
export function setChannel(type, channelId) {
    try {
        const file = loadFileConfig();
        if (!file.channels) file.channels = {};
        file.channels[type] = channelId;

        const dir = resolve('./src/config');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(file, null, 2), 'utf-8');
        console.log(`[Config Manager] Updated ${type} → ${channelId}`);
        return true;
    } catch (error) {
        console.error('[Config Manager] Error saving config:', error.message);
        return false;
    }
}
