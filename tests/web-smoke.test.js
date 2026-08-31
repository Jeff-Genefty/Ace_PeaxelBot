import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGameweekStatus } from '../src/web/services/gameweekService.js';
import { getLiveLogs, LOG_ACTIONS } from '../src/web/services/liveLogService.js';
import { pageShell, escapeHtml } from '../src/web/utils/render.js';
import { getFeaturedCards } from '../src/web/services/featuredCards.js';
import { generateWeeklyChallenges, markTaskComplete, incrementChallengeMetric, getChallengeState } from '../src/web/services/weeklyChallengeService.js';
import fs from 'fs';
import { join, resolve } from 'path';

const DATA_DIR = resolve('./data');
const CHALLENGES_FILE = join(DATA_DIR, 'weekly_challenges.json');
const PROGRESS_FILE = join(DATA_DIR, 'challenge_progress.json');

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

describe('escapeHtml', () => {
    it('escapes special characters', () => {
        assert.equal(escapeHtml('a & b'), 'a &amp; b');
    });
});
