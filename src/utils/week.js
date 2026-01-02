/**
 * ISO Week Number Calculation Utility
 * Synchronized with Europe/Paris timezone.
 */

/**
 * Get the current date adjusted to Europe/Paris timezone
 * @returns {Date}
 */
export function getParisDate() {
  const now = new Date();
  // We use the Intl API for a more reliable conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const dateMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

  return new Date(Date.UTC(
    dateMap.year,
    dateMap.month - 1,
    dateMap.day,
    dateMap.hour,
    dateMap.minute,
    dateMap.second
  ));
}

/**
 * Get the ISO week number for a specific date
 * @param {Date} date 
 * @returns {number} (1-53)
 */
export function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  
  return weekNumber;
}

/**
 * Get current ISO week number in Paris context
 * @returns {number}
 */
export function getCurrentWeekNumber() {
  const parisDate = getParisDate();
  return getISOWeekNumber(parisDate);
}

/**
 * Get the current day name in English
 * @returns {string} e.g., "Monday", "Tuesday"
 */
export function getCurrentDayName() {
  const parisDate = getParisDate();
  return parisDate.toLocaleDateString('en-US', { weekday: 'long' });
}