/* =============================================
   CANJE.JS – Points System & Redeem Store
   ============================================= */

/* ─ State ─────────────────────────────────────── */
let playerData = {
  nick:        '',
  points:      0,
  totalEarned: 0,
  redeemed:    0,
  hours:       0,
  streak:      0,
  history:     [],
  dailyRedeemed: 0,
  dailyVideos:   0,
  lastDay:       ''
};

/* ─ Sincronización Estricta con la Cuenta que Inició Sesión ─ */
function syncPlayerWithActiveAuth() {
  let user = null;
  try {
    if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getCurrentUser === 'function') {
      user = TitanAuth.getCurrentUser();
    } else {
      const raw = localStorage.getItem('titanAuthUser');
      user = raw ? JSON.parse(raw) : null;
    }
  } catch(e) {}

  const savedProfiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');

  if (user && user.nick) {
    const nick = user.nick;
    if (savedProfiles[nick]) {
      playerData = { ...playerData, ...savedProfiles[nick], nick: nick };
    } else {
      const isExternal = (user.authProvider === 'discord' || user.authProvider === 'google');
      const startPts = isExternal ? 75 : 10;
      playerData = {
        ...playerData,
        nick: nick,
        points: startPts,
        totalEarned: startPts,
        redeemed: 0,
        hours: 1,
        streak: 1,
        history: [{
          date: new Date().toLocaleDateString('es'),
          desc: `🎁 Bono de bienvenida (${isExternal ? user.authProvider.toUpperCase() : 'Registro'})`,
          change: startPts,
          balance: startPts
        }]
      };
      savedProfiles[nick] = { ...playerData };
      localStorage.setItem('titanProfiles', JSON.stringify(savedProfiles));
    }
  } else {
    // Si no ha iniciado sesión, no mostrar puntos de otra cuenta
    playerData = {
      nick: '',
      points: 0,
      totalEarned: 0,
      redeemed: 0,
      hours: 0,
      streak: 0,
      history: []
    };
  }

  if (!Array.isArray(playerData.history)) {
    playerData.history = [];
  }
}
syncPlayerWithActiveAuth();

let pendingRedeem = null;

/* ─ Redeem Items Catalog loaded from productos.js ─────────────────────── */

/* ─ Current Category ─────────────────────────── */
let currentRedeemCat = 'todo';

/* ─ Actualizar Contadores de Pestañas de Canje ─── */
function updateRedeemTabCounts() {
  const redeemList = (typeof window.getRedeemItems === 'function')
    ? window.getRedeemItems()
    : (typeof REDEEM_ITEMS !== 'undefined' ? REDEEM_ITEMS : []);

  const total = redeemList.length;
  const mascotas = redeemList.filter(i => i.cat === 'mascotas').length;
  const efectos = redeemList.filter(i => i.cat === 'efectos').length;
  const titulos = redeemList.filter(i => i.cat === 'titulos').length;
  const kits = redeemList.filter(i => i.cat === 'kits').length;
  const especial = redeemList.filter(i => i.cat === 'especial').length;

  document.querySelectorAll('.redeem-tab').forEach(btn => {
    const text = btn.textContent;
    if (text.includes('Todos')) btn.innerHTML = `⭐ Todos (${total})`;
    else if (text.includes('Mascotas')) btn.innerHTML = `🐾 Mascotas (${mascotas})`;
    else if (text.includes('Efectos')) btn.innerHTML = `✨ Efectos & Trails (${efectos})`;
    else if (text.includes('Títulos') || text.includes('Titulos')) btn.innerHTML = `📜 Títulos (${titulos})`;
    else if (text.includes('Kits')) btn.innerHTML = `⚔️ Kits (${kits})`;
    else if (text.includes('Especiales') || text.includes('Especial')) btn.innerHTML = `🎁 Especiales (${especial})`;
  });
}

/* ─ Render Redeem Grid ───────────────────────── */
function renderRedeemGrid() {
  const grid = document.getElementById('redeemGrid');
  if (!grid) return;

  const redeemList = (typeof window.getRedeemItems === 'function')
    ? window.getRedeemItems()
    : (typeof REDEEM_ITEMS !== 'undefined' ? REDEEM_ITEMS : []);

  updateRedeemTabCounts();

  const items = currentRedeemCat === 'todo'
    ? redeemList
    : redeemList.filter(i => i.cat === currentRedeemCat);

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 10px;">🎁</div>
        <p style="font-size: 1rem;">No hay ítems en esta categoría de canje por ahora.</p>
      </div>
    `;
    return;
  }

  const user = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  const isAuth = !!user;

  grid.innerHTML = items.map(item => {
    const costVal = parseInt(item.cost || item.price, 10) || 0;
    const canAfford = isAuth && (playerData.points >= costVal);
    const locked = !canAfford;

    const bannerContent = item.image 
      ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" />` 
      : `<span style="font-size:3.5rem;">${item.icon || '⭐'}</span>`;

    const safeId = (item.id || '').replace(/'/g, "\\'");

    let btnText = '⭐ Canjear';
    let btnAction = `openRedeemModal('${safeId}')`;
    let btnStyle = '';
    let statusNotice = '';

    if (!isAuth) {
      btnText = '🔑 Iniciar Sesión para Canjear';
      btnAction = `openAuthModal('login')`;
      btnStyle = 'background:rgba(123,47,255,0.2); color:var(--purple-glow); border:1px solid rgba(123,47,255,0.4);';
      statusNotice = `<span class="badge" style="background:rgba(123,47,255,0.15);color:var(--purple-glow);font-size:0.7rem;">Requiere cuenta</span>`;
    } else if (!canAfford) {
      const diff = costVal - playerData.points;
      btnText = `🔒 Faltan ${diff.toLocaleString()} ⭐`;
      btnAction = `showToast('Te faltan ${diff.toLocaleString()} puntos para canjear este ítem. ¡Mira videos o gana jugando en el servidor!', 'info')`;
      btnStyle = 'background:rgba(255,255,255,0.06); color:var(--text-muted); cursor:pointer;';
      statusNotice = `<span class="badge" style="background:rgba(255,107,107,0.15);color:#ff8585;font-size:0.7rem;">Faltan ${diff.toLocaleString()} pts</span>`;
    }

    return `
      <div class="redeem-card ${locked ? 'locked' : ''} reveal">
        <div class="redeem-banner ${item.banner || 'banner-purple'}" style="${item.image ? 'padding:0; overflow:hidden; position:relative;' : 'position:relative;'}">
          ${bannerContent}
          ${item.badge ? `<div style="position:absolute;top:10px;right:10px;" class="badge badge-exclusive">${item.badge}</div>` : ''}
        </div>
        <div class="redeem-body">
          <h3 class="redeem-name">${item.name}</h3>
          <p class="redeem-desc">${item.desc || ''}</p>
          <div class="redeem-cost">
            <div class="cost-amount">
              <span>⭐</span> ${costVal.toLocaleString()}
            </div>
            ${statusNotice}
          </div>
          <button class="redeem-btn" onclick="${btnAction}" style="${btnStyle}">
            ${btnText}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Re-trigger reveal observer
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.remove('visible');
    setTimeout(() => el.classList.add('visible'), 50);
  });
}

/* ─ Switch Redeem Tab ────────────────────────── */
function switchRedeemTab(cat, btn) {
  currentRedeemCat = cat;
  document.querySelectorAll('.redeem-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderRedeemGrid();
}

/* ─ Open Redeem Modal ────────────────────────── */
function openRedeemModal(itemId) {
  const user = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  if (!user) {
    showToast('⚠️ Debes iniciar sesión con tu cuenta para canjear', 'info');
    if (window.TitanAuth) {
      window.TitanAuth.openAuthModal('login', () => {
        openRedeemModal(itemId);
      });
    }
    return;
  }

  const redeemList = (typeof window.getRedeemItems === 'function')
    ? window.getRedeemItems()
    : (typeof REDEEM_ITEMS !== 'undefined' ? REDEEM_ITEMS : []);
  const item = redeemList.find(i => i.id === itemId);
  if (!item) return;

  pendingRedeem = item;
  const costVal = parseInt(item.cost || item.price, 10) || 0;

  const iconEl = document.getElementById('redeemModalIcon');
  if (iconEl) {
    if (item.image) {
      iconEl.innerHTML = `<img src="${item.image}" alt="${item.name}" style="width:54px; height:54px; border-radius:10px; object-fit:cover; border:2px solid var(--gold); box-shadow:0 4px 15px rgba(0,0,0,0.5);" />`;
    } else {
      iconEl.textContent = item.icon || '⭐';
    }
  }

  document.getElementById('redeemModalName').textContent  = item.name;
  document.getElementById('redeemModalDesc').textContent  = item.desc || '';
  document.getElementById('redeemModalBalance').textContent = '⭐ ' + playerData.points.toLocaleString();
  document.getElementById('redeemModalCost').textContent   = '- ⭐ ' + costVal.toLocaleString();
  document.getElementById('redeemModalRemaining').textContent = '⭐ ' + Math.max(0, playerData.points - costVal).toLocaleString();
  
  const nickInput = document.getElementById('redeemNick');
  if (nickInput) {
    const savedMcNick = getSavedMinecraftNick();
    nickInput.value = savedMcNick || (user ? user.nick : '');
  }

  document.getElementById('redeemModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ─ Helper: Obtener Nick de Minecraft guardado ─── */
function getSavedMinecraftNick() {
  const user = (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getCurrentUser === 'function') ? TitanAuth.getCurrentUser() : null;
  if (user && user.nick) {
    const userSpecific = localStorage.getItem('titanMinecraftNick_' + user.nick.toLowerCase());
    if (userSpecific) return userSpecific;
    if (user.mcNick) return user.mcNick;
  }
  return localStorage.getItem('titanMinecraftNick') || (user ? user.nick : '');
}

/* ─ Cambiar / Guardar Nick de Minecraft ───────── */
window.saveMinecraftNick = function() {
  const input = document.getElementById('minecraftNickInput');
  const newNick = input?.value.trim();

  if (!newNick) {
    showToast('⚠️ Por favor escribe tu Nick de Minecraft Bedrock', 'warning');
    input?.focus();
    return;
  }

  const user = (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getCurrentUser === 'function') ? TitanAuth.getCurrentUser() : null;

  localStorage.setItem('titanMinecraftNick', newNick);
  if (user && user.nick) {
    localStorage.setItem('titanMinecraftNick_' + user.nick.toLowerCase(), newNick);
    user.mcNick = newNick;
    localStorage.setItem('titanAuthUser', JSON.stringify(user));

    try {
      const users = JSON.parse(localStorage.getItem('titanUsers') || '[]');
      const idx = users.findIndex(u => u.nick && u.nick.toLowerCase() === user.nick.toLowerCase());
      if (idx !== -1) {
        users[idx].mcNick = newNick;
        localStorage.setItem('titanUsers', JSON.stringify(users));
      }
    } catch(e) {}
  }

  const savedTag = document.getElementById('mcNickSavedTag');
  if (savedTag) {
    savedTag.textContent = '✓ Guardado';
    setTimeout(() => { if (savedTag) savedTag.textContent = ''; }, 3000);
  }

  // La foto principal en Canje SIEMPRE lleva la foto del perfil de la página web
  const avatar = document.getElementById('playerAvatar');
  if (avatar && user && user.nick) {
    const avatarUrl = (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getUserAvatar === 'function')
      ? TitanAuth.getUserAvatar(user, 80)
      : (user.picture || user.customAvatar || 'assets/logo.png');
    const aura = user.avatarAura || '';
    avatar.innerHTML = `<img class="${aura}" src="${avatarUrl}" onerror="this.src='assets/logo.png'" style="width:100%;height:100%;border-radius:12px;object-fit:cover;border:2px solid var(--gold);" alt="${user.nick}" />`;
  }

  // Actualizar input del modal de canje
  const redeemNick = document.getElementById('redeemNick');
  if (redeemNick) redeemNick.value = newNick;

  showToast(`🎮 ¡Nick de Minecraft actualizado a "${newNick}" con éxito!`, 'success');
};

/* ─ Close Redeem Modal ───────────────────────── */
function closeRedeemModal() {
  document.getElementById('redeemModal')?.classList.remove('active');
  document.body.style.overflow = '';
  pendingRedeem = null;
}

/* ─ Confirm Redeem ───────────────────────────────── */
function confirmRedeem() {
  if (!pendingRedeem) return;

  const user = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  if (!user) {
    showToast('Debes iniciar sesión para canjear', 'error');
    if (window.TitanAuth) window.TitanAuth.openAuthModal('login');
    return;
  }

  const mcNick = document.getElementById('redeemNick')?.value?.trim();
  if (!mcNick) {
    showToast('⚠️ Por favor escribe tu nick exacto de Minecraft para poder entregarte el ítem en el servidor', 'error');
    document.getElementById('redeemNick')?.focus();
    return;
  }

  // Guardar nick de Minecraft recordado tanto global como para el usuario
  localStorage.setItem('titanMinecraftNick', mcNick);
  if (user && user.nick) {
    localStorage.setItem('titanMinecraftNick_' + user.nick.toLowerCase(), mcNick);
    user.mcNick = mcNick;
    localStorage.setItem('titanAuthUser', JSON.stringify(user));
  }
  const mcInput = document.getElementById('minecraftNickInput');
  if (mcInput) mcInput.value = mcNick;

  const cost = parseInt(pendingRedeem.cost || pendingRedeem.price, 10) || 0;

  if (playerData.points < cost) {
    showToast(`No tienes suficientes puntos (tienes ${playerData.points.toLocaleString()} ⭐ y el ítem cuesta ${cost.toLocaleString()} ⭐)`, 'error');
    return;
  }

  // Descontar puntos de la cuenta activa del usuario
  playerData.points -= cost;
  playerData.redeemed = (playerData.redeemed || 0) + 1;
  playerData.nick = user.nick;

  // Registrar transacción en el historial del jugador
  if (!Array.isArray(playerData.history)) playerData.history = [];
  playerData.history.unshift({
    date: new Date().toLocaleDateString('es'),
    desc: `🎁 Canje: ${pendingRedeem.name} (Minecraft: ${mcNick})`,
    change: -cost,
    balance: playerData.points
  });

  // Guardar datos del jugador y su perfil
  savePlayerData();

  // Guardar en la lista de canjes para visualización DIRECTA en el panel admin con el nombre de Minecraft
  try {
    const redeems = JSON.parse(localStorage.getItem('titanRedeemOrders') || '[]');
    const newRedeem = {
      id: 'CANJE-' + Date.now().toString(36).toUpperCase(),
      date: new Date().toLocaleDateString('es') + ' ' + new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      mcNick: mcNick,
      nick: mcNick, // Nombre de Minecraft directo
      accountUser: user.nick,
      authProvider: user.authProvider || 'web',
      itemName: pendingRedeem.name,
      cost: cost,
      status: 'Pendiente'
    };
    redeems.unshift(newRedeem);
    localStorage.setItem('titanRedeemOrders', JSON.stringify(redeems));
    if (window.TitanFirebase && typeof window.TitanFirebase.saveRedeemOrder === 'function') {
      window.TitanFirebase.saveRedeemOrder(newRedeem);
    }
    if (window.TitanFirebase && typeof window.TitanFirebase.saveProfile === 'function') {
      window.TitanFirebase.saveProfile(user.nick, playerData);
    }
  } catch(e) {}

  updateUI();
  renderRedeemGrid();
  renderHistory();
  closeRedeemModal();

  showToast(`🎉 ¡"${pendingRedeem.name}" canjeado con éxito para "${mcNick}"!`, 'success');
  launchConfetti();

  // Registrar notificación en el centro de notificaciones de la cuenta
  if (window.TitanAuth && typeof window.TitanAuth.addNotification === 'function') {
    window.TitanAuth.addNotification(
      '¡Recompensa Canjeada!',
      `Has canjeado ${pendingRedeem.name} (-${cost} pts). Se registrará para entrega a tu jugador "${mcNick}" en el servidor.`,
      '⭐',
      'reward'
    );
  }
}

/* ─ Reclamar Bono Diario de Puntos ────────────── */
function simulateDailyPoints() {
  const user = window.TitanAuth ? window.TitanAuth.getCurrentUser() : null;
  if (!user) {
    showToast('🔒 Inicia sesión con tu cuenta para reclamar el bono diario', 'info');
    if (window.TitanAuth) window.TitanAuth.openAuthModal('login');
    return;
  }

  const today = new Date().toDateString();
  const lastBonus = localStorage.getItem('titanDailyBonus_' + user.nick);
  if (lastBonus === today) {
    showToast('⏳ Ya reclamaste tu bono diario de hoy. ¡Vuelve mañana por más puntos!', 'warning');
    return;
  }

  localStorage.setItem('titanDailyBonus_' + user.nick, today);
  const bonus = 15;
  playerData.points += bonus;
  playerData.totalEarned += bonus;
  playerData.streak = (playerData.streak || 0) + 1;

  if (!Array.isArray(playerData.history)) playerData.history = [];
  playerData.history.unshift({
    date: new Date().toLocaleDateString('es'),
    desc: `🎁 Bono de login diario (+${bonus} pts)`,
    change: +bonus,
    balance: playerData.points
  });

  savePlayerData();
  updateUI();
  renderRedeemGrid();
  renderHistory();
  animatePoints();
  launchConfetti();
  showToast(`🎉 ¡Reclamaste tu bono diario de +${bonus} ⭐ puntos!`, 'success');
}

/* ─ Watch Video (+1 pto, máx por día ilimitado según lo que juegas) ─── */
function watchVideo() {
  const today = new Date().toDateString();
  if (playerData.lastDay !== today) {
    playerData.dailyRedeemed = 0;
    playerData.dailyVideos   = 0;
    playerData.lastDay       = today;
  }

  const VIDEO_DAILY_LIMIT = 20; // máximo 20 videos/día = 20 puntos
  if (playerData.dailyVideos >= VIDEO_DAILY_LIMIT) {
    showToast(`Ya viste el máximo de videos por hoy (${VIDEO_DAILY_LIMIT})`, 'error');
    return;
  }

  playerData.points      += 1;
  playerData.totalEarned += 1;
  playerData.dailyVideos += 1;

  playerData.history.unshift({
    date:    new Date().toLocaleDateString('es'),
    desc:    '🎥 Punto por ver video',
    change:  +1,
    balance: playerData.points
  });

  savePlayerData();
  updateUI();
  renderRedeemGrid();
  renderHistory();
  animatePoints();

  const left = VIDEO_DAILY_LIMIT - playerData.dailyVideos;
  showToast(`+1 punto por video. Te quedan ${left} videos disponibles hoy`, 'success');
}

/* ─ Add Test Points (Demo) ───────────────────── */
function addTestPoints(amount) {
  playerData.points      += amount;
  playerData.totalEarned += amount;

  playerData.history.unshift({
    date:    new Date().toLocaleDateString('es'),
    desc:    `Demo: puntos de prueba`,
    change:  +amount,
    balance: playerData.points
  });

  savePlayerData();
  updateUI();
  renderRedeemGrid();
  renderHistory();

  showToast(`+${amount} puntos agregados (modo demo)`, 'success');
  animatePoints();
}

/* ─ Animate Points Counter ───────────────────── */
function animatePoints() {
  const el = document.getElementById('pointsDisplay');
  if (!el) return;

  const target   = playerData.points;
  const current  = parseInt(el.textContent.replace(/,/g, ''), 10) || 0;
  const diff     = target - current;
  const steps    = 30;
  const stepVal  = diff / steps;
  let   step     = 0;

  const interval = setInterval(() => {
    step++;
    const val = Math.round(current + stepVal * step);
    el.textContent = val.toLocaleString();
    if (step >= steps) {
      el.textContent = target.toLocaleString();
      clearInterval(interval);
    }
  }, 30);
}

/* ─ Load Player ───────────────────────────────── */
function loadPlayer() {
  const user = (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getCurrentUser === 'function') ? TitanAuth.getCurrentUser() : null;
  const input = document.getElementById('nicknameInput')?.value.trim();

  if (!user) {
    showToast('🔒 Inicia sesión con tu cuenta para acceder y canjear tus puntos', 'info');
    if (typeof TitanAuth !== 'undefined') TitanAuth.openAuthModal('login');
    return;
  }

  // Si está autenticado pero escribe otro nick
  if (input && input.toLowerCase() !== user.nick.toLowerCase()) {
    if (user.role === 'admin') {
      // Como administrador, permite inspeccionar el perfil de otro jugador
      const savedProfiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      if (savedProfiles[input]) {
        playerData = savedProfiles[input];
        renderRedeemGrid();
        renderHistory();
        showToast(`🔍 Modo Admin: Visualizando datos de "${input}" (${playerData.points} pts)`, 'info');
        return;
      } else {
        showToast(`No se encontró el perfil de "${input}"`, 'warning');
        return;
      }
    } else {
      showToast(`Estás en la sesión de "${user.nick}". Tus puntos se gestionan desde tu cuenta.`, 'info');
    }
  }

  syncPlayerWithActiveAuth();
  updateUI();
  renderRedeemGrid();
  renderHistory();
  showToast(`⭐ Puntos de "${user.nick}": ${playerData.points} pts`, 'success');
}

/* ─ Update UI ─────────────────────────────────── */
function updateUI() {
  syncPlayerWithActiveAuth();

  // Points display
  const el = document.getElementById('pointsDisplay');
  if (el) el.textContent = playerData.points.toLocaleString();

  // Stats
  const statTotal    = document.getElementById('statTotal');
  const statRedeemed = document.getElementById('statRedeemed');
  const statHours    = document.getElementById('statHours');
  const statRank     = document.getElementById('statRank');
  const statStreak   = document.getElementById('statStreak');

  if (statTotal)    statTotal.textContent    = playerData.totalEarned.toLocaleString();
  if (statRedeemed) statRedeemed.textContent = playerData.redeemed;
  if (statHours)    statHours.textContent    = playerData.hours + 'h';
  if (statStreak)   statStreak.textContent   = playerData.streak + ' días';

  // Rank by total earned
  const rank = playerData.totalEarned >= 5000 ? '#1-50'
    : playerData.totalEarned >= 1000 ? '#51-200'
    : playerData.totalEarned >= 200  ? '#200+'
    : '#--';
  if (statRank) statRank.textContent = rank;

  // Player display
  const nameDisplay = document.getElementById('playerNameDisplay');
  const rankDisplay = document.getElementById('playerRankDisplay');
  const avatar      = document.getElementById('playerAvatar');

  const user = (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getCurrentUser === 'function') ? TitanAuth.getCurrentUser() : null;

  const mcNick = getSavedMinecraftNick();

  if (user && user.nick) {
    if (nameDisplay) nameDisplay.textContent = user.nick;
    if (avatar) {
      // SIEMPRE utilizar la foto del perfil de la página web (Discord, Google, Custom Avatar)
      const avatarUrl = (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getUserAvatar === 'function')
        ? TitanAuth.getUserAvatar(user, 80)
        : (user.picture || user.customAvatar || `https://crafatar.com/avatars/${encodeURIComponent(user.nick)}?size=80&overlay`);
      const aura = user.avatarAura || '';
      avatar.innerHTML = `<img class="${aura}" src="${avatarUrl}" onerror="this.src='assets/logo.png'" style="width:100%;height:100%;border-radius:12px;object-fit:cover;border:2px solid var(--gold);" alt="${user.nick}" />`;
    }

    if (rankDisplay) {
      if (user.role === 'admin') {
        rankDisplay.innerHTML = '👑 Administrador';
      } else if (user.authProvider === 'discord') {
        rankDisplay.innerHTML = `💬 Discord (${user.discordTag || '@' + user.nick})`;
      } else if (user.authProvider === 'google') {
        rankDisplay.innerHTML = '🌐 Google Verificado';
      } else {
        const rankName = playerData.totalEarned >= 2000 ? '⭐ Leyenda'
          : playerData.totalEarned >= 1000 ? '💜 Élite'
          : playerData.totalEarned >= 200  ? '💙 Noble'
          : '⚔️ Sin Rango';
        rankDisplay.textContent = rankName;
      }
    }
  } else {
    if (nameDisplay) nameDisplay.textContent = 'Sin Sesión';
    if (avatar) avatar.innerHTML = '👤';
    if (rankDisplay) rankDisplay.textContent = 'Inicia sesión para ver tus puntos';
  }

  // Sincronizar input de Minecraft Nick
  const mcInput = document.getElementById('minecraftNickInput');
  if (mcInput && (!mcInput.value || mcInput.value === user?.nick || mcInput.value === '')) {
    mcInput.value = mcNick;
  }
  if (mcInput && !mcInput.dataset.enterBound) {
    mcInput.dataset.enterBound = 'true';
    mcInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.saveMinecraftNick();
      }
    });
  }
}

/* ─ Render History ───────────────────────────── */
function renderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  if (!playerData.history.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px;">
          📜 No hay historial aún. ¡Empieza a jugar!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = playerData.history.slice(0, 20).map(entry => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.desc}</td>
      <td class="${entry.change > 0 ? 'history-points-gain' : 'history-points-spend'}">
        ${entry.change > 0 ? '+' : ''}${entry.change.toLocaleString()} ⭐
      </td>
      <td style="color:var(--gold);">${entry.balance.toLocaleString()} ⭐</td>
    </tr>
  `).join('');
}

/* ─ Save Player Data ─────────────────────────── */
function savePlayerData() {
  localStorage.setItem('titanPlayer', JSON.stringify(playerData));
  if (playerData.nick) {
    const savedProfiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
    savedProfiles[playerData.nick] = { ...playerData };
    localStorage.setItem('titanProfiles', JSON.stringify(savedProfiles));
  }
  if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.updateAuthUI === 'function') {
    TitanAuth.updateAuthUI();
  }
}

/* ─ Confetti ──────────────────────────────────── */
function launchConfetti() {
  const colors = ['#ffd700','#7b2fff','#ff6b35','#c77dff','#00ff88','#ffe55c'];
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-particle';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: 0;
        width: ${Math.random() * 10 + 4}px;
        height: ${Math.random() * 10 + 4}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 2 + 2}s;
        animation-delay: ${Math.random() * 0.5}s;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 25);
  }
}

/* ─ Close modal on overlay click ─────────────── */
document.addEventListener('click', (e) => {
  if (e.target.id === 'redeemModal') closeRedeemModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeRedeemModal();
});

/* ─ Simulate daily point gain ────────────────────────── */
function simulateDailyPoints() {
  const lastVisit = localStorage.getItem('titanLastVisit');
  const today = new Date().toDateString();

  if (lastVisit !== today) {
    // ━━ 5 puntos por login diario ━━
    const bonus = 5;
    playerData.points      += bonus;
    playerData.totalEarned += bonus;
    playerData.streak       = (playerData.streak || 0) + 1;
    playerData.hours        = (playerData.hours || 0) + Math.floor(Math.random() * 3 + 1);

    // Resetear contadores diarios
    playerData.dailyRedeemed = 0;
    playerData.dailyVideos   = 0;
    playerData.lastDay       = today;

    playerData.history.unshift({
      date:    new Date().toLocaleDateString('es'),
      desc:    `🎁 Login diario (Racha día ${playerData.streak})`,
      change:  +bonus,
      balance: playerData.points
    });

    localStorage.setItem('titanLastVisit', today);
    savePlayerData();

    setTimeout(() => {
      showToast(`📅 +${bonus} puntos por login diario! Racha: ${playerData.streak} días`, 'success');
    }, 1500);
  }
}

/* ─ Init ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  renderRedeemGrid();
  renderHistory();
  simulateDailyPoints();
});

window.addEventListener('titanRedeemItemsUpdated', () => {
  if (typeof renderRedeemGrid === 'function') renderRedeemGrid();
});

window.addEventListener('storage', (e) => {
  if (e.key === 'titanCustomRedeemItems' && typeof renderRedeemGrid === 'function') {
    renderRedeemGrid();
  }
});
