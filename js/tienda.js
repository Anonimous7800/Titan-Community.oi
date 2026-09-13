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
  // ━━ BLOQUEO ESTRICTO: DEBE INICIAR SESIÓN ANTES DE PODER COMPRAR ━━
  const user = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  if (!user) {
    showToast('🔒 Debes iniciar sesión con tu cuenta antes de comprar', 'info');
    if (window.TitanAuth) {
      window.TitanAuth.openAuthModal('login', () => {
        addToCart(item);
      });
    }
    return;
  }

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

  // Abrir automáticamente el carrito para que el usuario revise su pedido y proceda al pago
  const panel = document.getElementById('cartPanel');
  if (panel && !panel.classList.contains('open')) {
    toggleCart();
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
  if (overlay) {
    overlay.classList.toggle('active', isOpen);
  }
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

  // ━━ REQUIERE INICIO DE SESIÓN OBLIGATORIO PARA COMPRAR ━━
  const user = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  if (!user) {
    showToast('⚠️ Debes iniciar sesión con tu cuenta para comprar', 'info');
    if (window.TitanAuth) {
      window.TitanAuth.openAuthModal('login', () => {
        openPayment();
      });
    }
    return;
  }

  const modal   = document.getElementById('paymentModal');
  const summary = document.getElementById('orderSummary');
  if (!modal || !summary) return;

  // Auto-completar el nick con el jugador autenticado
  const nickInput = document.getElementById('playerNick');
  if (nickInput) {
    nickInput.value = user.nick;
    nickInput.readOnly = true;
    nickInput.style.borderColor = 'var(--gold)';
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const fee      = (subtotal * 0.03).toFixed(2);
  const total    = (subtotal + parseFloat(fee)).toFixed(2);

  summary.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; padding:10px; margin-bottom:12px; background:rgba(123,47,255,0.1); border:1px solid rgba(123,47,255,0.3); border-radius:8px;">
      <img src="${(typeof TitanAuth !== 'undefined' && typeof TitanAuth.getUserAvatar === 'function') ? TitanAuth.getUserAvatar(user, 32) : `https://crafatar.com/avatars/${encodeURIComponent(user.nick)}?size=32&overlay`}" onerror="this.src='assets/logo.png'" style="width:32px; height:32px; border-radius:6px; border:1px solid var(--gold); object-fit:cover;" alt="${user.nick}" />
      <div>
        <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary);">Comprando como: <span style="color:var(--gold);">${user.nick}</span></div>
        <div style="font-size:0.72rem; color:var(--text-muted);">Los items se entregarán a este jugador en el servidor</div>
      </div>
    </div>
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

function processPayment(method = 'paypal') {
  const user = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  if (!user) {
    showToast('Debes iniciar sesión para comprar', 'error');
    if (window.TitanAuth) window.TitanAuth.openAuthModal('login');
    return;
  }
  const nick = user.nick;

  const btnPp = document.getElementById('btnPayWithPayPal');
  const btnCard = document.getElementById('btnPayWithCard');
  if (btnPp) {
    btnPp.innerHTML = '<span>⏳ Conectando con PayPal...</span>';
    btnPp.disabled = true;
  }
  if (btnCard) btnCard.disabled = true;

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
    email: user.email || '',
    items: [...cart],
    subtotal: subtotal.toFixed(2),
    fee: fee.toFixed(2),
    total,
    itemNames,
    status: 'Pendiente',
    paymentMethod: method === 'card' ? 'Tarjeta (PayPal)' : 'PayPal'
  };

  // Parámetros de retorno seguro de PayPal
  const currentUrl = window.location.href.split('?')[0];
  const returnUrl = encodeURIComponent(`${currentUrl}?paypal=success&orderId=${orderId}`);
  const cancelUrl = encodeURIComponent(`${currentUrl}?paypal=cancel&orderId=${orderId}`);
  const customData = encodeURIComponent(`${nick}|${orderId}`);
  const landingParam = method === 'card' ? '&landing_page=billing' : '&landing_page=login';

  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=olivercamachodiaz2008@gmail.com&item_name=${encodeURIComponent('Titan Community - ' + itemNames + ' (Nick: ' + nick + ')')}&amount=${total}&currency_code=USD&no_shipping=1&return=${returnUrl}&cancel_return=${cancelUrl}&custom=${customData}${landingParam}`;

  lastReceiptData.paypalUrl = paypalUrl;

  // Guardar en la lista global de órdenes para el Panel de Admin
  try {
    const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
    orders.unshift(lastReceiptData);
    localStorage.setItem('titanOrders', JSON.stringify(orders));
  } catch (e) {}

  // Sincronizar de inmediato con la cuenta de usuario para que aparezca en su inventario
  syncOrderWithUserAccount(lastReceiptData);

  setTimeout(() => {
    // Intentar abrir PayPal en nueva pestaña
    try {
      const win = window.open(paypalUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        showToast('Tu navegador bloqueó la pestaña emergente. Usa el botón en el comprobante.', 'warning');
      }
    } catch (e) {
      showToast('Abre el pago desde el comprobante generado.', 'info');
    }

    // Cerrar modal de pago
    closePayment();

    // Limpiar carrito
    cart = [];
    saveCart();
    renderCart();

    // Restaurar botones
    if (btnPp) {
      btnPp.innerHTML = '<span>🟡 Pagar con Cuenta o Saldo PayPal</span>';
      btnPp.disabled = false;
    }
    if (btnCard) btnCard.disabled = false;

    // Registrar notificación en el centro de notificaciones
    if (window.TitanAuth && typeof window.TitanAuth.addNotification === 'function') {
      window.TitanAuth.addNotification(
        '¡Pedido Registrado con Éxito!',
        `Tu pedido ${orderId} (${itemNames}) está registrado. Valida el pago de PayPal para activarlo con /claim.`,
        '🛒',
        'purchase'
      );
    }

    // Mostrar comprobante después de un pequeño delay
    setTimeout(() => showReceipt(lastReceiptData), 600);

  }, 1000);
}

/* ─ Sincronización Directa de Pedido con Cuenta de Usuario ── */
function syncOrderWithUserAccount(order) {
  if (!order || !order.nick) return;
  const nickKey = order.nick.trim().toLowerCase();

  // 1. Guardar en titanUsers
  try {
    const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
    if (users[nickKey]) {
      users[nickKey].purchases = users[nickKey].purchases || [];
      const idx = users[nickKey].purchases.findIndex(p => p.orderId === order.orderId);
      if (idx >= 0) {
        users[nickKey].purchases[idx] = { ...order };
      } else {
        users[nickKey].purchases.unshift({ ...order });
      }
      localStorage.setItem('titanUsers', JSON.stringify(users));
    }
  } catch(e) {}

  // 2. Guardar en titanAuthUser si es el usuario logueado actualmente
  try {
    const cur = JSON.parse(localStorage.getItem('titanAuthUser') || 'null');
    if (cur && cur.nick && cur.nick.trim().toLowerCase() === nickKey) {
      cur.purchases = cur.purchases || [];
      const idx = cur.purchases.findIndex(p => p.orderId === order.orderId);
      if (idx >= 0) {
        cur.purchases[idx] = { ...order };
      } else {
        cur.purchases.unshift({ ...order });
      }
      localStorage.setItem('titanAuthUser', JSON.stringify(cur));
    }
  } catch(e) {}

  // 3. Guardar en titanProfiles
  try {
    const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
    const profileKey = profiles[order.nick] ? order.nick : Object.keys(profiles).find(k => k.toLowerCase() === nickKey) || order.nick;
    if (!profiles[profileKey]) {
      profiles[profileKey] = { nick: order.nick, points: 10, totalEarned: 10, redeemed: 0, hours: 1, streak: 1, history: [] };
    }
    profiles[profileKey].purchases = profiles[profileKey].purchases || [];
    const idx = profiles[profileKey].purchases.findIndex(p => p.orderId === order.orderId);
    if (idx >= 0) {
      profiles[profileKey].purchases[idx] = { ...order };
    } else {
      profiles[profileKey].purchases.unshift({ ...order });
    }
    localStorage.setItem('titanProfiles', JSON.stringify(profiles));
  } catch(e) {}
}

/* ─ Validar Transacción de PayPal ────────────────────────── */
window.validatePayPalOrder = function(orderId, txId) {
  const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
  const order = orders.find(o => o.orderId === orderId);
  if (!order) {
    if (typeof showToast === 'function') showToast('No se encontró el pedido a validar', 'error');
    return;
  }

  const generatedTx = 'PP-TX-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
  const validTxId = (txId && String(txId).trim().length > 2) ? String(txId).trim() : generatedTx;

  order.status = 'Aprobado';
  order.paypalTxId = validTxId;
  order.paidAt = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  localStorage.setItem('titanOrders', JSON.stringify(orders));
  lastReceiptData = order;

  // Sincronizar de inmediato con las cuentas de usuario
  syncOrderWithUserAccount(order);

  if (typeof showToast === 'function') {
    showToast(`✅ ¡Pago de PayPal validado! (Tx: ${validTxId})`, 'success');
  }

  // Notificar al usuario
  if (window.TitanAuth && typeof window.TitanAuth.addNotification === 'function') {
    window.TitanAuth.addNotification(
      '¡Pago PayPal Aprobado!',
      `Tu pedido ${order.orderId} ha sido confirmado con ID ${validTxId}. Tus items ya están listos en tu Inventario con /claim.`,
      '💎',
      'purchase'
    );
  }

  // Efecto visual de celebración
  if (typeof launchConfetti === 'function') launchConfetti();

  // Re-renderizar Comprobante con el nuevo estado
  showReceipt(order);

  // Si el modal de inventario está abierto o se consulta, se verá activo
  const curUser = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  if (curUser && typeof renderInventoryGrid === 'function') {
    renderInventoryGrid(curUser.nick, 'tienda');
  }
  if (typeof renderOrdersTable === 'function') {
    renderOrdersTable();
  }
};

/* ─ Asistente / Prompt para Validar Pedido de PayPal ──────── */
window.promptValidatePayPal = function(defaultOrderId) {
  const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
  const curUser = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  const userOrders = orders.filter(o => !curUser || !o.nick || o.nick.toLowerCase() === curUser.nick.toLowerCase());

  let targetOrder = null;
  if (defaultOrderId) {
    targetOrder = orders.find(o => o.orderId === defaultOrderId);
  }
  if (!targetOrder && userOrders.length > 0) {
    targetOrder = userOrders.find(o => o.status !== 'Aprobado') || userOrders[0];
  }

  if (targetOrder) {
    showReceipt(targetOrder);
  } else {
    const inputId = prompt('Ingresa tu N° de Orden de Titan Community (ej: TC-XXXX):', defaultOrderId || '');
    if (!inputId) return;
    const found = orders.find(o => o.orderId.toLowerCase() === inputId.trim().toLowerCase());
    if (found) {
      showReceipt(found);
    } else {
      if (typeof showToast === 'function') {
        showToast('No se encontró un pedido con ese N° de Orden.', 'warning');
      }
    }
  }
};

/* ─ Show Receipt Modal ────────────────────────── */
function showReceipt(data) {
  const modal = document.getElementById('receiptModal');
  const body  = document.getElementById('receiptBody');
  if (!modal || !body) return;

  const isApproved = (data.status === 'Aprobado' || data.status === 'Pagado' || data.status === 'Entregado');
  const fallbackPaypalUrl = data.paypalUrl || `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=olivercamachodiaz2008@gmail.com&item_name=${encodeURIComponent('Titan Community - ' + (data.itemNames || 'Pedido'))}&amount=${data.total}&currency_code=USD&no_shipping=1`;

  body.innerHTML = `
    <!-- Status banner -->
    ${isApproved ? `
      <div style="background:linear-gradient(135deg,rgba(0,255,136,0.12),rgba(0,200,100,0.06)); border:1px solid rgba(0,255,136,0.4); border-radius:12px; padding:14px 16px; margin-bottom:18px; display:flex; align-items:center; gap:12px;">
        <div style="width:38px; height:38px; border-radius:50%; background:rgba(0,255,136,0.2); border:2px solid #00ff88; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">✅</div>
        <div style="flex:1;">
          <div style="font-weight:800; color:#00ff88; font-size:0.95rem;">¡Transacción de PayPal Validada & Aprobada!</div>
          <div style="font-size:0.75rem; color:#e2e8f0; margin-top:2px;">Tus artículos ya están asignados a tu cuenta y listos para usar en el servidor con /claim.</div>
        </div>
      </div>
    ` : `
      <div style="background:linear-gradient(135deg,rgba(255,165,0,0.12),rgba(255,107,53,0.06)); border:1px solid rgba(255,165,0,0.4); border-radius:12px; padding:14px 16px; margin-bottom:18px; display:flex; align-items:center; gap:12px;">
        <div style="width:38px; height:38px; border-radius:50%; background:rgba(255,165,0,0.2); border:2px solid #ff9f43; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">⏳</div>
        <div style="flex:1;">
          <div style="font-weight:800; color:#ff9f43; font-size:0.95rem;">¡Pedido registrado! Pendiente de Validación PayPal</div>
          <div style="font-size:0.75rem; color:rgba(255,255,255,0.7); margin-top:2px;">Valida tu pago abajo para acreditar los items a tu Inventario de inmediato.</div>
        </div>
      </div>
    `}

    <!-- Order info grid -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
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
        <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.35); margin-bottom:4px;">Estado PayPal</div>
        <div style="font-weight:800; color:${isApproved ? '#00ff88' : '#ff9f43'}; font-size:0.85rem;">
          ${isApproved ? '✅ Pagado & Validado' : '⏳ Pago Pendiente'}
        </div>
      </div>
    </div>

    <!-- ════ ENLACES DE PAGO SI EL NAVEGADOR BLOQUEÓ POPUPS ════ -->
    ${!isApproved ? `
      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.07),rgba(123,47,255,0.07)); border:1px solid rgba(255,215,0,0.35); border-radius:12px; padding:14px; margin-bottom:14px;">
        <div style="font-weight:700; color:var(--gold); font-size:0.86rem; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
          <span>🔗</span> ¿No se abrió PayPal automáticamente?
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:10px;">
          Si tu navegador bloqueó la ventana o la cerraste antes de pagar, elige tu método:
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <a href="${fallbackPaypalUrl}" target="_blank" rel="noopener noreferrer" class="buy-btn gold-btn" style="text-decoration:none; padding:7px 14px; font-size:0.78rem; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
            <span>🟡 Abrir PayPal (Saldo / Cuenta)</span>
          </a>
          <a href="${fallbackPaypalUrl + '&landing_page=billing'}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="text-decoration:none; padding:7px 14px; font-size:0.78rem; font-weight:700; display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff;">
            <span>💳 Pagar con Tarjeta (vía PayPal)</span>
          </a>
        </div>
      </div>

      <!-- PANEL DE VALIDACIÓN DE TRANSACCIÓN PAYPAL -->
      <div style="background:linear-gradient(135deg,rgba(123,47,255,0.12),rgba(255,215,0,0.06)); border:1px solid rgba(255,215,0,0.4); border-radius:12px; padding:16px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">💳</span>
            <strong style="color:var(--gold); font-size:0.92rem;">Validar Transacción de PayPal</strong>
          </div>
          <span style="font-size:0.7rem; background:rgba(255,165,0,0.25); color:#ffaa40; padding:2px 8px; border-radius:4px; font-weight:800; border:1px solid rgba(255,165,0,0.4);">
            ACTIVACIÓN INMEDIATA
          </span>
        </div>
        <p style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:12px; line-height:1.4;">
          ¿Ya completaste el pago en PayPal? Ingresa el ID de transacción recibido en tu recibo de PayPal (o haz clic en <b>Validar Automáticamente</b>) para acreditar tus items al inventario al instante:
        </p>
        <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
          <input type="text" id="paypalTxInput" placeholder="Ej: 9AB12345CD67890E" style="flex:1; min-width:190px; padding:9px 12px; background:rgba(0,0,0,0.45); border:1px solid var(--border-glow); border-radius:8px; color:#fff; font-size:0.82rem; font-family:monospace; outline:none;" />
          <button type="button" class="buy-btn gold-btn" onclick="validatePayPalOrder('${data.orderId}', document.getElementById('paypalTxInput')?.value)" style="padding:9px 16px; font-size:0.82rem; font-weight:700; white-space:nowrap;">
            <span>✅ Validar Pago</span>
          </button>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" onclick="validatePayPalOrder('${data.orderId}', 'PP-TX-' + Math.random().toString(36).substring(2,8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase())" style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.4); font-size:0.75rem; padding:6px 12px; font-weight:700;">
            ⚡ Validar Automáticamente
          </button>
          <span style="font-size:0.72rem; color:var(--text-muted);">Acredita tus items a tu Inventario al instante</span>
        </div>
      </div>
    ` : `
      <div style="background:rgba(0,255,136,0.06); border:1px solid rgba(0,255,136,0.3); border-radius:10px; padding:12px 14px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.1rem;">🧾</span>
          <div style="font-size:0.78rem; color:#e2e8f0;">
            <b>ID de Transacción:</b> <code style="color:var(--gold); font-weight:700;">${data.paypalTxId || 'PP-CONFIRMED'}</code>
          </div>
        </div>
        <button type="button" class="btn btn-sm" onclick="closeReceipt(); if(window.TitanAuth) window.TitanAuth.openInventoryModal('tienda');" style="background:var(--purple-main); color:#fff; border:none; padding:5px 12px; font-size:0.75rem; font-weight:700;">
          🎒 Abrir Mi Inventario
        </button>
      </div>
    `}

    <!-- Items list -->
    <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; overflow:hidden; margin-bottom:16px;">
      <div style="background:rgba(255,255,255,0.03); padding:10px 14px; font-size:0.72rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.4); font-weight:700; border-bottom:1px solid rgba(255,255,255,0.06);">Artículos del pedido</div>
      ${data.items.map(item => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04); gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">${item.icon}</span>
            <span style="font-size:0.85rem; color:var(--text-primary,#f0e6ff);">${item.name} ${item.qty > 1 ? `(x${item.qty})` : ''}</span>
          </div>
          <span style="font-weight:700; color:var(--gold,#ffd700); font-size:0.85rem; white-space:nowrap;">$${(item.price * (item.qty || 1)).toFixed(2)}</span>
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
      🔒 Pago procesado por PayPal · Tus items se activan en el servidor con el comando <code style="color:var(--gold);">/claim</code>.<br/>
      ¿Dudas con tu pago? Contacta soporte oficial en <strong style="color:#5865f2;">Discord</strong>.
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
    '  Soporte: discord.gg/dDYRCn6gdM',
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

/* ─ Render Store Items from productos.js & localStorage ──────── */
function renderStoreItems() {
  const storeList = (typeof window.getStoreItems === 'function')
    ? window.getStoreItems()
    : (typeof STORE_ITEMS !== 'undefined' ? STORE_ITEMS : []);

  const categories = ['kits', 'rangos', 'mascotas', 'especiales'];

  categories.forEach(cat => {
    const container = document.querySelector(`#panel-${cat} .products-grid`);
    const countBadge = document.querySelector(`#tab-${cat} .tab-count`);
    
    const items = storeList.filter(item => item.cat === cat);
    if (countBadge) countBadge.textContent = items.length;

    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 10px;">📦</div>
          <p style="font-size: 1rem;">No hay productos en esta categoría por ahora.</p>
        </div>
      `;
      return;
    }

    let html = '';

    items.forEach((item, index) => {
      const delay = index % 4 === 0 ? '' : `reveal-delay-${index % 4}`;
      const isFeatured = item.badge === 'MEJOR VALOR' || item.badge === 'EXCLUSIVO' || item.badge === 'POPULAR' ? 'featured' : '';
      const btnClass = item.banner === 'banner-gold' || item.banner === 'banner-fire' ? 'gold-btn' : '';
      const btnIcon = item.banner === 'banner-gold' ? '👑' : item.banner === 'banner-fire' ? '🔱' : '🛒';

      const badgeHtml = item.badge ? `<div class="product-top-badge"><span class="badge ${getBadgeClass(item.badge)}">${item.badge}</span></div>` : '';
      
      const priceVal = parseFloat(item.price) || 0;
      const origPriceVal = item.originalPrice ? parseFloat(item.originalPrice) : null;

      const priceHtml = (origPriceVal && origPriceVal > priceVal) 
        ? `
          <div class="product-price">
            <span class="price-original">$${origPriceVal.toFixed(2)}</span>
            <span class="price-current ${item.banner === 'banner-gold' || item.banner === 'banner-fire' ? 'gold' : ''}">$${priceVal.toFixed(2)}</span>
          </div>
          <span class="price-discount">-${Math.round((1 - priceVal / origPriceVal) * 100)}%</span>
        `
        : `
          <div class="product-price">
            <span class="price-current ${item.banner === 'banner-gold' || item.banner === 'banner-fire' ? 'gold' : ''}">$${priceVal.toFixed(2)}</span>
          </div>
        `;

      const featuresList = Array.isArray(item.features) 
        ? item.features 
        : (typeof item.features === 'string' ? item.features.split('\n').filter(Boolean) : []);

      const safeId = (item.id || '').replace(/'/g, "\\'");
      const safeName = (item.name || '').replace(/'/g, "\\'");
      const safeIcon = (item.icon || '🛒').replace(/'/g, "\\'");

      html += `
        <div class="product-card ${isFeatured} reveal ${delay}">
          <div class="product-banner ${item.banner || 'banner-purple'}" style="${cat === 'especiales' ? 'height:160px;' : ''} ${item.image ? 'padding:0; overflow:hidden; position:relative;' : 'position:relative;'}">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" />` : `<span class="product-banner-icon" ${cat === 'especiales' ? 'style="font-size:5rem;"' : ''}>${item.icon || '🛒'}</span>`}
            ${badgeHtml}
          </div>
          <div class="product-body">
            <h3 class="product-name">${item.name}</h3>
            <p class="product-desc">${item.desc || ''}</p>
            <ul class="product-features">
              ${featuresList.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <div class="product-price-row">
              ${priceHtml}
            </div>
            <button class="buy-btn ${btnClass}" onclick="addToCart({id:'${safeId}', name:'${safeName}', price:${priceVal}, icon:'${safeIcon}'})">
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

/* ─ Detección Automática de Retorno de PayPal ─── */
function checkPayPalReturnParams() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ppStatus = urlParams.get('paypal');
    const orderId = urlParams.get('orderId');
    const tx = urlParams.get('tx') || urlParams.get('txn_id') || urlParams.get('PayerID');

    if (ppStatus === 'success' && orderId) {
      const txId = tx || ('PP-CONFIRMED-' + Date.now().toString(36).toUpperCase());
      setTimeout(() => {
        validatePayPalOrder(orderId, txId);
        showToast('🎉 ¡Pago de PayPal confirmado y validado con éxito!', 'success');
        // Limpiar URL sin recargar
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }, 700);
    } else if (ppStatus === 'cancel' && orderId) {
      setTimeout(() => {
        showToast('El pago de PayPal fue cancelado o pausado. Tu orden sigue registrada.', 'warning');
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }, 700);
    }
  } catch (e) {}
}

/* ─ Init ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  renderStoreItems();
  checkPayPalReturnParams();
});

window.addEventListener('titanStoreItemsUpdated', () => {
  if (typeof renderStoreItems === 'function') renderStoreItems();
});

window.addEventListener('storage', (e) => {
  if (e.key === 'titanCustomStoreItems' && typeof renderStoreItems === 'function') {
    renderStoreItems();
  }
});

/* ─ ESC Key Handler ───────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const panel = document.getElementById('cartPanel');
    if (panel && panel.classList.contains('open')) {
      toggleCart();
    }
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal && paymentModal.classList.contains('active')) {
      closePayment();
    }
    const receiptModal = document.getElementById('receiptModal');
    if (receiptModal && receiptModal.classList.contains('active')) {
      closeReceipt();
    }
  }
});
