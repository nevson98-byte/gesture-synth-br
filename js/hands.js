import { HandLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm';
import { PUBLIC_CONFIG } from './config.js';
import { normalizedToScreen } from './utils.js';

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],[0,17],
];

export class HandTracker {
  constructor() {
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.lastInferenceAt = 0;
    this.targetIntervalMs = 1000 / 30;
    this.ready = false;
    this.lastResult = [];
  }

  async initialize() {
    if (this.ready) return;
    const cfg = PUBLIC_CONFIG.mediapipe;
    const vision = await FilesetResolver.forVisionTasks(cfg.wasmBaseUrl);

    const options = {
      baseOptions: {
        modelAssetPath: cfg.modelUrl,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: cfg.numHands,
      minHandDetectionConfidence: cfg.minHandDetectionConfidence,
      minHandPresenceConfidence: cfg.minHandPresenceConfidence,
      minTrackingConfidence: cfg.minTrackingConfidence,
    };

    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, options);
    } catch (error) {
      // Alguns dispositivos não suportam o delegate GPU. Fazemos fallback para CPU.
      delete options.baseOptions.delegate;
      this.landmarker = await HandLandmarker.createFromOptions(vision, options);
    }

    this.ready = true;
  }

  detect(video, timestampMs) {
    if (!this.ready || !this.landmarker || video.readyState < 2) return this.lastResult;
    if (video.currentTime === this.lastVideoTime) return this.lastResult;
    if (timestampMs - this.lastInferenceAt < this.targetIntervalMs) return this.lastResult;

    this.lastVideoTime = video.currentTime;
    this.lastInferenceAt = timestampMs;

    const result = this.landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.landmarks || [];
    const handedness = result.handedness || [];

    this.lastResult = landmarks.map((hand, index) => {
      const category = handedness[index]?.[0] || {};
      return {
        id: `${category.categoryName || 'Unknown'}-${index}`,
        landmarks: hand,
        handedness: category.categoryName || 'Unknown',
        confidence: Number(category.score || 0),
      };
    });

    return this.lastResult;
  }

  reset() {
    this.lastVideoTime = -1;
    this.lastInferenceAt = 0;
    this.lastResult = [];
  }

  close() {
    try { this.landmarker?.close?.(); } catch {}
    this.landmarker = null;
    this.ready = false;
    this.reset();
  }
}

export function getAnatomicalHands(hands) {
  let left = null;
  let right = null;
  for (const hand of hands) {
    if (hand.handedness === 'Left' && (!left || hand.confidence > left.confidence)) left = hand;
    if (hand.handedness === 'Right' && (!right || hand.confidence > right.confidence)) right = hand;
  }

  // Fallback somente quando handedness não veio disponível.
  if (!left && !right && hands.length) {
    const ordered = [...hands].sort((a, b) => a.landmarks[0].x - b.landmarks[0].x);
    if (ordered.length === 1) {
      const wristX = ordered[0].landmarks[0].x;
      if (wristX < 0.5) right = ordered[0];
      else left = ordered[0];
    } else {
      right = ordered[0];
      left = ordered[ordered.length - 1];
    }
  }

  return { left, right };
}

export function drawCameraFrame(ctx, video, canvas, mirror = true) {
  ctx.save();
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function drawHandSkeleton(ctx, hand, canvas, { mirror = true, color = '#22e6a2', confidence = true } = {}) {
  if (!hand?.landmarks) return;
  const points = hand.landmarks.map((lm) => normalizedToScreen(lm, canvas, mirror));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.9;
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(points[a].x, points[a].y);
    ctx.lineTo(points[b].x, points[b].y);
    ctx.stroke();
  }

  for (const point of points) {
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (confidence) {
    const wrist = points[0];
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    ctx.fillRect(wrist.x - 45, wrist.y + 9, 90, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${hand.handedness} ${Math.round(hand.confidence * 100)}%`, wrist.x, wrist.y + 24);
  }
  ctx.restore();
}
