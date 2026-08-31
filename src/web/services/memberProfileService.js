/** Récupère pseudo + rôles Discord (couleurs) pour /app */

export async function fetchMemberProfile(client, discordId) {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId || !discordId) return { roles: [] };

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return { roles: [] };

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return { roles: [] };

    const roles = [...member.roles.cache.values()]
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
            id: r.id,
            name: r.name,
            color: r.hexColor === '#000000' && r.color === 0 ? '#99aab5' : (r.hexColor || '#99aab5'),
        }))
        .slice(0, 10);

    return { roles };
}
