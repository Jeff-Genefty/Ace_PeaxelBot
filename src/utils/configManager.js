import fs from 'fs';
import { resolve } from 'path';

// Pointing to the new static location in src/config (tracked by Git)
const CONFIG_FILE = resolve('./src/config/config.json');

const defaultConfig = {
    channels: {
        announce: null,
        spotlight: null,
        feedback: null,
        logs: null,
        welcome: null 
    }
};

/**
 * Loads configuration from the static config file
 * @returns {Object}
 */
export function getConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            // Return default if file doesn't exist yet
            return defaultConfig;
        }
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        
        return {
            ...defaultConfig,
            ...parsed,
            channels: { ...defaultConfig.channels, ...parsed.channels }
        };
    } catch (e) {
        console.error('[Config Manager] Error reading file:', e.message);
        return defaultConfig;
    }
}

/**
 * Gets a specific channel ID by type
 * @param {string} type 
 * @returns {string|null}
 */
export function getChannel(type) {
    const config = getConfig();
    return config.channels?.[type] || null;
}

/**
 * Updates a channel ID in the config file
 * Note: Since this is in src/config, it will update the local file.
 * On Railway, manual changes via commands might not persist between deployments 
 * if you don't commit them to Git.
 * @param {string} type 
 * @param {string} channelId 
 * @returns {boolean}
 */
export function setChannel(type, channelId) {
    try {
        const config = getConfig();
        if (!config.channels) config.channels = {};
        config.channels[type] = channelId;
        
        // Ensure the directory exists
        const dir = resolve('./src/config');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`[Config Manager] ✅ Updated ${type} to ${channelId}`);
        return true;
    } catch (error) {
        console.error('[Config Manager] ❌ Error saving config:', error.message);
        return false;
    }
}