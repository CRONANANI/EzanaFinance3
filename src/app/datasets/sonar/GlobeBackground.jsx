'use client';

/**
 * The datasets page background: a looping globe with flickering city lights,
 * tinted into the Ezana band green. Only the background is taken from the
 * reference hero; its nav, copy and dashboard mockup are not used (the page
 * keeps its own category bar).
 *
 * The tint is done in CSS, not in the file: the video is drawn in greyscale,
 * then a green layer with mix-blend-mode: color recolours it, and a depth
 * gradient darkens the top and bottom so the search and the map stay legible.
 *
 * Reduced motion: the video never autoplays; it shows its first frame as a
 * still. If the file is missing or fails, the green ground underneath shows.
 */
import { useEffect, useRef, useState } from 'react';

const SRC = '/videos/datasets-globe.mp4';

export default function GlobeBackground() {
  const ref = useRef(null);
  const [motion, setMotion] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setMotion(!mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (motion) v.play?.().catch(() => {});
    else v.pause?.();
  }, [motion]);

  return (
    <div className="dso-globe" aria-hidden="true">
      {failed ? null : (
        <video
          ref={ref}
          className="dso-globe-video"
          src={SRC}
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setFailed(true)}
        />
      )}
      <div className="dso-globe-tint" />
      <div className="dso-globe-depth" />
    </div>
  );
}
