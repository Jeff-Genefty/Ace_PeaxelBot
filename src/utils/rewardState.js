import { resolve } from 'path';
import { readJsonSync, writeJsonSync } from './jsonStore.js';

const STATE_PATH = resolve('./data/reward_state.json');

const DEFAULT_STATE = {
    messageCounter: 0,
    nextThreshold: Math.floor(Math.random() * (120 - 60 + 1)) + 60,
};

export function loadRewardState() {
    const saved = readJsonSync(STATE_PATH, DEFAULT_STATE);
    return {
        messageCounter: saved.messageCounter ?? 0,
        nextThreshold: saved.nextThreshold ?? DEFAULT_STATE.nextThreshold,
    };
}

export function saveRewardState(state) {
    writeJsonSync(STATE_PATH, {
        messageCounter: state.messageCounter,
        nextThreshold: state.nextThreshold,
    });
}
