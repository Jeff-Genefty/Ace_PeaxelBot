import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, '../../data/config.json');

// Valeurs par défaut (au cas où le fichier est vide)
const defaultConfig = {
    channels: {
        announce: null,
        spotlight: null,
        feedback: null,
        logs: null
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

export function setChannel(type, channelId) {
    const config = getConfig();
    config.channels[type] = channelId;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
}