import { PUBLIC_CONFIG } from './config.js';
import { trackEvent } from './analytics.js';

export function renderPix(qrElement, codeElement, receiverElement, nubankLink) {
  const cfg = PUBLIC_CONFIG.pix;
  codeElement.textContent = cfg.copiaCola;
  receiverElement.textContent = cfg.recebedor;
  nubankLink.href = cfg.nubankUrl;
  qrElement.innerHTML = '';

  if (window.QRCode) {
    new window.QRCode(qrElement, {
      text: cfg.copiaCola,
      width: 210,
      height: 210,
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  } else {
    qrElement.textContent = 'QR Code indisponível. Use “Copiar Pix”.';
  }
  trackEvent('pix_opened');
}

export async function copyPix() {
  await navigator.clipboard.writeText(PUBLIC_CONFIG.pix.copiaCola);
  trackEvent('pix_copied');
}
