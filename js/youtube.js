export function parseYouTubeId(input) {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (host.endsWith('youtube.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || null;
    }
  } catch {}
  return null;
}

export function embedUrl(videoId) {
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&playsinline=1`;
}
