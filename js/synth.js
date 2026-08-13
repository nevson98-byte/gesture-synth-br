import { SENSITIVITY } from './config.js';
import { clamp, lerp } from './utils.js';
import { countFingers, noteFromFingerGesture, TimedStabilizer } from './gestures.js';

export class SynthController {
  constructor(audio, onNote) {
    this.audio = audio;
    this.onNote = onNote;
    this.stabilizer = new TimedStabilizer(190);
    this.filterSmooth = 0.5;
    this.volumeSmooth = 0.6;
    this.currentNote = null;
  }

  reset() {
    this.stabilizer.reset();
    this.currentNote = null;
    this.audio.stopSustained('gesture-main');
    this.filterSmooth = 0.5;
    this.volumeSmooth = 0.6;
  }

  processNote(hand, settings, now, instrument = 'synth') {
    if (!hand) {
      this.audio.stopSustained('gesture-main');
      this.currentNote = null;
      return null;
    }

    this.stabilizer.setHoldMs(SENSITIVITY[settings.sensitivity].gestureHoldMs);
    const fingers = countFingers(hand.landmarks);
    const accepted = this.stabilizer.update(fingers, now);
    const stableFingers = accepted ?? this.stabilizer.current();
    if (stableFingers === null || stableFingers === undefined) return this.currentNote;

    const pitch = noteFromFingerGesture(stableFingers, hand.landmarks);
    if (!pitch) return this.currentNote;
    let octave = 4;
    if (hand.landmarks[9].y < 0.34) octave = 5;
    else if (hand.landmarks[9].y > 0.68) octave = 3;
    const note = `${pitch}${octave}`;

    if (note !== this.currentNote) {
      this.audio.startSustained('gesture-main', instrument, note, 0.7);
      this.currentNote = note;
      this.onNote?.(note, now, 0.7);
    }
    return note;
  }

  processExpression(hand, settings) {
    if (!hand) return;
    const filterTarget = settings.mirrorCamera ? 1 - hand.landmarks[9].x : hand.landmarks[9].x;
    const volumeTarget = clamp(1 - hand.landmarks[9].y, 0.05, 1);
    this.filterSmooth = lerp(this.filterSmooth, filterTarget, 0.15);
    this.volumeSmooth = lerp(this.volumeSmooth, volumeTarget, 0.15);
    this.audio.setSynthExpression(this.filterSmooth, this.volumeSmooth);
  }
}
