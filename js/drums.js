import { SENSITIVITY } from './config.js';
import { clamp, normalizedToScreen, velocityPxPerSecond } from './utils.js';
import { countFingers } from './gestures.js';

const LABELS = {
  kick: 'Bumbo', snare: 'Caixa', hat: 'Hi-Hat',
  tom1: 'Tom 1', tom2: 'Tom 2', crash: 'Crash', ride: 'Ride',
};

export class DrumController {
  constructor(audio, onHit) {
    this.audio = audio;
    this.onHit = onHit;
    this.history = new Map();
    this.cooldowns = new Map();
    this.active = new Map();
  }

  reset() {
    this.history.clear();
    this.cooldowns.clear();
    this.active.clear();
  }

  pads(canvas, calibration) {
    const W = canvas.width;
    const H = canvas.height;
    const o = calibration.offsetY;
    return [
      { id: 'crash', x: W * 0.16, y: H * 0.43 + o, r: W * 0.038 },
      { id: 'ride', x: W * 0.84, y: H * 0.43 + o, r: W * 0.038 },
      { id: 'tom1', x: W * 0.39, y: H * 0.54 + o, r: W * 0.034 },
      { id: 'tom2', x: W * 0.60, y: H * 0.54 + o, r: W * 0.034 },
      { id: 'hat', x: W * 0.23, y: H * 0.69 + o, r: W * 0.039 },
      { id: 'snare', x: W * 0.48, y: H * 0.68 + o, r: W * 0.042 },
      { id: 'kick', x: W * 0.72, y: H * 0.71 + o, r: W * 0.045 },
    ];
  }

  processVirtual(hands, canvas, settings, calibration, now) {
    const threshold = SENSITIVITY[settings.sensitivity].drumVelocity;
    const pads = this.pads(canvas, calibration);

    for (const hand of hands) {
      for (const tip of [8, 12]) {
        const point = normalizedToScreen(hand.landmarks[tip], canvas, settings.mirrorCamera);
        const current = { ...point, t: now };
        const id = `${hand.id}:${tip}`;
        const previous = this.history.get(id);
        this.history.set(id, current);
        if (!previous) continue;

        const { vy } = velocityPxPerSecond(previous, current);
        if (vy < threshold) continue;

        for (const pad of pads) {
          const inside = Math.hypot(current.x - pad.x, current.y - pad.y) <= pad.r;
          if (!inside) continue;
          const prevInside = Math.hypot(previous.x - pad.x, previous.y - pad.y) <= pad.r;
          if (prevInside && previous.y > pad.y - pad.r * 0.35) continue;

          const cooldownKey = `${id}:${pad.id}`;
          if ((this.cooldowns.get(cooldownKey) || 0) > now) continue;
          this.cooldowns.set(cooldownKey, now + 105);
          this.active.set(pad.id, now + 135);
          const velocity = clamp((vy - threshold) / 1000 + 0.35, 0.3, 1);
          this.audio.drumHit(pad.id, velocity);
          this.onHit?.(pad.id, LABELS[pad.id], now, velocity);
          break;
        }
      }
    }

    this.prune(now);
  }

  processGestures(hands, canvas, settings, now) {
    const threshold = SENSITIVITY[settings.sensitivity].drumVelocity * 0.85;
    const map = { 0: 'kick', 1: 'hat', 2: 'snare', 3: 'tom1', 4: 'crash', 5: 'ride' };

    for (const hand of hands) {
      const p = normalizedToScreen(hand.landmarks[9], canvas, settings.mirrorCamera);
      const current = { ...p, t: now };
      const id = `gesture:${hand.id}`;
      const previous = this.history.get(id);
      this.history.set(id, current);
      if (!previous) continue;
      const { vy } = velocityPxPerSecond(previous, current);
      if (vy < threshold) continue;

      const drum = map[countFingers(hand.landmarks)];
      const cooldownKey = `gesture:${hand.handedness}`;
      if ((this.cooldowns.get(cooldownKey) || 0) > now) continue;
      this.cooldowns.set(cooldownKey, now + 130);
      this.audio.drumHit(drum, clamp((vy - threshold) / 1000 + 0.4, 0.3, 1));
      this.active.set(drum, now + 135);
      this.onHit?.(drum, LABELS[drum], now, 0.7);
    }
    this.prune(now);
  }

  prune(now) {
    for (const [key, until] of this.cooldowns) if (until + 1000 < now) this.cooldowns.delete(key);
    for (const [key, until] of this.active) if (until < now) this.active.delete(key);
  }

  render(ctx, canvas, calibration, settings) {
    ctx.save();
    for (const pad of this.pads(canvas, calibration)) {
      const active = this.active.has(pad.id);
      const radius = pad.r * (active && settings.visualFeedback ? 1.12 : 1);
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = active && settings.visualFeedback ? 'rgba(34,230,162,.80)' : 'rgba(25,37,33,.72)';
      ctx.strokeStyle = active ? '#9bffdd' : '#7f958e';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(13, Math.floor(canvas.width / 78))}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(LABELS[pad.id], pad.x, pad.y + 5);
    }
    ctx.restore();
  }
}
