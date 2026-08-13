import { NOTE_NAMES_PT } from './config.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const nowMs = () => performance.now();

export function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function noteParts(note) {
  const match = String(note || '').match(/^([A-G])(#?)(-?\d+)?$/);
  if (!match) return null;
  return {
    pitch: `${match[1]}${match[2]}`,
    octave: match[3] === undefined ? null : Number(match[3]),
  };
}

export function translateNote(note, includeOctave = false) {
  const parts = noteParts(note);
  if (!parts) return note || '—';
  const label = NOTE_NAMES_PT[parts.pitch] || note;
  return includeOctave && parts.octave !== null ? `${label} ${parts.octave}` : label;
}

export function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

export function normalizedToScreen(landmark, canvas, mirror = true) {
  return {
    x: (mirror ? 1 - landmark.x : landmark.x) * canvas.width,
    y: landmark.y * canvas.height,
    z: landmark.z || 0,
  };
}

export function velocityPxPerSecond(previous, current) {
  if (!previous || !current) return { vx: 0, vy: 0, speed: 0, dt: 0 };
  const dt = Math.max(0.001, (current.t - previous.t) / 1000);
  const vx = (current.x - previous.x) / dt;
  const vy = (current.y - previous.y) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy), dt };
}

export function isMobileLike() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
}

export function safeText(value) {
  return String(value ?? '').replace(/[<>]/g, '');
}
