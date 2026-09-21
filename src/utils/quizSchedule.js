import { resolve } from 'path';
import { readJsonSync, writeJsonSync } from './jsonStore.js';
import { getParisDate, getCurrentWeekNumber } from './week.js';

const SCHEDULE_PATH = resolve('./data/quiz_schedule.json');

/** 3 ou 4 quiz / semaine, heures utiles Paris */
export const QUIZ_PER_WEEK_MIN = 3;
export const QUIZ_PER_WEEK_MAX = 4;
export const QUIZ_HOUR_START = 12;
export const QUIZ_HOUR_END = 21;
/** Écart mini entre deux quiz (heures) */
export const QUIZ_MIN_GAP_HOURS = 18;

function weekKeyFromParis() {
    const d = getParisDate();
    return `${d.getUTCFullYear()}-W${getCurrentWeekNumber()}`;
}

/** Lundi 00:00 (composants Paris) de la semaine courante */
function mondayParisWall() {
    const paris = getParisDate();
    const monday = new Date(paris);
    const dow = paris.getUTCDay(); // 0=Sun … 6=Sat (UTC fields = Paris wall)
    const offset = (dow + 6) % 7; // Mon=0
    monday.setUTCDate(paris.getUTCDate() - offset);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
}

function slotKey(slot) {
    return `${slot.day}-${slot.hour}-${slot.min}`;
}

/**
 * Tire `count` créneaux distincts (jour 0=lun … 6=dim, heure 12–21, :00/:30)
 * avec un écart minimum entre eux.
 */
export function pickRandomQuizSlots(count = QUIZ_PER_WEEK_MIN) {
    const n = Math.max(QUIZ_PER_WEEK_MIN, Math.min(QUIZ_PER_WEEK_MAX, count));
    const candidates = [];
    for (let day = 0; day < 7; day++) {
        for (let hour = QUIZ_HOUR_START; hour <= QUIZ_HOUR_END; hour++) {
            for (const min of [0, 30]) {
                candidates.push({ day, hour, min });
            }
        }
    }

    // Shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const picked = [];
    const minGapMin = QUIZ_MIN_GAP_HOURS * 60;

    for (const c of candidates) {
        if (picked.length >= n) break;
        const cMin = c.day * 24 * 60 + c.hour * 60 + c.min;
        const ok = picked.every((p) => {
            const pMin = p.day * 24 * 60 + p.hour * 60 + p.min;
            return Math.abs(cMin - pMin) >= minGapMin;
        });
        if (ok) picked.push(c);
    }

    // Si pas assez (trop de contraintes), compléter sans gap strict
    for (const c of candidates) {
        if (picked.length >= n) break;
        if (!picked.some((p) => slotKey(p) === slotKey(c))) picked.push(c);
    }

    return picked
        .slice(0, n)
        .sort((a, b) => (a.day - b.day) || (a.hour - b.hour) || (a.min - b.min))
        .map((s) => ({ ...s, fired: false, id: slotKey(s) }));
}

export function generateQuizSchedule(weekKey = weekKeyFromParis()) {
    const count = QUIZ_PER_WEEK_MIN + Math.floor(Math.random() * (QUIZ_PER_WEEK_MAX - QUIZ_PER_WEEK_MIN + 1));
    const payload = {
        weekKey,
        slots: pickRandomQuizSlots(count),
        createdAt: new Date().toISOString(),
    };
    writeJsonSync(SCHEDULE_PATH, payload);
    return payload;
}

export function loadQuizSchedule() {
    return readJsonSync(SCHEDULE_PATH, { weekKey: null, slots: [] });
}

/** Assure un planning pour la semaine Paris courante. */
export function ensureQuizSchedule() {
    const weekKey = weekKeyFromParis();
    const current = loadQuizSchedule();
    if (current.weekKey === weekKey && Array.isArray(current.slots) && current.slots.length > 0) {
        return current;
    }
    return generateQuizSchedule(weekKey);
}

/**
 * Créneaux encore à tirer cette semaine (non fired), triés.
 * @returns {{ day: number, hour: number, min: number, id: string }[]}
 */
export function getUpcomingQuizSlots() {
    const schedule = ensureQuizSchedule();
    return (schedule.slots || []).filter((s) => !s.fired);
}

/**
 * Prochain quiz (Paris wall) pour affichage dashboard — label opaque volontairement.
 */
export function getNextQuizHint() {
    const upcoming = getUpcomingQuizSlots();
    if (!upcoming.length) return null;
    const now = getParisDate();
    const dow = (now.getUTCDay() + 6) % 7;
    const nowMin = dow * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes();

    for (const s of upcoming) {
        const sMin = s.day * 24 * 60 + s.hour * 60 + s.min;
        if (sMin >= nowMin - 2) {
            return { remainingThisWeek: upcoming.length };
        }
    }
    return { remainingThisWeek: upcoming.length };
}

/**
 * Marque un slot comme tiré.
 */
export function markQuizSlotFired(slotId) {
    const schedule = ensureQuizSchedule();
    const slots = (schedule.slots || []).map((s) =>
        s.id === slotId ? { ...s, fired: true, firedAt: new Date().toISOString() } : s,
    );
    writeJsonSync(SCHEDULE_PATH, { ...schedule, slots });
}

/** Remet un slot disponible (échec technique au lancement). */
export function unmarkQuizSlotFired(slotId) {
    const schedule = ensureQuizSchedule();
    const slots = (schedule.slots || []).map((s) => {
        if (s.id !== slotId) return s;
        const { firedAt, ...rest } = s;
        return { ...rest, fired: false };
    });
    writeJsonSync(SCHEDULE_PATH, { ...schedule, slots });
}

/**
 * Retourne le slot à lancer maintenant (fenêtre ±4 min), ou null.
 */
export function getDueQuizSlot() {
    const schedule = ensureQuizSchedule();
    const now = getParisDate();
    const dow = (now.getUTCDay() + 6) % 7;
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    for (const slot of schedule.slots || []) {
        if (slot.fired) continue;
        if (slot.day !== dow || slot.hour !== hour) continue;
        if (Math.abs(slot.min - minute) <= 4) return slot;
    }
    return null;
}

/** Debug / admin — nombre de quiz restants cette semaine */
export function getQuizScheduleSummary() {
    const schedule = ensureQuizSchedule();
    const total = schedule.slots?.length || 0;
    const fired = (schedule.slots || []).filter((s) => s.fired).length;
    return {
        weekKey: schedule.weekKey,
        total,
        remaining: total - fired,
        fired,
    };
}
