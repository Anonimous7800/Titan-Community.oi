/**
 * Titan Community - Firebase Realtime Database Sync
 * Sincronización en la nube en tiempo real para GitHub Pages
 */

(function () {
  'use strict';

  // Configuración oficial de Firebase del proyecto del usuario
  const firebaseConfig = {
    apiKey: "AIzaSyD3uGq1C5J5uIZEvxgvjSlTg__ZY-2omK8",
    authDomain: "base32-aeca8.firebaseapp.com",
    databaseURL: "https://base32-aeca8-default-rtdb.firebaseio.com",
    projectId: "base32-aeca8",
    storageBucket: "base32-aeca8.firebasestorage.app",
    messagingSenderId: "647997803501",
    appId: "1:647997803501:web:1e8728e6e73d252cab75e4",
    measurementId: "G-W50V8JZPHC"
  };

  let db = null;
  let isFirebaseReady = false;
  let hasShownRTDBHelp = false;

  // Sanitizador de claves para Firebase (no permite . $ # [ ] /)
  function safeKey(key) {
    if (!key) return '_unknown_';
    return String(key).replace(/[.#$\[\]\/]/g, '_');
  }

  // Carga asíncrona de los scripts del SDK de Firebase si no están presentes
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  async function initFirebaseSDK() {
    try {
      if (typeof firebase === 'undefined') {
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');
      }

      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      db = firebase.database();
      isFirebaseReady = true;
      console.log('⚡ TitanFirebase: Conectado a Firebase Realtime Database');

      // Actualizar indicador visual en el panel admin si existe
      updateAdminStatusBadge(true, '🟢 Nube Conectada (Tiempo Real)');

      // Iniciar oyentes en tiempo real
      setupRealtimeListeners();

      // Subir datos locales iniciales a la nube si existen y no están aún
      uploadInitialLocalData();

    } catch (err) {
      console.warn('⚠️ TitanFirebase: Error al conectar con Firebase RTDB:', err);
      updateAdminStatusBadge(false, '⚠️ Nube Desconectada (Falta crear Realtime Database en Firebase Console)');
      suggestRTDBCreation();
    }
  }

  // Muestra un aviso explicativo en el admin si aún no se ha creado la Realtime Database
  function suggestRTDBCreation() {
    if (hasShownRTDBHelp) return;
    hasShownRTDBHelp = true;

    // Solo si estamos en admin.html
    if (window.location.pathname.includes('admin.html') || document.getElementById('usersTableBody')) {
      const banner = document.createElement('div');
      banner.id = 'firebaseRTDBNotice';
      banner.style.cssText = `
        background: linear-gradient(135deg, rgba(255,107,53,0.18), rgba(255,215,0,0.12));
        border: 1px solid rgba(255,107,53,0.5);
        border-radius: 12px;
        padding: 14px 18px;
        margin: 15px 0 25px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.85rem;
        color: #fff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      `;
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.6rem;">🔥</span>
          <div>
            <strong style="color:var(--gold);">Paso final para Usuarios en Tiempo Real:</strong>
            <div style="color:var(--text-muted); font-size:0.78rem; margin-top:2px;">
              Tu proyecto de Firebase <code>${firebaseConfig.projectId}</code> está listo. Solo falta ir a 
              <strong>Firebase Console ➔ Realtime Database ➔ "Crear base de datos"</strong> (en modo de prueba).
            </div>
          </div>
        </div>
        <a href="https://console.firebase.google.com/project/${firebaseConfig.projectId}/database" target="_blank" rel="noopener" class="btn btn-sm btn-primary" style="white-space:nowrap; padding:6px 12px; font-size:0.75rem;">
          Crear Base de Datos ➔
        </a>
      `;

      const target = document.querySelector('.admin-content') || document.querySelector('.container') || document.body;
      if (target) {
        target.insertBefore(banner, target.firstChild);
      }
    }
  }

  // Indicador de estado en admin
  function updateAdminStatusBadge(connected, text) {
    let badge = document.getElementById('firebaseStatusBadge');
    if (!badge) {
      const headerArea = document.querySelector('.admin-header') || document.querySelector('.nav-inner');
      if (headerArea) {
        badge = document.createElement('span');
        badge.id = 'firebaseStatusBadge';
        badge.style.cssText = `
          font-size: 0.72rem;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        `;
        headerArea.appendChild(badge);
      }
    }

    if (badge) {
      badge.textContent = text;
      badge.style.background = connected ? 'rgba(0,255,136,0.12)' : 'rgba(255,107,53,0.15)';
      badge.style.border = connected ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(255,107,53,0.35)';
      badge.style.color = connected ? '#00ff88' : '#ff9f43';
    }
  }

  // ═══════════════════════════════════════════════════════
  // OYENTES EN TIEMPO REAL (DESCARGA DESDE FIREBASE)
  // ═══════════════════════════════════════════════════════

  function setupRealtimeListeners() {
    if (!db) return;

    // 1. Usuarios registrados (titanUsers)
    db.ref('titanUsers').on('value', (snapshot) => {
      const cloudUsers = snapshot.val();
      if (!cloudUsers) return;

      const localUsers = JSON.parse(localStorage.getItem('titanUsers') || '{}');
      let changed = false;

      Object.keys(cloudUsers).forEach((key) => {
        const u = cloudUsers[key];
        if (u && u.nick) {
          const local = localUsers[u.nick];
          if (!local || JSON.stringify(local) !== JSON.stringify(u)) {
            localUsers[u.nick] = u;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem('titanUsers', JSON.stringify(localUsers));
        console.log('🔄 TitanFirebase: Usuarios sincronizados desde la nube');

        // Si estamos en admin.html, refrescar la tabla
        if (typeof renderUsersTable === 'function') renderUsersTable();
        if (typeof renderMetrics === 'function') renderMetrics();
      }
    }, (error) => {
      console.warn('TitanFirebase: Error escuchando titanUsers:', error);
      suggestRTDBCreation();
    });

    // 2. Perfiles de jugador (titanProfiles: puntos, avatar, aura, bio, etc.)
    db.ref('titanProfiles').on('value', (snapshot) => {
      const cloudProfiles = snapshot.val();
      if (!cloudProfiles) return;

      const localProfiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      let changed = false;

      Object.keys(cloudProfiles).forEach((key) => {
        const p = cloudProfiles[key];
        if (p && p.nick) {
          const local = localProfiles[p.nick];
          if (!local || JSON.stringify(local) !== JSON.stringify(p)) {
            localProfiles[p.nick] = p;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem('titanProfiles', JSON.stringify(localProfiles));

        // Refrescar UI si el usuario logueado es afectado
        if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.getCurrentUser === 'function') {
          const cur = TitanAuth.getCurrentUser();
          if (cur && localProfiles[cur.nick]) {
            if (typeof playerData !== 'undefined') playerData = localProfiles[cur.nick];
            if (typeof updateUI === 'function') updateUI();
            if (typeof TitanAuth.updateAuthUI === 'function') TitanAuth.updateAuthUI();
          }
        }

        if (typeof renderUsersTable === 'function') renderUsersTable();
        if (typeof renderMetrics === 'function') renderMetrics();
      }
    });

    // 3. Canjes de Puntos (titanRedeemOrders)
    db.ref('titanRedeemOrders').on('value', (snapshot) => {
      const cloudRedeems = snapshot.val();
      if (!cloudRedeems) return;

      const redeemsList = Array.isArray(cloudRedeems) ? cloudRedeems : Object.values(cloudRedeems);
      const localRedeems = JSON.parse(localStorage.getItem('titanRedeemOrders') || '[]');

      if (JSON.stringify(localRedeems) !== JSON.stringify(redeemsList)) {
        localStorage.setItem('titanRedeemOrders', JSON.stringify(redeemsList));
        console.log('🔄 TitanFirebase: Canjes sincronizados desde la nube');

        if (typeof renderRedeemOrdersTable === 'function') renderRedeemOrdersTable();
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
      }
    });

    // 4. Pedidos de Tienda (titanOrders)
    db.ref('titanOrders').on('value', (snapshot) => {
      const cloudOrders = snapshot.val();
      if (!cloudOrders) return;

      const ordersList = Array.isArray(cloudOrders) ? cloudOrders : Object.values(cloudOrders);
      const localOrders = JSON.parse(localStorage.getItem('titanOrders') || '[]');

      if (JSON.stringify(localOrders) !== JSON.stringify(ordersList)) {
        localStorage.setItem('titanOrders', JSON.stringify(ordersList));
        if (typeof renderOrdersTable === 'function') renderOrdersTable();
      }
    });

    // 5. Notificaciones globales y anuncios del Admin (titanBroadcastNotifs)
    db.ref('titanBroadcastNotifs').on('value', (snapshot) => {
      const cloudBroadcasts = snapshot.val();
      if (!cloudBroadcasts) return;

      const list = Array.isArray(cloudBroadcasts) ? cloudBroadcasts : Object.values(cloudBroadcasts);
      localStorage.setItem('titanBroadcastNotifs', JSON.stringify(list));

      if (typeof TitanAuth !== 'undefined' && typeof TitanAuth.updateAuthUI === 'function') {
        TitanAuth.updateAuthUI();
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // SUBIDA INICIAL (MIGRAR DATOS LOCALES A FIREBASE)
  // ═══════════════════════════════════════════════════════

  function uploadInitialLocalData() {
    if (!db) return;

    // Subir usuarios locales existentes si aún no están en la nube
    try {
      const localUsers = JSON.parse(localStorage.getItem('titanUsers') || '{}');
      Object.keys(localUsers).forEach((nick) => {
        const u = localUsers[nick];
        if (u && u.nick) {
          db.ref('titanUsers/' + safeKey(u.nick)).update(u);
        }
      });

      const localProfiles = JSON.parse(localStorage.getItem('titanProfiles') || '{}');
      Object.keys(localProfiles).forEach((nick) => {
        const p = localProfiles[nick];
        if (p && p.nick) {
          db.ref('titanProfiles/' + safeKey(p.nick)).update(p);
        }
      });
    } catch (e) {
      console.warn('TitanFirebase: Error al subir datos locales iniciales:', e);
    }
  }

  // ═══════════════════════════════════════════════════════
  // MÉTODOS PÚBLICOS DE GUARDADO EN NUBE
  // ═══════════════════════════════════════════════════════

  window.TitanFirebase = {
    isReady: () => isFirebaseReady,

    // Guardar usuario registrado
    saveUser: function (user) {
      if (!user || !user.nick) return;
      if (db) {
        db.ref('titanUsers/' + safeKey(user.nick)).set(user).catch(err => {
          console.warn('TitanFirebase: Error guardando usuario:', err);
        });
      }
    },

    // Guardar o actualizar perfil de jugador (puntos, skin, etc.)
    saveProfile: function (nick, profileData) {
      if (!nick || !profileData) return;
      if (db) {
        db.ref('titanProfiles/' + safeKey(nick)).set(profileData).catch(err => {
          console.warn('TitanFirebase: Error guardando perfil:', err);
        });
      }
    },

    // Guardar orden de canje
    saveRedeemOrder: function (order) {
      if (!order) return;
      if (db) {
        const id = order.id || ('rdm_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
        order.id = id;
        db.ref('titanRedeemOrders/' + safeKey(id)).set(order).catch(err => {
          console.warn('TitanFirebase: Error guardando canje:', err);
        });
      }
    },

    // Sincronizar todos los canjes
    syncAllRedeemOrders: function (redeemArray) {
      if (!Array.isArray(redeemArray)) return;
      if (db) {
        db.ref('titanRedeemOrders').set(redeemArray).catch(err => {
          console.warn('TitanFirebase: Error sincronizando canjes:', err);
        });
      }
    },

    // Guardar orden de tienda
    saveStoreOrder: function (order) {
      if (!order) return;
      if (db) {
        const id = order.id || ('ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
        order.id = id;
        db.ref('titanOrders/' + safeKey(id)).set(order).catch(err => {
          console.warn('TitanFirebase: Error guardando pedido de tienda:', err);
        });
      }
    },

    // Guardar anuncio global
    saveBroadcast: function (broadcastList) {
      if (!Array.isArray(broadcastList)) return;
      if (db) {
        db.ref('titanBroadcastNotifs').set(broadcastList).catch(err => {
          console.warn('TitanFirebase: Error guardando anuncios:', err);
        });
      }
    }
  };

  // Iniciar automáticamente cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebaseSDK);
  } else {
    initFirebaseSDK();
  }

})();
