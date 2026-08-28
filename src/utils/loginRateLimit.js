const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

/** @type {Map<string, { count: number, windowStart: number }>} */
const attempts = new Map();

function getClientIp(req) {
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getRecord(ip) {
    const now = Date.now();
    let record = attempts.get(ip);

    if (!record || now - record.windowStart > WINDOW_MS) {
        record = { count: 0, windowStart: now };
        attempts.set(ip, record);
    }

    return record;
}

export function isLoginRateLimited(req) {
    const record = getRecord(getClientIp(req));
    return record.count >= MAX_ATTEMPTS;
}

export function loginRateLimit(req, res, next) {
    if (isLoginRateLimited(req)) {
        return res.status(429).send('Trop de tentatives de connexion. Réessayez dans 15 minutes.');
    }
    next();
}

export function recordFailedLogin(req) {
    const ip = getClientIp(req);
    const record = getRecord(ip);
    record.count++;
    attempts.set(ip, record);
}

export function clearLoginAttempts(req) {
    attempts.delete(getClientIp(req));
}
