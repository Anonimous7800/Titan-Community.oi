/* =============================================
   AI-DECORATOR.JS – IA que decora la página
   ocasionalmente con elementos visuales épicos
   ============================================= */

const AI_DECORATOR = {
  /* Probabilidad de decorar (0.0 - 1.0) */
  TRIGGER_CHANCE: 0.65,

  /* Tiempo mínimo entre decoraciones (ms) */
  COOLDOWN: 45000,

  /* Pool de decoraciones disponibles */
  decorations: [
    'shootingStars',
    'floatingBlocks',
    'glowPulse',
    'neonBorder',
    'pixelRain',
    'auraGlow',
    'cornerSparkle'
  ],

  /* Estado interno */
  _lastDecoration: 0,
  _active: [],

  /* ── Init ─────────────────────────────── */
  init() {
    // Primera decoración después de 4-8 segundos (cuando la página ya cargó)
    const firstDelay = 4000 + Math.random() * 4000;
    setTimeout(() => this.maybeDecorate(), firstDelay);

    // Luego cada ~30-90 segundos
    setInterval(() => this.maybeDecorate(), 30000 + Math.random() * 60000);
  },

  /* ── Decision Logic ───────────────────── */
  maybeDecorate() {
    const now = Date.now();
    if (now - this._lastDecoration < AI_DECORATOR.COOLDOWN) return;
    if (Math.random() > AI_DECORATOR.TRIGGER_CHANCE) return;

    const pick = AI_DECORATOR.decorations[
      Math.floor(Math.random() * AI_DECORATOR.decorations.length)
    ];

    AI_DECORATOR._lastDecoration = now;
    AI_DECORATOR[pick]?.();
    AI_DECORATOR.showAINotice(pick);
  },

  /* ── AI Notice Toast ─────────────────── */
  showAINotice(decoration) {
    const messages = {
      shootingStars:  '✨ La IA ha lanzado estrellas fugaces',
      floatingBlocks: '🧱 La IA ha invocado bloques flotantes',
      glowPulse:      '💜 La IA ha activado el pulso de energía',
      neonBorder:     '🌈 La IA ha iluminado los bordes',
      pixelRain:      '🌧️ La IA ha invocado lluvia de píxeles',
      auraGlow:       '⚡ La IA ha encendido el aura del servidor',
      cornerSparkle:  '🌟 La IA ha añadido destellos en las esquinas'
    };

    const el = document.createElement('div');
    el.className = 'ai-decorator-notice';
    el.innerHTML = `
      <div style="
        position:fixed; bottom:80px; left:20px; z-index:9900;
        background:rgba(10,5,30,0.92); border:1px solid rgba(123,47,255,0.5);
        border-radius:12px; padding:10px 16px;
        display:flex; align-items:center; gap:10px;
        font-size:0.8rem; color:var(--purple-glow,#c77dff);
        box-shadow:0 0 20px rgba(123,47,255,0.25);
        animation:aiNoticeIn 0.4s ease, aiNoticeOut 0.4s ease 3.6s forwards;
        max-width:260px;
      ">
        <span style="font-size:1.2rem; flex-shrink:0;">🤖</span>
        <span>${messages[decoration] || '🎨 La IA ha decorado la página'}</span>
      </div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  },

  /* ════════════════════════════════════════
     DECORACIONES
     ════════════════════════════════════════ */

  /* ── 1. Estrellas fugaces ─────────────── */
  shootingStars() {
    const count = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const star = document.createElement('div');
        const startY = Math.random() * 60;
        star.style.cssText = `
          position:fixed; top:${startY}vh; left:-6px; z-index:9800;
          width:${60 + Math.random() * 80}px; height:2px;
          background:linear-gradient(90deg, transparent, #c77dff, white, transparent);
          border-radius:999px;
          animation:shootingStar ${0.6 + Math.random() * 0.5}s ease-out forwards;
          pointer-events:none;
        `;
        document.body.appendChild(star);
        setTimeout(() => star.remove(), 1200);
      }, i * 200);
    }
  },

  /* ── 2. Bloques Minecraft flotantes ───── */
  floatingBlocks() {
    const icons = ['⬜','🟫','🟩','🟦','🟧','⬛','🟨'];
    const count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const block = document.createElement('div');
        const icon  = icons[Math.floor(Math.random() * icons.length)];
        const size  = 20 + Math.random() * 24;
        block.style.cssText = `
          position:fixed;
          left:${Math.random() * 100}vw;
          bottom:-60px; z-index:9800;
          font-size:${size}px;
          animation:floatUp ${3 + Math.random() * 3}s ease-out forwards;
          pointer-events:none;
          filter:drop-shadow(0 0 6px rgba(123,47,255,0.6));
          opacity:0.85;
        `;
        block.textContent = icon;
        document.body.appendChild(block);
        setTimeout(() => block.remove(), 6500);
      }, i * 120);
    }
  },

  /* ── 3. Pulso de energía ──────────────── */
  glowPulse() {
    const overlay = document.createElement('div');
    const colors  = ['rgba(123,47,255,0.06)','rgba(0,255,136,0.05)','rgba(255,215,0,0.05)','rgba(0,200,255,0.05)'];
    const color   = colors[Math.floor(Math.random() * colors.length)];
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9750; pointer-events:none;
      background:${color};
      animation:pulseGlow 2s ease-in-out forwards;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2200);
  },

  /* ── 4. Borde de neón ─────────────────── */
  neonBorder() {
    const colors = ['#7b2fff','#00ff88','#ffd700','#ff6b35','#0dcaf0'];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const border = document.createElement('div');
    border.style.cssText = `
      position:fixed; inset:8px; z-index:9750; pointer-events:none;
      border:2px solid ${color};
      border-radius:16px;
      box-shadow:0 0 20px ${color}88, inset 0 0 20px ${color}22;
      animation:neonBorderFade 3s ease-in-out forwards;
    `;
    document.body.appendChild(border);
    setTimeout(() => border.remove(), 3200);
  },

  /* ── 5. Lluvia de píxeles ─────────────── */
  pixelRain() {
    const colors = ['#7b2fff','#c77dff','#00ff88','#ffd700','#ff6b35'];
    const count  = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const px    = document.createElement('div');
        const size  = 4 + Math.random() * 6;
        const color = colors[Math.floor(Math.random() * colors.length)];
        px.style.cssText = `
          position:fixed;
          left:${Math.random() * 100}vw;
          top:-${size}px; z-index:9800;
          width:${size}px; height:${size}px;
          background:${color};
          border-radius:${Math.random() > 0.5 ? '50%' : '1px'};
          animation:pixelFall ${1.5 + Math.random() * 2}s linear forwards;
          pointer-events:none;
          opacity:0.8;
        `;
        document.body.appendChild(px);
        setTimeout(() => px.remove(), 4000);
      }, i * 60);
    }
  },

  /* ── 6. Aura de servidor ──────────────── */
  auraGlow() {
    /* Hace que todos los .card pulsen una vez */
    const cards = document.querySelectorAll('.card, .feature-card, .server-card');
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.style.transition = 'box-shadow 0.4s ease';
        card.style.boxShadow  = '0 0 30px rgba(123,47,255,0.45)';
        setTimeout(() => { card.style.boxShadow = ''; }, 1200);
      }, i * 80);
    });
  },

  /* ── 7. Destellos en esquinas ────────── */
  cornerSparkle() {
    const corners = [
      { top: '12px', left: '12px' },
      { top: '12px', right: '12px' },
      { bottom: '80px', left: '12px' },
      { bottom: '80px', right: '12px' }
    ];
    corners.forEach((pos, idx) => {
      setTimeout(() => {
        const sparkle = document.createElement('div');
        const posCSS  = Object.entries(pos).map(([k,v]) => `${k}:${v}`).join(';');
        sparkle.style.cssText = `
          position:fixed; ${posCSS}; z-index:9900; pointer-events:none;
          width:40px; height:40px;
          animation:cornerSparkleAnim 1.2s ease-in-out forwards;
        `;
        sparkle.innerHTML = '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="20,2 23,16 37,20 23,24 20,38 17,24 3,20 17,16" fill="#ffd700" opacity="0.9"/></svg>';
        document.body.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 1400);
      }, idx * 150);
    });
  }
};

/* ═══════════════════════════════════════
   KEYFRAMES (inyectados dinámicamente)
   ═══════════════════════════════════════ */
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shootingStar {
      0%   { transform: translateX(0) translateY(0); opacity:1; }
      100% { transform: translateX(110vw) translateY(20px); opacity:0; }
    }
    @keyframes floatUp {
      0%   { transform: translateY(0) rotate(0deg); opacity:0.85; }
      80%  { opacity:0.7; }
      100% { transform: translateY(-110vh) rotate(${Math.random() > 0.5 ? '360' : '-360'}deg); opacity:0; }
    }
    @keyframes pulseGlow {
      0%   { opacity:0; }
      40%  { opacity:1; }
      100% { opacity:0; }
    }
    @keyframes neonBorderFade {
      0%   { opacity:0; }
      20%  { opacity:1; }
      80%  { opacity:0.8; }
      100% { opacity:0; }
    }
    @keyframes pixelFall {
      0%   { transform: translateY(0) rotate(0deg); opacity:0.8; }
      100% { transform: translateY(105vh) rotate(360deg); opacity:0; }
    }
    @keyframes cornerSparkleAnim {
      0%   { transform: scale(0) rotate(0deg); opacity:0; }
      40%  { transform: scale(1.2) rotate(20deg); opacity:1; }
      70%  { transform: scale(0.95) rotate(-10deg); opacity:0.9; }
      100% { transform: scale(0) rotate(0deg); opacity:0; }
    }
    @keyframes aiNoticeIn {
      from { transform: translateX(-20px); opacity:0; }
      to   { transform: translateX(0); opacity:1; }
    }
    @keyframes aiNoticeOut {
      from { transform: translateX(0); opacity:1; }
      to   { transform: translateX(-20px); opacity:0; }
    }
  `;
  document.head.appendChild(style);
})();

/* ── Arrancar cuando el DOM esté listo ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AI_DECORATOR.init());
} else {
  AI_DECORATOR.init();
}
