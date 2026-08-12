/* =============================================
   MAIN JS – Navbar, Reveal, Counters, Toasts, Utilities
   ============================================= */

/* ── Toast Notifications ─────────────────────── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: '💜' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3600);
}

/* ── Copy to Clipboard ───────────────────────── */
function copyText(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const original = el.innerHTML;
    el.classList.add('copied');
    el.querySelector('span:first-child').textContent = '¡Copiado!';
    setTimeout(() => {
      el.classList.remove('copied');
      el.innerHTML = original;
    }, 1500);
    showToast('Copiado al portapapeles', 'success');
  }).catch(() => {
    showToast('No se pudo copiar', 'error');
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

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    const spans = toggle.querySelectorAll('span');
    const isOpen = links.classList.contains('open');
    spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
    spans[1].style.opacity   = isOpen ? '0' : '1';
    spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
  });

  // Close on link click
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
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
