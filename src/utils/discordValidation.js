/** Discord snowflake : 17–19 digits */
const SNOWFLAKE_RE = /^\d{17,19}$/;

export const ALLOWED_MOD_ACTIONS = Object.freeze(['timeout', 'kick', 'ban']);
export const ALLOWED_TIMEOUT_MINUTES = Object.freeze([60, 1440, 10080]);
export const MAX_MOD_REASON_LENGTH = 512;
export const MAX_BROADCAST_MESSAGE_LENGTH = 2000;

export function isDiscordSnowflake(value) {
    return typeof value === 'string' && SNOWFLAKE_RE.test(value.trim());
}

export function normalizeSnowflake(value) {
    if (value == null) return null;
    const id = String(value).trim();
    return isDiscordSnowflake(id) ? id : null;
}

/**
 * @returns {{ ok: true, userId: string, action: string, duration: number|null, reason: string }
 *   | { ok: false, error: 'invalidUserId'|'invalidAction'|'invalidDuration'|'invalidReason' }}
 */
export function parseModActionBody(body = {}) {
    const userId = normalizeSnowflake(body.userId);
    if (!userId) return { ok: false, error: 'invalidUserId' };

    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (!ALLOWED_MOD_ACTIONS.includes(action)) return { ok: false, error: 'invalidAction' };

    const reasonRaw = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reasonRaw || reasonRaw.length > MAX_MOD_REASON_LENGTH) {
        return { ok: false, error: 'invalidReason' };
    }

    let duration = null;
    if (action === 'timeout') {
        const minutes = parseInt(body.duration, 10);
        if (!ALLOWED_TIMEOUT_MINUTES.includes(minutes)) {
            return { ok: false, error: 'invalidDuration' };
        }
        duration = minutes;
    }

    return { ok: true, userId, action, duration, reason: reasonRaw };
}

/**
 * Salons autorisés pour le broadcast admin = salons configurés (config / env).
 * @param {Record<string, string|null|undefined>} channels
 */
export function getBroadcastWhitelist(channels = {}) {
    return new Set(
        Object.values(channels)
            .map((id) => normalizeSnowflake(id))
            .filter(Boolean),
    );
}

export function isBroadcastChannelAllowed(chanId, channels) {
    const id = normalizeSnowflake(chanId);
    if (!id) return false;
    return getBroadcastWhitelist(channels).has(id);
}
