import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getFeedbackStats } from './feedbackStore.js'; // Import the new stats utility

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../../data');
const ACTIVITY_FILE = join(DATA_DIR, 'activity.json');

const DEFAULT_ACTIVITY = {
  lastWeeklyPost: null,
  lastWeeklyPostWeek: null,
  lastManualPost: null,
  totalPostsSent: 0,
  totalFeedbackReceived: 0, // Keep for legacy, but we will use feedbackStore for display
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

/**
 * Returns synchronized stats for the status command
 */
export function getGlobalStats() {
    const activity = loadActivity();
    const feedbackData = getFeedbackStats(); // Live data from feedbackStore.js

    return {
        totalPosts: activity.totalPostsSent,
        feedbackCount: feedbackData.total,
        averageRating: feedbackData.average
    };
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

/**
 * Updated: This now acts as a bridge, though getFeedbackStats() is the primary source
 */
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
 * Get the next publication (Opening, Spotlight, or Closing)
 */
export function getNextScheduledRun() {
  const timezone = 'Europe/Paris';
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const p = {};
  parts.forEach(v => p[v.type] = v.value);
  const parisTime = new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

  const schedules = [
    { day: 1, hour: 0, min: 0, label: 'Opening' },    
    { day: 3, hour: 16, min: 0, label: 'Spotlight' },  
    { day: 4, hour: 18, min: 59, label: 'Closing' }   
  ];

  let nextRun = null;
  let nextLabel = '';

  for (const sched of schedules) {
    let target = new Date(parisTime);
    
    const diff = (sched.day + 7 - target.getDay()) % 7;
    target.setDate(target.getDate() + diff);
    target.setHours(sched.hour, sched.min, 0, 0);

    if (target <= parisTime) {
      target.setDate(target.getDate() + 7);
    }

    if (!nextRun || target < nextRun) {
      nextRun = target;
      nextLabel = sched.label;
    }
  }

  const msUntil = nextRun.getTime() - parisTime.getTime();
  
  return {
    nextRun,
    label: nextLabel,
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