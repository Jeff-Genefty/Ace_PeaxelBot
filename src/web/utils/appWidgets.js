import { escapeHtml } from './render.js';
import { PEAXEL_LINKS } from './branding.js';

function roleBadges(roles) {
    if (!roles?.length) {
        return `<span class="role-badge role-badge-default">${escapeHtml('Member')}</span>`;
    }
    return roles.map((r) =>
        `<span class="role-badge" style="--role-color:${escapeHtml(r.color)};border-color:${escapeHtml(r.color)};color:${escapeHtml(r.color)}">${escapeHtml(r.name)}</span>`,
    ).join('');
}

function formatPhaseLabel(t, gw) {
    return t(`gw.phase.${gw.phase}`);
}

export function renderAppProfile({ user, profile, dashboard, t }) {
    const hub = dashboard?.hub;
    let xpBlock = '';
    if (hub) {
        const rankLabel = hub.rankWeek
            ? t('app.hubRankWeek', { rank: hub.rankWeek })
            : t('app.hubRankNone');
        xpBlock = `
        <div class="hub-xp">
            <div class="hub-xp-head">
                <span class="hub-xp-level">${escapeHtml(t('app.hubLevel', { n: hub.level, title: hub.title }))}</span>
                <span class="hub-xp-rank">${escapeHtml(rankLabel)}</span>
            </div>
            <div class="hub-xp-bar" role="progressbar" aria-valuenow="${hub.progressPct}" aria-valuemin="0" aria-valuemax="100">
                <div class="hub-xp-bar-fill" style="width:${hub.progressPct}%"></div>
            </div>
            <p class="hub-xp-meta">${hub.xpIntoLevel} / ${hub.xpToNext} XP · ${t('app.hubXpWeek', { xp: hub.xpWeek })} · 🔥 ${hub.dailyStreak}</p>
        </div>`;
    }

    return `
    <header class="app-profile">
        <img class="app-profile-avatar" src="${escapeHtml(user.avatarUrl)}" alt="" width="48" height="48">
        <div class="app-profile-meta">
            <h1 class="app-profile-name">${escapeHtml(user.username)}</h1>
            <div class="app-profile-roles">${roleBadges(profile.roles)}</div>
            ${xpBlock}
        </div>
    </header>`;
}

export function renderAppGwCard({ dashboard, t, locale }) {
    const { gameweekStatus: gw, dayName, gameweek } = dashboard;
    const phaseLabel = formatPhaseLabel(t, gw);
    const statusClass = gw.isLineupOpen ? 'is-open' : 'is-closed';
    const statusIcon = gw.isLineupOpen ? '🟢' : '🔴';

    const deadlineBlock = gw.isLineupOpen
        ? `<p class="app-gw-deadline">${t('app.gwClosesIn')} <strong data-countdown>${escapeHtml(t('gw.loading'))}</strong></p>`
        : `<p class="app-gw-deadline app-gw-muted">${t('app.gwNextOpen')} ${t('app.gwMonday')}</p>`;

    return `
    <section class="app-card app-gw-card ${statusClass}" data-gw-countdown="${gw.deadlineUnix}">
        <div class="app-card-head">
            <span class="app-card-kicker">${t('app.gwLabel')} ${gameweek}</span>
            <span class="app-gw-day">${escapeHtml(dayName)}</span>
        </div>
        <p class="app-gw-status">${statusIcon} ${escapeHtml(phaseLabel)}</p>
        ${deadlineBlock}
    </section>`;
}

export function renderAppGiveawayCard({ dashboard, t }) {
    const { giveaway } = dashboard;
    if (giveaway.status !== 'open') {
        return `
        <section class="app-card app-giveaway-card is-closed">
            <h2 class="app-card-title">🎟️ ${t('app.giveawayTitle')}</h2>
            <p class="app-card-desc">${t('app.giveawayClosed')}</p>
        </section>`;
    }

    const statusLine = giveaway.joined
        ? `<span class="app-status-ok">✓ ${t('app.giveawayJoined')}</span>`
        : `<span class="app-status-pending">${t('app.giveawayNotJoined')}</span>`;

    const countdown = giveaway.closesAt
        ? `<p class="app-card-meta">${t('app.giveawayCloses')} <strong data-countdown>${escapeHtml(t('gw.loading'))}</strong></p>`
        : '';

    const cta = giveaway.discordUrl
        ? `<a href="${escapeHtml(giveaway.discordUrl)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">${t('app.giveawayCta')}</a>`
        : '';

    return `
    <section class="app-card app-giveaway-card is-open"${giveaway.closesAt ? ` data-gw-countdown="${Math.floor(Date.parse(giveaway.closesAt) / 1000)}"` : ''}>
        <h2 class="app-card-title">🎟️ ${t('app.giveawayTitle')}</h2>
        <p class="app-card-desc">${statusLine} · ${t('app.giveawayParticipants', { count: giveaway.participantCount })}</p>
        ${countdown}
        ${cta}
    </section>`;
}

export function renderAppActivityCard({ dashboard, t }) {
    const { activity } = dashboard;
    return `
    <section class="app-card app-activity-card">
        <h2 class="app-card-title">📊 ${t('app.activityTitle')}</h2>
        <div class="app-stat-duo">
            <div class="app-stat-item">
                <span class="app-stat-value">${activity.activeManagers}</span>
                <span class="app-stat-label">${t('app.activeManagers')}</span>
            </div>
            <div class="app-stat-item">
                <span class="app-stat-value">${activity.messagesToday}</span>
                <span class="app-stat-label">${t('app.messagesToday')}</span>
            </div>
        </div>
    </section>`;
}

export function renderAppNextEventCard({ dashboard, t }) {
    const { nextEvent } = dashboard;
    const eventKey = {
        Opening: 'opening',
        Quiz: 'quiz',
        Spotlight: 'spotlight',
        Closing: 'closing',
    }[nextEvent.label] || 'event';

    return `
    <section class="app-card app-event-card">
        <h2 class="app-card-title">📅 ${t('app.nextEventTitle')}</h2>
        <p class="app-card-desc"><strong>${t(`app.events.${eventKey}`)}</strong></p>
        <p class="app-card-meta">${t('app.nextEventIn', { hours: nextEvent.hoursUntil })}</p>
    </section>`;
}

export function renderAppFeedbackCard({ dashboard, t }) {
    const { feedback } = dashboard;
    const cta = feedback.channelUrl
        ? `<a href="${escapeHtml(feedback.channelUrl)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${t('app.feedbackCta')}</a>`
        : '';

    if (feedback.submitted) {
        return `
        <section class="app-card app-feedback-card">
            <h2 class="app-card-title">💬 ${t('app.feedbackTitle')}</h2>
            <p class="app-card-desc">${t('app.feedbackThanks', { avg: feedback.average, count: feedback.total })}</p>
        </section>`;
    }

    return `
    <section class="app-card app-feedback-card">
        <h2 class="app-card-title">💬 ${t('app.feedbackTitle')}</h2>
        <p class="app-card-desc">${t('app.feedbackPrompt')}</p>
        ${cta}
    </section>`;
}

export function renderAppChallengeCard({ dashboard, t, locale, user }) {
    const { challenge, gameweek, hub } = dashboard;
    const { set, completedTasks, taskProgress, allDone, ticketUrl } = challenge;
    const progress = set.tasks.length ? Math.round((completedTasks.length / set.tasks.length) * 100) : 0;
    const stampDate = new Date().toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Europe/Paris' });
    const XP_TASK = hub?.xpRewards?.task ?? 25;
    const XP_COMPLETE = hub?.xpRewards?.complete ?? 100;

    const taskRows = taskProgress.map(({ taskId, done, detail }) => {
        const icon = done ? '✓' : '○';
        let meta = '';
        if (detail && !done) {
            meta = ` <span class="challenge-task-meta">${detail.current}/${detail.target}</span>`;
        }
        const xpBadge = `<span class="challenge-xp-badge">+${XP_TASK} XP</span>`;
        return `
        <div class="challenge-task${done ? ' is-done' : ''}">
            <span class="challenge-task-icon" aria-hidden="true">${icon}</span>
            <span class="challenge-task-label">${escapeHtml(t(`app.challenge.tasks.${taskId}`))}${meta}</span>
            ${xpBadge}
        </div>`;
    }).join('');

    const proofStamp = allDone ? `
    <div class="challenge-proof-stamp" id="challenge-proof-stamp">
        <span class="challenge-proof-brand">PEAXEL HUB</span>
        <span class="challenge-proof-gw">GW ${gameweek}</span>
        <span class="challenge-proof-user">${escapeHtml(user.username)}</span>
        <span class="challenge-proof-date">${escapeHtml(stampDate)}</span>
    </div>` : '';

    let doneBlock = '';
    if (allDone) {
        const url = ticketUrl || PEAXEL_LINKS.discord;
        doneBlock = `
        <p class="app-status-ok">✓ ${t('app.challengeAllDone')} · +${XP_COMPLETE} XP</p>
        <p class="app-card-desc">${t('app.challengeTicketHint')}</p>
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn-discord btn-sm">${t('app.challengeOpenTicket')}</a>`;
    }

    return `
    <section class="app-card app-challenge-card">
        <div class="app-card-head">
            <h2 class="app-card-title">🎯 ${t('app.challengeTitle')}</h2>
            <span class="app-card-kicker">GW ${gameweek}</span>
        </div>
        <p class="app-card-desc">${t('app.challengeDesc')}</p>
        <div class="challenge-progress">
            <div class="challenge-progress-bar" style="width:${progress}%"></div>
        </div>
        <p class="app-card-meta">${completedTasks.length}/${set.tasks.length} ${t('app.challengeProgress')}</p>
        <div class="challenge-tasks">${taskRows}</div>
        ${proofStamp}
        ${doneBlock}
    </section>`;
}

function reasonLabel(t, reason) {
    const key = `app.rewardReason.${reason}`;
    const label = t(key);
    return label === key ? reason : label;
}

export function renderAppLeaderboardCard({ dashboard, t }) {
    const rows = dashboard.leaderboard || [];
    const list = rows.length
        ? rows.map((r) => `
            <li class="hub-lb-row${r.isYou ? ' is-you' : ''}">
                <span class="hub-lb-rank">#${r.rank}</span>
                <span class="hub-lb-name">${escapeHtml(r.displayName)}${r.isYou ? ` <em>${t('app.hubYou')}</em>` : ''}</span>
                <span class="hub-lb-xp">${r.xpWeek} XP</span>
                <span class="hub-lb-lvl">Lv.${r.level}</span>
            </li>`).join('')
        : `<li class="hub-lb-empty">${t('app.hubLeaderboardEmpty')}</li>`;

    return `
    <section class="app-card app-leaderboard-card">
        <div class="app-card-head">
            <h2 class="app-card-title">🏆 ${t('app.hubLeaderboard')}</h2>
            <span class="app-card-kicker">GW ${dashboard.gameweek}</span>
        </div>
        <p class="app-card-desc">${t('app.hubLeaderboardDesc')}</p>
        <ol class="hub-lb-list">${list}</ol>
    </section>`;
}

export function renderAppRewardsCard({ dashboard, t, csrf }) {
    const { hub } = dashboard;
    const pending = hub.pendingCards || [];
    const ticketUrl = hub.ticketUrl || PEAXEL_LINKS.discord;

    if (!pending.length) {
        return `
        <section class="app-card app-rewards-card">
            <h2 class="app-card-title">🎁 ${t('app.hubCoffreTitle')}</h2>
            <p class="app-card-desc">${t('app.hubCoffreEmpty')}</p>
        </section>`;
    }

    const items = pending.map((card) => `
        <li class="hub-reward-item">
            <div class="hub-reward-meta">
                <strong>${escapeHtml(reasonLabel(t, card.reason))}</strong>
                <span class="hub-reward-tier tier-${escapeHtml(card.tier || 'common')}">${escapeHtml((card.tier || 'common').toUpperCase())}</span>
            </div>
            <form action="/app/rewards/claim" method="POST" class="hub-reward-form">
                ${csrf}
                <input type="hidden" name="cardId" value="${escapeHtml(card.id)}">
                <button type="submit" class="btn btn-primary btn-sm">${t('app.hubClaimCta')}</button>
            </form>
        </li>`).join('');

    return `
    <section class="app-card app-rewards-card has-pending">
        <div class="app-card-head">
            <h2 class="app-card-title">🎁 ${t('app.hubCoffreTitle')}</h2>
            <span class="app-card-kicker hub-reward-badge">${pending.length}</span>
        </div>
        <p class="app-card-desc">${t('app.hubCoffreDesc')}</p>
        <ul class="hub-reward-list">${items}</ul>
        <p class="app-card-meta">${t('app.hubClaimHint')} · <a href="${escapeHtml(ticketUrl)}" target="_blank" rel="noopener">${t('app.challengeOpenTicket')}</a></p>
    </section>`;
}

export function renderAppReminderCard({ dashboard, t, csrf }) {
    const enabled = dashboard.reminder.enabled;
    return `
    <section class="app-card app-reminder-card">
        <h2 class="app-card-title">🔔 ${t('app.reminderTitle')}</h2>
        <p class="app-card-desc">${t('app.reminderDesc')}</p>
        <form action="/app/reminders/toggle" method="POST">
            ${csrf}
            <button type="submit" class="btn btn-ghost btn-sm">${enabled ? t('app.reminderOff') : t('app.reminderOn')}</button>
        </form>
        ${enabled ? `<p class="app-status-ok">✓ ${t('app.reminderActive')}</p>` : ''}
    </section>`;
}

export function renderAppDashboard({ dashboard, t, csrf, locale, user }) {
    return `
    <div class="app-dashboard">
        ${renderAppProfile({ user, profile: dashboard.profile, dashboard, t })}
        ${renderAppGwCard({ dashboard, t, locale })}
        <div class="app-grid">
            ${renderAppGiveawayCard({ dashboard, t })}
            ${renderAppActivityCard({ dashboard, t })}
            ${renderAppNextEventCard({ dashboard, t })}
            ${renderAppFeedbackCard({ dashboard, t })}
        </div>
        ${renderAppChallengeCard({ dashboard, t, csrf, locale, user })}
        ${renderAppRewardsCard({ dashboard, t, csrf })}
        <div class="app-grid app-grid-split">
            ${renderAppLeaderboardCard({ dashboard, t })}
            ${renderAppReminderCard({ dashboard, t, csrf })}
        </div>
    </div>`;
}
