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

try {
  const savedData = localStorage.getItem('titanPlayer');
  if (savedData) {
    const parsed = JSON.parse(savedData);
    playerData = { ...playerData, ...parsed };
  }
} catch (e) {
  console.error("Error loading titanPlayer from localStorage:", e);
}

if (!Array.isArray(playerData.history)) {
  playerData.history = [];
}

let pendingRedeem = null;

/* ─ Redeem Items Catalog loaded from productos.js ─────────────────────── */

/* ─ Current Category ─────────────────────────── */
let currentRedeemCat = 'todo';

/* ─ Render Redeem Grid ───────────────────────── */
function renderRedeemGrid() {
  const grid = document.getElementById('redeemGrid');
  if (!grid) return;

  const items = currentRedeemCat === 'todo'
    ? REDEEM_ITEMS
    : REDEEM_ITEMS.filter(i => i.cat === currentRedeemCat);

  grid.innerHTML = items.map(item => {
    const canAfford = playerData.points >= item.cost;
    const locked    = !canAfford;

    return `
      <div class="redeem-card ${locked ? 'locked' : ''} reveal">
        <div class="redeem-banner ${item.banner}">
          <span style="font-size:3.5rem;">${item.icon}</span>
          ${item.badge ? `<div style="position:absolute;top:10px;right:10px;" class="badge badge-exclusive">${item.badge}</div>` : ''}
        </div>
        <div class="redeem-body">
          <h3 class="redeem-name">${item.name}</h3>
          <p class="redeem-desc">${item.desc}</p>
          <div class="redeem-cost">
            <div class="cost-amount">
              <span>⭐</span> ${item.cost.toLocaleString()}
            </div>
            ${locked ? `<span class="badge" style="background:rgba(255,255,255,0.08);color:var(--text-muted);font-size:0.7rem;">Necesitas ${(item.cost - playerData.points).toLocaleString()} más</span>` : ''}
          </div>
          <button class="redeem-btn"
            onclick="openRedeemModal('${item.id}')"
            ${locked ? 'disabled' : ''}>
            ${locked ? '🔒 Puntos insuficientes' : '⭐ Canjear'}
          </button>
        </div>
        ${locked ? `
          <div class="lock-overlay">
            <span>🔒</span>
            <span>Necesitas ${(item.cost - playerData.points).toLocaleString()} pts más</span>
          </div>
        ` : ''}
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
  const item = REDEEM_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  pendingRedeem = item;

  document.getElementById('redeemModalIcon').textContent  = item.icon;
  document.getElementById('redeemModalName').textContent  = item.name;
  document.getElementById('redeemModalDesc').textContent  = item.desc;
  document.getElementById('redeemModalBalance').textContent = '⭐ ' + playerData.points.toLocaleString();
  document.getElementById('redeemModalCost').textContent   = '- ⭐ ' + item.cost.toLocaleString();
  document.getElementById('redeemModalRemaining').textContent = '⭐ ' + (playerData.points - item.cost).toLocaleString();
  document.getElementById('redeemNick').value = playerData.nick || '';

  document.getElementById('redeemModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ─ Close Redeem Modal ───────────────────────── */
function closeRedeemModal() {
  document.getElementById('redeemModal')?.classList.remove('active');
  document.body.style.overflow = '';
  pendingRedeem = null;
}

/* ─ Confirm Redeem ───────────────────────────────── */
function confirmRedeem() {
  if (!pendingRedeem) return;

  const nick = document.getElementById('redeemNick')?.value.trim();
  if (!nick) {
    showToast('Ingresa tu nick de Minecraft', 'error');
    return;
  }

  if (playerData.points < pendingRedeem.cost) {
    showToast('No tienes suficientes puntos', 'error');
    return;
  }

  // ━━ Límite diario de canje: máximo 10 puntos por día ━━
  const today = new Date().toDateString();
  if (playerData.lastDay !== today) {
    playerData.dailyRedeemed = 0;
    playerData.dailyVideos   = 0;
    playerData.lastDay       = today;
  }

  const DAILY_REDEEM_LIMIT = 10;
  if (playerData.dailyRedeemed + pendingRedeem.cost > DAILY_REDEEM_LIMIT) {
    const remaining = DAILY_REDEEM_LIMIT - playerData.dailyRedeemed;
    showToast(`Límite diario: solo puedes canjear ${remaining} pts más hoy`, 'error');
    return;
  }

  playerData.points         -= pendingRedeem.cost;
  playerData.redeemed       += 1;
  playerData.dailyRedeemed  += pendingRedeem.cost;
  playerData.nick            = nick;

  playerData.history.unshift({
    date:    new Date().toLocaleDateString('es'),
    desc:    `Canje: ${pendingRedeem.name}`,
    change:  -pendingRedeem.cost,
    balance: playerData.points
  });

  savePlayerData();
  updateUI();
  renderRedeemGrid();
  renderHistory();
  closeRedeemModal();

  showToast(`🎉 ¡${pendingRedeem.name} canjeado! Se enviará a ${nick}`, 'success');
  launchConfetti();
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
  const input = document.getElementById('nicknameInput')?.value.trim();
  if (!input) {
    showToast('Ingresa tu nick de Minecraft', 'error');
    return;
  }

  playerData.nick = input;

  // Load the data for this specific nickname if it was saved before,
  // or generate a realistic mock profile so the user has points to start with.
  const savedProfiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
  if (savedProfiles[input]) {
    playerData = savedProfiles[input];
  } else {
    // Generate empty profile starting at 0
    playerData.points = 0;
    playerData.totalEarned = 0;
    playerData.redeemed = 0;
    playerData.hours = 0;
    playerData.streak = 0;
    playerData.history = [];
    
    savedProfiles[input] = playerData;
    localStorage.setItem('titanProfiles', JSON.stringify(savedProfiles));
  }

  savePlayerData();
  updateUI();
  renderRedeemGrid();
  renderHistory();
  showToast(`✅ Datos de "${input}" cargados exitosamente`, 'success');
}

/* ─ Update UI ─────────────────────────────────── */
function updateUI() {
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

  if (nameDisplay) nameDisplay.textContent = playerData.nick || 'Jugador';
  if (avatar && playerData.nick) {
    avatar.innerHTML = `<img src="https://crafatar.com/avatars/${encodeURIComponent(playerData.nick)}?size=80&overlay" onerror="this.parentElement.textContent='🧑'" style="width:100%;height:100%;border-radius:8px;" />`;
  }

  // Rank tag
  const rankName = playerData.totalEarned >= 2000 ? '⭐ Leyenda'
    : playerData.totalEarned >= 1000 ? '💜 Élite'
    : playerData.totalEarned >= 200  ? '💙 Noble'
    : '⚔️ Sin Rango';
  if (rankDisplay) rankDisplay.textContent = rankName;

  // Nickname input
  const nickInput = document.getElementById('nicknameInput');
  if (nickInput && playerData.nick) nickInput.value = playerData.nick;
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
