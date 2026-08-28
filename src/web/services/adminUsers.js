import fs, { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import bcrypt from 'bcrypt';

const DATA_DIR = resolve('./data');
export const USERS_FILE = join(DATA_DIR, 'users.json');

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
};

/** Accès total : super_admin ou rôle admin legacy sans restriction. */
export function hasFullAccess(session) {
    const role = session?.admin?.role;
    return !role || role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function isSuperAdmin(session) {
    return session?.admin?.role === ROLES.SUPER_ADMIN;
}

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try { return JSON.parse(readFileSync(USERS_FILE, 'utf-8')); } catch { return []; }
}

function writeUsers(users) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/** Lit tous les couples email/mot de passe définis dans .env */
function getAdminCredentialsFromEnv() {
    const pairs = [
        { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
        { email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD },
    ];

    const map = new Map();
    for (const { email, password } of pairs) {
        if (!email?.trim() || !password) continue;
        map.set(email.trim().toLowerCase(), password);
    }
    return [...map.entries()].map(([email, password]) => ({ email, password }));
}

/**
 * Crée ou met à jour les super admins depuis .env (ADMIN_* et SUPER_ADMIN_*).
 * S'exécute à chaque boot pour synchroniser les mots de passe Railway.
 */
export async function ensureAdminUsers() {
    const credentials = getAdminCredentialsFromEnv();
    if (!credentials.length) return;

    const users = readUsers();

    for (const { email, password } of credentials) {
        const hash = await bcrypt.hash(password, 10);
        const idx = users.findIndex((u) => u.email?.toLowerCase() === email);

        const superUser = {
            email,
            password: hash,
            role: ROLES.SUPER_ADMIN,
            name: 'Super Admin',
            updatedAt: new Date().toISOString(),
        };

        if (idx >= 0) {
            users[idx] = { ...users[idx], ...superUser };
        } else {
            users.push(superUser);
        }
    }

    writeUsers(users);
}

export async function authenticateAdmin(email, password) {
    const normalized = email?.trim().toLowerCase();
    const user = readUsers().find((u) => u.email?.toLowerCase() === normalized);
    if (!user || !await bcrypt.compare(password, user.password)) return null;

    return {
        email: user.email,
        role: user.role || ROLES.ADMIN,
        name: user.name || user.email.split('@')[0],
    };
}
