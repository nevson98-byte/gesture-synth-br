export const APP_VERSION = '0.9.0';
export const DEBUG_DEFAULT = false;

// Configurações públicas. Nunca coloque senhas, tokens ou chaves privadas neste arquivo.
export const PUBLIC_CONFIG = {
  mediapipe: {
    version: '1.0.1',
    wasmBaseUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
    modelUrl: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  },
  audio: {
    toneVersion: '15.1.22',
    masterVolumeDb: -6,
  },
  midi: {
    toneMidiVersion: '2.0.28',
    chordToleranceSeconds: 0.035,
  },
  pix: {
    copiaCola: '00020126580014BR.GOV.BCB.PIX01368f351478-fcc5-4444-b468-59231898bdbb5204000053039865802BR5925Nevson Soares Ferreira Ju6009SAO PAULO62140510k4p8MPi0B26304A1CF',
    recebedor: 'Nevson Soares Ferreira Junior',
    nubankUrl: 'https://nubank.com.br/cobrar/4r7xx/6a7e1636-82d7-42dc-98d4-3750a967b9ea',
  },
  analysisEndpoint: '',
};

export const CAMERA_PROFILES = {
  low: { width: 640, height: 360, frameRate: 24 },
  medium: { width: 960, height: 540, frameRate: 30 },
  high: { width: 1280, height: 720, frameRate: 30 },
};

export const DEFAULT_SETTINGS = {
  dominantHand: 'right',
  sensitivity: 'normal',
  cameraQuality: 'auto',
  masterVolume: 0.8,
  showLandmarks: true,
  mirrorCamera: true,
  visualFeedback: true,
  facingMode: 'user',
  debug: DEBUG_DEFAULT,
};

export const SENSITIVITY = {
  low: {
    pianoVelocity: 520,
    drumVelocity: 640,
    guitarVelocity: 460,
    gestureHoldMs: 260,
  },
  normal: {
    pianoVelocity: 390,
    drumVelocity: 500,
    guitarVelocity: 350,
    gestureHoldMs: 190,
  },
  high: {
    pianoVelocity: 280,
    drumVelocity: 370,
    guitarVelocity: 260,
    gestureHoldMs: 140,
  },
};

export const NOTE_NAMES_PT = {
  C: 'Dó', 'C#': 'Dó sustenido',
  D: 'Ré', 'D#': 'Ré sustenido',
  E: 'Mi',
  F: 'Fá', 'F#': 'Fá sustenido',
  G: 'Sol', 'G#': 'Sol sustenido',
  A: 'Lá', 'A#': 'Lá sustenido',
  B: 'Si',
};
