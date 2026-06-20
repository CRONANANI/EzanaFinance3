'use client';

import { useEffect, useRef } from 'react';
import { muxStreamUrl, muxPosterUrl } from '@/lib/video-format';

const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';

/**
 * Plays a Mux video by playback id. Uses native HLS where available (Safari),
 * otherwise lazy-loads hls.js from a CDN — so there's no build-time dependency.
 */
export function MuxVideoPlayer({ playbackId, poster, className, style }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return undefined;
    const src = muxStreamUrl(playbackId);
    let hls;

    const attachHls = () => {
      if (!videoRef.current || !window.Hls) return;
      hls = new window.Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
    };

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else if (window.Hls) {
      attachHls();
    } else {
      let script = document.getElementById('hlsjs-cdn');
      if (!script) {
        script = document.createElement('script');
        script.id = 'hlsjs-cdn';
        script.src = HLS_CDN;
        document.body.appendChild(script);
      }
      script.addEventListener('load', attachHls);
      if (window.Hls) attachHls();
    }

    return () => {
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
