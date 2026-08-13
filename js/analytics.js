import { appState } from './state.js';

export function trackEvent(name, data = {}) {
  // Placeholder intencional. Nenhuma informação é enviada nesta versão.
  if (appState.settings.debug) {
    console.debug('[analytics-local]', name, data);
  }
}
