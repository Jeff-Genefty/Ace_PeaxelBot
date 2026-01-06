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
        if (!fs.existsSync(CONFIG_FILE)) return defaultConfig;
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return defaultConfig;
    }
}

export function getChannel(type) {
    const config = getConfig();
    return config.channels[type] || null;
}

export function setChannel(type, channelId) {
    const config = getConfig();
    if (!config.channels) config.channels = {}; // Sécurité
    config.channels[type] = channelId;
    
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
}