"use client";

import { useRef, useMemo, useId } from "react";
import { motion } from "framer-motion";
import DottedMap from "dotted-map";
import Image from "next/image";

type LatLng = { lat: number; lng: number };

export type WorldMapDot = {
  start: LatLng;
  end: LatLng;
};

type WorldMapProps = {
  dots?: WorldMapDot[];
  lineColor?: string;
};

export function WorldMap({ dots = [], lineColor = "#10b981" }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rawId = useId();
  const gradId = `path-gradient-${rawId.replace(/:/g, "")}`;

  const { map, svgMap, width, height } = useMemo(() => {
    const m = new DottedMap({ height: 100, grid: "diagonal" });
    const svg = m.getSVG({
      radius: 0.22,
      color: "#FFFFFF40",
      shape: "circle",
      backgroundColor: "transparent",
    });
    const inst = m as unknown as { width: number; height: number };
    return { map: m, svgMap: svg, width: inst.width, height: inst.height };
  }, []);

  const projectPoint = (lat: number, lng: number) => {
    const pin = map.getPin({ lat, lng });
    if (!pin) return { x: width / 2, y: height / 2 };
    return { x: pin.x, y: pin.y };
  };

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const arcLift = Math.max(8, Math.min(height * 0.2, 28));
    const midY = Math.min(start.y, end.y) - arcLift;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`;

  return (
    <div className="world-map-container">
      <Image
        src={dataUrl}
        className="world-map-image"
        alt=""
        height={height}
        width={width}
        draggable={false}
        unoptimized
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="world-map-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`path-group-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.5 * i, ease: "easeOut" }}
              />
            </g>
          );
        })}

        {dots.map((dot, i) => {
          const start = projectPoint(dot.start.lat, dot.start.lng);
          const end = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`points-group-${i}`}>
              <g>
                <circle cx={start.x} cy={start.y} r="2" fill={lineColor} />
                <circle cx={start.x} cy={start.y} r="2" fill={lineColor} opacity="0.5">
                  <animate attributeName="r" from="2" to="8" dur="1.5s" begin="0s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
                </circle>
              </g>
              <g>
                <circle cx={end.x} cy={end.y} r="2" fill={lineColor} />
                <circle cx={end.x} cy={end.y} r="2" fill={lineColor} opacity="0.5">
                  <animate attributeName="r" from="2" to="8" dur="1.5s" begin="0s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
                </circle>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
