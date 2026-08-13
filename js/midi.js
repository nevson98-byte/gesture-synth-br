import { PUBLIC_CONFIG } from './config.js';

function groupNotesByOnset(notes, tolerance) {
  const sorted = [...notes].sort((a, b) => a.time - b.time || a.midi - b.midi);
  const groups = [];

  for (const note of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(note.time - last.time) <= tolerance) {
      last.notes.push(note.name);
      last.duration = Math.max(last.duration, note.duration);
      last.velocity = Math.max(last.velocity, note.velocity);
    } else {
      groups.push({
        time: note.time,
        duration: note.duration,
        notes: [note.name],
        velocity: note.velocity,
      });
    }
  }
  return groups;
}

function dedupeNotes(notes) {
  return [...new Set(notes)];
}

function simplify(groups, difficulty) {
  if (difficulty === 'full') {
    return groups.map((g) => ({ ...g, notes: dedupeNotes(g.notes) }));
  }

  if (difficulty === 'easy') {
    return groups.map((g) => {
      const parsed = g.notes.map((note) => ({ note, midi: noteToMidi(note) })).filter((x) => Number.isFinite(x.midi));
      parsed.sort((a, b) => b.midi - a.midi);
      return { ...g, notes: parsed.length ? [parsed[0].note] : g.notes.slice(0, 1) };
    }).filter((g, index, arr) => index === 0 || g.time - arr[index - 1].time >= 0.11);
  }

  return groups.map((g) => ({ ...g, notes: dedupeNotes(g.notes).slice(0, 4) }));
}

function noteToMidi(note) {
  const match = String(note).match(/^([A-G])(#?)(-?\d+)$/);
  if (!match) return NaN;
  const pitch = match[1] + match[2];
  const octave = Number(match[3]);
  const pc = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 }[pitch];
  return (octave + 1) * 12 + pc;
}

export async function importMidiFile(file, difficulty = 'normal') {
  const { Midi } = await import('https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm');
  const midi = new Midi(await file.arrayBuffer());
  const notes = [];

  for (const track of midi.tracks) {
    for (const note of track.notes) {
      notes.push({
        name: note.name,
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
      });
    }
  }

  const groups = groupNotesByOnset(notes, PUBLIC_CONFIG.midi.chordToleranceSeconds);
  return {
    bpm: midi.header.tempos[0]?.bpm || 100,
    events: simplify(groups, difficulty),
    title: file.name.replace(/\.midi?$/i, ''),
  };
}
