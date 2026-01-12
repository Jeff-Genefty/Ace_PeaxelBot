import fs from 'fs';
import { resolve, join } from 'path';

// 1. Static source tracked by Git
const ATHLETES_SOURCE = resolve('./src/config/athletes.json'); 
// 2. Dynamic state tracked in Railway Volume
const STATE_PATH = join(resolve('./data'), 'spotlight_state.json');

const logPrefix = '[Spotlight Manager]';

/**
 * Loads the list of already posted athlete names from the volume
 */
function getPostedNames() {
    if (!fs.existsSync(STATE_PATH)) return [];
    try {
        const rawData = fs.readFileSync(STATE_PATH, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error(`${logPrefix} ❌ Error reading state file:`, error.message);
        return [];
    }
}

/**
 * Picks a random unposted athlete and saves their name to state
 */
export function getRandomAthlete() {
    try {
        if (!fs.existsSync(ATHLETES_SOURCE)) {
            console.error(`${logPrefix} ❌ Source athletes.json NOT FOUND at: ${ATHLETES_SOURCE}`);
            return null;
        }

        const allAthletes = JSON.parse(fs.readFileSync(ATHLETES_SOURCE, 'utf-8'));
        const postedNames = getPostedNames();

        const available = allAthletes.filter(a => !postedNames.includes(a.name));

        if (available.length === 0) {
            console.warn(`${logPrefix} ⚠️ No unposted athletes remaining!`);
            return null;
        }

        const selected = available[Math.floor(Math.random() * available.length)];

        // Persist the name to the volume
        postedNames.push(selected.name);
        fs.writeFileSync(STATE_PATH, JSON.stringify(postedNames, null, 2));

        console.log(`${logPrefix} ✅ Selected and recorded: ${selected.name}`);
        return selected;
    } catch (error) {
        console.error(`${logPrefix} ❌ Error picking athlete:`, error.message);
        return null;
    }
}

export function getUnpostedAthletesCount() {
    try {
        if (!fs.existsSync(ATHLETES_SOURCE)) return 0;
        const allAthletes = JSON.parse(fs.readFileSync(ATHLETES_SOURCE, 'utf-8'));
        const postedNames = getPostedNames();
        return allAthletes.filter(a => !postedNames.includes(a.name)).length;
    } catch (e) {
        return 0;
    }
}

export function getPreviewAthlete() {
    try {
        if (!fs.existsSync(ATHLETES_SOURCE)) return null;
        const allAthletes = JSON.parse(fs.readFileSync(ATHLETES_SOURCE, 'utf-8'));
        return allAthletes[Math.floor(Math.random() * allAthletes.length)];
    } catch (error) {
        console.error(`${logPrefix} ❌ Error picking preview athlete:`, error.message);
        return null;
    }
}