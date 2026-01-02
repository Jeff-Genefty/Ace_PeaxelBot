import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../../data');
const ACTIVITY_FILE = join(DATA_DIR, 'activity.json');

const DEFAULT_ACTIVITY = {
  lastWeeklyPost: null,
  lastWeeklyPostWeek: null,
  lastManualPost: null,
  totalPostsSent: 0,
  totalFeedbackReceived: 0,
  botStartedAt: null,
  lastError: null
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function loadActivity() {
  try {
    if (existsSync(ACTIVITY_FILE)) {
      const data = readFileSync(ACTIVITY_FILE, 'utf-8');
      return { ...DEFAULT_ACTIVITY, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('[Peaxel Activity] Error loading data:', error.message);
  }
  return { ...DEFAULT_ACTIVITY };
}

function saveActivity(activity) {
  try {
    ensureDataDir();
    writeFileSync(ACTIVITY_FILE, JSON.stringify(activity, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Peaxel Activity] Error saving data:', error.message);
  }
}

export function recordWeeklyPost(isManual, weekNumber) {
  const activity = loadActivity();
  const now = new Date().toISOString();
  
  if (isManual) {
    activity.lastManualPost = now;
  } else {
    activity.lastWeeklyPost = now;
    activity.lastWeeklyPostWeek = weekNumber;
  }
  
  activity.totalPostsSent++;
  saveActivity(activity);
}

export function recordFeedback() {
  const activity = loadActivity();
  activity.totalFeedbackReceived++;
  saveActivity(activity);
}

export function recordBotStart() {
  const activity = loadActivity();
  activity.botStartedAt = new Date().toISOString();
  saveActivity(activity);
}

export function recordError(errorMessage) {
  const activity = loadActivity();
  activity.lastError = { message: errorMessage, timestamp: new Date().toISOString() };
  saveActivity(activity);
}

/**
 * Enhanced: Get the next publication (Monday 00:01 OR Thursday 16:00)
 */
export function getNextScheduledRun() {
  const timezone = process.env.TZ || 'Europe/Paris';
  const now = new Date();
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

  // Schedules: [Day (0=Sun, 1=Mon...), Hour, Minute]
  const schedules = [
    { day: 1, hour: 0, min: 1, label: 'Opening' },
    { day: 4, hour: 16, min: 0, label: 'Closing' }
  ];

  let nextRun = null;

  for (const sched of schedules) {
    let target = new Date(parisTime);
    const diff = (sched.day + 7 - target.getDay()) % 7;
    target.setDate(target.getDate() + diff);
    target.setHours(sched.hour, sched.min, 0, 0);

    // If target is in the past, move to next week
    if (target <= parisTime) {
      target.setDate(target.getDate() + 7);
    }

    if (!nextRun || target < nextRun) {
      nextRun = target;
    }
  }

  const msUntil = nextRun.getTime() - parisTime.getTime();
  
  return {
    nextRun,
    hoursUntil: Math.floor(msUntil / (1000 * 60 * 60)),
    timezone
  };
}

export function getUptime(startTime) {
  if (!startTime) return 'Unknown';
  const diff = new Date() - new Date(startTime);
  
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  return `${days}d ${hours}h ${minutes}m`;
}