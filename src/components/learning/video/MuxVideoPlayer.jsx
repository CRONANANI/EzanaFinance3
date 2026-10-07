'use client';

import { useEffect, useRef } from 'react';
import { muxStreamUrl, muxPosterUrl } from '@/lib/video-format';

/**
 * Plays a Mux video by playback id. Uses native HLS where available (Safari);
 * elsewhere hls.js (bundled from npm, never a CDN) is loaded on the first
 * play, so pages with a video that nobody plays never download it.
 */
export function MuxVideoPlayer({ playbackId, poster, label = 'Video', className, style }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return undefined;
    const src = muxStreamUrl(playbackId);
    let hls = null;
    let cancelled = false;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return undefined;
    }

    const onFirstPlay = async () => {
      video.removeEventListener('play', onFirstPlay);
      const { default: Hls } = await import('hls.js');
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        video.src = src;
        return;
      }
      hls = new Hls();
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play().catch(() => {});
      });
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
    };
    video.addEventListener('play', onFirstPlay);

    return () => {
      cancelled = true;
      video.removeEventListener('play', onFirstPlay);
      if (hls) hls.destroy();
    };
  }, [playbackId]);

  if (!playbackId) return null;

  return (
    <video
      ref={videoRef}
      className={className}
      controls
      playsInline
      aria-label={label}
      poster={poster || muxPosterUrl(playbackId)}
      style={{
        width: '100%',
        borderRadius: 12,
        background: 'black',
        aspectRatio: '16 / 9',
        ...style,
      }}
    />
  );
}
