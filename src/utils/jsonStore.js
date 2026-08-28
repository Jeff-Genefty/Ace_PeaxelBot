import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';

/**
 * Lecture JSON synchrone avec valeur par défaut.
 */
export function readJsonSync(filePath, defaultValue = null) {
    if (!existsSync(filePath)) return defaultValue;
    try {
        const raw = readFileSync(filePath, 'utf-8');
        if (!raw.trim()) return defaultValue;
        return JSON.parse(raw);
    } catch {
        return defaultValue;
    }
}

/**
 * Écriture atomique : fichier temporaire puis rename.
 */
export function writeJsonSync(filePath, data) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const tmpPath = `${filePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tmpPath, filePath);
}

/**
 * Read-modify-write synchrone (atomique dans le thread Node).
 */
export function updateJsonSync(filePath, defaultValue, updater) {
    const current = readJsonSync(filePath, defaultValue);
    const updated = updater(structuredClone(current));
    writeJsonSync(filePath, updated);
    return updated;
}
