/** Profil Discord riche pour fiches manager Hub */

function defaultAvatarUrl(userId) {
    try {
        const idx = Number((BigInt(userId) >> 22n) % 6n);
        return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    } catch {
        return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
}

export function discordAvatarUrl(user) {
    if (!user?.id) return defaultAvatarUrl('0');
    if (user.avatar) {
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    }
    return defaultAvatarUrl(user.id);
}

/**
 * @returns {{
 *   found: boolean,
 *   id: string,
 *   username: string|null,
 *   tag: string|null,
 *   avatarUrl: string,
 *   roles: Array<{id:string,name:string,color:string}>,
 *   joinedAt: string|null,
 * }}
 */
export async function fetchMemberProfile(client, discordId) {
    const empty = {
        found: false,
        id: String(discordId || ''),
        username: null,
        tag: null,
        avatarUrl: defaultAvatarUrl(String(discordId || '0')),
        roles: [],
        joinedAt: null,
    };

    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId || !discordId || !client) return empty;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return empty;

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
        // Fallback user fetch (hors guild / left) pour avatar + pseudo
        const user = await client.users.fetch(discordId).catch(() => null);
        if (!user) return empty;
        return {
            found: false,
            id: user.id,
            username: user.globalName || user.username,
            tag: user.discriminator === '0' ? user.username : `${user.username}#${user.discriminator}`,
            avatarUrl: discordAvatarUrl(user),
            roles: [],
            joinedAt: null,
        };
    }

    const user = member.user;
    const roles = [...member.roles.cache.values()]
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
            id: r.id,
            name: r.name,
            color: r.hexColor === '#000000' && r.color === 0 ? '#99aab5' : (r.hexColor || '#99aab5'),
        }))
        .slice(0, 12);

    return {
        found: true,
        id: user.id,
        username: member.displayName || user.globalName || user.username,
        tag: user.discriminator === '0' ? user.username : `${user.username}#${user.discriminator}`,
        avatarUrl: discordAvatarUrl(user),
        roles,
        joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
    };
}
