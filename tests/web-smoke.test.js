import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGameweekStatus } from '../src/web/services/gameweekService.js';
import { generateLinkCode, verifyLinkCode, getAccountLink } from '../src/web/services/linkService.js';
import { getLiveLogs, LOG_ACTIONS } from '../src/web/services/liveLogService.js';
import { pageShell, escapeHtml } from '../src/web/utils/render.js';
import { getFeaturedCards } from '../src/web/services/featuredCards.js';
import fs from 'fs';
import { join, resolve } from 'path';

const DATA_DIR = resolve('./data');
const TEST_LINKS = join(DATA_DIR, 'account_links.json');
const TEST_CODES = join(DATA_DIR, 'link_codes.json');

describe('gameweekService', () => {
    it('returns a valid gameweek status object', () => {
        const gw = getGameweekStatus();
        assert.ok(gw.gameweek >= 1 && gw.gameweek <= 53);
        assert.ok(['open', 'closing', 'matchday', 'locked'].includes(gw.phase));
        assert.equal(typeof gw.isLineupOpen, 'boolean');
        assert.ok(gw.deadlineUnix > 0);
    });
});

describe('linkService', () => {
    const testId = '999999999999999999';

    it('generates and verifies a link code', () => {
        const { code } = generateLinkCode(testId, 'test#0001');
        assert.match(code, /^\d{6}$/);

        const result = verifyLinkCode(code, testId, 'TestManager');
        assert.equal(result.ok, true);
        assert.equal(result.link.peaxelUsername, 'TestManager');

        const link = getAccountLink(testId);
        assert.equal(link.discordId, testId);

        if (fs.existsSync(TEST_LINKS)) {
            const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf-8'));
            delete links[testId];
            fs.writeFileSync(TEST_LINKS, JSON.stringify(links, null, 2));
        }
        if (fs.existsSync(TEST_CODES)) {
            fs.writeFileSync(TEST_CODES, '{}');
        }
    });

    it('rejects invalid code format', () => {
        const result = verifyLinkCode('abc', testId);
        assert.equal(result.ok, false);
        assert.equal(result.error, 'INVALID_CODE');
    });
});

describe('liveLogService', () => {
    it('exposes expected log action types', () => {
        assert.ok(LOG_ACTIONS.includes('MOD'));
        assert.ok(LOG_ACTIONS.includes('LINK'));
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
    it('returns up to 8 cards with urls', () => {
        const cards = getFeaturedCards(8);
        assert.ok(cards.length >= 1 && cards.length <= 8);
        assert.ok(cards.every((c) => c.url.startsWith('http')));
    });
});

describe('escapeHtml', () => {
    it('escapes special characters', () => {
        assert.equal(escapeHtml('a & b'), 'a &amp; b');
    });
});
