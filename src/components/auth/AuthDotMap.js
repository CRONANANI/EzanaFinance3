'use client';

import React, { useRef, useEffect, useState } from "react";

const AuthDotMap = () => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Financial network routes - top (above Ezana Finance) + bottom (beside feature list)
  const getRoutes = (width, height) => {
    if (!width || !height) return [];
    return [
      // Top area - above logo/text
      { start: { x: width * 0.22, y: height * 0.25, delay: 0 }, end: { x: width * 0.45, y: height * 0.13, delay: 2 }, color: "#10b981" },
      { start: { x: width * 0.45, y: height * 0.13, delay: 2 }, end: { x: width * 0.58, y: height * 0.2, delay: 4 }, color: "#10b981" },
      { start: { x: width * 0.11, y: height * 0.08, delay: 1 }, end: { x: width * 0.33, y: height * 0.3, delay: 3 }, color: "#059669" },
      { start: { x: width * 0.62, y: height * 0.1, delay: 0.5 }, end: { x: width * 0.4, y: height * 0.3, delay: 2.5 }, color: "#34d399" },
      { start: { x: width * 0.49, y: height * 0.33, delay: 1.5 }, end: { x: width * 0.27, y: height * 0.17, delay: 3.5 }, color: "#10b981" },
      // Bottom area - beside Real-time congressional trades, 13F filings, Legendary portfolios
      { start: { x: width * 0.15, y: height * 0.62, delay: 0.5 }, end: { x: width * 0.35, y: height * 0.55, delay: 2.5 }, color: "#10b981" },
      { start: { x: width * 0.35, y: height * 0.55, delay: 2.5 }, end: { x: width * 0.5, y: height * 0.68, delay: 4.5 }, color: "#059669" },
      { start: { x: width * 0.7, y: height * 0.58, delay: 1 }, end: { x: width * 0.55, y: height * 0.72, delay: 3 }, color: "#34d399" },
      { start: { x: width * 0.25, y: height * 0.78, delay: 1.5 }, end: { x: width * 0.45, y: height * 0.65, delay: 3.5 }, color: "#10b981" },
      { start: { x: width * 0.6, y: height * 0.82, delay: 2 }, end: { x: width * 0.75, y: height * 0.68, delay: 4 }, color: "#059669" },
    ];
  };

  // Generate dots for financial network visualization
  const generateDots = (width, height) => {
    const dots = [];
    const gap = 15;
    const dotRadius = 1;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        // Create network-like pattern - top (above Ezana Finance) + bottom (beside feature list)
        const isInPattern =
          ((x < width * 0.3 && x > width * 0.05) && (y < height * 0.5 && y > height * 0.1)) ||
          ((x < width * 0.5 && x > width * 0.25) && (y < height * 0.7 && y > height * 0.3)) ||
          ((x < width * 0.75 && x > width * 0.45) && (y < height * 0.6 && y > height * 0.15)) ||
          ((x < width * 0.95 && x > width * 0.7) && (y < height * 0.85 && y > height * 0.4)) ||
          ((x < width * 0.5 && x > width * 0.1) && (y < height * 0.9 && y > height * 0.52)) ||
          ((x < width * 0.9 && x > width * 0.5) && (y < height * 0.88 && y > height * 0.55));

        if (isInPattern && Math.random() > 0.4) {
          dots.push({
            x,
            y,
            radius: dotRadius,
            opacity: Math.random() * 0.4 + 0.1,
          });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas.parentElement);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    const routes = getRoutes(dimensions.width, dimensions.height);
    let animationFrameId;
    let startTime = Date.now();

    function drawDots() {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${dot.opacity})`;
        ctx.fill();
      });
    }

    function drawRoutes() {
      const currentTime = (Date.now() - startTime) / 1000;

      routes.forEach((route) => {
        const elapsed = currentTime - route.start.delay;
        if (elapsed <= 0) return;

        const duration = 3;
        const progress = Math.min(elapsed / duration, 1);

        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;

        // Draw route line
        ctx.beginPath();
        ctx.moveTo(route.start.x, route.start.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = route.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw start point
        ctx.beginPath();
        ctx.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = route.color;
        ctx.fill();

        // Draw moving point
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
        ctx.fill();

        if (progress === 1) {
          ctx.beginPath();
          ctx.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = route.color;
          ctx.fill();
        }
      });
    }

    function animate() {
      drawDots();
      drawRoutes();

      const currentTime = (Date.now() - startTime) / 1000;
      if (currentTime > 12) {
        startTime = Date.now();
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default AuthDotMap;
