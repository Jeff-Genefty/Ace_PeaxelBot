import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(__dirname, '../../data');
const CONFIG_FILE = join(CONFIG_DIR, 'message-config.json');

/**
 * Default Opening / Closing embeds.
 * Placeholders: {WEEK_NUMBER}, {ROLE_MENTION}
 */
const DEFAULT_CONFIG = {
  opening: {
    title: '🏟️ Gameweek {WEEK_NUMBER} is open — build your lineup',
    description:
      'Hey {ROLE_MENTION} — **Ace** here.\n\n'
      + '**Gameweek {WEEK_NUMBER}** just opened on [game.peaxel.me](https://game.peaxel.me). '
      + 'Scout your cards, set your lineup, and compete for XP, leaderboard spots, and real rewards.\n\n'
      + '**What to do now**\n'
      + '1️⃣ Open the game and pick your athletes for GW {WEEK_NUMBER}\n'
      + '2️⃣ Lock a strong lineup before **Thursday 23:59 (Paris)**\n'
      + '3️⃣ Stay active on Discord — Hub XP, `/daily`, and weekly challenges keep stacking\n\n'
      + 'Play free. Compete. Collect cards. Let’s go, Managers.',
    imageName: 'opening-banner.png',
    color: '#6366F1',
    footerText: 'Peaxel · Fantasy action sports · game.peaxel.me',
    playUrl: 'https://game.peaxel.me/',
    leaderboardUrl: 'https://peaxel.me/leaderboard',
    playButtonLabel: '🎮 Play on Peaxel',
    leaderboardButtonLabel: '📊 Leaderboard',
    showPlayButton: true,
    showLeaderboardButton: true,
    showFeedbackButton: true,
  },
  closing: {
    title: '⏰ ~5 hours left — lock your Gameweek {WEEK_NUMBER} lineup',
    description:
      'Hey {ROLE_MENTION} — **Ace** with a final call.\n\n'
      + 'Lineups for **Gameweek {WEEK_NUMBER}** close tonight at **23:59 (Paris)**. '
      + 'That is about **5 hours** from this message — after that, your roster is locked for scoring.\n\n'
      + '**Quick checklist**\n'
      + '✅ Best athletes in the starting lineup?\n'
      + '✅ Captain / strategy optimized?\n'
      + '✅ Changes saved on [game.peaxel.me](https://game.peaxel.me)?\n\n'
      + 'Miss the deadline and you sit this GW out. Don’t leave points on the table.',
    imageName: 'closing-banner.png',
    color: '#EF4444',
    footerText: 'Peaxel · Lineup deadline · Thursday 23:59 Paris',
    playUrl: 'https://game.peaxel.me/',
    leaderboardUrl: 'https://peaxel.me/leaderboard',
    playButtonLabel: '🎮 Lock my lineup',
    leaderboardButtonLabel: '📊 Leaderboard',
    showPlayButton: true,
    showLeaderboardButton: true,
    showFeedbackButton: false,
  },
};

function ensureDataDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadMessageConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        opening: { ...DEFAULT_CONFIG.opening, ...parsed.opening },
        closing: { ...DEFAULT_CONFIG.closing, ...parsed.closing },
      };
    }
  } catch (error) {
    console.error('[Peaxel Config] Error loading config:', error.message);
  }
  return {
    opening: { ...DEFAULT_CONFIG.opening },
    closing: { ...DEFAULT_CONFIG.closing },
  };
}

export function saveMessageConfig(config) {
  try {
    ensureDataDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('[Peaxel Config] Error saving config:', error.message);
    return false;
  }
}

export function updateMessageConfig(type, updates) {
  const current = loadMessageConfig();
  if (!current[type]) current[type] = { ...DEFAULT_CONFIG[type] };
  current[type] = { ...current[type], ...updates };
  saveMessageConfig(current);
  return current[type];
}

export function resetMessageConfig(type) {
  const current = loadMessageConfig();
  current[type] = { ...DEFAULT_CONFIG[type] };
  saveMessageConfig(current);
  return current[type];
}

export function parseColor(hexColor) {
  if (!hexColor) return 0xa855f7;
  const hex = hexColor.replace('#', '');
  return parseInt(hex, 16);
}

export function getFormattedTitle(weekNumber, type = 'opening') {
  const config = loadMessageConfig()[type];
  return config.title.replace(/{WEEK_NUMBER}/g, String(weekNumber));
}

export function getFormattedDescription(weekNumber, type = 'opening', roleMention = '') {
  const config = loadMessageConfig()[type];
  return config.description
    .replace(/{WEEK_NUMBER}/g, String(weekNumber))
    .replace(/{ROLE_MENTION}/g, roleMention || 'Managers');
}

export function getImageName(type) {
  const config = loadMessageConfig();
  return type === 'closing' ? config.closing.imageName : config.opening.imageName;
}
