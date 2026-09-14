import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGameweekStatus } from '../src/web/services/gameweekService.js';
import { getLiveLogs, LOG_ACTIONS } from '../src/web/services/liveLogService.js';
import { pageShell, escapeHtml } from '../src/web/utils/render.js';
import { getFeaturedCards } from '../src/web/services/featuredCards.js';
import { generateWeeklyChallenges, markTaskComplete, incrementChallengeMetric, getChallengeState } from '../src/web/services/weeklyChallengeService.js';
import {
    xpToNextLevel,
    totalXpForLevel,
    computeLevelProgress,
    tryAwardMessageXp,
    claimDailyConnect,
    MESSAGE_XP_COOLDOWN_MS,
} from '../src/web/services/hubXpService.js';
import fs from 'fs';
import { join, resolve } from 'path';

const DATA_DIR = resolve('./data');
const PROGRESS_FILE = join(DATA_DIR, 'challenge_progress.json');
const HUB_FILE = join(DATA_DIR, 'hub_profiles.json');

function wipeHubUser(id) {
    if (!fs.existsSync(HUB_FILE)) return;
    const all = JSON.parse(fs.readFileSync(HUB_FILE, 'utf-8'));
    delete all[id];
    fs.writeFileSync(HUB_FILE, JSON.stringify(all, null, 2));
}

describe('gameweekService', () => {
    it('returns a valid gameweek status object', () => {
        const gw = getGameweekStatus();
        assert.ok(gw.gameweek >= 1 && gw.gameweek <= 53);
        assert.ok(['open', 'closing', 'matchday', 'locked'].includes(gw.phase));
        assert.equal(typeof gw.isLineupOpen, 'boolean');
        assert.ok(gw.deadlineUnix > 0);
    });
});

describe('liveLogService', () => {
    it('exposes expected log action types', () => {
        assert.ok(LOG_ACTIONS.includes('MOD'));
        assert.ok(LOG_ACTIONS.includes('GIVEAWAY'));
        assert.ok(!LOG_ACTIONS.includes('LINK'));
    });

    it('filters logs by action', () => {
        const { logs, total } = getLiveLogs({ action: 'NONEXISTENT_XYZ', limit: 10 });
        assert.equal(logs.length, 0);
        assert.equal(total, 0);
    });
});

describe('pageShell', () => {
    it('includes Open Graph and manifest tags', () => {
        const html = pageShell({
            title: 'Test',
            body: '<main>ok</main>',
            description: 'Test description',
            locale: 'en',
        });
        assert.match(html, /property="og:title"/);
        assert.match(html, /name="twitter:card"/);
        assert.match(html, /manifest\.webmanifest/);
        assert.match(html, /<main>ok<\/main>/);
    });

    it('escapes HTML in title', () => {
        const html = pageShell({ title: '<script>', body: '', description: '' });
        assert.doesNotMatch(html, /<title><script><\/title>/);
        assert.match(html, /&lt;script&gt;/);
    });
});

describe('featuredCards', () => {
    it('returns 2026 cards from media.peaxel.me', () => {
        const cards = getFeaturedCards(8);
        assert.ok(cards.length >= 1 && cards.length <= 8);
        assert.ok(cards.every((c) => c.url.includes('media.peaxel.me/pxl_') && c.url.endsWith('.png')));
    });
});

describe('weeklyChallengeService', () => {
    const testId = '888888888888888888';

    it('generates and auto-completes weekly challenges', () => {
        const set = generateWeeklyChallenges(99);
        assert.ok(set.tasks.length >= 1);
        assert.equal(set.gameweek, 99);

        const taskId = set.tasks[0];
        if (taskId === 'messages') {
            incrementChallengeMetric(testId, 99, 'messages', null, { silent: true });
            const mid = getChallengeState(testId, 99);
            assert.ok(mid.taskProgress[0].detail);
            incrementChallengeMetric(testId, 99, 'messages', null, { silent: true });
        } else {
            const r1 = markTaskComplete(testId, 99, taskId, null, { silent: true });
            assert.equal(r1.justCompleted, true);
        }

        const state = getChallengeState(testId, 99);
        assert.ok(state.completedTasks.includes(taskId));

        if (fs.existsSync(PROGRESS_FILE)) {
            const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
            delete progress[testId];
            fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
        }
    });
});

describe('hubXpService', () => {
    const testId = '777777777777777777';

    it('follows exponential XP curve', () => {
        assert.equal(xpToNextLevel(0), 100);
        assert.equal(xpToNextLevel(1), 155);
        assert.equal(xpToNextLevel(2), 220);
        assert.equal(totalXpForLevel(1), 100);
        assert.equal(totalXpForLevel(2), 255);
        assert.equal(totalXpForLevel(3), 475);

        const p = computeLevelProgress(255);
        assert.equal(p.level, 2);
        assert.equal(p.xpIntoLevel, 0);
    });

    it('enforces 60s message XP cooldown (anti-farm)', () => {
        wipeHubUser(testId);
        const a = tryAwardMessageXp(testId, { silent: true });
        assert.ok(a.awarded >= 15 && a.awarded <= 25);
        const b = tryAwardMessageXp(testId, { silent: true });
        assert.equal(b.skipped, true);
        assert.equal(b.reason, 'cooldown');
        assert.ok(MESSAGE_XP_COOLDOWN_MS === 60_000);
        wipeHubUser(testId);
    });

    it('allows daily connect once per Paris day after a server message', async () => {
        wipeHubUser(testId);
        const { recordServerMessage } = await import('../src/web/services/hubXpService.js');
        const blocked = claimDailyConnect(testId, { silent: true });
        assert.equal(blocked.ok, false);
        assert.equal(blocked.reason, 'need_message');
        recordServerMessage(testId, { silent: true });
        const first = claimDailyConnect(testId, { silent: true });
        assert.equal(first.ok, true);
        assert.equal(first.awarded, 40);
        const second = claimDailyConnect(testId, { silent: true });
        assert.equal(second.ok, false);
        assert.equal(second.reason, 'already_claimed');
        wipeHubUser(testId);
    });

    it('grants and claims pending cards', async () => {
        wipeHubUser(testId);
        const { grantPendingCard, claimPendingCard, getWeeklyLeaderboard } = await import('../src/web/services/hubXpService.js');
        const card = grantPendingCard(testId, 'weekly_quest', { tier: 'common', username: 'Tester' });
        assert.ok(card.id);
        const claimed = claimPendingCard(testId, card.id, { username: 'Tester' });
        assert.equal(claimed.ok, true);
        assert.equal(claimed.card.reason, 'weekly_quest');
        const again = claimPendingCard(testId, card.id, { username: 'Tester' });
        assert.equal(again.ok, false);
        const lb = getWeeklyLeaderboard(5);
        assert.ok(Array.isArray(lb));
        wipeHubUser(testId);
    });

    it('exposes streak milestones and weekly podium config', async () => {
        const { STREAK_MILESTONES, WEEKLY_PODIUM, weekKeyDaysAgo } = await import('../src/web/services/hubXpService.js');
        assert.equal(STREAK_MILESTONES[7].xp, 100);
        assert.equal(STREAK_MILESTONES[30].cardTier, 'common');
        assert.equal(WEEKLY_PODIUM.length, 1);
        assert.equal(WEEKLY_PODIUM[0].rank, 1);
        assert.ok(weekKeyDaysAgo(1).includes('-W'));
    });
});

describe('escapeHtml', () => {
    it('escapes special characters', () => {
        assert.equal(escapeHtml('a & b'), 'a &amp; b');
    });
});
