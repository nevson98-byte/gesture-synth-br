import { SENSITIVITY } from './config.js';
import { clamp, normalizedToScreen, velocityPxPerSecond } from './utils.js';
import { countFingers, TimedStabilizer } from './gestures.js';

const STRING_NAMES = ['Mi', 'Si', 'Sol', 'Ré', 'Lá', 'Mi'];
const CHORDS = {
  'Dó maior': ['E4', 'C4', 'G3', 'E3', 'C3', null],
  'Ré maior': ['F#4', 'D4', 'A3', 'D3', null, null],
  'Mi maior': ['E4', 'B3', 'G#3', 'E3', 'B2', 'E2'],
  'Fá maior': ['F4', 'C4', 'A3', 'F3', 'C3', 'F2'],
  'Sol maior': ['G4', 'B3', 'G3', 'D3', 'B2', 'G2'],
  'Lá maior': ['E4', 'C#4', 'A3', 'E3', 'A2', null],
  'Si maior': ['F#4', 'D#4', 'B3', 'F#3', 'B2', null],
};

export class GuitarController {
  constructor(audio, onNote) {
    this.audio = audio;
    this.onNote = onNote;
    this.history = new Map();
    this.cooldowns = new Map();
    this.activeStrings = new Map();
    this.currentChord = 'Dó maior';
    this.chordStabilizer = new TimedStabilizer(190);
  }

  reset() {
    this.history.clear();
    this.cooldowns.clear();
    this.activeStrings.clear();
    this.currentChord = 'Dó maior';
    this.chordStabilizer.reset();
  }

  setSensitivity(settings) {
    this.chordStabilizer.setHoldMs(SENSITIVITY[settings.sensitivity].gestureHoldMs);
  }

  chordFromGesture(fingers, hand) {
    if (fingers === 0) return 'Lá maior';
    if (fingers === 1) return 'Dó maior';
    if (fingers === 2) return 'Ré maior';
    if (fingers === 3) return 'Mi maior';
    if (fingers === 4) return 'Fá maior';
    if (fingers === 5) return hand?.[9]?.y < 0.28 ? 'Si maior' : 'Sol maior';
    return this.currentChord;
  }

  updateChord(chordHand, settings, now) {
    if (!chordHand) return this.currentChord;
    this.setSensitivity(settings);
    const fingers = countFingers(chordHand.landmarks);
    const candidate = this.chordFromGesture(fingers, chordHand.landmarks);
    const accepted = this.chordStabilizer.update(candidate, now);
    if (accepted) this.currentChord = accepted;
    return this.currentChord;
  }

  getLayout(canvas, calibration) {
    const width = canvas.width * 0.58;
    const height = canvas.height * 0.28;
    const x = canvas.width * 0.24;
    const y = clamp(canvas.height * 0.54 + calibration.offsetY, canvas.height * 0.44, canvas.height * 0.63);
    return { x, y, width, height, gap: height / 7 };
  }

  processStrum(strumHand, canvas, settings, calibration, now) {
    if (!strumHand) return;
    const threshold = SENSITIVITY[settings.sensitivity].guitarVelocity;
    const layout = this.getLayout(canvas, calibration);
    const notes = CHORDS[this.currentChord] || CHORDS['Dó maior'];

    for (const tip of [8, 12, 16]) {
      const point = normalizedToScreen(strumHand.landmarks[tip], canvas, settings.mirrorCamera);
      const current = { ...point, t: now };
      const id = `${strumHand.id}:${tip}`;
      const previous = this.history.get(id);
      this.history.set(id, current);
      if (!previous) continue;

      const { vy } = velocityPxPerSecond(previous, current);
      if (Math.abs(vy) < threshold) continue;
      if (current.x < layout.x || current.x > layout.x + layout.width) continue;

      const crossed = [];
      for (let i = 0; i < 6; i++) {
        const stringY = layout.y + layout.gap * (i + 1);
        const down = previous.y < stringY && current.y >= stringY;
        const up = previous.y > stringY && current.y <= stringY;
        if (down || up) crossed.push(i);
      }

      if (vy < 0) crossed.reverse();
      const velocity = clamp((Math.abs(vy) - threshold) / 900 + 0.35, 0.3, 1);

      crossed.forEach((stringIndex, order) => {
        const cooldownKey = `${strumHand.id}:${tip}:${stringIndex}`;
        if ((this.cooldowns.get(cooldownKey) || 0) > now) return;
        this.cooldowns.set(cooldownKey, now + 62);
        this.activeStrings.set(stringIndex, now + 145);
        const note = notes[stringIndex];
        if (!note) return;
        this.audio.guitarHit(note, order * 0.016, velocity);
        this.onNote?.(note, now, velocity);
      });
    }

    this.prune(now);
  }

  prune(now) {
    for (const [key, until] of this.cooldowns) if (until + 1000 < now) this.cooldowns.delete(key);
    for (const [key, until] of this.activeStrings) if (until < now) this.activeStrings.delete(key);
  }

  render(ctx, canvas, calibration, settings) {
    const g = this.getLayout(canvas, calibration);
    ctx.save();
    ctx.fillStyle = 'rgba(72,43,24,.32)';
    ctx.strokeStyle = 'rgba(255,218,165,.62)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(g.x, g.y, g.width, g.height, 16);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const y = g.y + g.gap * (i + 1);
      const active = this.activeStrings.has(i);
      ctx.strokeStyle = active && settings.visualFeedback ? '#22e6a2' : '#efe4ca';
      ctx.lineWidth = 1.5 + i * 0.35;
      ctx.beginPath();
      ctx.moveTo(g.x + 25, y);
      ctx.lineTo(g.x + g.width - 25, y);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(STRING_NAMES[i], g.x - 10, y + 5);
    }

    ctx.fillStyle = 'rgba(0,0,0,.68)';
    ctx.fillRect(g.x + 14, g.y + 10, 200, 36);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 17px Arial';
    ctx.fillText(`Acorde: ${this.currentChord}`, g.x + 24, g.y + 34);
    ctx.restore();
  }
}
