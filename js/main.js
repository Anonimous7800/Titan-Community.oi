/* =============================================
   MAIN JS – Navbar, Reveal, Counters, Toasts, Utilities
   ============================================= */

/* ── Toast Notifications ─────────────────────── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: '💜', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Remove from DOM after animation ends (3.1s delay + 0.4s animation out = 3.5s)
  setTimeout(() => {
    toast.remove();
  }, 3600);
}

/* ── Copy to Clipboard ───────────────────────── */
function copyText(text, el) {
  // Save original content before modifying
  const originalHTML = el.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    el.classList.add('copied');
    const badge = el.querySelector('span:last-child');
    if (badge) badge.textContent = '¡Copiado! ✅';
    setTimeout(() => {
      el.classList.remove('copied');
      el.innerHTML = originalHTML;
    }, 1800);
    showToast('Copiado al portapapeles', 'success');
  }).catch(() => {
    showToast('No se pudo copiar. Inténtalo manualmente.', 'error');
  });
}

/* ── Navbar scroll effect ────────────────────── */
(function() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();

/* ── Mobile nav toggle ───────────────────────── */
(function() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (!toggle || !links) return;

  function updateSpans(isOpen) {
    const spans = toggle.querySelectorAll('span');
    if (spans.length < 3) return;
    spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
    spans[1].style.opacity   = isOpen ? '0' : '1';
    spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    links.classList.toggle('open');
    updateSpans(links.classList.contains('open'));
  });

  // Close on link click
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      links.classList.remove('open');
      updateSpans(false);
    }
  });

  // Close when clicking anywhere outside
  document.addEventListener('click', (e) => {
    if (links.classList.contains('open') && !links.contains(e.target) && !toggle.contains(e.target)) {
      links.classList.remove('open');
      updateSpans(false);
    }
  });
})();

/* ── Intersection Observer for reveal ───────── */
(function() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
})();

/* ── Counter Animations ──────────────────────── */
(function() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCounter(el) {
    const target   = parseInt(el.dataset.count, 10);
    const duration = 2000;
    const start    = performance.now();

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value    = Math.round(easeOutQuart(progress) * target);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();

/* ── Active nav link highlight (ScrollSpy) ─────── */
(function() {
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  
  if (!sections.length || !navLinks.length) return;

  function onScroll() {
    let scrollPos = window.scrollY + 100; // offset for fixed navbar

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check
})();

/* ── Active page highlight (For external pages) ─ */
(function() {
  const path = window.location.pathname.split('/').pop();
  if (path && path !== 'index.html' && path !== '') {
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href === path) {
        a.classList.add('active');
      }
    });
  }
})();

/* ── Smooth scroll for anchor links ─────────── */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* ── Tab switching (Tienda) ──────────────────── */
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('panel-' + tabName);
  if (panel) panel.classList.add('active');
}

/* ── Payment tab switching ───────────────────── */
function switchPayment(method, btn) {
  document.querySelectorAll('.payment-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('method-' + method);
  if (el) el.classList.add('active');
}

/* ── Card number formatter ───────────────────── */
function formatCard(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  val = val.replace(/(.{4})/g, '$1 ').trim();
  input.value = val;
}

/* ── Hash-based tab from URL ─────────────────── */
(function() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const btn = document.getElementById('tab-' + hash);
    if (btn) { btn.click(); }
  }
})();

/* =============================================
   TITAN SERVER – Gestión de IP, Puerto y Estado del Servidor
   Permite cambiar la IP, ocultarla si no está abierto aún,
   y mostrar anuncios de que está en proceso en todo el sitio.
   ============================================= */
const DEFAULT_SERVER_CONFIG = {
  ip: 'play.titancommunity.net',
  port: '19132',
  version: 'Bedrock 1.21.x',
  status: 'online', // 'online' | 'in_progress' | 'maintenance' | 'closed'
  hideIp: false,    // si true: quita la IP y muestra el anuncio de que está en proceso
  processNotice: '🚧 El servidor se encuentra actualmente en proceso de configuración y apertura. ¡Próximamente abriremos las puertas! Únete a Discord para ser notificado de la apertura oficial.',
  showTopBarNotice: false,
  slots: 150,
  mode: 'Survival + Addons'
};

window.TitanServer = {
  getConfig() {
    try {
      const raw = localStorage.getItem('titanServerConfig');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Si había quedado en 'closed' por pruebas anteriores en localStorage, restablecer a 'online'
        if (parsed.status === 'closed' && !localStorage.getItem('titanServerExplicitlyClosed_v2')) {
          parsed.status = 'online';
          parsed.hideIp = false;
          localStorage.setItem('titanServerConfig', JSON.stringify(parsed));
        }
        // Migración: desactivar barra superior si no fue activada explícitamente por el admin
        if (parsed.showTopBarNotice === true && !localStorage.getItem('titanTopBarExplicitlyEnabled')) {
          parsed.showTopBarNotice = false;
          localStorage.setItem('titanServerConfig', JSON.stringify(parsed));
        }
        return { ...DEFAULT_SERVER_CONFIG, ...parsed };
      }
    } catch(e) {}
    return { ...DEFAULT_SERVER_CONFIG };
  },

  saveConfig(newConfig) {
    const merged = { ...DEFAULT_SERVER_CONFIG, ...newConfig };
    localStorage.setItem('titanServerConfig', JSON.stringify(merged));
    if (merged.status === 'closed') {
      localStorage.setItem('titanServerExplicitlyClosed_v2', 'true');
    } else {
      localStorage.removeItem('titanServerExplicitlyClosed_v2');
    }
    this.updateAllUI();
    return merged;
  },

  resetConfig() {
    localStorage.removeItem('titanServerConfig');
    localStorage.removeItem('titanServerExplicitlyClosed_v2');
    this.updateAllUI();
    return { ...DEFAULT_SERVER_CONFIG };
  },

  copyIp(btn) {
    const cfg = this.getConfig();
    if (cfg.status === 'closed') {
      if (typeof showToast === 'function') showToast('🔴 El servidor se encuentra cerrado temporalmente', 'warning');
      return;
    }
    if (cfg.hideIp || cfg.status !== 'online') {
      if (typeof showToast === 'function') showToast('⚠️ La IP no está disponible todavía (Servidor en proceso)', 'warning');
      return;
    }
    if (typeof copyText === 'function') {
      copyText(cfg.ip, btn || document.body);
    }
  },

  copyPort(btn) {
    const cfg = this.getConfig();
    if (cfg.status === 'closed') {
      if (typeof showToast === 'function') showToast('🔴 El servidor se encuentra cerrado temporalmente', 'warning');
      return;
    }
    if (cfg.hideIp || cfg.status !== 'online') {
      if (typeof showToast === 'function') showToast('⚠️ El puerto no está disponible todavía', 'warning');
      return;
    }
    if (typeof copyText === 'function') {
      copyText(cfg.port, btn || document.body);
    }
  },

  updateAllUI() {
    const cfg = this.getConfig();
    
    // 1. Barra de aviso superior cuando está en proceso o mantenimiento o cerrado
    this.renderServerTopNotice(cfg);

    // 2. Renderizar bloque del servidor en index.html
    this.renderIndexHeroServer(cfg);

    // 3. Renderizar bloque del servidor en servidor.html
    this.renderServidorPage(cfg);

    // 4. Actualizar textos dinámicos de IP y Puerto en cualquier otra página
    const isClosed = cfg.status === 'closed';
    const isUnderNotice = cfg.hideIp || cfg.status !== 'online';
    document.querySelectorAll('.server-dynamic-ip').forEach(el => {
      el.textContent = isClosed ? '(🔴 Servidor Cerrado Temporalmente)' : (isUnderNotice ? '(En Proceso de Apertura)' : cfg.ip);
    });
    document.querySelectorAll('.server-dynamic-port').forEach(el => {
      el.textContent = isClosed ? '(Cerrado)' : (isUnderNotice ? '(En proceso)' : cfg.port);
    });
  },

  renderServerTopNotice(cfg) {
    const existing = document.getElementById('serverProcessNoticeBar');
    const isUnderNotice = cfg.hideIp || cfg.status === 'in_progress' || cfg.status === 'maintenance' || cfg.status === 'closed';

    if (!isUnderNotice || !cfg.showTopBarNotice) {
      if (existing) existing.remove();
      return;
    }

    // Siempre remover el anterior para recrearlo con el estilo y mensaje actualizados
    if (existing) {
      existing.remove();
    }

    let label = '🚧 En Proceso de Apertura';
    let colorGradient = 'linear-gradient(90deg, #ff9f1c, #9d4edd, #00d2ff)';

    if (cfg.status === 'closed') {
      label = '🔴 Servidor Cerrado';
      colorGradient = 'linear-gradient(90deg, #d90429, #ef233c, #7b2fff)';
    } else if (cfg.status === 'maintenance') {
      label = '🔧 Mantenimiento Técnico';
      colorGradient = 'linear-gradient(90deg, #ffb703, #e71d36, #7b2fff)';
    }

    const bar = document.createElement('div');
    bar.id = 'serverProcessNoticeBar';
    bar.className = 'server-process-notice-bar';
    bar.style.cssText = `background: ${colorGradient}; color: #fff; font-weight: 700; font-size: 0.85rem; padding: 10px 16px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px; z-index: 10000; box-shadow: 0 4px 20px rgba(0,0,0,0.5); position: relative; flex-wrap: wrap;`;
    bar.innerHTML = `
      <span style="background: rgba(0,0,0,0.4); padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(255,255,255,0.2);">${label}</span>
      <span class="server-notice-text" style="flex: 1; min-width: 260px; max-width: 850px; text-align: center; line-height: 1.4;">${cfg.processNotice}</span>
      <a href="https://discord.gg/dDYRCn6gdM" target="_blank" style="background: rgba(255,255,255,0.25); color: white; padding: 5px 14px; border-radius: 6px; text-decoration: none; font-size: 0.78rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.4); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;">
        💬 Unirse a Discord
      </a>
    `;
    document.body.insertBefore(bar, document.body.firstChild);
  },

  renderIndexHeroServer(cfg) {
    const statusEl = document.getElementById('heroServerStatusRow');
    const connectBtn = document.getElementById('heroConnectBtn');
    const connBox = document.getElementById('heroServerConnectionBox');

    if (!connBox) return;

    // Estado visual (dot y texto)
    if (statusEl) {
      if (cfg.status === 'online' && !cfg.hideIp) {
        statusEl.innerHTML = `
          <span class="status-dot"></span>
          <span style="color: #00ff88; font-size: 0.85rem; font-weight: 700;">Servidor En Línea</span>
          <span class="badge badge-popular" style="font-size: 0.65rem;">${cfg.version}</span>
        `;
      } else if (cfg.status === 'closed') {
        statusEl.innerHTML = `
          <span class="status-dot" style="background: #ff3838; box-shadow: 0 0 10px #ff3838;"></span>
          <span style="color: #ff6b6b; font-size: 0.85rem; font-weight: 700;">Servidor Cerrado</span>
          <span class="badge" style="background: rgba(255,56,56,0.2); color: #ff6b6b; font-size: 0.65rem;">Temporal</span>
        `;
      } else if (cfg.status === 'maintenance') {
        statusEl.innerHTML = `
          <span class="status-dot" style="background: #ffb703; box-shadow: 0 0 10px #ffb703;"></span>
          <span style="color: #ffb703; font-size: 0.85rem; font-weight: 700;">En Mantenimiento</span>
          <span class="badge" style="background: rgba(255,183,3,0.2); color: #ffb703; font-size: 0.65rem;">Técnico</span>
        `;
      } else {
        statusEl.innerHTML = `
          <span class="status-dot" style="background: #ff9f1c; box-shadow: 0 0 10px #ff9f1c;"></span>
          <span style="color: #ff9f1c; font-size: 0.85rem; font-weight: 700;">En Proceso de Apertura</span>
          <span class="badge" style="background: rgba(255,159,28,0.2); color: #ff9f1c; font-size: 0.65rem;">Próximamente</span>
        `;
      }
    }

    // Botón de acción principal
    if (connectBtn) {
      if (cfg.hideIp || cfg.status !== 'online') {
        connectBtn.href = 'https://discord.gg/dDYRCn6gdM';
        connectBtn.target = '_blank';
        connectBtn.innerHTML = '💬 Novedades en Discord';
      } else {
        connectBtn.href = `minecraft://?addExternalServer=Titan%20Community|${encodeURIComponent(cfg.ip)}:${encodeURIComponent(cfg.port)}`;
        connectBtn.target = '_self';
        connectBtn.innerHTML = '🎮 Conectar al Juego';
      }
    }

    // Cuadro de conexión: Si la IP está oculta o no está abierto, mostrar el anuncio correspondiente
    if (cfg.hideIp || cfg.status !== 'online') {
      const isClosed = cfg.status === 'closed';
      const isMaint = cfg.status === 'maintenance';
      const headerIcon = isClosed ? '🔴' : (isMaint ? '🔧' : '🚧');
      const headerTitle = isClosed 
        ? 'Servidor Cerrado Temporalmente' 
        : (isMaint ? 'Servidor en Mantenimiento' : 'Servidor en Proceso de Apertura');
      const badgeText = isClosed
        ? '🔒 Servidor Cerrado · Atento a Discord'
        : '🔒 IP y Puerto Ocultos hasta la Apertura';
      const borderCol = isClosed ? 'rgba(255,56,56,0.4)' : (isMaint ? 'rgba(255,183,3,0.4)' : 'rgba(255,159,28,0.4)');
      const bgGrad = isClosed
        ? 'linear-gradient(135deg, rgba(255,56,56,0.12), rgba(123,47,255,0.1))'
        : (isMaint
            ? 'linear-gradient(135deg, rgba(255,183,3,0.12), rgba(123,47,255,0.1))'
            : 'linear-gradient(135deg, rgba(255,159,28,0.12), rgba(123,47,255,0.1))');
      const titleCol = isClosed ? '#ff6b6b' : '#ffb703';

      connBox.innerHTML = `
        <div style="grid-column: 1 / -1; background: ${bgGrad}; border: 1px solid ${borderCol}; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 1.5rem;">${headerIcon}</span>
            <span style="font-family: 'Cinzel', serif; font-size: 1.05rem; font-weight: 800; color: ${titleCol}; letter-spacing: 0.5px;">
              ${headerTitle}
            </span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0 0 14px; line-height: 1.5;">
            ${cfg.processNotice}
          </p>
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; background: rgba(0,0,0,0.4); padding: 6px 14px; border-radius: 20px; color: ${titleCol}; border: 1px solid ${borderCol};">
              ${badgeText}
            </span>
            <a href="https://discord.gg/dDYRCn6gdM" target="_blank" class="btn btn-discord btn-sm" style="font-size: 0.78rem; padding: 6px 14px;">
              💬 Notificarme en Discord
            </a>
          </div>
        </div>
      `;
    } else {
      // Servidor con IP pública y activa
      connBox.innerHTML = `
        <div class="server-ip-copy" onclick="TitanServer.copyIp(this)" title="Clic para copiar IP">
          <div>
            <div style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Dirección IP</div>
            <div style="font-family: monospace; font-size: 0.95rem; font-weight: 700; color: var(--purple-glow);">${cfg.ip}</div>
          </div>
          <span style="font-size: 0.78rem; background: rgba(123,47,255,0.15); border: 1px solid rgba(123,47,255,0.3); padding: 4px 8px; border-radius: 6px; color: var(--purple-glow);">📋 Copiar</span>
        </div>

        <div class="server-ip-copy" onclick="TitanServer.copyPort(this)" title="Clic para copiar Puerto">
          <div>
            <div style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Puerto Bedrock</div>
            <div style="font-family: monospace; font-size: 0.95rem; font-weight: 700; color: var(--gold);">${cfg.port}</div>
          </div>
          <span style="font-size: 0.78rem; background: rgba(255,215,0,0.12); border: 1px solid rgba(255,215,0,0.25); padding: 4px 8px; border-radius: 6px; color: var(--gold);">📋 Copiar</span>
        </div>
      `;
    }
  },

  renderServidorPage(cfg) {
    const statusEl = document.getElementById('servidorPageStatusRow');
    const connBox = document.getElementById('servidorPageConnectionBox');
    const actionBtn = document.getElementById('servidorPageConnectBtn');

    if (!connBox) return;

    // Status row
    if (statusEl) {
      if (cfg.status === 'online' && !cfg.hideIp) {
        statusEl.innerHTML = `
          <span class="status-dot"></span>
          <span style="color:#00ff88; font-weight:700;">En línea · ${cfg.version}</span>
        `;
      } else if (cfg.status === 'closed') {
        statusEl.innerHTML = `
          <span class="status-dot" style="background:#ff3838; box-shadow:0 0 10px #ff3838;"></span>
          <span style="color:#ff6b6b; font-weight:700;">Servidor Cerrado · Temporal</span>
        `;
      } else if (cfg.status === 'maintenance') {
        statusEl.innerHTML = `
          <span class="status-dot" style="background:#ffb703; box-shadow:0 0 10px #ffb703;"></span>
          <span style="color:#ffb703; font-weight:700;">En Mantenimiento · Técnico</span>
        `;
      } else {
        statusEl.innerHTML = `
          <span class="status-dot" style="background:#ff9f1c; box-shadow:0 0 10px #ff9f1c;"></span>
          <span style="color:#ff9f1c; font-weight:700;">En Proceso de Apertura · Próximamente</span>
        `;
      }
    }

    // Connection Box
    if (cfg.hideIp || cfg.status !== 'online') {
      const isClosed = cfg.status === 'closed';
      const isMaint = cfg.status === 'maintenance';
      const headerIcon = isClosed ? '🔴' : (isMaint ? '🔧' : '🚧');
      const headerTitle = isClosed 
        ? 'Servidor Cerrado Temporalmente' 
        : (isMaint ? 'Servidor en Mantenimiento' : 'Servidor en Proceso de Apertura');
      const badgeText = isClosed
        ? '🔒 El servidor abrirá próximamente · Atento a Discord'
        : '🔒 La IP y el Puerto se revelarán cuando el servidor abra sus puertas';
      const borderCol = isClosed ? 'rgba(255,56,56,0.4)' : (isMaint ? 'rgba(255,183,3,0.4)' : 'rgba(255,159,28,0.4)');
      const bgGrad = isClosed
        ? 'linear-gradient(135deg, rgba(255,56,56,0.12), rgba(123,47,255,0.08))'
        : (isMaint
            ? 'linear-gradient(135deg, rgba(255,183,3,0.12), rgba(123,47,255,0.08))'
            : 'linear-gradient(135deg, rgba(255,159,28,0.1), rgba(123,47,255,0.08))');
      const titleCol = isClosed ? '#ff6b6b' : '#ffb703';

      connBox.innerHTML = `
        <div style="padding: 24px; background: ${bgGrad}; border-radius: 14px; border: 1px solid ${borderCol}; margin: 20px 0; text-align: center;">
          <div style="font-size: 2.4rem; margin-bottom: 10px;">${headerIcon}</div>
          <h4 style="font-family:'Cinzel',serif; color:${titleCol}; font-size:1.15rem; margin:0 0 8px;">
            ${headerTitle}
          </h4>
          <p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.5; margin:0 0 16px;">
            ${cfg.processNotice}
          </p>
          <div style="display:inline-block; font-size:0.8rem; background:rgba(0,0,0,0.5); padding:6px 16px; border-radius:30px; color:${titleCol}; border: 1px solid ${borderCol};">
            ${badgeText}
          </div>
        </div>
      `;

      if (actionBtn) {
        actionBtn.href = 'https://discord.gg/dDYRCn6gdM';
        actionBtn.target = '_blank';
        actionBtn.className = 'btn btn-discord w-full';
        actionBtn.style.justifyContent = 'center';
        actionBtn.innerHTML = '💬 Unirme a Discord para Novedades';
      }
    } else {
      // IP pública y disponible
      connBox.innerHTML = `
        <div style="padding: 20px; background: rgba(8,8,15,0.6); border-radius: 14px; border: 1px solid var(--border-glow); margin: 20px 0; display: flex; flex-direction: column; gap: 12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:10px 14px; cursor:pointer;" onclick="TitanServer.copyIp(this)" title="Clic para copiar IP">
            <div>
              <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">IP / Dirección</div>
              <div style="font-family:monospace; font-weight:800; font-size:1rem; color:var(--purple-glow);">${cfg.ip}</div>
            </div>
            <span style="font-size:0.75rem; background:rgba(123,47,255,0.2); color:var(--purple-glow); border:1px solid rgba(123,47,255,0.4); padding:4px 10px; border-radius:6px;">📋 Copiar</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:10px 14px; cursor:pointer;" onclick="TitanServer.copyPort(this)" title="Clic para copiar Puerto">
            <div>
              <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">Puerto Bedrock</div>
              <div style="font-family:monospace; font-weight:800; font-size:1rem; color:var(--gold);">${cfg.port}</div>
            </div>
            <span style="font-size:0.75rem; background:rgba(255,215,0,0.15); color:var(--gold); border:1px solid rgba(255,215,0,0.3); padding:4px 10px; border-radius:6px;">📋 Copiar</span>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); padding:4px 4px 0;">
            <span>Capacidad: <strong style="color:var(--text-primary);">${cfg.slots} Slots</strong></span>
            <span>Modo: <strong style="color:var(--text-primary);">${cfg.mode}</strong></span>
          </div>
        </div>
      `;

      if (actionBtn) {
        actionBtn.href = `minecraft://?addExternalServer=Titan%20Community|${encodeURIComponent(cfg.ip)}:${encodeURIComponent(cfg.port)}`;
        actionBtn.target = '_self';
        actionBtn.className = 'btn btn-primary w-full';
        actionBtn.style.justifyContent = 'center';
        actionBtn.innerHTML = '🎮 Conectar a Minecraft Bedrock';
      }
    }
  }
};

// Auto-inicialización global
document.addEventListener('DOMContentLoaded', () => {
  if (window.TitanServer) {
    window.TitanServer.updateAllUI();
  }
});

