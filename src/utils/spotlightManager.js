import fs from 'fs';
import { resolve, join } from 'path';

// Paths configuration
const ATHLETES_SOURCE = resolve('./src/config/athletes.json'); // Static source (Git)
const STATE_PATH = join(resolve('./data'), 'spotlight_state.json'); // Dynamic state (Volume)

const logPrefix = '[Spotlight Manager]';

/**
 * Internal helper to load the list of already posted athlete names
 * @returns {string[]} Array of athlete names
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
 * Picks a random unposted athlete, records their name, and saves state.
 */
export function getRandomAthlete() {
    try {
        if (!fs.existsSync(ATHLETES_SOURCE)) {
            console.error(`${logPrefix} ❌ Source athletes.json NOT FOUND at: ${ATHLETES_SOURCE}`);
            return null;
        }

        const allAthletes = JSON.parse(fs.readFileSync(ATHLETES_SOURCE, 'utf-8'));
        const postedNames = getPostedNames();

        // Filter athletes that haven't been posted yet
        const available = allAthletes.filter(a => !postedNames.includes(a.name));

        if (available.length === 0) {
            console.warn(`${logPrefix} ⚠️ No unposted athletes remaining!`);
            return null;
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        const selected = available[randomIndex];

        // Save the name to the persistent state
        postedNames.push(selected.name);
        fs.writeFileSync(STATE_PATH, JSON.stringify(postedNames, null, 2));

        console.log(`${logPrefix} ✅ Selected and recorded: ${selected.name}`);
        return selected;
    } catch (error) {
        console.error(`${logPrefix} ❌ Error picking athlete:`, error.message);
        return null;
    }
}

/**
 * Counts how many athletes have NOT been posted yet
 */
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

/**
 * Picks a random athlete FOR PREVIEW ONLY (does NOT save state)
 */
export function getPreviewAthlete() {
    try {
        if (!fs.existsSync(ATHLETES_SOURCE)) return null;
        const allAthletes = JSON.parse(fs.readFileSync(ATHLETES_SOURCE, 'utf-8'));
        const randomIndex = Math.floor(Math.random() * allAthletes.length);
        return allAthletes[randomIndex];
    } catch (error) {
        console.error(`${logPrefix} ❌ Error picking preview athlete:`, error.message);
        return null;
    }
}