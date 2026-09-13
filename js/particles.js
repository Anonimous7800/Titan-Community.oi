/* =============================================
   PARTICLE SYSTEM - Celestial Minecraft Stars & Stardust
   Titan Community - Ultra-smooth, Anti-Glitch & Zoom Adaptive
   ============================================= */

(function() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // State guards to prevent duplicate loops or memory leaks
  let isRunning = false;
  let animFrameId = null;
  let lastTime = 0;
  let particles = [];
  let width = 0;
  let height = 0;
  let dpr = 1;

  // Mouse interaction
  const mouse = { x: -9999, y: -9999, active: false };

  // Harmonious theme palette (Celestial Purple, Neon Violet, Fire Gold, Cyan Frost, Astral White)
  const PALETTE = [
    { r: 199, g: 125, b: 255 }, // purple-glow
    { r: 168, g: 85,  b: 247 }, // purple-light
    { r: 123, g: 47,  b: 255 }, // purple-main
    { r: 255, g: 215, b: 0   }, // gold
    { r: 255, g: 107, b: 53  }, // fire-orange
    { r: 147, g: 197, b: 253 }, // diamond cyan
    { r: 255, g: 255, b: 255 }  // pure astral white
  ];

  /* ── Particle Model ───────────────────────── */
  class StarParticle {
    constructor() {
      this.init(true);
    }

    init(randomY = false) {
      this.x = Math.random() * (width || window.innerWidth);
      this.y = randomY
        ? Math.random() * (height || window.innerHeight)
        : (height || window.innerHeight) + Math.random() * 20;

      // Size & shape: 0 = 4-point sparkle star, 1 = minecraft pixel square, 2 = soft round orb
      const shapeRoll = Math.random();
      if (shapeRoll < 0.35) {
        this.type = 'sparkle';
        this.size = Math.random() * 3.5 + 2.5; // Sparkle star
      } else if (shapeRoll < 0.70) {
        this.type = 'pixel';
        this.size = Math.random() * 2.5 + 1.2; // Square pixel dust
      } else {
        this.type = 'orb';
        this.size = Math.random() * 2.2 + 1.0; // Soft round star
      }

      // Smooth floating velocities
      this.baseSpeedY = -(Math.random() * 0.45 + 0.15); // gentle upwards float
      this.speedY = this.baseSpeedY;
      this.speedX = (Math.random() - 0.5) * 0.25;

      // Gentle swaying
      this.swayPhase = Math.random() * Math.PI * 2;
      this.swaySpeed = Math.random() * 0.015 + 0.005;
      this.swayAmp   = Math.random() * 0.35 + 0.1;

      // Twinkling shimmer
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.twinkleSpeed = Math.random() * 0.03 + 0.015;
      this.baseAlpha    = Math.random() * 0.55 + 0.25;

      // Color selection
      const col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      this.r = col.r;
      this.g = col.g;
      this.b = col.b;
    }

    update(dt) {
      // Apply sway and velocity with frame-independent delta time
      this.swayPhase += this.swaySpeed * dt;
      this.x += (this.speedX + Math.sin(this.swayPhase) * this.swayAmp) * dt;
      this.y += this.speedY * dt;

      // Advance twinkle cycle
      this.twinklePhase += this.twinkleSpeed * dt;

      // Subtle mouse repulsion for interactive magic
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const maxDist = 90;
        if (distSq < maxDist * maxDist && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / maxDist) * 1.2;
          this.x += (dx / dist) * force * dt;
          this.y += (dy / dist) * force * dt;
        }
      }

      // Smooth wrapping without popping
      if (this.y < -20) {
        this.init(false);
      } else if (this.x < -20) {
        this.x = width + 10;
      } else if (this.x > width + 20) {
        this.x = -10;
      }
    }

    draw() {
      // Calculate current twinkling alpha
      const shimmer = 0.5 + 0.5 * Math.sin(this.twinklePhase);
      const alpha = Math.max(0.08, Math.min(1.0, this.baseAlpha * (0.5 + 0.5 * shimmer)));
      const s = this.size;
      const x = this.x;
      const y = this.y;

      ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b}, ${alpha.toFixed(3)})`;

      if (this.type === 'sparkle') {
        // 4-point celestial diamond sparkle star
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.quadraticCurveTo(x, y, x + s, y);
        ctx.quadraticCurveTo(x, y, x, y + s);
        ctx.quadraticCurveTo(x, y, x - s, y);
        ctx.quadraticCurveTo(x, y, x, y - s);
        ctx.closePath();
        ctx.fill();

        // Subtle glowing center dot for prominent sparkle stars
        if (s > 3.0 && alpha > 0.4) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(3)})`;
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      } else if (this.type === 'pixel') {
        // Minecraft cubic stardust
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else {
        // Soft glowing orb
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ── Canvas Sizing & High-DPI Zoom Adapter ── */
  function updateCanvasDimensions() {
    const oldW = width;
    const oldH = height;

    width = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    height = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);

    // Limit DPR to 2 to ensure high-performance rendering on retina/4K/zoom
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Set physical backing buffer
    canvas.width  = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    // Match CSS display size exactly
    canvas.style.width  = width + 'px';
    canvas.style.height = height + 'px';

    // Scale canvas context to CSS coordinates
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Smoothly reposition existing particles instead of wiping them out
    if (oldW > 0 && oldH > 0 && particles.length > 0) {
      const scaleX = width / oldW;
      const scaleY = height / oldH;
      particles.forEach(p => {
        p.x *= scaleX;
        p.y *= scaleY;
      });
    }
  }

  /* ── Particle Population ──────────────────── */
  function adjustParticleCount() {
    // Optimal density: 1 particle per ~18,000 px², clamped between 35 and 80
    const idealCount = Math.min(Math.max(Math.floor((width * height) / 18000), 35), 80);

    while (particles.length < idealCount) {
      particles.push(new StarParticle());
    }
    if (particles.length > idealCount) {
      particles.length = idealCount;
    }
  }

  /* ── Animation Loop (Guarded against duplication) ── */
  function frameLoop(timestamp) {
    if (!isRunning) return;

    // Immediately schedule next frame
    animFrameId = requestAnimationFrame(frameLoop);

    // Calculate delta time normalized to 60 FPS (16.667ms per frame)
    if (!lastTime) lastTime = timestamp;
    const elapsed = timestamp - lastTime;
    lastTime = timestamp;

    // Guard against huge delta leaps (e.g. after tab suspend or lag spike)
    const dt = Math.min(elapsed / 16.667, 2.5);

    // Clear canvas cleanly
    ctx.clearRect(0, 0, width, height);

    // Update & draw all stars
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      particles[i].update(dt);
      particles[i].draw();
    }
  }

  /* ── Safe Start / Stop Controls ───────────── */
  function startAnimation() {
    if (isRunning) return;
    isRunning = true;
    lastTime = performance.now();
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    animFrameId = requestAnimationFrame(frameLoop);
  }

  function stopAnimation() {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  /* ── Initialization ───────────────────────── */
  updateCanvasDimensions();
  adjustParticleCount();
  startAnimation();

  /* ── Event Handlers: Resize, Zoom & Orientation ── */
  let resizeDebounce;
  function handleResize() {
    updateCanvasDimensions();
    adjustParticleCount();
  }

  window.addEventListener('resize', () => {
    // Immediate update for responsive feel, plus debounced settlement
    handleResize();
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(handleResize, 150);
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 200);
  }, { passive: true });

  /* ── Visibility & Tab Focus Protection ────── */
  // Strictly prevent multiple concurrent loops when switching tabs
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  window.addEventListener('blur', () => {
    mouse.active = false;
  });

  window.addEventListener('pagehide', stopAnimation);
  window.addEventListener('pageshow', startAnimation);

  /* ── Subtle Mouse Movement ────────────────── */
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }, { passive: true });

})();
