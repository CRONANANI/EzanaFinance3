"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import DottedMap from "dotted-map";
import Image from "next/image";

export const FINANCIAL_CENTERS = [
  { id: "toronto", panelId: "toronto", name: "Toronto", lat: 43.6532, lng: -79.3832, exchange: "TSX" },
  { id: "new-york", panelId: "newyork", name: "New York", lat: 40.7128, lng: -74.006, exchange: "NYSE / NASDAQ" },
  { id: "sao-paulo", panelId: "saopaulo", name: "São Paulo", lat: -23.5505, lng: -46.6333, exchange: "B3" },
  { id: "london", panelId: "london", name: "London", lat: 51.5074, lng: -0.1278, exchange: "LSE" },
  { id: "frankfurt", panelId: "frankfurt", name: "Frankfurt", lat: 50.1109, lng: 8.6821, exchange: "Deutsche Börse" },
  { id: "dubai", panelId: "dubai", name: "Dubai", lat: 25.2048, lng: 55.2708, exchange: "DFM" },
  { id: "mumbai", panelId: "mumbai", name: "Mumbai", lat: 19.076, lng: 72.8777, exchange: "BSE / NSE" },
  { id: "singapore", panelId: "singapore", name: "Singapore", lat: 1.3521, lng: 103.8198, exchange: "SGX" },
  { id: "hong-kong", panelId: "hongkong", name: "Hong Kong", lat: 22.3193, lng: 114.1694, exchange: "HKEX" },
  { id: "shanghai", panelId: "shanghai", name: "Shanghai", lat: 31.2304, lng: 121.4737, exchange: "SSE" },
  { id: "tokyo", panelId: "tokyo", name: "Tokyo", lat: 35.6762, lng: 139.6503, exchange: "TSE" },
  { id: "sydney", panelId: "sydney", name: "Sydney", lat: -33.8688, lng: 151.2093, exchange: "ASX" },
  { id: "johannesburg", panelId: "johannesburg", name: "Johannesburg", lat: -26.2041, lng: 28.0473, exchange: "JSE" },
  { id: "addis-ababa", panelId: "addisababa", name: "Addis Ababa", lat: 9.0192, lng: 38.7525, exchange: "ESX" },
  { id: "lagos", panelId: "lagos", name: "Lagos", lat: 6.5244, lng: 3.3792, exchange: "NGX" },
  { id: "moscow", panelId: "moscow", name: "Moscow", lat: 55.7558, lng: 37.6173, exchange: "MOEX" },
  { id: "paris", panelId: "paris", name: "Paris", lat: 48.8566, lng: 2.3522, exchange: "Euronext" },
  { id: "tel-aviv", panelId: "telaviv", name: "Tel Aviv", lat: 32.0853, lng: 34.7818, exchange: "TASE" },
] as const;

export type FinancialCenter = (typeof FINANCIAL_CENTERS)[number];

export type WorldMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

type WorldMapProps = {
  lineColor?: string;
  onDotClick?: (center: FinancialCenter) => void;
  selectedPanelId?: string | null;
  /** Hide built-in +/−/reset (use external controls via ref). */
  hideControls?: boolean;
};

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(
  { lineColor = "#10b981", onDotClick, selectedPanelId = null, hideControls = false },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);
  const dragMovedRef = useRef(false);
  const panPointerStartRef = useRef({ ex: 0, ey: 0 });

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

  const projectPoint = useCallback(
    (lat: number, lng: number) => {
      const pin = map.getPin({ lat, lng });
      if (!pin) return { x: width / 2, y: height / 2 };
      return { x: pin.x, y: pin.y };
    },
    [map, width, height]
  );

  const zoomTowardCenter = useCallback((factor: number) => {
    setTransform((prev) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const newScale = Math.min(Math.max(prev.scale * factor, 1), 5);
      if (!rect) return { ...prev, scale: newScale };
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const scaleChange = newScale / prev.scale;
      return {
        scale: newScale,
        x: cx - (cx - prev.x) * scaleChange,
        y: cy - (cy - prev.y) * scaleChange,
      };
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomTowardCenter(1.3),
      zoomOut: () => zoomTowardCenter(1 / 1.3),
      resetZoom: () => setTransform({ x: 0, y: 0, scale: 1 }),
    }),
    [zoomTowardCenter]
  );

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * delta, 1), 5);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, scale: newScale };

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleChange = newScale / prev.scale;
      const newX = mouseX - (mouseX - prev.x) * scaleChange;
      const newY = mouseY - (mouseY - prev.y) * scaleChange;

      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const isInteractiveTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el?.closest) return false;
    return Boolean(el.closest(".world-map-controls") || el.closest("[data-world-map-dot='1']"));
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;
      dragMovedRef.current = false;
      panPointerStartRef.current = { ex: e.clientX, ey: e.clientY };
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    },
    [transform.x, transform.y]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const nx = e.clientX - dragStart.x;
      const ny = e.clientY - dragStart.y;
      const d = Math.hypot(
        e.clientX - panPointerStartRef.current.ex,
        e.clientY - panPointerStartRef.current.ey
      );
      if (d > 6) dragMovedRef.current = true;
      setTransform((prev) => ({
        ...prev,
        x: nx,
        y: ny,
      }));
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const lastTouchRef = useRef<TouchList | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isInteractiveTarget(e.target)) return;
      if (e.touches.length === 1) {
        setIsDragging(true);
        dragMovedRef.current = false;
        panPointerStartRef.current = { ex: e.touches[0].clientX, ey: e.touches[0].clientY };
        setDragStart({
          x: e.touches[0].clientX - transform.x,
          y: e.touches[0].clientY - transform.y,
        });
      }
      lastTouchRef.current = e.touches;
    },
    [transform.x, transform.y]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const t = e.touches[0];
        const nx = t.clientX - dragStart.x;
        const ny = t.clientY - dragStart.y;
        const d = Math.hypot(t.clientX - panPointerStartRef.current.ex, t.clientY - panPointerStartRef.current.ey);
        if (d > 6) dragMovedRef.current = true;
        setTransform((prev) => ({
          ...prev,
          x: nx,
          y: ny,
        }));
      }
      if (e.touches.length === 2 && lastTouchRef.current && lastTouchRef.current.length === 2) {
        const prevDist = Math.hypot(
          lastTouchRef.current[0].clientX - lastTouchRef.current[1].clientX,
          lastTouchRef.current[0].clientY - lastTouchRef.current[1].clientY
        );
        const currDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (prevDist > 0) {
          const delta = currDist / prevDist;
          setTransform((prev) => ({
            ...prev,
            scale: Math.min(Math.max(prev.scale * delta, 1), 5),
          }));
        }
      }
      lastTouchRef.current = e.touches;
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
  }, []);

  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`;

  const handleDotClick = (center: FinancialCenter, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragMovedRef.current) return;
    onDotClick?.(center);
  };

  return (
    <div
      ref={containerRef}
      className="world-map-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {!hideControls && (
        <div
          className="world-map-controls"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => zoomTowardCenter(1.3)}
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomTowardCenter(1 / 1.3)}
            title="Zoom out"
          >
            −
          </button>
          <button type="button" onClick={resetZoom} title="Reset">
            ⟲
          </button>
        </div>
      )}

      <div
        className="world-map-inner"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          transition: isDragging ? "none" : "transform 0.15s ease-out",
        }}
      >
        <div className="world-map-wrapper" style={{ position: "relative", width: "100%", height: "100%" }}>
          <Image
            src={dataUrl}
            className="world-map-image"
            alt=""
            height={height}
            width={width}
            draggable={false}
            unoptimized
            style={{ objectFit: "contain" }}
          />
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="world-map-svg world-map-svg--interactive"
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          >
          {FINANCIAL_CENTERS.map((center) => {
            const point = projectPoint(center.lat, center.lng);
            const isHovered = hoveredDot === center.id;
            const isSelected = selectedPanelId === center.panelId;
            return (
              <g
                key={center.id}
                data-world-map-dot="1"
                style={{ cursor: "pointer" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  dragMovedRef.current = false;
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    dragMovedRef.current = false;
                  }
                }}
                onMouseEnter={() => setHoveredDot(center.id)}
                onMouseLeave={() => setHoveredDot(null)}
                onClick={(e) => handleDotClick(center, e)}
              >
                {/* Pulse ring 1 */}
                <circle cx={point.x} cy={point.y} r="0.25" fill={lineColor} opacity="0.3">
                  <animate attributeName="r" from="0.25" to="1.5" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Pulse ring 2 */}
                <circle cx={point.x} cy={point.y} r="0.25" fill={lineColor} opacity="0.2">
                  <animate attributeName="r" from="0.25" to="1.5" dur="2s" begin="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.2" to="0" dur="2s" begin="1s" repeatCount="indefinite" />
                </circle>
                {/* Main dot — solid green, no inner black dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered || isSelected ? 0.9 : 0.6}
                  fill={isSelected ? "#fff" : lineColor}
                  stroke={isSelected ? lineColor : "none"}
                  strokeWidth={isSelected ? 0.2 : 0}
                />

                {isHovered && !isSelected && (
                  <g pointerEvents="none">
                    <rect
                      x={point.x - 11}
                      y={point.y - 7}
                      width="22"
                      height="5"
                      rx="1"
                      fill="rgba(10,14,19,0.92)"
                      stroke="rgba(16,185,129,0.2)"
                      strokeWidth="0.15"
                    />
                    <text
                      x={point.x}
                      y={point.y - 4.2}
                      textAnchor="middle"
                      fill="#f0f6fc"
                      fontSize="1.5"
                      fontWeight="700"
                      fontFamily="var(--font-mono, monospace)"
                    >
                      {center.name}
                    </text>
                    <text
                      x={point.x}
                      y={point.y - 2.8}
                      textAnchor="middle"
                      fill="#4b5563"
                      fontSize="1"
                      fontFamily="var(--font-mono, monospace)"
                    >
                      {center.exchange}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        </div>
      </div>
    </div>
  );
});
