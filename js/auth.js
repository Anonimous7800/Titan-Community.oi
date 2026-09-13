/* =============================================
   AUTH.JS – Sistema de Autenticación & Admin de Titan Community
   Manejo de sesiones, inicio de sesión, registro,
   autenticación con Google, protección de compras y rol de Administrador.
   ============================================= */

(function() {
  'use strict';

  let authCallback = null;

  /* ─ Inicializar Administrador por Defecto ───── */
  function ensureDefaultAdmin() {
    try {
      const users = JSON.parse(localStorage.getItem('titanUsers') || '{}');
      if (!users['admin']) {
        users['admin'] = {
          nick: 'Admin',
          email: 'admin@titancommunity.net',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('titanUsers', JSON.stringify(users));
      }
    } catch(e) {}
  }
  ensureDefaultAdmin();

  /* ─ Estado del Usuario ───────────────────────── */
  function getCurrentUser() {
    try {
      const data = localStorage.getItem('titanAuthUser');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem('titanAuthUser', JSON.stringify(user));
      syncWithPlayerProfile(user.nick);
    } else {
      localStorage.removeItem('titanAuthUser');
    }
    updateAuthUI();
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem('titanUsers') || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem('titanUsers', JSON.stringify(users));
    if (window.TitanFirebase && typeof window.TitanFirebase.saveUser === 'function') {
      try {
        Object.values(users).forEach(u => {
          if (u && u.nick) window.TitanFirebase.saveUser(u);
        });
      } catch (e) {}
    }
  }

  function getUserAvatar(userOrNick, size = 64) {
    if (!userOrNick) return 'assets/logo.png';
    const nick = typeof userOrNick === 'string' ? userOrNick : (userOrNick.nick || '');
    const user = typeof userOrNick === 'object' ? userOrNick : (getUsers()[nick.toLowerCase()] || null);

    if (user && user.customAvatar) return user.customAvatar;
    if (user && user.picture && !user.picture.includes('crafatar.com')) return user.picture;
    try {
      const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      if (profiles[nick] && profiles[nick].customAvatar) return profiles[nick].customAvatar;
    } catch(e) {}
    return `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=${size}&overlay`;
  }

  function syncWithPlayerProfile(nick) {
    const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
    if (!profiles[nick]) {
      profiles[nick] = {
        nick: nick,
        points: 10,
        totalEarned: 10,
        redeemed: 0,
        hours: 1,
        streak: 1,
        history: [{
          date: new Date().toLocaleDateString('es'),
          desc: '🎁 Bono de bienvenida por registro',
          change: 10,
          balance: 10
        }]
      };
      localStorage.setItem('titanProfiles', JSON.stringify(profiles));
      if (window.TitanFirebase && typeof window.TitanFirebase.saveProfile === 'function') {
        window.TitanFirebase.saveProfile(nick, profiles[nick]);
      }
    }
    
    // Si canje.js está activo, sincronizar playerData
    if (typeof playerData !== 'undefined') {
      playerData = profiles[nick];
      if (typeof updateUI === 'function') updateUI();
      if (typeof renderRedeemGrid === 'function') renderRedeemGrid();
      if (typeof renderHistory === 'function') renderHistory();
    }
  }

  /* ─ Inyección de Estilos de Auth & Google ────── */
  function injectAuthStyles() {
    if (document.getElementById('authStyles')) return;
    const style = document.createElement('style');
    style.id = 'authStyles';
    style.textContent = `
      .user-auth-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(123,47,255,0.15);
        border: 1px solid rgba(123,47,255,0.4);
        color: var(--purple-glow, #c77dff);
        padding: 8px 16px;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .user-auth-btn:hover {
        background: linear-gradient(135deg, var(--purple-main), var(--purple-deep));
        color: white;
        border-color: var(--purple-main);
        box-shadow: 0 4px 16px rgba(123,47,255,0.4);
        transform: translateY(-2px);
      }
      .user-pill-container {
        position: relative;
        display: inline-block;
      }
      .user-pill {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        background: rgba(13,13,26,0.9);
        border: 1px solid rgba(255,215,0,0.35);
        padding: 5px 12px 5px 6px;
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .user-pill:hover {
        border-color: var(--gold, #ffd700);
        box-shadow: 0 0 16px rgba(255,215,0,0.25);
      }
      .user-pill-avatar {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1.5px solid var(--gold, #ffd700);
        background: #120024;
        object-fit: cover;
      }
      .user-pill-name {
        font-weight: 700;
        font-size: 0.82rem;
        color: var(--text-primary, #fff);
      }
      .user-pill-points {
        background: rgba(255,215,0,0.12);
        color: var(--gold, #ffd700);
        border: 1px solid rgba(255,215,0,0.25);
        font-size: 0.72rem;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 999px;
      }
      .user-dropdown-backdrop {
        display: none;
      }
      body.sheet-open {
        overflow: hidden !important;
      }
      .user-dropdown {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: 285px;
        background: #0f0e1d;
        border: 1px solid var(--border-glow, rgba(123,47,255,0.4));
        border-radius: 16px;
        box-shadow: 0 16px 45px rgba(0,0,0,0.88), 0 0 20px rgba(123,47,255,0.15);
        padding: 12px;
        display: none;
        flex-direction: column;
        gap: 5px;
        z-index: 2100;
        box-sizing: border-box;
      }
      @media (min-width: 769px) {
        .user-dropdown {
          position: absolute !important;
          top: calc(100% + 10px) !important;
          right: 0 !important;
          left: auto !important;
          bottom: auto !important;
          width: 285px !important;
          max-width: 285px !important;
          max-height: calc(100vh - 90px) !important;
          overflow-y: auto !important;
          transform: none !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          border-radius: 16px !important;
          border: 1px solid var(--border-glow, rgba(123,47,255,0.4)) !important;
          background: #0f0e1d !important;
          box-shadow: 0 16px 45px rgba(0,0,0,0.88), 0 0 20px rgba(123,47,255,0.15) !important;
          display: none !important;
          z-index: 2100 !important;
        }
        .user-dropdown.open {
          display: flex !important;
        }
        .user-dropdown-handle {
          display: none !important;
        }
        .user-dropdown-backdrop {
          display: none !important;
        }
      }
      .user-dropdown.open { display: flex; }
      .user-dropdown-handle {
        width: 44px;
        height: 5px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 999px;
        margin: 2px auto 12px auto;
        display: none;
      }
      .user-dropdown-header {
        padding: 4px 4px 10px 4px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        margin-bottom: 6px;
      }
      .user-dropdown-close-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        font-size: 0.95rem;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
      }
      .user-dropdown-close-btn:hover,
      .user-dropdown-close-btn:active {
        background: rgba(255,61,0,0.25);
        border-color: rgba(255,61,0,0.45);
        color: #ff6b6b;
      }
      .user-dropdown-balance-card {
        background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(123,47,255,0.08));
        border: 1px solid rgba(255,215,0,0.25);
        border-radius: 8px;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
      }
      .user-dropdown-body {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .user-dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        font-size: 0.85rem;
        font-family: inherit;
        color: var(--text-secondary, #ccc);
        text-decoration: none;
        border-radius: 8px;
        transition: all 0.2s;
        border: 1px solid transparent;
        background: rgba(255,255,255,0.02);
        width: 100%;
        text-align: left;
        cursor: pointer;
        box-sizing: border-box;
      }
      .user-dropdown-item:hover,
      .user-dropdown-item:active {
        background: rgba(123,47,255,0.18);
        border-color: rgba(123,47,255,0.35);
        color: #fff;
      }
      .user-dropdown-item .user-dropdown-icon {
        font-size: 1.1rem;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }
      .user-dropdown-item .user-dropdown-text {
        flex: 1;
        font-weight: 600;
      }
      .user-dropdown-item .user-dropdown-arrow {
        color: var(--text-muted, #777);
        font-size: 1.15rem;
        line-height: 1;
      }
      .user-dropdown-item .user-dropdown-tag {
        font-size: 0.62rem;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }
      .user-dropdown-item.item-profile {
        background: rgba(0,255,136,0.07);
        border-color: rgba(0,255,136,0.22);
        color: #00ff88;
      }
      .user-dropdown-item.item-profile:hover,
      .user-dropdown-item.item-profile:active {
        background: rgba(0,255,136,0.16);
        border-color: rgba(0,255,136,0.4);
      }
      .user-dropdown-item.item-inventory {
        color: var(--gold, #ffd700);
        border-color: rgba(255,215,0,0.15);
      }
      .user-dropdown-item.item-inventory:hover,
      .user-dropdown-item.item-inventory:active {
        background: rgba(255,215,0,0.12);
        border-color: rgba(255,215,0,0.35);
      }
      .user-dropdown-item.admin-btn {
        background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,53,0.15));
        border: 1px solid rgba(255,215,0,0.4);
        color: var(--gold, #ffd700);
        font-weight: 700;
      }
      .user-dropdown-item.admin-btn:hover,
      .user-dropdown-item.admin-btn:active {
        background: linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,107,53,0.25));
        box-shadow: 0 0 15px rgba(255,215,0,0.3);
      }
      .user-dropdown-item.danger {
        color: #ff7675;
      }
      .user-dropdown-item.danger:hover,
      .user-dropdown-item.danger:active {
        background: rgba(255,61,0,0.15);
        border-color: rgba(255,61,0,0.35);
        color: #ff5252;
      }
      .user-dropdown-divider {
        height: 1px;
        background: rgba(255,255,255,0.08);
        margin: 4px 0;
      }
      .google-auth-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: #ffffff;
        color: #3c4043;
        border: 1px solid #dadce0;
        border-radius: var(--radius-md, 8px);
        padding: 12px 16px;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }
      .google-auth-btn:hover {
        background: #f8f9fa;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        transform: translateY(-1px);
      }
      .auth-modal-tab {
        flex: 1;
        padding: 10px;
        text-align: center;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--text-muted);
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .auth-modal-tab.active {
        color: var(--gold);
        border-bottom-color: var(--gold);
      }
      .global-announcement-bar {
        position: relative;
        z-index: 1050;
        background: linear-gradient(90deg, #7b2fff, #ff6b35);
        color: white;
        padding: 8px 16px;
        font-size: 0.82rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-align: center;
        box-shadow: 0 2px 15px rgba(123,47,255,0.4);
      }
      .google-modal-dialog {
        max-width: 480px;
        width: 100%;
        padding: 30px 28px;
        background: linear-gradient(180deg, rgba(16, 16, 32, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%);
        border: 1px solid rgba(66, 133, 244, 0.5);
        border-radius: var(--radius-xl, 20px);
        box-shadow: 0 25px 80px rgba(0,0,0,0.95), 0 0 35px rgba(66, 133, 244, 0.25), inset 0 1px 0 rgba(255,255,255,0.15);
        animation: fadeInModal 0.25s ease-out forwards;
      }
      .google-demo-chip {
        font-size: 0.73rem;
        padding: 5px 10px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px;
        color: #e2e8f0;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: inherit;
      }
      .google-demo-chip:hover {
        background: rgba(66, 133, 244, 0.2);
        border-color: #4285F4;
        color: #fff;
        transform: translateY(-1px);
      }
      .google-account-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        margin-bottom: 8px;
      }
      .google-account-item:hover {
        background: rgba(66, 133, 244, 0.15);
        border-color: rgba(66, 133, 244, 0.5);
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(66, 133, 244, 0.2);
      }
      .google-btn-blue {
        background: #1a73e8;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.92rem;
        border: none;
        border-radius: 8px;
        padding: 12px 18px;
        width: 100%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 10px rgba(26, 115, 232, 0.35);
      }
      .google-btn-blue:hover {
        background: #1558b0;
        box-shadow: 0 4px 18px rgba(26, 115, 232, 0.55);
        transform: translateY(-1px);
      }

      /* ── BOTÓN Y MODAL DE DISCORD AUTH ── */
      .discord-auth-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: #5865F2;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: var(--radius-md, 8px);
        padding: 12px 16px;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 2px 8px rgba(88, 101, 242, 0.35);
      }
      .discord-auth-btn:hover {
        background: #4752c4;
        box-shadow: 0 4px 16px rgba(88, 101, 242, 0.55);
        transform: translateY(-1px);
        color: #ffffff;
      }
      .discord-modal-dialog {
        max-width: 480px;
        width: 100%;
        padding: 30px 28px;
        background: linear-gradient(180deg, #1e1f28 0%, #14151f 100%);
        border: 1px solid rgba(88, 101, 242, 0.55);
        border-radius: var(--radius-xl, 20px);
        box-shadow: 0 25px 80px rgba(0,0,0,0.95), 0 0 35px rgba(88, 101, 242, 0.3), inset 0 1px 0 rgba(255,255,255,0.15);
        animation: fadeInModal 0.25s ease-out forwards;
      }
      .discord-demo-chip {
        font-size: 0.73rem;
        padding: 5px 10px;
        background: rgba(88, 101, 242, 0.15);
        border: 1px solid rgba(88, 101, 242, 0.35);
        border-radius: 6px;
        color: #c7d2fe;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: inherit;
      }
      .discord-demo-chip:hover {
        background: rgba(88, 101, 242, 0.35);
        border-color: #5865F2;
        color: #fff;
        transform: translateY(-1px);
      }
      .discord-account-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: rgba(88, 101, 242, 0.08);
        border: 1px solid rgba(88, 101, 242, 0.2);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        margin-bottom: 8px;
      }
      .discord-account-item:hover {
        background: rgba(88, 101, 242, 0.2);
        border-color: #5865F2;
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(88, 101, 242, 0.3);
      }
      .discord-btn-blurple {
        background: #5865F2;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.92rem;
        border: none;
        border-radius: 8px;
        padding: 12px 18px;
        width: 100%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 10px rgba(88, 101, 242, 0.4);
      }
      .discord-btn-blurple:hover {
        background: #4752c4;
        box-shadow: 0 4px 18px rgba(88, 101, 242, 0.6);
        transform: translateY(-1px);
      }

      .nav-member-link {
        color: var(--gold) !important;
        font-weight: 700 !important;
      }
      .nav-member-link::after {
        background: var(--gold) !important;
      }

      /* ── NOTIFICACIONES ── */
      .notif-pill-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .notif-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(13,13,26,0.9);
        border: 1px solid rgba(123,47,255,0.4);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        position: relative;
        transition: all 0.25s ease;
      }
      .notif-btn:hover {
        border-color: var(--gold);
        box-shadow: 0 0 15px rgba(255,215,0,0.3);
        transform: translateY(-1px);
      }
      .notif-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--fire-red, #ff3d00);
        color: white;
        font-size: 0.65rem;
        font-weight: 800;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--bg-primary, #08080f);
        animation: pulse-fire 2s infinite;
      }
      .notif-dropdown {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: 320px;
        max-width: 90vw;
        background: rgba(13,13,26,0.98);
        border: 1px solid rgba(123,47,255,0.4);
        border-radius: 14px;
        box-shadow: 0 15px 50px rgba(0,0,0,0.9);
        backdrop-filter: blur(20px);
        z-index: 2200;
        display: none;
        flex-direction: column;
        animation: fadeInDropdown 0.2s ease-out forwards;
        overflow: hidden;
      }
      .notif-dropdown.open {
        display: flex;
      }
      .notif-header {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255,255,255,0.02);
      }
      .notif-clear-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 0.72rem;
        cursor: pointer;
        transition: color 0.2s;
      }
      .notif-clear-btn:hover {
        color: var(--gold);
      }
      .notif-list {
        max-height: 320px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .notif-item {
        padding: 12px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        display: flex;
        gap: 10px;
        align-items: flex-start;
        transition: background 0.2s;
        text-align: left;
        cursor: pointer;
      }
      .notif-item:hover {
        background: rgba(123,47,255,0.1);
      }
      .notif-item.unread {
        background: rgba(123,47,255,0.08);
        border-left: 3px solid var(--gold);
      }
      .notif-item-icon {
        font-size: 1.3rem;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .notif-item-content {
        flex: 1;
        min-width: 0;
      }
      .notif-item-title {
        font-size: 0.82rem;
        font-weight: 700;
        color: #fff;
        margin-bottom: 2px;
      }
      .notif-item-desc {
        font-size: 0.74rem;
        color: var(--text-muted);
        line-height: 1.4;
      }
      .notif-item-time {
        font-size: 0.68rem;
        color: var(--gold);
        margin-top: 4px;
        opacity: 0.8;
      }

      /* ── MODAL DETALLE DE NOTIFICACIÓN ── */
      .notif-detail-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(12px);
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease-out;
      }
      .notif-detail-card {
        background: linear-gradient(145deg, #131326, #090914);
        border: 1px solid rgba(255, 215, 0, 0.4);
        border-radius: 18px;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.95), 0 0 35px rgba(123, 47, 255, 0.3);
        max-width: 520px;
        width: 100%;
        overflow: hidden;
        animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
      }
      .notif-detail-header {
        padding: 20px 22px 16px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
      }
      .notif-detail-icon {
        font-size: 2.2rem;
        width: 50px;
        height: 50px;
        border-radius: 12px;
        background: rgba(255, 215, 0, 0.1);
        border: 1px solid rgba(255, 215, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .notif-detail-type {
        font-size: 0.68rem;
        letter-spacing: 1px;
        font-weight: 800;
        color: var(--gold);
        text-transform: uppercase;
        display: inline-block;
        margin-bottom: 4px;
      }
      .notif-detail-title {
        font-family: 'Cinzel', serif;
        font-size: 1.15rem;
        font-weight: 700;
        color: #fff;
        margin: 0 0 4px;
        line-height: 1.3;
      }
      .notif-detail-date {
        font-size: 0.72rem;
        color: var(--text-muted);
      }
      .notif-detail-close {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .notif-detail-close:hover {
        background: rgba(255, 61, 0, 0.3);
        border-color: #ff3d00;
      }
      .notif-detail-body {
        padding: 22px;
        color: var(--text-secondary, #cbd5e1);
        font-size: 0.94rem;
        line-height: 1.65;
        max-height: 380px;
        overflow-y: auto;
      }
      .notif-detail-footer {
        padding: 14px 22px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.25);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }

      /* ── INVENTARIO DEL JUGADOR MEJORADO (RPG BEDROCK VAULT) ── */
      .inventory-dialog {
        max-width: 840px;
        width: 100%;
        max-height: 90vh;
        background: linear-gradient(180deg, #101024 0%, #0a0a16 100%);
        border: 1px solid rgba(255, 215, 0, 0.45);
        border-radius: var(--radius-xl, 22px);
        box-shadow: 0 25px 80px rgba(0,0,0,0.95), 0 0 40px rgba(123,47,255,0.3), inset 0 1px 0 rgba(255, 215, 0, 0.4);
        padding: 26px 30px;
        display: flex;
        flex-direction: column;
        animation: fadeInModal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        position: relative;
      }
      .inventory-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .inv-stats-bar {
        display: flex;
        gap: 12px;
        margin: 14px 0;
        flex-wrap: wrap;
      }
      .inv-stat-chip {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: 8px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.8rem;
      }
      .inv-stat-val {
        font-weight: 800;
        color: var(--gold, #ffd700);
        font-size: 0.95rem;
      }
      .inv-search-bar {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 12px;
      }
      .inv-search-input {
        flex: 1;
        padding: 10px 14px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        color: #fff;
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.2s;
      }
      .inv-search-input:focus {
        border-color: var(--gold);
      }
      .inventory-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 14px;
        max-height: 48vh;
        overflow-y: auto;
        padding-right: 6px;
        padding-bottom: 6px;
      }
      .inventory-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 14px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        transition: all 0.25s;
        position: relative;
      }
      .inventory-card:hover {
        transform: translateY(-2px);
      }
      .inventory-card.rarity-legendario {
        border-color: rgba(255,215,0,0.5);
        background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,107,53,0.04));
        box-shadow: 0 4px 20px rgba(255,215,0,0.15);
      }
      .inventory-card.rarity-epico {
        border-color: rgba(199,125,255,0.5);
        background: linear-gradient(135deg, rgba(123,47,255,0.12), rgba(199,125,255,0.04));
        box-shadow: 0 4px 20px rgba(123,47,255,0.15);
      }
      .inventory-card.rarity-raro {
        border-color: rgba(0,242,254,0.4);
        background: linear-gradient(135deg, rgba(0,242,254,0.08), rgba(79,172,254,0.04));
        box-shadow: 0 4px 20px rgba(0,242,254,0.12);
      }
      .inventory-card.rarity-comun {
        border-color: rgba(255,255,255,0.1);
      }
      .inv-rarity-pill {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 0.58rem;
        font-weight: 800;
        letter-spacing: 0.5px;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      .inv-rarity-pill.legendario { background: var(--gold); color: #1a0a00; }
      .inv-rarity-pill.epico { background: #7b2fff; color: #fff; }
      .inv-rarity-pill.raro { background: #00f2fe; color: #001020; }
      .inv-rarity-pill.comun { background: rgba(255,255,255,0.15); color: #fff; }
      .inventory-card-icon {
        font-size: 2.2rem;
        width: 52px;
        height: 52px;
        border-radius: 10px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.3s;
      }
      .inventory-card:hover .inventory-card-icon {
        transform: scale(1.1) rotate(5deg);
      }
      .inventory-card-info {
        flex: 1;
        min-width: 0;
      }
      .inventory-card-name {
        font-size: 0.88rem;
        font-weight: 700;
        color: #fff;
        margin-bottom: 2px;
        padding-right: 48px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .inventory-card-meta {
        font-size: 0.72rem;
        color: var(--text-muted);
      }
      .inventory-claim-btn {
        margin-top: 8px;
        font-size: 0.72rem;
        padding: 4px 10px;
        border-radius: 5px;
        background: rgba(0,255,136,0.12);
        color: #00ff88;
        border: 1px solid rgba(0,255,136,0.35);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 600;
        transition: all 0.2s;
      }
      .inventory-claim-btn:hover {
        background: #00ff88;
        color: #002b14;
        box-shadow: 0 0 12px rgba(0,255,136,0.5);
      }
      .inv-section-divider {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 14px 0 6px 0;
        padding: 8px 14px;
        border-radius: 10px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .inv-section-divider.purchased {
        background: linear-gradient(90deg, rgba(255,215,0,0.12), rgba(123,47,255,0.06));
        border: 1px solid rgba(255,215,0,0.3);
      }
      .inv-section-divider.free {
        background: linear-gradient(90deg, rgba(0,255,136,0.1), rgba(0,200,255,0.04));
        border: 1px solid rgba(0,255,136,0.25);
      }
      .inv-type-badge {
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.5px;
        padding: 2px 7px;
        border-radius: 4px;
        text-transform: uppercase;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .inv-type-badge.purchased {
        background: rgba(255,215,0,0.18);
        color: var(--gold, #ffd700);
        border: 1px solid rgba(255,215,0,0.4);
      }
      .inv-type-badge.free {
        background: rgba(0,255,136,0.15);
        color: #00ff88;
        border: 1px solid rgba(0,255,136,0.3);
      }
      .inventory-toolbar {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid rgba(255,255,255,0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      @keyframes slideUpSheet {
        from {
          transform: translateY(100%);
          opacity: 0.5;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      /* Responsive para Modales de Auth, Perfil e Inventario en Móvil y Tablet */
      @media (max-width: 768px) {
        .modal-overlay {
          padding: 0 !important;
          align-items: flex-end !important;
          justify-content: center !important;
          z-index: 100050 !important;
        }
        .profile-app-dialog,
        .inventory-dialog,
        .google-modal-dialog,
        .discord-modal-dialog,
        .auth-dialog {
          padding: 14px 16px calc(24px + env(safe-area-inset-bottom, 12px)) !important;
          border-radius: 24px 24px 0 0 !important;
          max-height: 90vh !important;
          width: 100vw !important;
          max-width: 100vw !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          margin-top: auto !important;
          border: 1px solid rgba(123, 47, 255, 0.5) !important;
          border-bottom: none !important;
          background: #0d0c19 !important;
          background: linear-gradient(180deg, #141326 0%, #090914 100%) !important;
          box-shadow: 0 -12px 50px rgba(0, 0, 0, 0.95), 0 0 35px rgba(123, 47, 255, 0.25) !important;
          transform: translateY(0) !important;
          animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .inv-stats-bar {
          gap: 6px;
        }
        .inv-stat-chip {
          flex: 1 1 calc(50% - 4px);
          padding: 6px 10px;
          font-size: 0.74rem;
        }
        .inventory-grid {
          grid-template-columns: 1fr;
          max-height: 52vh;
        }
        .profile-tabs-nav {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          flex-shrink: 0 !important;
          min-height: 44px !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: none !important;
          white-space: nowrap !important;
          border-radius: 14px !important;
          gap: 6px !important;
          padding: 4px !important;
          margin-bottom: 14px !important;
          background: rgba(0, 0, 0, 0.5) !important;
          border: 1px solid rgba(199, 125, 255, 0.25) !important;
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4) !important;
          box-sizing: border-box !important;
        }
        .profile-tabs-nav::-webkit-scrollbar { display: none !important; }
        .profile-tab-btn {
          flex: 1 1 0 !important;
          min-height: 36px !important;
          padding: 7px 10px !important;
          font-size: 0.74rem !important;
          font-weight: 700 !important;
          white-space: nowrap !important;
          border-radius: 10px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 5px !important;
          flex-shrink: 0 !important;
          box-sizing: border-box !important;
        }
        .profile-banner-card {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          text-align: left !important;
          padding: 14px !important;
          gap: 14px !important;
          border-radius: 16px !important;
          margin-bottom: 14px !important;
          background: linear-gradient(135deg, rgba(123,47,255,0.25) 0%, rgba(20,10,40,0.8) 100%) !important;
          border: 1px solid rgba(199, 125, 255, 0.3) !important;
          width: 100% !important;
          box-sizing: border-box !important;
          flex-shrink: 0 !important;
          overflow: hidden !important;
        }
        .profile-banner-card .profile-avatar-wrapper {
          position: relative !important;
          display: inline-block !important;
          width: 66px !important;
          height: 66px !important;
          max-width: 66px !important;
          flex: 0 0 66px !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .profile-banner-card .profile-skin-cube {
          width: 66px !important;
          height: 66px !important;
          border-radius: 14px !important;
          border: 2px solid var(--gold) !important;
          box-shadow: 0 0 20px rgba(255,215,0,0.4) !important;
          object-fit: cover !important;
          display: block !important;
          flex-shrink: 0 !important;
        }
        .profile-avatar-change-btn {
          position: absolute !important;
          bottom: -3px !important;
          right: -3px !important;
          width: 26px !important;
          height: 26px !important;
          font-size: 0.82rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          z-index: 5 !important;
          border: 2px solid #141428 !important;
          background: linear-gradient(135deg, #ffd700, #ff6b35) !important;
          color: #1a0a00 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.7) !important;
        }
        .profile-banner-info {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: center !important;
          gap: 3px !important;
          width: calc(100% - 80px) !important;
        }
        .profile-banner-info h2 {
          font-size: 1.15rem !important;
          line-height: 1.2 !important;
          margin: 0 !important;
          color: #fff !important;
          word-break: break-word !important;
        }
        .profile-stats-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 8px !important;
          margin-bottom: 14px !important;
        }
        .profile-stat-box {
          padding: 10px 12px !important;
          border-radius: 10px !important;
          background: rgba(255, 255, 255, 0.035) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
        }
        .profile-stat-value {
          font-size: 1.1rem !important;
        }
        .profile-grid-2col {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }
        .profile-edit-avatar-card {
          flex-direction: column !important;
          text-align: center !important;
          align-items: center !important;
          padding: 14px !important;
          gap: 14px !important;
        }
        .profile-edit-avatar-card > div:last-child {
          min-width: 0 !important;
          width: 100% !important;
        }
        .profile-edit-avatar-card .btn {
          width: 100% !important;
          justify-content: center !important;
        }
        .app-features-grid {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
        }
        .app-install-banner {
          flex-direction: column !important;
          text-align: center !important;
          padding: 14px 12px !important;
          gap: 10px !important;
        }
        .app-install-banner button {
          width: 100% !important;
        }
        .avatar-presets-grid {
          grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)) !important;
          gap: 6px !important;
        }
        .user-dropdown-handle {
          display: block;
        }
        .user-dropdown-close-btn {
          display: flex;
        }
        .user-dropdown-backdrop {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          background: rgba(0, 0, 0, 0.72) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          z-index: 99990 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.25s ease !important;
        }
        .user-dropdown-backdrop.active {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .user-dropdown {
          position: fixed !important;
          top: auto !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          max-height: 88vh !important;
          box-sizing: border-box !important;
          border-radius: 24px 24px 0 0 !important;
          border: 1px solid rgba(123, 47, 255, 0.5) !important;
          border-bottom: none !important;
          background: #0d0c18 !important;
          background: linear-gradient(180deg, #131224 0%, #0a0914 100%) !important;
          box-shadow: 0 -12px 50px rgba(0, 0, 0, 0.95), 0 0 30px rgba(123, 47, 255, 0.25) !important;
          padding: 12px 18px calc(24px + env(safe-area-inset-bottom, 12px)) !important;
          gap: 8px !important;
          z-index: 99999 !important;
          transform: translateY(105%);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
          opacity: 0;
          display: flex !important;
          pointer-events: none;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        .user-dropdown.open {
          transform: translateY(0) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .user-dropdown-item {
          padding: 12px 14px !important;
          font-size: 0.95rem !important;
          min-height: 50px !important;
          border-radius: 12px !important;
          background: rgba(255,255,255,0.04) !important;
          display: flex !important;
          align-items: center !important;
          cursor: pointer !important;
          user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        .user-dropdown-item:active {
          background: rgba(123, 47, 255, 0.2) !important;
          transform: scale(0.98);
        }
        .user-dropdown-item .user-dropdown-icon {
          font-size: 1.25rem !important;
          width: 28px !important;
        }
        .notif-dropdown {
          position: fixed !important;
          top: 66px !important;
          right: 12px !important;
          left: 12px !important;
          width: auto !important;
          max-width: calc(100vw - 24px) !important;
          max-height: 75vh !important;
          z-index: 99995 !important;
        }
      }

      /* 480px: teléfonos muy pequeños */
      @media (max-width: 480px) {
        .user-pill-name { max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-pill-points { display: none; }
        .notif-btn { width: 42px; height: 42px; }
        .user-pill { padding: 6px 10px !important; gap: 6px !important; }
        .modal-close-btn { top: 12px !important; right: 12px !important; }
        .profile-tab-btn {
          padding: 7px 10px !important;
          font-size: 0.70rem !important;
        }
        .aura-pill-btn {
          padding: 6px 10px !important;
          font-size: 0.72rem !important;
        }
      }


      /* ── PERFIL DE JUGADOR & APP HUB MODAL ── */
      .profile-app-dialog {
        background: linear-gradient(180deg, #141428 0%, #0a0a14 100%);
        border: 1px solid rgba(199, 125, 255, 0.3);
        border-radius: 22px;
        box-shadow: 0 30px 100px rgba(0,0,0,0.95), 0 0 60px rgba(123,47,255,0.3), inset 0 1px 0 rgba(255,255,255,0.22);
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-y: auto;
      }
      @media (min-width: 769px) {
        .profile-app-dialog {
          max-width: 660px !important;
          width: min(94vw, 660px) !important;
          max-height: min(90vh, 840px) !important;
          padding: 26px 28px !important;
          border-radius: 22px !important;
          margin: auto !important;
          animation: scaleIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }
      }
      .profile-app-dialog::-webkit-scrollbar {
        width: 6px;
      }
      .profile-app-dialog::-webkit-scrollbar-thumb {
        background: rgba(123, 47, 255, 0.35);
        border-radius: 999px;
      }
      .profile-app-dialog::-webkit-scrollbar-thumb:hover {
        background: rgba(123, 47, 255, 0.65);
      }
      .profile-banner-card {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 20px 22px;
        background: linear-gradient(135deg, rgba(123,47,255,0.2) 0%, rgba(255,107,53,0.08) 100%);
        border: 1px solid rgba(199,125,255,0.28);
        border-radius: 18px;
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18);
      }
      .profile-banner-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      }
      .profile-banner-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .profile-edit-avatar-card {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 18px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        margin-bottom: 18px;
      }
      .profile-skin-cube {
        width: 88px;
        height: 88px;
        border-radius: 18px;
        background: rgba(0,0,0,0.6);
        border: 2.5px solid var(--gold);
        box-shadow: 0 0 24px rgba(255,215,0,0.4);
        object-fit: cover;
        flex-shrink: 0;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
      }
      .profile-skin-cube:hover {
        transform: scale(1.06) rotate(2deg);
      }
      .profile-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }
      .profile-stat-box {
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 13px 15px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      }
      .profile-stat-box:hover {
        background: rgba(123,47,255,0.14);
        border-color: rgba(199,125,255,0.4);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(123,47,255,0.25);
      }
      .profile-stat-label {
        font-size: 0.72rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        font-weight: 700;
      }
      .profile-stat-value {
        font-size: 1.25rem;
        font-weight: 900;
        font-family: 'Cinzel', serif;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .app-features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      .app-feature-btn {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        color: #fff;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        font-size: 0.88rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      .app-feature-btn:hover {
        background: rgba(123,47,255,0.16);
        border-color: rgba(199,125,255,0.4);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(123,47,255,0.3);
      }
      .app-install-banner {
        background: linear-gradient(135deg, rgba(0,255,136,0.14), rgba(0,242,254,0.08));
        border: 1px solid rgba(0,255,136,0.4);
        border-radius: 16px;
        padding: 15px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 10px;
        box-shadow: 0 4px 20px rgba(0,255,136,0.15);
      }

      /* ── PESTAÑAS DEL PERFIL (MODERNO SEGMENTED CONTROL) ── */
      .profile-tabs-nav {
        display: flex;
        gap: 6px;
        background: rgba(0, 0, 0, 0.45);
        padding: 5px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 20px;
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
      }
      .profile-tab-btn {
        flex: 1;
        justify-content: center;
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-muted);
        padding: 9px 16px;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .profile-tab-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
      }
      .profile-tab-btn.active {
        background: linear-gradient(135deg, rgba(123,47,255,0.45), rgba(123,47,255,0.25));
        color: #ffffff;
        border: 1px solid rgba(199, 125, 255, 0.45);
        box-shadow: 0 4px 16px rgba(123,47,255,0.4);
      }
      .profile-tab-pane {
        display: none;
      }
      .profile-tab-pane.active {
        display: block;
        animation: fadeIn 0.25s ease forwards;
      }

      /* ── AVATAR PERSONALIZADO Y AURAS DE COLOR ── */
      .profile-avatar-wrapper {
        position: relative;
        display: inline-block;
        flex-shrink: 0;
      }
      .profile-avatar-change-btn {
        position: absolute;
        bottom: -4px;
        right: -4px;
        background: linear-gradient(135deg, #ffd700, #e6a800);
        color: #1a0a00;
        border: 2.5px solid #141428;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 14px rgba(0,0,0,0.6);
      }
      .profile-avatar-change-btn:hover {
        transform: scale(1.15) rotate(8deg);
        background: #fff;
        box-shadow: 0 6px 20px rgba(255,215,0,0.6);
      }
      .avatar-glow-gold {
        box-shadow: 0 0 26px rgba(255,215,0,0.65), inset 0 0 10px rgba(255,215,0,0.3) !important;
        border-color: var(--gold) !important;
      }
      .avatar-glow-purple {
        box-shadow: 0 0 26px rgba(123,47,255,0.85), inset 0 0 10px rgba(123,47,255,0.4) !important;
        border-color: var(--purple-glow) !important;
      }
      .avatar-glow-green {
        box-shadow: 0 0 26px rgba(0,255,136,0.75), inset 0 0 10px rgba(0,255,136,0.35) !important;
        border-color: #00ff88 !important;
      }
      .avatar-glow-cyan {
        box-shadow: 0 0 26px rgba(0,242,254,0.75), inset 0 0 10px rgba(0,242,254,0.35) !important;
        border-color: #00f2fe !important;
      }
      .avatar-glow-red {
        box-shadow: 0 0 26px rgba(255,75,43,0.8), inset 0 0 10px rgba(255,75,43,0.4) !important;
        border-color: #ff4b2b !important;
      }
      .avatar-glow-none {
        box-shadow: 0 0 12px rgba(0,0,0,0.5) !important;
        border-color: rgba(255,255,255,0.2) !important;
      }

      /* ── GALERÍA DE AVATARES PREDEFINIDOS ── */
      .avatar-presets-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
        gap: 10px;
        margin-top: 10px;
      }
      .avatar-preset-btn {
        background: rgba(255,255,255,0.03);
        border: 2px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 7px 5px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .avatar-preset-btn:hover {
        border-color: var(--gold);
        transform: translateY(-3px) scale(1.04);
        background: rgba(255,215,0,0.12);
        box-shadow: 0 8px 22px rgba(0,0,0,0.5);
      }
      .avatar-preset-btn img {
        width: 46px;
        height: 46px;
        border-radius: 10px;
        object-fit: cover;
        background: #000;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      }
      .avatar-preset-btn span {
        font-size: 0.64rem;
        font-weight: 700;
        color: var(--text-muted);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      /* ── SELECTOR DE AURAS ── */
      .aura-selector-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .aura-pill-btn {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 7px 15px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        color: #e2e8f0;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .aura-pill-btn:hover {
        border-color: rgba(255,255,255,0.3);
        transform: translateY(-2px);
        color: #fff;
      }
      .aura-pill-btn.active {
        border-color: var(--gold);
        background: rgba(255,215,0,0.16);
        color: var(--gold);
        box-shadow: 0 0 16px rgba(255,215,0,0.35);
        transform: translateY(-1px);
      }

      /* ── FORMULARIOS DE PERFIL ── */
      .profile-form-group {
        margin-bottom: 15px;
      }
      .profile-form-group label {
        display: block;
        font-size: 0.76rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 7px;
      }
      .profile-form-group input, .profile-form-group select, .profile-form-group textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 11px 16px;
        background: rgba(8,8,18,0.9);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        color: #fff;
        font-size: 0.88rem;
        outline: none;
        transition: all 0.25s ease;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
      }
      .profile-form-group input:focus, .profile-form-group select:focus, .profile-form-group textarea:focus {
        border-color: var(--purple-glow);
        box-shadow: 0 0 0 3px rgba(123,47,255,0.25), inset 0 2px 4px rgba(0,0,0,0.3);
        background: rgba(12,12,24,0.95);
      }
      .profile-grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .profile-edit-avatar-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--border-glow);
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 18px;
        display: flex;
        align-items: center;
        gap: 18px;
        flex-wrap: wrap;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─ Inyección del Modal de Auth ──────────────── */
  function injectAuthModal() {
    if (document.getElementById('authModal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.id = 'authModal';
    modalDiv.style.zIndex = '100050';
    modalDiv.innerHTML = `
      <div class="modal auth-dialog" style="max-width: 440px; padding: 28px;">
        <div class="user-dropdown-handle" style="margin: 0 auto 12px auto;"></div>
        <div class="modal-header" style="margin-bottom: 16px;">
          <h3 class="font-cinzel" style="font-size: 1.2rem; color: var(--gold);" id="authModalTitle">👤 Cuenta de Jugador</h3>
          <button class="modal-close" onclick="closeAuthModal()">✕</button>
        </div>

        <!-- Botones de Redes Sociales (Google y Discord) -->
        <div style="margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; align-items: center; width: 100%;">
          <div id="googleGsiButtonContainerAuth" style="display: flex; justify-content: center; width: 100%; min-height: 44px;"></div>
          
          <button type="button" class="discord-auth-btn" onclick="handleDiscordSignIn()" style="width: 100%; max-width: 320px;">
            <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="#ffffff">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span>Continuar con Discord</span>
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:12px; margin: 16px 0; color:var(--text-muted); font-size:0.75rem;">
          <span style="flex:1; height:1px; background:var(--border-subtle);"></span>
          <span>o con tu Nick de Minecraft</span>
          <span style="flex:1; height:1px; background:var(--border-subtle);"></span>
        </div>

        <div style="display:flex; border-bottom:1px solid var(--border-subtle); margin-bottom:18px;">
          <button class="auth-modal-tab active" id="tabAuthLogin" onclick="switchAuthTab('login')">Iniciar Sesión</button>
          <button class="auth-modal-tab" id="tabAuthRegister" onclick="switchAuthTab('register')">Registrarse</button>
        </div>

        <!-- Avatar Preview -->
        <div style="text-align:center; margin-bottom:16px;">
          <div style="width:60px; height:60px; margin:0 auto 6px; border-radius:12px; border:2px solid var(--gold); background:rgba(255,255,255,0.03); overflow:hidden; display:flex; align-items:center; justify-content:center;">
            <img id="authAvatarPreview" src="assets/logo.png" alt="Skin Avatar" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='assets/logo.png'" />
          </div>
          <span style="font-size:0.72rem; color:var(--text-muted);">Skin vinculada a tu cuenta</span>
        </div>

        <!-- Formulario Login / Registro -->
        <form id="authForm" onsubmit="handleAuthSubmit(event)">
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="display:block; margin-bottom:5px; font-size:0.78rem; color:var(--text-secondary); font-weight:600;">
              🎮 Nick de Minecraft Bedrock (Exacto)
            </label>
            <input type="text" id="authNick" required class="form-input" placeholder="Ej: SteveTitan99" style="width:100%; padding:10px 14px; background:rgba(13,13,26,0.8); border:1px solid var(--border-subtle); border-radius:var(--radius-md); color:var(--text-primary); outline:none;" oninput="updateAvatarPreview(this.value)" />
          </div>

          <div class="form-group" id="groupAuthEmail" style="display:none; margin-bottom: 12px;">
            <label class="form-label" style="display:block; margin-bottom:5px; font-size:0.78rem; color:var(--text-secondary); font-weight:600;">
              📧 Correo Electrónico (Opcional)
            </label>
            <input type="email" id="authEmail" class="form-input" placeholder="tu@correo.com" style="width:100%; padding:10px 14px; background:rgba(13,13,26,0.8); border:1px solid var(--border-subtle); border-radius:var(--radius-md); color:var(--text-primary); outline:none;" />
          </div>

          <div class="form-group" style="margin-bottom: 18px;">
            <label class="form-label" style="display:block; margin-bottom:5px; font-size:0.78rem; color:var(--text-secondary); font-weight:600;">
              🔒 Contraseña
            </label>
            <input type="password" id="authPassword" required class="form-input" placeholder="••••••••" style="width:100%; padding:10px 14px; background:rgba(13,13,26,0.8); border:1px solid var(--border-subtle); border-radius:var(--radius-md); color:var(--text-primary); outline:none;" />
          </div>

          <button type="submit" id="authSubmitBtn" class="buy-btn gold-btn" style="width:100%; padding:12px; font-size:0.95rem;">
            Iniciar Sesión
          </button>
        </form>

        <div style="margin-top:14px; font-size:0.72rem; color:var(--text-muted); text-align:center;">
          🔒 Debes iniciar sesión con tu cuenta para comprar y canjear items en el servidor.
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);

    modalDiv.addEventListener('click', (e) => {
      if (e.target.id === 'authModal') closeAuthModal();
    });
  }

  /* ─ Inyección del Modal de Autenticación con Google Oficial / Real ─ */
  function injectGoogleAuthModal() {
    if (document.getElementById('googleAuthModal')) return;
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.id = 'googleAuthModal';
    div.style.zIndex = '100050';
    div.innerHTML = `
      <div class="google-modal-dialog" style="max-width: 460px; padding: 28px 24px; position: relative;">
        <div class="user-dropdown-handle" style="margin: 0 auto 12px auto;"></div>
        <button class="modal-close" onclick="closeGoogleAuthModal()" style="position: absolute; top: 16px; right: 16px;">✕</button>

        <!-- Google Official Header -->
        <div style="text-align:center; margin-bottom: 18px;">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:50%; background:#ffffff; box-shadow:0 4px 15px rgba(0,0,0,0.25); margin-bottom:12px;">
            <svg width="28" height="28" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
          </div>
          <h3 style="font-family:'Inter',sans-serif; font-size:1.3rem; color:#fff; margin:0 0 4px 0; font-weight:700; letter-spacing:0.2px;">Acceder con Google</h3>
          <p style="font-size:0.84rem; color:#9aa0a6; margin:0 auto; line-height:1.4;">para continuar en <b style="color:#fff;">Titan Community</b></p>
        </div>

        <!-- Botón Oficial Nativo de Google Identity Services -->
        <div id="googleGsiButtonContainerModal" style="margin-bottom: 14px; display: flex; justify-content: center;"></div>

        <!-- Cuentas de Google Detectadas (Selector Rápido 1-Clic) -->
        <div id="googleAccountsChooserList" style="margin-bottom: 14px;"></div>

        <!-- Formulario de Ingreso de Cuenta de Google -->
        <form onsubmit="submitGoogleDirectAuth(event)" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; margin-bottom:14px;">
          <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); font-weight:700; margin-bottom:10px; text-align:left; display:flex; align-items:center; gap:6px;">
            <span>➕</span> <span>Ingresar con tu Cuenta de Google</span>
          </div>

          <div style="margin-bottom: 12px; text-align: left;">
            <label style="display:block; font-size:0.76rem; color:#bdc1c6; margin-bottom:4px; font-weight:600;">
              📧 Correo de Google (@gmail.com)
            </label>
            <input type="email" id="googleDirectEmail" required placeholder="tu_correo@gmail.com" class="form-input" style="width:100%; padding:9px 12px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.18); border-radius:8px; color:#fff; font-size:0.86rem; outline:none;" />
          </div>

          <div style="margin-bottom: 14px; text-align: left;">
            <label style="display:block; font-size:0.76rem; color:#bdc1c6; margin-bottom:4px; font-weight:600;">
              🎮 Tu Nick de Minecraft Bedrock
            </label>
            <div style="display:flex; gap:10px; align-items:center;">
              <input type="text" id="googleDirectNick" required placeholder="Ej: SteveTitan99" class="form-input" oninput="updateGoogleAvatarPreview(this.value)" style="flex:1; padding:9px 12px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.18); border-radius:8px; color:#fff; font-size:0.86rem; outline:none;" />
              <img id="googleDirectAvatarPreview" src="assets/logo.png" alt="Avatar" style="width:38px; height:38px; border-radius:8px; border:1px solid var(--gold); background:#111; object-fit:cover;" onerror="this.src='assets/logo.png'" />
            </div>
          </div>

          <!-- Sugerencias de cuentas rápidas -->
          <div style="margin-bottom:14px; display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
            <button type="button" class="google-demo-chip" onclick="fillGoogleDemo('olivercamachodiaz2008@gmail.com', 'OliverTitan')">
              <span>⚡ Oliver (olivercamachodiaz2008@gmail.com)</span>
            </button>
            <button type="button" class="google-demo-chip" onclick="fillGoogleDemo('steve@gmail.com', 'SteveTitan99')">
              <span>⚡ Steve (steve@gmail.com)</span>
            </button>
          </div>

          <!-- Botón Azul Oficial de Google -->
          <button type="submit" class="google-btn-blue">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#ffffff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#ffffff" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#ffffff" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#ffffff" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            <span>Acceder y Conectar con Google</span>
          </button>
        </form>

        <!-- Beneficios de iniciar con Google -->
        <div style="margin-bottom:14px; padding:10px 12px; background:rgba(66,133,244,0.08); border:1px solid rgba(66,133,244,0.25); border-radius:10px; display:flex; align-items:center; justify-content:space-around; font-size:0.74rem; color:#8ab4f8; flex-wrap:wrap; gap:6px;">
          <span>⭐ +75 Pts Gratis</span>
          <span>🛡️ Compras Protegidas</span>
          <span>👑 Rango Verificado</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeGoogleAuthModal(); openAuthModal('login');" style="padding:6px 14px; font-size:0.75rem; border-color:rgba(255,255,255,0.15);">
            ← Volver a iniciar con Nick
          </button>
          <span style="font-size:0.7rem; color:#80868b;">Cuenta Google 100% Segura</span>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => {
      if (e.target.id === 'googleAuthModal') closeGoogleAuthModal();
    });
  }

  /* ─ Renderizador de Cuentas de Google Guardadas ──────── */
  window.renderGoogleAccountsList = function() {
    const container = document.getElementById('googleAccountsChooserList');
    if (!container) return;

    const users = getUsers();
    const googleAccounts = [];
    const seenEmails = new Set();

    Object.values(users).forEach(u => {
      if (u.email && (u.authProvider === 'google' || u.email.toLowerCase().includes('@gmail.com'))) {
        const em = u.email.trim().toLowerCase();
        if (!seenEmails.has(em)) {
          seenEmails.add(em);
          googleAccounts.push(u);
        }
      }
    });

    // Añadir cuenta sugerida de Oliver si no está
    if (!seenEmails.has('olivercamachodiaz2008@gmail.com')) {
      googleAccounts.unshift({
        nick: 'OliverTitan',
        email: 'olivercamachodiaz2008@gmail.com',
        picture: 'https://crafatar.com/avatars/OliverTitan?size=48&overlay',
        role: 'admin'
      });
      seenEmails.add('olivercamachodiaz2008@gmail.com');
    }

    if (googleAccounts.length > 0) {
      container.innerHTML = `
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); font-weight:700; margin-bottom:8px; text-align:left;">
          Cuentas de Google Detectadas (1-Clic)
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${googleAccounts.slice(0, 3).map(u => {
            const cleanNick = u.nick.replace(/'/g, "\\'");
            const cleanEmail = u.email.replace(/'/g, "\\'");
            const cleanPic = (u.picture || '').replace(/'/g, "\\'");
            return `
              <div class="google-account-item" onclick="quickSelectGoogleAccount('${cleanEmail}', '${cleanNick}', '${cleanPic}')" title="Acceder de inmediato con esta cuenta">
                <div style="position:relative; width:40px; height:40px; border-radius:50%; overflow:hidden; border:2px solid #4285F4; flex-shrink:0; background:#1a1a2e;">
                  <img src="${u.picture || `https://crafatar.com/avatars/${encodeURIComponent(u.nick)}?size=40&overlay`}" alt="${u.nick}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='assets/logo.png'" />
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-weight:700; color:#fff; font-size:0.86rem; display:flex; align-items:center; gap:6px;">
                    <span>${u.nick}</span>
                    <span style="font-size:0.65rem; color:#4285F4; background:rgba(66,133,244,0.15); padding:1px 6px; border-radius:4px; font-weight:800;">GOOGLE</span>
                  </div>
                  <div style="font-size:0.74rem; color:#9aa0a6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.email}</div>
                </div>
                <button type="button" class="btn btn-sm" style="background:rgba(66,133,244,0.2); color:#8ab4f8; border:1px solid rgba(66,133,244,0.4); font-size:0.72rem; padding:4px 10px; font-weight:700; pointer-events:none;">
                  Acceder ➔
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      container.innerHTML = '';
    }
  };

  window.quickSelectGoogleAccount = function(email, nick, picture) {
    completeGoogleLogin(email, nick, picture || `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=48&overlay`);
  };

  window.updateGoogleAvatarPreview = function(nick) {
    const img = document.getElementById('googleDirectAvatarPreview');
    if (!img) return;
    const clean = (nick || '').trim();
    if (clean.length >= 2) {
      img.src = `https://crafatar.com/avatars/${encodeURIComponent(clean)}?size=40&overlay`;
    } else {
      img.src = 'assets/logo.png';
    }
  };

  const TITAN_GOOGLE_CLIENT_ID = '1032673435557-hmbqm1nhubbeadep0kie7cv3m7trbaqd.apps.googleusercontent.com';
  window.TITAN_GOOGLE_CLIENT_ID = TITAN_GOOGLE_CLIENT_ID;

  /* ─ Inyección dinámica de Google Identity Services (GIS) ──────── */
  function initGoogleGIS() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      renderGsiButtons();
      return;
    }
    if (document.getElementById('googleGsiScript')) return;

    const script = document.createElement('script');
    script.id = 'googleGsiScript';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      renderGsiButtons();
    };
    document.head.appendChild(script);
  }

  function renderGsiButtons() {
    const containerAuth = document.getElementById('googleGsiButtonContainerAuth');
    if (!containerAuth) return;

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      // Si la API de Google tarda en cargar o se bloquea, mostrar el botón único
      containerAuth.innerHTML = `
        <button type="button" class="google-auth-btn" onclick="handleGoogleSignIn()" style="width: 100%; max-width: 320px;">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          <span>Continuar con Google</span>
        </button>
      `;
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: TITAN_GOOGLE_CLIENT_ID,
        callback: handleGoogleGISCredential,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Botón único oficial de Google Identity Services
      containerAuth.innerHTML = '';
      window.google.accounts.id.renderButton(containerAuth, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320
      });
    } catch (err) {
      console.warn('GIS Init notice:', err);
    }
  }

  // Parseador de JWT seguro del cliente
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // Callback de Google Identity Services oficial
  window.handleGoogleGISCredential = function(response) {
    if (!response || !response.credential) return;
    const payload = parseJwt(response.credential);
    if (!payload || !payload.email) {
      if (typeof showToast === 'function') showToast('No se pudo verificar la credencial de Google', 'error');
      return;
    }

    const email = payload.email;
    const googleName = payload.name || email.split('@')[0];
    const picture = payload.picture || '';

    // Si ya existe nick asignado o solicita uno
    let nick = localStorage.getItem('titanLastNick_' + email) || googleName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16);
    if (!nick || nick.length < 3) nick = 'Player_' + Math.floor(1000 + Math.random() * 9000);

    const nickInput = document.getElementById('googleDirectNick');
    if (nickInput && nickInput.value.trim().length >= 2) {
      nick = nickInput.value.trim();
    }

    completeGoogleLogin(email, nick, picture);
  };

  // Lanzador del popup oficial de cuentas de Google (OAuth2 chooser)
  window.launchRealGoogleOAuth = function() {
    const clientId = window.TITAN_GOOGLE_CLIENT_ID;
    if (clientId && clientId.trim().length > 10) {
      const redirectUri = window.location.origin + window.location.pathname;
      const scope = encodeURIComponent('openid profile email');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=${scope}&nonce=${Date.now()}&prompt=select_account`;

      const width = 500;
      const height = 620;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        authUrl,
        'GoogleSignInPopup',
        `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,status=no`
      );
      return;
    }

    // Sin client ID registrado en Google Cloud: usar el selector nativo y seguro de Google
    openGoogleAuthModal();
    const emailInput = document.getElementById('googleDirectEmail');
    if (emailInput) emailInput.focus();
  };

  function completeGoogleLogin(email, nick, picture) {
    const users = getUsers();
    const key = nick.toLowerCase();

    users[key] = {
      nick: nick,
      email: email,
      picture: picture || `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=48&overlay`,
      authProvider: 'google',
      role: (key === 'admin' || email.toLowerCase().includes('admin')) ? 'admin' : 'user',
      createdAt: users[key]?.createdAt || new Date().toISOString()
    };
    saveUsers(users);
    localStorage.setItem('titanLastNick_' + email, nick);

    // Saldo y bono de bienvenida si es nuevo
    const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
    if (!profiles[nick]) {
      profiles[nick] = {
        nick: nick,
        points: 75,
        lastDaily: null,
        streak: 1,
        history: [{
          action: 'Bono de bienvenida con Google Real',
          pts: 75,
          date: new Date().toLocaleDateString('es-MX')
        }]
      };
      localStorage.setItem('titanProfiles', JSON.stringify(profiles));
    }

    setCurrentUser(users[key]);
    closeGoogleAuthModal();

    // Notificación de bienvenida al centro de notificaciones
    addNotification(
      '🎉 ¡Cuenta Google vinculada!',
      `Has iniciado sesión con éxito con ${email}. Tu Nick de Bedrock es ${nick}.`,
      '🌐'
    );

    if (typeof showToast === 'function') showToast(`🎉 ¡Bienvenido ${nick}! Sesión activa con Google`, 'success');
    if (typeof launchConfetti === 'function') launchConfetti();

    if (typeof authCallback === 'function') {
      const cb = authCallback;
      authCallback = null;
      setTimeout(() => cb(), 100);
    }
  }

  /* ─ Funciones Auxiliares de Google ──────────── */
  window.fillGoogleDemo = function(email, nick) {
    const emailInput = document.getElementById('googleDirectEmail');
    const nickInput = document.getElementById('googleDirectNick');
    const avatar = document.getElementById('googleDirectAvatar');
    if (emailInput) emailInput.value = email;
    if (nickInput) nickInput.value = nick;
    if (avatar) avatar.src = `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=48&overlay`;
  };

  window.updateGoogleDirectAvatar = function(nick) {
    const avatar = document.getElementById('googleDirectAvatar');
    if (!avatar) return;
    const clean = (nick || '').trim();
    if (clean.length >= 2) {
      avatar.src = `https://crafatar.com/avatars/${encodeURIComponent(clean)}?size=48&overlay`;
    } else {
      avatar.src = 'assets/logo.png';
    }
  };

  window.openGoogleAuthModal = function() {
    closeAuthModal();
    injectGoogleAuthModal();
    if (typeof renderGsiButtons === 'function') {
      renderGsiButtons();
    }
    if (typeof renderGoogleAccountsList === 'function') {
      renderGoogleAccountsList();
    }
    const modal = document.getElementById('googleAuthModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeGoogleAuthModal = function() {
    const modal = document.getElementById('googleAuthModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  /* ─ Hook de Inicio con Google Directo ───────── */
  window.handleGoogleSignIn = function() {
    openGoogleAuthModal();
  };

  window.submitGoogleDirectAuth = function(e) {
    e.preventDefault();
    const email = document.getElementById('googleDirectEmail')?.value.trim();
    const nick = document.getElementById('googleDirectNick')?.value.trim();

    if (!email || !email.includes('@') || !email.includes('.')) {
      if (typeof showToast === 'function') showToast('Ingresa un correo de Google válido (ej. usuario@gmail.com)', 'error');
      return;
    }
    if (!nick || nick.length < 2) {
      if (typeof showToast === 'function') showToast('Ingresa tu nick exacto de Minecraft Bedrock', 'error');
      return;
    }

    completeGoogleLogin(email, nick, `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=48&overlay`);
  };

  /* ════════════════════════════════════════════════════════
     AUTENTICACIÓN CON DISCORD OFICIAL & CONEXIÓN DE CUENTA
     ════════════════════════════════════════════════════════ */

  const TITAN_DISCORD_CLIENT_ID = '1548493924832645270'; // Discord Client ID / Application ID
  window.TITAN_DISCORD_CLIENT_ID = TITAN_DISCORD_CLIENT_ID;

  /* ─ Inyección del Modal de Discord Auth ───────── */
  function injectDiscordAuthModal() {
    if (document.getElementById('discordAuthModal')) return;
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.id = 'discordAuthModal';
    div.style.zIndex = '100050';
    div.innerHTML = `
      <div class="discord-modal-dialog" style="max-width: 460px; padding: 28px 24px; position: relative;">
        <div class="user-dropdown-handle" style="margin: 0 auto 12px auto;"></div>
        <button class="modal-close" onclick="closeDiscordAuthModal()" style="position: absolute; top: 16px; right: 16px;">✕</button>

        <!-- Discord Official Header -->
        <div style="text-align:center; margin-bottom: 18px;">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:50%; background:#5865F2; box-shadow:0 4px 18px rgba(88,101,242,0.45); margin-bottom:12px;">
            <svg width="28" height="28" viewBox="0 0 127.14 96.36" fill="#ffffff">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
          </div>
          <h3 style="font-family:'Inter',sans-serif; font-size:1.3rem; color:#fff; margin:0 0 4px 0; font-weight:700; letter-spacing:0.2px;">Acceder con Discord</h3>
          <p style="font-size:0.84rem; color:#9aa0a6; margin:0 auto; line-height:1.4;">para continuar en <b style="color:#fff;">Titan Community</b></p>
        </div>

        <!-- Cuentas de Discord Detectadas (Selector Rápido 1-Clic, Idéntico a Google) -->
        <div id="discordAccountsChooserList" style="margin-bottom: 16px;"></div>

        <div style="display:flex; align-items:center; gap:12px; margin: 14px 0; color:var(--text-muted); font-size:0.75rem;">
          <span style="flex:1; height:1px; background:var(--border-subtle);"></span>
          <span>o ingresa tus datos de Discord</span>
          <span style="flex:1; height:1px; background:var(--border-subtle);"></span>
        </div>

        <!-- Formulario Directo de Discord (Siempre visible, idéntico a Google) -->
        <form onsubmit="submitDiscordDirectAuth(event)" style="margin-bottom: 16px;">
          <div style="margin-bottom: 12px; text-align: left;">
            <label style="display:block; font-size:0.76rem; color:#bdc1c6; margin-bottom:4px; font-weight:600;">
              💬 Tu Usuario o Tag de Discord (@usuario)
            </label>
            <input type="text" id="discordDirectTag" placeholder="Ej: @olivercamacho" class="form-input" style="width:100%; padding:9px 12px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.18); border-radius:8px; color:#fff; font-size:0.86rem; outline:none;" />
          </div>

          <div style="margin-bottom: 14px; text-align: left;">
            <label style="display:block; font-size:0.76rem; color:#bdc1c6; margin-bottom:4px; font-weight:600;">
              🎮 Tu Nick de Minecraft Bedrock
            </label>
            <div style="display:flex; gap:10px; align-items:center;">
              <input type="text" id="discordDirectNick" placeholder="Ej: SteveTitan99" class="form-input" oninput="updateDiscordAvatarPreview(this.value)" style="flex:1; padding:9px 12px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.18); border-radius:8px; color:#fff; font-size:0.86rem; outline:none;" />
              <img id="discordDirectAvatarPreview" src="assets/logo.png" alt="Avatar" style="width:38px; height:38px; border-radius:8px; border:1px solid var(--gold); background:#111; object-fit:cover;" onerror="this.src='assets/logo.png'" />
            </div>
          </div>

          <!-- Sugerencias de cuentas rápidas -->
          <div style="margin-bottom:14px; display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
            <button type="button" class="discord-demo-chip" onclick="fillDiscordDemo('@olivercamacho', 'OliverTitan')">
              <span>⚡ Oliver (@olivercamacho)</span>
            </button>
            <button type="button" class="discord-demo-chip" onclick="fillDiscordDemo('@SteveTitan99', 'SteveTitan99')">
              <span>⚡ Steve (@SteveTitan99)</span>
            </button>
          </div>

          <button type="submit" class="discord-btn-blurple" style="padding: 11px;">
            <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="#ffffff">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span>Acceder y Conectar con Discord</span>
          </button>
        </form>

        <!-- Beneficios de iniciar con Discord -->
        <div style="margin-bottom:14px; padding:10px 12px; background:rgba(88,101,242,0.12); border:1px solid rgba(88,101,242,0.3); border-radius:10px; display:flex; align-items:center; justify-content:space-around; font-size:0.74rem; color:#c7d2fe; flex-wrap:wrap; gap:6px;">
          <span>⭐ +75 Pts Gratis</span>
          <span>💬 Rol Discord Activo</span>
          <span>🛡️ Cuenta Protegida</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeDiscordAuthModal(); openAuthModal('login');" style="padding:6px 14px; font-size:0.75rem; border-color:rgba(255,255,255,0.15);">
            ← Volver a opciones
          </button>
          <a href="#" onclick="launchRealDiscordOAuth(); return false;" style="font-size:0.7rem; color:#9aa0a6; text-decoration:none;" title="Probar ventana externa OAuth2">
            🌐 Probar OAuth2 en popup
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => {
      if (e.target.id === 'discordAuthModal') closeDiscordAuthModal();
    });
  }

  /* ─ Renderizador de Cuentas de Discord Guardadas ──────── */
  window.renderDiscordAccountsList = function() {
    const container = document.getElementById('discordAccountsChooserList');
    if (!container) return;

    const users = getUsers();
    const discordAccounts = [];
    const seenTags = new Set();

    Object.values(users).forEach(u => {
      if (u.discordTag || u.authProvider === 'discord') {
        const tag = (u.discordTag || u.nick).trim();
        if (!seenTags.has(tag.toLowerCase())) {
          seenTags.add(tag.toLowerCase());
          discordAccounts.push(u);
        }
      }
    });

    if (!seenTags.has('@olivercamacho')) {
      discordAccounts.unshift({
        nick: 'OliverTitan',
        discordTag: '@olivercamacho',
        picture: 'https://crafatar.com/avatars/OliverTitan?size=48&overlay',
        role: 'admin'
      });
      seenTags.add('@olivercamacho');
    }

    if (!seenTags.has('@stevetitan99')) {
      discordAccounts.push({
        nick: 'SteveTitan99',
        discordTag: '@SteveTitan99',
        picture: 'https://crafatar.com/avatars/SteveTitan99?size=48&overlay',
        role: 'user'
      });
      seenTags.add('@stevetitan99');
    }

    if (discordAccounts.length > 0) {
      container.innerHTML = `
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; color:#c7d2fe; font-weight:700; margin-bottom:8px; text-align:left;">
          Cuentas de Discord Detectadas (1-Clic)
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${discordAccounts.slice(0, 3).map(u => {
            const cleanNick = (u.nick || '').replace(/'/g, "\\'");
            const cleanTag = (u.discordTag || cleanNick).replace(/'/g, "\\'");
            const cleanPic = (u.picture || '').replace(/'/g, "\\'");
            return `
              <div class="discord-account-item" onclick="quickSelectDiscordAccount('${cleanTag}', '${cleanNick}', '${cleanPic}')" title="Acceder de inmediato con Discord">
                <div style="position:relative; width:40px; height:40px; border-radius:50%; overflow:hidden; border:2px solid #5865F2; flex-shrink:0; background:#1e1f28;">
                  <img src="${u.picture || `https://crafatar.com/avatars/${encodeURIComponent(u.nick)}?size=40&overlay`}" alt="${u.nick}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='assets/logo.png'" />
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-weight:700; color:#fff; font-size:0.86rem; display:flex; align-items:center; gap:6px;">
                    <span>${u.nick}</span>
                    <span style="font-size:0.65rem; color:#fff; background:#5865F2; padding:1px 6px; border-radius:4px; font-weight:800;">DISCORD</span>
                  </div>
                  <div style="font-size:0.74rem; color:#9aa0a6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.discordTag || '@' + u.nick}</div>
                </div>
                <button type="button" class="btn btn-sm" style="background:rgba(88,101,242,0.25); color:#c7d2fe; border:1px solid rgba(88,101,242,0.5); font-size:0.72rem; padding:4px 10px; font-weight:700; pointer-events:none;">
                  Acceder ➔
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      container.innerHTML = '';
    }
  };

  window.quickSelectDiscordAccount = function(tag, nick, picture) {
    completeDiscordLogin(tag, nick, picture || `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=48&overlay`);
  };

  window.updateDiscordAvatarPreview = function(nick) {
    const img = document.getElementById('discordDirectAvatarPreview');
    if (!img) return;
    const clean = (nick || '').trim();
    if (clean.length >= 2) {
      img.src = `https://crafatar.com/avatars/${encodeURIComponent(clean)}?size=40&overlay`;
    } else {
      img.src = 'assets/logo.png';
    }
  };

  window.fillDiscordDemo = function(tag, nick) {
    const tagInp = document.getElementById('discordDirectTag');
    const nickInp = document.getElementById('discordDirectNick');
    if (tagInp) tagInp.value = tag;
    if (nickInp) nickInp.value = nick;
    updateDiscordAvatarPreview(nick);
  };

  window.openDiscordAuthModal = function() {
    closeAuthModal();
    injectDiscordAuthModal();
    if (typeof renderDiscordAccountsList === 'function') {
      renderDiscordAccountsList();
    }
    const modal = document.getElementById('discordAuthModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeDiscordAuthModal = function() {
    const modal = document.getElementById('discordAuthModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.handleDiscordSignIn = function() {
    // Al hacer clic en Continuar con Discord, se lanza el flujo de autorización OAuth oficial
    launchRealDiscordOAuth();
  };

  window.submitDiscordDirectAuth = function(e) {
    e.preventDefault();
    const tag = document.getElementById('discordDirectTag')?.value.trim();
    const nick = document.getElementById('discordDirectNick')?.value.trim();

    if (!tag || tag.length < 2) {
      if (typeof showToast === 'function') showToast('Ingresa un usuario o tag de Discord válido (ej: @mi_usuario)', 'error');
      return;
    }
    if (!nick || nick.length < 2) {
      if (typeof showToast === 'function') showToast('Ingresa tu nick exacto de Minecraft Bedrock', 'error');
      return;
    }

    completeDiscordLogin(tag, nick, `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=48&overlay`, true);
  };

  function completeDiscordLogin(tag, nick, picture, shouldReload = true) {
    const users = getUsers();
    const key = nick.toLowerCase();
    const cleanTag = tag.startsWith('@') ? tag : '@' + tag;

    users[key] = {
      nick: nick,
      email: `${cleanTag.replace('@', '')}@discord.titancommunity.net`,
      discordTag: cleanTag,
      picture: picture || `https://crafatar.com/avatars/${encodeURIComponent(nick)}?size=48&overlay`,
      authProvider: 'discord',
      role: (key === 'admin' || cleanTag.toLowerCase().includes('admin')) ? 'admin' : 'user',
      createdAt: users[key]?.createdAt || new Date().toISOString()
    };
    saveUsers(users);

    // Saldo y bono de bienvenida si es nuevo
    const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
    if (!profiles[nick]) {
      profiles[nick] = {
        nick: nick,
        points: 75,
        discordTag: cleanTag,
        lastDaily: null,
        streak: 1,
        history: [{
          action: 'Bono de bienvenida con Discord',
          pts: 75,
          date: new Date().toLocaleDateString('es-MX')
        }]
      };
    } else {
      profiles[nick].discordTag = cleanTag;
    }
    localStorage.setItem('titanProfiles', JSON.stringify(profiles));

    setCurrentUser(users[key]);
    closeDiscordAuthModal();

    // Notificación de bienvenida al centro de notificaciones
    addNotification(
      '💬 ¡Cuenta de Discord vinculada!',
      `Has iniciado sesión con éxito con ${cleanTag}. Tu Nick de Bedrock es ${nick}.`,
      '💬'
    );

    if (typeof showToast === 'function') showToast(`💬 ¡Bienvenido ${nick}! Sesión activa con Discord`, 'success');
    if (typeof launchConfetti === 'function') launchConfetti();

    if (typeof authCallback === 'function') {
      const cb = authCallback;
      authCallback = null;
      try { cb(); } catch(e) {}
    }

    if (shouldReload) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  function getDiscordRedirectUri() {
    const origin = window.location.origin;
    let path = window.location.pathname;
    if (!path.endsWith('.html')) {
      path = path.replace(/\/$/, '') + '/index.html';
    } else {
      path = path.replace(/\/[^/]*\.html$/, '/index.html');
    }
    return origin + path;
  }

  // Lanzador Oficial OAuth2 de Discord (con detector de retorno y recarga automática)
  window.launchRealDiscordOAuth = function() {
    const clientId = window.TITAN_DISCORD_CLIENT_ID;
    const redirectUri = getDiscordRedirectUri();
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token&scope=identify%20email&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const width = 500;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    try {
      const popup = window.open(
        authUrl,
        'DiscordSignInPopup',
        `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,status=no`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        openDiscordAuthModal();
        return;
      }

      closeAuthModal();

      // Monitor de retorno en ventana emergente de Discord
      const timer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer);
            // Si el popup se cerró, verificar si el token se sincronizó vía Storage
            try {
              const raw = localStorage.getItem('titanDiscordOAuthToken');
              if (raw) {
                localStorage.removeItem('titanDiscordOAuthToken');
                const data = JSON.parse(raw);
                if (data && data.token) fetchDiscordUserProfile(data.token, true);
              }
            } catch(e) {}
            return;
          }

          if (popup.location.origin === window.location.origin) {
            const hash = popup.location.hash;
            if (hash && hash.includes('access_token')) {
              clearInterval(timer);
              const params = new URLSearchParams(hash.replace('#', ''));
              const token = params.get('access_token');
              try { popup.close(); } catch(e) {}
              if (token) fetchDiscordUserProfile(token, true);
            } else if (hash && hash.includes('error')) {
              clearInterval(timer);
              try { popup.close(); } catch(e) {}
              openDiscordAuthModal();
            }
          }
        } catch (e) {
          // Cross-origin esperado mientras el popup esté en el dominio discord.com
        }
      }, 300);

      setTimeout(() => clearInterval(timer), 90000);
    } catch (err) {
      console.warn('Discord OAuth launch notice:', err);
      openDiscordAuthModal();
    }
  };

  function fetchDiscordUserProfile(token, shouldReload = true) {
    if (typeof showToast === 'function') showToast('🔄 Conectando con tu cuenta de Discord...', 'info');

    fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('No se pudo obtener el perfil de Discord');
      return res.json();
    })
    .then(data => {
      if (data && data.username) {
        const tag = data.discriminator && data.discriminator !== '0'
          ? `@${data.username}#${data.discriminator}`
          : `@${data.username}`;
        const nick = data.global_name || data.username;
        const avatar = data.avatar
          ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;

        completeDiscordLogin(tag, nick, avatar, shouldReload);
      }
    })
    .catch(err => {
      console.warn('Discord API Profile fetch notice:', err);
      openDiscordAuthModal();
    });
  }

  function checkDiscordOAuthReturn() {
    if (!window.location.hash || !window.location.hash.includes('access_token')) return;
    try {
      const hashStr = window.location.hash.replace('#', '');
      const params = new URLSearchParams(hashStr);
      const token = params.get('access_token');
      if (token) {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // Si este script corre dentro del popup hijo abierto por la ventana principal:
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: 'DISCORD_AUTH_SUCCESS', token: token }, '*');
          } catch(e) {}
          try {
            localStorage.setItem('titanDiscordOAuthToken', JSON.stringify({ token: token, time: Date.now() }));
          } catch(e) {}
          window.close();
          return;
        }

        // Si fue una redirección completa en la misma pestaña principal:
        fetchDiscordUserProfile(token, true);
      }
    } catch(e) {
      console.warn('Error al verificar retorno de Discord OAuth:', e);
    }
  }

  // Escuchadores de eventos para recepción instantánea de autorización entre ventanas
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DISCORD_AUTH_SUCCESS' && event.data.token) {
      fetchDiscordUserProfile(event.data.token, true);
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'titanDiscordOAuthToken' && event.newValue) {
      try {
        const payload = JSON.parse(event.newValue);
        if (payload && payload.token) {
          localStorage.removeItem('titanDiscordOAuthToken');
          fetchDiscordUserProfile(payload.token, true);
        }
      } catch(e) {}
    }
  });

  /* ─ Actualización del Avatar en tiempo real ─── */
  window.updateAvatarPreview = function(nick) {
    const img = document.getElementById('authAvatarPreview');
    if (!img) return;
    const clean = (nick || '').trim();
    if (clean.length >= 2) {
      img.src = `https://crafatar.com/avatars/${encodeURIComponent(clean)}?size=60&overlay`;
    } else {
      img.src = 'assets/logo.png';
    }
  };

  /* ─ Pestañas de Auth ─────────────────────────── */
  let currentAuthTab = 'login';
  window.switchAuthTab = function(tab) {
    currentAuthTab = tab;
    const tabLogin = document.getElementById('tabAuthLogin');
    const tabReg   = document.getElementById('tabAuthRegister');
    const emailGrp = document.getElementById('groupAuthEmail');
    const submitBtn = document.getElementById('authSubmitBtn');
    const title = document.getElementById('authModalTitle');

    if (tab === 'login') {
      tabLogin?.classList.add('active');
      tabReg?.classList.remove('active');
      if (emailGrp) emailGrp.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Iniciar Sesión';
      if (title) title.textContent = '👤 Iniciar Sesión';
    } else {
      tabReg?.classList.add('active');
      tabLogin?.classList.remove('active');
      if (emailGrp) emailGrp.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Crear Cuenta';
      if (title) title.textContent = '⭐ Registro de Jugador';
    }
  };

  /* ─ Manejador de Submit ──────────────────────── */
  window.handleAuthSubmit = function(e) {
    e.preventDefault();
    const nick = document.getElementById('authNick')?.value.trim();
    const password = document.getElementById('authPassword')?.value;
    const email = document.getElementById('authEmail')?.value.trim();

    if (!nick || nick.length < 2) {
      if (typeof showToast === 'function') showToast('Ingresa un nick de Minecraft válido', 'error');
      return;
    }

    if (!password || password.length < 3) {
      if (typeof showToast === 'function') showToast('La contraseña debe tener al menos 3 caracteres', 'error');
      return;
    }

    const users = getUsers();
    const key = nick.toLowerCase();

    if (currentAuthTab === 'register') {
      if (users[key]) {
        if (typeof showToast === 'function') showToast('Este nick ya está registrado. Inicia sesión.', 'warning');
        switchAuthTab('login');
        return;
      }

      users[key] = {
        nick: nick,
        password: password,
        email: email || '',
        role: key === 'admin' ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
      saveUsers(users);

      const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      if (!profiles[nick]) {
        profiles[nick] = {
          nick: nick,
          points: 50,
          lastDaily: null,
          streak: 1,
          history: [{
            action: 'Bono de bienvenida',
            pts: 50,
            date: new Date().toLocaleDateString('es-MX')
          }]
        };
        localStorage.setItem('titanProfiles', JSON.stringify(profiles));
      }

      setCurrentUser(users[key]);
      closeAuthModal();
      if (typeof showToast === 'function') showToast(`🎉 ¡Bienvenido a Titan Community, ${nick}!`, 'success');
      if (typeof launchConfetti === 'function') launchConfetti();

      if (typeof authCallback === 'function') {
        const cb = authCallback;
        authCallback = null;
        setTimeout(() => cb(), 100);
      }
    } else {
      if (!users[key]) {
        if (typeof showToast === 'function') showToast('Usuario no encontrado. ¿Deseas registrarte?', 'error');
        switchAuthTab('register');
        return;
      }

      if (users[key].password && users[key].password !== password) {
        if (typeof showToast === 'function') showToast('Contraseña incorrecta', 'error');
        return;
      }

      setCurrentUser(users[key]);
      closeAuthModal();
      if (typeof showToast === 'function') showToast(`⚔️ ¡Bienvenido de vuelta, ${nick}!`, 'success');

      if (typeof authCallback === 'function') {
        const cb = authCallback;
        authCallback = null;
        setTimeout(() => cb(), 100);
      }
    }
  };

  /* ─ Abrir y Cerrar Modal ─────────────────────── */
  window.openAuthModal = function(mode = 'login', callback = null) {
    injectAuthModal();
    authCallback = callback;
    switchAuthTab(mode);
    if (typeof renderGsiButtons === 'function') {
      renderGsiButtons();
    }
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      const input = document.getElementById('authNick');
      if (input) setTimeout(() => input.focus(), 150);
    }
  };

  window.closeAuthModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.logoutUser = function() {
    setCurrentUser(null);
    if (typeof showToast === 'function') showToast('Has cerrado sesión correctamente', 'info');
    if (typeof updateUI === 'function') {
      if (typeof playerData !== 'undefined') {
        playerData.nick = '';
        updateUI();
      }
    }
    // Si estamos en admin.html, redirigir a inicio
    if (window.location.pathname.includes('admin.html')) {
      window.location.href = 'index.html';
    }
  };

  /* ══════════════════════════════════════════════
     SISTEMA DE NOTIFICACIONES EN TIEMPO REAL
     ══════════════════════════════════════════════ */
  function getUserNotifications(nick) {
    if (!nick) {
      // Para visitantes o usuarios no logueados: mostrar avisos y anuncios globales
      try {
        const broadcasts = JSON.parse(localStorage.getItem('titanBroadcastNotifs') || '[]');
        const guestRead = JSON.parse(localStorage.getItem('titanGuestReadNotifs') || '[]');
        return broadcasts.map(b => ({
          ...b,
          read: guestRead.includes(b.id)
        }));
      } catch (e) {
        return [];
      }
    }
    try {
      let list = JSON.parse(localStorage.getItem('titanNotifs_' + nick.toLowerCase()) || '[]');
      
      // Auto-sincronizar con titanBroadcastNotifs si falta alguna notificación global
      const broadcasts = JSON.parse(localStorage.getItem('titanBroadcastNotifs') || '[]');
      let changed = false;
      broadcasts.forEach(b => {
        if (!list.some(item => item.id === b.id)) {
          list.unshift({ ...b, read: false });
          changed = true;
        }
      });
      if (changed) {
        list = list.slice(0, 50);
        saveUserNotifications(nick, list);
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  function saveUserNotifications(nick, list) {
    if (!nick) return;
    localStorage.setItem('titanNotifs_' + nick.toLowerCase(), JSON.stringify(list));
  }

  function addNotification(title, desc, icon = '💎', type = 'info') {
    const user = getCurrentUser();
    if (!user) return;
    const list = getUserNotifications(user.nick);
    const notif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title,
      desc: desc,
      icon: icon,
      time: 'Hace un momento',
      read: false,
      type: type
    };
    list.unshift(notif);
    saveUserNotifications(user.nick, list.slice(0, 50));
    renderNotificationsUI(user.nick);
    if (typeof showToast === 'function') showToast(`${icon} ${title}`, 'info');
  }

  // Broadcast global de anuncios a todos los usuarios
  function broadcastNotification(title, desc, icon = '📢', type = 'announcement') {
    const notifObj = {
      id: 'notif_ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title,
      desc: desc,
      icon: icon,
      time: new Date().toLocaleDateString('es') + ' ' + new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type: type
    };

    // 1. Guardar en registro global
    let broadcasts = [];
    try {
      broadcasts = JSON.parse(localStorage.getItem('titanBroadcastNotifs') || '[]');
    } catch (e) {}
    broadcasts.unshift(notifObj);
    localStorage.setItem('titanBroadcastNotifs', JSON.stringify(broadcasts.slice(0, 50)));
    if (window.TitanFirebase && typeof window.TitanFirebase.saveBroadcast === 'function') {
      window.TitanFirebase.saveBroadcast(broadcasts.slice(0, 50));
    }

    // 2. Distribuir a cada usuario registrado en titanUsers
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('titanUsers') || '[]');
    } catch (e) {}
    users.forEach(u => {
      if (u && u.nick) {
        const uKey = 'titanNotifs_' + u.nick.toLowerCase();
        let uNotifs = [];
        try { uNotifs = JSON.parse(localStorage.getItem(uKey) || '[]'); } catch (e) {}
        uNotifs.unshift({ ...notifObj, read: false });
        localStorage.setItem(uKey, JSON.stringify(uNotifs.slice(0, 50)));
      }
    });

    // 3. Distribuir también a titanProfiles si hubiera cuentas adicionales
    try {
      const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      Object.keys(profiles).forEach(pNick => {
        const pKey = 'titanNotifs_' + pNick.toLowerCase();
        let pNotifs = JSON.parse(localStorage.getItem(pKey) || '[]');
        if (!pNotifs.some(n => n.id === notifObj.id)) {
          pNotifs.unshift({ ...notifObj, read: false });
          localStorage.setItem(pKey, JSON.stringify(pNotifs.slice(0, 50)));
        }
      });
    } catch (e) {}

    // 4. Actualizar interfaz de notificaciones inmediatamente
    const curUser = getCurrentUser();
    renderNotificationsUI(curUser ? curUser.nick : null);

    if (typeof showToast === 'function') {
      showToast(`${icon} ¡Nuevo Anuncio Oficial Recibido!`, 'success');
    }
  }

  window.toggleNotifDropdown = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('notifDropdown');
    const userDropdown = document.getElementById('userDropdownMenu');
    if (userDropdown) userDropdown.classList.remove('open');
    if (dropdown) dropdown.classList.toggle('open');
  };

  window.markAllNotifsRead = function() {
    const user = getCurrentUser();
    if (!user) {
      try {
        const broadcasts = JSON.parse(localStorage.getItem('titanBroadcastNotifs') || '[]');
        const allIds = broadcasts.map(b => b.id);
        localStorage.setItem('titanGuestReadNotifs', JSON.stringify(allIds));
      } catch (e) {}
      renderNotificationsUI(null);
      return;
    }
    const list = getUserNotifications(user.nick);
    list.forEach(n => n.read = true);
    saveUserNotifications(user.nick, list);
    renderNotificationsUI(user.nick);
  };

  window.markNotifAsRead = function(id) {
    const user = getCurrentUser();
    if (!user) {
      try {
        const guestRead = JSON.parse(localStorage.getItem('titanGuestReadNotifs') || '[]');
        if (!guestRead.includes(id)) {
          guestRead.push(id);
          localStorage.setItem('titanGuestReadNotifs', JSON.stringify(guestRead));
        }
      } catch (e) {}
      renderNotificationsUI(null);
      return;
    }
    const list = getUserNotifications(user.nick);
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      saveUserNotifications(user.nick, list);
      renderNotificationsUI(user.nick);
    }
  };

  // ━━ ABRIR Y LEER NOTIFICACIÓN COMPLETA (MODAL) ━━
  window.openNotifDetail = function(id) {
    const user = getCurrentUser();
    const notifs = getUserNotifications(user ? user.nick : null);
    const item = notifs.find(n => n.id === id);
    if (!item) return;

    // NO marcar como leída automáticamente — las notificaciones se quedan siempre
    // Solo refrescar la UI para que el dropdown muestre el estado actualizado
    // (El usuario puede marcarlas manualmente con "Marcar leídas")

    // Cerrar dropdown
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.classList.remove('open');

    // Obtener o crear modal de detalle
    let modal = document.getElementById('notifDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'notifDetailModal';
      modal.className = 'notif-detail-overlay';
      modal.onclick = function(e) {
        if (e.target === modal) window.closeNotifDetail();
      };
      document.body.appendChild(modal);
    }

    const typeBadge = item.type === 'announcement' ? '📢 ANUNCIO COMUNITARIO OFICIAL'
                    : item.type === 'reward' ? '🎁 RECOMPENSA DE PUNTOS'
                    : item.type === 'purchase' ? '🛒 COMPRA EN TIENDA'
                    : '🔔 NOTIFICACIÓN';

    // Botones contextuales
    let actionsHtml = '';
    const fullText = (item.desc + ' ' + item.title).toLowerCase();
    if (fullText.includes('canje') || fullText.includes('punto')) {
      actionsHtml += `<a href="canje.html" class="btn btn-sm btn-primary">⭐ Ver Canjes & Puntos</a>`;
    }
    if (fullText.includes('tienda') || fullText.includes('compra') || fullText.includes('descuento') || fullText.includes('pack')) {
      actionsHtml += `<a href="tienda.html" class="btn btn-sm btn-secondary">🛒 Ir a la Tienda</a>`;
    }
    if (fullText.includes('discord')) {
      actionsHtml += `<a href="https://discord.gg/dDYRCn6gdM" target="_blank" class="btn btn-sm" style="background:#5865F2; color:#fff;">💬 Unirse a Discord</a>`;
    }
    if (fullText.includes('servidor') || fullText.includes('ip') || fullText.includes('puerto')) {
      actionsHtml += `<a href="servidor.html" class="btn btn-sm btn-secondary">⚔️ Ver Servidor</a>`;
    }

    modal.innerHTML = `
      <div class="notif-detail-card" onclick="event.stopPropagation()">
        <div class="notif-detail-header">
          <div style="display:flex; align-items:flex-start; gap:14px;">
            <div class="notif-detail-icon">${item.icon || '🔔'}</div>
            <div>
              <span class="notif-detail-type">${typeBadge}</span>
              <h3 class="notif-detail-title">${escapeHtml(item.title)}</h3>
              <div class="notif-detail-date">🕒 ${escapeHtml(item.time || 'Reciente')}</div>
            </div>
          </div>
          <button class="notif-detail-close" onclick="closeNotifDetail()" title="Cerrar">✕</button>
        </div>
        <div class="notif-detail-body">
          <div style="font-size:0.95rem; color:#e2e8f0; white-space:pre-wrap; line-height:1.65;">${escapeHtml(item.desc)}</div>
        </div>
        <div class="notif-detail-footer">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${actionsHtml}
          </div>
          <button class="btn btn-primary btn-sm" onclick="closeNotifDetail()">✓ Entendido</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  };

  window.closeNotifDetail = function() {
    const modal = document.getElementById('notifDetailModal');
    if (modal) modal.style.display = 'none';
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderNotificationsUI(nick) {
    const listEl = document.getElementById('notifList');
    const badgeEl = document.getElementById('notifBadge');
    if (!listEl || !badgeEl) return;

    const notifs = getUserNotifications(nick);
    const unreadCount = notifs.filter(n => !n.read).length;

    badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badgeEl.style.display = unreadCount > 0 ? 'flex' : 'none';

    if (notifs.length === 0) {
      listEl.innerHTML = `
        <div style="padding:32px 16px; text-align:center; color:var(--text-muted); font-size:0.82rem;">
          <div style="font-size:2.2rem; margin-bottom:8px; opacity:0.6;">🔔</div>
          <span>No tienes notificaciones pendientes</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="openNotifDetail('${n.id}')" title="Toca para abrir y leer los detalles">
        <span class="notif-item-icon">${n.icon || '🔔'}</span>
        <div class="notif-item-content">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:3px;">
            <div class="notif-item-title">${escapeHtml(n.title)}</div>
            ${!n.read ? '<span style="background:var(--gold); color:#000; font-size:0.58rem; font-weight:900; padding:1px 5px; border-radius:3px;">NUEVO</span>' : ''}
          </div>
          <div class="notif-item-desc">${escapeHtml(n.desc)}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
            <span class="notif-item-time">${escapeHtml(n.time || '')}</span>
            <span style="font-size:0.7rem; color:var(--gold); font-weight:700; display:flex; align-items:center; gap:2px;">
              Abrir ↗
            </span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /* ══════════════════════════════════════════════
     SISTEMA DE INVENTARIO DEL JUGADOR MEJORADO (BEDROCK VAULT)
     ══════════════════════════════════════════════ */
  function getItemRarity(name, category) {
    const n = (name || '').toLowerCase();
    if (n.includes('titan') || n.includes('inmortal') || n.includes('legendario') || n.includes('vip+')) return 'legendario';
    if (n.includes('vip') || n.includes('épico') || n.includes('dragon') || n.includes('golem') || n.includes('llave')) return 'epico';
    if (n.includes('raro') || n.includes('kit') || n.includes('mascota') || n.includes('espada') || n.includes('armadura')) return 'raro';
    return 'comun';
  }

  function getUserInventory(nick) {
    if (!nick) return [];
    const items = [];
    const addedKeys = new Set();
    const targetNick = (nick || '').trim().toLowerCase();
    const currentUser = getCurrentUser();

    // 1. Obtener compras desde titanOrders
    try {
      const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
      const userOrders = orders.filter(o => {
        const orderNick = (o.nick || '').trim().toLowerCase();
        const matchesNick = orderNick === targetNick;
        const matchesEmail = (currentUser && currentUser.email && o.email && currentUser.email.trim().toLowerCase() === o.email.trim().toLowerCase());
        return matchesNick || matchesEmail;
      });

      userOrders.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach((it, idx) => {
            const rarity = getItemRarity(it.name, 'tienda');
            const isApproved = (order.status === 'Aprobado' || order.status === 'Pagado' || order.status === 'Entregado' || order.status === 'Activo');
            const itemKey = `${order.orderId}_${it.id || idx}`;
            if (!addedKeys.has(itemKey)) {
              addedKeys.add(itemKey);
              items.push({
                id: itemKey,
                rawId: it.id || ('tienda_' + idx),
                name: it.name + (it.qty > 1 ? ` (x${it.qty})` : ''),
                icon: it.icon || '💎',
                category: 'tienda',
                isPurchased: true,
                isFree: false,
                itemType: 'tienda',
                rarity: rarity,
                source: 'Tienda Premium',
                date: order.orderDate || 'Reciente',
                orderId: order.orderId,
                status: isApproved ? 'Listo para /claim' : (order.status || 'Pendiente PayPal'),
                isApproved: isApproved,
                paypalTxId: order.paypalTxId || null,
                price: it.price
              });
            }
          });
        }
      });
    } catch (e) {}

    // 2. Obtener compras directas en la cuenta de usuario (user.purchases)
    try {
      const users = getUsers();
      const dbUser = users[targetNick];
      const accountPurchases = (currentUser && currentUser.purchases) || (dbUser && dbUser.purchases) || [];
      if (Array.isArray(accountPurchases)) {
        accountPurchases.forEach(order => {
          if (Array.isArray(order.items)) {
            order.items.forEach((it, idx) => {
              const itemKey = `${order.orderId}_${it.id || idx}`;
              if (!addedKeys.has(itemKey)) {
                addedKeys.add(itemKey);
                const isApproved = (order.status === 'Aprobado' || order.status === 'Pagado' || order.status === 'Entregado');
                items.push({
                  id: itemKey,
                  rawId: it.id || ('tienda_' + idx),
                  name: it.name + (it.qty > 1 ? ` (x${it.qty})` : ''),
                  icon: it.icon || '💎',
                  category: 'tienda',
                  isPurchased: true,
                  isFree: false,
                  itemType: 'tienda',
                  rarity: getItemRarity(it.name, 'tienda'),
                  source: 'Tienda Premium',
                  date: order.orderDate || 'Reciente',
                  orderId: order.orderId,
                  status: isApproved ? 'Listo para /claim' : (order.status || 'Pendiente PayPal'),
                  isApproved: isApproved,
                  paypalTxId: order.paypalTxId || null,
                  price: it.price
                });
              }
            });
          }
        });
      }
    } catch(e) {}

    // 3. Obtener canjes desde titanProfiles[nick].history y purchases
    try {
      const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      const profileKey = profiles[nick] ? nick : Object.keys(profiles).find(k => k.toLowerCase() === targetNick) || nick;
      const playerProf = profiles[profileKey];

      if (playerProf && Array.isArray(playerProf.history)) {
        playerProf.history.forEach((h, idx) => {
          const desc = h.desc || h.action || '';
          const change = typeof h.change === 'number' ? h.change : (typeof h.pts === 'number' ? h.pts : 0);
          if (change < 0 || desc.toLowerCase().includes('canje') || desc.toLowerCase().includes('kit') || desc.toLowerCase().includes('mascota')) {
            const rarity = getItemRarity(desc, 'canje');
            const cleanDesc = desc.replace(/^Canje:\s*/i, '');
            const itemKey = `canje_${idx}_${cleanDesc}`;
            if (!addedKeys.has(itemKey)) {
              addedKeys.add(itemKey);
              items.push({
                id: itemKey,
                rawId: 'canje_' + idx,
                name: cleanDesc,
                icon: h.icon || '⭐',
                category: 'gratis',
                isPurchased: false,
                isFree: true,
                itemType: 'gratis',
                rarity: rarity,
                source: 'Recompensa por Puntos (Gratis)',
                date: h.date || 'Reciente',
                orderId: 'CANJE-' + (idx + 1),
                status: 'Reclamable en Servidor',
                isApproved: true
              });
            }
          }
        });
      }
    } catch (e) {}

    // 4. Beneficios gratuitos del servidor (siempre disponibles para miembros de Titan Community)
    if (!addedKeys.has('starter_kit_bedrock')) {
      items.push({
        id: 'starter_kit_bedrock',
        rawId: 'starter_kit_bedrock',
        name: 'Kit Inicial Bedrock',
        icon: '⚔️',
        category: 'gratis',
        isPurchased: false,
        isFree: true,
        itemType: 'gratis',
        rarity: 'raro',
        source: 'Bono Inicial del Servidor (Gratis)',
        date: 'Activo',
        orderId: 'STARTER-KIT',
        status: 'Disponible',
        isApproved: true
      });
    }
    if (!addedKeys.has('starter_rank_member')) {
      items.push({
        id: 'starter_rank_member',
        rawId: 'starter_rank_member',
        name: 'Rango Miembro Titan',
        icon: '👑',
        category: 'gratis',
        isPurchased: false,
        isFree: true,
        itemType: 'gratis',
        rarity: 'comun',
        source: 'Rango Oficial de la Comunidad (Gratis)',
        date: 'Activo',
        orderId: 'RANK-TITAN',
        status: 'Activo',
        isApproved: true
      });
    }

    return items;
  }

  function injectInventoryModal() {
    if (document.getElementById('inventoryModal')) return;
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.id = 'inventoryModal';
    div.style.zIndex = '100050';
    div.innerHTML = `
      <div class="inventory-dialog">
        <!-- Handle táctil para celular -->
        <div class="user-dropdown-handle" style="margin: 2px auto 14px auto;"></div>

        <!-- Cabecera del Inventario -->
        <div class="inventory-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <img id="inventorySkinAvatar" src="assets/logo.png" style="width:44px; height:44px; border-radius:10px; border:2px solid var(--gold); object-fit:cover; background:#000;" alt="Player Skin" />
            <div>
              <h3 class="font-cinzel" style="font-size:1.25rem; color:var(--gold); margin:0;" id="inventoryTitle">🎒 Bóveda de Items & Inventario</h3>
              <p style="font-size:0.75rem; color:var(--text-muted); margin:0;" id="inventorySubtitle">Cosas compradas en la tienda y recompensas gratis del servidor</p>
            </div>
          </div>
          <button class="modal-close" onclick="closeInventoryModal()">✕</button>
        </div>

        <!-- Barra de Estadísticas Rápidas -->
        <div class="inv-stats-bar">
          <div class="inv-stat-chip" style="border-color:rgba(255,215,0,0.3); background:rgba(255,215,0,0.06);">
            <span>💎 Compras Pagadas:</span>
            <span class="inv-stat-val" id="invStatTienda" style="color:var(--gold);">0</span>
          </div>
          <div class="inv-stat-chip" style="border-color:rgba(0,255,136,0.3); background:rgba(0,255,136,0.06);">
            <span>🎁 Gratis del Servidor:</span>
            <span class="inv-stat-val" id="invStatGratis" style="color:#00ff88;">0</span>
          </div>
          <div class="inv-stat-chip">
            <span>📦 Total Bóveda:</span>
            <span class="inv-stat-val" id="invStatTotal">0</span>
          </div>
          <div class="inv-stat-chip" style="margin-left:auto; background:rgba(123,47,255,0.08); border-color:rgba(123,47,255,0.3);">
            <span style="color:#c77dff;">🎮 IP Bedrock:</span>
            <span class="inv-stat-val server-dynamic-ip" style="color:#c77dff; font-size:0.8rem; cursor:pointer;" onclick="window.copyServerIPModal ? window.copyServerIPModal(this) : (window.TitanServer && window.TitanServer.copyIp(this))" title="Copiar IP">play.titancommunity.net</span>
          </div>
        </div>

        <!-- Buscador y Filtros Separados -->
        <div class="inv-search-bar">
          <input type="text" id="invSearchInput" class="inv-search-input" placeholder="🔍 Buscar item, rango, kit o recompensa..." oninput="filterInventorySearch(this.value)" />
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="auth-modal-tab active" id="invTabAll" onclick="filterInventory('all', this)" style="font-size:0.78rem; padding:6px 12px; border-radius:6px;">
              📦 Todo Separado (<span id="invCountAll">0</span>)
            </button>
            <button class="auth-modal-tab" id="invTabTienda" onclick="filterInventory('tienda', this)" style="font-size:0.78rem; padding:6px 12px; border-radius:6px;">
              💎 Cosas Compradas (<span id="invCountTienda">0</span>)
            </button>
            <button class="auth-modal-tab" id="invTabGratis" onclick="filterInventory('gratis', this)" style="font-size:0.78rem; padding:6px 12px; border-radius:6px;">
              🎁 Gratis del Servidor (<span id="invCountGratis">0</span>)
            </button>
          </div>
        </div>

        <!-- Grid de Items del Inventario -->
        <div class="inventory-grid" id="inventoryGrid"></div>

        <!-- Barra Inferior de Utilidades -->
        <div class="inventory-toolbar">
          <div style="font-size:0.72rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
            <span>💡 <b>¿Cómo reclamar?</b> Haz clic en <b>/claim</b> para copiar el comando y pégalo en el chat de Minecraft Bedrock.</span>
          </div>
          <div style="display:flex; gap:8px;">
            <a href="tienda.html" class="buy-btn gold-btn" style="text-decoration:none; padding:6px 12px; font-size:0.78rem;">
              💎 Tienda Premium
            </a>
            <a href="canje.html" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem;">
              ⭐ Canjear Puntos
            </a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => {
      if (e.target.id === 'inventoryModal') closeInventoryModal();
    });
  }

  let currentInventoryFilter = 'all';
  let currentInventorySearchQuery = '';

  window.openInventoryModal = function(filter = 'all') {
    const user = getCurrentUser();
    if (!user) {
      if (typeof showToast === 'function') showToast('Debes iniciar sesión para ver tu inventario', 'info');
      openAuthModal('login', () => openInventoryModal(filter));
      return;
    }

    injectInventoryModal();
    const modal = document.getElementById('inventoryModal');
    if (!modal) return;

    const avatar = document.getElementById('inventorySkinAvatar');
    const title = document.getElementById('inventoryTitle');
    if (avatar) avatar.src = getUserAvatar(user, 48);
    if (avatar && user.avatarAura) avatar.className = 'inventory-avatar-cube ' + user.avatarAura;
    if (title) title.textContent = `🎒 Bóveda de ${user.nick}`;

    currentInventoryFilter = filter;
    currentInventorySearchQuery = '';
    const searchInp = document.getElementById('invSearchInput');
    if (searchInp) searchInp.value = '';

    // Marcar pestaña activa
    document.querySelectorAll('#inventoryModal .auth-modal-tab').forEach(b => b.classList.remove('active'));
    if (filter === 'tienda') {
      document.getElementById('invTabTienda')?.classList.add('active');
    } else if (filter === 'gratis') {
      document.getElementById('invTabGratis')?.classList.add('active');
    } else {
      document.getElementById('invTabAll')?.classList.add('active');
    }

    renderInventoryGrid(user.nick, filter);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeInventoryModal = function() {
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.filterInventory = function(cat, btn) {
    currentInventoryFilter = cat;
    document.querySelectorAll('#inventoryModal .auth-modal-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const user = getCurrentUser();
    if (user) renderInventoryGrid(user.nick, cat, currentInventorySearchQuery);
  };

  window.filterInventorySearch = function(query) {
    currentInventorySearchQuery = (query || '').toLowerCase().trim();
    const user = getCurrentUser();
    if (user) renderInventoryGrid(user.nick, currentInventoryFilter, currentInventorySearchQuery);
  };

  function renderSingleInventoryCard(it) {
    const rarity = it.rarity || 'comun';
    const cleanName = it.name.replace(/'/g, "\\'");
    const isApproved = it.isApproved !== false && (!it.status.toLowerCase().includes('pendiente'));
    const isPurchased = it.isPurchased === true;

    return `
      <div class="inventory-card rarity-${rarity}" style="border-left: 3px solid ${isPurchased ? 'var(--gold)' : '#00ff88'};">
        <span class="inv-rarity-pill ${rarity}">${rarity}</span>
        <div class="inventory-card-icon">${it.icon}</div>
        <div class="inventory-card-info">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
            ${isPurchased 
              ? `<span class="inv-type-badge purchased">💎 COMPRADO</span>` 
              : `<span class="inv-type-badge free">🎁 GRATIS</span>`}
          </div>
          <div class="inventory-card-name" title="${it.name}">${it.name}</div>
          <div class="inventory-card-meta">
            <span style="color:${isPurchased ? 'var(--gold)' : '#00ff88'}; font-weight:600;">
              ${it.source}
            </span>
            ${it.orderId ? ` · <span style="opacity:0.75; font-family:monospace;">${it.orderId}</span>` : ''}
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px; gap:8px; flex-wrap:wrap;">
            ${isApproved ? `
              <button class="inventory-claim-btn" onclick="copyClaimCommand('${cleanName}')" title="Copiar comando para reclamar en Minecraft Bedrock">
                <span>📋</span> <span>/claim</span>
              </button>
              <span style="font-size:0.7rem; color:#00ff88; font-weight:700; display:flex; align-items:center; gap:3px;">
                ✓ ${it.status}
              </span>
            ` : `
              <button class="buy-btn gold-btn" onclick="promptValidatePayPal('${it.orderId}')" style="padding:4px 10px; font-size:0.72rem; border-radius:6px; font-weight:700;" title="Validar pago de PayPal para activar item">
                <span>💳 Validar PayPal</span>
              </button>
              <span style="font-size:0.7rem; color:#ff9f43; font-weight:700; display:flex; align-items:center; gap:3px;">
                ⏳ Pendiente
              </span>
            `}
          </div>
        </div>
      </div>
    `;
  }

  function renderInventoryGrid(nick, filter = 'all', searchQuery = '') {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;

    const allItems = getUserInventory(nick);
    const purchasedItems = allItems.filter(i => i.isPurchased === true || i.category === 'tienda');
    const freeItems = allItems.filter(i => (i.isFree === true || i.category === 'gratis') && i.category !== 'tienda');

    const countAll = allItems.length;
    const countTienda = purchasedItems.length;
    const countGratis = freeItems.length;

    // Actualizar badges numéricos
    const cAll = document.getElementById('invCountAll');
    const cTienda = document.getElementById('invCountTienda');
    const cGratis = document.getElementById('invCountGratis');
    if (cAll) cAll.textContent = countAll;
    if (cTienda) cTienda.textContent = countTienda;
    if (cGratis) cGratis.textContent = countGratis;

    // Actualizar chips de estadísticas
    const statTot = document.getElementById('invStatTotal');
    const statTie = document.getElementById('invStatTienda');
    const statGra = document.getElementById('invStatGratis');
    if (statTot) statTot.textContent = countAll;
    if (statTie) statTie.textContent = countTienda;
    if (statGra) statGra.textContent = countGratis;

    // Aplicar búsqueda
    const filterQuery = (list) => {
      if (!searchQuery) return list;
      return list.filter(i => 
        i.name.toLowerCase().includes(searchQuery) || 
        (i.source && i.source.toLowerCase().includes(searchQuery)) ||
        (i.orderId && i.orderId.toLowerCase().includes(searchQuery))
      );
    };

    const finalPurchased = filterQuery(purchasedItems);
    const finalFree = filterQuery(freeItems);

    // ── VISTA 1: SOLO COSAS COMPRADAS (TIENDA) ──
    if (filter === 'tienda') {
      if (finalPurchased.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:36px 20px; background:rgba(255,215,0,0.03); border:1px dashed rgba(255,215,0,0.3); border-radius:12px;">
            <div style="font-size:3.5rem; margin-bottom:12px;">🛒</div>
            <h4 style="color:#fff; margin-bottom:6px; font-size:1.1rem;">No tienes compras registradas en la tienda</h4>
            <p style="color:var(--text-muted); font-size:0.85rem; max-width:420px; margin:0 auto 16px auto;">
              Aquí aparecerán todos los kits, rangos VIP y mascotas que adquieras en la Tienda Premium con PayPal.
            </p>
            <a href="tienda.html" class="buy-btn gold-btn" style="text-decoration:none; padding:8px 18px; font-size:0.85rem; display:inline-flex;">
              💎 Ir a la Tienda Premium
            </a>
          </div>
        `;
        return;
      }
      grid.innerHTML = `
        <div class="inv-section-divider purchased" style="grid-column:1/-1;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">💎</span>
            <div>
              <strong style="color:var(--gold); font-size:0.92rem;">Artículos Comprados en la Tienda Premium</strong>
              <div style="font-size:0.68rem; color:var(--text-secondary);">Items adquiridos mediante compras con PayPal</div>
            </div>
          </div>
          <span class="inv-type-badge purchased">${finalPurchased.length} items comprados</span>
        </div>
        ${finalPurchased.map(renderSingleInventoryCard).join('')}
      `;
      return;
    }

    // ── VISTA 2: SOLO COSAS GRATIS DEL SERVIDOR ──
    if (filter === 'gratis') {
      if (finalFree.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:36px 20px; background:rgba(0,255,136,0.03); border:1px dashed rgba(0,255,136,0.3); border-radius:12px;">
            <div style="font-size:3.5rem; margin-bottom:12px;">🎁</div>
            <h4 style="color:#fff; margin-bottom:6px; font-size:1.1rem;">No se encontraron items gratis</h4>
            <p style="color:var(--text-muted); font-size:0.85rem; max-width:420px; margin:0 auto 16px auto;">
              Gana puntos jugando en el servidor y canjéalos gratis por recompensas en la sección de canje.
            </p>
            <a href="canje.html" class="btn btn-secondary" style="text-decoration:none; padding:8px 18px; font-size:0.85rem; display:inline-flex;">
              ⭐ Canjear Puntos Gratis
            </a>
          </div>
        `;
        return;
      }
      grid.innerHTML = `
        <div class="inv-section-divider free" style="grid-column:1/-1;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">🎁</span>
            <div>
              <strong style="color:#00ff88; font-size:0.92rem;">Beneficios & Recompensas Gratuitas del Servidor (0$)</strong>
              <div style="font-size:0.68rem; color:var(--text-secondary);">Kits iniciales, rango de miembro y canjes por jugar gratis</div>
            </div>
          </div>
          <span class="inv-type-badge free">${finalFree.length} items gratuitos</span>
        </div>
        ${finalFree.map(renderSingleInventoryCard).join('')}
      `;
      return;
    }

    // ── VISTA 3: TODO SEPARADO EN DOS SECCIONES CLARAS ──
    if (finalPurchased.length === 0 && finalFree.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:36px 20px; background:rgba(255,255,255,0.02); border:1px dashed var(--border-subtle); border-radius:12px;">
          <div style="font-size:3.5rem; margin-bottom:12px;">🔍</div>
          <h4 style="color:#fff; margin-bottom:6px; font-size:1.1rem;">No se encontraron items</h4>
          <p style="color:var(--text-muted); font-size:0.85rem; max-width:400px; margin:0 auto 16px auto;">
            ${searchQuery ? `No hay resultados para "${searchQuery}". Prueba con otra palabra clave.` : 'Tu inventario no tiene items aún.'}
          </p>
        </div>
      `;
      return;
    }

    let html = '';

    // SECCIÓN 1: ARTÍCULOS COMPRADOS
    html += `
      <div class="inv-section-divider purchased">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.25rem;">💎</span>
          <div>
            <strong style="color:var(--gold); font-size:0.94rem;">Artículos Comprados en la Tienda</strong>
            <div style="font-size:0.68rem; color:var(--text-secondary);">Items adquiridos mediante compra con dinero / PayPal</div>
          </div>
        </div>
        <span class="inv-type-badge purchased">${finalPurchased.length} items</span>
      </div>
    `;

    if (finalPurchased.length > 0) {
      html += finalPurchased.map(renderSingleInventoryCard).join('');
    } else {
      html += `
        <div style="grid-column:1/-1; padding:16px; background:rgba(255,215,0,0.02); border:1px dashed rgba(255,215,0,0.2); border-radius:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="font-size:0.8rem; color:var(--text-muted);">
            🛒 Aún no has realizado compras pagadas en la tienda.
          </div>
          <a href="tienda.html" class="buy-btn gold-btn" style="text-decoration:none; padding:5px 12px; font-size:0.75rem;">
            💎 Ver Tienda Premium
          </a>
        </div>
      `;
    }

    // SECCIÓN 2: ARTÍCULOS Y BENEFICIOS GRATIS DEL SERVIDOR
    html += `
      <div class="inv-section-divider free" style="margin-top:20px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.25rem;">🎁</span>
          <div>
            <strong style="color:#00ff88; font-size:0.94rem;">Beneficios & Recompensas Gratuitas del Servidor (0$)</strong>
            <div style="font-size:0.68rem; color:var(--text-secondary);">Kits iniciales, rango miembro gratis y recompensas por puntos</div>
          </div>
        </div>
        <span class="inv-type-badge free">${finalFree.length} items</span>
      </div>
    `;

    if (finalFree.length > 0) {
      html += finalFree.map(renderSingleInventoryCard).join('');
    } else {
      html += `
        <div style="grid-column:1/-1; padding:16px; background:rgba(0,255,136,0.02); border:1px dashed rgba(0,255,136,0.2); border-radius:10px; text-align:center; font-size:0.8rem; color:var(--text-muted);">
          No tienes items gratuitos registrados en esta búsqueda.
        </div>
      `;
    }

    grid.innerHTML = html;
  }

  /* ══════════════════════════════════════════════
     SISTEMA DE PERFIL DE JUGADOR & APP HUB
     ══════════════════════════════════════════════ */
  let deferredPWAInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPWAInstallPrompt = e;
    const btn = document.getElementById('pwaInstallActionBtn');
    if (btn) btn.style.display = 'inline-flex';
  });

  // Variables de edición de perfil
  let currentEditAvatar = '';
  let currentEditAura = 'avatar-glow-gold';

  function injectProfileModal() {
    if (document.getElementById('profileAppModal')) return;
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.id = 'profileAppModal';
    div.style.zIndex = '100050';
    div.innerHTML = `
      <div class="profile-app-dialog">
        <!-- Handle táctil para celular -->
        <div class="user-dropdown-handle" style="margin: 2px auto 14px auto;"></div>

        <!-- Header con Título y Cierre -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.3rem;">👤</span>
            <h3 class="font-cinzel" style="font-size:1.25rem; color:var(--gold); margin:0;">Perfil de Jugador & Ajustes</h3>
          </div>
          <button class="modal-close" onclick="closeProfileModal()">✕</button>
        </div>

        <!-- Barra de Pestañas del Perfil -->
        <div class="profile-tabs-nav">
          <button type="button" class="profile-tab-btn active" id="profTabBtnSummary" onclick="switchProfileTab('summary')">
            <span>📊</span> <span>Resumen</span>
          </button>
          <button type="button" class="profile-tab-btn" id="profTabBtnCustomize" onclick="switchProfileTab('customize')">
            <span>🎨</span> <span>Foto & Perfil</span>
          </button>
          <button type="button" class="profile-tab-btn" id="profTabBtnSecurity" onclick="switchProfileTab('security')">
            <span>🔒</span> <span>Seguridad</span>
          </button>
        </div>

        <!-- ════════ PANE 1: RESUMEN & APP ════════ -->
        <div id="profPaneSummary" class="profile-tab-pane active">
          <!-- Banner del Jugador -->
          <div class="profile-banner-card">
            <div class="profile-avatar-wrapper">
              <img id="profileAppSkin" src="assets/logo.png" alt="Foto del Jugador" class="profile-skin-cube avatar-glow-gold" onerror="this.src='assets/logo.png'" />
              <button type="button" class="profile-avatar-change-btn" onclick="switchProfileTab('customize')" title="Cambiar foto de perfil">
                📷
              </button>
            </div>
            <div class="profile-banner-info" style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                <h2 id="profileAppNick" style="font-family:'Cinzel',serif; font-size:1.35rem; color:#fff; margin:0; font-weight:800;">Cargando...</h2>
                <span id="profileAppRoleBadge" style="background:var(--purple-main); color:#fff; font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">JUGADOR</span>
              </div>
              <div id="profileAppBio" style="font-size:0.84rem; color:#f1f5f9; margin-bottom:6px; line-height:1.4; font-style:italic; display:none;"></div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;" id="profileAppCustomChips"></div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <span id="profileAuthProviderBadge" style="font-size:0.72rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); padding:2px 8px; border-radius:999px; color:#e2e8f0;">
                  🎮 Cuenta Bedrock
                </span>
                <span style="font-size:0.72rem; background:rgba(0,255,136,0.1); border:1px solid rgba(0,255,136,0.3); padding:2px 8px; border-radius:999px; color:#00ff88;">
                  ✓ Verificado
                </span>
              </div>
            </div>
          </div>

          <!-- Estadísticas Rápidas del Jugador -->
          <div class="profile-stats-grid">
            <div class="profile-stat-box">
              <span class="profile-stat-label">⭐ Puntos Titan</span>
              <span class="profile-stat-value" id="profileStatPoints" style="color:var(--gold);">0 pts</span>
            </div>
            <div class="profile-stat-box">
              <span class="profile-stat-label">🔥 Racha Diaria</span>
              <span class="profile-stat-value" id="profileStatStreak" style="color:#ff6b35;">1 día</span>
            </div>
            <div class="profile-stat-box">
              <span class="profile-stat-label">🎒 Items Bóveda</span>
              <span class="profile-stat-value" id="profileStatItems" style="color:#00f2fe;">0 items</span>
            </div>
            <div class="profile-stat-box">
              <span class="profile-stat-label">🛒 Compras</span>
              <span class="profile-stat-value" id="profileStatOrders" style="color:#c77dff;">0</span>
            </div>
          </div>

          <!-- Botón de acceso directo a edición -->
          <div style="margin-bottom:16px;">
            <button type="button" class="btn btn-sm w-full" onclick="switchProfileTab('customize')" style="background:rgba(255,215,0,0.12); color:var(--gold); border:1px solid rgba(255,215,0,0.35); font-weight:700; padding:9px 14px; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>✨ Cambiar Mi Foto, Estado y Personalización</span>
            </button>
          </div>

          <!-- Centro de Acciones de la App -->
          <div style="margin-bottom:12px;">
            <h4 style="font-size:0.82rem; color:var(--text-secondary); margin:0 0 10px 0; text-transform:uppercase; letter-spacing:0.5px;">⚡ Accesos Rápidos:</h4>
            <div class="app-features-grid">
              <button type="button" class="app-feature-btn" onclick="closeProfileModal(); openInventoryModal();">
                <span style="font-size:1.5rem;">🎒</span>
                <div style="text-align:left;">
                  <div style="font-weight:700;">Mi Inventario</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Ver items y /claim</div>
                </div>
              </button>

              <a href="canje.html" class="app-feature-btn" onclick="closeProfileModal();">
                <span style="font-size:1.5rem;">⭐</span>
                <div style="text-align:left;">
                  <div style="font-weight:700;">Canjear Puntos</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Recompensas gratis</div>
                </div>
              </a>

              <a href="tienda.html" class="app-feature-btn" onclick="closeProfileModal();">
                <span style="font-size:1.5rem;">🛒</span>
                <div style="text-align:left;">
                  <div style="font-weight:700;">Tienda Premium</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Ranks & Addons</div>
                </div>
              </a>

              <a href="descargas.html" class="app-feature-btn" onclick="closeProfileModal();">
                <span style="font-size:1.5rem;">📥</span>
                <div style="text-align:left;">
                  <div style="font-weight:700;">Descargar APK</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Minecraft Bedrock</div>
                </div>
              </a>
            </div>
          </div>

          <!-- Sección: Mis Compras y Pedidos en Tienda (Pagados) -->
          <div style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
              <h4 style="font-size:0.82rem; color:var(--gold); margin:0; text-transform:uppercase; letter-spacing:0.5px;">💎 Mis Compras en Tienda (Pagadas)</h4>
              <button type="button" class="btn btn-sm" onclick="closeProfileModal(); openInventoryModal('tienda');" style="font-size:0.72rem; padding:3px 8px; background:rgba(255,215,0,0.1); color:var(--gold); border:1px solid rgba(255,215,0,0.3);">
                Ver Compras en Inventario ➔
              </button>
            </div>
            <div id="profileRecentPurchasesList" style="display:flex; flex-direction:column; gap:8px;"></div>
          </div>

          <!-- Sección: Mis Beneficios & Items Gratis del Servidor (0$) -->
          <div style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
              <h4 style="font-size:0.82rem; color:#00ff88; margin:0; text-transform:uppercase; letter-spacing:0.5px;">🎁 Beneficios & Recompensas Gratis del Servidor</h4>
              <button type="button" class="btn btn-sm" onclick="closeProfileModal(); openInventoryModal('gratis');" style="font-size:0.72rem; padding:3px 8px; background:rgba(0,255,136,0.1); color:#00ff88; border:1px solid rgba(0,255,136,0.3);">
                Ver Gratis en Inventario ➔
              </button>
            </div>
            <div id="profileFreeItemsList" style="display:flex; flex-direction:column; gap:8px;"></div>
          </div>

          <!-- Banner de Instalación de la App (PWA) -->
          <div class="app-install-banner">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:1.8rem;">📱</span>
              <div>
                <div style="font-weight:700; color:#fff; font-size:0.88rem;">Instalar Titan Community como App</div>
                <div style="font-size:0.74rem; color:var(--text-muted);">Accede directamente desde tu pantalla de inicio en Android o PC</div>
              </div>
            </div>
            <button type="button" class="btn btn-sm" id="pwaInstallActionBtn" onclick="triggerPWAInstall()" style="background:#00ff88; color:#002010; font-weight:800; border:none; padding:8px 14px;">
              📲 Instalar App
            </button>
          </div>
        </div>

        <!-- ════════ PANE 2: PERSONALIZAR FOTO & PERFIL ════════ -->
        <div id="profPaneCustomize" class="profile-tab-pane">
          <!-- Vista previa y Foto Actual -->
          <div class="profile-edit-avatar-card">
            <div class="profile-avatar-wrapper">
              <img id="editAvatarPreviewImg" src="assets/logo.png" alt="Vista Previa" class="profile-skin-cube avatar-glow-gold" style="width:92px; height:92px;" />
            </div>
            <div style="flex:1; min-width:220px;">
              <div style="font-weight:800; font-size:1rem; color:#fff; margin-bottom:4px;">Tu Foto de Perfil & Skin</div>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">Sube una foto propia desde tu celular/PC, usa cualquier skin de Minecraft o elige un avatar Titán.</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <input type="file" id="profileFileInput" accept="image/*" style="display:none;" onchange="handleProfileAvatarUpload(event)" />
                <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('profileFileInput').click()" style="font-size:0.78rem; padding:7px 14px; font-weight:700;">
                  📁 Subir Foto Personal
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="resetDefaultAvatar()" style="font-size:0.78rem; padding:7px 12px;">
                  🔄 Restablecer Predeterminada
                </button>
              </div>
            </div>
          </div>

          <!-- Métodos Alternativos para Foto -->
          <div class="profile-grid-2col" style="margin-bottom:16px;">
            <!-- Skin por Nick de Minecraft -->
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px;">
              <div style="font-size:0.78rem; font-weight:700; color:var(--gold); margin-bottom:6px;">🎮 Skin de Minecraft (Bedrock / Java)</div>
              <div style="display:flex; gap:6px;">
                <input type="text" id="editSkinNickInput" placeholder="Nick de Minecraft (ej: Steve)" style="flex:1; padding:7px 10px; font-size:0.8rem; background:rgba(13,13,26,0.9); border:1px solid var(--border-subtle); border-radius:8px; color:#fff; outline:none;" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="applyMinecraftSkinAvatar()" style="padding:6px 10px; font-size:0.75rem;">Aplicar</button>
              </div>
            </div>

            <!-- URL de Imagen -->
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px;">
              <div style="font-size:0.78rem; font-weight:700; color:#00ff88; margin-bottom:6px;">🌐 Enlace Directo (URL Web)</div>
              <div style="display:flex; gap:6px;">
                <input type="text" id="editImageUrlInput" placeholder="https://ejemplo.com/foto.jpg" style="flex:1; padding:7px 10px; font-size:0.8rem; background:rgba(13,13,26,0.9); border:1px solid var(--border-subtle); border-radius:8px; color:#fff; outline:none;" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="applyImageUrlAvatar()" style="padding:6px 10px; font-size:0.75rem;">Cargar</button>
              </div>
            </div>
          </div>

          <!-- Galería de Avatares Oficiales de Titan -->
          <div style="margin-bottom:18px;">
            <div style="font-size:0.78rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">⭐ Avatares Exclusivos de Titan:</div>
            <div class="avatar-presets-grid">
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('https://mc-heads.net/avatar/Titan/128', 'Rey Titán')">
                <img src="https://mc-heads.net/avatar/Titan/64" alt="Rey Titán" onerror="this.src='assets/logo.png'" />
                <span>Titán</span>
              </button>
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('https://mc-heads.net/avatar/Steve/128', 'Steve Diamante')">
                <img src="https://mc-heads.net/avatar/Steve/64" alt="Steve" onerror="this.src='assets/logo.png'" />
                <span>Steve</span>
              </button>
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('https://mc-heads.net/avatar/Alex/128', 'Alex Exploradora')">
                <img src="https://mc-heads.net/avatar/Alex/64" alt="Alex" onerror="this.src='assets/logo.png'" />
                <span>Alex</span>
              </button>
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('https://mc-heads.net/avatar/Herobrine/128', 'Herobrine Místico')">
                <img src="https://mc-heads.net/avatar/Herobrine/64" alt="Herobrine" onerror="this.src='assets/logo.png'" />
                <span>Herobrine</span>
              </button>
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('https://mc-heads.net/avatar/Enderman/128', 'Enderman Sombrío')">
                <img src="https://mc-heads.net/avatar/Enderman/64" alt="Enderman" onerror="this.src='assets/logo.png'" />
                <span>Enderman</span>
              </button>
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('https://mc-heads.net/avatar/Technoblade/128', 'Technoblade 👑')">
                <img src="https://mc-heads.net/avatar/Technoblade/64" alt="Techno" onerror="this.src='assets/logo.png'" />
                <span>Techno</span>
              </button>
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('https://mc-heads.net/avatar/Notch/128', 'Notch Creador')">
                <img src="https://mc-heads.net/avatar/Notch/64" alt="Notch" onerror="this.src='assets/logo.png'" />
                <span>Notch</span>
              </button>
              <button type="button" class="avatar-preset-btn" onclick="applyPresetAvatar('assets/logo.png', 'Logo Oficial')">
                <img src="assets/logo.png" alt="Titan Logo" />
                <span>Oficial</span>
              </button>
            </div>
          </div>

          <!-- Aura / Efecto Visual de Avatar -->
          <div style="margin-bottom:18px;">
            <div style="font-size:0.78rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">✨ Aura y Brillo del Avatar:</div>
            <div class="aura-selector-group">
              <button type="button" class="aura-pill-btn" id="auraBtn_gold" onclick="setAvatarAura('avatar-glow-gold')">
                <span>👑</span> <span>Oro Titán</span>
              </button>
              <button type="button" class="aura-pill-btn" id="auraBtn_purple" onclick="setAvatarAura('avatar-glow-purple')">
                <span>🟣</span> <span>Púrpura Místico</span>
              </button>
              <button type="button" class="aura-pill-btn" id="auraBtn_green" onclick="setAvatarAura('avatar-glow-green')">
                <span>🟢</span> <span>Verde Neón</span>
              </button>
              <button type="button" class="aura-pill-btn" id="auraBtn_cyan" onclick="setAvatarAura('avatar-glow-cyan')">
                <span>🔵</span> <span>Cian Cósmico</span>
              </button>
              <button type="button" class="aura-pill-btn" id="auraBtn_red" onclick="setAvatarAura('avatar-glow-red')">
                <span>🔥</span> <span>Fuego Carmesí</span>
              </button>
              <button type="button" class="aura-pill-btn" id="auraBtn_none" onclick="setAvatarAura('avatar-glow-none')">
                <span>⚪</span> <span>Clásico</span>
              </button>
            </div>
          </div>

          <!-- Campos de Perfil y Demás -->
          <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:16px; margin-bottom:20px;">
            <div style="font-size:0.85rem; font-weight:800; color:#fff; margin-bottom:12px;">📝 Información del Perfil</div>

            <div class="profile-form-group">
              <label for="editProfileBio">Biografía / Frase de Estado</label>
              <input type="text" id="editProfileBio" maxlength="90" placeholder="Ej: ⚔️ Rey de la arena PvP en Titan Survival | Clan Titanes" />
            </div>

            <div class="profile-grid-2col">
              <div class="profile-form-group">
                <label for="editProfileDiscord">Discord Tag / Usuario</label>
                <input type="text" id="editProfileDiscord" maxlength="32" placeholder="Ej: @mi_usuario" />
              </div>
              <div class="profile-form-group">
                <label for="editProfilePlatform">Plataforma Principal</label>
                <select id="editProfilePlatform">
                  <option value="📱 Móvil (Android/iOS)">📱 Móvil (Android/iOS)</option>
                  <option value="💻 PC (Windows 10/11)">💻 PC (Windows 10/11)</option>
                  <option value="🎮 Consola (Xbox/PS/Switch)">🎮 Consola (Xbox/PS/Switch)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Botón de Guardar -->
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn btn-secondary" onclick="switchProfileTab('summary')">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="saveProfileCustomizations()" style="font-weight:800; padding:10px 24px;">
              💾 Guardar Todos los Cambios
            </button>
          </div>
        </div>

        <!-- ════════ PANE 3: SEGURIDAD & CUENTA ════════ -->
        <div id="profPaneSecurity" class="profile-tab-pane">
          <div id="profSecurityPasswordSection" style="margin-bottom:20px;">
            <div style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:6px;">🔑 Cambiar Contraseña</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:14px;">Actualiza la contraseña de tu cuenta de Bedrock registrada.</div>

            <div class="profile-form-group">
              <label for="secCurrentPassword">Contraseña Actual</label>
              <input type="password" id="secCurrentPassword" placeholder="Introduce tu contraseña actual" />
            </div>

            <div class="profile-grid-2col">
              <div class="profile-form-group">
                <label for="secNewPassword">Nueva Contraseña</label>
                <input type="password" id="secNewPassword" placeholder="Mínimo 4 caracteres" />
              </div>
              <div class="profile-form-group">
                <label for="secRepeatPassword">Confirmar Nueva Contraseña</label>
                <input type="password" id="secRepeatPassword" placeholder="Repite la contraseña" />
              </div>
            </div>

            <button type="button" class="btn btn-primary btn-sm" onclick="changeUserPassword()" style="margin-top:6px;">
              🔒 Actualizar Contraseña
            </button>
          </div>

          <div id="profSecurityGoogleNotice" style="display:none; background:rgba(66,133,244,0.1); border:1px solid rgba(66,133,244,0.3); border-radius:12px; padding:16px; margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
              <span style="font-size:1.4rem;">🛡️</span>
              <div style="font-weight:700; color:#fff; font-size:0.9rem;">Cuenta Protegida por Google</div>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.5;">
              Tu cuenta está autenticada y vinculada a través de Google Single Sign-On. La gestión de contraseñas y doble factor es manejada directamente por la seguridad de tu cuenta de Google.
            </p>
          </div>

          <!-- Auditoría de la Cuenta -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px;">
            <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Detalles de la Cuenta:</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.8rem;">
              <div><span style="color:var(--text-muted);">Nick del Servidor:</span> <strong id="secNickVal" style="color:#fff;">-</strong></div>
              <div><span style="color:var(--text-muted);">Tipo de Registro:</span> <strong id="secProviderVal" style="color:var(--gold);">-</strong></div>
              <div><span style="color:var(--text-muted);">Fecha de Creación:</span> <span id="secDateVal" style="color:var(--text-muted);">-</span></div>
              <div><span style="color:var(--text-muted);">Rango Oficial:</span> <span id="secRoleVal" style="color:#00ff88; font-weight:700;">-</span></div>
            </div>
          </div>
        </div>

        <!-- Footer del Modal -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.08);">
          <span style="font-size:0.72rem; color:var(--text-muted);">Titan Community App v20.2</span>
          <button type="button" class="btn btn-secondary btn-sm" onclick="logoutUser(); closeProfileModal();" style="color:#ff6b6b; border-color:rgba(255,107,107,0.3);">
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => {
      if (e.target.id === 'profileAppModal') closeProfileModal();
    });
  }

  /* ─ Manejadores de Personalización de Perfil ──── */
  window.switchProfileTab = function(tabName) {
    const tabs = ['summary', 'customize', 'security'];
    tabs.forEach(t => {
      const btn = document.getElementById('profTabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
      const pane = document.getElementById('profPane' + t.charAt(0).toUpperCase() + t.slice(1));
      if (btn) btn.classList.toggle('active', t === tabName);
      if (pane) pane.classList.toggle('active', t === tabName);
    });
  };

  window.handleProfileAvatarUpload = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (typeof showToast === 'function') showToast('El archivo debe ser una imagen válida (JPG, PNG, GIF, WEBP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast('La imagen no debe pesar más de 5 MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 180, 180);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        currentEditAvatar = dataUrl;
        const prev = document.getElementById('editAvatarPreviewImg');
        if (prev) prev.src = dataUrl;
        if (typeof showToast === 'function') showToast('📷 Foto cargada. Haz clic en "Guardar Todos los Cambios" para aplicarla', 'info');
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.applyMinecraftSkinAvatar = function() {
    const nickInp = document.getElementById('editSkinNickInput');
    const nick = (nickInp?.value || '').trim();
    if (!nick) {
      if (typeof showToast === 'function') showToast('Escribe un nombre o nick de Minecraft', 'error');
      return;
    }
    currentEditAvatar = `https://mc-heads.net/avatar/${encodeURIComponent(nick)}/128`;
    const prev = document.getElementById('editAvatarPreviewImg');
    if (prev) prev.src = currentEditAvatar;
    if (typeof showToast === 'function') showToast(`Skin de "${nick}" cargada. Haz clic en "Guardar Cambios"`, 'success');
  };

  window.applyImageUrlAvatar = function() {
    const urlInp = document.getElementById('editImageUrlInput');
    const url = (urlInp?.value || '').trim();
    if (!url || !url.startsWith('http')) {
      if (typeof showToast === 'function') showToast('Introduce una URL válida que empiece por http:// o https://', 'error');
      return;
    }
    currentEditAvatar = url;
    const prev = document.getElementById('editAvatarPreviewImg');
    if (prev) prev.src = currentEditAvatar;
    if (typeof showToast === 'function') showToast('Imagen cargada. Haz clic en "Guardar Cambios"', 'success');
  };

  window.applyPresetAvatar = function(url, label) {
    currentEditAvatar = url;
    const prev = document.getElementById('editAvatarPreviewImg');
    if (prev) prev.src = currentEditAvatar;
    if (typeof showToast === 'function') showToast(`Avatar de ${label} seleccionado. Guarda los cambios para aplicarlo.`, 'info');
  };

  window.resetDefaultAvatar = function() {
    const user = getCurrentUser();
    if (!user) return;
    currentEditAvatar = '';
    const prev = document.getElementById('editAvatarPreviewImg');
    if (prev) prev.src = `https://crafatar.com/avatars/${encodeURIComponent(user.nick)}?size=84&overlay`;
    if (typeof showToast === 'function') showToast('Avatar restablecido a la skin predeterminada', 'info');
  };

  window.setAvatarAura = function(auraClass) {
    currentEditAura = auraClass;
    const prev = document.getElementById('editAvatarPreviewImg');
    if (prev) {
      prev.className = 'profile-skin-cube ' + auraClass;
    }
    document.querySelectorAll('.aura-pill-btn').forEach(btn => btn.classList.remove('active'));
    const key = auraClass.replace('avatar-glow-', '');
    const activeBtn = document.getElementById('auraBtn_' + key);
    if (activeBtn) activeBtn.classList.add('active');
  };

  window.saveProfileCustomizations = function() {
    const user = getCurrentUser();
    if (!user) return;

    const bio = document.getElementById('editProfileBio')?.value.trim() || '';
    const discord = document.getElementById('editProfileDiscord')?.value.trim() || '';
    const platform = document.getElementById('editProfilePlatform')?.value || '📱 Móvil (Android/iOS)';

    user.customAvatar = currentEditAvatar;
    user.avatarAura = currentEditAura;
    user.bio = bio;
    user.discordTag = discord;
    user.platform = platform;

    // Actualizar titanUsers
    const users = getUsers();
    const key = user.nick.toLowerCase();
    if (users[key]) {
      users[key].customAvatar = currentEditAvatar;
      users[key].avatarAura = currentEditAura;
      users[key].bio = bio;
      users[key].discordTag = discord;
      users[key].platform = platform;
      saveUsers(users);
    }

    // Actualizar titanProfiles
    const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
    if (profiles[user.nick]) {
      profiles[user.nick].customAvatar = currentEditAvatar;
      profiles[user.nick].avatarAura = currentEditAura;
      profiles[user.nick].bio = bio;
      profiles[user.nick].discordTag = discord;
      profiles[user.nick].platform = platform;
      localStorage.setItem('titanProfiles', JSON.stringify(profiles));
      if (window.TitanFirebase && typeof window.TitanFirebase.saveProfile === 'function') {
        window.TitanFirebase.saveProfile(user.nick, profiles[user.nick]);
      }
    }

    setCurrentUser(user);
    openProfileModal();
    switchProfileTab('summary');
    if (typeof showToast === 'function') showToast('✅ ¡Perfil y avatar actualizados exitosamente!', 'success');
  };

  window.changeUserPassword = function() {
    const user = getCurrentUser();
    if (!user) return;

    if (user.authProvider === 'google' || user.authProvider === 'discord') {
      if (typeof showToast === 'function') showToast(`Las cuentas vinculadas a ${user.authProvider === 'google' ? 'Google' : 'Discord'} no usan contraseña local`, 'info');
      return;
    }

    const curPass = document.getElementById('secCurrentPassword')?.value || '';
    const newPass = document.getElementById('secNewPassword')?.value || '';
    const repPass = document.getElementById('secRepeatPassword')?.value || '';

    const users = getUsers();
    const key = user.nick.toLowerCase();
    const dbUser = users[key];

    if (!dbUser || dbUser.password !== curPass) {
      if (typeof showToast === 'function') showToast('La contraseña actual es incorrecta', 'error');
      return;
    }

    if (!newPass || newPass.length < 4) {
      if (typeof showToast === 'function') showToast('La nueva contraseña debe tener al menos 4 caracteres', 'error');
      return;
    }

    if (newPass !== repPass) {
      if (typeof showToast === 'function') showToast('Las nuevas contraseñas no coinciden', 'error');
      return;
    }

    dbUser.password = newPass;
    users[key] = dbUser;
    saveUsers(users);

    const p1 = document.getElementById('secCurrentPassword');
    const p2 = document.getElementById('secNewPassword');
    const p3 = document.getElementById('secRepeatPassword');
    if (p1) p1.value = '';
    if (p2) p2.value = '';
    if (p3) p3.value = '';

    if (typeof showToast === 'function') showToast('🔒 ¡Contraseña actualizada exitosamente!', 'success');
  };

  window.openProfileModal = function() {
    const user = getCurrentUser();
    if (!user) {
      if (typeof showToast === 'function') showToast('Debes iniciar sesión para ver tu perfil', 'info');
      openAuthModal('login', () => openProfileModal());
      return;
    }

    injectProfileModal();
    const modal = document.getElementById('profileAppModal');
    if (!modal) return;

    // Inicializar estado de edición
    currentEditAvatar = user.customAvatar || '';
    currentEditAura = user.avatarAura || 'avatar-glow-gold';

    // Actualizar datos del usuario en el perfil
    const nickEl = document.getElementById('profileAppNick');
    const skinEl = document.getElementById('profileAppSkin');
    const roleBadge = document.getElementById('profileAppRoleBadge');
    const authBadge = document.getElementById('profileAuthProviderBadge');
    const bioEl = document.getElementById('profileAppBio');
    const customChipsEl = document.getElementById('profileAppCustomChips');

    const isAdmin = (user.role === 'admin' || user.nick.toLowerCase() === 'admin');
    const isGoogle = (user.authProvider === 'google');
    const isDiscord = (user.authProvider === 'discord');

    if (nickEl) nickEl.textContent = user.nick;
    
    // Asignar avatar y aura seleccionada
    const avatarSrc = getUserAvatar(user, 100);
    if (skinEl) {
      skinEl.src = avatarSrc;
      skinEl.className = 'profile-skin-cube ' + (user.avatarAura || 'avatar-glow-gold');
    }

    const editPreview = document.getElementById('editAvatarPreviewImg');
    if (editPreview) {
      editPreview.src = avatarSrc;
      editPreview.className = 'profile-skin-cube ' + (user.avatarAura || 'avatar-glow-gold');
    }

    if (roleBadge) {
      roleBadge.textContent = isAdmin ? '👑 ADMINISTRADOR' : '⭐ MIEMBRO TITAN';
      roleBadge.style.background = isAdmin ? 'var(--gold)' : 'var(--purple-main)';
      roleBadge.style.color = isAdmin ? '#1a0a00' : '#fff';
    }

    if (authBadge) {
      if (isGoogle) {
        authBadge.innerHTML = '🌐 Google Conectado';
      } else if (isDiscord) {
        authBadge.innerHTML = '💬 Discord Conectado';
        authBadge.style.background = 'rgba(88, 101, 242, 0.2)';
        authBadge.style.color = '#c7d2fe';
        authBadge.style.border = '1px solid rgba(88, 101, 242, 0.4)';
      } else {
        authBadge.innerHTML = '🎮 Bedrock ID';
      }
    }

    // Biografía y Chips
    if (bioEl) {
      if (user.bio) {
        bioEl.textContent = `💬 "${user.bio}"`;
        bioEl.style.display = 'block';
      } else {
        bioEl.style.display = 'none';
      }
    }

    if (customChipsEl) {
      let chipsHtml = '';
      if (user.platform) {
        chipsHtml += `<span style="font-size:0.72rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#e2e8f0; padding:2px 8px; border-radius:999px;">${user.platform}</span>`;
      }
      if (user.discordTag) {
        chipsHtml += `<span style="font-size:0.72rem; background:rgba(88,101,242,0.15); border:1px solid rgba(88,101,242,0.35); color:#c7d2fe; padding:2px 8px; border-radius:999px;">💬 ${user.discordTag}</span>`;
      }
      customChipsEl.innerHTML = chipsHtml;
    }

    // Campos de edición
    const editBioInp = document.getElementById('editProfileBio');
    const editDiscInp = document.getElementById('editProfileDiscord');
    const editPlatInp = document.getElementById('editProfilePlatform');
    if (editBioInp) editBioInp.value = user.bio || '';
    if (editDiscInp) editDiscInp.value = user.discordTag || '';
    if (editPlatInp && user.platform) editPlatInp.value = user.platform;

    // Resaltar aura activa
    const activeAuraKey = (user.avatarAura || 'avatar-glow-gold').replace('avatar-glow-', '');
    document.querySelectorAll('.aura-pill-btn').forEach(btn => btn.classList.remove('active'));
    const activeAuraBtn = document.getElementById('auraBtn_' + activeAuraKey);
    if (activeAuraBtn) activeAuraBtn.classList.add('active');

    // Seguridad
    const secPassSec = document.getElementById('profSecurityPasswordSection');
    const secGoogNot = document.getElementById('profSecurityGoogleNotice');
    if (isGoogle || isDiscord) {
      if (secPassSec) secPassSec.style.display = 'none';
      if (secGoogNot) {
        secGoogNot.style.display = 'block';
        secGoogNot.innerHTML = isGoogle 
          ? '🌐 <strong>Cuenta Vinculada con Google:</strong> Tu inicio de sesión se gestiona con tu cuenta Google oficial de forma segura.'
          : `💬 <strong>Cuenta Vinculada con Discord:</strong> Tu inicio de sesión se gestiona con tu cuenta de Discord (${user.discordTag || '@' + user.nick}) de forma segura.`;
      }
    } else {
      if (secPassSec) secPassSec.style.display = 'block';
      if (secGoogNot) secGoogNot.style.display = 'none';
    }

    const secNick = document.getElementById('secNickVal');
    const secProv = document.getElementById('secProviderVal');
    const secDate = document.getElementById('secDateVal');
    const secRole = document.getElementById('secRoleVal');
    if (secNick) secNick.textContent = user.nick;
    if (secProv) secProv.textContent = isGoogle ? 'Cuenta Google' : (isDiscord ? 'Cuenta Discord' : 'Minecraft Bedrock');
    if (secDate) secDate.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString('es') : 'Registrado';
    if (secRole) secRole.textContent = isAdmin ? 'Administrador 👑' : 'Miembro Oficial ⭐';

    // Calcular estadísticas
    let points = 0;
    let streak = 1;
    const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
    if (profiles[user.nick]) {
      points = profiles[user.nick].points || 0;
      streak = profiles[user.nick].streak || 1;
    }

    const items = getUserInventory(user.nick);
    let ordersCount = 0;
    try {
      const orders = JSON.parse(localStorage.getItem('titanOrders') || '[]');
      ordersCount = orders.filter(o => o.nick && o.nick.toLowerCase() === user.nick.toLowerCase()).length;
    } catch (e) {}

    const statPts = document.getElementById('profileStatPoints');
    const statStr = document.getElementById('profileStatStreak');
    const statItm = document.getElementById('profileStatItems');
    const statOrd = document.getElementById('profileStatOrders');

    if (statPts) statPts.textContent = `${points} pts`;
    if (statStr) statStr.textContent = `${streak} día${streak > 1 ? 's' : ''}`;
    if (statItm) statItm.textContent = `${items.length} items`;
    if (statOrd) statOrd.textContent = `${ordersCount}`;

    // Renderizar compras recientes en el resumen del perfil
    const purchasesContainer = document.getElementById('profileRecentPurchasesList');
    if (purchasesContainer) {
      const tiendaItems = items.filter(i => i.isPurchased === true || i.category === 'tienda');
      if (tiendaItems.length === 0) {
        purchasesContainer.innerHTML = `
          <div style="padding:14px; background:rgba(255,255,255,0.02); border:1px dashed var(--border-subtle); border-radius:10px; text-align:center; font-size:0.78rem; color:var(--text-muted);">
            No tienes compras registradas en la tienda aún. <a href="tienda.html" onclick="closeProfileModal()" style="color:var(--gold); font-weight:700; text-decoration:none;">Explorar Tienda ➔</a>
          </div>
        `;
      } else {
        purchasesContainer.innerHTML = tiendaItems.slice(0, 5).map(it => {
          const isApproved = it.isApproved !== false && (!it.status.toLowerCase().includes('pendiente'));
          const cleanName = it.name.replace(/'/g, "\\'");
          return `
            <div style="background:rgba(255,255,255,0.03); border:1px solid ${isApproved ? 'rgba(0,255,136,0.25)' : 'rgba(255,165,0,0.3)'}; border-radius:10px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <span style="font-size:1.3rem;">${it.icon}</span>
                <div style="min-width:0;">
                  <div style="font-weight:700; font-size:0.84rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    <span style="color:var(--gold); font-size:0.7rem; font-weight:800; margin-right:4px;">[TIENDA]</span>${it.name}
                  </div>
                  <div style="font-size:0.68rem; color:var(--text-muted);">${it.date} · Orden: <span style="color:var(--gold); font-family:monospace;">${it.orderId}</span></div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                ${isApproved ? `
                  <button type="button" class="inventory-claim-btn" onclick="copyClaimCommand('${cleanName}')" style="padding:4px 10px; font-size:0.72rem;">
                    <span>📋</span> <span>/claim</span>
                  </button>
                  <span style="font-size:0.7rem; color:#00ff88; font-weight:700;">✓ Listo</span>
                ` : `
                  <button type="button" class="buy-btn gold-btn" onclick="closeProfileModal(); promptValidatePayPal('${it.orderId}')" style="padding:5px 12px; font-size:0.72rem; border-radius:6px; font-weight:700;">
                    <span>💳 Validar PayPal</span>
                  </button>
                  <span style="font-size:0.7rem; color:#ff9f43; font-weight:700;">⏳ Pendiente</span>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Renderizar beneficios y recompensas gratis en el resumen del perfil
    const freeContainer = document.getElementById('profileFreeItemsList');
    if (freeContainer) {
      const freeItems = items.filter(i => (i.isFree === true || i.category === 'gratis') && i.category !== 'tienda');
      if (freeItems.length === 0) {
        freeContainer.innerHTML = `
          <div style="padding:14px; background:rgba(0,255,136,0.02); border:1px dashed rgba(0,255,136,0.25); border-radius:10px; text-align:center; font-size:0.78rem; color:var(--text-muted);">
            No tienes items gratis activos. <a href="canje.html" onclick="closeProfileModal()" style="color:#00ff88; font-weight:700; text-decoration:none;">Canjear Puntos Gratis ➔</a>
          </div>
        `;
      } else {
        freeContainer.innerHTML = freeItems.slice(0, 5).map(it => {
          const cleanName = it.name.replace(/'/g, "\\'");
          return `
            <div style="background:rgba(0,255,136,0.03); border:1px solid rgba(0,255,136,0.25); border-radius:10px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <span style="font-size:1.3rem;">${it.icon}</span>
                <div style="min-width:0;">
                  <div style="font-weight:700; font-size:0.84rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    <span style="color:#00ff88; font-size:0.7rem; font-weight:800; margin-right:4px;">[GRATIS]</span>${it.name}
                  </div>
                  <div style="font-size:0.68rem; color:var(--text-muted);">${it.source || 'Servidor Titan'} · <span style="color:#00ff88; font-weight:600;">$0.00 USD</span></div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                <button type="button" class="inventory-claim-btn" onclick="copyClaimCommand('${cleanName}')" style="padding:4px 10px; font-size:0.72rem; background:rgba(0,255,136,0.15); border:1px solid rgba(0,255,136,0.4); color:#00ff88;">
                  <span>📋</span> <span>/claim</span>
                </button>
                <span style="font-size:0.7rem; color:#00ff88; font-weight:700;">✓ Activo</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Volver por defecto a la pestaña de resumen
    switchProfileTab('summary');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeProfileModal = function() {
    const modal = document.getElementById('profileAppModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.triggerPWAInstall = function() {
    if (deferredPWAInstallPrompt) {
      deferredPWAInstallPrompt.prompt();
      deferredPWAInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          if (typeof showToast === 'function') showToast('¡Gracias por instalar la App de Titan Community!', 'success');
        }
        deferredPWAInstallPrompt = null;
      });
    } else {
      if (typeof showToast === 'function') {
        showToast('Para instalar: Toca los 3 puntos del navegador y elige "Instalar App" o "Agregar a la pantalla principal"', 'info');
      }
    }
  };

  window.closeUserDropdown = function(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.remove('open');
    const backdrop = document.getElementById('userDropdownBackdrop');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('sheet-open');
  };

  window.navUserDropdownGo = function(url) {
    window.closeUserDropdown();
    if (url) {
      setTimeout(() => {
        window.location.href = url;
      }, 50);
    }
  };

  window.navUserDropdownProfile = function() {
    window.closeUserDropdown();
    setTimeout(() => {
      if (typeof window.openProfileModal === 'function') {
        window.openProfileModal();
      }
    }, 90);
  };

  window.navUserDropdownInventory = function(filter) {
    window.closeUserDropdown();
    setTimeout(() => {
      if (typeof window.openInventoryModal === 'function') {
        window.openInventoryModal(filter || 'all');
      }
    }, 90);
  };

  window.navUserDropdownLogout = function() {
    window.closeUserDropdown();
    setTimeout(() => {
      if (typeof logoutUser === 'function') {
        logoutUser();
      }
    }, 60);
  };

  window.toggleUserDropdown = function(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const menu = document.getElementById('userDropdownMenu');
    const notif = document.getElementById('notifDropdown');
    if (notif) notif.classList.remove('open');
    if (!menu) return;

    let backdrop = document.getElementById('userDropdownBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'userDropdownBackdrop';
      backdrop.className = 'user-dropdown-backdrop';
      backdrop.onclick = function(ev) {
        ev.stopPropagation();
        window.closeUserDropdown();
      };
      document.body.appendChild(backdrop);
    }

    const isOpen = menu.classList.contains('open');
    if (isOpen) {
      window.closeUserDropdown();
    } else {
      if (window.innerWidth <= 768) {
        // En móvil, trasladar el menú a document.body para desacoplarlo
        // del stacking context de .navbar (que tiene backdrop-filter)
        if (menu.parentElement !== document.body) {
          document.body.appendChild(menu);
        }
        if (backdrop) backdrop.classList.add('active');
        document.body.classList.add('sheet-open');
      } else {
        const pillContainer = document.querySelector('.user-pill-container');
        if (pillContainer && menu.parentElement !== pillContainer) {
          pillContainer.appendChild(menu);
        }
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('sheet-open');
      }
      menu.classList.add('open');
    }
  };

  document.addEventListener('click', (e) => {
    const userContainer = document.getElementById('userAuthContainer');
    const menu = document.getElementById('userDropdownMenu');
    if (menu && menu.classList.contains('open')) {
      const pill = document.querySelector('.user-pill');
      const clickedInsideMenu = menu.contains(e.target);
      const clickedInsidePill = (userContainer && userContainer.contains(e.target)) || (pill && pill.contains(e.target));
      if (!clickedInsideMenu && !clickedInsidePill) {
        window.closeUserDropdown();
      }
    }
    const notif = document.getElementById('notifDropdown');
    if (notif && notif.classList.contains('open')) {
      const notifWrap = document.querySelector('.notif-pill-wrap');
      if (!notif.contains(e.target) && (!notifWrap || !notifWrap.contains(e.target))) {
        notif.classList.remove('open');
      }
    }
  });

  window.addEventListener('resize', () => {
    const menu = document.getElementById('userDropdownMenu');
    if (!menu) return;
    if (window.innerWidth > 768) {
      const pillContainer = document.querySelector('.user-pill-container');
      if (pillContainer && menu.parentElement !== pillContainer) {
        pillContainer.appendChild(menu);
      }
      document.body.classList.remove('sheet-open');
      document.getElementById('userDropdownBackdrop')?.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeUserDropdown();
      document.getElementById('notifDropdown')?.classList.remove('open');
    }
  });

  /* ─ Anuncio Global en la cabecera ────────────── */
  function renderGlobalAnnouncement() {
    const ann = localStorage.getItem('titanAnnouncement');
    const existing = document.getElementById('globalAnnouncementBar');
    if (!ann) {
      if (existing) existing.remove();
      return;
    }
    if (existing) {
      existing.querySelector('.ann-text').textContent = ann;
      return;
    }
    const bar = document.createElement('div');
    bar.id = 'globalAnnouncementBar';
    bar.className = 'global-announcement-bar';
    bar.innerHTML = `
      <span>📢</span>
      <span class="ann-text" style="flex:1;">${ann}</span>
      <button onclick="localStorage.removeItem('titanAnnouncement'); this.parentElement.remove();" style="background:transparent; border:none; color:white; font-size:0.9rem; cursor:pointer;" title="Cerrar aviso">✕</button>
    `;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ─ Actualización de la Barra de Navegación ───── */
  function updateAuthUI() {
    renderGlobalAnnouncement();
    const user = getCurrentUser();

    // ━━ 1. CONTROL DE NAVEGACIÓN PRINCIPAL: OCULTAR DISCORD AL INICIAR SESIÓN ━━
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
      const discordLinks = navLinks.querySelectorAll('a[href*="discord"], a[href*="discord.html"]');
      discordLinks.forEach(link => {
        const li = link.closest('li');
        if (li) {
          li.style.display = user ? 'none' : '';
        }
      });
    }

    // ━━ 2. MENÚ DE USUARIO Y CENTRO DE NOTIFICACIONES (ZONA SUPERIOR DERECHA) ━━
    const navCta = document.querySelector('.nav-cta');
    if (navCta) {
      // Ocultar botones estáticos como '🛒 Tienda' cuando hay sesión activa para evitar duplicados
      navCta.querySelectorAll(':scope > a.btn, :scope > a.btn-primary, :scope > a.btn-discord').forEach(btn => {
        btn.style.display = user ? 'none' : '';
      });
    }

    let container = document.getElementById('userAuthContainer');
    if (!container) {
      if (!navCta) return;
      container = document.createElement('div');
      container.id = 'userAuthContainer';
      container.className = 'user-auth-wrap';
      navCta.insertBefore(container, navCta.firstChild);
    }

    if (!user) {
      container.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <!-- 🔔 CAMPANITA DE NOTIFICACIONES (PÚBLICA / COMUNITARIA) -->
          <div class="notif-pill-wrap">
            <button class="notif-btn" id="notifBtn" onclick="toggleNotifDropdown(event)" title="Notificaciones & Anuncios de la Comunidad">
              <span>🔔</span>
              <span class="notif-badge" id="notifBadge" style="display:none;">0</span>
            </button>
            <div class="notif-dropdown" id="notifDropdown">
              <div class="notif-header">
                <span style="font-weight:700; font-size:0.85rem; color:#fff;">🔔 Avisos y Anuncios</span>
                <button class="notif-clear-btn" onclick="markAllNotifsRead()">Marcar leídas</button>
              </div>
              <div class="notif-list" id="notifList"></div>
            </div>
          </div>

          <button class="user-auth-btn" onclick="openAuthModal('login')">
            <span>👤 Iniciar Sesión</span>
          </button>
        </div>
      `;
      renderNotificationsUI(null);
    } else {
      let points = 0;
      const profiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      if (profiles[user.nick] && typeof profiles[user.nick].points === 'number') {
        points = profiles[user.nick].points;
      }

      const isAdmin = (user.role === 'admin' || user.nick.toLowerCase() === 'admin');
      const isGoogle = (user.authProvider === 'google');
      const isDiscord = (user.authProvider === 'discord');
      const roleLabel = isAdmin ? '👑 ADMIN' : '⭐ JUGADOR';
      let providerLabel = `<span style="color:var(--text-muted); font-size:0.68rem;">🎮 Bedrock</span>`;
      if (isGoogle) {
        providerLabel = `<span style="color:#4285F4; font-size:0.68rem; display:flex; align-items:center; gap:3px;">🔵 ${user.email || 'Google'}</span>`;
      } else if (isDiscord) {
        providerLabel = `<span style="color:#5865F2; font-size:0.68rem; display:flex; align-items:center; gap:3px;">💬 ${user.discordTag || 'Discord'}</span>`;
      }

      container.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <!-- 🔔 CAMPANITA DE NOTIFICACIONES -->
          <div class="notif-pill-wrap">
            <button class="notif-btn" id="notifBtn" onclick="toggleNotifDropdown(event)" title="Centro de Notificaciones">
              <span>🔔</span>
              <span class="notif-badge" id="notifBadge" style="display:none;">0</span>
            </button>
            <div class="notif-dropdown" id="notifDropdown">
              <div class="notif-header">
                <span style="font-weight:700; font-size:0.85rem; color:#fff;">🔔 Notificaciones</span>
                <button class="notif-clear-btn" onclick="markAllNotifsRead()">Marcar leídas</button>
              </div>
              <div class="notif-list" id="notifList"></div>
            </div>
          </div>

          <!-- 👤 PÍLDORA DEL JUGADOR Y MENÚ -->
          <div class="user-pill-container">
            <div class="user-pill" onclick="toggleUserDropdown(event)" title="Menú de Miembro">
              <img class="user-pill-avatar ${user.avatarAura || ''}" src="${getUserAvatar(user, 28)}" onerror="this.src='assets/logo.png'" alt="${user.nick}" />
              <span class="user-pill-name">${user.nick}</span>
              <span class="user-pill-points">⭐ ${points}</span>
              <span style="font-size:0.6rem; opacity:0.7;">▼</span>
            </div>

            <!-- MENÚ DE MIEMBRO EXCLUSIVO (BOTTOM-SHEET EN MÓVIL) -->
            <div class="user-dropdown" id="userDropdownMenu">
              <div class="user-dropdown-handle"></div>

              <div class="user-dropdown-header">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                  <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                    <img class="${user.avatarAura || ''}" src="${getUserAvatar(user, 44)}" onerror="this.src='assets/logo.png'" style="width:40px; height:40px; border-radius:10px; border:2px solid var(--gold); object-fit:cover; background:#000; flex-shrink:0;" alt="${user.nick}" />
                    <div style="min-width:0;">
                      <div style="font-weight:800; color:var(--text-primary); font-size:0.98rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${user.nick}
                      </div>
                      <div style="display:flex; align-items:center; gap:6px; margin-top:2px; flex-wrap:wrap;">
                        <span style="background:${isAdmin ? 'linear-gradient(135deg, #ffd700, #ff6b35)' : 'rgba(123,47,255,0.3)'}; color:${isAdmin ? '#000' : '#c77dff'}; font-weight:800; font-size:0.62rem; padding:1px 6px; border-radius:4px;">
                          ${roleLabel}
                        </span>
                        ${providerLabel}
                      </div>
                    </div>
                  </div>
                  <!-- Botón de cerrar para celular -->
                  <button type="button" class="user-dropdown-close-btn" onclick="closeUserDropdown(event)" aria-label="Cerrar menú">✕</button>
                </div>

                <div class="user-dropdown-balance-card">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.15rem;">⭐</span>
                    <div>
                      <div style="color:var(--text-muted); font-size:0.65rem; text-transform:uppercase; font-weight:700; letter-spacing:0.4px;">Saldo Titan</div>
                      <div style="color:var(--gold); font-weight:800; font-size:0.92rem;">${points} pts</div>
                    </div>
                  </div>
                  <button type="button" onclick="window.navUserDropdownGo('canje.html')" style="color:var(--gold); font-size:0.75rem; font-weight:700; text-decoration:none; background:rgba(255,215,0,0.12); border:1px solid rgba(255,215,0,0.3); padding:5px 11px; border-radius:6px; cursor:pointer; transition:all 0.2s;">
                    Canjear →
                  </button>
                </div>
              </div>

              <!-- ENLACES DEL MENÚ PERSONALIZADO -->
              <div class="user-dropdown-body">
                <button type="button" onclick="window.navUserDropdownProfile()" class="user-dropdown-item item-profile">
                  <span class="user-dropdown-icon">👤</span>
                  <span class="user-dropdown-text">Mi Perfil & App Hub</span>
                  <span class="user-dropdown-tag" style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3);">ACTIVO</span>
                </button>
                <button type="button" onclick="window.navUserDropdownInventory('all')" class="user-dropdown-item item-inventory">
                  <span class="user-dropdown-icon">🎒</span>
                  <span class="user-dropdown-text">Mi Inventario de Items</span>
                  <span class="user-dropdown-arrow">›</span>
                </button>
                <button type="button" onclick="window.navUserDropdownGo('servidor.html')" class="user-dropdown-item">
                  <span class="user-dropdown-icon">⚔️</span>
                  <span class="user-dropdown-text">Mi Servidor & Estado</span>
                  <span class="user-dropdown-arrow">›</span>
                </button>
                <button type="button" onclick="window.navUserDropdownGo('canje.html')" class="user-dropdown-item">
                  <span class="user-dropdown-icon">⭐</span>
                  <span class="user-dropdown-text">Canjear Recompensas</span>
                  <span class="user-dropdown-arrow">›</span>
                </button>
                <button type="button" onclick="window.navUserDropdownGo('tienda.html')" class="user-dropdown-item">
                  <span class="user-dropdown-icon">🛒</span>
                  <span class="user-dropdown-text">Tienda & Carrito</span>
                  <span class="user-dropdown-arrow">›</span>
                </button>
                <button type="button" onclick="window.navUserDropdownGo('descargas.html')" class="user-dropdown-item">
                  <span class="user-dropdown-icon">📥</span>
                  <span class="user-dropdown-text">Zona de Descargas</span>
                  <span class="user-dropdown-arrow">›</span>
                </button>
                ${isAdmin ? `
                  <button type="button" onclick="window.navUserDropdownGo('admin.html')" class="user-dropdown-item admin-btn">
                    <span class="user-dropdown-icon">⚡</span>
                    <span class="user-dropdown-text">Panel de Administrador</span>
                    <span class="user-dropdown-tag" style="background:rgba(255,215,0,0.2); color:#ffd700; border:1px solid rgba(255,215,0,0.4);">ADMIN</span>
                  </button>
                ` : ''}

                <div class="user-dropdown-divider"></div>

                <button type="button" class="user-dropdown-item danger" onclick="window.navUserDropdownLogout()">
                  <span class="user-dropdown-icon">🚪</span>
                  <span class="user-dropdown-text">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      renderNotificationsUI(user.nick);

      if (typeof playerData !== 'undefined' && playerData.nick !== user.nick) {
        playerData.nick = user.nick;
        if (typeof loadPlayer === 'function') {
          const nickInput = document.getElementById('nicknameInput');
          if (nickInput) nickInput.value = user.nick;
          loadPlayer();
        }
      }
    }
  }

  // Exportar helper global para consultar usuario, inventario y notificaciones
  window.TitanAuth = {
    getCurrentUser,
    setCurrentUser,
    getUsers,
    saveUsers,
    openAuthModal,
    closeAuthModal,
    openGoogleAuthModal,
    closeGoogleAuthModal,
    openDiscordAuthModal,
    closeDiscordAuthModal,
    handleDiscordSignIn,
    openInventoryModal,
    closeInventoryModal,
    openProfileModal,
    closeProfileModal,
    triggerPWAInstall,
    toggleNotifDropdown,
    addNotification,
    broadcastNotification,
    openNotifDetail,
    closeNotifDetail,
    renderNotificationsUI,
    getUserInventory,
    getUserNotifications,
    getUserAvatar,
    switchProfileTab,
    logoutUser,
    updateAuthUI,
    isAdmin: function() {
      const u = getCurrentUser();
      return u && (u.role === 'admin' || u.nick.toLowerCase() === 'admin');
    }
  };

  /* ─ Inicialización ────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    injectAuthStyles();
    injectAuthModal();
    updateAuthUI();
    initGoogleGIS();
    checkDiscordOAuthReturn();
  });

})();
