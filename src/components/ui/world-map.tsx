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
import type { CountryScore } from "@/hooks/useGlobalPowerMap";

/** Approximate country centroids (ISO 3166-1 alpha-2) for power-map heat blobs */
const POWER_COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.8283, lng: -98.5795 },
  CN: { lat: 35.8617, lng: 104.1954 },
  DE: { lat: 51.1657, lng: 10.4515 },
  JP: { lat: 36.2048, lng: 138.2529 },
  KR: { lat: 35.9078, lng: 127.7669 },
  NL: { lat: 52.1326, lng: 5.2913 },
  GB: { lat: 55.3781, lng: -3.436 },
  FR: { lat: 46.2276, lng: 2.2137 },
  IN: { lat: 20.5937, lng: 78.9629 },
  BR: { lat: -14.235, lng: -51.9253 },
  MX: { lat: 23.6345, lng: -102.5528 },
  RU: { lat: 61.524, lng: 105.3188 },
  CA: { lat: 56.1304, lng: -106.3468 },
  AU: { lat: -25.2744, lng: 133.7751 },
  IT: { lat: 41.8719, lng: 12.5674 },
  SG: { lat: 1.3521, lng: 103.8198 },
  NG: { lat: 9.082, lng: 8.6753 },
  SD: { lat: 12.8628, lng: 30.2176 },
  SY: { lat: 34.8021, lng: 38.9968 },
  IQ: { lat: 33.2232, lng: 43.6793 },
  AF: { lat: 33.9391, lng: 67.71 },
  ET: { lat: 9.145, lng: 40.4897 },
  MM: { lat: 21.9162, lng: 95.956 },
  ML: { lat: 17.5707, lng: -3.9962 },
  TR: { lat: 38.9637, lng: 35.2433 },
  AR: { lat: -38.4161, lng: -63.6167 },
  ZA: { lat: -30.5595, lng: 22.9375 },
  ES: { lat: 40.4637, lng: -3.7492 },
  SA: { lat: 23.8859, lng: 45.0792 },
  AE: { lat: 23.4241, lng: 53.8478 },
  NO: { lat: 60.472, lng: 8.4689 },
  QA: { lat: 25.3548, lng: 51.1839 },
  IL: { lat: 31.0461, lng: 34.8516 },
  PK: { lat: 30.3753, lng: 69.3451 },
  ID: { lat: -0.7893, lng: 113.9213 },
  EG: { lat: 26.8206, lng: 30.8025 },
  BD: { lat: 23.685, lng: 90.3563 },
  PH: { lat: 12.8797, lng: 121.774 },
  VN: { lat: 14.0583, lng: 108.2772 },
  KZ: { lat: 48.0196, lng: 66.9237 },
  FI: { lat: 61.9241, lng: 25.7482 },
  DK: { lat: 56.2639, lng: 9.5018 },
  NZ: { lat: -40.9006, lng: 174.886 },
  SE: { lat: 60.1282, lng: 18.6435 },
  CH: { lat: 46.8182, lng: 8.2275 },
  AT: { lat: 47.5162, lng: 14.5501 },
};

function scoreToColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 65) return "#4ADE80";
  if (score >= 50) return "#FACC15";
  if (score >= 35) return "#F97316";
  return "#EF4444";
}

function scoreToOpacity(score: number): number {
  return 0.4 + (score / 100) * 0.5;
}

export const FINANCIAL_CENTERS = [
  { id: "toronto", panelId: "toronto", name: "Toronto", lat: 43.6532, lng: -79.3832, exchange: "TSX" },
  { id: "new-york", panelId: "newyork", name: "New York", lat: 40.7128, lng: -74.006, exchange: "NYSE / NASDAQ" },
  { id: "boston", panelId: "boston", name: "Boston", lat: 42.3601, lng: -71.0589, exchange: "Biotech / Education" },
  { id: "sao-paulo", panelId: "saopaulo", name: "São Paulo", lat: -23.5505, lng: -46.6333, exchange: "B3" },
  { id: "santiago", panelId: "santiago", name: "Santiago", lat: -33.4489, lng: -70.6693, exchange: "SSE" },
  { id: "lima", panelId: "lima", name: "Lima", lat: -12.0464, lng: -77.0428, exchange: "BVL" },
  { id: "bogota", panelId: "bogota", name: "Bogotá", lat: 4.711, lng: -74.0721, exchange: "BVC" },
  { id: "medellin", panelId: "medellin", name: "Medellín", lat: 6.2476, lng: -75.5658, exchange: "BVC" },
  { id: "buenos-aires", panelId: "buenosaires", name: "Buenos Aires", lat: -34.6037, lng: -58.3816, exchange: "BYMA" },
  { id: "london", panelId: "london", name: "London", lat: 51.5074, lng: -0.1278, exchange: "LSE" },
  { id: "frankfurt", panelId: "frankfurt", name: "Frankfurt", lat: 50.1109, lng: 8.6821, exchange: "Deutsche Börse" },
  { id: "dubai", panelId: "dubai", name: "Dubai", lat: 25.2048, lng: 55.2708, exchange: "DFM" },
  { id: "mumbai", panelId: "mumbai", name: "Mumbai", lat: 19.076, lng: 72.8777, exchange: "BSE / NSE" },
  { id: "singapore", panelId: "singapore", name: "Singapore", lat: 1.3521, lng: 103.8198, exchange: "SGX" },
  { id: "hong-kong", panelId: "hongkong", name: "Hong Kong", lat: 22.3193, lng: 114.1694, exchange: "HKEX" },
  { id: "shanghai", panelId: "shanghai", name: "Shanghai", lat: 31.2304, lng: 121.4737, exchange: "SSE" },
  { id: "tokyo", panelId: "tokyo", name: "Tokyo", lat: 35.6762, lng: 139.6503, exchange: "TSE" },
  { id: "sydney", panelId: "sydney", name: "Sydney", lat: -33.8688, lng: 151.2093, exchange: "ASX" },
  { id: "auckland", panelId: "auckland", name: "Auckland", lat: -36.8485, lng: 174.7633, exchange: "NZX" },
  { id: "melbourne", panelId: "melbourne", name: "Melbourne", lat: -37.8136, lng: 144.9631, exchange: "ASX" },
  { id: "johannesburg", panelId: "johannesburg", name: "Johannesburg", lat: -26.2041, lng: 28.0473, exchange: "JSE" },
  { id: "addis-ababa", panelId: "addisababa", name: "Addis Ababa", lat: 9.0192, lng: 38.7525, exchange: "ESX" },
  { id: "lagos", panelId: "lagos", name: "Lagos", lat: 6.5244, lng: 3.3792, exchange: "NGX" },
  { id: "nairobi", panelId: "nairobi", name: "Nairobi", lat: -1.2921, lng: 36.8219, exchange: "NSE" },
  { id: "moscow", panelId: "moscow", name: "Moscow", lat: 55.7558, lng: 37.6173, exchange: "MOEX" },
  { id: "paris", panelId: "paris", name: "Paris", lat: 48.8566, lng: 2.3522, exchange: "Euronext" },
  { id: "tel-aviv", panelId: "telaviv", name: "Tel Aviv", lat: 32.0853, lng: 34.7818, exchange: "TASE" },
  { id: "miami", panelId: "miami", name: "Miami", lat: 25.7617, lng: -80.1918, exchange: "Fintech Hub" },
  { id: "san-francisco", panelId: "sanfrancisco", name: "San Francisco", lat: 37.7749, lng: -122.4194, exchange: "VC / Tech" },
  { id: "chicago", panelId: "chicago", name: "Chicago", lat: 41.8781, lng: -87.6298, exchange: "CME / CBOE" },
  { id: "seoul", panelId: "seoul", name: "Seoul", lat: 37.5665, lng: 126.978, exchange: "KRX" },
  { id: "geneva", panelId: "geneva", name: "Geneva", lat: 46.2044, lng: 6.1432, exchange: "SIX" },
  { id: "dublin", panelId: "dublin", name: "Dublin", lat: 53.3498, lng: -6.2603, exchange: "Euronext Dublin" },
  { id: "stockholm", panelId: "stockholm", name: "Stockholm", lat: 59.3293, lng: 18.0686, exchange: "Nasdaq Nordic" },
  { id: "montreal", panelId: "montreal", name: "Montreal", lat: 45.5017, lng: -73.5673, exchange: "TMX / MX" },
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
  /** Active layer for map styling */
  activeLayer?: string | null;
  /** Active tab within the layer */
  activeLayerTab?: string | null;
  /** When true, hide financial-center pulse dots (e.g. Global Power Map active). */
  hideFinancialDots?: boolean;
  /** Country composite scores for heat blobs (ISO2). */
  powerCountryScores?: CountryScore[];
};

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(
  {
    lineColor = "#10b981",
    onDotClick,
    selectedPanelId = null,
    hideControls = false,
    activeLayer = null,
    activeLayerTab = null,
    hideFinancialDots = false,
    powerCountryScores = [],
  },
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

  // Determine dot color based on active layer
  const getDotColor = (center: FinancialCenter): string => {
    // If no active layer, use default lineColor (green)
    if (!activeLayer) return lineColor;

    // Central Banks layer: gold if recent/upcoming decision
    if (activeLayer === 'central-banks') {
      const centralBanks = [
        { cities: ['washington-dc', 'new-york'], name: 'Federal Reserve' },
        { cities: ['frankfurt'], name: 'ECB' },
        { cities: ['london'], name: 'Bank of England' },
        { cities: ['tokyo'], name: 'Bank of Japan' },
        // Add more mappings as needed
      ];
      // For now, return gold for selected bank locations
      if (center.name === 'Frankfurt') return '#D4AF37'; // ECB gold
      if (center.name === 'New York') return '#D4AF37'; // Federal Reserve gold  
      if (center.name === 'London') return '#D4AF37'; // BOE gold
      if (center.name === 'Tokyo') return '#D4AF37'; // BOJ gold
      return '#4b5563'; // Gray for inactive
    }

    // Indices layer: green if up, red if down
    if (activeLayer === 'indices') {
      // Map city names to their index performance
      const indexPerformance: Record<string, number> = {
        'New York': 0.34, // S&P 500 up
        'London': -0.17, // FTSE down
        'Frankfurt': 0.52, // DAX up
        'Tokyo': 0.95, // Nikkei up
        'Hong Kong': -0.68, // Hang Seng down
        'Shanghai': -0.42, // Shanghai Composite down
        'Singapore': -0.05, // STI down slight
        'Mumbai': 1.15, // Nifty 50 up
        'Sydney': 0.45, // ASX up
        'São Paulo': 1.20, // Bovespa up
        'Toronto': -0.12, // TSX down
        'Mexico City': -0.45, // IPC down
        'Buenos Aires': 2.10, // Merval up
        'Santiago': -0.15, // SSE down
        'Moscow': -1.50, // MOEX down
        'Paris': 0.28, // CAC 40 up
        'Madrid': 0.15, // IBEX up (mapped from generic city)
        'Milan': -0.22, // FTSE MIB down (mapped)
      };
      const perf = indexPerformance[center.name];
      if (perf === undefined) return lineColor; // Default if not mapped
      return perf >= 0 ? '#10b981' : '#ef4444'; // Green up, red down
    }

    // Commodities layer: keep default
    if (activeLayer === 'commodities') {
      return lineColor;
    }

    // Currencies layer: use default  
    if (activeLayer === 'currencies') {
      return lineColor;
    }

    // Markets layer: use default
    if (activeLayer === 'markets') {
      return lineColor;
    }

    return lineColor;
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
          {powerCountryScores.map((c) => {
            const geo = POWER_COUNTRY_CENTROIDS[c.iso];
            if (!geo) return null;
            const point = projectPoint(geo.lat, geo.lng);
            const fill = scoreToColor(c.score);
            const op = scoreToOpacity(c.score);
            const r = 1.8 + (c.score / 100) * 5.5;
            return (
              <g key={`power-${c.iso}`} pointerEvents="none">
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={r}
                  fill={fill}
                  fillOpacity={op * 0.85}
                  stroke={fill}
                  strokeWidth={0.12}
                  strokeOpacity={0.9}
                />
              </g>
            );
          })}
          {!hideFinancialDots &&
            FINANCIAL_CENTERS.map((center) => {
            const point = projectPoint(center.lat, center.lng);
            const isHovered = hoveredDot === center.id;
            const isSelected = selectedPanelId === center.panelId;
            return (
              <g
                key={center.id}
                data-world-map-dot="1"
                data-city={center.panelId}
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
                {/* Pulse ring 1 — expands and fades */}
                <circle cx={point.x} cy={point.y} r="0.6" fill="none" stroke={getDotColor(center)} strokeWidth="0.15" opacity="0">
                  <animate attributeName="r" from="0.6" to="3" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="stroke-width" from="0.15" to="0.02" dur="2.5s" repeatCount="indefinite" />
                </circle>
                {/* Pulse ring 2 — offset by 1.25s for continuous effect */}
                <circle cx={point.x} cy={point.y} r="0.6" fill="none" stroke={getDotColor(center)} strokeWidth="0.15" opacity="0">
                  <animate attributeName="r" from="0.6" to="3" dur="2.5s" begin="1.25s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2.5s" begin="1.25s" repeatCount="indefinite" />
                  <animate attributeName="stroke-width" from="0.15" to="0.02" dur="2.5s" begin="1.25s" repeatCount="indefinite" />
                </circle>
                {/* Subtle glow ring — always visible, very faint */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="1.2"
                  fill="none"
                  stroke={getDotColor(center)}
                  strokeWidth="0.08"
                  opacity="0.15"
                />
                {/* Main solid dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered || isSelected ? 0.9 : 0.6}
                  fill={isSelected ? "#fff" : getDotColor(center)}
                  stroke={isSelected ? getDotColor(center) : "none"}
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
