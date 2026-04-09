'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

/**
 * Lottie arrow control — used for dashboard holdings pagination (left/right).
 */
export function IntIcon({
  animationData,
  autoplay = false,
  loop = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  playOnClick = false,
  toggleDirectionOnClick = false,
  playDirectionOnEnter = null,
  playDirectionOnLeave = null,
  color = null,
  size = 100,
}) {
  const containerRef = useRef(null);
  const animationInstance = useRef(null);
  const [directionForward, setDirectionForward] = useState(true);
  const [resolvedAnimationData, setResolvedAnimationData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const sizeStyle = React.useMemo(() => {
    if (typeof size === 'number') return `${size}px`;
    return size;
  }, [size]);

  useEffect(() => {
    if (!animationData) return;

    if (typeof animationData === 'string') {
      fetch(animationData)
        .then((res) => res.json())
        .then((data) => setResolvedAnimationData(data))
        .catch((err) => {
          console.error('Failed to load Lottie JSON from URL:', err);
        });
    } else {
      setResolvedAnimationData(animationData);
    }
  }, [animationData]);

  const applyColor = React.useCallback((c) => {
    if (!animationInstance.current) return;
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;
    const colorValue =
      c === 'black'
        ? '#000000'
        : c === 'white'
          ? '#FFFFFF'
          : c?.startsWith('#')
            ? c
            : '#FFFFFF';
    const elements = svgElement.querySelectorAll('path, circle, rect, ellipse, polygon, line, polyline');
    elements.forEach((el) => {
      if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none') {
        el.style.fill = colorValue;
      }
      if (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') {
        el.style.stroke = colorValue;
      }
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || !resolvedAnimationData) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop,
      autoplay,
      animationData: resolvedAnimationData,
    });
    animationInstance.current = anim;

    const onComplete = () => setIsPlaying(false);
    anim.addEventListener('complete', onComplete);

    if (color) {
      anim.addEventListener('DOMLoaded', () => applyColor(color));
    }

    return () => {
      anim.removeEventListener('complete', onComplete);
      anim.destroy();
      animationInstance.current = null;
    };
  }, [resolvedAnimationData, autoplay, loop, color, applyColor]);

  const handleClick = (e) => {
    if (!animationInstance.current) return;
    const anim = animationInstance.current;

    if (toggleDirectionOnClick) {
      anim.setDirection(directionForward ? 1 : -1);
      anim.play();
      setDirectionForward(!directionForward);
      setIsPlaying(true);
    } else if (playOnClick) {
      if (!isPlaying) {
        if (!loop) {
          anim.goToAndStop(0, true);
        }
        anim.setDirection(1);
        anim.play();
        setIsPlaying(true);
      }
    }

    if (onClick) onClick(e);
  };

  const handleMouseEnter = (e) => {
    if (animationInstance.current && playDirectionOnEnter !== null) {
      animationInstance.current.setDirection(playDirectionOnEnter);
      animationInstance.current.play();
      setIsPlaying(true);
    }
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleMouseLeave = (e) => {
    if (animationInstance.current && playDirectionOnLeave !== null) {
      animationInstance.current.setDirection(playDirectionOnLeave);
      animationInstance.current.play();
      setIsPlaying(true);
    }
    if (onMouseLeave) onMouseLeave(e);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: 'pointer',
        display: 'inline-block',
        width: sizeStyle,
        height: sizeStyle,
      }}
    >
      {!resolvedAnimationData && <span style={{ color: 'gray', fontSize: 10 }}>…</span>}
    </div>
  );
}
