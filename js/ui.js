import { APP_VERSION } from './config.js';

export class UI {
  constructor() {
    this.el = {
      loading: document.getElementById('loadingOverlay'),
      loadingSteps: document.getElementById('loadingSteps'),
      welcomeModal: document.getElementById('welcomeModal'),
      instrumentModal: document.getElementById('instrumentModal'),
      settingsModal: document.getElementById('settingsModal'),
      learnModal: document.getElementById('learnModal'),
      pixModal: document.getElementById('pixModal'),
      privacyModal: document.getElementById('privacyModal'),
      centralMessage: document.getElementById('centralMessage'),
      cameraStatus: document.getElementById('cameraStatus'),
      audioStatus: document.getElementById('audioStatus'),
      hudInstrument: document.getElementById('hudInstrument'),
      hudMode: document.getElementById('hudMode'),
      hudNote: document.getElementById('hudNote'),
      hudLeft: document.getElementById('hudLeft'),
      hudRight: document.getElementById('hudRight'),
      lessonHud: document.getElementById('lessonHud'),
      lessonNext: document.getElementById('lessonNext'),
      lessonTiming: document.getElementById('lessonTiming'),
      lessonFeedback: document.getElementById('lessonFeedback'),
      scoreOk: document.getElementById('scoreOk'),
      scoreErr: document.getElementById('scoreErr'),
      scorePct: document.getElementById('scorePct'),
      debugPanel: document.getElementById('debugPanel'),
      orientationNotice: document.getElementById('orientationNotice'),
      version: document.getElementById('versionLabel'),
    };
    if (this.el.version) this.el.version.textContent = `Beta ${APP_VERSION}`;
  }

  open(id) {
    document.getElementById(id)?.classList.remove('hidden');
  }

  close(id) {
    document.getElementById(id)?.classList.add('hidden');
  }

  message(text, timeout = 0) {
    const el = this.el.centralMessage;
    el.textContent = text;
    el.classList.add('visible');
    if (timeout) setTimeout(() => el.classList.remove('visible'), timeout);
  }

  hideMessage() {
    this.el.centralMessage.classList.remove('visible');
  }

  setLoading(step, status = 'ok') {
    const target = this.el.loadingSteps?.querySelector(`[data-step="${step}"]`);
    if (!target) return;
    target.dataset.status = status;
    const icon = target.querySelector('.step-icon');
    if (icon) icon.textContent = status === 'ok' ? '✓' : status === 'error' ? '!' : '…';
  }

  hideLoading() {
    this.el.loading?.classList.add('hidden');
  }

  updateHands(left, right) {
    this.el.hudLeft.textContent = left ? `✅ ${Math.round(left.confidence * 100)}%` : '—';
    this.el.hudRight.textContent = right ? `✅ ${Math.round(right.confidence * 100)}%` : '—';
  }

  updateInstrument(name, mode) {
    this.el.hudInstrument.textContent = name;
    this.el.hudMode.textContent = mode === 'virtual' ? 'Virtual' : 'Gestos';
  }

  updateLesson(snapshot, timingText = '') {
    if (!snapshot?.active && snapshot?.feedback !== 'CONCLUÍDO') {
      this.el.lessonHud.style.display = 'none';
      return;
    }
    this.el.lessonHud.style.display = 'block';
    this.el.lessonNext.textContent = snapshot.expectedLabel || '—';
    this.el.lessonTiming.textContent = timingText || '';
    this.el.lessonFeedback.textContent = snapshot.feedback || '';
    this.el.scoreOk.textContent = snapshot.correct;
    this.el.scoreErr.textContent = snapshot.errors;
    this.el.scorePct.textContent = `${snapshot.accuracy}%`;
  }

  updateDebug({ fps, hands, quality, instrument, mode }) {
    if (!this.el.debugPanel) return;
    this.el.debugPanel.innerHTML = [
      `FPS: ${fps.toFixed(1)}`,
      `Mãos: ${hands.length}`,
      `Qualidade: ${quality}`,
      `Instrumento: ${instrument}`,
      `Modo: ${mode}`,
      ...hands.map((h) => `${h.handedness}: ${(h.confidence * 100).toFixed(0)}%`),
    ].join('<br>');
  }

  checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 850;
    this.el.orientationNotice?.classList.toggle('hidden', !portrait);
  }
}
