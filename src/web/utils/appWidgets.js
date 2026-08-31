import { escapeHtml } from './render.js';

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

export function renderAppProfile({ user, profile, t }) {
    return `
    <header class="app-profile">
        <img class="app-profile-avatar" src="${escapeHtml(user.avatarUrl)}" alt="" width="48" height="48">
        <div class="app-profile-meta">
            <h1 class="app-profile-name">${escapeHtml(user.username)}</h1>
            <div class="app-profile-roles">${roleBadges(profile.roles)}</div>
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
    const { challenge, gameweek } = dashboard;
    const { set, completedTasks, taskProgress, allDone, ticketUrl } = challenge;
    const progress = set.tasks.length ? Math.round((completedTasks.length / set.tasks.length) * 100) : 0;
    const stampDate = new Date().toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Europe/Paris' });

    const taskRows = taskProgress.map(({ taskId, done, detail }) => {
        const icon = done ? '✓' : '○';
        let meta = '';
        if (detail && !done) {
            meta = ` <span class="challenge-task-meta">${detail.current}/${detail.target}</span>`;
        }
        return `
        <div class="challenge-task${done ? ' is-done' : ''}">
            <span class="challenge-task-icon" aria-hidden="true">${icon}</span>
            <span>${escapeHtml(t(`app.challenge.tasks.${taskId}`))}${meta}</span>
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
        const url = ticketUrl || 'https://discord.gg/PNyAqI8hio';
        doneBlock = `
        <p class="app-status-ok">✓ ${t('app.challengeAllDone')}</p>
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

export function renderAppLiveFeed({ dashboard, t }) {
    const items = dashboard.liveFeed.map((log) => `
        <li class="live-feed-item">
            <span class="live-feed-time">${escapeHtml(log.time)}</span>
            <span class="live-feed-action type-${escapeHtml(log.action)}">${escapeHtml(log.action)}</span>
            <span class="live-feed-detail">${escapeHtml(log.detail)}</span>
        </li>`).join('');

    return `
    <section class="app-card app-live-card">
        <h2 class="app-card-title">📡 ${t('app.liveFeedTitle')}</h2>
        <ul class="live-feed-list">${items || `<li class="live-feed-empty">${t('app.liveFeedEmpty')}</li>`}</ul>
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
        ${renderAppProfile({ user, profile: dashboard.profile, t })}
        ${renderAppGwCard({ dashboard, t, locale })}
        <div class="app-grid">
            ${renderAppGiveawayCard({ dashboard, t })}
            ${renderAppActivityCard({ dashboard, t })}
            ${renderAppNextEventCard({ dashboard, t })}
            ${renderAppFeedbackCard({ dashboard, t })}
        </div>
        ${renderAppChallengeCard({ dashboard, t, csrf, locale, user })}
        <div class="app-grid app-grid-split">
            ${renderAppLiveFeed({ dashboard, t })}
            ${renderAppReminderCard({ dashboard, t, csrf })}
        </div>
    </div>`;
}
