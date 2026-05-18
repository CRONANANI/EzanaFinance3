'use client';

import type React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type FallingPatternProps = React.ComponentProps<'div'> & {
  color?: string;
  streakColor?: string;
  sparkleColor?: string;
  backgroundColor?: string;
  duration?: number;
  blurIntensity?: string;
  density?: number;
};

/**
 * Each layer is a group of 3 patterns (streak-left, streak-right, sparkle)
 * with its own speed, vertical offset, and start delay.
 */
type StreakLayer = {
  bgSize: string;
  startY: number;
  speed: number;
  delay: number;
};

const LAYERS: StreakLayer[] = [
  { bgSize: '300px 235px', startY: 220, speed: 10, delay: 0 },
  { bgSize: '300px 252px', startY: 24, speed: 8, delay: 1.5 },
  { bgSize: '300px 150px', startY: 16, speed: 12, delay: 0.8 },
  { bgSize: '300px 253px', startY: 224, speed: 9, delay: 3.2 },
  { bgSize: '300px 204px', startY: 19, speed: 14, delay: 2.0 },
  { bgSize: '300px 134px', startY: 120, speed: 7, delay: 4.5 },
  { bgSize: '300px 179px', startY: 31, speed: 11, delay: 1.0 },
  { bgSize: '300px 299px', startY: 235, speed: 16, delay: 5.5 },
  { bgSize: '300px 215px', startY: 121, speed: 9, delay: 3.8 },
  { bgSize: '300px 281px', startY: 224, speed: 13, delay: 0.3 },
  { bgSize: '300px 158px', startY: 26, speed: 8, delay: 6.0 },
  { bgSize: '300px 210px', startY: 75, speed: 15, delay: 2.5 },
];

export function FallingPattern({
  color = '#10b981',
  streakColor,
  sparkleColor,
  backgroundColor = '#0a0e13',
  duration: _duration = 15,
  blurIntensity: _blurIntensity = '1em',
  density = 1,
  className,
}: FallingPatternProps) {
  const streak = streakColor ?? color;
  const sparkle = sparkleColor ?? 'rgba(21, 128, 61, 0.5)';

  return (
    <div className={cn('relative h-full w-full', className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="size-full"
        style={{ backgroundColor }}
      >
        {LAYERS.map((layer, i) => {
          const h = parseInt(layer.bgSize.split(' ')[1], 10) || 235;
          const halfH = Math.round(h / 2);
          const xOff = i * 25;

          const bgImage = [
            `radial-gradient(3px 90px at ${xOff}px ${h}px, ${streak}, transparent)`,
            `radial-gradient(3px 90px at ${xOff + 300}px ${h}px, ${streak}, transparent)`,
            `radial-gradient(1.5px 1.5px at ${xOff + 150}px ${halfH}px, ${sparkle} 0%, ${sparkle} 48%, transparent 78%)`,
          ].join(', ');

          const bgSize = `${layer.bgSize}, ${layer.bgSize}, ${layer.bgSize}`;

          const startY = layer.startY;
          const travelDistance = 3000 + i * 400;
          const endY = startY + travelDistance;

          const startPos = `${xOff}px ${startY}px, ${xOff + 3}px ${startY}px, ${xOff + 150.5}px ${startY + halfH}px`;
          const endPos = `${xOff}px ${endY}px, ${xOff + 3}px ${endY}px, ${xOff + 150.5}px ${endY + halfH}px`;

          return (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{
                backgroundImage: bgImage,
                backgroundSize: bgSize,
                zIndex: 0,
              }}
              animate={{
                backgroundPosition: [startPos, endPos],
              }}
              transition={{
                duration: layer.speed,
                ease: 'linear',
                repeat: Infinity,
                delay: layer.delay,
              }}
            />
          );
        })}
      </motion.div>

      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          backgroundImage: `radial-gradient(circle at 50% 50%, transparent 0, transparent 2.5px, ${backgroundColor} 2.5px)`,
          backgroundSize: `${8 * density}px ${8 * density}px`,
        }}
      />
    </div>
  );
}
