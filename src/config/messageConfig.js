import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(__dirname, '../../data');
const CONFIG_FILE = join(CONFIG_DIR, 'message-config.json');

/**
 * Default configuration for Opening and Closing messages
 */
const DEFAULT_CONFIG = {
  opening: {
    title: "🚀 ACE NOTIFICATION | LINEUP IS NOW OPEN FOR WEEK {WEEK_NUMBER}",
    description: "Hello <@&1369976254685642925>, Ace here! The gates are open and the scouting season has officially begun. 🏟️\n\nIt’s time to step into your role as an **Athlete Manager** and build your winning squad! 🔥\n\n**Action Plan:**\n🔹 **Scout:** Look through your cards and pick your top-performing athletes.\n🔹 **Strategize:** Build a lineup to dominate the leaderboard.\n🔹 **Earn:** Compete for XP and exclusive rewards.\n\n*Good luck, Managers! Let's see those dream teams.* 🌶️",
    imageName: "opening-banner.png",
    color: "#6366F1",
    footerText: "Peaxel • Weekly Game Challenge",
    playUrl: "https://game.peaxel.me/",
    leaderboardUrl: "https://peaxel.me/leaderboard",
    playButtonLabel: "🎮 Play Now",
    leaderboardButtonLabel: "📊 Leaderboard",
    showPlayButton: true,
    showLeaderboardButton: true,
    showFeedbackButton: true // Activé par défaut ici
  },
  closing: {
    title: "⚠️ ACE FINAL WARNING | LINEUP CLOSING FOR WEEK {WEEK_NUMBER} ⏱️",
    description: "Hello <@&1369976254685642925>, this is a final call from **Ace**! The clock is ticking and the locker room doors are about to close. You have limited time left to finalize your roster before the **Lineup LOCKS** for the tournament.\n\n🛠️ **Last-Minute Check:**\n1️⃣ Are your best **Rising Stars** in the starting positions?\n2️⃣ Have you optimized your team for maximum points?\n3️⃣ Did you remember to save your changes?\n\nOnce the deadline hits, your team is set in stone. Don't miss out on the prizes and glory! \n\n🏆 *The competition is about to heat up. May the best Manager win!* 🔥",
    imageName: "closing-banner.png",
    color: "#EF4444",
    footerText: "Peaxel • Last Chance to Join",
    playUrl: "https://game.peaxel.me/",
    leaderboardUrl: "https://peaxel.me/leaderboard",
    playButtonLabel: "🎮 Play Now",
    leaderboardButtonLabel: "📊 Leaderboard",
    showPlayButton: true,
    showLeaderboardButton: true,
    showFeedbackButton: true // Activé par défaut ici
  }
};

/**
 * Ensures the data directory exists
 */
function ensureDataDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

/**
 * Loads configuration from JSON file or returns defaults
 */
export function loadMessageConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        opening: { ...DEFAULT_CONFIG.opening, ...parsed.opening },
        closing: { ...DEFAULT_CONFIG.closing, ...parsed.closing }
      };
    }
  } catch (error) {
    console.error('[Peaxel Config] Error loading config:', error.message);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Saves configuration to JSON file
 */
export function saveMessageConfig(config) {
  try {
    ensureDataDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Peaxel Config] Error saving config:', error.message);
    return false;
  }
}

/**
 * Updates a specific section (opening/closing) of the configuration
 */
export function updateMessageConfig(type, updates) {
  const current = loadMessageConfig();
  if (!current[type]) current[type] = { ...DEFAULT_CONFIG[type] };

  current[type] = { ...current[type], ...updates };
  saveMessageConfig(current);
  return current[type];
}

/**
 * Resets a specific section to factory defaults
 */
export function resetMessageConfig(type) {
  const current = loadMessageConfig();
  current[type] = { ...DEFAULT_CONFIG[type] };
  saveMessageConfig(current);
  return current[type];
}

/**
 * Helper: Parse Hex color to Integer for Discord Embeds
 */
export function parseColor(hexColor) {
  if (!hexColor) return 0xa855f7;
  const hex = hexColor.replace('#', '');
  return parseInt(hex, 16);
}

// Helpers for string replacement
export function getFormattedTitle(weekNumber, type = 'opening') {
  const config = loadMessageConfig()[type];
  return config.title.replace(/{WEEK_NUMBER}/g, weekNumber);
}

export function getFormattedDescription(weekNumber, type = 'opening') {
  const config = loadMessageConfig()[type];
  return config.description.replace(/{WEEK_NUMBER}/g, weekNumber);
}

/**
 * Gets the configured image filename for a specific type
 * @param {string} type - 'opening' or 'closing'
 * @returns {string}
 */
export function getImageName(type) {
  const config = loadMessageConfig();
  return type === 'closing' ? config.closing.imageName : config.opening.imageName;
}