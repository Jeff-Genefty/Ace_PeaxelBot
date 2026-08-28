import { resolve } from 'path';
import { readJsonSync, writeJsonSync } from './jsonStore.js';

const STATE_PATH = resolve('./data/scheduler_state.json');

const DEFAULT_STATE = {
    lastSentOpenWeek: null,
    lastSentCloseWeek: null,
};

export function loadSchedulerState() {
    return { ...DEFAULT_STATE, ...readJsonSync(STATE_PATH, DEFAULT_STATE) };
}

export function saveSchedulerState(state) {
    writeJsonSync(STATE_PATH, {
        lastSentOpenWeek: state.lastSentOpenWeek ?? null,
        lastSentCloseWeek: state.lastSentCloseWeek ?? null,
    });
}
