import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGameweekStatus } from '../src/web/services/gameweekService.js';
import { getLiveLogs, LOG_ACTIONS } from '../src/web/services/liveLogService.js';
import { pageShell, escapeHtml } from '../src/web/utils/render.js';
import { getFeaturedCards } from '../src/web/services/featuredCards.js';

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

describe('escapeHtml', () => {
    it('escapes special characters', () => {
        assert.equal(escapeHtml('a & b'), 'a &amp; b');
    });
});
