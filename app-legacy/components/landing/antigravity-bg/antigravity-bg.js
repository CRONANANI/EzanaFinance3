/**
 * Antigravity particle background - vanilla Three.js (no React).
 * Particles are attracted to the mouse and form a ring around it; otherwise they drift.
 */
(function () {
  const DEFAULTS = {
    count: 300,
    magnetRadius: 10,
    ringRadius: 10,
    waveSpeed: 0.4,
    waveAmplitude: 1,
    particleSize: 2,
    lerpSpeed: 0.1,
    color: '#FF9FFC',
    autoAnimate: false,
    particleVariance: 1,
    rotationSpeed: 0,
    depthFactor: 1,
    pulseSpeed: 3,
    fieldStrength: 10,
  };

  function AntigravityBackground(container, options = {}) {
    const opts = { ...DEFAULTS, ...options };
    const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
    if (!containerEl) return;

    let scene, camera, renderer, mesh, particles, dummy;
    let viewportWidth = 100;
    let viewportHeight = 100;
    const lastMousePos = { x: 0, y: 0 };
    let lastMouseMoveTime = 0;
    const virtualMouse = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };
    const clock = { getElapsedTime: () => 0 };
    let rafId = 0;
    let mouseLeaveHandler = null;

    function getViewportSize() {
      const vFov = (camera.fov * Math.PI) / 180;
      const height = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z);
      const width = height * (containerEl.clientWidth / containerEl.clientHeight);
      return { width, height };
    }

    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, containerEl.clientWidth / containerEl.clientHeight, 0.1, 1000);
      camera.position.set(0, 0, 50);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      containerEl.appendChild(renderer.domElement);

      const size = getViewportSize();
      viewportWidth = size.width;
      viewportHeight = size.height;

      particles = [];
      for (let i = 0; i < opts.count; i++) {
        const t = Math.random() * 100;
        const speed = 0.01 + Math.random() / 200;
        const x = (Math.random() - 0.5) * viewportWidth;
        const y = (Math.random() - 0.5) * viewportHeight;
        const z = (Math.random() - 0.5) * 20;
        const randomRadiusOffset = (Math.random() - 0.5) * 2;
        particles.push({
          t,
          speed,
          mx: x,
          my: y,
          mz: z,
          cx: x,
          cy: y,
          cz: z,
          randomRadiusOffset,
        });
      }

      const geometry = THREE.CapsuleGeometry
        ? new THREE.CapsuleGeometry(0.1, 0.4, 4, 8)
        : new THREE.SphereGeometry(0.2, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: opts.color });
      mesh = new THREE.InstancedMesh(geometry, material, opts.count);
      scene.add(mesh);

      dummy = new THREE.Object3D();
      clock.getElapsedTime = () => (performance.now() - (clock.start || 0)) / 1000;
      clock.start = performance.now();

      mouseLeaveHandler = function () {
        pointer.x = 0;
        pointer.y = 0;
      };
      window.addEventListener('resize', onResize);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseleave', mouseLeaveHandler);

      animate();
    }

    function onResize() {
      if (!camera || !renderer || !containerEl) return;
      const w = containerEl.clientWidth;
      const h = containerEl.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      const v = getViewportSize();
      viewportWidth = v.width;
      viewportHeight = v.height;
    }

    function onMouseMove(e) {
      const rect = containerEl.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      lastMouseMoveTime = Date.now();
      lastMousePos.x = pointer.x;
      lastMousePos.y = pointer.y;
    }

    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!mesh || !particles.length) return;

      const time = clock.getElapsedTime();
      const mouseDist = Math.sqrt(
        Math.pow(pointer.x - lastMousePos.x, 2) + Math.pow(pointer.y - lastMousePos.y, 2)
      );
      if (mouseDist > 0.001) {
        lastMouseMoveTime = Date.now();
        lastMousePos.x = pointer.x;
        lastMousePos.y = pointer.y;
      }

      let destX = (pointer.x * viewportWidth) / 2;
      let destY = (pointer.y * viewportHeight) / 2;

      if (opts.autoAnimate && Date.now() - lastMouseMoveTime > 2000) {
        destX = Math.sin(time * 0.5) * (viewportWidth / 4);
        destY = Math.cos(time * 0.5 * 2) * (viewportHeight / 4);
      }

      const smoothFactor = 0.05;
      virtualMouse.x += (destX - virtualMouse.x) * smoothFactor;
      virtualMouse.y += (destY - virtualMouse.y) * smoothFactor;

      const targetX = virtualMouse.x;
      const targetY = virtualMouse.y;
      const globalRotation = time * opts.rotationSpeed;

      particles.forEach((p, i) => {
        p.t += p.speed / 2;
        const projectionFactor = 1 - p.cz / 50;
        const projectedTargetX = targetX * projectionFactor;
        const projectedTargetY = targetY * projectionFactor;

        const dx = p.mx - projectedTargetX;
        const dy = p.my - projectedTargetY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetPos = { x: p.mx, y: p.my, z: p.mz * opts.depthFactor };

        if (dist < opts.magnetRadius) {
          const angle = Math.atan2(dy, dx) + globalRotation;
          const wave = Math.sin(p.t * opts.waveSpeed + angle) * (0.5 * opts.waveAmplitude);
          const deviation = p.randomRadiusOffset * (5 / (opts.fieldStrength + 0.1));
          const currentRingRadius = opts.ringRadius + wave + deviation;
          targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
          targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
          targetPos.z = p.mz * opts.depthFactor + Math.sin(p.t) * opts.waveAmplitude * opts.depthFactor;
        }

        p.cx += (targetPos.x - p.cx) * opts.lerpSpeed;
        p.cy += (targetPos.y - p.cy) * opts.lerpSpeed;
        p.cz += (targetPos.z - p.cz) * opts.lerpSpeed;

        dummy.position.set(p.cx, p.cy, p.cz);
        dummy.lookAt(projectedTargetX, projectedTargetY, p.cz);
        dummy.rotateX(Math.PI / 2);

        const currentDistToMouse = Math.sqrt(
          Math.pow(p.cx - projectedTargetX, 2) + Math.pow(p.cy - projectedTargetY, 2)
        );
        const distFromRing = Math.abs(currentDistToMouse - opts.ringRadius);
        let scaleFactor = 1 - distFromRing / 10;
        scaleFactor = Math.max(0, Math.min(1, scaleFactor));
        const finalScale =
          scaleFactor * (0.8 + Math.sin(p.t * opts.pulseSpeed) * 0.2 * opts.particleVariance) * opts.particleSize;
        dummy.scale.set(finalScale, finalScale, finalScale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    }

    function destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      if (mouseLeaveHandler) {
        document.removeEventListener('mouseleave', mouseLeaveHandler);
      }
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    }

    init();
    return { destroy };
  }

  window.AntigravityBackground = AntigravityBackground;
})();
