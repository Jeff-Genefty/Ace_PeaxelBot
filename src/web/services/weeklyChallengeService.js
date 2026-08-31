import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { updateJsonSync } from '../../utils/jsonStore.js';
import { getCurrentWeekNumber, getParisDate } from '../../utils/week.js';
import { getTicketChannelId } from '../../utils/configManager.js';
import { addLiveLog } from './liveLogService.js';

const CHALLENGES_FILE = join(resolve('./data'), 'weekly_challenges.json');
const PROGRESS_FILE = join(resolve('./data'), 'challenge_progress.json');
const SUBMISSIONS_FILE = join(resolve('./data'), 'challenge_submissions.json');

export const CHALLENGE_LOG_CHANNEL_ID = process.env.CHALLENGE_LOG_CHANNEL_ID || '1370019610560041022';

/** Pool de défis — clés i18n app.challenge.tasks.{id} */
export const CHALLENGE_TASK_POOL = [
    'quiz',
    'feedback',
    'messages',
    'giveaway',
    'spotlight',
    'welcome',
    'react',
    'share',
];

const TASKS_PER_WEEK = 3;

function readJson(path, fallback) {
    if (!fs.existsSync(path)) return fallback;
    try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return fallback; }
}

function weekKeyFromParis() {
    const d = getParisDate();
    return `${d.getUTCFullYear()}-W${getCurrentWeekNumber()}`;
}

function pickTasks(gameweek, count = TASKS_PER_WEEK) {
    const pool = [...CHALLENGE_TASK_POOL];
    const picked = [];
    let seed = gameweek * 9973;
    for (let i = 0; i < count && pool.length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const idx = seed % pool.length;
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

export function generateWeeklyChallenges(gameweek = getCurrentWeekNumber()) {
    const key = String(gameweek);
    const tasks = pickTasks(gameweek);
    const payload = {
        gameweek,
        weekKey: weekKeyFromParis(),
        tasks,
        createdAt: new Date().toISOString(),
    };
    updateJsonSync(CHALLENGES_FILE, {}, (all) => {
        all[key] = payload;
        return all;
    });
    return payload;
}

export function ensureWeeklyChallenges(gameweek = getCurrentWeekNumber()) {
    const key = String(gameweek);
    const all = readJson(CHALLENGES_FILE, {});
    const existing = all[key];
    const currentWeekKey = weekKeyFromParis();

    if (existing && existing.weekKey === currentWeekKey) return existing;

    const paris = getParisDate();
    const isMondayOrLater = paris.getUTCDay() >= 1;
    if (existing && !isMondayOrLater) return existing;

    return generateWeeklyChallenges(gameweek);
}

export function getWeeklyChallengeSet(gameweek = getCurrentWeekNumber()) {
    return ensureWeeklyChallenges(gameweek);
}

function getUserProgress(discordId, gameweek) {
    const all = readJson(PROGRESS_FILE, {});
    return all[String(discordId)]?.[String(gameweek)] || { completedTasks: [] };
}

export function toggleChallengeTask(discordId, gameweek, taskId) {
    const set = getWeeklyChallengeSet(gameweek);
    if (!set.tasks.includes(taskId)) return { ok: false, error: 'INVALID_TASK' };

    const submission = getSubmission(discordId, gameweek);
    if (submission) return { ok: false, error: 'ALREADY_SUBMITTED' };

    let completed = [];
    updateJsonSync(PROGRESS_FILE, {}, (all) => {
        const uid = String(discordId);
        const gk = String(gameweek);
        if (!all[uid]) all[uid] = {};
        if (!all[uid][gk]) all[uid][gk] = { completedTasks: [] };
        const list = all[uid][gk].completedTasks;
        const idx = list.indexOf(taskId);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(taskId);
        completed = [...list];
        return all;
    });

    return { ok: true, completedTasks: completed, allDone: completed.length >= set.tasks.length };
}

export function getChallengeState(discordId, gameweek = getCurrentWeekNumber()) {
    const set = getWeeklyChallengeSet(gameweek);
    const progress = getUserProgress(discordId, gameweek);
    const submission = getSubmission(discordId, gameweek);
    return {
        set,
        completedTasks: progress.completedTasks || [],
        allDone: set.tasks.every((t) => (progress.completedTasks || []).includes(t)),
        submitted: !!submission,
        submission,
    };
}

function getSubmission(discordId, gameweek) {
    const all = readJson(SUBMISSIONS_FILE, {});
    return all[String(discordId)]?.[String(gameweek)] || null;
}

export async function submitChallengeProof(client, {
    discordId,
    username,
    gameweek,
    screenshotPath,
    locale = 'en',
}) {
    const state = getChallengeState(discordId, gameweek);
    if (state.submitted) return { ok: false, error: 'ALREADY_SUBMITTED' };
    if (!state.allDone) return { ok: false, error: 'INCOMPLETE' };

    const set = state.set;
    const proofId = `${gameweek}-${discordId.slice(-6)}-${Date.now().toString(36)}`;
    const submittedAt = new Date().toISOString();

    updateJsonSync(SUBMISSIONS_FILE, {}, (all) => {
        const uid = String(discordId);
        const gk = String(gameweek);
        if (!all[uid]) all[uid] = {};
        all[uid][gk] = { proofId, submittedAt, tasks: set.tasks };
        return all;
    });

    const guildId = process.env.DISCORD_GUILD_ID;
    const ticketChannelId = getTicketChannelId();
    const ticketUrl = guildId && ticketChannelId
        ? `https://discord.com/channels/${guildId}/${ticketChannelId}`
        : 'https://discord.gg/PNyAqI8hio';

    const embed = new EmbedBuilder()
        .setTitle(`📋 Weekly Challenge · GW ${gameweek}`)
        .setColor(0x22d3ee)
        .setDescription(
            `**Proof ID:** \`${proofId}\`\n`
            + `**Gameweek:** ${gameweek}\n`
            + `**Manager:** ${username} (\`${discordId}\`)\n`
            + `**Tasks:** ${set.tasks.join(', ')}\n\n`
            + `⚠️ Verify the screenshot shows the hub proof stamp with **GW ${gameweek}** and matching username.`,
        )
        .setTimestamp();

    const file = new AttachmentBuilder(screenshotPath, { name: `gw${gameweek}-${discordId}.png` });

    try {
        const channel = await client.channels.fetch(CHALLENGE_LOG_CHANNEL_ID);
        if (channel?.isTextBased()) {
            await channel.send({
                content: `<@${discordId}> submitted weekly challenge proof · **GW ${gameweek}** · \`${proofId}\``,
                embeds: [embed],
                files: [file],
            });
        }
    } catch (err) {
        console.error('[Challenge] Discord log failed:', err.message);
    }

    addLiveLog('CHALLENGE', `${username} submitted GW${gameweek} challenge · ${proofId}`);

    return { ok: true, proofId, ticketUrl, gameweek };
}
