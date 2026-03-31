"use client";

import { cn } from "@/lib/utils";
import { useRef, useEffect, useCallback, useState } from "react";

// ── GeoJSON point-in-polygon (no d3 dependency needed) ──

function pointInRing(point, ring) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInFeature(lng, lat, feature) {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    if (!pointInRing([lng, lat], geom.coordinates[0])) return false;
    for (let i = 1; i < geom.coordinates.length; i++) {
      if (pointInRing([lng, lat], geom.coordinates[i])) return false;
    }
    return true;
  }
  if (geom.type === "MultiPolygon") {
    for (const polygon of geom.coordinates) {
      if (pointInRing([lng, lat], polygon[0])) {
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInRing([lng, lat], polygon[i])) { inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
  }
  return false;
}

function generateLandDots(landGeoJSON, stepDeg = 1.8) {
  const dots = [];
  for (const feature of landGeoJSON.features) {
    // Get bounding box
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    const coords = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    for (const polygon of coords) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
    // Sample points within bounding box
    for (let lat = minLat; lat <= maxLat; lat += stepDeg) {
      for (let lng = minLng; lng <= maxLng; lng += stepDeg) {
        if (pointInFeature(lng, lat, feature)) {
          // Convert lat/lng to unit sphere xyz
          const latRad = (lat * Math.PI) / 180;
          const lngRad = (lng * Math.PI) / 180;
          dots.push([
            -Math.cos(latRad) * Math.sin(lngRad),
            Math.sin(latRad),
            Math.cos(latRad) * Math.cos(lngRad),
          ]);
        }
      }
    }
  }
  return dots;
}

// ── Globe rendering (unchanged visual style) ──

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
  return [x * scale + cx, -y * scale + cy, z];
}

const LAND_GEOJSON_URL =
  "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json";

export function InteractiveGlobe({
  className,
  size = 600,
  dotColor = "rgba(16, 185, 129, ALPHA)",
  autoRotateSpeed = 0.5,
  showConnections = true,
  showMarkers = true,
}) {
  const canvasRef = useRef(null);
  // Rotation stored in degrees [longitude, latitude] — matches reference component
  // Initial ~90° Y: centers Western Hemisphere so North & South America face the viewer
  const rotationRef = useRef([90, 0]);
  const autoRotateRef = useRef(true);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startRotation: [90, 0],
  });
  const animRef = useRef(0);
  const dotsRef = useRef([]);
  const resumeTimerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch GeoJSON land data and generate continent dots
  useEffect(() => {
    let cancelled = false;

    async function loadLand() {
      try {
        const res = await fetch(LAND_GEOJSON_URL);
        if (!res.ok) throw new Error("Failed to fetch land data");
        const landGeoJSON = await res.json();
        if (cancelled) return;

        const dots = generateLandDots(landGeoJSON, 1.6);
        dotsRef.current = dots;
        setLoaded(true);
      } catch (err) {
        console.error("Globe: failed to load land data, falling back to uniform dots", err);
        const fallback = [];
        const n = 800;
        const gr = (1 + Math.sqrt(5)) / 2;
        for (let i = 0; i < n; i++) {
          const theta = (2 * Math.PI * i) / gr;
          const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
          fallback.push([
            Math.cos(theta) * Math.sin(phi),
            Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
          ]);
        }
        dotsRef.current = fallback;
        setLoaded(true);
      }
    }

    loadLand();
    return () => { cancelled = true; };
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

    // Auto-rotate: increment longitude in degrees each frame
    if (autoRotateRef.current && !dragRef.current.active) {
      rotationRef.current[0] += autoRotateSpeed;
    }

    // Convert degrees to radians for rotation math
    const ry = (rotationRef.current[0] * Math.PI) / 180;
    const rx = (rotationRef.current[1] * Math.PI) / 180;

    ctx.clearRect(0, 0, w, h);

    // Subtle glow effect (unchanged)
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.4);
    glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.02)");
    glowGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Globe outline (unchanged)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw continent dots (same visual style — emerald, depth-based alpha)
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      let [x, y, z] = dots[i];
      x *= radius;
      y *= radius;
      z *= radius;

      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);

      // Only draw dots on the visible side
      if (z > 0) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const depthAlpha = Math.max(0.08, 0.6 - ((z + radius) / (2 * radius)) * 0.5);
      const dotSize = 0.8 + depthAlpha * 0.5;

      ctx.beginPath();
      ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = dotColor.replace("ALPHA", depthAlpha.toFixed(2));
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [dotColor, autoRotateSpeed]);

  useEffect(() => {
    if (!loaded) return;
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, loaded]);

  // Drag interaction — matches reference component sensitivity and behavior
  const onPointerDown = useCallback((e) => {
    autoRotateRef.current = false;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotation: [...rotationRef.current],
    };
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const sensitivity = 0.5;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    rotationRef.current[0] = dragRef.current.startRotation[0] + dx * sensitivity;
    rotationRef.current[1] = Math.max(-90, Math.min(90, dragRef.current.startRotation[1] - dy * sensitivity));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
    // Resume auto-rotation after a short delay (matches reference component)
    resumeTimerRef.current = setTimeout(() => {
      autoRotateRef.current = true;
    }, 10);
  }, []);

  // Cleanup resume timer on unmount
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
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

export default InteractiveGlobe;
