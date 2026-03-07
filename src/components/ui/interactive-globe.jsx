"use client";

import { cn } from "@/lib/utils";
import { useRef, useEffect, useCallback } from "react";

const DEFAULT_MARKERS = [
  { lat: 40.71, lng: -74.0, label: "New York" },
  { lat: 51.51, lng: -0.13, label: "London" },
  { lat: 50.11, lng: 8.68, label: "Frankfurt" },
  { lat: 22.32, lng: 114.17, label: "Hong Kong" },
  { lat: 1.35, lng: 103.82, label: "Singapore" },
  { lat: 47.38, lng: 8.54, label: "Zurich" },
  { lat: 35.68, lng: 139.69, label: "Tokyo" },
  { lat: 37.78, lng: -122.42, label: "San Francisco" },
  { lat: 37.57, lng: 126.98, label: "Seoul" },
  { lat: 48.86, lng: 2.35, label: "Paris" },
];

const DEFAULT_CONNECTIONS = [
  { from: [40.71, -74.0], to: [51.51, -0.13] },
  { from: [51.51, -0.13], to: [35.68, 139.69] },
  { from: [37.78, -122.42], to: [1.35, 103.82] },
  { from: [22.32, 114.17], to: [1.35, 103.82] },
  { from: [50.11, 8.68], to: [47.38, 8.54] },
  { from: [48.86, 2.35], to: [51.51, -0.13] },
  { from: [51.51, -0.13], to: [37.57, 126.98] },
  { from: [40.71, -74.0], to: [37.78, -122.42] },
];

function latLngToXYZ(lat, lng, radius) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/** Sample points along great circle arc between two 3D points on sphere (slerp) */
function sampleGreatCircle(x1, y1, z1, x2, y2, z2, radius, numSegments = 24) {
  const r = radius;
  const u1 = [x1 / r, y1 / r, z1 / r];
  const u2 = [x2 / r, y2 / r, z2 / r];
  const dot = u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2];
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
  if (omega < 0.001) return [[x1, y1, z1], [x2, y2, z2]];
  const sinOmega = Math.sin(omega);
  const points = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    points.push([
      r * (a * u1[0] + b * u2[0]),
      r * (a * u1[1] + b * u2[1]),
      r * (a * u1[2] + b * u2[2]),
    ]);
  }
  return points;
}

function rotateY(x, y, z, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function rotateX(x, y, z, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function project(x, y, z, cx, cy, fov) {
  const scale = fov / (fov + z);
  return [x * scale + cx, y * scale + cy, z];
}

export function InteractiveGlobe({
  className,
  size = 600,
  dotColor = "rgba(16, 185, 129, ALPHA)",
  arcColor = "rgba(16, 185, 129, 0.5)",
  markerColor = "rgba(16, 220, 180, 1)",
  autoRotateSpeed = 0.002,
  connections = DEFAULT_CONNECTIONS,
  markers = DEFAULT_MARKERS,
}) {
  const canvasRef = useRef(null);
  const rotYRef = useRef(0.4);
  const rotXRef = useRef(0.3);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startRotY: 0,
    startRotX: 0,
  });
  const animRef = useRef(0);
  const timeRef = useRef(0);
  const dotsRef = useRef([]);

  useEffect(() => {
    const dots = [];
    const numDots = 1200;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < numDots; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numDots);
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.cos(phi);
      const z = Math.sin(theta) * Math.sin(phi);
      dots.push([x, y, z]);
    }
    dotsRef.current = dots;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const fov = 600;

    if (!dragRef.current.active) {
      rotYRef.current += autoRotateSpeed;
    }

    timeRef.current += 0.015;
    const time = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.5);
    glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.03)");
    glowGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const ry = rotYRef.current;
    const rx = rotXRef.current;

    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      let [x, y, z] = dots[i];
      x *= radius;
      y *= radius;
      z *= radius;

      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);

      if (z > 0) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const depthAlpha = Math.max(0.1, 1 - (z + radius) / (2 * radius));
      const dotSize = 1 + depthAlpha * 0.8;

      ctx.beginPath();
      ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = dotColor.replace("ALPHA", depthAlpha.toFixed(2));
      ctx.fill();
    }

    for (const conn of connections) {
      const [lat1, lng1] = conn.from;
      const [lat2, lng2] = conn.to;

      let [x1, y1, z1] = latLngToXYZ(lat1, lng1, radius);
      let [x2, y2, z2] = latLngToXYZ(lat2, lng2, radius);

      const arcPoints = sampleGreatCircle(x1, y1, z1, x2, y2, z2, radius, 24);
      const rotatedArc = arcPoints.map(([x, y, z]) => {
        let [ax, ay, az] = rotateX(x, y, z, rx);
        [ax, ay, az] = rotateY(ax, ay, az, ry);
        return [ax, ay, az];
      });

      const projectedArc = rotatedArc.map(([x, y, z]) => project(x, y, z, cx, cy, fov));
      const visibilityThreshold = radius * 0.3;

      ctx.beginPath();
      let started = false;
      for (let i = 0; i < projectedArc.length - 1; i++) {
        const z1 = rotatedArc[i][2];
        const z2 = rotatedArc[i + 1][2];
        const bothBehind = z1 > visibilityThreshold && z2 > visibilityThreshold;
        if (bothBehind) {
          started = false;
          continue;
        }
        const [sx1, sy1] = projectedArc[i];
        const [sx2, sy2] = projectedArc[i + 1];
        if (!started) {
          ctx.moveTo(sx1, sy1);
          started = true;
        }
        ctx.lineTo(sx2, sy2);
      }
      if (started) {
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      const hasVisibleArc = started;
      const t = (Math.sin(time * 1.2 + lat1 * 0.1) + 1) / 2;
      const tNorm = t * (rotatedArc.length - 1);
      const segIdx = Math.min(Math.floor(tNorm), rotatedArc.length - 2);
      const localT = Math.min(tNorm - segIdx, 1);
      const [sx1, sy1] = projectedArc[segIdx];
      const [sx2, sy2] = projectedArc[segIdx + 1];
      const tx = sx1 + (sx2 - sx1) * localT;
      const ty = sy1 + (sy2 - sy1) * localT;
      const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      if (hasVisibleArc) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(3.5, 0);
        ctx.lineTo(-2.5, -2);
        ctx.lineTo(-1.5, 0);
        ctx.lineTo(-2.5, 2);
        ctx.closePath();
        ctx.fillStyle = markerColor;
        ctx.fill();
        ctx.restore();
      }
    }

    for (const marker of markers) {
      let [x, y, z] = latLngToXYZ(marker.lat, marker.lng, radius);
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);

      if (z > radius * 0.1) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);

      const pulse = Math.sin(time * 2 + marker.lat) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 4 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = markerColor.replace("1)", `${0.2 + pulse * 0.15})`);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();

      if (marker.label) {
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillStyle = markerColor.replace("1)", "0.6)");
        ctx.fillText(marker.label, sx + 8, sy + 3);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [dotColor, arcColor, markerColor, autoRotateSpeed, connections, markers]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const onPointerDown = useCallback((e) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotY: rotYRef.current,
      startRotX: rotXRef.current,
    };
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    rotYRef.current = dragRef.current.startRotY + dx * 0.005;
    rotXRef.current = Math.max(-1, Math.min(1, dragRef.current.startRotX + dy * 0.005));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full cursor-grab active:cursor-grabbing", className)}
      style={{ width: size, height: size }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
