import { PUBLIC_CONFIG } from './config.js';

export async function analyzeAudio(file) {
  if (!PUBLIC_CONFIG.analysisEndpoint) {
    throw new Error('O analisador de áudio ainda não está disponível neste servidor. Use MIDI ou a demonstração nesta versão Beta.');
  }

  const form = new FormData();
  form.append('audio', file);
  const response = await fetch(PUBLIC_CONFIG.analysisEndpoint, { method: 'POST', body: form });
  if (!response.ok) throw new Error('O servidor não conseguiu analisar este áudio.');
  return response.json();
}
