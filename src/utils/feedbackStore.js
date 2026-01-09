import fs from 'fs';
import { resolve } from 'path';

const DB_PATH = resolve('./data/feedbacks.json');

/**
 * Saves a new feedback entry to the JSON database
 * @param {Object} data - The feedback object to store
 */
export function saveFeedbackData(data) {
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    
    const existingData = fs.existsSync(DB_PATH) 
        ? JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) 
        : [];
        
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
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
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
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        if (data.length === 0) return { total: 0, average: "0" };

        const total = data.length;
        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        const average = (sum / total).toFixed(1); // Format to 1 decimal place (e.g., 4.5)

        return { total, average };
    } catch (error) {
        console.error('[FeedbackStore] Error calculating stats:', error.message);
        return { total: 0, average: "0" };
    }
}