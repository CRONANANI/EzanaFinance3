/** Client-safe helpers for Mux video (no server imports). */

export const VIDEO_STATUS = {
  pending: { label: 'Uploading', color: 'var(--info)' },
  processing: { label: 'Processing', color: 'var(--gold)' },
  ready: { label: 'Ready', color: 'var(--positive)' },
  errored: { label: 'Failed', color: 'var(--negative)' },
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
