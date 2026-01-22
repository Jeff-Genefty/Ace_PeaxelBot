import fs from 'fs';
import { resolve } from 'path';

const STATS_FILE = resolve('./data/analytics.json');

// Initial stats structure
let stats = {
    messagesSent: 0,
    membersJoined: 0,
    membersLeft: 0,
    commandsExecuted: 0,
    feedbacksReceived: 0
};

// Load existing stats
if (fs.existsSync(STATS_FILE)) {
    stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
}

export const trackEvent = (type) => {
    if (stats[type] !== undefined) {
        stats[type]++;
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    }
};

export const getStats = () => stats;