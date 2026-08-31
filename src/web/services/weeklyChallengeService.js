import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { EmbedBuilder } from 'discord.js';
import { updateJsonSync } from '../../utils/jsonStore.js';
import { getCurrentWeekNumber, getParisDate } from '../../utils/week.js';
import { getTicketChannelId } from '../../utils/configManager.js';
import { addLiveLog } from './liveLogService.js';
import { hasAlreadySubmitted } from '../../utils/feedbackStore.js';
import { getGiveawayState } from './giveawayService.js';

const CHALLENGES_FILE = join(resolve('./data'), 'weekly_challenges.json');
const PROGRESS_FILE = join(resolve('./data'), 'challenge_progress.json');

export const CHALLENGE_LOG_CHANNEL_ID = process.env.CHALLENGE_LOG_CHANNEL_ID || '1370019610560041022';

/** Défis auto-vérifiables uniquement */
export const CHALLENGE_TASK_DEFS = {
    messages: { threshold: 2, metric: 'messages' },
    react: { metric: 'reacted' },
    giveaway: { external: 'giveaway' },
    feedback: { external: 'feedback' },
    quiz: { metric: 'quiz' },
    welcome: { metric: 'welcome' },
    spotlight: { metric: 'spotlight' },
    share: { metric: 'share' },
    gw_react: { metric: 'gwReact' },
};

export const CHALLENGE_TASK_POOL = Object.keys(CHALLENGE_TASK_DEFS);

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
    return generateWeeklyChallenges(gameweek);
}

export function getWeeklyChallengeSet(gameweek = getCurrentWeekNumber()) {
    return ensureWeeklyChallenges(gameweek);
}

function defaultProgress() {
    return { completedTasks: [], metrics: {}, questNotifiedAt: null };
}

function getUserProgressRaw(discordId, gameweek) {
    const all = readJson(PROGRESS_FILE, {});
    return all[String(discordId)]?.[String(gameweek)] || defaultProgress();
}

function saveUserProgress(discordId, gameweek, updater) {
    let result = defaultProgress();
    updateJsonSync(PROGRESS_FILE, {}, (all) => {
        const uid = String(discordId);
        const gk = String(gameweek);
        if (!all[uid]) all[uid] = {};
        const current = { ...defaultProgress(), ...all[uid][gk] };
        if (!current.metrics) current.metrics = {};
        if (!current.completedTasks) current.completedTasks = [];
        result = updater(current);
        all[uid][gk] = result;
        return all;
    });
    return result;
}

/** Sync tâches liées à giveaway / feedback */
export function syncExternalTasks(discordId, gameweek = getCurrentWeekNumber()) {
    const set = getWeeklyChallengeSet(gameweek);
    if (set.tasks.includes('giveaway') && getGiveawayState(discordId).joined) {
        markTaskComplete(discordId, gameweek, 'giveaway', null, { silent: true });
    }
    if (set.tasks.includes('feedback') && hasAlreadySubmitted(discordId)) {
        markTaskComplete(discordId, gameweek, 'feedback', null, { silent: true });
    }
}

/**
 * Incrémente une métrique ; complète la tâche si seuil atteint.
 * @returns {{ completed: boolean, justCompleted: boolean }}
 */
export function incrementChallengeMetric(discordId, gameweek, taskId, client, meta = {}) {
    const set = getWeeklyChallengeSet(gameweek);
    if (!set.tasks.includes(taskId)) return { completed: false, justCompleted: false };

    const def = CHALLENGE_TASK_DEFS[taskId];
    const progress = getUserProgressRaw(discordId, gameweek);
    if (progress.completedTasks.includes(taskId)) {
        return { completed: true, justCompleted: false };
    }

    if (def?.threshold) {
        const key = def.metric || taskId;
        let count = 0;
        saveUserProgress(discordId, gameweek, (p) => {
            count = (p.metrics[key] || 0) + 1;
            p.metrics[key] = count;
            return p;
        });
        if (count >= def.threshold) {
            const r = markTaskComplete(discordId, gameweek, taskId, client, meta);
            return { completed: true, justCompleted: r.justCompleted, count };
        }
        return { completed: false, justCompleted: false, count, threshold: def.threshold };
    }

    const r = markTaskComplete(discordId, gameweek, taskId, client, meta);
    return { completed: true, justCompleted: r.justCompleted };
}

/** Marque une tâche comme terminée (auto uniquement). */
export function markTaskComplete(discordId, gameweek, taskId, client, meta = {}) {
    const set = getWeeklyChallengeSet(gameweek);
    if (!set.tasks.includes(taskId)) return { justCompleted: false };

    const progress = getUserProgressRaw(discordId, gameweek);
    if (progress.completedTasks.includes(taskId)) return { justCompleted: false };

    let justCompleted = false;
    let allDone = false;

    saveUserProgress(discordId, gameweek, (p) => {
        if (!p.completedTasks.includes(taskId)) {
            p.completedTasks.push(taskId);
            justCompleted = true;
        }
        allDone = set.tasks.every((t) => p.completedTasks.includes(t));
        return p;
    });

    if (justCompleted && !meta.silent) {
        addLiveLog('CHALLENGE', `${meta.username || discordId} completed task ${taskId} · GW${gameweek}`);
    }

    if (justCompleted && allDone && client) {
        notifyQuestComplete(client, discordId, meta.username || discordId, gameweek, set.tasks).catch(() => {});
    }

    return { justCompleted, allDone };
}

export async function notifyQuestComplete(client, discordId, username, gameweek, tasks) {
    const progress = getUserProgressRaw(discordId, gameweek);
    if (progress.questNotifiedAt) return;

    saveUserProgress(discordId, gameweek, (p) => {
        p.questNotifiedAt = new Date().toISOString();
        return p;
    });

    const guildId = process.env.DISCORD_GUILD_ID;
    const ticketId = getTicketChannelId();
    const ticketHint = guildId && ticketId ? `<#${ticketId}>` : 'the ticket channel';

    const embed = new EmbedBuilder()
        .setTitle(`🎯 Quête hebdo terminée · GW ${gameweek}`)
        .setColor(0x22d3ee)
        .setDescription(
            `<@${discordId}> a complété toutes les missions de la semaine.\n\n`
            + `**Gameweek:** ${gameweek}\n`
            + `**Manager:** ${username}\n`
            + `**Missions:** ${tasks.join(', ')}\n\n`
            + `📸 En attente de capture d'écran via ticket ${ticketHint}.\n`
            + `Vérifiez que la capture montre le tampon **PEAXEL HUB · GW ${gameweek}** et le pseudo Discord.`,
        )
        .setTimestamp();

    try {
        const channel = await client.channels.fetch(CHALLENGE_LOG_CHANNEL_ID);
        if (channel?.isTextBased()) {
            await channel.send({
                content: `🎯 <@${discordId}> vient de finir sa quête de la semaine · **GW ${gameweek}**`,
                embeds: [embed],
            });
        }
    } catch (err) {
        console.error('[Challenge] Mod notify failed:', err.message);
    }

    addLiveLog('CHALLENGE', `${username} finished weekly quest · GW${gameweek}`);
}

export function getChallengeState(discordId, gameweek = getCurrentWeekNumber()) {
    syncExternalTasks(discordId, gameweek);
    const set = getWeeklyChallengeSet(gameweek);
    const progress = getUserProgressRaw(discordId, gameweek);
    const completedTasks = progress.completedTasks || [];

    const taskProgress = set.tasks.map((taskId) => {
        const def = CHALLENGE_TASK_DEFS[taskId];
        const done = completedTasks.includes(taskId);
        let detail = null;
        if (def?.threshold && !done) {
            const count = progress.metrics?.[def.metric || taskId] || 0;
            detail = { current: count, target: def.threshold };
        }
        return { taskId, done, detail };
    });

    return {
        set,
        completedTasks,
        taskProgress,
        allDone: set.tasks.every((t) => completedTasks.includes(t)),
        questNotified: !!progress.questNotifiedAt,
    };
}

export function getTicketUrl() {
    const guildId = process.env.DISCORD_GUILD_ID;
    const ticketId = getTicketChannelId();
    if (guildId && ticketId) return `https://discord.com/channels/${guildId}/${ticketId}`;
    return 'https://discord.gg/PNyAqI8hio';
}
