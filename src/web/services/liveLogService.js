import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { updateJsonSync } from '../../utils/jsonStore.js';

const LIVE_LOGS_FILE = join(resolve('./data'), 'live_logs.json');
const MAX_LOGS = 500;

export const LOG_ACTIONS = ['MOD', 'CONFIG', 'BROADCAST', 'GIVEAWAY', 'COMMAND', 'FEEDBACK', 'SYSTEM', 'ERROR', 'CHALLENGE'];

export function addLiveLog(action, detail, meta = {}) {
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ts: new Date().toISOString(),
        time: new Date().toLocaleTimeString('fr-FR'),
        action: String(action || 'SYSTEM').toUpperCase(),
        detail: String(detail || ''),
        ...meta,
    };
    updateJsonSync(LIVE_LOGS_FILE, [], (logs) => {
        logs.unshift(entry);
        return logs.slice(0, MAX_LOGS);
    });
    return entry;
}

function readAllLogs() {
    if (!fs.existsSync(LIVE_LOGS_FILE)) return [];
    try { return JSON.parse(readFileSync(LIVE_LOGS_FILE, 'utf-8')); } catch { return []; }
}

export function getLiveLogs({ action, q, limit = 50, offset = 0 } = {}) {
    let logs = readAllLogs();

    if (action && action !== 'ALL') {
        const act = action.toUpperCase();
        logs = logs.filter((l) => l.action === act);
    }
    if (q) {
        const needle = q.toLowerCase();
        logs = logs.filter((l) =>
            l.detail?.toLowerCase().includes(needle)
            || l.action?.toLowerCase().includes(needle)
            || l.time?.includes(needle));
    }

    const total = logs.length;
    return { logs: logs.slice(offset, offset + limit), total, limit, offset };
}
