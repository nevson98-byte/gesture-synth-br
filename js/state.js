import { DEFAULT_SETTINGS } from './config.js';

export const appState = {
  instrument: 'piano',
  mode: 'virtual',
  audioEnabled: false,
  cameraReady: false,
  appReady: false,
  hands: [],
  leftHand: null,
  rightHand: null,
  calibration: {
    offsetY: 0,
    scale: 1,
    calibrated: false,
  },
  settings: { ...DEFAULT_SETTINGS },
  tracking: {
    lastHandsSeenAt: 0,
    fps: 0,
  },
  lesson: {
    active: false,
    events: [],
    bpm: 100,
    mode: 'flow',
    difficulty: 'normal',
    speed: 1,
    index: 0,
    startedAt: 0,
    correct: 0,
    errors: 0,
    feedback: '',
  },
};

export function updateSettings(patch) {
  Object.assign(appState.settings, patch);
}
