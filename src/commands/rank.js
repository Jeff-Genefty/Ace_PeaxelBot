import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getHubProfile, getUserWeekRank, getWeeklyLeaderboard } from '../web/services/hubXpService.js';
import { applyHubFooter } from '../utils/hubFooter.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Show Hub XP level, weekly rank, and streak')
        .addUserOption((opt) =>
            opt.setName('user').setDescription('Manager to inspect (optional)').setRequired(false),
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const profile = getHubProfile(target.id);
        const rank = getUserWeekRank(target.id);
        const top = getWeeklyLeaderboard(3);

        const podiumPreview = top.length
            ? top.map((r) => `#${r.rank} ${r.username || 'Manager'} · ${r.xpWeek} XP`).join('\n')
            : 'No XP yet this week.';

        const embed = new EmbedBuilder()
            .setColor(0x22d3ee)
            .setAuthor({
                name: target.username,
                iconURL: target.displayAvatarURL({ size: 64 }),
            })
            .setTitle(`Hub Rank · Level ${profile.level}`)
            .setDescription(
                `**${profile.title}**\n`
                + `Progress: **${profile.xpIntoLevel} / ${profile.xpToNext} XP** (${profile.progressPct}%)\n`
                + `Total XP: **${profile.xpTotal}**\n\n`
                + `📅 This GW: **${profile.xpWeek} XP**`
                + (rank.rank ? ` · **#${rank.rank}** / ${rank.total}` : ' · unranked')
                + `\n🔥 Daily streak: **${profile.dailyStreak || 0}**`
                + (profile.claimedDailyToday ? ' · ✅ claimed today' : ' · use `/daily`')
                + `\n🎁 Pending cards: **${(profile.pendingCards || []).length}**`,
            )
            .addFields({ name: '🏆 GW Top 3', value: podiumPreview })
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
