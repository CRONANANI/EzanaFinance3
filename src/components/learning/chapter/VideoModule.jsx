'use client';

import { MuxVideoPlayer } from '../video/MuxVideoPlayer';

/**
 * A course lesson video module: { type: 'video', playbackId, title?, caption? }.
 * Renders a Mux-hosted video inline in a section.
 */
export function VideoModule({ playbackId, title, caption }) {
  if (!playbackId) return null;
  return (
    <figure className="lc-edit-video" style={{ margin: '20px 0' }}>
      {title && (
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          {title}
        </div>
      )}
      <MuxVideoPlayer playbackId={playbackId} />
      {caption && (
        <figcaption style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
