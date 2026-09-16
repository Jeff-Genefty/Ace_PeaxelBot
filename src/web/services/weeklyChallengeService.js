import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { EmbedBuilder } from 'discord.js';
import { updateJsonSync } from '../../utils/jsonStore.js';
import { getCurrentWeekNumber, getParisDate } from '../../utils/week.js';
import { getTicketChannelId } from '../../utils/configManager.js';
import { addLiveLog } from './liveLogService.js';
import { hasAlreadySubmitted } from '../../utils/feedbackStore.js';
import { getGiveawayState } from './giveawayService.js';
import { addHubXp, grantPendingCard, XP_REWARDS } from './hubXpService.js';
import { PEAXEL_LINKS } from '../utils/branding.js';

const CHALLENGES_FILE = join(resolve('./data'), 'weekly_challenges.json');
const PROGRESS_FILE = join(resolve('./data'), 'challenge_progress.json');

export const CHALLENGE_LOG_CHANNEL_ID = process.env.CHALLENGE_LOG_CHANNEL_ID || '1370019610560041022';

/** Défis auto-vérifiables uniquement */
export const CHALLENGE_TASK_DEFS = {
    messages: { threshold: 2, metric: 'messages' },
    messages_10: { threshold: 10, metric: 'messages' },
    daily: { threshold: 3, metric: 'daily' },
    react: { metric: 'reacted' },
    giveaway: { external: 'giveaway' },
    feedback: { external: 'feedback' },
    quiz: { metric: 'quiz' },
    welcome: { metric: 'welcome' },
    spotlight: { metric: 'spotlight' },
    share: { metric: 'share' },
    gw_react: { metric: 'gwReact' },
};

/** Quête fixe chaque semaine (en plus des 3 aléatoires) */
export const FIXED_WEEKLY_TASK = 'messages_10';

export const CHALLENGE_TASK_POOL = Object.keys(CHALLENGE_TASK_DEFS)
    .filter((id) => id !== FIXED_WEEKLY_TASK);

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

function withFixedTask(tasks) {
    const list = Array.isArray(tasks) ? [...tasks] : [];
    if (!list.includes(FIXED_WEEKLY_TASK)) list.push(FIXED_WEEKLY_TASK);
    return list;
}

export function generateWeeklyChallenges(gameweek = getCurrentWeekNumber()) {
    const key = String(gameweek);
    const tasks = withFixedTask(pickTasks(gameweek));
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
    if (existing && existing.weekKey === currentWeekKey) {
        const tasks = withFixedTask(existing.tasks);
        if (tasks.length !== existing.tasks.length) {
            const patched = { ...existing, tasks };
            updateJsonSync(CHALLENGES_FILE, {}, (data) => {
                data[key] = patched;
                return data;
            });
            return patched;
        }
        return existing;
    }
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
 * Complète aussi les autres tâches de la semaine partageant la même métrique.
 * @returns {{ completed: boolean, justCompleted: boolean }}
 */
export function incrementChallengeMetric(discordId, gameweek, taskId, client, meta = {}) {
    const set = getWeeklyChallengeSet(gameweek);
    const def = CHALLENGE_TASK_DEFS[taskId];
    if (!def) return { completed: false, justCompleted: false };

    // Si la tâche ciblée n'est pas dans le set, on peut quand même bumper une métrique
    // partagée (ex. messages → messages_10 toujours active).
    const relatedTasks = set.tasks.filter((id) => {
        const d = CHALLENGE_TASK_DEFS[id];
        if (!d) return false;
        if (id === taskId) return true;
        if (def.metric && d.metric === def.metric) return true;
        return false;
    });
    if (!relatedTasks.length && !set.tasks.includes(taskId)) {
        return { completed: false, justCompleted: false };
    }

    const progress = getUserProgressRaw(discordId, gameweek);
    if (set.tasks.includes(taskId) && progress.completedTasks.includes(taskId)) {
        // Continuer pour d'éventuelles tâches sœurs non complétées
        const siblingsPending = relatedTasks.some((id) => !progress.completedTasks.includes(id));
        if (!siblingsPending) return { completed: true, justCompleted: false };
    }

    if (def?.threshold || relatedTasks.some((id) => CHALLENGE_TASK_DEFS[id]?.threshold)) {
        const key = def.metric || taskId;
        let count = 0;
        saveUserProgress(discordId, gameweek, (p) => {
            count = (p.metrics[key] || 0) + 1;
            p.metrics[key] = count;
            return p;
        });

        let justCompleted = false;
        let completed = false;
        for (const id of relatedTasks.length ? relatedTasks : [taskId]) {
            if (!set.tasks.includes(id)) continue;
            const d = CHALLENGE_TASK_DEFS[id];
            const threshold = d?.threshold || 1;
            if (count >= threshold) {
                const r = markTaskComplete(discordId, gameweek, id, client, meta);
                if (r.justCompleted) justCompleted = true;
                if (progress.completedTasks.includes(id) || r.justCompleted) completed = true;
            }
        }
        return {
            completed: completed || (set.tasks.includes(taskId) && count >= (def.threshold || 1)),
            justCompleted,
            count,
            threshold: def.threshold,
        };
    }

    if (!set.tasks.includes(taskId)) return { completed: false, justCompleted: false };
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
        addHubXp(discordId, XP_REWARDS.challenge_task, `challenge:${taskId}`, {
            username: meta.username,
            silent: meta.silent,
        });
    }

    if (justCompleted && allDone) {
        addHubXp(discordId, XP_REWARDS.challenge_complete, 'challenge:complete', {
            username: meta.username,
            silent: meta.silent,
        });
        grantPendingCard(discordId, 'weekly_quest', { gameweek, tier: 'common' });
        if (client) {
            notifyQuestComplete(client, discordId, meta.username || discordId, gameweek, set.tasks).catch(() => {});
        }
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

/** Agrégats défis pour la GW courante (dashboard admin). */
export function getChallengeWeekStats(gameweek = getCurrentWeekNumber()) {
    const set = getWeeklyChallengeSet(gameweek);
    const all = readJson(PROGRESS_FILE, {});
    const gk = String(gameweek);
    let participants = 0;
    let questComplete = 0;
    let tasksDone = 0;

    for (const byGw of Object.values(all)) {
        const p = byGw?.[gk];
        if (!p) continue;
        const completed = p.completedTasks || [];
        const metrics = p.metrics || {};
        const hasProgress = completed.length > 0 || Object.keys(metrics).length > 0;
        if (!hasProgress) continue;
        participants += 1;
        tasksDone += completed.length;
        if (set.tasks.length && set.tasks.every((t) => completed.includes(t))) {
            questComplete += 1;
        }
    }

    return {
        gameweek,
        participants,
        questComplete,
        tasksDone,
        taskCount: set.tasks?.length || 0,
    };
}

export function getTicketUrl() {
    const guildId = process.env.DISCORD_GUILD_ID;
    const ticketId = getTicketChannelId();
    if (guildId && ticketId) return `https://discord.com/channels/${guildId}/${ticketId}`;
    return PEAXEL_LINKS.discord;
}
