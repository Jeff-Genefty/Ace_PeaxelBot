import { escapeHtml } from './render.js';

function roleBadges(roles, t) {
    if (!roles?.length) {
        return `<span class="role-badge role-badge-default">${escapeHtml(t('app.memberDefaultRole'))}</span>`;
    }
    return roles.map((r) =>
        `<span class="role-badge" style="--role-color:${escapeHtml(r.color)};border-color:${escapeHtml(r.color)};color:${escapeHtml(r.color)}">${escapeHtml(r.name)}</span>`,
    ).join('');
}

function formatJoined(joinedAt, locale) {
    if (!joinedAt) return null;
    try {
        return new Date(joinedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return null;
    }
}

/**
 * @param {'week'|'global'} tab
 */
export function renderAppLeaderboardPage({
    tab,
    weekRows,
    globalRows,
    gameweek,
    weekKey,
    viewerId,
    t,
}) {
    const isWeek = tab === 'week';
    const rows = isWeek ? weekRows : globalRows;
    const emptyMsg = isWeek ? t('app.lbPageEmptyWeek') : t('app.lbPageEmptyGlobal');

    const list = rows.length
        ? rows.map((r) => {
            const isYou = r.discordId === String(viewerId);
            const name = escapeHtml(r.displayName);
            const xp = isWeek ? r.xpWeek : r.xpTotal;
            const href = `/app/manager/${encodeURIComponent(r.discordId)}`;
            return `
            <li class="hub-lb-row${isYou ? ' is-you' : ''}">
                <a class="hub-lb-row-link" href="${href}">
                    <span class="hub-lb-rank">#${r.rank}</span>
                    <span class="hub-lb-name">
                        ${name}${isYou ? ` <em>${t('app.hubYou')}</em>` : ''}
                    </span>
                    <span class="hub-lb-xp">${xp} XP</span>
                    <span class="hub-lb-lvl">Lv.${r.level}</span>
                </a>
            </li>`;
        }).join('')
        : `<li class="hub-lb-empty">${emptyMsg}</li>`;

    return `
    <div class="app-lb-page">
        <header class="app-lb-header">
            <a class="app-lb-back" href="/app">← ${t('app.lbBackApp')}</a>
            <h1 class="app-lb-title">🏆 ${t('app.lbPageTitle')}</h1>
            <p class="app-lb-sub">${isWeek
        ? t('app.lbPageWeekDesc', { gw: gameweek, week: weekKey })
        : t('app.lbPageGlobalDesc')}</p>
        </header>

        <nav class="app-lb-tabs" aria-label="${escapeHtml(t('app.lbPageTitle'))}">
            <a class="app-lb-tab${isWeek ? ' is-active' : ''}" href="/app/leaderboard?tab=week">${t('app.lbTabWeek')}</a>
            <a class="app-lb-tab${!isWeek ? ' is-active' : ''}" href="/app/leaderboard?tab=global">${t('app.lbTabGlobal')}</a>
        </nav>

        <section class="app-card app-lb-board">
            <ol class="hub-lb-list hub-lb-list-lg">${list}</ol>
        </section>
    </div>`;
}

export function renderAppManagerProfile({
    discord,
    hub,
    rankWeek,
    rankGlobal,
    isYou,
    locale,
    t,
}) {
    const joined = formatJoined(discord.joinedAt, locale);
    const name = escapeHtml(discord.username || t('app.managerUnknown'));
    const tag = discord.tag ? `<p class="mgr-tag">@${escapeHtml(discord.tag)}</p>` : '';
    const memberBadge = discord.found
        ? `<span class="mgr-badge mgr-badge-ok">${t('app.managerInGuild')}</span>`
        : `<span class="mgr-badge mgr-badge-warn">${t('app.managerLeftGuild')}</span>`;

    const weekRank = rankWeek?.rank
        ? t('app.hubRankWeek', { rank: rankWeek.rank })
        : t('app.hubRankNone');
    const globalRank = rankGlobal?.rank
        ? t('app.hubRankGlobal', { rank: rankGlobal.rank })
        : t('app.hubRankGlobalNone');

    return `
    <div class="app-mgr-page">
        <header class="app-lb-header">
            <a class="app-lb-back" href="/app/leaderboard">← ${t('app.lbBackBoard')}</a>
            <h1 class="app-lb-title">${t('app.managerTitle')}</h1>
        </header>

        <section class="app-card app-mgr-card">
            <div class="app-mgr-hero">
                <img class="app-mgr-avatar" src="${escapeHtml(discord.avatarUrl)}" alt="" width="88" height="88">
                <div class="app-mgr-meta">
                    <h2 class="app-mgr-name">${name}${isYou ? ` <em>${t('app.hubYou')}</em>` : ''}</h2>
                    ${tag}
                    <div class="app-mgr-badges">${memberBadge}</div>
                    <div class="app-profile-roles">${roleBadges(discord.roles, t)}</div>
                    ${joined ? `<p class="app-card-meta">${t('app.managerJoined', { date: joined })}</p>` : ''}
                </div>
            </div>

            <div class="hub-xp">
                <div class="hub-xp-head">
                    <span class="hub-xp-level">${escapeHtml(t('app.hubLevel', { n: hub.level, title: hub.title }))}</span>
                    <span class="hub-xp-rank">${escapeHtml(weekRank)}</span>
                </div>
                <div class="hub-xp-bar" role="progressbar" aria-valuenow="${hub.progressPct}" aria-valuemin="0" aria-valuemax="100">
                    <div class="hub-xp-bar-fill" style="width:${hub.progressPct}%"></div>
                </div>
                <p class="hub-xp-meta">
                    ${hub.xpIntoLevel} / ${hub.xpToNext} XP
                    · ${t('app.hubXpTotal', { xp: hub.xpTotal })}
                    · ${t('app.hubXpWeek', { xp: hub.xpWeek })}
                </p>
                <p class="hub-xp-meta">
                    ${escapeHtml(globalRank)}
                    · 🔥 ${t('app.managerStreak', { n: hub.dailyStreak || 0 })}
                    · 🃏 ${t('app.managerCards', { n: (hub.claimedCards || []).length })}
                </p>
            </div>

            <div class="app-mgr-actions">
                <a class="btn btn-ghost btn-sm" href="/app/leaderboard?tab=week">${t('app.lbTabWeek')}</a>
                <a class="btn btn-ghost btn-sm" href="/app/leaderboard?tab=global">${t('app.lbTabGlobal')}</a>
                <a class="btn btn-primary btn-sm" href="/app">${t('app.lbBackApp')}</a>
            </div>
        </section>
    </div>`;
}
