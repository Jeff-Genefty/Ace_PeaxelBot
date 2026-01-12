import fs from 'fs';
import { resolve, join } from 'path';

// Using a robust path for the data directory (compatible with Railway Volumes)
const DATA_DIR = resolve('./data');
const DB_PATH = join(DATA_DIR, 'feedbacks.json');

/**
 * Saves a new feedback entry to the JSON database
 * @param {Object} data - The feedback object to store
 */
export function saveFeedbackData(data) {
    // Ensure the data directory exists (important for the first run with the Volume)
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    let existingData = [];
    
    if (fs.existsSync(DB_PATH)) {
        try {
            const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
            existingData = JSON.parse(fileContent);
        } catch (error) {
            console.error('[FeedbackStore] Error parsing JSON, starting fresh:', error.message);
            existingData = [];
        }
    }
        
    existingData.push(data);
    fs.writeFileSync(DB_PATH, JSON.stringify(existingData, null, 2));
}

/**
 * Checks if a specific user has already submitted feedback
 * @param {string} userId - The Discord user ID
 * @returns {boolean}
 */
export function hasAlreadySubmitted(userId) {
    if (!fs.existsSync(DB_PATH)) return false;
    try {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        const data = JSON.parse(fileContent);
        if (!Array.isArray(data)) return false;
        return data.some(f => f.userId === userId);
    } catch (error) {
        console.error('[FeedbackStore] Error checking submission:', error.message);
        return false;
    }
}

/**
 * Calculates the total number of feedbacks and the average score
 * @returns {Object} { total: number, average: string }
 */
export function getFeedbackStats() {
    if (!fs.existsSync(DB_PATH)) return { total: 0, average: "0" };
    
    try {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        const data = JSON.parse(fileContent);
        
        if (!Array.isArray(data) || data.length === 0) {
            return { total: 0, average: "0" };
        }

        const total = data.length;
        const sum = data.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
        const average = (sum / total).toFixed(1);

        return { total, average };
    } catch (error) {
        console.error('[FeedbackStore] Error calculating stats:', error.message);
        return { total: 0, average: "0" };
    }
}