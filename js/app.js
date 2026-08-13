import { APP_VERSION, PUBLIC_CONFIG, DEFAULT_SETTINGS, SENSITIVITY } from './config.js';
import { appState, updateSettings } from './state.js';
import { CameraManager, cameraErrorMessage } from './camera.js';
import { HandTracker, getAnatomicalHands, drawCameraFrame, drawHandSkeleton } from './hands.js';
import { AudioEngine } from './audio.js';
import { PianoController } from './piano.js';
import { GuitarController } from './guitar.js';
import { DrumController } from './drums.js';
import { SynthController } from './synth.js';
import { LessonEngine, createDemoLesson } from './lessons.js';
import { importMidiFile } from './midi.js';
import { parseYouTubeId, embedUrl } from './youtube.js';
import { analyzeAudio } from './audio-analysis.js';
import { renderPix, copyPix } from './pix.js';
import { UI } from './ui.js';
import { clamp, normalizedToScreen, translateNote, formatTime } from './utils.js';
import { trackEvent } from './analytics.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');
const ui = new UI();
const camera = new CameraManager(video);
const handTracker = new HandTracker();
const audio = new AudioEngine();

let lastDetectionCountAt = performance.now();
let detectionCount = 0;
let inferenceFps = 0;
let handsLostReset = false;
let currentHands = [];
let currentAnatomical = { left: null, right: null };
let renderLoopId = 0;
let metronomeEnabled = false;

const lesson = new LessonEngine((snapshot) => updateLessonUi(snapshot));

function onMusicalNote(note, timestamp) {
  document.getElementById('hudNote').textContent = translateNote(note);
  lesson.registerPlayed(note, timestamp);
}

const piano = new PianoController(audio, onMusicalNote);
const guitar = new GuitarController(audio, onMusicalNote);
const drums = new DrumController(audio, (_id, label) => {
  document.getElementById('hudNote').textContent = label;
});
const synth = new SynthController(audio, onMusicalNote);

const INSTRUMENT_NAMES = {
  piano: 'Piano',
  guitar: 'Violão',
  drums: 'Bateria',
  synth: 'Sintetizador',
};

function loadSavedSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem('gsbr-settings') || '{}');
    updateSettings({ ...DEFAULT_SETTINGS, ...stored });
  } catch {
    updateSettings(DEFAULT_SETTINGS);
  }
}

function saveSettings() {
  localStorage.setItem('gsbr-settings', JSON.stringify(appState.settings));
}

function resetTrackingState({ stopAudio = true } = {}) {
  piano.reset();
  guitar.reset();
  drums.reset();
  synth.reset();
  handTracker.reset();
  if (stopAudio) audio.stopAll();
  document.getElementById('hudNote').textContent = '—';
}

function roleHands() {
  const { left, right } = currentAnatomical;
  const dominantRight = appState.settings.dominantHand === 'right';
  return {
    dominant: dominantRight ? (right || left) : (left || right),
    secondary: dominantRight ? (left || right) : (right || left),
    chord: dominantRight ? left : right,
    strum: dominantRight ? right : left,
  };
}

async function initializeApp() {
  loadSavedSettings();
  bindUi();
  syncSettingsForm();
  ui.checkOrientation();
  ui.setLoading('interface', 'ok');
  ui.setLoading('audio', 'waiting');
  ui.setLoading('camera', 'waiting');

  try {
    await handTracker.initialize();
    ui.setLoading('hands', 'ok');
  } catch (error) {
    console.error(error);
    ui.setLoading('hands', 'error');
    ui.message('Não foi possível carregar o reconhecimento das mãos. Verifique sua conexão.');
  }

  appState.appReady = true;
  ui.hideLoading();
  ui.open('welcomeModal');
  updateInstrumentUi();
  startRenderLoop();
}

async function startCamera() {
  try {
    ui.el.cameraStatus.textContent = 'Iniciando câmera...';
    await camera.start({ quality: appState.settings.cameraQuality, facingMode: appState.settings.facingMode });
    appState.cameraReady = true;
    ui.el.cameraStatus.textContent = 'Câmera ativa';
    ui.setLoading('camera', 'ok');
    resetTrackingState({ stopAudio: false });
    trackEvent('camera_allowed');
    ui.message('Mostre suas mãos para a câmera.', 1800);
  } catch (error) {
    appState.cameraReady = false;
    ui.el.cameraStatus.textContent = 'Câmera indisponível';
    ui.message(cameraErrorMessage(error));
  }
}

async function startAudio() {
  try {
    await audio.start();
    audio.setMasterVolume(appState.settings.masterVolume);
    appState.audioEnabled = true;
    document.getElementById('btnSound').textContent = '✅ Som ativo';
    ui.el.audioStatus.textContent = '🔊 Som ativo';
    ui.setLoading('audio', 'ok');
  } catch (error) {
    console.error(error);
    ui.message('Não foi possível ativar o áudio. Toque novamente no botão.');
  }
}

function startRenderLoop() {
  const loop = (now) => {
    renderLoopId = requestAnimationFrame(loop);
    if (!appState.cameraReady || video.readyState < 2) {
      drawIdle();
      return;
    }

    drawCameraFrame(ctx, video, canvas, appState.settings.mirrorCamera);

    const beforeInference = handTracker.lastInferenceAt;
    currentHands = handTracker.detect(video, now) || [];
    if (handTracker.lastInferenceAt !== beforeInference) {
      detectionCount++;
      const elapsed = now - lastDetectionCountAt;
      if (elapsed >= 1000) {
        inferenceFps = (detectionCount * 1000) / elapsed;
        detectionCount = 0;
        lastDetectionCountAt = now;
        appState.tracking.fps = inferenceFps;
        camera.maybeAutoReduce(inferenceFps).then((reduced) => {
          if (reduced) ui.message('Desempenho baixo detectado: qualidade da câmera reduzida automaticamente.', 2200);
        });
      }
    }

    currentAnatomical = getAnatomicalHands(currentHands);
    appState.hands = currentHands;
    appState.leftHand = currentAnatomical.left;
    appState.rightHand = currentAnatomical.right;
    ui.updateHands(currentAnatomical.left, currentAnatomical.right);

    if (currentHands.length) {
      appState.tracking.lastHandsSeenAt = now;
      handsLostReset = false;
    } else if (!handsLostReset && now - appState.tracking.lastHandsSeenAt > 550) {
      resetTrackingState();
      handsLostReset = true;
    }

    if (appState.settings.showLandmarks) {
      for (const hand of currentHands) {
        drawHandSkeleton(ctx, hand, canvas, {
          mirror: appState.settings.mirrorCamera,
          confidence: appState.settings.debug,
        });
      }
    }

    processInstrument(now);
    renderInstrument(now);
    updateLesson(now);

    if (appState.settings.debug) {
      ui.el.debugPanel.classList.remove('hidden');
      ui.updateDebug({
        fps: inferenceFps,
        hands: currentHands,
        quality: camera.autoReduced ? 'auto→baixa' : appState.settings.cameraQuality,
        instrument: appState.instrument,
        mode: appState.mode,
      });
    } else {
      ui.el.debugPanel.classList.add('hidden');
    }
  };
  renderLoopId = requestAnimationFrame(loop);
}

function drawIdle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#050807';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#a8bbb5';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Câmera aguardando permissão', canvas.width / 2, canvas.height / 2);
}

function processInstrument(now) {
  if (!currentHands.length) return;
  const roles = roleHands();

  if (appState.mode === 'virtual') {
    synth.reset();
    if (appState.instrument === 'piano') {
      piano.process(currentHands, canvas, appState.settings, appState.calibration, now);
    } else if (appState.instrument === 'guitar') {
      const chord = guitar.updateChord(roles.chord, appState.settings, now);
      document.getElementById('hudNote').textContent = chord;
      guitar.processStrum(roles.strum, canvas, appState.settings, appState.calibration, now);
    } else if (appState.instrument === 'drums') {
      drums.processVirtual(currentHands, canvas, appState.settings, appState.calibration, now);
    }
    return;
  }

  if (appState.instrument === 'drums') {
    synth.reset();
    drums.processGestures(currentHands, canvas, appState.settings, now);
    return;
  }

  const note = synth.processNote(roles.dominant, appState.settings, now, appState.instrument);
  if (note) document.getElementById('hudNote').textContent = translateNote(note);
  if (appState.instrument === 'synth') synth.processExpression(roles.secondary, appState.settings);
}

function renderInstrument(now) {
  if (appState.mode !== 'virtual') return;
  if (appState.instrument === 'piano') piano.render(ctx, canvas, appState.calibration, appState.settings);
  if (appState.instrument === 'guitar') guitar.render(ctx, canvas, appState.calibration, appState.settings);
  if (appState.instrument === 'drums') drums.render(ctx, canvas, appState.calibration, appState.settings);

  if (lesson.active && appState.instrument === 'piano') {
    piano.renderLessonGuide(
      ctx,
      canvas,
      appState.calibration,
      lesson.events,
      lesson.currentTime(now),
      lesson.index,
    );
  }
}

function updateLesson(now) {
  if (!lesson.active) return;
  const snapshot = lesson.update(now);
  let timingText = '';
  if (snapshot.expected) {
    if (lesson.mode === 'training') timingText = 'Toque para continuar';
    else {
      const delta = snapshot.expected.time - lesson.currentTime(now);
      timingText = delta > 0 ? `em ${delta.toFixed(1)} s` : 'AGORA';
    }
  }
  ui.updateLesson(snapshot, timingText);
  if (!snapshot.active && snapshot.feedback === 'CONCLUÍDO') {
    ui.message('🎉 Aula concluída!', 2500);
    audio.stopMetronome();
  }
}

function updateLessonUi(snapshot) {
  if (!snapshot) return;
  ui.updateLesson(snapshot);
}

function selectInstrument(instrument, mode) {
  resetTrackingState();
  appState.instrument = instrument;
  appState.mode = instrument === 'synth' ? 'gestures' : mode;
  updateInstrumentUi();
  ui.close('instrumentModal');
  trackEvent('instrument_selected', { instrument });
  trackEvent('mode_selected', { mode: appState.mode });
}

function updateInstrumentUi() {
  ui.updateInstrument(INSTRUMENT_NAMES[appState.instrument], appState.mode);
  document.querySelectorAll('[data-instrument]').forEach((button) => {
    button.classList.toggle('active', button.dataset.instrument === appState.instrument);
  });
}

async function calibrate() {
  if (!currentHands.length) {
    ui.message('Mostre pelo menos uma mão para calibrar.', 1800);
    return;
  }

  for (const label of ['3', '2', '1']) {
    ui.message(`🎯 Calibrando em ${label}...`);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  const visiblePoints = currentHands.map((hand) => normalizedToScreen(hand.landmarks[9], canvas, appState.settings.mirrorCamera));
  const avgY = visiblePoints.reduce((sum, p) => sum + p.y, 0) / visiblePoints.length;
  appState.calibration.offsetY = clamp(avgY - canvas.height * 0.5, -95, 75);
  appState.calibration.calibrated = true;
  resetTrackingState();
  ui.message('✅ Calibração concluída.', 1500);
}

function syncSettingsForm() {
  document.getElementById('settingDominant').value = appState.settings.dominantHand;
  document.getElementById('settingSensitivity').value = appState.settings.sensitivity;
  document.getElementById('settingQuality').value = appState.settings.cameraQuality;
  document.getElementById('settingVolume').value = appState.settings.masterVolume;
  document.getElementById('settingLandmarks').checked = appState.settings.showLandmarks;
  document.getElementById('settingMirror').checked = appState.settings.mirrorCamera;
  document.getElementById('settingFeedback').checked = appState.settings.visualFeedback;
  document.getElementById('settingDebug').checked = appState.settings.debug;
}

async function applySettings() {
  const oldQuality = appState.settings.cameraQuality;
  updateSettings({
    dominantHand: document.getElementById('settingDominant').value,
    sensitivity: document.getElementById('settingSensitivity').value,
    cameraQuality: document.getElementById('settingQuality').value,
    masterVolume: Number(document.getElementById('settingVolume').value),
    showLandmarks: document.getElementById('settingLandmarks').checked,
    mirrorCamera: document.getElementById('settingMirror').checked,
    visualFeedback: document.getElementById('settingFeedback').checked,
    debug: document.getElementById('settingDebug').checked,
  });
  audio.setMasterVolume(appState.settings.masterVolume);
  saveSettings();
  resetTrackingState();
  ui.close('settingsModal');

  if (appState.cameraReady && oldQuality !== appState.settings.cameraQuality) {
    try {
      await camera.restart({ quality: appState.settings.cameraQuality, facingMode: appState.settings.facingMode });
    } catch (error) {
      ui.message(cameraErrorMessage(error));
    }
  }
}

async function switchCamera() {
  if (!appState.cameraReady) return;
  try {
    await camera.switchFacingMode();
    appState.settings.facingMode = camera.facingMode;
    if (camera.facingMode === 'environment') appState.settings.mirrorCamera = false;
    else appState.settings.mirrorCamera = true;
    saveSettings();
    syncSettingsForm();
    resetTrackingState();
    ui.message(camera.facingMode === 'environment' ? '📷 Câmera traseira' : '🤳 Câmera frontal', 1400);
  } catch (error) {
    ui.message(cameraErrorMessage(error));
  }
}

async function enterFullscreen() {
  const target = document.getElementById('stage');
  try {
    if (!document.fullscreenElement) await target.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch {
    ui.message('Tela cheia não está disponível neste navegador.', 1600);
  }
}

function renderGuidePreview() {
  const box = document.getElementById('guidePreview');
  box.innerHTML = '';
  for (const event of lesson.events.slice(0, 100)) {
    const row = document.createElement('div');
    row.className = 'guide-row';
    const notes = event.notes.map((note) => translateNote(note)).join(' + ');
    row.innerHTML = `<span>${formatTime(event.time)}</span><strong>${notes}</strong><span>${event.duration.toFixed(2)} s</span>`;
    box.appendChild(row);
  }
}

async function handleMidiImport() {
  const file = document.getElementById('midiFile').files[0];
  const msg = document.getElementById('analysisMessage');
  if (!file) {
    msg.textContent = 'Selecione um arquivo MIDI primeiro.';
    return;
  }
  msg.textContent = 'Carregando MIDI...';
  try {
    const difficulty = document.getElementById('difficulty').value;
    const data = await importMidiFile(file, difficulty);
    lesson.load(data);
    msg.textContent = `MIDI carregado: ${data.events.length} eventos • BPM aproximado: ${Math.round(data.bpm)}`;
    renderGuidePreview();
    trackEvent('midi_imported');
  } catch (error) {
    console.error(error);
    msg.textContent = 'Não foi possível ler este MIDI.';
  }
}

async function handleAudioAnalysis() {
  const file = document.getElementById('audioFile').files[0];
  const msg = document.getElementById('analysisMessage');
  if (!file) {
    msg.textContent = 'Escolha um arquivo de áudio.';
    return;
  }
  msg.textContent = 'Preparando análise...';
  try {
    const data = await analyzeAudio(file);
    lesson.load({ bpm: data.bpm || 100, events: data.events || [], title: file.name });
    msg.textContent = `Análise concluída: ${lesson.events.length} eventos.`;
    renderGuidePreview();
  } catch (error) {
    msg.textContent = error.message;
  }
}

async function startLesson() {
  if (!lesson.events.length) {
    ui.message('Carregue a demonstração ou um MIDI primeiro.', 1800);
    return;
  }
  if (!appState.audioEnabled) await startAudio();

  const instrument = document.getElementById('lessonInstrument').value;
  selectInstrument(instrument, 'virtual');
  const started = lesson.start({
    mode: document.getElementById('lessonMode').value,
    difficulty: document.getElementById('difficulty').value,
    speed: Number(document.getElementById('lessonSpeed').value),
  });
  if (!started) return;

  if (metronomeEnabled) audio.startMetronome(lesson.bpm);
  ui.close('learnModal');
  trackEvent('lesson_started');
}

function bindUi() {
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => ui.close(button.dataset.close));
  });

  document.getElementById('btnBegin').addEventListener('click', async () => {
    ui.close('welcomeModal');
    await startCamera();
  });

  document.getElementById('btnSound').addEventListener('click', startAudio);
  document.getElementById('btnSettings').addEventListener('click', () => { syncSettingsForm(); ui.open('settingsModal'); });
  document.getElementById('btnPrivacy').addEventListener('click', () => ui.open('privacyModal'));
  document.getElementById('btnCalibrate').addEventListener('click', calibrate);
  document.getElementById('btnSwitchCamera').addEventListener('click', switchCamera);
  document.getElementById('btnFullscreen').addEventListener('click', enterFullscreen);
  document.getElementById('btnApplySettings').addEventListener('click', applySettings);

  document.getElementById('btnStop').addEventListener('click', () => {
    resetTrackingState();
    lesson.stop();
    audio.stopMetronome();
    document.getElementById('hudNote').textContent = '—';
  });

  document.querySelectorAll('[data-instrument]').forEach((button) => {
    button.addEventListener('click', () => {
      appState.tempInstrument = button.dataset.instrument;
      document.getElementById('instrumentTitle').textContent = INSTRUMENT_NAMES[appState.tempInstrument];
      document.getElementById('virtualModeButton').classList.toggle('hidden', appState.tempInstrument === 'synth');
      ui.open('instrumentModal');
    });
  });

  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => selectInstrument(appState.tempInstrument || appState.instrument, button.dataset.mode));
  });

  document.getElementById('btnLearn').addEventListener('click', () => ui.open('learnModal'));
  document.getElementById('btnMidi').addEventListener('click', handleMidiImport);
  document.getElementById('btnAnalyzeAudio').addEventListener('click', handleAudioAnalysis);
  document.getElementById('btnDemo').addEventListener('click', () => {
    const data = createDemoLesson();
    lesson.load(data);
    document.getElementById('analysisMessage').textContent = 'Demonstração carregada. Pressione “Iniciar aula”.';
    renderGuidePreview();
  });
  document.getElementById('btnStartLesson').addEventListener('click', startLesson);
  document.getElementById('btnMetronome').addEventListener('click', () => {
    metronomeEnabled = !metronomeEnabled;
    document.getElementById('btnMetronome').textContent = metronomeEnabled ? '🥁 Metrônomo: ON' : '🥁 Metrônomo: OFF';
  });

  document.getElementById('btnYoutube').addEventListener('click', () => {
    const id = parseYouTubeId(document.getElementById('youtubeUrl').value);
    const msg = document.getElementById('analysisMessage');
    if (!id) {
      msg.textContent = 'Não consegui identificar esse link do YouTube.';
      return;
    }
    document.getElementById('youtubeFrame').src = embedUrl(id);
    document.getElementById('youtubeBox').classList.remove('hidden');
  });

  document.getElementById('btnPix').addEventListener('click', () => {
    ui.open('pixModal');
    renderPix(
      document.getElementById('pixQr'),
      document.getElementById('pixCode'),
      document.getElementById('pixReceiver'),
      document.getElementById('btnOpenNubank'),
    );
  });

  document.getElementById('btnCopyPix').addEventListener('click', async () => {
    const button = document.getElementById('btnCopyPix');
    try {
      await copyPix();
      button.textContent = '✅ Pix copiado!';
      setTimeout(() => { button.textContent = '📋 Copiar Pix'; }, 1600);
    } catch {
      ui.message('Não foi possível copiar automaticamente. Selecione o código Pix manualmente.', 2000);
    }
  });

  window.addEventListener('orientationchange', () => {
    resetTrackingState();
    setTimeout(() => ui.checkOrientation(), 300);
  });
  window.addEventListener('resize', () => ui.checkOrientation());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resetTrackingState();
      audio.stopMetronome();
    }
  });
}

initializeApp().catch((error) => {
  console.error(error);
  ui.message('Falha ao iniciar o Gesture Synth BR. Recarregue a página e tente novamente.');
});

console.info(`Gesture Synth BR ${APP_VERSION}`);
console.info('MediaPipe Tasks Vision:', PUBLIC_CONFIG.mediapipe.version);
console.info('Tone.js:', PUBLIC_CONFIG.audio.toneVersion);
