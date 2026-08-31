import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { updateJsonSync } from '../../utils/jsonStore.js';
import { getCurrentWeekNumber, getParisDate } from '../../utils/week.js';

const REMINDERS_FILE = join(resolve('./data'), 'gw_reminders.json');

function readReminders() {
    if (!fs.existsSync(REMINDERS_FILE)) return { users: [] };
    try {
        const data = JSON.parse(readFileSync(REMINDERS_FILE, 'utf-8'));
        return { users: Array.isArray(data.users) ? data.users : [] };
    } catch {
        return { users: [] };
    }
}

export function hasGwReminder(discordId) {
    return readReminders().users.includes(String(discordId));
}

export function toggleGwReminder(discordId) {
    const id = String(discordId);
    let enabled = false;
    updateJsonSync(REMINDERS_FILE, { users: [] }, (data) => {
        if (!Array.isArray(data.users)) data.users = [];
        const idx = data.users.indexOf(id);
        if (idx >= 0) {
            data.users.splice(idx, 1);
            enabled = false;
        } else {
            data.users.push(id);
            enabled = true;
        }
        return data;
    });
    return { enabled };
}

export function getGwReminderUserIds() {
    return readReminders().users;
}

export async function sendGwDeadlineReminders(client) {
    const userIds = getGwReminderUserIds();
    if (!userIds.length) return { sent: 0, failed: 0 };

    const gw = getCurrentWeekNumber();
    let sent = 0;
    let failed = 0;

    const text = `⏰ **Gameweek ${gw}** — les lineups ferment dans ~2h (jeudi 23:59 Paris).\n`
        + `⏰ **Gameweek ${gw}** — lineups close in ~2 hours (Thursday 23:59 Paris).`;

    for (const userId of userIds) {
        try {
            const user = await client.users.fetch(userId);
            const dm = await user.createDM();
            await dm.send(text);
            sent++;
        } catch {
            failed++;
        }
    }
    return { sent, failed };
}
