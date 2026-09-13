/* =============================================
   ADMIN.JS – Panel de Control y Gestión de Titan Community
   Métricas en vivo, gestor de usuarios, asignación de puntos,
   pedidos de la tienda y anuncios globales.
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  initAdminPanel();
});

function initAdminPanel() {
  const isAuthAdmin = checkAdminAccess();
  if (!isAuthAdmin) {
    showAdminGate();
  } else {
    showAdminDashboard();
    renderMetrics();
    renderUsersTable();
    renderServerConfigForm();
    renderStoreProductsTable();
    renderRedeemProductsTable();
    renderOrdersTable();
    renderRedeemOrdersTable();
    renderAnnouncementStatus();
  }
}

/* ─ Verificación de Acceso de Administrador ─── */
function checkAdminAccess() {
  if (typeof TitanAuth !== 'undefined' && TitanAuth.isAdmin()) {
    return true;
  }
  return sessionStorage.getItem('titanAdminSession') === 'true';
}

function unlockWithMasterKey() {
  const key = document.getElementById('adminMasterKeyInput')?.value.trim();
  if (key === 'titan2026' || key === 'admin123') {
    sessionStorage.setItem('titanAdminSession', 'true');
    // Promover usuario actual si existe
    const u = TitanAuth.getCurrentUser();
    if (u) {
      u.role = 'admin';
      TitanAuth.setCurrentUser(u);
    }
    showToast('⚡ Acceso concedido al Panel de Administración', 'success');
    showAdminDashboard();
    renderMetrics();
    renderUsersTable();
    renderServerConfigForm();
    renderStoreProductsTable();
    renderRedeemProductsTable();
    renderOrdersTable();
    renderRedeemOrdersTable();
    renderAnnouncementStatus();
  } else {
    showToast('Clave de administrador incorrecta', 'error');
  }
}

/* ─ Alternar Vistas: Puerta de Entrada / Panel ─ */
function showAdminGate() {
  const gate = document.getElementById('adminGate');
  const dash = document.getElementById('adminDashboard');
  if (gate) gate.style.display = 'block';
  if (dash) dash.style.display = 'none';
}

function showAdminDashboard() {
  const gate = document.getElementById('adminGate');
  const dash = document.getElementById('adminDashboard');
  if (gate) gate.style.display = 'none';
  if (dash) dash.style.display = 'block';
}

/* ─ Métricas ─────────────────────────────────── */
function renderMetrics() {
  const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
  const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
  const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');

  const totalUsers = Object.keys(users).length;
  let totalPoints = 0;
  Object.values(profiles).forEach(p => {
    if (typeof p.points === 'number') totalPoints += p.points;
  });

  const totalOrders = orders.length;
  let totalRevenue = 0;
  orders.forEach(o => {
    const val = parseFloat(o.total || 0);
    if (!isNaN(val)) totalRevenue += val;
  });

  const storeItems = (typeof window.getStoreItems === 'function') ? window.getStoreItems() : [];
  const redeemItems = (typeof window.getRedeemItems === 'function') ? window.getRedeemItems() : [];

  document.getElementById('metricUsers').textContent = totalUsers.toLocaleString();
  document.getElementById('metricPoints').textContent = totalPoints.toLocaleString() + ' ⭐';
  document.getElementById('metricOrders').textContent = totalOrders.toLocaleString();
  document.getElementById('metricRevenue').textContent = '$' + totalRevenue.toFixed(2);
  
  const metricProdEl = document.getElementById('metricProducts');
  if (metricProdEl) metricProdEl.textContent = storeItems.length.toLocaleString();

  const metricRedeemEl = document.getElementById('metricRedeemItems');
  if (metricRedeemEl) metricRedeemEl.textContent = redeemItems.length.toLocaleString();
}

/* ─ Tabla de Usuarios / Jugadores ────────────── */
let userFilterQuery = '';

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
  const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');

  const list = Object.values(users).filter(u => {
    if (!userFilterQuery) return true;
    return u.nick.toLowerCase().includes(userFilterQuery.toLowerCase()) || 
           (u.email && u.email.toLowerCase().includes(userFilterQuery.toLowerCase()));
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron jugadores registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    const prof = profiles[u.nick] || { points: 0, rank: 'Sin Rango' };
    const points = prof.points || 0;
    const isAdmin = u.role === 'admin' || u.nick.toLowerCase() === 'admin';

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:12px 14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="https://crafatar.com/avatars/${encodeURIComponent(u.nick)}?size=32&overlay" onerror="this.src='assets/logo.png'" style="width:32px; height:32px; border-radius:6px; border:1px solid var(--border-glow);" />
            <div>
              <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${u.nick}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${u.email || 'Sin correo'}</div>
            </div>
          </div>
        </td>
        <td style="padding:12px 14px;">
          <span style="font-family:'Cinzel',serif; font-weight:800; color:var(--gold); font-size:1rem;">⭐ ${points.toLocaleString()}</span>
        </td>
        <td style="padding:12px 14px;">
          ${isAdmin 
            ? '<span class="badge" style="background:var(--gold); color:#1a0a00; font-weight:800;">ADMIN</span>' 
            : '<span class="badge" style="background:rgba(123,47,255,0.2); color:var(--purple-glow);">JUGADOR</span>'}
        </td>
        <td style="padding:12px 14px; font-size:0.78rem; color:var(--text-muted);">
          ${u.authProvider === 'google' ? '🟢 Google' : '🔑 Contraseña'}
        </td>
        <td style="padding:12px 14px; font-size:0.75rem; color:var(--text-muted);">
          ${u.createdAt ? new Date(u.createdAt).toLocaleDateString('es') : 'Hoy'}
        </td>
        <td style="padding:12px 14px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-sm" onclick="promptAddPoints('${u.nick}')" style="background:rgba(255,215,0,0.15); color:var(--gold); border:1px solid rgba(255,215,0,0.4); padding:4px 8px; font-size:0.75rem;" title="Añadir Puntos">
              + ⭐ Dar
            </button>
            <button class="btn btn-sm" onclick="promptDeductPoints('${u.nick}')" style="background:rgba(255,107,107,0.15); color:#ff6b6b; border:1px solid rgba(255,107,107,0.4); padding:4px 8px; font-size:0.75rem;" title="Quitar o Descontar Puntos">
              - ⭐ Quitar
            </button>
            <button class="btn btn-sm" onclick="toggleUserAdminRole('${u.nick}')" style="background:rgba(123,47,255,0.15); color:var(--purple-glow); border:1px solid rgba(123,47,255,0.4); padding:4px 8px; font-size:0.75rem;" title="Cambiar rol">
              ${isAdmin ? 'Quitar Admin' : 'Hacer Admin'}
            </button>
            <button class="btn btn-sm" onclick="deleteUser('${u.nick}')" style="background:rgba(255,61,0,0.15); color:#ff6b6b; border:1px solid rgba(255,61,0,0.3); padding:4px 8px; font-size:0.75rem;" title="Eliminar cuenta">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterUsers = function(val) {
  userFilterQuery = val || '';
  renderUsersTable();
};

window.promptAddPoints = function(nick) {
  const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
  const curBal = (profiles[nick] && typeof profiles[nick].points === 'number') ? profiles[nick].points : 0;

  const amountStr = prompt(`¿Cuántos puntos deseas AÑADIR a ${nick}? (Saldo actual: ${curBal} pts)`, '50');
  if (!amountStr) return;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount === 0) {
    showToast('Ingresa un número válido', 'error');
    return;
  }

  if (amount < 0) {
    // Si escribió un valor negativo, derivar a quitar puntos
    deductPointsLogic(nick, Math.abs(amount));
    return;
  }

  if (!profiles[nick]) {
    profiles[nick] = { nick, points: 0, totalEarned: 0, redeemed: 0, hours: 1, streak: 1, history: [] };
  }

  profiles[nick].points = (profiles[nick].points || 0) + amount;
  profiles[nick].totalEarned = (profiles[nick].totalEarned || 0) + amount;
  profiles[nick].history = profiles[nick].history || [];
  profiles[nick].history.unshift({
    date: new Date().toLocaleDateString('es'),
    desc: `⚡ Asignado por Administración: +${amount} pts`,
    change: +amount,
    balance: profiles[nick].points
  });

  localStorage.setItem('titanProfiles', JSON.stringify(profiles));

  // Notificar al jugador
  if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.addNotification === 'function') {
    TitanAuth.addNotification(nick, {
      title: '¡Puntos Otorgados!',
      message: `La administración te ha otorgado +${amount} puntos Titan. ¡Disfrútalos!`,
      icon: '🎁'
    });
  }

  // Si el usuario actual es este mismo jugador, sincronizar
  const cur = TitanAuth.getCurrentUser();
  if (cur && cur.nick.toLowerCase() === nick.toLowerCase()) {
    if (typeof playerData !== 'undefined') {
      playerData = profiles[nick];
      if (typeof updateUI === 'function') updateUI();
    }
    if (typeof TitanAuth.updateAuthUI === 'function') TitanAuth.updateAuthUI();
  }

  showToast(`✅ Se añadieron ${amount} puntos a ${nick} (Total: ${profiles[nick].points})`, 'success');
  renderMetrics();
  renderUsersTable();
};

/* ─ Quitar / Descontar Puntos a un Jugador ───── */
function deductPointsLogic(nick, amount) {
  const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
  if (!profiles[nick]) {
    profiles[nick] = { nick, points: 0, totalEarned: 0, redeemed: 0, hours: 1, streak: 1, history: [] };
  }

  const currentPoints = profiles[nick].points || 0;
  const actualDeduction = Math.min(currentPoints, amount);
  const newPoints = Math.max(0, currentPoints - amount);

  profiles[nick].points = newPoints;
  profiles[nick].history = profiles[nick].history || [];
  profiles[nick].history.unshift({
    date: new Date().toLocaleDateString('es'),
    desc: `⚡ Retirado por Administración: -${actualDeduction} pts`,
    change: -actualDeduction,
    balance: newPoints
  });

  localStorage.setItem('titanProfiles', JSON.stringify(profiles));

  // Notificación al jugador
  if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.addNotification === 'function') {
    TitanAuth.addNotification(nick, {
      title: 'Ajuste de Puntos por Administración',
      message: `La administración ha descontado ${actualDeduction} puntos. Saldo restante: ${newPoints} pts.`,
      icon: '🔻'
    });
  }

  // Sincronizar si es la sesión actual
  const cur = TitanAuth.getCurrentUser();
  if (cur && cur.nick.toLowerCase() === nick.toLowerCase()) {
    if (typeof playerData !== 'undefined') {
      playerData = profiles[nick];
      if (typeof updateUI === 'function') updateUI();
    }
    if (typeof TitanAuth.updateAuthUI === 'function') TitanAuth.updateAuthUI();
  }

  showToast(`🔻 Se quitaron ${actualDeduction} puntos a ${nick} (Nuevo saldo: ${newPoints})`, 'info');
  renderMetrics();
  renderUsersTable();
}

window.promptDeductPoints = function(nick) {
  const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
  const curBal = (profiles[nick] && typeof profiles[nick].points === 'number') ? profiles[nick].points : 0;

  if (curBal <= 0) {
    showToast(`El jugador ${nick} ya tiene 0 puntos`, 'info');
    return;
  }

  const amountStr = prompt(`¿Cuántos puntos deseas QUITAR a ${nick}?\nSaldo actual: ${curBal} pts`, '50');
  if (!amountStr) return;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    showToast('Ingresa una cantidad válida mayor a 0', 'error');
    return;
  }

  deductPointsLogic(nick, amount);
};

window.toggleUserAdminRole = function(nick) {
  const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
  const key = nick.toLowerCase();
  if (!users[key]) return;

  const newRole = users[key].role === 'admin' ? 'user' : 'admin';
  users[key].role = newRole;
  localStorage.setItem('titanUsers', JSON.stringify(users));

  // Si es el usuario actual, actualizar sesión
  const cur = TitanAuth.getCurrentUser();
  if (cur && cur.nick.toLowerCase() === key) {
    cur.role = newRole;
    TitanAuth.setCurrentUser(cur);
  }

  showToast(`Rol de ${nick} cambiado a: ${newRole.toUpperCase()}`, 'success');
  renderUsersTable();
};

window.deleteUser = function(nick) {
  if (!confirm(`¿Estás seguro de eliminar al usuario ${nick}?`)) return;
  const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
  delete users[nick.toLowerCase()];
  localStorage.setItem('titanUsers', JSON.stringify(users));

  showToast(`Usuario ${nick} eliminado`, 'info');
  renderMetrics();
  renderUsersTable();
};

/* ─ Enviar Puntos Masivos a Todos los Jugadores ─ */
window.massPointsGift = function() {
  const amountStr = prompt('¿Cuántos puntos deseas regalar a TODOS los jugadores registrados?', '100');
  if (!amountStr) return;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    showToast('Ingresa una cantidad válida', 'error');
    return;
  }

  const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
  const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');

  Object.values(users).forEach(u => {
    if (!profiles[u.nick]) {
      profiles[u.nick] = { nick: u.nick, points: 0, totalEarned: 0, history: [] };
    }
    profiles[u.nick].points = (profiles[u.nick].points || 0) + amount;
    profiles[u.nick].totalEarned = (profiles[u.nick].totalEarned || 0) + amount;
    profiles[u.nick].history = profiles[u.nick].history || [];
    profiles[u.nick].history.unshift({
      date: new Date().toLocaleDateString('es'),
      desc: `🎉 Regalo de la Comunidad (+${amount} pts)`,
      change: +amount,
      balance: profiles[u.nick].points
    });

    if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.addNotification === 'function') {
      TitanAuth.addNotification(u.nick, {
        title: '¡Regalo Global de la Comunidad!',
        message: `Se han otorgado +${amount} puntos a todos los miembros de Titan Community.`,
        icon: '🎉'
      });
    }
  });

  localStorage.setItem('titanProfiles', JSON.stringify(profiles));

  const cur = TitanAuth.getCurrentUser();
  if (cur && typeof TitanAuth.updateAuthUI === 'function') {
    TitanAuth.updateAuthUI();
  }

  showToast(`🎁 ¡Se entregaron ${amount} puntos a todos los usuarios!`, 'success');
  if (typeof launchConfetti === 'function') launchConfetti();
  renderMetrics();
  renderUsersTable();
};

/* ─ Quitar Puntos Masivos a Todos los Jugadores ─ */
window.massPointsDeduct = function() {
  const amountStr = prompt('¿Cuántos puntos deseas QUITAR a TODOS los jugadores registrados?', '50');
  if (!amountStr) return;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    showToast('Ingresa una cantidad válida mayor a 0', 'error');
    return;
  }

  if (!confirm(`¿Confirmas descontar hasta ${amount} puntos a TODOS los jugadores?`)) return;

  const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
  const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');

  let totalDeductedCount = 0;
  Object.values(users).forEach(u => {
    if (!profiles[u.nick]) return;
    const curP = profiles[u.nick].points || 0;
    if (curP <= 0) return;

    const actualDed = Math.min(curP, amount);
    profiles[u.nick].points = Math.max(0, curP - actualDed);
    totalDeductedCount++;

    profiles[u.nick].history = profiles[u.nick].history || [];
    profiles[u.nick].history.unshift({
      date: new Date().toLocaleDateString('es'),
      desc: `⚡ Reducción Masiva de Administración: -${actualDed} pts`,
      change: -actualDed,
      balance: profiles[u.nick].points
    });

    if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.addNotification === 'function') {
      TitanAuth.addNotification(u.nick, {
        title: 'Ajuste Global de Puntos',
        message: `La administración realizó un ajuste global de -${actualDed} puntos.`,
        icon: '🔻'
      });
    }
  });

  localStorage.setItem('titanProfiles', JSON.stringify(profiles));

  const cur = TitanAuth.getCurrentUser();
  if (cur && typeof TitanAuth.updateAuthUI === 'function') {
    TitanAuth.updateAuthUI();
  }

  showToast(`🔻 Se descontaron puntos a ${totalDeductedCount} jugadores`, 'info');
  renderMetrics();
  renderUsersTable();
};

/* ─ Tabla de Pedidos de la Tienda ────────────── */
function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No hay pedidos registrados aún</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map((o, index) => {
    const isApproved = o.status === 'Aprobado' || o.status === 'Pagado';
    const isDelivered = o.status === 'Entregado';
    
    let statusBadge = `<span class="badge" style="background:rgba(255,165,0,0.15); color:#ff9f43; border:1px solid rgba(255,165,0,0.3);">⏳ Pendiente PayPal</span>`;
    if (isApproved) {
      statusBadge = `<span class="badge" style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3);">✅ Pagado (PayPal)</span>`;
    } else if (isDelivered) {
      statusBadge = `<span class="badge" style="background:rgba(255,215,0,0.15); color:var(--gold); border:1px solid rgba(255,215,0,0.3);">📦 Entregado</span>`;
    }

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:12px 14px; font-family:monospace; font-weight:700; color:var(--gold);">
          ${o.orderId}
          ${o.paypalTxId ? `<div style="font-size:0.68rem; color:var(--text-muted); font-family:monospace;">Tx: ${o.paypalTxId}</div>` : ''}
        </td>
        <td style="padding:12px 14px; font-size:0.8rem; color:var(--text-muted);">${o.orderDate}</td>
        <td style="padding:12px 14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="https://crafatar.com/avatars/${encodeURIComponent(o.nick)}?size=24&overlay" onerror="this.src='assets/logo.png'" style="width:24px; height:24px; border-radius:4px;" />
            <div>
              <strong style="color:var(--text-primary); font-size:0.85rem;">${o.nick}</strong>
              ${o.email ? `<div style="font-size:0.7rem; color:var(--text-muted);">${o.email}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:12px 14px; font-size:0.8rem; color:var(--text-secondary); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${o.itemNames || 'Items varios'}
        </td>
        <td style="padding:12px 14px; font-weight:800; color:var(--gold); font-size:0.95rem;">$${o.total}</td>
        <td style="padding:12px 14px;">${statusBadge}</td>
        <td style="padding:12px 14px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-sm" onclick="adminApprovePayPal(${index})" style="background:${isApproved || isDelivered ? 'rgba(255,165,0,0.12)' : 'rgba(0,255,136,0.15)'}; color:${isApproved || isDelivered ? '#ff9f43' : '#00ff88'}; border:1px solid ${isApproved || isDelivered ? 'rgba(255,165,0,0.3)' : 'rgba(0,255,136,0.4)'}; padding:4px 8px; font-size:0.75rem;" title="${isApproved || isDelivered ? 'Revertir a Pendiente' : 'Validar y Aprobar Pago PayPal'}">
              ${isApproved || isDelivered ? 'Marcar Pendiente' : '✅ Validar PayPal'}
            </button>
            <button class="btn btn-sm" onclick="adminMarkDelivered(${index})" style="background:rgba(255,215,0,0.12); color:var(--gold); border:1px solid rgba(255,215,0,0.3); padding:4px 8px; font-size:0.75rem;" title="Marcar como entregado en el servidor">
              📦 Entregado
            </button>
            <button class="btn btn-sm" onclick="deleteOrder(${index})" style="background:rgba(255,61,0,0.12); color:#ff6b6b; border:1px solid rgba(255,61,0,0.3); padding:4px 8px; font-size:0.75rem;" title="Eliminar orden">
              ✕
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.adminApprovePayPal = function(index) {
  const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
  if (!orders[index]) return;

  const curStatus = orders[index].status;
  const newStatus = (curStatus === 'Aprobado' || curStatus === 'Entregado') ? 'Pendiente' : 'Aprobado';
  orders[index].status = newStatus;
  
  if (newStatus === 'Aprobado') {
    orders[index].paypalTxId = orders[index].paypalTxId || ('ADM-VAL-' + Date.now().toString(36).toUpperCase());
    orders[index].paidAt = new Date().toLocaleString('es-MX');

    // Notificar al jugador
    if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.addNotification === 'function') {
      TitanAuth.addNotification(
        '¡Pago PayPal Aprobado por Admin!',
        `Tu pedido ${orders[index].orderId} (${orders[index].itemNames}) ha sido validado. Los items están listos en tu inventario.`,
        '💎',
        'purchase'
      );
    }
  }

  localStorage.setItem('titanOrders', JSON.stringify(orders));

  // Sincronizar con cuenta de usuario
  if (typeof syncOrderWithUserAccount === 'function') {
    syncOrderWithUserAccount(orders[index]);
  } else {
    try {
      const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
      const key = orders[index].nick.toLowerCase();
      if (users[key]) {
        users[key].purchases = users[key].purchases || [];
        const pIdx = users[key].purchases.findIndex(p => p.orderId === orders[index].orderId);
        if (pIdx >= 0) users[key].purchases[pIdx] = orders[index];
        else users[key].purchases.unshift(orders[index]);
        localStorage.setItem('titanUsers', JSON.stringify(users));
      }
    } catch(e) {}
  }

  showToast(`Orden ${orders[index].orderId} actualizada a: ${newStatus}`, 'success');
  renderOrdersTable();
  renderMetrics();
};

window.adminMarkDelivered = function(index) {
  const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
  if (!orders[index]) return;

  orders[index].status = 'Entregado';
  orders[index].deliveredAt = new Date().toLocaleString('es-MX');
  localStorage.setItem('titanOrders', JSON.stringify(orders));

  if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.addNotification === 'function') {
    TitanAuth.addNotification(
      '¡Items Entregados en Minecraft!',
      `Tu pedido ${orders[index].orderId} ha sido marcado como entregado en el servidor Bedrock. ¡Que lo disfrutes!`,
      '📦',
      'delivery'
    );
  }

  showToast(`Orden ${orders[index].orderId} marcada como entregada`, 'success');
  renderOrdersTable();
  renderMetrics();
};

window.toggleOrderStatus = window.adminApprovePayPal;

window.deleteOrder = function(index) {
  if (!confirm('¿Deseas eliminar este registro de pedido?')) return;
  const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
  orders.splice(index, 1);
  localStorage.setItem('titanOrders', JSON.stringify(orders));

  showToast('Pedido eliminado', 'info');
  renderMetrics();
  renderOrdersTable();
};

/* ─ Tabla de Canjes Realizados por Jugadores ───── */
function renderRedeemOrdersTable() {
  const tbody = document.getElementById('redeemOrdersTableBody');
  if (!tbody) return;

  const redeems = JSON.parse(localStorage.getItem('titanRedeemOrders') || '[]');
  if (redeems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No hay canjes de puntos registrados aún</td></tr>`;
    return;
  }

  tbody.innerHTML = redeems.map((r, index) => {
    const mcName = r.mcNick || r.nick || 'Sin Nick';
    const safeMcNick = encodeURIComponent(mcName);
    const accountUser = r.accountUser || r.userNick || 'Cuenta';
    const authMethod = r.authProvider || '';
    const isDelivered = r.status === 'Entregado';

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:12px 14px; font-family:monospace; font-weight:700; color:var(--gold); font-size:0.85rem;">
          ${r.id}
        </td>
        <td style="padding:12px 14px; font-size:0.78rem; color:var(--text-muted);">${r.date}</td>
        <td style="padding:12px 14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="https://crafatar.com/avatars/${safeMcNick}?size=34&overlay" onerror="this.src='assets/logo.png'" style="width:34px; height:34px; border-radius:6px; border:2px solid #00ff88; box-shadow:0 0 10px rgba(0,255,136,0.3);" />
            <div>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span style="font-family:monospace; font-weight:900; font-size:1.05rem; color:#00ff88; background:rgba(0,255,136,0.12); padding:3px 8px; border-radius:6px; border:1px solid rgba(0,255,136,0.4);">
                  🎮 ${mcName}
                </span>
                <button class="btn btn-sm" onclick="copyText('${mcName}', this)" style="padding:2px 7px; font-size:0.7rem; background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.2);" title="Copiar Nick de Minecraft para comandos">
                  📋 Copiar
                </button>
                <button class="btn btn-sm" onclick="editRedeemMinecraftNick(${index})" style="padding:2px 7px; font-size:0.7rem; background:rgba(255,215,0,0.12); color:var(--gold); border:1px solid rgba(255,215,0,0.3);" title="Editar o corregir el Nick de Minecraft del receptor">
                  ✏️ Cambiar Nick
                </button>
              </div>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px;">
                Cuenta web: <strong style="color:#fff;">${accountUser}</strong> ${authMethod ? `(${authMethod})` : ''}
              </div>
            </div>
          </div>
        </td>
        <td style="padding:12px 14px; font-size:0.9rem; color:var(--text-primary); font-weight:700;">
          ${r.itemName}
        </td>
        <td style="padding:12px 14px; font-weight:800; color:var(--gold); font-size:1rem;">
          ⭐ ${parseInt(r.cost || 0, 10).toLocaleString()} pts
        </td>
        <td style="padding:12px 14px;">
          ${isDelivered 
            ? '<span class="badge" style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3);">✅ Entregado</span>' 
            : '<span class="badge" style="background:rgba(255,183,3,0.15); color:#ffb703; border:1px solid rgba(255,183,3,0.3);">⏳ Pendiente Entrega</span>'}
        </td>
        <td style="padding:12px 14px;">
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm" onclick="toggleRedeemStatus(${index})" style="background:${isDelivered ? 'rgba(255,183,3,0.15)' : 'rgba(0,255,136,0.15)'}; color:${isDelivered ? '#ffb703' : '#00ff88'}; border:1px solid ${isDelivered ? 'rgba(255,183,3,0.3)' : 'rgba(0,255,136,0.4)'}; padding:4px 9px; font-size:0.75rem;" title="${isDelivered ? 'Marcar como Pendiente' : 'Marcar como Entregado en Minecraft'}">
              ${isDelivered ? 'Marcar Pendiente' : '✅ Marcar Entregado'}
            </button>
            <button class="btn btn-sm" onclick="deleteRedeemOrder(${index})" style="background:rgba(255,61,0,0.15); color:#ff6b6b; border:1px solid rgba(255,61,0,0.3); padding:4px 8px; font-size:0.75rem;" title="Eliminar registro">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.editRedeemMinecraftNick = function(index) {
  const redeems = JSON.parse(localStorage.getItem('titanRedeemOrders') || '[]');
  if (!redeems[index]) return;
  const cur = redeems[index].mcNick || redeems[index].nick || '';
  const next = prompt(`Modificar o corregir el Nick de Minecraft del receptor para el canje de "${redeems[index].itemName}":`, cur);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed) {
    showToast('El Nick de Minecraft no puede quedar vacío', 'warning');
    return;
  }
  redeems[index].mcNick = trimmed;
  redeems[index].nick = trimmed;
  localStorage.setItem('titanRedeemOrders', JSON.stringify(redeems));
  showToast(`🎮 Nick de Minecraft actualizado a "${trimmed}" en este canje`, 'success');
  renderRedeemOrdersTable();
};

window.toggleRedeemStatus = function(index) {
  const redeems = JSON.parse(localStorage.getItem('titanRedeemOrders') || '[]');
  if (!redeems[index]) return;
  const cur = redeems[index].status;
  const newStatus = (cur === 'Entregado') ? 'Pendiente' : 'Entregado';
  redeems[index].status = newStatus;
  localStorage.setItem('titanRedeemOrders', JSON.stringify(redeems));
  const mcNick = redeems[index].mcNick || redeems[index].nick || 'Jugador';
  showToast(`Canje de "${mcNick}" actualizado a: ${newStatus}`, 'success');
  renderRedeemOrdersTable();
};

window.deleteRedeemOrder = function(index) {
  if (!confirm('¿Deseas eliminar este registro de canje?')) return;
  const redeems = JSON.parse(localStorage.getItem('titanRedeemOrders') || '[]');
  redeems.splice(index, 1);
  localStorage.setItem('titanRedeemOrders', JSON.stringify(redeems));
  showToast('Registro de canje eliminado', 'info');
  renderRedeemOrdersTable();
};

/* ─ Anuncios & Notificaciones Globales ───────── */
function renderAnnouncementStatus() {
  const current = localStorage.getItem('titanAnnouncement') || '';
  const status = document.getElementById('announcementStatus');
  let broadcastCount = 0;
  try {
    broadcastCount = JSON.parse(localStorage.getItem('titanBroadcastNotifs') || '[]').length;
  } catch(e) {}

  if (status) {
    status.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span class="badge" style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); font-size:0.75rem;">
          🔔 ${broadcastCount} Notificaciones Enviadas
        </span>
        ${current ? `<span class="badge" style="background:rgba(255,215,0,0.15); color:var(--gold); border:1px solid rgba(255,215,0,0.3); font-size:0.75rem;">📌 Banner Activo</span>` : ''}
      </div>
    `;
  }
}

window.publishAnnouncement = function() {
  const title = document.getElementById('announcementTitleInput')?.value.trim() || '📢 Anuncio Oficial';
  const text = document.getElementById('announcementInput')?.value.trim();
  const icon = document.getElementById('announcementIconSelect')?.value || '📢';
  const sendNotif = document.getElementById('announcementSendNotif') ? document.getElementById('announcementSendNotif').checked : true;
  const showBanner = document.getElementById('announcementShowBanner') ? document.getElementById('announcementShowBanner').checked : true;

  if (!text) {
    showToast('Ingresa el texto del anuncio', 'error');
    document.getElementById('announcementInput')?.focus();
    return;
  }

  // 1. Enviar como notificación a todos los usuarios y campanas
  if (sendNotif && typeof TitanAuth !== 'undefined' && typeof TitanAuth.broadcastNotification === 'function') {
    TitanAuth.broadcastNotification(title, text, icon, 'announcement');
  }

  // 2. Publicar como banner superior si está activo
  if (showBanner) {
    localStorage.setItem('titanAnnouncement', `${icon} ${title}: ${text}`);
    if (typeof TitanAuth !== 'undefined') TitanAuth.updateAuthUI();
  } else {
    localStorage.removeItem('titanAnnouncement');
    const bar = document.getElementById('globalAnnouncementBar');
    if (bar) bar.remove();
  }

  // Limpiar campos del formulario
  if (document.getElementById('announcementTitleInput')) document.getElementById('announcementTitleInput').value = '';
  if (document.getElementById('announcementInput')) document.getElementById('announcementInput').value = '';

  renderAnnouncementStatus();
  showToast('📢 ¡Anuncio enviado exitosamente como notificación a todos los jugadores!', 'success');
};

window.clearAnnouncement = function() {
  localStorage.removeItem('titanAnnouncement');
  showToast('Barra superior eliminada', 'info');
  renderAnnouncementStatus();
  const bar = document.getElementById('globalAnnouncementBar');
  if (bar) bar.remove();
};

/* =============================================
   GESTIÓN Y CONFIGURACIÓN DEL SERVIDOR MINECRAFT
   ============================================= */

function renderServerConfigForm() {
  if (typeof TitanServer === 'undefined') return;
  const cfg = TitanServer.getConfig();

  const statusSelect = document.getElementById('cfgServerStatus');
  const hideIpCheck = document.getElementById('cfgHideIp');
  const ipInput = document.getElementById('cfgServerIp');
  const portInput = document.getElementById('cfgServerPort');
  const versionInput = document.getElementById('cfgServerVersion');
  const noticeInput = document.getElementById('cfgProcessNotice');
  const topBarCheck = document.getElementById('cfgShowTopBar');

  if (statusSelect) statusSelect.value = cfg.status || 'online';
  if (hideIpCheck) hideIpCheck.checked = !!cfg.hideIp;
  if (ipInput) ipInput.value = cfg.ip || 'play.titancommunity.net';
  if (portInput) portInput.value = cfg.port || '19132';
  if (versionInput) versionInput.value = cfg.version || 'Bedrock 1.21.x';
  if (noticeInput) noticeInput.value = cfg.processNotice || '';
  if (topBarCheck) topBarCheck.checked = cfg.showTopBarNotice !== false;

  updateServerStatusBadgeUI(cfg);
}

function updateServerStatusBadgeUI(cfg) {
  const badgeEl = document.getElementById('serverCurrentStatusBadge');
  if (!badgeEl) return;

  if (cfg.status === 'closed') {
    badgeEl.innerHTML = `
      <span class="badge" style="background:rgba(255,56,56,0.2); color:#ff6b6b; border:1px solid rgba(255,56,56,0.5); font-size:0.8rem; padding:6px 12px;">
        🔴 Servidor Cerrado Temporalmente ${cfg.hideIp ? '(IP Oculta)' : ''}
      </span>
    `;
  } else if (cfg.status === 'maintenance') {
    badgeEl.innerHTML = `
      <span class="badge" style="background:rgba(255,183,3,0.2); color:#ffb703; border:1px solid rgba(255,183,3,0.5); font-size:0.8rem; padding:6px 12px;">
        🔧 Mantenimiento Técnico ${cfg.hideIp ? '(IP Oculta)' : ''}
      </span>
    `;
  } else if (cfg.hideIp) {
    badgeEl.innerHTML = `
      <span class="badge" style="background:rgba(255,159,28,0.2); color:#ff9f1c; border:1px solid rgba(255,159,28,0.5); font-size:0.8rem; padding:6px 12px;">
        🔒 IP Oculta · En Proceso de Apertura
      </span>
    `;
  } else if (cfg.status === 'online') {
    badgeEl.innerHTML = `
      <span class="badge" style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.4); font-size:0.8rem; padding:6px 12px;">
        🟢 Servidor En Línea (${cfg.ip}:${cfg.port})
      </span>
    `;
  } else {
    badgeEl.innerHTML = `
      <span class="badge" style="background:rgba(255,159,28,0.2); color:#ff9f1c; border:1px solid rgba(255,159,28,0.5); font-size:0.8rem; padding:6px 12px;">
        🟡 En Proceso de Apertura
      </span>
    `;
  }
}

window.handleServerStatusChange = function(statusVal) {
  const hideIpCheck = document.getElementById('cfgHideIp');
  const noticeInput = document.getElementById('cfgProcessNotice');

  if (hideIpCheck) {
    if (statusVal === 'in_progress' || statusVal === 'maintenance' || statusVal === 'closed') {
      hideIpCheck.checked = true;
    } else if (statusVal === 'online') {
      hideIpCheck.checked = false;
    }
  }

  if (noticeInput) {
    if (statusVal === 'closed') {
      noticeInput.value = '🔴 El servidor se encuentra actualmente cerrado temporalmente. ¡Estamos preparando nuevas actualizaciones y mejoras! Síguenos en Discord para enterarte de la fecha de reapertura.';
    } else if (statusVal === 'in_progress') {
      noticeInput.value = '🚧 El servidor se encuentra actualmente en proceso de configuración y apertura. ¡Próximamente abriremos las puertas! Únete a Discord para ser notificado de la apertura oficial.';
    } else if (statusVal === 'maintenance') {
      noticeInput.value = '🔧 El servidor se encuentra en mantenimiento técnico para optimizaciones del sistema. Volveremos a estar en línea muy pronto.';
    }
  }

  const currentCfg = (typeof TitanServer !== 'undefined') ? TitanServer.getConfig() : {};
  updateServerStatusBadgeUI({ ...currentCfg, status: statusVal, hideIp: hideIpCheck?.checked });
};

window.handleSaveServerConfig = function(e) {
  e.preventDefault();

  const status = document.getElementById('cfgServerStatus')?.value || 'online';
  const hideIp = document.getElementById('cfgHideIp')?.checked || false;
  const ip = document.getElementById('cfgServerIp')?.value.trim() || 'play.titancommunity.net';
  const port = document.getElementById('cfgServerPort')?.value.trim() || '19132';
  const version = document.getElementById('cfgServerVersion')?.value.trim() || 'Bedrock 1.21.x';
  const processNotice = document.getElementById('cfgProcessNotice')?.value.trim() || '🚧 El servidor se encuentra actualmente en proceso de configuración y apertura. ¡Próximamente abriremos las puertas! Únete a Discord para ser notificado de la apertura oficial.';
  const showTopBarNotice = document.getElementById('cfgShowTopBar')?.checked || false;

  const newConfig = {
    status,
    hideIp,
    ip,
    port,
    version,
    processNotice,
    showTopBarNotice
  };

  if (typeof TitanServer !== 'undefined') {
    TitanServer.saveConfig(newConfig);
    // Sincronizar flag explícito de la barra superior
    if (showTopBarNotice) {
      localStorage.setItem('titanTopBarExplicitlyEnabled', '1');
    } else {
      localStorage.removeItem('titanTopBarExplicitlyEnabled');
    }
    updateServerStatusBadgeUI(newConfig);
    showToast('💾 ¡Configuración del servidor guardada y sincronizada en toda la web!', 'success');
  }

};

window.resetServerConfigToDefault = function() {
  if (!confirm('¿Deseas restablecer la IP, puerto y estado del servidor a los valores oficiales por defecto?')) {
    return;
  }
  if (typeof TitanServer !== 'undefined') {
    TitanServer.resetConfig();
    renderServerConfigForm();
    showToast('🔄 Configuración del servidor restablecida por defecto', 'info');
  }
};

/* ─ Manejador de Subida y Vista Previa de Imágenes con Compresión Automática ── */
window.handleImageFilePicker = function(input, previewId, base64Id, placeholderId) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    showToast('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP, GIF)', 'error');
    return;
  }

  const previewEl = document.getElementById(previewId);
  const placeholderEl = document.getElementById(placeholderId);
  if (placeholderEl) placeholderEl.textContent = '⏳ Optimizando y cargando foto...';

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawDataUrl = e.target.result;
    
    // Comprimir y redimensionar la imagen para no sobrecargar el almacenamiento
    const img = new Image();
    img.onload = function() {
      const maxDim = 500;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Alta compresión JPEG (calidad 0.75 = nítida y tamaño ultra liviano ~15KB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

      const base64Input = document.getElementById(base64Id);
      if (base64Input) base64Input.value = compressedDataUrl;
      if (previewEl) {
        previewEl.src = compressedDataUrl;
        previewEl.style.display = 'block';
      }
      if (placeholderEl) {
        placeholderEl.style.display = 'none';
        placeholderEl.textContent = 'Foto lista';
      }
      showToast('📷 Foto cargada y optimizada con éxito', 'success');
    };
    img.onerror = function() {
      showToast('⚠️ No se pudo procesar la imagen seleccionada. Prueba con otro archivo JPG o PNG.', 'error');
      if (placeholderEl) {
        placeholderEl.style.display = 'inline';
        placeholderEl.textContent = 'Error al cargar imagen';
      }
    };
    img.src = rawDataUrl;
  };
  reader.readAsDataURL(file);
};

window.handleImageUrlInput = function(url, previewId, base64Id, placeholderId) {
  const base64Input = document.getElementById(base64Id);
  const previewEl = document.getElementById(previewId);
  const placeholderEl = document.getElementById(placeholderId);
  const cleanUrl = (url || '').trim();

  if (cleanUrl) {
    if (base64Input) base64Input.value = cleanUrl;
    if (previewEl) {
      previewEl.src = cleanUrl;
      previewEl.style.display = 'block';
    }
    if (placeholderEl) placeholderEl.style.display = 'none';
  } else {
    if (base64Input) base64Input.value = '';
    if (previewEl) {
      previewEl.src = '';
      previewEl.style.display = 'none';
    }
    if (placeholderEl) placeholderEl.style.display = 'inline';
  }
};

/* ════════════════════════════════════════════════════════
   GESTIÓN DE PRODUCTOS DE LA TIENDA (SUBIR, EDITAR, BORRAR)
   ════════════════════════════════════════════════════════ */

let currentAdminProductCat = 'all';

function renderStoreProductsTable() {
  const tbody = document.getElementById('storeProductsTableBody');
  if (!tbody) return;

  const items = (typeof window.getStoreItems === 'function') ? window.getStoreItems() : [];

  const filtered = items.filter(item => {
    if (currentAdminProductCat === 'all') return true;
    return item.cat === currentAdminProductCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">No hay productos en la tienda. ¡Sube uno nuevo con el botón superior!</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const origPriceVal = item.originalPrice ? parseFloat(item.originalPrice) : null;
    const origPriceHtml = (origPriceVal && origPriceVal > parseFloat(item.price)) 
      ? `<span style="text-decoration:line-through; color:var(--text-muted); font-size:0.75rem; margin-left:4px;">$${origPriceVal.toFixed(2)}</span>` 
      : '';
    
    let catLabel = item.cat;
    if (item.cat === 'kits') catLabel = '⚔️ Kits';
    else if (item.cat === 'rangos') catLabel = '👑 Rangos';
    else if (item.cat === 'mascotas') catLabel = '🐾 Mascotas';
    else if (item.cat === 'especiales') catLabel = '✨ Especiales';

    const photoHtml = item.image
      ? `<img src="${item.image}" alt="${item.name}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid rgba(123,47,255,0.4);" />`
      : `<div style="width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; background:rgba(123,47,255,0.15); border:1px solid rgba(123,47,255,0.3); flex-shrink:0;">${item.icon || '🛒'}</div>`;

    const safeId = (item.id || '').replace(/'/g, "\\'");

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:12px 14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            ${photoHtml}
            <div>
              <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${item.name}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${item.badge ? '🏷️ ' + item.badge : ''}</div>
            </div>
          </div>
        </td>
        <td style="padding:12px 14px;">
          <span class="badge" style="background:rgba(123,47,255,0.2); color:var(--purple-glow); font-size:0.75rem;">${catLabel}</span>
        </td>
        <td style="padding:12px 14px;">
          <span style="font-weight:800; color:#00ff88; font-size:0.95rem;">$${parseFloat(item.price || 0).toFixed(2)}</span>
          ${origPriceHtml}
        </td>
        <td style="padding:12px 14px; font-size:0.78rem; color:var(--text-muted); max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${item.desc || '—'}
        </td>
        <td style="padding:12px 14px;">
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm" onclick="openStoreProductModal('${safeId}')" style="background:rgba(123,47,255,0.2); color:var(--purple-glow); border:1px solid rgba(123,47,255,0.4); padding:4px 9px; font-size:0.75rem;" title="Editar producto">
              ✏️ Editar
            </button>
            <button class="btn btn-sm" onclick="deleteStoreProduct('${safeId}')" style="background:rgba(255,61,0,0.15); color:#ff6b6b; border:1px solid rgba(255,61,0,0.3); padding:4px 9px; font-size:0.75rem;" title="Eliminar producto de la tienda">
              🗑️ Borrar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterAdminProducts = function(cat) {
  currentAdminProductCat = cat || 'all';
  document.querySelectorAll('[id^="adminCatFilter-"]').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('adminCatFilter-' + currentAdminProductCat);
  if (activeBtn) activeBtn.classList.add('active');
  renderStoreProductsTable();
};

window.openStoreProductModal = function(id = null) {
  const modal = document.getElementById('storeProductModal');
  const title = document.getElementById('storeProductModalTitle');
  const editIdInput = document.getElementById('prodEditId');
  const nameInput = document.getElementById('prodName');
  const catInput = document.getElementById('prodCat');
  const priceInput = document.getElementById('prodPrice');
  const origPriceInput = document.getElementById('prodOrigPrice');
  const iconInput = document.getElementById('prodIcon');
  const badgeInput = document.getElementById('prodBadge');
  const descInput = document.getElementById('prodDesc');
  const imgBase64Input = document.getElementById('prodImageBase64');
  const imgPreview = document.getElementById('prodImagePreview');
  const imgPlaceholder = document.getElementById('prodImagePlaceholder');
  const imgUrlInput = document.getElementById('prodImageUrl');
  const imgFileInput = document.getElementById('prodImageFile');

  if (!modal) return;
  if (imgFileInput) imgFileInput.value = '';

  if (id) {
    // Modo Edición
    const items = (typeof window.getStoreItems === 'function') ? window.getStoreItems() : [];
    const prod = items.find(i => i.id === id);
    if (!prod) {
      showToast('No se encontró el producto para editar', 'error');
      return;
    }

    if (title) title.textContent = `✏️ Editar Producto: ${prod.name}`;
    if (editIdInput) editIdInput.value = prod.id;
    if (nameInput) nameInput.value = prod.name || '';
    if (catInput) catInput.value = prod.cat || 'kits';
    if (priceInput) priceInput.value = prod.price || '';
    if (origPriceInput) origPriceInput.value = prod.originalPrice || '';
    if (iconInput) iconInput.value = prod.icon || '🛒';
    if (badgeInput) badgeInput.value = prod.badge || '';
    if (descInput) descInput.value = prod.desc || '';

    if (imgBase64Input) imgBase64Input.value = prod.image || '';
    if (imgUrlInput) imgUrlInput.value = (prod.image && prod.image.startsWith('http')) ? prod.image : '';
    if (prod.image) {
      if (imgPreview) { imgPreview.src = prod.image; imgPreview.style.display = 'block'; }
      if (imgPlaceholder) imgPlaceholder.style.display = 'none';
    } else {
      if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
      if (imgPlaceholder) imgPlaceholder.style.display = 'inline';
    }
  } else {
    // Modo Subir Nuevo
    if (title) title.textContent = '➕ Subir Nuevo Producto a la Tienda';
    if (editIdInput) editIdInput.value = '';
    document.getElementById('storeProductForm')?.reset();
    if (iconInput) iconInput.value = '🛒';
    if (imgBase64Input) imgBase64Input.value = '';
    if (imgUrlInput) imgUrlInput.value = '';
    if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
    if (imgPlaceholder) imgPlaceholder.style.display = 'inline';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeStoreProductModal = function() {
  const modal = document.getElementById('storeProductModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
};

window.handleSaveStoreProduct = function(e) {
  e.preventDefault();

  const editId = document.getElementById('prodEditId')?.value?.trim();
  let name = document.getElementById('prodName')?.value?.trim();
  const cat = document.getElementById('prodCat')?.value || 'kits';
  const priceRaw = document.getElementById('prodPrice')?.value?.trim();
  const price = parseFloat(priceRaw);
  const origPriceRaw = document.getElementById('prodOrigPrice')?.value?.trim();
  const originalPrice = origPriceRaw ? parseFloat(origPriceRaw) : null;
  const icon = document.getElementById('prodIcon')?.value?.trim() || '🛒';
  const badge = document.getElementById('prodBadge')?.value?.trim() || null;
  const desc = document.getElementById('prodDesc')?.value?.trim();
  
  // Buscar foto en base64 O en la URL directa pegada
  const image = document.getElementById('prodImageBase64')?.value?.trim() 
    || document.getElementById('prodImageUrl')?.value?.trim() 
    || null;

  // 1. Validar Foto obligatoria
  if (!image) {
    showToast('📷 Por favor selecciona una Foto para el producto (desde tu PC o pega un enlace)', 'warning');
    return;
  }

  // 2. Validar Descripción obligatoria
  if (!desc) {
    showToast('📝 Por favor escribe la Descripción del producto', 'warning');
    document.getElementById('prodDesc')?.focus();
    return;
  }

  // 3. Validar Precio en dólares
  if (isNaN(price) || price <= 0) {
    showToast('💵 Por favor ingresa un Precio válido en dólares (mayor a 0)', 'warning');
    document.getElementById('prodPrice')?.focus();
    return;
  }

  // 4. Nombre: Si no se colocó nombre, se genera automáticamente a partir de la descripción o categoría
  if (!name) {
    name = desc.length > 32 ? desc.substring(0, 30).trim() + '...' : desc;
    if (!name) name = 'Producto ' + cat.toUpperCase();
  }

  const items = (typeof window.getStoreItems === 'function') ? window.getStoreItems() : [];

  if (editId) {
    // Actualizar producto existente
    const idx = items.findIndex(i => i.id === editId);
    if (idx !== -1) {
      items[idx] = {
        ...items[idx],
        name,
        cat,
        price,
        originalPrice: (originalPrice && originalPrice > price) ? originalPrice : null,
        icon,
        badge,
        desc,
        image
      };
      const ok = (typeof window.saveStoreItems === 'function') ? window.saveStoreItems(items) : false;
      if (!ok) return;
      showToast(`✅ Producto "${name}" actualizado con éxito`, 'success');
    }
  } else {
    // Subir nuevo producto
    const newId = 'prod-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000);
    const newProduct = {
      id: newId,
      name,
      cat,
      price,
      originalPrice: (originalPrice && originalPrice > price) ? originalPrice : null,
      icon,
      badge,
      desc,
      image,
      banner: cat === 'rangos' ? 'banner-gold' : (cat === 'especiales' ? 'banner-fire' : 'banner-purple'),
      features: [
        'Activación inmediata en el servidor',
        'Compatible con Minecraft Bedrock 1.21.x',
        'Beneficio permanente vinculado a tu cuenta'
      ]
    };
    items.push(newProduct);
    const ok = (typeof window.saveStoreItems === 'function') ? window.saveStoreItems(items) : false;
    if (!ok) return;
    showToast(`🚀 ¡Producto "${name}" subido a la tienda con éxito!`, 'success');
  }

  closeStoreProductModal();
  renderStoreProductsTable();
  renderMetrics();
};

window.deleteStoreProduct = function(id) {
  const items = (typeof window.getStoreItems === 'function') ? window.getStoreItems() : [];
  const prod = items.find(i => i.id === id);
  const name = prod ? prod.name : 'este producto';

  if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente "${name}" de la tienda?`)) {
    return;
  }

  const updated = items.filter(i => i.id !== id);
  if (typeof window.saveStoreItems === 'function') window.saveStoreItems(updated);

  showToast(`🗑️ Producto "${name}" eliminado de la tienda`, 'info');
  renderStoreProductsTable();
  renderMetrics();
};

window.clearAllStoreProducts = function() {
  if (!confirm('¿Estás seguro de que deseas VACIAR todos los productos de la tienda? Esta acción no se puede deshacer.')) {
    return;
  }
  if (typeof window.saveStoreItems === 'function') {
    window.saveStoreItems([]);
  }
  showToast('🗑️ Se ha vaciado el catálogo de la tienda', 'info');
  renderStoreProductsTable();
  renderMetrics();
};

window.resetStoreProductsToDefault = function() {
  if (!confirm('¿Deseas restaurar todos los productos originales de la tienda por defecto? (Se conservarán los kits, rangos, mascotas y especiales predeterminados)')) {
    return;
  }

  if (typeof STORE_ITEMS !== 'undefined') {
    if (typeof window.saveStoreItems === 'function') window.saveStoreItems(STORE_ITEMS);
    showToast('🔄 Catálogo de la tienda restaurado a los valores por defecto', 'success');
    renderStoreProductsTable();
    renderMetrics();
  } else {
    showToast('No se encontró el catálogo predeterminado', 'error');
  }
};

/* ════════════════════════════════════════════════════════
   GESTIÓN DEL CATÁLOGO DE CANJE (SUBIR, EDITAR, BORRAR)
   ════════════════════════════════════════════════════════ */

let currentAdminRedeemCat = 'all';

function renderRedeemProductsTable() {
  const tbody = document.getElementById('redeemProductsTableBody');
  if (!tbody) return;

  const items = (typeof window.getRedeemItems === 'function') ? window.getRedeemItems() : [];

  const filtered = items.filter(item => {
    if (currentAdminRedeemCat === 'all') return true;
    return item.cat === currentAdminRedeemCat;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">No hay ítems en el catálogo de canje. ¡Sube una recompensa con el botón superior!</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const costVal = parseInt(item.cost || item.price, 10) || 0;
    const photoHtml = item.image
      ? `<img src="${item.image}" alt="${item.name}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid rgba(255,215,0,0.4);" />`
      : `<div style="width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.3); flex-shrink:0;">${item.icon || '⭐'}</div>`;

    let catLabel = item.cat;
    if (item.cat === 'mascotas') catLabel = '🐾 Mascotas';
    else if (item.cat === 'efectos') catLabel = '✨ Efectos';
    else if (item.cat === 'titulos') catLabel = '📜 Títulos';
    else if (item.cat === 'kits') catLabel = '⚔️ Kits';
    else if (item.cat === 'especial') catLabel = '🔥 Especial';

    const safeId = (item.id || '').replace(/'/g, "\\'");

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:12px 14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            ${photoHtml}
            <div>
              <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${item.name}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${item.cat}</div>
            </div>
          </div>
        </td>
        <td style="padding:12px 14px;">
          <span class="badge" style="background:rgba(255,215,0,0.15); color:var(--gold); font-size:0.75rem;">${catLabel}</span>
        </td>
        <td style="padding:12px 14px;">
          <span style="font-weight:800; color:var(--gold); font-size:0.95rem;">⭐ ${costVal.toLocaleString()} pts</span>
        </td>
        <td style="padding:12px 14px; font-size:0.78rem; color:var(--text-muted); max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${item.desc || '—'}
        </td>
        <td style="padding:12px 14px;">
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm" onclick="openRedeemProductModal('${safeId}')" style="background:rgba(255,215,0,0.15); color:var(--gold); border:1px solid rgba(255,215,0,0.4); padding:4px 9px; font-size:0.75rem;" title="Editar ítem de canje">
              ✏️ Editar
            </button>
            <button class="btn btn-sm" onclick="deleteRedeemProduct('${safeId}')" style="background:rgba(255,61,0,0.15); color:#ff6b6b; border:1px solid rgba(255,61,0,0.3); padding:4px 9px; font-size:0.75rem;" title="Eliminar ítem de canje">
              🗑️ Borrar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterAdminRedeemProducts = function(cat) {
  currentAdminRedeemCat = cat || 'all';
  document.querySelectorAll('[id^="adminRedeemCatFilter-"]').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('adminRedeemCatFilter-' + currentAdminRedeemCat);
  if (activeBtn) activeBtn.classList.add('active');
  renderRedeemProductsTable();
};

window.openRedeemProductModal = function(id = null) {
  const modal = document.getElementById('redeemProductModal');
  const title = document.getElementById('redeemProductModalTitle');
  const editIdInput = document.getElementById('redeemEditId');
  const nameInput = document.getElementById('redeemName');
  const catInput = document.getElementById('redeemCat');
  const costInput = document.getElementById('redeemCost');
  const iconInput = document.getElementById('redeemIcon');
  const descInput = document.getElementById('redeemDesc');
  const imgBase64Input = document.getElementById('redeemImageBase64');
  const imgPreview = document.getElementById('redeemImagePreview');
  const imgPlaceholder = document.getElementById('redeemImagePlaceholder');
  const imgUrlInput = document.getElementById('redeemImageUrl');
  const imgFileInput = document.getElementById('redeemImageFile');

  if (!modal) return;
  if (imgFileInput) imgFileInput.value = '';

  if (id) {
    const items = (typeof window.getRedeemItems === 'function') ? window.getRedeemItems() : [];
    const item = items.find(i => i.id === id);
    if (!item) {
      showToast('No se encontró el ítem para editar', 'error');
      return;
    }
    if (title) title.textContent = `✏️ Editar Ítem de Canje: ${item.name}`;
    if (editIdInput) editIdInput.value = item.id;
    if (nameInput) nameInput.value = item.name || '';
    if (catInput) catInput.value = item.cat || 'mascotas';
    if (costInput) costInput.value = item.cost || item.price || '';
    if (iconInput) iconInput.value = item.icon || '⭐';
    if (descInput) descInput.value = item.desc || '';
    if (imgBase64Input) imgBase64Input.value = item.image || '';
    if (imgUrlInput) imgUrlInput.value = (item.image && item.image.startsWith('http')) ? item.image : '';
    if (item.image) {
      if (imgPreview) { imgPreview.src = item.image; imgPreview.style.display = 'block'; }
      if (imgPlaceholder) imgPlaceholder.style.display = 'none';
    } else {
      if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
      if (imgPlaceholder) imgPlaceholder.style.display = 'inline';
    }
  } else {
    if (title) title.textContent = '➕ Subir Nuevo Ítem de Canje';
    if (editIdInput) editIdInput.value = '';
    document.getElementById('redeemProductForm')?.reset();
    if (iconInput) iconInput.value = '⭐';
    if (imgBase64Input) imgBase64Input.value = '';
    if (imgUrlInput) imgUrlInput.value = '';
    if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
    if (imgPlaceholder) imgPlaceholder.style.display = 'inline';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeRedeemProductModal = function() {
  const modal = document.getElementById('redeemProductModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
};

window.handleSaveRedeemProduct = function(e) {
  e.preventDefault();

  const editId = document.getElementById('redeemEditId')?.value?.trim();
  let name = document.getElementById('redeemName')?.value?.trim();
  const cat = document.getElementById('redeemCat')?.value || 'mascotas';
  const costRaw = document.getElementById('redeemCost')?.value?.trim();
  const cost = parseInt(costRaw, 10);
  const icon = document.getElementById('redeemIcon')?.value?.trim() || '⭐';
  const desc = document.getElementById('redeemDesc')?.value?.trim();
  const image = document.getElementById('redeemImageBase64')?.value?.trim()
    || document.getElementById('redeemImageUrl')?.value?.trim()
    || null;

  // 1. Validar Foto obligatoria
  if (!image) {
    showToast('📷 Por favor selecciona una Foto para la recompensa (desde tu PC o pega un enlace)', 'warning');
    return;
  }

  // 2. Validar Descripción obligatoria
  if (!desc) {
    showToast('📝 Por favor escribe la Descripción de la recompensa', 'warning');
    document.getElementById('redeemDesc')?.focus();
    return;
  }

  // 3. Validar Costo en Puntos
  if (isNaN(cost) || cost <= 0) {
    showToast('⭐ Por favor ingresa un Costo en Puntos válido (mayor a 0)', 'warning');
    document.getElementById('redeemCost')?.focus();
    return;
  }

  // 4. Nombre: Si no se colocó nombre, se genera automáticamente a partir de la descripción o categoría
  if (!name) {
    name = desc.length > 32 ? desc.substring(0, 30).trim() + '...' : desc;
    if (!name) name = 'Recompensa ' + cat.toUpperCase();
  }

  const items = (typeof window.getRedeemItems === 'function') ? window.getRedeemItems() : [];

  if (editId) {
    const idx = items.findIndex(i => i.id === editId);
    if (idx !== -1) {
      items[idx] = {
        ...items[idx],
        name,
        cat,
        cost,
        price: cost,
        icon,
        desc,
        image
      };
      const ok = (typeof window.saveRedeemItems === 'function') ? window.saveRedeemItems(items) : false;
      if (!ok) return;
      showToast(`✅ Ítem "${name}" actualizado con éxito`, 'success');
    }
  } else {
    const newId = 'redeem-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000);
    const newItem = {
      id: newId,
      name,
      cat,
      cost,
      price: cost,
      icon,
      desc,
      image,
      banner: 'banner-gold'
    };
    items.push(newItem);
    const ok = (typeof window.saveRedeemItems === 'function') ? window.saveRedeemItems(items) : false;
    if (!ok) return;
    showToast(`🚀 ¡Ítem de canje "${name}" subido con éxito!`, 'success');
  }

  closeRedeemProductModal();
  renderRedeemProductsTable();
  renderMetrics();
};

window.deleteRedeemProduct = function(id) {
  const items = (typeof window.getRedeemItems === 'function') ? window.getRedeemItems() : [];
  const item = items.find(i => i.id === id);
  const name = item ? item.name : 'este ítem';

  if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente "${name}" del catálogo de canje?`)) {
    return;
  }

  const updated = items.filter(i => i.id !== id);
  if (typeof window.saveRedeemItems === 'function') window.saveRedeemItems(updated);

  showToast(`🗑️ Ítem "${name}" eliminado de canje`, 'info');
  renderRedeemProductsTable();
  renderMetrics();
};

window.clearAllRedeemProducts = function() {
  if (!confirm('¿Estás seguro de que deseas VACIAR todo el catálogo de canje? Esta acción no se puede deshacer.')) {
    return;
  }
  if (typeof window.saveRedeemItems === 'function') {
    window.saveRedeemItems([]);
  }
  showToast('🗑️ Se ha vaciado el catálogo de canje', 'info');
  renderRedeemProductsTable();
  renderMetrics();
};

/* ─ Cerrar modales con clic fuera o tecla ESC ─── */
document.addEventListener('click', (e) => {
  if (e.target.id === 'storeProductModal') closeStoreProductModal();
  if (e.target.id === 'redeemProductModal') closeRedeemProductModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeStoreProductModal();
    closeRedeemProductModal();
  }
});



