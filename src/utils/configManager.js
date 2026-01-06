import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, '../../data/config.json');

const defaultConfig = {
    channels: {
        announce: null,
        spotlight: null,
        feedback: null,
        logs: null,
        welcome: null 
    }
};

export function getConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            console.log('[Config] File not found, using default');
            return defaultConfig;
        }
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        
        // FUSION : On s'assure que l'objet retourné a TOUJOURS la structure defaultConfig
        return {
            ...defaultConfig,
            ...parsed,
            channels: { ...defaultConfig.channels, ...parsed.channels }
        };
    } catch (e) {
        console.error('[Config] Error reading file:', e.message);
        return defaultConfig;
    }
}

export function getChannel(type) {
    const config = getConfig();
    // Utilisation de l'optional chaining pour éviter les erreurs si channels est indéfini
    return config.channels?.[type] || null;
}

export function setChannel(type, channelId) {
    const config = getConfig();
    if (!config.channels) config.channels = {};
    config.channels[type] = channelId;
    
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`[Config] Saved channel ${type}: ${channelId}`);
    return true;
}