'use client';

export function VideoPreviewer({ file }) {
  if (!file.previewUrl) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#8b949e' }}>
        <i className="bi bi-camera-video" style={{ fontSize: '3rem', color: '#9333ea', display: 'block', marginBottom: '0.75rem' }} />
        <p style={{ color: '#c9d1d9', marginBottom: '0.5rem' }}>Demo file — no video binary available</p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Real uploads will play here with native HTML5 video controls (play/pause, scrub, volume, fullscreen).
        </p>
      </div>
    );
  }

  return (
    <div className="fp-video-wrap">
      <video
        src={file.previewUrl}
        controls
        controlsList="nodownload"
        className="fp-video"
        preload="metadata"
        playsInline
      >
        <source src={file.previewUrl} />
        Your browser does not support video playback.
      </video>
    </div>
  );
}
