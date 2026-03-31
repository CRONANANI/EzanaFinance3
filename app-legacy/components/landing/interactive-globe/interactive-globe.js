/**
 * Interactive Globe - Vanilla JS version for static HTML
 * Canvas-based rotating globe with dots, arcs, markers. Drag to rotate.
 * Ezana Finance brand colors (emerald #10b981).
 */
(function () {
  'use strict';

  var DEFAULT_MARKERS = [
    { lat: 37.78, lng: -122.42, label: 'San Francisco' },
    { lat: 51.51, lng: -0.13, label: 'London' },
    { lat: 35.68, lng: 139.69, label: 'Tokyo' },
    { lat: -33.87, lng: 151.21, label: 'Sydney' },
    { lat: 1.35, lng: 103.82, label: 'Singapore' },
    { lat: 55.76, lng: 37.62, label: 'Moscow' },
    { lat: -23.55, lng: -46.63, label: 'São Paulo' },
    { lat: 19.43, lng: -99.13, label: 'Mexico City' },
    { lat: 28.61, lng: 77.21, label: 'Delhi' },
    { lat: 36.19, lng: 44.01, label: 'Erbil' },
  ];

  var DEFAULT_CONNECTIONS = [
    { from: [37.78, -122.42], to: [51.51, -0.13] },
    { from: [51.51, -0.13], to: [35.68, 139.69] },
    { from: [35.68, 139.69], to: [-33.87, 151.21] },
    { from: [37.78, -122.42], to: [1.35, 103.82] },
    { from: [51.51, -0.13], to: [28.61, 77.21] },
    { from: [37.78, -122.42], to: [-23.55, -46.63] },
    { from: [1.35, 103.82], to: [-33.87, 151.21] },
    { from: [28.61, 77.21], to: [36.19, 44.01] },
    { from: [51.51, -0.13], to: [36.19, 44.01] },
  ];

  function latLngToXYZ(lat, lng, radius) {
    var phi = ((90 - lat) * Math.PI) / 180;
    var theta = ((lng + 180) * Math.PI) / 180;
    return [
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    ];
  }

  function rotateY(x, y, z, angle) {
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    return [x * cos + z * sin, y, -x * sin + z * cos];
  }

  function rotateX(x, y, z, angle) {
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    return [x, y * cos - z * sin, y * sin + z * cos];
  }

  function project(x, y, z, cx, cy, fov) {
    var scale = fov / (fov + z);
    return [x * scale + cx, y * scale + cy, z];
  }

  function initGlobe(container, opts) {
    opts = opts || {};
    var dotColor = opts.dotColor || 'rgba(16, 185, 129, ALPHA)';
    var arcColor = opts.arcColor || 'rgba(16, 185, 129, 0.5)';
    var markerColor = opts.markerColor || 'rgba(16, 220, 180, 1)';
    var autoRotateSpeed = opts.autoRotateSpeed || 0.002;
    var connections = opts.connections || DEFAULT_CONNECTIONS;
    var markers = opts.markers || DEFAULT_MARKERS;

    var canvas = document.createElement('canvas');
    canvas.className = 'globe-canvas';
    canvas.style.cssText = 'width:100%;height:100%;cursor:grab;';
    container.appendChild(canvas);

    // Radians: ~90° Y aligns Americas toward the camera (matches React globe)
    var rotY = Math.PI / 2;
    var rotX = 0;
    var drag = { active: false, startX: 0, startY: 0, startRotY: 0, startRotX: 0 };
    var animId = 0;
    var time = 0;

    var dots = [];
    var goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (var i = 0; i < 1200; i++) {
      var theta = (2 * Math.PI * i) / goldenRatio;
      var phi = Math.acos(1 - (2 * (i + 0.5)) / 1200);
      dots.push([
        Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ]);
    }

    function draw() {
      var ctx = canvas.getContext('2d');
      if (!ctx) return;

      var dpr = window.devicePixelRatio || 1;
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      var cx = w / 2;
      var cy = h / 2;
      var radius = Math.min(w, h) * 0.38;
      var fov = 600;

      if (!drag.active) rotY += autoRotateSpeed;
      time += 0.015;

      ctx.clearRect(0, 0, w, h);

      var glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.5);
      glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.03)');
      glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var x = d[0] * radius;
        var y = d[1] * radius;
        var z = d[2] * radius;
        var r = rotateX(x, y, z, rotX);
        x = r[0]; y = r[1]; z = r[2];
        r = rotateY(x, y, z, rotY);
        x = r[0]; y = r[1]; z = r[2];
        if (z > 0) continue;
        var s = project(x, y, z, cx, cy, fov);
        var depthAlpha = Math.max(0.1, 1 - (z + radius) / (2 * radius));
        ctx.beginPath();
        ctx.arc(s[0], s[1], 1 + depthAlpha * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = dotColor.replace('ALPHA', depthAlpha.toFixed(2));
        ctx.fill();
      }

      for (var c = 0; c < connections.length; c++) {
        var conn = connections[c];
        var p1 = latLngToXYZ(conn.from[0], conn.from[1], radius);
        var p2 = latLngToXYZ(conn.to[0], conn.to[1], radius);
        p1 = rotateX(p1[0], p1[1], p1[2], rotX);
        p1 = rotateY(p1[0], p1[1], p1[2], rotY);
        p2 = rotateX(p2[0], p2[1], p2[2], rotX);
        p2 = rotateY(p2[0], p2[1], p2[2], rotY);
        if (p1[2] > radius * 0.3 && p2[2] > radius * 0.3) continue;
        var s1 = project(p1[0], p1[1], p1[2], cx, cy, fov);
        var s2 = project(p2[0], p2[1], p2[2], cx, cy, fov);
        var midX = (p1[0] + p2[0]) / 2;
        var midY = (p1[1] + p2[1]) / 2;
        var midZ = (p1[2] + p2[2]) / 2;
        var midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ);
        var arcH = radius * 1.25;
        var elev = project((midX / midLen) * arcH, (midY / midLen) * arcH, (midZ / midLen) * arcH, cx, cy, fov);
        ctx.beginPath();
        ctx.moveTo(s1[0], s1[1]);
        ctx.quadraticCurveTo(elev[0], elev[1], s2[0], s2[1]);
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        var t = (Math.sin(time * 1.2 + conn.from[0] * 0.1) + 1) / 2;
        var tx = (1 - t) * (1 - t) * s1[0] + 2 * (1 - t) * t * elev[0] + t * t * s2[0];
        var ty = (1 - t) * (1 - t) * s1[1] + 2 * (1 - t) * t * elev[1] + t * t * s2[1];
        var dx = 2 * (1 - t) * (elev[0] - s1[0]) + 2 * t * (s2[0] - elev[0]);
        var dy = 2 * (1 - t) * (elev[1] - s1[1]) + 2 * t * (s2[1] - elev[1]);
        var angle = Math.atan2(dy, dx);
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

      for (var m = 0; m < markers.length; m++) {
        var marker = markers[m];
        var mp = latLngToXYZ(marker.lat, marker.lng, radius);
        mp = rotateX(mp[0], mp[1], mp[2], rotX);
        mp = rotateY(mp[0], mp[1], mp[2], rotY);
        if (mp[2] > radius * 0.1) continue;
        var ms = project(mp[0], mp[1], mp[2], cx, cy, fov);
        var pulse = Math.sin(time * 2 + marker.lat) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(ms[0], ms[1], 4 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = markerColor.replace('1)', (0.2 + pulse * 0.15) + ')');
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ms[0], ms[1], 2.5, 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();
        if (marker.label) {
          ctx.font = '10px system-ui, sans-serif';
          ctx.fillStyle = markerColor.replace('1)', '0.6)');
          ctx.fillText(marker.label, ms[0] + 8, ms[1] + 3);
        }
      }

      animId = requestAnimationFrame(draw);
    }

    function onDown(e) {
      drag = { active: true, startX: e.clientX, startY: e.clientY, startRotY: rotY, startRotX: rotX };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (!drag.active) return;
      rotY = drag.startRotY + (e.clientX - drag.startX) * 0.005;
      rotX = Math.max(-1, Math.min(1, drag.startRotX + (e.clientY - drag.startY) * 0.005));
    }
    function onUp() {
      drag.active = false;
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);

    canvas.addEventListener('mousedown', function (e) {
      if (e.pointerType === undefined) onDown(e);
    });
    canvas.addEventListener('mousemove', function (e) {
      if (e.pointerType === undefined) onMove(e);
    });
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);

    canvas.addEventListener('dragstart', function (e) { e.preventDefault(); });

    draw();

    return {
      destroy: function () {
        cancelAnimationFrame(animId);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointerleave', onUp);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      },
    };
  }

  window.initInteractiveGlobe = initGlobe;
})();
