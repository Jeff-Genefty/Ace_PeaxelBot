import fs from 'fs';
import { resolve, join } from 'path';

// 1. Static source tracked by Git (The data pool)
const ATHLETES_SOURCE = resolve('./src/config/athletes.json'); 
// 2. Dynamic state tracked in Railway Volume (Memory of posted athletes)
const STATE_PATH = join(resolve('./data'), 'spotlight_state.json');

const logPrefix = '[Spotlight Manager]';

/**
 * Loads the list of already posted athlete names from the persistent volume
 */
function getPostedNames() {
    if (!fs.existsSync(STATE_PATH)) {
        // Create the directory if it doesn't exist (safety for Railway Volume)
        const dataDir = resolve('./data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
        return [];
    }
    try {
        const rawData = fs.readFileSync(STATE_PATH, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error(`${logPrefix} ❌ Error reading state file:`, error.message);
        return [];
    }
}

/**
 * Picks a random unposted athlete for the Wednesday Spotlight
 * Persists the selection to prevent repeats
 */
export function getRandomAthlete() {
    try {
        if (!fs.existsSync(ATHLETES_SOURCE)) {
            console.error(`${logPrefix} ❌ Source athletes.json NOT FOUND at: ${ATHLETES_SOURCE}`);
            return null;
        }

        const allAthletes = JSON.parse(fs.readFileSync(ATHLETES_SOURCE, 'utf-8'));
        const postedNames = getPostedNames();

        // Filter: Keep only athletes whose name is NOT in the postedNames array
        let available = allAthletes.filter(a => !postedNames.includes(a.name));

        // If everyone has been posted, reset the cycle to start over
        if (available.length === 0) {
            console.warn(`${logPrefix} 🔄 All athletes posted. Resetting cycle...`);
            fs.writeFileSync(STATE_PATH, JSON.stringify([], null, 2));
            available = allAthletes;
        }

        const selected = available[Math.floor(Math.random() * available.length)];

        // Persist the name to the volume so it's not picked next time
        postedNames.push(selected.name);
        fs.writeFileSync(STATE_PATH, JSON.stringify(postedNames, null, 2));

        console.log(`${logPrefix} ✅ Selected for Spotlight: ${selected.name}`);
        return selected;
    } catch (error) {
        console.error(`${logPrefix} ❌ Error picking athlete:`, error.message);
        return null;
    }
}

/**
 * Returns the count of athletes remaining in the current cycle
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
 * Picks a random athlete for the Tuesday Quiz (Scout Quiz)
 * This doesn't affect the Spotlight "posted" status
 */
export function getPreviewAthlete() {
    try {
        if (!fs.existsSync(ATHLETES_SOURCE)) {
            console.error(`${logPrefix} ❌ Source athletes.json NOT FOUND for Quiz`);
            return null;
        }
        const allAthletes = JSON.parse(fs.readFileSync(ATHLETES_SOURCE, 'utf-8'));
        // Random pick from the entire pool
        return allAthletes[Math.floor(Math.random() * allAthletes.length)];
    } catch (error) {
        console.error(`${logPrefix} ❌ Error picking preview athlete:`, error.message);
        return null;
    }
}