import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(__dirname, '../../data');
const CONFIG_FILE = join(CONFIG_DIR, 'reactions-config.json');

/**
 * Default reactions configuration
 */
const DEFAULT_CONFIG = {
  enabled: true,
  reactions: ['🎮', '🔥', '🙌']
};

/**
 * Ensures the data directory exists
 */
function ensureDataDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Loads reactions configuration from file or defaults
 * @returns {Object} Reactions config
 */
export function loadReactionsConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('[Peaxel Reactions] Error loading config:', error.message);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Saves reactions configuration to JSON
 * @param {Object} config - Config to save
 */
export function saveReactionsConfig(config) {
  try {
    ensureDataDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Peaxel Reactions] Error saving config:', error.message);
    return false;
  }
}

/**
 * Updates current configuration with new values
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated config
 */
export function updateReactionsConfig(updates) {
  const current = loadReactionsConfig();
  const updated = { ...current, ...updates };
  saveReactionsConfig(updated);
  return updated;
}

/**
 * Returns the hardcoded default configuration
 * @returns {Object} Default config
 */
export function getDefaultReactionsConfig() {
  return { ...DEFAULT_CONFIG };
}