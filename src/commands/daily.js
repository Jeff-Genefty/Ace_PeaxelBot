import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { claimDailyConnect, XP_REWARDS } from '../web/services/hubXpService.js';
import { incrementChallengeMetric } from '../web/services/weeklyChallengeService.js';
import { getCurrentWeekNumber } from '../utils/week.js';
import { applyHubFooter } from '../utils/hubFooter.js';
import { pick } from '../utils/discordLocale.js';

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily Hub XP (once per day, Paris time)')
        .setDescriptionLocalizations({
            fr: 'Réclame ton XP Hub quotidien (1× / jour, heure de Paris)',
        }),

    async execute(interaction) {
        const locale = interaction.locale;
        const userId = interaction.user.id;
        const username = interaction.user.username;

        const result = claimDailyConnect(userId, { username });

        if (!result.ok) {
            const streak = result.streak || result.profile?.dailyStreak || 0;

            if (result.reason === 'need_message') {
                return interaction.reply({
                    flags: MessageFlags.Ephemeral,
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf59e0b)
                            .setTitle(pick(locale, '☀️ Write a message first', '☀️ Envoie d’abord un message'))
                            .setDescription(
                                pick(
                                    locale,
                                    'To claim `/daily` XP you must **also send at least one message** on this Discord server today (Europe/Paris).\n\n'
                                    + '1. Post anything in a community channel\n'
                                    + '2. Run **`/daily`** again\n\n'
                                    + `Current streak: **${streak}** day${streak !== 1 ? 's' : ''} (safe until tomorrow once claimed).`,
                                    'Pour réclamer l’XP `/daily`, tu dois **aussi envoyer au moins un message** sur ce serveur Discord aujourd’hui (Europe/Paris).\n\n'
                                    + '1. Poste un message dans un salon communauté\n'
                                    + '2. Relance **`/daily`**\n\n'
                                    + `Streak actuel : **${streak}** jour${streak !== 1 ? 's' : ''} (protégé jusqu’à demain une fois claim).`,
                                ),
                            ),
                    ],
                });
            }

            return interaction.reply({
                flags: MessageFlags.Ephemeral,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xf59e0b)
                        .setTitle(pick(locale, '☀️ Daily already claimed today', '☀️ Daily déjà claim aujourd’hui'))
                        .setDescription(
                            pick(
                                locale,
                                `You already used \`/daily\` today (Europe/Paris).\n`
                                + `Come back tomorrow to protect your **${streak}-day streak**.\n\n`
                                + `Level **${result.profile.level}** · ${result.profile.title}\n`
                                + `Progress: **${result.profile.xpIntoLevel}/${result.profile.xpToNext} XP**`,
                                `Tu as déjà utilisé \`/daily\` aujourd’hui (Europe/Paris).\n`
                                + `Reviens demain pour protéger ton streak de **${streak}** jour${streak !== 1 ? 's' : ''}.\n\n`
                                + `Niveau **${result.profile.level}** · ${result.profile.title}\n`
                                + `Progression : **${result.profile.xpIntoLevel}/${result.profile.xpToNext} XP**`,
                            ),
                        ),
                ],
            });
        }

        const gw = getCurrentWeekNumber();
        incrementChallengeMetric(userId, gw, 'daily', interaction.client, { username });

        const p = result.profile;
        const mileLines = (result.milestonesHit || []).map((m) =>
            pick(
                locale,
                `🏅 **${m.label}!** +${m.xp} XP bonus` + (m.cardTier ? ' + **Athlete Card**' : ''),
                `🏅 **${m.label}!** +${m.xp} XP bonus` + (m.cardTier ? ' + **carte Athlete**' : ''),
            ),
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(result.milestonesHit?.length ? 0xa855f7 : 0x22d3ee)
            .setTitle(pick(locale, '☀️ Daily Connect locked in', '☀️ Daily Connect validé'))
            .setDescription(
                pick(
                    locale,
                    `**+${result.awarded} Hub XP**`
                    + (result.awarded > XP_REWARDS.daily ? ` (base ${XP_REWARDS.daily} + streak bonus)` : '')
                    + ` · Streak **${result.streak}** day${result.streak > 1 ? 's' : ''}\n\n`
                    + `Level **${p.level}** · ${p.title}\n`
                    + `Progress: **${p.xpIntoLevel} / ${p.xpToNext} XP** (${p.progressPct}%)\n`
                    + (mileLines ? `\n${mileLines}\n` : '')
                    + (result.leveledUp ? `\n🎉 **Level up!** You're now level **${result.level}**.` : '')
                    + `\n\nStreak milestones: **7 · 14 · 30** days\n`
                    + `_Tip: each day, write a server message before \`/daily\`._`,
                    `**+${result.awarded} XP Hub**`
                    + (result.awarded > XP_REWARDS.daily ? ` (base ${XP_REWARDS.daily} + bonus streak)` : '')
                    + ` · Streak **${result.streak}** jour${result.streak > 1 ? 's' : ''}\n\n`
                    + `Niveau **${p.level}** · ${p.title}\n`
                    + `Progression : **${p.xpIntoLevel} / ${p.xpToNext} XP** (${p.progressPct}%)\n`
                    + (mileLines ? `\n${mileLines}\n` : '')
                    + (result.leveledUp ? `\n🎉 **Level up !** Tu es maintenant niveau **${result.level}**.` : '')
                    + `\n\nJalons streak : **7 · 14 · 30** jours\n`
                    + `_Astuce : chaque jour, envoie un message serveur avant \`/daily\`._`,
                ),
            )
            .setFooter({
                text: pick(
                    locale,
                    'Peaxel Hub · 1 claim / day · message required · Europe/Paris',
                    'Peaxel Hub · 1 claim / jour · message requis · Europe/Paris',
                ),
            })
            .setTimestamp();

        const footerFile = applyHubFooter(embed, 'daily');
        return interaction.reply({
            embeds: [embed],
            files: footerFile ? [footerFile] : [],
        });
    },
};
