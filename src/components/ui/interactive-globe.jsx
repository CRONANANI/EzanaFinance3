"use client";

import { cn } from "@/lib/utils";
import { useRef, useEffect, useCallback } from "react";

// Major financial centers with accurate coordinates
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

// Clean, strategic connections between major financial hubs
const DEFAULT_CONNECTIONS = [
  // Trans-Atlantic corridor
  { from: [40.71, -74.0], to: [51.51, -0.13] }, // New York - London
  // European connections
  { from: [51.51, -0.13], to: [48.86, 2.35] }, // London - Paris
  { from: [51.51, -0.13], to: [50.11, 8.68] }, // London - Frankfurt
  { from: [47.38, 8.54], to: [50.11, 8.68] }, // Zurich - Frankfurt
  // Asia-Pacific connections
  { from: [35.68, 139.69], to: [37.57, 126.98] }, // Tokyo - Seoul
  { from: [35.68, 139.69], to: [22.32, 114.17] }, // Tokyo - Hong Kong
  { from: [22.32, 114.17], to: [1.35, 103.82] }, // Hong Kong - Singapore
  // Trans-Pacific corridor
  { from: [37.78, -122.42], to: [35.68, 139.69] }, // San Francisco - Tokyo
  // US domestic
  { from: [40.71, -74.0], to: [37.78, -122.42] }, // New York - San Francisco
  // Europe to Asia
  { from: [51.51, -0.13], to: [22.32, 114.17] }, // London - Hong Kong
];

/** Convert lat/lng (degrees) to 3D Cartesian on sphere. Y-up, standard geographic convention. */
function latLngToXYZ(lat, lng, radius) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return [
    radius * Math.cos(latRad) * Math.sin(lngRad),
    radius * Math.sin(latRad),
    radius * Math.cos(latRad) * Math.cos(lngRad),
  ];
}

/** Sample points along great circle arc between two 3D points on sphere (slerp) */
function sampleGreatCircle(x1, y1, z1, x2, y2, z2, radius, numSegments = 32) {
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
  arcColor = "rgba(16, 185, 129, 0.6)",
  markerColor = "rgba(16, 220, 180, 1)",
  autoRotateSpeed = 0.0015,
  connections = DEFAULT_CONNECTIONS,
  markers = DEFAULT_MARKERS,
}) {
  const canvasRef = useRef(null);
  const rotYRef = useRef(0.4);
  const rotXRef = useRef(0.25); // Slightly less tilt for better city visibility
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
    const numDots = 800; // Reduced for cleaner look
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

    timeRef.current += 0.012;
    const time = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    // Subtle glow effect
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.4);
    glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.02)");
    glowGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Globe outline
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const ry = rotYRef.current;
    const rx = rotXRef.current;

    // Draw dots (globe surface)
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      let [x, y, z] = dots[i];
      x *= radius;
      y *= radius;
      z *= radius;

      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);

      // Only draw dots on the back half (facing away)
      if (z > 0) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const depthAlpha = Math.max(0.08, 0.6 - (z + radius) / (2 * radius) * 0.5);
      const dotSize = 0.8 + depthAlpha * 0.5;

      ctx.beginPath();
      ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = dotColor.replace("ALPHA", depthAlpha.toFixed(2));
      ctx.fill();
    }

    // Draw connection arcs (great circles)
    for (const conn of connections) {
      const [lat1, lng1] = conn.from;
      const [lat2, lng2] = conn.to;

      let [x1, y1, z1] = latLngToXYZ(lat1, lng1, radius);
      let [x2, y2, z2] = latLngToXYZ(lat2, lng2, radius);

      const arcPoints = sampleGreatCircle(x1, y1, z1, x2, y2, z2, radius, 40);
      const rotatedArc = arcPoints.map(([x, y, z]) => {
        let [ax, ay, az] = rotateX(x, y, z, rx);
        [ax, ay, az] = rotateY(ax, ay, az, ry);
        return [ax, ay, az];
      });

      const projectedArc = rotatedArc.map(([x, y, z]) => project(x, y, z, cx, cy, fov));

      // Draw arc with gradient based on visibility
      ctx.beginPath();
      let started = false;
      let visibleSegments = 0;

      for (let i = 0; i < projectedArc.length - 1; i++) {
        const z1Val = rotatedArc[i][2];
        const z2Val = rotatedArc[i + 1][2];

        // Check if segment is on visible side (z < 0 means facing us)
        const seg1Visible = z1Val < radius * 0.1;
        const seg2Visible = z2Val < radius * 0.1;

        if (!seg1Visible && !seg2Visible) {
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
        visibleSegments++;
      }

      if (visibleSegments > 0) {
        // Calculate average depth for opacity
        const avgZ = rotatedArc.reduce((sum, p) => sum + p[2], 0) / rotatedArc.length;
        const depthOpacity = Math.max(0.2, Math.min(0.8, 1 - (avgZ + radius) / (2 * radius)));

        ctx.strokeStyle = `rgba(16, 185, 129, ${depthOpacity * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw animated pulse along the arc
        const pulseT = (Math.sin(time * 0.8 + lat1 * 0.05) + 1) / 2;
        const pulseIdx = Math.floor(pulseT * (rotatedArc.length - 1));

        if (pulseIdx < rotatedArc.length && rotatedArc[pulseIdx][2] < radius * 0.1) {
          const [px, py] = projectedArc[pulseIdx];

          // Draw pulse dot
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(16, 220, 180, ${depthOpacity})`;
          ctx.fill();

          // Pulse glow
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(16, 185, 129, ${depthOpacity * 0.3})`;
          ctx.fill();
        }
      }
    }

    // Draw city markers
    for (const marker of markers) {
      let [x, y, z] = latLngToXYZ(marker.lat, marker.lng, radius);
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);

      // Only show markers on visible hemisphere
      if (z > radius * 0.15) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);

      // Calculate depth-based opacity and size
      const depthFactor = Math.max(0.3, 1 - (z + radius) / (2 * radius));

      // Outer pulse ring
      const pulse = Math.sin(time * 1.5 + marker.lat * 0.1) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 4 + pulse * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16, 220, 180, ${0.15 * depthFactor + pulse * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner marker dot
      ctx.beginPath();
      ctx.arc(sx, sy, 3 * depthFactor, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(16, 220, 180, ${0.9 * depthFactor})`;
      ctx.fill();

      // Center bright dot
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 * depthFactor, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * depthFactor})`;
      ctx.fill();

      // City label (only show when clearly visible)
      if (marker.label && depthFactor > 0.5) {
        ctx.font = `${9 * depthFactor}px system-ui, sans-serif`;
        ctx.fillStyle = `rgba(16, 220, 180, ${0.7 * depthFactor})`;
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
    rotXRef.current = Math.max(-0.8, Math.min(0.8, dragRef.current.startRotX + dy * 0.005));
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
