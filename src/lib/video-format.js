/** Client-safe helpers for Mux video (no server imports). */

export const VIDEO_STATUS = {
  pending: { label: 'Uploading', color: '#38bdf8' },
  processing: { label: 'Processing', color: '#d4a853' },
  ready: { label: 'Ready', color: '#10b981' },
  errored: { label: 'Failed', color: '#ef4444' },
};

export function getVideoStatus(status) {
  return VIDEO_STATUS[status] || VIDEO_STATUS.processing;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function muxStreamUrl(playbackId) {
  return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;
}

export function muxPosterUrl(playbackId) {
  return playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null;
}
