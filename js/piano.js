import { SENSITIVITY } from './config.js';
import { clamp, normalizedToScreen, velocityPxPerSecond, translateNote } from './utils.js';

const WHITE_KEYS = [
  { name: 'Dó', note: 'C4' }, { name: 'Ré', note: 'D4' }, { name: 'Mi', note: 'E4' },
  { name: 'Fá', note: 'F4' }, { name: 'Sol', note: 'G4' }, { name: 'Lá', note: 'A4' },
  { name: 'Si', note: 'B4' }, { name: 'Dó', note: 'C5' },
];

const BLACK_KEYS = [
  { after: 0, name: 'Dó♯', note: 'C#4' }, { after: 1, name: 'Ré♯', note: 'D#4' },
  { after: 3, name: 'Fá♯', note: 'F#4' }, { after: 4, name: 'Sol♯', note: 'G#4' },
  { after: 5, name: 'Lá♯', note: 'A#4' },
];

export class PianoController {
  constructor(audio, onNote) {
    this.audio = audio;
    this.onNote = onNote;
    this.history = new Map();
    this.cooldowns = new Map();
    this.active = new Map();
  }

  reset() {
    this.history.clear();
    this.cooldowns.clear();
    this.active.clear();
  }

  getLayout(canvas, calibration) {
    const width = canvas.width * 0.9;
    const x = canvas.width * 0.05;
    const baseY = canvas.height * 0.735;
    const y = clamp(baseY + calibration.offsetY, canvas.height * 0.62, canvas.height * 0.77);
    const height = canvas.height * 0.235;
    return { x, y, width, height, whiteWidth: width / WHITE_KEYS.length };
  }

  keyAt(x, y, layout) {
    for (const key of BLACK_KEYS) {
      const bx = layout.x + (key.after + 1) * layout.whiteWidth - layout.whiteWidth * 0.29;
      const bw = layout.whiteWidth * 0.58;
      const bh = layout.height * 0.58;
      if (x >= bx && x <= bx + bw && y >= layout.y && y <= layout.y + bh) return key;
    }

    if (x < layout.x || x > layout.x + layout.width || y < layout.y || y > layout.y + layout.height) return null;
    const index = Math.floor((x - layout.x) / layout.whiteWidth);
    return WHITE_KEYS[index] || null;
  }

  process(hands, canvas, settings, calibration, now) {
    const threshold = SENSITIVITY[settings.sensitivity].pianoVelocity;
    const layout = this.getLayout(canvas, calibration);
    const tips = [4, 8, 12, 16, 20];

    for (const hand of hands) {
      for (const tip of tips) {
        const point = normalizedToScreen(hand.landmarks[tip], canvas, settings.mirrorCamera);
        const current = { ...point, t: now };
        const id = `${hand.handedness}-${hand.id}-${tip}`;
        const previous = this.history.get(id);
        this.history.set(id, current);
        if (!previous) continue;

        const { vy } = velocityPxPerSecond(previous, current);
        if (vy < threshold) continue;

        const key = this.keyAt(current.x, current.y, layout);
        if (!key) continue;

        const cooldownKey = `${id}:${key.note}`;
        const cooldownUntil = this.cooldowns.get(cooldownKey) || 0;
        if (cooldownUntil > now) continue;

        const enteredFromAbove = previous.y < layout.y || !this.keyAt(previous.x, previous.y, layout);
        if (!enteredFromAbove && current.y - previous.y < 2) continue;

        this.cooldowns.set(cooldownKey, now + 135);
        this.active.set(key.note, now + 170);
        const velocity = clamp((vy - threshold) / 900 + 0.35, 0.25, 1);
        this.audio.pianoHit(key.note, velocity);
        this.onNote?.(key.note, now, velocity);
      }
    }

    this.prune(now);
  }

  prune(now) {
    for (const [key, until] of this.cooldowns) if (until + 1000 < now) this.cooldowns.delete(key);
    for (const [key, until] of this.active) if (until < now) this.active.delete(key);
  }

  render(ctx, canvas, calibration, settings) {
    const k = this.getLayout(canvas, calibration);
    ctx.save();

    WHITE_KEYS.forEach((key, i) => {
      const x = k.x + i * k.whiteWidth;
      const active = this.active.has(key.note);
      ctx.fillStyle = active && settings.visualFeedback ? '#53e8b4' : 'rgba(255,255,255,.94)';
      ctx.strokeStyle = '#111817';
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, k.y, k.whiteWidth, k.height);
      ctx.strokeRect(x, k.y, k.whiteWidth, k.height);
      ctx.fillStyle = '#111';
      ctx.font = `bold ${Math.max(14, Math.floor(canvas.width / 64))}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(key.name, x + k.whiteWidth / 2, k.y + k.height - 14);
    });

    BLACK_KEYS.forEach((key) => {
      const x = k.x + (key.after + 1) * k.whiteWidth - k.whiteWidth * 0.29;
      const w = k.whiteWidth * 0.58;
      const h = k.height * 0.58;
      const active = this.active.has(key.note);
      ctx.fillStyle = active && settings.visualFeedback ? '#13c894' : '#101312';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.fillRect(x, k.y, w, h);
      ctx.strokeRect(x, k.y, w, h);
    });

    ctx.restore();
  }

  renderLessonGuide(ctx, canvas, calibration, events, currentTime, currentIndex) {
    const k = this.getLayout(canvas, calibration);
    const mapWhite = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
    const blackMap = { 'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5 };

    for (let i = currentIndex; i < Math.min(currentIndex + 18, events.length); i++) {
      const event = events[i];
      const delta = event.time - currentTime;
      if (delta < -0.25 || delta > 5) continue;

      for (const note of event.notes) {
        const match = String(note).match(/^([A-G])(#?)/);
        if (!match) continue;
        const pitch = match[1] + match[2];
        let x;
        let w;
        if (pitch.includes('#')) {
          const after = blackMap[pitch];
          if (after === undefined) continue;
          x = k.x + (after + 1) * k.whiteWidth;
          w = k.whiteWidth * 0.36;
        } else {
          const idx = mapWhite[pitch];
          if (idx === undefined) continue;
          x = k.x + idx * k.whiteWidth + k.whiteWidth / 2;
          w = k.whiteWidth * 0.5;
        }
        const y = k.y - delta * 92;
        ctx.fillStyle = i === currentIndex ? '#22e6a2' : 'rgba(255,255,255,.55)';
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - 14, w, 28, 7);
        ctx.fill();
      }
    }
  }

  getVisibleNoteLabel(note) {
    return translateNote(note);
  }
}
