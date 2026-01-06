import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Définition propre du chemin absolu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On remonte de deux crans pour sortir de /src/utils et entrer dans /data
const ATHLETES_FILE = path.join(__dirname, '../../data/athletes.json');

const logPrefix = '[Spotlight Manager]';

/**
 * Internal helper to load athletes from the JSON file
 */
function loadAthletes() {
    try {
        if (!fs.existsSync(ATHLETES_FILE)) {
            console.error(`${logPrefix} ❌ athletes.json NOT FOUND at: ${ATHLETES_FILE}`);
            return [];
        }
        const rawData = fs.readFileSync(ATHLETES_FILE, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error(`${logPrefix} ❌ Error parsing athletes.json:`, error.message);
        return [];
    }
}

/**
 * Picks a random unposted athlete, marks them as posted, and saves the DB.
 */
export function getRandomAthlete() {
    try {
        const athletes = loadAthletes();
        if (athletes.length === 0) return null;

        // Filtrer les athlètes non postés
        const available = athletes.filter(a => a.posted === false);

        if (available.length === 0) {
            console.warn(`${logPrefix} ⚠️ No unposted athletes remaining!`);
            return null;
        }

        // Sélection aléatoire
        const randomIndex = Math.floor(Math.random() * available.length);
        const selected = available[randomIndex];

        // Mise à jour de l'état "posted"
        const originalIndex = athletes.findIndex(a => a.name === selected.name);
        if (originalIndex !== -1) {
            athletes[originalIndex].posted = true;
            fs.writeFileSync(ATHLETES_FILE, JSON.stringify(athletes, null, 2));
            console.log(`${logPrefix} ✅ Selected and marked: ${selected.name}`);
        }

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
    const athletes = loadAthletes();
    return athletes.filter(a => a.posted === false).length;
}

/**
 * Picks a random athlete FOR PREVIEW ONLY (does NOT mark as posted)
 */
export function getPreviewAthlete() {
    try {
        const athletes = loadAthletes();
        if (athletes.length === 0) return null;

               const available = athletes; 

        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    } catch (error) {
        console.error(`${logPrefix} ❌ Error picking preview athlete:`, error.message);
        return null;
    }
}