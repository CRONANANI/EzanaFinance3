// Prism Background Effect - Vanilla JavaScript Implementation
class PrismBackground {
  constructor(options = {}) {
    this.options = {
      height: 3.5,
      baseWidth: 5.5,
      animationType: 'rotate',
      glow: 1,
      offset: { x: 0, y: 0 },
      noise: 0.5,
      transparent: true,
      scale: 3.6,
      hueShift: 0,
      colorFrequency: 1,
      hoverStrength: 2,
      inertia: 0.05,
      bloom: 1,
      suspendWhenOffscreen: false,
      timeScale: 0.5,
      ...options
    };

    this.container = null;
    this.renderer = null;
    this.gl = null;
    this.program = null;
    this.mesh = null;
    this.raf = 0;
    this.startTime = 0;
    this.pointer = { x: 0, y: 0, inside: true };
    this.rotation = { yaw: 0, pitch: 0, roll: 0 };
    this.targetRotation = { yaw: 0, pitch: 0, roll: 0 };
    
    this.init();
  }

  init() {
    this.container = document.querySelector('.prism-container');
    if (!this.container) {
      console.error('Prism container not found');
      return;
    }

    this.setupWebGL();
    this.setupShaders();
    this.setupEventListeners();
    this.startRender();
  }

  setupWebGL() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    this.gl = gl;
    this.renderer = { gl, setSize: (w, h) => {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }};

    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';

    this.container.appendChild(canvas);
    this.resize();
  }

  setupShaders() {
    const gl = this.gl;
    
    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment shader
    const fragmentShaderSource = `
      precision highp float;

      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHeight;
      uniform float uBaseHalf;
      uniform mat3 uRot;
      uniform int uUseBaseWobble;
      uniform float uGlow;
      uniform vec2 uOffsetPx;
      uniform float uNoise;
      uniform float uSaturation;
      uniform float uScale;
      uniform float uHueShift;
      uniform float uColorFreq;
      uniform float uBloom;
      uniform float uCenterShift;
      uniform float uInvBaseHalf;
      uniform float uInvHeight;
      uniform float uMinAxis;
      uniform float uPxScale;
      uniform float uTimeScale;

      vec4 tanh4(vec4 x) {
        vec4 e2x = exp(2.0 * x);
        return (e2x - 1.0) / (e2x + 1.0);
      }

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float sdOctaAnisoInv(vec3 p) {
        vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
        float m = q.x + q.y + q.z - 1.0;
        return m * uMinAxis * 0.5773502691896258;
      }

      float sdPyramidUpInv(vec3 p) {
        float oct = sdOctaAnisoInv(p);
        float halfSpace = -p.y;
        return max(oct, halfSpace);
      }

      mat3 hueRotation(float a) {
        float c = cos(a), s = sin(a);
        mat3 W = mat3(
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114
        );
        mat3 U = mat3(
           0.701, -0.587, -0.114,
          -0.299,  0.413, -0.114,
          -0.300, -0.588,  0.886
        );
        mat3 V = mat3(
           0.168, -0.331,  0.500,
           0.328,  0.035, -0.500,
          -0.497,  0.296,  0.201
        );
        return W + U * c + V * s;
      }

      void main() {
        vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

        float z = 5.0;
        float d = 0.0;

        vec3 p;
        vec4 o = vec4(0.0);

        float centerShift = uCenterShift;
        float cf = uColorFreq;

        mat2 wob = mat2(1.0);
        if (uUseBaseWobble == 1) {
          float t = iTime * uTimeScale;
          float c0 = cos(t + 0.0);
          float c1 = cos(t + 33.0);
          float c2 = cos(t + 11.0);
          wob = mat2(c0, c1, c2, c0);
        }

        const int STEPS = 100;
        for (int i = 0; i < STEPS; i++) {
          p = vec3(f, z);
          p.xz = p.xz * wob;
          p = uRot * p;
          vec3 q = p;
          q.y += centerShift;
          d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
          z -= d;
          o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
        }

        o = tanh4(o * o * (uGlow * uBloom) / 1e5);

        vec3 col = o.rgb;
        float n = rand(gl_FragCoord.xy + vec2(iTime));
        col += (n - 0.5) * uNoise;
        col = clamp(col, 0.0, 1.0);

        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

        if (abs(uHueShift) > 0.0001) {
          col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
        }

        gl_FragColor = vec4(col, o.a);
      }
    `;

    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    this.setupGeometry();
    this.setupUniforms();
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  setupGeometry() {
    const gl = this.gl;
    
    // Create a triangle geometry
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
       0,  1
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  setupUniforms() {
    const gl = this.gl;
    const opts = this.options;
    
    this.uniforms = {
      iResolution: gl.getUniformLocation(this.program, 'iResolution'),
      iTime: gl.getUniformLocation(this.program, 'iTime'),
      uHeight: gl.getUniformLocation(this.program, 'uHeight'),
      uBaseHalf: gl.getUniformLocation(this.program, 'uBaseHalf'),
      uUseBaseWobble: gl.getUniformLocation(this.program, 'uUseBaseWobble'),
      uRot: gl.getUniformLocation(this.program, 'uRot'),
      uGlow: gl.getUniformLocation(this.program, 'uGlow'),
      uOffsetPx: gl.getUniformLocation(this.program, 'uOffsetPx'),
      uNoise: gl.getUniformLocation(this.program, 'uNoise'),
      uSaturation: gl.getUniformLocation(this.program, 'uSaturation'),
      uScale: gl.getUniformLocation(this.program, 'uScale'),
      uHueShift: gl.getUniformLocation(this.program, 'uHueShift'),
      uColorFreq: gl.getUniformLocation(this.program, 'uColorFreq'),
      uBloom: gl.getUniformLocation(this.program, 'uBloom'),
      uCenterShift: gl.getUniformLocation(this.program, 'uCenterShift'),
      uInvBaseHalf: gl.getUniformLocation(this.program, 'uInvBaseHalf'),
      uInvHeight: gl.getUniformLocation(this.program, 'uInvHeight'),
      uMinAxis: gl.getUniformLocation(this.program, 'uMinAxis'),
      uPxScale: gl.getUniformLocation(this.program, 'uPxScale'),
      uTimeScale: gl.getUniformLocation(this.program, 'uTimeScale')
    };

    // Set initial uniform values
    this.updateUniforms();
  }

  updateUniforms() {
    const gl = this.gl;
    const opts = this.options;
    const H = Math.max(0.001, opts.height);
    const BW = Math.max(0.001, opts.baseWidth);
    const BASE_HALF = BW * 0.5;
    const GLOW = Math.max(0.0, opts.glow);
    const NOISE = Math.max(0.0, opts.noise);
    const offX = opts.offset?.x ?? 0;
    const offY = opts.offset?.y ?? 0;
    const SAT = opts.transparent ? 1.5 : 1;
    const SCALE = Math.max(0.001, opts.scale);
    const HUE = opts.hueShift || 0;
    const CFREQ = Math.max(0.0, opts.colorFrequency || 1);
    const BLOOM = Math.max(0.0, opts.bloom || 1);
    const TS = Math.max(0, opts.timeScale || 1);

    gl.uniform2f(this.uniforms.iResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.uniforms.uHeight, H);
    gl.uniform1f(this.uniforms.uBaseHalf, BASE_HALF);
    gl.uniform1i(this.uniforms.uUseBaseWobble, opts.animationType === 'rotate' ? 1 : 0);
    gl.uniform1f(this.uniforms.uGlow, GLOW);
    gl.uniform2f(this.uniforms.uOffsetPx, offX, offY);
    gl.uniform1f(this.uniforms.uNoise, NOISE);
    gl.uniform1f(this.uniforms.uSaturation, SAT);
    gl.uniform1f(this.uniforms.uScale, SCALE);
    gl.uniform1f(this.uniforms.uHueShift, HUE);
    gl.uniform1f(this.uniforms.uColorFreq, CFREQ);
    gl.uniform1f(this.uniforms.uBloom, BLOOM);
    gl.uniform1f(this.uniforms.uCenterShift, H * 0.25);
    gl.uniform1f(this.uniforms.uInvBaseHalf, 1 / BASE_HALF);
    gl.uniform1f(this.uniforms.uInvHeight, 1 / H);
    gl.uniform1f(this.uniforms.uMinAxis, Math.min(BASE_HALF, H));
    gl.uniform1f(this.uniforms.uPxScale, 1 / ((gl.drawingBufferHeight || 1) * 0.1 * SCALE));
    gl.uniform1f(this.uniforms.uTimeScale, TS);
  }

  setupEventListeners() {
    if (this.options.animationType === 'hover') {
      window.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: true });
      window.addEventListener('mouseleave', this.onMouseLeave.bind(this));
      window.addEventListener('blur', this.onBlur.bind(this));
    }

    window.addEventListener('resize', this.resize.bind(this));
  }

  onPointerMove(e) {
    const ww = Math.max(1, window.innerWidth);
    const wh = Math.max(1, window.innerHeight);
    const cx = ww * 0.5;
    const cy = wh * 0.5;
    const nx = (e.clientX - cx) / (ww * 0.5);
    const ny = (e.clientY - cy) / (wh * 0.5);
    this.pointer.x = Math.max(-1, Math.min(1, nx));
    this.pointer.y = Math.max(-1, Math.min(1, ny));
    this.pointer.inside = true;
  }

  onMouseLeave() {
    this.pointer.inside = false;
  }

  onBlur() {
    this.pointer.inside = false;
  }

  resize() {
    if (!this.renderer) return;
    
    const rect = this.container.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height);
    this.updateUniforms();
  }

  setMat3FromEuler(yaw, pitch, roll, out) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const cz = Math.cos(roll), sz = Math.sin(roll);
    
    const r00 = cy * cz + sy * sx * sz;
    const r01 = -cy * sz + sy * sx * cz;
    const r02 = sy * cx;
    const r10 = cx * sz;
    const r11 = cx * cz;
    const r12 = -sx;
    const r20 = -sy * cz + cy * sx * sz;
    const r21 = sy * sz + cy * sx * cz;
    const r22 = cy * cx;

    out[0] = r00; out[1] = r10; out[2] = r20;
    out[3] = r01; out[4] = r11; out[5] = r21;
    out[6] = r02; out[7] = r12; out[8] = r22;
    return out;
  }

  startRender() {
    this.startTime = performance.now();
    this.render();
  }

  render() {
    if (!this.gl || !this.program) return;

    const gl = this.gl;
    const time = (performance.now() - this.startTime) * 0.001;
    
    gl.useProgram(this.program);
    gl.uniform1f(this.uniforms.iTime, time);

    // Update rotation based on animation type
    if (this.options.animationType === 'hover') {
      const maxPitch = 0.6 * this.options.hoverStrength;
      const maxYaw = 0.6 * this.options.hoverStrength;
      this.targetRotation.yaw = this.pointer.inside ? -this.pointer.x * maxYaw : 0;
      this.targetRotation.pitch = this.pointer.inside ? this.pointer.y * maxPitch : 0;
      
      this.rotation.yaw += (this.targetRotation.yaw - this.rotation.yaw) * this.options.inertia;
      this.rotation.pitch += (this.targetRotation.pitch - this.rotation.pitch) * this.options.inertia;
      this.rotation.roll += (0 - this.rotation.roll) * 0.1;
    } else if (this.options.animationType === '3drotate') {
      const tScaled = time * this.options.timeScale;
      this.rotation.yaw = tScaled * 0.5;
      this.rotation.pitch = Math.sin(tScaled * 0.3) * 0.6;
      this.rotation.roll = Math.sin(tScaled * 0.2) * 0.5;
    }

    // Set rotation matrix
    const rotMatrix = new Float32Array(9);
    this.setMat3FromEuler(this.rotation.yaw, this.rotation.pitch, this.rotation.roll, rotMatrix);
    gl.uniformMatrix3fv(this.uniforms.uRot, false, rotMatrix);

    // Render
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.raf = requestAnimationFrame(() => this.render());
  }

  destroy() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    
    if (this.options.animationType === 'hover') {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('mouseleave', this.onMouseLeave);
      window.removeEventListener('blur', this.onBlur);
    }
    
    window.removeEventListener('resize', this.resize);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create prism container if it doesn't exist
  if (!document.querySelector('.prism-container')) {
    const container = document.createElement('div');
    container.className = 'prism-container';
    document.body.appendChild(container);
  }

  // Initialize the prism background
  window.prismBackground = new PrismBackground({
    height: 3.5,
    baseWidth: 5.5,
    animationType: 'rotate',
    glow: 1.2,
    noise: 0.3,
    scale: 2.8,
    hueShift: 0.2,
    colorFrequency: 1.5,
    timeScale: 0.8,
    bloom: 1.1
  });
});
