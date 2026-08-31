import { getCurrentWeekNumber, getParisDate } from '../../utils/week.js';

/**
 * Statut Gameweek (Europe/Paris).
 * open: lun–jeu avant 23:59 | closing: jeu après 18:59 | matchday: ven–dim | locked: après deadline
 */
export function getGameweekStatus() {
    const paris = getParisDate();
    const day = paris.getUTCDay();
    const hour = paris.getUTCHours();
    const minute = paris.getUTCMinutes();
    const gameweek = getCurrentWeekNumber();

    let phase = 'locked';
    if (day >= 1 && day <= 3) phase = 'open';
    if (day === 4) {
        if (hour < 23 || (hour === 23 && minute < 59)) {
            phase = (hour > 18 || (hour === 18 && minute >= 59)) ? 'closing' : 'open';
        }
    }
    if (day === 5 || day === 6 || day === 0) phase = 'matchday';

    const deadline = getLineupDeadline(paris);
    const nextOpening = getNextOpening(paris);

    return {
        gameweek,
        phase,
        isLineupOpen: phase === 'open' || phase === 'closing',
        deadlineMs: deadline.getTime(),
        deadlineUnix: Math.floor(deadline.getTime() / 1000),
        nextOpeningMs: nextOpening.getTime(),
        nextOpeningUnix: Math.floor(nextOpening.getTime() / 1000),
    };
}

function getLineupDeadline(fromDate) {
    const d = new Date(fromDate);
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    const minute = d.getUTCMinutes();

    let daysUntilThu = (4 - day + 7) % 7;
    if (day === 4 && (hour > 23 || (hour === 23 && minute >= 59))) {
        daysUntilThu = 7;
    }
    if (day > 4) daysUntilThu = (4 - day + 7) % 7;

    d.setUTCDate(d.getUTCDate() + daysUntilThu);
    d.setUTCHours(23, 59, 0, 0);
    return d;
}

function getNextOpening(fromDate) {
    const d = new Date(fromDate);
    const day = d.getUTCDay();
    const daysUntilMon = day === 0 ? 1 : (8 - day) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + daysUntilMon);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
