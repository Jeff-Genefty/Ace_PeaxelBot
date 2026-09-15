import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getHubProfile, getUserWeekRank, getWeeklyLeaderboard } from '../web/services/hubXpService.js';
import { applyHubFooter } from '../utils/hubFooter.js';
import { pick } from '../utils/discordLocale.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Show Hub XP level, weekly rank, and streak')
        .setDescriptionLocalizations({
            fr: 'Affiche ton niveau Hub XP, rang hebdo et streak',
        })
        .addUserOption((opt) =>
            opt
                .setName('user')
                .setDescription('Manager to inspect (optional)')
                .setDescriptionLocalizations({ fr: 'Manager à inspecter (optionnel)' })
                .setRequired(false),
        ),

    async execute(interaction) {
        const locale = interaction.locale;
        const target = interaction.options.getUser('user') || interaction.user;
        const profile = getHubProfile(target.id);
        const rank = getUserWeekRank(target.id);
        const top = getWeeklyLeaderboard(3);

        const podiumPreview = top.length
            ? top.map((r) => `#${r.rank} ${r.username || 'Manager'} · ${r.xpWeek} XP`).join('\n')
            : pick(locale, 'No XP yet this week.', 'Pas encore d’XP cette semaine.');

        const embed = new EmbedBuilder()
            .setColor(0x22d3ee)
            .setAuthor({
                name: target.username,
                iconURL: target.displayAvatarURL({ size: 64 }),
            })
            .setTitle(pick(locale, `Hub Rank · Level ${profile.level}`, `Rang Hub · Niveau ${profile.level}`))
            .setDescription(
                pick(
                    locale,
                    `**${profile.title}**\n`
                    + `Progress: **${profile.xpIntoLevel} / ${profile.xpToNext} XP** (${profile.progressPct}%)\n`
                    + `Total XP: **${profile.xpTotal}**\n\n`
                    + `📅 This GW: **${profile.xpWeek} XP**`
                    + (rank.rank ? ` · **#${rank.rank}** / ${rank.total}` : ' · unranked')
                    + `\n🔥 Daily streak: **${profile.dailyStreak || 0}**`
                    + (profile.claimedDailyToday ? ' · ✅ claimed today' : ' · use `/daily`')
                    + `\n🎁 Pending cards: **${(profile.pendingCards || []).length}**`,
                    `**${profile.title}**\n`
                    + `Progression : **${profile.xpIntoLevel} / ${profile.xpToNext} XP** (${profile.progressPct}%)\n`
                    + `XP total : **${profile.xpTotal}**\n\n`
                    + `📅 Cette GW : **${profile.xpWeek} XP**`
                    + (rank.rank ? ` · **#${rank.rank}** / ${rank.total}` : ' · non classé')
                    + `\n🔥 Streak daily : **${profile.dailyStreak || 0}**`
                    + (profile.claimedDailyToday ? ' · ✅ claimé aujourd’hui' : ' · utilise `/daily`')
                    + `\n🎁 Cartes en attente : **${(profile.pendingCards || []).length}**`,
                ),
            )
            .addFields({
                name: pick(locale, '🏆 GW Top 3', '🏆 Top 3 GW'),
                value: podiumPreview,
            })
            .setFooter({ text: 'Peaxel Hub Pass' })
            .setTimestamp();

        const footerFile = applyHubFooter(embed, 'rank');
        return interaction.reply({
            embeds: [embed],
            files: footerFile ? [footerFile] : [],
            flags: (target.id !== interaction.user.id) ? MessageFlags.Ephemeral : undefined,
        });
    },
};
