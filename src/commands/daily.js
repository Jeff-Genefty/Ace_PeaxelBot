import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { claimDailyConnect, XP_REWARDS } from '../web/services/hubXpService.js';
import { incrementChallengeMetric } from '../web/services/weeklyChallengeService.js';
import { getCurrentWeekNumber } from '../utils/week.js';
import { applyHubFooter } from '../utils/hubFooter.js';

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily Hub XP (once per day, Paris time)'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        const result = claimDailyConnect(userId, { username });

        if (!result.ok) {
            const streak = result.streak || result.profile?.dailyStreak || 0;
            return interaction.reply({
                ephemeral: true,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xf59e0b)
                        .setTitle('☀️ Daily already claimed today')
                        .setDescription(
                            `You already used \`/daily\` today (Europe/Paris).\n`
                            + `Come back tomorrow to protect your **${streak}-day streak**.\n\n`
                            + `Level **${result.profile.level}** · ${result.profile.title}\n`
                            + `Progress: **${result.profile.xpIntoLevel}/${result.profile.xpToNext} XP**`,
                        ),
                ],
            });
        }

        const gw = getCurrentWeekNumber();
        // Mission « daily » : 3 check-ins distincts sur la GW (1 /jour via claimDailyConnect)
        incrementChallengeMetric(userId, gw, 'daily', interaction.client, { username });

        const p = result.profile;
        const mileLines = (result.milestonesHit || []).map((m) =>
            `🏅 **${m.label}!** +${m.xp} XP bonus`
            + (m.cardTier ? ` + carte **${m.cardTier}**` : ''),
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(result.milestonesHit?.length ? 0xa855f7 : 0x22d3ee)
            .setTitle('☀️ Daily Connect locked in')
            .setDescription(
                `**+${result.awarded} Hub XP**`
                + (result.awarded > XP_REWARDS.daily ? ` (base ${XP_REWARDS.daily} + streak bonus)` : '')
                + ` · Streak **${result.streak}** day${result.streak > 1 ? 's' : ''}\n\n`
                + `Level **${p.level}** · ${p.title}\n`
                + `Progress: **${p.xpIntoLevel} / ${p.xpToNext} XP** (${p.progressPct}%)\n`
                + (mileLines ? `\n${mileLines}\n` : '')
                + (result.leveledUp ? `\n🎉 **Level up!** A card is waiting in your Hub chest.` : '')
                + `\n\nStreak milestones: **7 · 14 · 30** days`,
            )
            .setFooter({ text: 'Peaxel Hub · 1 claim / day · Europe/Paris' })
            .setTimestamp();

        const footerFile = applyHubFooter(embed, 'daily');
        return interaction.reply({
            embeds: [embed],
            files: footerFile ? [footerFile] : [],
        });
    },
};
