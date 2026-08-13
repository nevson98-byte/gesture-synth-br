import { CAMERA_PROFILES } from './config.js';
import { isMobileLike } from './utils.js';

function profileForQuality(quality) {
  if (quality === 'auto') return isMobileLike() ? CAMERA_PROFILES.medium : CAMERA_PROFILES.high;
  return CAMERA_PROFILES[quality] || CAMERA_PROFILES.medium;
}

export class CameraManager {
  constructor(video) {
    this.video = video;
    this.stream = null;
    this.quality = 'auto';
    this.facingMode = 'user';
    this.lowFpsSince = 0;
    this.autoReduced = false;
  }

  async start({ quality = 'auto', facingMode = 'user' } = {}) {
    await this.stop();
    this.quality = quality;
    this.facingMode = facingMode;

    if (!navigator.mediaDevices?.getUserMedia) {
      const error = new Error('Navegador sem suporte a getUserMedia');
      error.code = 'UNSUPPORTED';
      throw error;
    }

    const profile = profileForQuality(quality);
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: profile.width },
        height: { ideal: profile.height },
        frameRate: { ideal: profile.frameRate, max: 60 },
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      return this.stream;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
  }

  async restart(options = {}) {
    return this.start({
      quality: options.quality || this.quality,
      facingMode: options.facingMode || this.facingMode,
    });
  }

  async switchFacingMode() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    return this.restart({ facingMode: this.facingMode });
  }

  async maybeAutoReduce(fps) {
    if (this.quality !== 'auto' || this.autoReduced) return false;
    const now = performance.now();
    if (fps > 0 && fps < 18) {
      if (!this.lowFpsSince) this.lowFpsSince = now;
      if (now - this.lowFpsSince > 4500) {
        const track = this.stream?.getVideoTracks?.()[0];
        if (track?.applyConstraints) {
          try {
            await track.applyConstraints({
              width: { ideal: CAMERA_PROFILES.low.width },
              height: { ideal: CAMERA_PROFILES.low.height },
              frameRate: { ideal: CAMERA_PROFILES.low.frameRate },
            });
            this.autoReduced = true;
            this.lowFpsSince = 0;
            return true;
          } catch {
            return false;
          }
        }
      }
    } else {
      this.lowFpsSince = 0;
    }
    return false;
  }

  normalizeError(error) {
    const e = new Error(error?.message || 'Erro ao acessar a câmera');
    const name = error?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') e.code = 'DENIED';
    else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') e.code = 'NOT_FOUND';
    else if (name === 'NotReadableError' || name === 'TrackStartError') e.code = 'IN_USE';
    else if (name === 'OverconstrainedError') e.code = 'CONSTRAINTS';
    else e.code = 'UNKNOWN';
    return e;
  }
}

export function cameraErrorMessage(error) {
  const map = {
    DENIED: 'Câmera bloqueada. Permita o acesso à câmera nas configurações do navegador.',
    NOT_FOUND: 'Nenhuma câmera foi encontrada neste dispositivo.',
    IN_USE: 'A câmera parece estar em uso por outro aplicativo.',
    CONSTRAINTS: 'A câmera não suporta a configuração solicitada. Tente qualidade automática.',
    UNSUPPORTED: 'Este navegador não oferece o recurso de câmera necessário.',
    UNKNOWN: 'Não foi possível iniciar a câmera. Verifique as permissões e tente novamente.',
  };
  return map[error?.code] || map.UNKNOWN;
}
