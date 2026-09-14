import { EmbedBuilder } from 'discord.js';
import { getPreviewAthlete } from './spotlightManager.js';
import { getChannel, getTicketChannelId } from './configManager.js';

const QUIZ_DURATION_MS = 7200000; // 2 hours

/** Quiz actif — canal general + fin */
let activeQuiz = null;

export function isQuizActiveInChannel(channelId) {
    return activeQuiz
        && activeQuiz.channelId === channelId
        && Date.now() < activeQuiz.endsAt;
}

function startQuizWindow(generalChannelId) {
    activeQuiz = { channelId: generalChannelId, endsAt: Date.now() + QUIZ_DURATION_MS };
}

function endQuizWindow() {
    activeQuiz = null;
}

function buildQuizEmbed(athlete, generalChannelId) {
    return new EmbedBuilder()
        .setTitle('🎲 Scout Quiz — guess the athlete')
        .setDescription(
            'First correct answer wins a **Free Athlete Card** (+ Hub XP).\n\n'
            + '**How to play**\n'
            + `1️⃣ Read the scouting report below\n`
            + `2️⃣ Go to <#${generalChannelId}>\n`
            + `3️⃣ Type the athlete’s **exact name** (spelling matters)\n\n`
            + '⏱️ You have **2 hours**. Only the first correct answer counts.',
        )
        .addFields(
            { name: '📍 Nationality', value: athlete.main_nationality || 'N/A', inline: true },
            { name: '🏆 Sport', value: athlete.occupation || 'N/A', inline: true },
            { name: '🗂️ Category', value: athlete.main_category || 'N/A', inline: true },
            {
                name: '💡 Hint',
                value: `Name starts with **${athlete.name.charAt(0).toUpperCase()}**`,
            },
        )
        .setColor('#a855f7')
        .setThumbnail('https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png')
        .setFooter({ text: 'Peaxel · Scout · Collect · Compete' });
}

function buildWinEmbed(winnerId, athlete, ticketChannelId) {
    const ticketMention = ticketChannelId ? `<#${ticketChannelId}>` : 'the support ticket channel';
    return new EmbedBuilder()
        .setTitle('🏆 Scout Quiz won')
        .setDescription(
            `<@${winnerId}> nailed it — the athlete was **${athlete.name}**.\n\n`
            + `**Reward:** Free Athlete Card (+ Hub XP)\n`
            + `**Claim:** open a ticket in ${ticketMention} with a screenshot of this win.`,
        )
        .setColor('#2ECC71')
        .setThumbnail(athlete.talent_profile_image_url || null)
        .setFooter({ text: 'Peaxel · Scout Quiz' });
}

/**
 * Lance un Scout Quiz (scheduler ou commande manuelle).
 * @returns {{ success: boolean, reason?: string, athlete?: object }}
 */
export async function runScoutQuiz(client, options = {}) {
    const athlete = getPreviewAthlete();
    if (!athlete) return { success: false, reason: 'no_athlete' };

    const announceChannelId = options.announceChannelId || getChannel('announce');
    const generalChannelId = options.generalChannelId || getChannel('welcome');
    const ticketChannelId = getTicketChannelId();

    if (!announceChannelId || !generalChannelId) {
        return { success: false, reason: 'missing_channels' };
    }

    const announceChannel = await client.channels.fetch(announceChannelId).catch(() => null);
    const generalChannel = await client.channels.fetch(generalChannelId).catch(() => null);

    if (!announceChannel?.isTextBased() || !generalChannel?.isTextBased()) {
        return { success: false, reason: 'channels_not_found' };
    }

    const pingContent = options.pingEveryone !== false
        ? '@everyone — **Scout Quiz** is open for 2 hours. First correct name wins a free card 👇'
        : '**Scout Quiz** is open for 2 hours. First correct name wins a free card 👇';

    await announceChannel.send({ content: pingContent, embeds: [buildQuizEmbed(athlete, generalChannelId)] });

    startQuizWindow(generalChannelId);

    if (options.onStart) await options.onStart(athlete);

    const filter = (m) => m.content.toUpperCase().trim() === athlete.name.toUpperCase().trim();
    const collector = generalChannel.createMessageCollector({ filter, time: QUIZ_DURATION_MS, max: 1 });

    collector.on('collect', async (m) => {
        const { handleChallengeQuizParticipation } = await import('../handlers/challengeTracker.js');
        const { addHubXp, grantPendingCard, XP_REWARDS } = await import('../web/services/hubXpService.js');
        handleChallengeQuizParticipation(m.author.id, m.author.username, client);
        addHubXp(m.author.id, XP_REWARDS.quiz_win, 'quiz:win', { username: m.author.username });
        grantPendingCard(m.author.id, 'quiz_win', { tier: 'common', username: m.author.username });

        await announceChannel.send({
            content: `🎊 <@${m.author.id}> wins the Scout Quiz!`,
            embeds: [buildWinEmbed(m.author.id, athlete, ticketChannelId)],
        });
        await m.reply(`✅ Correct! Claim details are in <#${announceChannelId}>.`);
        if (options.onWinner) await options.onWinner(m.author, athlete);
    });

    collector.on('end', (collected, reason) => {
        endQuizWindow();
        if (reason === 'time' && collected.size === 0) {
            announceChannel.send(
                `⏰ **Scout Quiz closed** — no correct answer in time.\n`
                + `The athlete was **${athlete.name}**. Next quiz: Tuesday 19:00 (Paris).`,
            );
        }
    });

    return { success: true, athlete };
}
