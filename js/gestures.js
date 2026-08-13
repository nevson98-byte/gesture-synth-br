import { distance2D } from './utils.js';

export function isFingerExtended(hand, tip, pip) {
  const wrist = hand[0];
  return distance2D(wrist, hand[tip]) > distance2D(wrist, hand[pip]) * 1.12;
}

export function countFingers(hand) {
  if (!hand?.length) return 0;
  let total = 0;
  if (isFingerExtended(hand, 8, 6)) total++;
  if (isFingerExtended(hand, 12, 10)) total++;
  if (isFingerExtended(hand, 16, 14)) total++;
  if (isFingerExtended(hand, 20, 18)) total++;

  const thumbExtended = distance2D(hand[4], hand[5]) > distance2D(hand[3], hand[5]) * 1.25;
  if (thumbExtended) total++;
  return Math.max(0, Math.min(5, total));
}

export class TimedStabilizer {
  constructor(holdMs = 190) {
    this.holdMs = holdMs;
    this.candidate = null;
    this.startedAt = 0;
    this.accepted = null;
  }

  setHoldMs(ms) {
    this.holdMs = ms;
  }

  update(value, now) {
    if (value !== this.candidate) {
      this.candidate = value;
      this.startedAt = now;
      return null;
    }
    if (now - this.startedAt >= this.holdMs && value !== this.accepted) {
      this.accepted = value;
      return value;
    }
    return null;
  }

  current() {
    return this.accepted;
  }

  reset() {
    this.candidate = null;
    this.startedAt = 0;
    this.accepted = null;
  }
}

export function noteFromFingerGesture(fingers, hand) {
  if (fingers === 0) return 'A';
  if (fingers === 1) return 'C';
  if (fingers === 2) return 'D';
  if (fingers === 3) return 'E';
  if (fingers === 4) return 'F';
  if (fingers === 5) return hand?.[9]?.y < 0.28 ? 'B' : 'G';
  return null;
}
