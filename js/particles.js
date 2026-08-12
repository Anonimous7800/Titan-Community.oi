/* =============================================
   PARTICLE SYSTEM - Minecraft pixel particles
   ============================================= */

(function() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let particles = [];
  let animFrame;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  const COLORS = [
    'rgba(123,47,255,',
    'rgba(199,125,255,',
    'rgba(255,107,53,',
    'rgba(191,0,255,',
    'rgba(255,215,0,',
    'rgba(88,101,242,',
  ];

  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x    = Math.random() * canvas.width;
      this.y    = initial ? Math.random() * canvas.height : canvas.height + 10;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 0.6;
      this.speedY = -(Math.random() * 0.8 + 0.2);
      this.alpha  = Math.random() * 0.5 + 0.1;
      this.color  = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.pulse  = Math.random() * Math.PI * 2;
      this.isSquare = Math.random() > 0.6;
    }

    update() {
      this.x    += this.speedX;
      this.y    += this.speedY;
      this.pulse += 0.02;
      const a    = this.alpha * (0.8 + Math.sin(this.pulse) * 0.2);

      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle   = this.color + a + ')';
      if (this.isSquare) {
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
        this.reset();
      }
    }
  }

  function initParticles() {
    particles = [];
    const count = Math.min(Math.floor(canvas.width * canvas.height / 14000), 80);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => p.update());
    animFrame = requestAnimationFrame(animate);
  }

  resize();
  initParticles();
  animate();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      initParticles();
    }, 200);
  });

  // Cleanup on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrame);
    } else {
      animate();
    }
  });
})();
