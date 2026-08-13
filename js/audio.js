import * as Tone from 'https://cdn.jsdelivr.net/npm/tone@15.1.22/+esm';
import { clamp } from './utils.js';

export class AudioEngine {
  constructor() {
    this.ready = false;
    this.sustained = new Map();
    this.synths = {};
    this.masterVolume = 0.8;
  }

  async start() {
    await Tone.start();
    if (!this.ready) this.createSynths();
    this.ready = true;
  }

  createSynths() {
    this.synths.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.006, decay: 0.45, sustain: 0.36, release: 0.75 },
    }).toDestination();
    this.synths.piano.volume.value = -7;

    this.synths.guitar = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.38, sustain: 0.06, release: 0.55 },
    }).toDestination();
    this.synths.guitar.volume.value = -6;

    this.synths.leadFilter = new Tone.Filter(1500, 'lowpass').toDestination();
    this.synths.lead = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.07, decay: 0.16, sustain: 0.82, release: 0.45 },
    }).connect(this.synths.leadFilter);
    this.synths.lead.volume.value = -11;

    this.synths.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 5,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.08 },
    }).toDestination();

    this.synths.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
    }).toDestination();

    this.synths.hat = new Tone.MetalSynth({
      frequency: 250,
      envelope: { attack: 0.001, decay: 0.055, release: 0.02 },
      harmonicity: 5.1, modulationIndex: 30, resonance: 4000, octaves: 1.5,
    }).toDestination();
    this.synths.hat.volume.value = -16;

    this.synths.tom1 = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 3 }).toDestination();
    this.synths.tom2 = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 3 }).toDestination();

    this.synths.crash = new Tone.MetalSynth({
      frequency: 170,
      envelope: { attack: 0.001, decay: 0.8, release: 0.6 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 3000, octaves: 1.5,
    }).toDestination();
    this.synths.crash.volume.value = -14;

    this.synths.ride = new Tone.MetalSynth({
      frequency: 285,
      envelope: { attack: 0.001, decay: 0.42, release: 0.28 },
      harmonicity: 4.5, modulationIndex: 24, resonance: 4500, octaves: 1,
    }).toDestination();
    this.synths.ride.volume.value = -15;

    this.synths.metronome = new Tone.MembraneSynth({
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    }).toDestination();
    this.synths.metronome.volume.value = -18;

    this.setMasterVolume(this.masterVolume);
  }

  setMasterVolume(normalized) {
    this.masterVolume = clamp(normalized, 0, 1);
    const db = this.masterVolume <= 0.001 ? -80 : -35 + this.masterVolume * 35;
    Tone.getDestination().volume.rampTo(db, 0.08);
  }

  pianoHit(note, velocity = 0.7) {
    if (!this.ready) return;
    this.synths.piano.triggerAttackRelease(note, '8n', undefined, clamp(velocity, 0.15, 1));
  }

  guitarHit(note, delaySeconds = 0, velocity = 0.65) {
    if (!this.ready || !note) return;
    this.synths.guitar.triggerAttackRelease(note, '8n', Tone.now() + Math.max(0, delaySeconds), clamp(velocity, 0.15, 1));
  }

  drumHit(id, velocity = 0.75) {
    if (!this.ready) return;
    const v = clamp(velocity, 0.2, 1);
    if (id === 'kick') this.synths.kick.triggerAttackRelease('C1', '8n', undefined, v);
    if (id === 'snare') this.synths.snare.triggerAttackRelease('16n', undefined, v);
    if (id === 'hat') this.synths.hat.triggerAttackRelease('32n', undefined, v);
    if (id === 'tom1') this.synths.tom1.triggerAttackRelease('G2', '8n', undefined, v);
    if (id === 'tom2') this.synths.tom2.triggerAttackRelease('D2', '8n', undefined, v);
    if (id === 'crash') this.synths.crash.triggerAttackRelease('2n', undefined, v);
    if (id === 'ride') this.synths.ride.triggerAttackRelease('8n', undefined, v);
  }

  startSustained(channel, instrument, note, velocity = 0.7) {
    if (!this.ready || !note) return;
    const current = this.sustained.get(channel);
    if (current?.note === note && current?.instrument === instrument) return;
    this.stopSustained(channel);

    const synth = instrument === 'guitar' ? this.synths.guitar : instrument === 'synth' ? this.synths.lead : this.synths.piano;
    synth.triggerAttack(note, undefined, clamp(velocity, 0.2, 1));
    this.sustained.set(channel, { instrument, note, synth });
  }

  stopSustained(channel) {
    const current = this.sustained.get(channel);
    if (!current) return;
    try { current.synth.triggerRelease(current.note); } catch {}
    this.sustained.delete(channel);
  }

  stopAll() {
    for (const channel of [...this.sustained.keys()]) this.stopSustained(channel);
    try { this.synths.piano?.releaseAll(); } catch {}
    try { this.synths.guitar?.releaseAll(); } catch {}
    try { this.synths.lead?.releaseAll(); } catch {}
  }

  setSynthExpression(filterNorm, volumeNorm) {
    if (!this.ready) return;
    const frequency = 250 + clamp(filterNorm, 0, 1) * 6500;
    this.synths.leadFilter.frequency.rampTo(frequency, 0.08);
    const db = -28 + clamp(volumeNorm, 0, 1) * 22;
    this.synths.lead.volume.rampTo(db, 0.08);
  }

  startMetronome(bpm = 100) {
    if (!this.ready) return;
    this.stopMetronome();
    Tone.Transport.bpm.value = bpm;
    this.metronomeLoop = new Tone.Loop((time) => {
      this.synths.metronome.triggerAttackRelease('C5', '32n', time);
    }, '4n');
    this.metronomeLoop.start(0);
    Tone.Transport.start();
  }

  stopMetronome() {
    if (this.metronomeLoop) {
      try { this.metronomeLoop.stop(); this.metronomeLoop.dispose(); } catch {}
      this.metronomeLoop = null;
    }
    try { Tone.Transport.stop(); Tone.Transport.cancel(); } catch {}
  }
}
