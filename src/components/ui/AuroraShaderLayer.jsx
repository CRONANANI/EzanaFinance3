'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Animated aurora borealis shader layer.
 * Renders a full-size WebGL canvas with organic aurora bands.
 * Uses pointer-events: none — purely decorative.
 *
 * @param {string} className — additional CSS classes
 * @param {object} style — inline styles (z-index, opacity, masks, etc.)
 * @param {number} opacity — base alpha multiplier baked into the shader output (0–1, default 1)
 * @param {number} speed — animation speed multiplier (default 1)
 * @param {string} tint — 'green' (default, matches Ezana emerald) or 'blue' for cooler tones
 */
export default function AuroraShaderLayer({
  className = '',
  style = {},
  opacity = 1,
  speed = 1,
  tint = 'green',
}) {
  const containerRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });

    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(1); // Aurora is a blurry effect — retina rendering wastes GPU for no visible gain
    container.appendChild(renderer.domElement);

    const greenTint = `
      vec4 auroraColors = vec4(
        0.05 + 0.15 * sin(i * 0.2 + iTime * 0.4),
        0.25 + 0.45 * cos(i * 0.3 + iTime * 0.5),
        0.5 + 0.3 * sin(i * 0.4 + iTime * 0.3),
        1.0
      );
    `;
    const blueTint = `
      vec4 auroraColors = vec4(
        0.1 + 0.3 * sin(i * 0.2 + iTime * 0.4),
        0.3 + 0.5 * cos(i * 0.3 + iTime * 0.5),
        0.7 + 0.3 * sin(i * 0.4 + iTime * 0.3),
        1.0
      );
    `;
    const tintBlock = tint === 'blue' ? blueTint : greenTint;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(rect.width, rect.height) },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec2 iResolution;
        uniform float uOpacity;

        #define NUM_OCTAVES 3

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 u = fract(p);
          u = u*u*(3.0-2.0*u);
          float res = mix(
            mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
            mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
          return res * res;
        }

        float fbm(vec2 x) {
          float v = 0.0;
          float a = 0.3;
          vec2 shift = vec2(100);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < NUM_OCTAVES; ++i) {
            v += a * noise(x);
            x = rot * x * 2.0 + shift;
            a *= 0.4;
          }
          return v;
        }

        void main() {
          vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);
          vec2 p = ((gl_FragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5)
                   / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);
          vec2 v;
          vec4 o = vec4(0.0);

          float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;

          for (float i = 0.0; i < 35.0; i++) {
            v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5
                + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);
            float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / 20.0));
            ${tintBlock}
            vec4 currentContribution = auroraColors
              * exp(sin(i * i + iTime * 0.8))
              / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));
            float thinnessFactor = smoothstep(0.0, 1.0, i / 20.0) * 0.6;
            o += currentContribution * (1.0 + tailNoise * 0.8) * thinnessFactor;
          }

          o = tanh(pow(o / 60.0, vec4(1.6)));
          o *= 1.5;
          o.a = length(o.rgb) * uOpacity;
          gl_FragColor = o;
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frameId = 0;
    let lastFrameTime = 0;
    const TARGET_INTERVAL = 1000 / 30; // 30fps — aurora doesn't need 60fps
    let isPageVisible = true;

    const handleVisibility = () => {
      isPageVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const animate = (now) => {
      frameId = requestAnimationFrame(animate);

      if (!isPageVisible) return;

      const delta = now - lastFrameTime;
      if (delta < TARGET_INTERVAL) return;
      lastFrameTime = now - (delta % TARGET_INTERVAL);

      if (!reduceMotion) {
        material.uniforms.iTime.value += 0.033 * speed;
      }
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      const r = container.getBoundingClientRect();
      renderer.setSize(r.width, r.height);
      material.uniforms.iResolution.value.set(r.width, r.height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [opacity, speed, tint, reduceMotion]);

  return (
    <div
      ref={containerRef}
      className={`aurora-shader-layer ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
