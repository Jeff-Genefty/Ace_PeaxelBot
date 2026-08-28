import crypto from 'crypto';

const DISCORD_API = 'https://discord.com/api/v10';

export function getWebBaseUrl(req) {
    if (process.env.WEB_BASE_URL) return process.env.WEB_BASE_URL.replace(/\/$/, '');
    const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    return `${proto}://${req.get('host')}`;
}

export function getDiscordRedirectUri(req) {
    return `${getWebBaseUrl(req)}/auth/discord/callback`;
}

export function createOAuthState(session) {
    const state = crypto.randomBytes(24).toString('hex');
    session.oauthState = state;
    return state;
}

export function validateOAuthState(session, state) {
    if (!session.oauthState || !state || session.oauthState !== state) return false;
    delete session.oauthState;
    return true;
}

export function getDiscordAuthUrl(req, state) {
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: getDiscordRedirectUri(req),
        response_type: 'code',
        scope: 'identify guilds',
        state,
    });
    return `https://discord.com/api/oauth2/authorize?${params}`;
}

export async function exchangeDiscordCode(req, code) {
    const body = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getDiscordRedirectUri(req),
    });

    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) throw new Error('Discord token exchange failed');
    return res.json();
}

export async function fetchDiscordUser(accessToken) {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Discord user fetch failed');
    return res.json();
}

export function formatDiscordUser(user) {
    const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`;

    return {
        id: user.id,
        username: user.global_name || user.username,
        tag: user.discriminator === '0' ? user.username : `${user.username}#${user.discriminator}`,
        avatarUrl,
    };
}
