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
        .setTitle('🎲 SCOUT QUIZ: THE TALENT HUNT IS ON!')
        .setDescription(
            `🏆 **THE PRIZE:**\n` +
            `The first Manager to find the correct answer wins a **Free Athlete Card**! 🃏✨\n\n` +
            `📖 **HOW TO PLAY:**\n` +
            `1️⃣ Analyze the scouting report below.\n` +
            `2️⃣ Head over to <#${generalChannelId}>.\n` +
            `3️⃣ Type the **EXACT NAME** of this athlete.\n\n` +
            `⚠️ *Precision is key! Only the exact spelling will be validated.*`
        )
        .addFields(
            { name: '📍 Nationality', value: athlete.main_nationality || 'N/A', inline: true },
            { name: '🏆 Sport', value: athlete.occupation || 'N/A', inline: true },
            { name: '🗂️ Category', value: athlete.main_category || 'N/A', inline: true },
            { name: '💡 Scouting Hint', value: `The name starts with the letter: **${athlete.name.charAt(0).toUpperCase()}**` }
        )
        .setColor('#a855f7')
        .setThumbnail('https://peaxel.me/wp-content/uploads/2024/01/logo-peaxel.png')
        .setFooter({ text: 'Tournament Points and Cards are at stake!' });
}

function buildWinEmbed(winnerId, athlete, ticketChannelId) {
    const ticketMention = ticketChannelId ? `<#${ticketChannelId}>` : 'the support ticket channel';
    return new EmbedBuilder()
        .setTitle('🏆 WE HAVE A WINNER!')
        .setDescription(
            `Congratulations <@${winnerId}>! You found the correct athlete: **${athlete.name.toUpperCase()}**.\n\n` +
            `📩 To claim your reward, please open a ticket: ${ticketMention}`
        )
        .setColor('#2ECC71')
        .setThumbnail(athlete.talent_profile_image_url || null);
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
        ? '✨ **Weekly Scout Quiz is LIVE!** @everyone'
        : '✨ **Scout Quiz is LIVE!**';

    await announceChannel.send({ content: pingContent, embeds: [buildQuizEmbed(athlete, generalChannelId)] });

    startQuizWindow(generalChannelId);

    if (options.onStart) await options.onStart(athlete);

    const filter = (m) => m.content.toUpperCase().trim() === athlete.name.toUpperCase().trim();
    const collector = generalChannel.createMessageCollector({ filter, time: QUIZ_DURATION_MS, max: 1 });

    collector.on('collect', async (m) => {
        const { handleChallengeQuizParticipation } = await import('../handlers/challengeTracker.js');
        handleChallengeQuizParticipation(m.author.id, m.author.username, client);

        await announceChannel.send({
            content: `🎊 Congratulations <@${m.author.id}>!`,
            embeds: [buildWinEmbed(m.author.id, athlete, ticketChannelId)],
        });
        await m.reply(`🏆 **Correct!** You won the Scout Quiz! Check <#${announceChannelId}> for details.`);
        if (options.onWinner) await options.onWinner(m.author, athlete);
    });

    collector.on('end', (collected, reason) => {
        endQuizWindow();
        if (reason === 'time' && collected.size === 0) {
            announceChannel.send(`⏰ **Quiz Ended!** No one found the answer in time. It was **${athlete.name.toUpperCase()}**.`);
        }
    });

    return { success: true, athlete };
}
