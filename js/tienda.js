/* =============================================
   TIENDA.JS – Cart, Payment Modal logic
   ============================================= */

/* ─ Cart State ────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem('titanCart') || '[]');

/* ─ Save Cart ─────────────────────────────────── */
function saveCart() {
  localStorage.setItem('titanCart', JSON.stringify(cart));
}

/* ─ Add to Cart ───────────────────────────────── */
function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    showToast('Este item ya está en tu carrito', 'info');
  } else {
    cart.push({ ...item, qty: 1 });
    saveCart();
    renderCart();
    showToast(`✅ ${item.name} agregado al carrito`, 'success');
    animateCartBtn();
  }
}

/* ─ Remove from Cart ──────────────────────────── */
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

/* ─ Toggle Cart Panel ─────────────────────────── */
function toggleCart() {
  const panel   = document.getElementById('cartPanel');
  const overlay = document.getElementById('cartOverlay');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  overlay?.classList.toggle('active', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

/* ─ Animate Cart Button ───────────────────────── */
function animateCartBtn() {
  const btn = document.getElementById('cartBtn');
  if (!btn) return;
  btn.style.transform = 'scale(1.3)';
  setTimeout(() => { btn.style.transform = ''; }, 300);
}

/* ─ Render Cart ───────────────────────────────── */
function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const badgeEl = document.getElementById('cartBadge');
  const totalEl = document.getElementById('cartTotal');

  if (!itemsEl) return;

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  /* Badge */
  if (badgeEl) {
    const count = cart.length;
    badgeEl.textContent = count;
    badgeEl.style.display = count > 0 ? 'flex' : 'none';
  }

  /* Total */
  if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

  /* Items */
  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🛒</span>
        <span>Tu carrito está vacío</span>
      </div>
    `;
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-icon">${item.icon}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Eliminar">✕</button>
    </div>
  `).join('');
}

/* ─ Open Payment Modal ────────────────────────── */
function openPayment() {
  if (cart.length === 0) {
    showToast('Tu carrito está vacío', 'error');
    return;
  }

  const modal   = document.getElementById('paymentModal');
  const summary = document.getElementById('orderSummary');
  if (!modal || !summary) return;

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const fee      = (subtotal * 0.03).toFixed(2);
  const total    = (subtotal + parseFloat(fee)).toFixed(2);

  summary.innerHTML = `
    <div class="order-summary-row">
      <span>Items (${cart.length})</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    ${cart.map(i => `
      <div class="order-summary-row" style="font-size:0.8rem; color:var(--text-muted);">
        <span>${i.icon} ${i.name}</span>
        <span>$${i.price.toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="order-summary-row">
      <span>Comisión de servicio</span>
      <span>$${fee}</span>
    </div>
    <div class="order-summary-row">
      <span>Total</span>
      <span style="color:var(--gold);">$${total}</span>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Close cart panel
  document.getElementById('cartPanel')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('active');
}

/* ─ Close Payment ─────────────────────────────── */
function closePayment() {
  const modal = document.getElementById('paymentModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

/* ─ Process Payment ───────────────────────────── */
let lastReceiptData = null;

function processPayment() {
  const nick  = document.getElementById('playerNick')?.value.trim();
  if (!nick) {
    showToast('Ingresa tu nick de Minecraft', 'error');
    return;
  }

  const btn = document.querySelector('#paymentModal .buy-btn');
  if (btn) {
    btn.innerHTML = '<span>⏳ Procesando pedido...</span>';
    btn.disabled = true;
  }

  const subtotal  = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const fee       = (subtotal * 0.03);
  const total     = (subtotal + fee).toFixed(2);
  const itemNames = cart.map(i => `${i.name} (x${i.qty})`).join(', ');
  const orderId   = 'TC-' + Date.now().toString(36).toUpperCase();
  const orderDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  // Guardar datos del recibo
  lastReceiptData = {
    orderId,
    orderDate,
    nick,
    items: [...cart],
    subtotal: subtotal.toFixed(2),
    fee: fee.toFixed(2),
    total,
    itemNames
  };

  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=olivercamachodiaz2008@gmail.com&item_name=${encodeURIComponent('Titan Community - ' + itemNames + ' (Nick: ' + nick + ')')}&amount=${total}&currency_code=USD&no_shipping=1`;

  setTimeout(() => {
    // Redirigir a PayPal
    window.open(paypalUrl, '_blank');

    // Cerrar modal de pago
    closePayment();

    // Limpiar carrito
    cart = [];
    saveCart();
    renderCart();

    // Restaurar botón
    if (btn) {
      btn.innerHTML = '<span>Ir a Pagar con PayPal</span>';
      btn.disabled = false;
    }

    launchConfetti();

    // Mostrar comprobante después de un pequeño delay
    setTimeout(() => showReceipt(lastReceiptData), 800);

  }, 1400);
}

/* ─ Show Receipt Modal ────────────────────────── */
function showReceipt(data) {
  const modal = document.getElementById('receiptModal');
  const body  = document.getElementById('receiptBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <!-- Status banner -->
    <div style="background:linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,200,100,0.04)); border:1px solid rgba(0,255,136,0.25); border-radius:10px; padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
      <div style="width:36px; height:36px; border-radius:50%; background:rgba(0,255,136,0.15); border:2px solid rgba(0,255,136,0.4); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0;">✅</div>
      <div>
        <div style="font-weight:700; color:#00ff88; font-size:0.9rem;">¡Pedido registrado correctamente!</div>
        <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); margin-top:2px;">Completa el pago en PayPal para activar los items en el servidor.</div>
      </div>
    </div>

    <!-- Order info grid -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
        <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.35); margin-bottom:4px;">N° de Orden</div>
        <div style="font-weight:700; color:var(--gold,#ffd700); font-size:0.9rem; font-family:monospace;">${data.orderId}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
        <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.35); margin-bottom:4px;">Fecha</div>
        <div style="font-weight:600; color:var(--text-primary,#f0e6ff); font-size:0.78rem;">${data.orderDate}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
        <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.35); margin-bottom:4px;">Nick de Minecraft</div>
        <div style="font-weight:700; color:var(--purple-glow,#c77dff); font-size:0.9rem;">🎮 ${data.nick}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
        <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.35); margin-bottom:4px;">Estado</div>
        <div style="font-weight:700; color:#ff9f43; font-size:0.82rem;">⏳ Pago Pendiente</div>
      </div>
    </div>

    <!-- Items list -->
    <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; overflow:hidden; margin-bottom:16px;">
      <div style="background:rgba(255,255,255,0.03); padding:10px 14px; font-size:0.72rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.4); font-weight:700; border-bottom:1px solid rgba(255,255,255,0.06);">Artículos del pedido</div>
      ${data.items.map(item => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04); gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">${item.icon}</span>
            <span style="font-size:0.85rem; color:var(--text-primary,#f0e6ff);">${item.name}</span>
          </div>
          <span style="font-weight:700; color:var(--gold,#ffd700); font-size:0.85rem; white-space:nowrap;">$${item.price.toFixed(2)}</span>
        </div>
      `).join('')}
      <div style="display:flex; justify-content:space-between; padding:10px 14px; font-size:0.8rem; color:rgba(255,255,255,0.4);">
        <span>Subtotal</span><span>$${data.subtotal}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:10px 14px; font-size:0.8rem; color:rgba(255,255,255,0.4); border-top:1px solid rgba(255,255,255,0.04);">
        <span>Comisión (3%)</span><span>$${data.fee}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:12px 14px; border-top:2px solid rgba(255,215,0,0.2); font-weight:800;">
        <span style="color:var(--gold,#ffd700);">TOTAL USD</span>
        <span style="color:var(--gold,#ffd700); font-size:1.05rem;">$${data.total}</span>
      </div>
    </div>

    <!-- Note -->
    <div style="font-size:0.73rem; color:rgba(255,255,255,0.35); text-align:center; line-height:1.5;">
      🔒 Pago procesado por PayPal · Tu item será activado en el servidor dentro de las próximas <strong style="color:rgba(255,255,255,0.5);">24 horas</strong> hábiles tras confirmar tu pago.<br/>
      ¿Dudas? Contacta soporte en <strong style="color:#5865f2;">Discord</strong>.
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ─ Close Receipt ─────────────────────────────── */
function closeReceipt() {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

/* ─ Download Receipt as text file ─────────────── */
function downloadReceipt() {
  if (!lastReceiptData) return;
  const d = lastReceiptData;
  const separator = '═'.repeat(48);

  const lines = [
    separator,
    '       TITAN COMMUNITY - COMPROBANTE DE COMPRA',
    separator,
    '',
    `  N° de Orden  : ${d.orderId}`,
    `  Fecha        : ${d.orderDate}`,
    `  Nick MC      : ${d.nick}`,
    `  Estado       : Pago Pendiente (abierto en PayPal)`,
    '',
    '─'.repeat(48),
    '  ARTÍCULOS',
    '─'.repeat(48),
    ...d.items.map(i => `  ${i.icon} ${i.name.padEnd(28)} $${i.price.toFixed(2)}`),
    '',
    `  ${'Subtotal'.padEnd(30)} $${d.subtotal}`,
    `  ${'Comisión (3%)'.padEnd(30)} $${d.fee}`,
    '─'.repeat(48),
    `  ${'TOTAL USD'.padEnd(30)} $${d.total}`,
    separator,
    '',
    '  Tu item será activado en el servidor en las próximas',
    '  24 horas hábiles tras confirmar el pago en PayPal.',
    '  Soporte: discord.gg/titan-community',
    '',
    separator,
    '          © Titan Community - No afiliado con Mojang',
    separator
  ];

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Comprobante_TitanCommunity_${d.orderId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📄 Comprobante descargado correctamente', 'success');
}


/* ─ Confetti ──────────────────────────────────── */
function launchConfetti() {
  const colors = ['#7b2fff','#ff6b35','#ffd700','#c77dff','#00ff88','#ff3d00'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-particle';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: 0;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 2 + 2}s;
        animation-delay: ${Math.random() * 0.5}s;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 30);
  }
}

/* ─ Close modal on overlay click ─────────────── */
document.addEventListener('click', (e) => {
  if (e.target.id === 'paymentModal') closePayment();
});

/* ─ Escape key ────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePayment();
    const panel = document.getElementById('cartPanel');
    if (panel?.classList.contains('open')) toggleCart();
  }
});

/* ─ Render Store Items from productos.js ──────── */
function renderStoreItems() {
  if (typeof STORE_ITEMS === 'undefined') return;

  const categories = ['kits', 'rangos', 'mascotas', 'especiales'];

  categories.forEach(cat => {
    const container = document.querySelector(`#panel-${cat} .products-grid`);
    if (!container) return;

    const items = STORE_ITEMS.filter(item => item.cat === cat);
    let html = '';

    items.forEach((item, index) => {
      const delay = index % 4 === 0 ? '' : `reveal-delay-${index % 4}`;
      const isFeatured = item.badge === 'MEJOR VALOR' || item.badge === 'EXCLUSIVO' || item.badge === 'POPULAR' ? 'featured' : '';
      const btnClass = item.banner === 'banner-gold' || item.banner === 'banner-fire' ? 'gold-btn' : '';
      const btnIcon = item.banner === 'banner-gold' ? '👑' : item.banner === 'banner-fire' ? '🔱' : '🛒';

      const badgeHtml = item.badge ? `<div class="product-top-badge"><span class="badge ${getBadgeClass(item.badge)}">${item.badge}</span></div>` : '';
      
      const priceHtml = item.originalPrice 
        ? `
          <div class="product-price">
            <span class="price-original">$${item.originalPrice.toFixed(2)}</span>
            <span class="price-current ${item.banner === 'banner-gold' || item.banner === 'banner-fire' ? 'gold' : ''}">$${item.price.toFixed(2)}</span>
          </div>
          <span class="price-discount">-${Math.round((1 - item.price / item.originalPrice) * 100)}%</span>
        `
        : `
          <div class="product-price">
            <span class="price-current ${item.banner === 'banner-gold' || item.banner === 'banner-fire' ? 'gold' : ''}">$${item.price.toFixed(2)}</span>
          </div>
        `;

      html += `
        <div class="product-card ${isFeatured} reveal ${delay}">
          <div class="product-banner ${item.banner}" ${cat === 'especiales' ? 'style="height:160px;"' : ''}>
            <span class="product-banner-icon" ${cat === 'especiales' ? 'style="font-size:5rem;"' : ''}>${item.icon}</span>
            ${badgeHtml}
          </div>
          <div class="product-body">
            <h3 class="product-name">${item.name}</h3>
            <p class="product-desc">${item.desc}</p>
            <ul class="product-features">
              ${item.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <div class="product-price-row">
              ${priceHtml}
            </div>
            <button class="buy-btn ${btnClass}" onclick="addToCart({id:'${item.id}', name:'${item.name}', price:${item.price}, icon:'${item.icon}'})">
              ${btnIcon} Comprar
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  });

  // Re-trigger reveal animations for new content
  setTimeout(() => {
    document.querySelectorAll('.product-card.reveal').forEach(el => {
      el.classList.add('visible');
    });
  }, 100);
}

function getBadgeClass(badgeName) {
  switch(badgeName) {
    case 'HOT': return 'badge-hot';
    case 'POPULAR': return 'badge-popular';
    case 'NUEVO': return 'badge-new';
    case 'EXCLUSIVO': return 'badge-exclusive';
    case 'RARO': return 'badge-exclusive';
    case 'MEJOR VALOR': return 'badge-popular';
    default: return 'badge-new';
  }
}

/* ─ Init ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  renderStoreItems();
});
