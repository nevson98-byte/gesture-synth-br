import { noteParts, translateNote, clamp } from './utils.js';

export function createDemoLesson() {
  const sequence = [
    ['C4'], ['C4'], ['G4'], ['G4'], ['A4'], ['A4'], ['G4'],
    ['F4'], ['F4'], ['E4'], ['E4'], ['D4'], ['D4'], ['C4'],
  ];
  return {
    bpm: 109,
    title: 'Demonstração',
    events: sequence.map((notes, i) => ({ time: i * 0.55, duration: 0.42, notes, velocity: 0.8 })),
  };
}

export class LessonEngine {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.reset();
  }

  reset() {
    this.events = [];
    this.active = false;
    this.mode = 'flow';
    this.difficulty = 'normal';
    this.speed = 1;
    this.index = 0;
    this.startedAt = 0;
    this.correct = 0;
    this.errors = 0;
    this.feedback = '';
    this.pendingNotes = new Set();
    this.bpm = 100;
  }

  load({ events, bpm = 100, title = '' }) {
    this.events = events || [];
    this.bpm = bpm;
    this.title = title;
    this.index = 0;
    this.correct = 0;
    this.errors = 0;
    this.pendingNotes.clear();
    this.onUpdate?.(this.snapshot());
  }

  start({ mode = 'flow', difficulty = 'normal', speed = 1 } = {}) {
    if (!this.events.length) return false;
    this.mode = mode;
    this.difficulty = difficulty;
    this.speed = Number(speed) || 1;
    this.active = true;
    this.index = 0;
    this.correct = 0;
    this.errors = 0;
    this.feedback = '';
    this.pendingNotes = new Set(this.events[0]?.notes || []);
    this.startedAt = performance.now();
    this.onUpdate?.(this.snapshot());
    return true;
  }

  stop() {
    this.active = false;
    this.pendingNotes.clear();
    this.onUpdate?.(this.snapshot());
  }

  currentTime(now = performance.now()) {
    if (!this.active) return 0;
    if (this.mode === 'training') return this.events[this.index]?.time || 0;
    return ((now - this.startedAt) / 1000) * this.speed;
  }

  update(now = performance.now()) {
    if (!this.active) return this.snapshot();
    if (this.index >= this.events.length) {
      this.feedback = 'CONCLUÍDO';
      this.stop();
      return this.snapshot();
    }

    if (this.mode === 'flow') {
      const expected = this.events[this.index];
      const deltaMs = (this.currentTime(now) - expected.time) * 1000;
      if (deltaMs > 420) {
        this.errors += Math.max(1, this.pendingNotes.size || expected.notes.length);
        this.feedback = 'ERRO';
        this.advance();
      }
    }

    this.onUpdate?.(this.snapshot());
    return this.snapshot();
  }

  registerPlayed(note, playedAt = performance.now()) {
    if (!this.active || this.index >= this.events.length) return null;
    const expected = this.events[this.index];
    const match = this.matchesExpected(note, expected.notes);
    let timingMs = 0;

    if (this.mode === 'flow') timingMs = (this.currentTime(playedAt) - expected.time) * 1000;

    if (match) {
      const matchedExpected = this.findMatchingExpected(note, expected.notes);
      if (matchedExpected) this.pendingNotes.delete(matchedExpected);
      this.correct++;
      this.feedback = this.mode === 'training' ? 'CORRETO' : this.timingLabel(timingMs);
      if (this.pendingNotes.size === 0) this.advance();
    } else {
      this.errors++;
      this.feedback = 'ERRO';
    }

    this.onUpdate?.(this.snapshot());
    return { correct: match, feedback: this.feedback, timingMs };
  }

  matchesExpected(played, expectedNotes) {
    return Boolean(this.findMatchingExpected(played, expectedNotes));
  }

  findMatchingExpected(played, expectedNotes) {
    const p = noteParts(played);
    if (!p) return null;

    for (const expected of expectedNotes) {
      const e = noteParts(expected);
      if (!e) continue;
      if (this.difficulty === 'easy') {
        if (p.pitch === e.pitch) return expected;
      } else if (this.difficulty === 'normal') {
        if (p.pitch === e.pitch && (p.octave === e.octave || Math.abs((p.octave ?? 0) - (e.octave ?? 0)) <= 1)) return expected;
      } else if (p.pitch === e.pitch && p.octave === e.octave) {
        return expected;
      }
    }
    return null;
  }

  timingLabel(ms) {
    const abs = Math.abs(ms);
    if (abs <= 100) return 'PERFEITO';
    if (abs <= 250) return 'BOM';
    if (abs <= 400) return ms < 0 ? 'ADIANTADO' : 'ATRASADO';
    return 'ERRO';
  }

  advance() {
    this.index++;
    this.pendingNotes = new Set(this.events[this.index]?.notes || []);
    if (this.index >= this.events.length) {
      this.feedback = 'CONCLUÍDO';
      this.active = false;
    }
  }

  snapshot() {
    const total = this.correct + this.errors;
    const pct = total ? Math.round((this.correct / total) * 100) : 100;
    const event = this.events[this.index] || null;
    return {
      active: this.active,
      index: this.index,
      totalEvents: this.events.length,
      expected: event,
      expectedLabel: event ? event.notes.map((n) => translateNote(n)).join(' + ') : '—',
      correct: this.correct,
      errors: this.errors,
      accuracy: clamp(pct, 0, 100),
      feedback: this.feedback,
      bpm: this.bpm,
    };
  }

  upcoming(limit = 16) {
    return this.events.slice(this.index, this.index + limit);
  }
}
