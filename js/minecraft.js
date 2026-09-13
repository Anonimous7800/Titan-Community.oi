/* =============================================
   MINECRAFT VERSION - Fetch from GitHub Releases
   (lyssadev/mcs)
   ============================================= */

const MC_GITHUB_API = 'https://api.github.com/repos/lyssadev/mcs/releases/latest';

// AI Minecraft Version Themes Database
// Banners: imágenes locales de Minecraft Bedrock Edition generadas
const MC_VERSION_THEMES = {
  '1.21': {
    name: 'Tricky Trials',
    banner: 'assets/mc_banner_1_21.png',
    primaryColor: '#e8820c', // Copper Orange
    glowColor: '#38ffd0',    // Trial Teal
    deepColor: '#1a0d00',
    accentColor: '#ff6b35',
    tag: 'Tricky Trials (1.21)',
    features: ['Cámaras de Pruebas (Trial Chambers) ⚔️', 'Criaturas: Breeze & Bogged 🌪️', 'Bloque de Crafteo Automático ⚙️', 'Nuevas armas: Maza de Combate 🔨']
  },
  '1.20': {
    name: 'Trails & Tales',
    banner: 'assets/mc_banner_1_20.png',
    primaryColor: '#ff8bb6',
    glowColor: '#ffd56b',
    deepColor: '#2b0014',
    accentColor: '#d63384',
    tag: 'Trails & Tales (1.20)',
    features: ['Bioma de Cerezos en Flor 🌸', 'Arqueología & Ruinas del Pasado 🏺', 'Criaturas: Camello & Sniffer 🐫', 'Personalización de Armaduras 🛡️']
  },
  '1.19': {
    name: 'The Wild Update',
    banner: 'assets/mc_banner_1_19.png',
    primaryColor: '#00ffd5',
    glowColor: '#7bff38',
    deepColor: '#010f1a',
    accentColor: '#0dcaf0',
    tag: 'The Wild Update (1.19)',
    features: ['El Warden & Cuevas Profundas 👁️', 'Bioma de Manglares Pantanosos 🌳', 'Criaturas: Ranas y Renacuajos 🐸', 'El Allay Recolector 🧚']
  },
  '1.18': {
    name: 'Caves & Cliffs II',
    banner: 'assets/mc_banner_generic.png',
    primaryColor: '#a8c2ff',
    glowColor: '#e0c3fc',
    deepColor: '#000814',
    accentColor: '#0d6efd',
    tag: 'Caves & Cliffs Part II (1.18)',
    features: ['Nueva Generación de Montañas 🏔️', 'Cuevas Gigantes & Acuíferos 🕳️', 'Distribución Realista de Minerales 💎', 'Nuevos temas musicales 🎵']
  },
  '1.17': {
    name: 'Caves & Cliffs I',
    banner: 'assets/mc_banner_generic.png',
    primaryColor: '#c77dff',
    glowColor: '#ffd700',
    deepColor: '#120024',
    accentColor: '#7b2fff',
    tag: 'Caves & Cliffs Part I (1.17)',
    features: ['Geodas de Amatista Subterráneas 💎', 'Cobre, Pararrayos y Catalejo ⚡', 'Criaturas: Ajolotes y Calamar Brillante 🦎', 'Cabras Montesas Saltadoras 🐐']
  },
  '1.16': {
    name: 'Nether Update',
    banner: 'assets/mc_banner.png',
    primaryColor: '#ff3d00',
    glowColor: '#00ffff',
    deepColor: '#1a0000',
    accentColor: '#dc3545',
    tag: 'Nether Update (1.16)',
    features: ['Nuevos Biomas del Nether 🔥', 'Criaturas: Piglins & Hoglins 🐷', 'Material de Inframundita (Netherite) 🛡️', 'Bloques de Ancla de Respawn ⚓']
  }
};

/* ═════════════════════════════════════════════
   Helper Functions for Bytes formatting, color Conversion
   ═════════════════════════════════════════════ */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/* ═════════════════════════════════════════════
   AI Theme & Version Parsing Engine
   ═════════════════════════════════════════════ */
function parseMinecraftVersion(vString) {
  const clean = vString.toLowerCase().replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  
  let major = '1.21'; // default fallback
  
  if (parts.length > 0) {
    const num = parseInt(parts[0], 10);
    if (num === 1) {
      if (parts[1]) {
        major = `1.${parts[1]}`;
      }
    } else if (num === 26 || num === 21) {
      major = '1.21';
    } else if (num === 20) {
      major = '1.20';
    } else if (num === 19) {
      major = '1.19';
    } else if (num === 18) {
      major = '1.18';
    } else if (num === 17) {
      major = '1.17';
    } else if (num === 16) {
      major = '1.16';
    } else if (num > 26) {
      // Future versions (e.g. 27 -> 1.22, 28 -> 1.23, etc.)
      const diff = num - 26;
      major = `1.${21 + diff}`;
    }
  }
  
  return major;
}

function generateProceduralTheme(versionStr, majorVersion) {
  let hash = 0;
  for (let i = 0; i < versionStr.length; i++) {
    hash = versionStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  const primaryColor = hslToHex(hue, 85, 60);
  const glowColor = hslToHex((hue + 120) % 360, 90, 65);
  const deepColor = hslToHex(hue, 60, 8);
  const accentColor = hslToHex(hue, 80, 50);
  
  // Fallback local: banner genérico de Minecraft Bedrock
  const fallbacks = [
    'assets/mc_banner_1_21.png',
    'assets/mc_banner_1_20.png',
    'assets/mc_banner_1_19.png',
    'assets/mc_banner_generic.png'
  ];
  const bannerIndex = Math.abs(hash) % fallbacks.length;
  
  return {
    name: `Minecraft Bedrock Update ${majorVersion}`,
    banner: fallbacks[bannerIndex],
    primaryColor,
    glowColor,
    deepColor,
    accentColor,
    tag: `Minecraft Bedrock ${majorVersion} (Generado por IA)`,
    features: ['Nueva generación de biomas procedurales 🌍', 'Nuevos bloques de construcción y herramientas 🧱', 'Optimización de motor para un juego fluido ⚡', 'Novedades de contenido para explorar 🦄']
  };
}

function applyVersionTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--purple-main', theme.primaryColor);
  root.style.setProperty('--purple-glow', theme.glowColor);
  root.style.setProperty('--purple-light', theme.primaryColor);
  root.style.setProperty('--purple-deep', theme.deepColor);
  root.style.setProperty('--purple-neon', theme.glowColor);
  root.style.setProperty('--border-glow', `rgba(${hexToRgb(theme.primaryColor)}, 0.4)`);
  root.style.setProperty('--border-subtle', `rgba(${hexToRgb(theme.primaryColor)}, 0.15)`);
  root.style.setProperty('--bg-glass', `rgba(${hexToRgb(theme.primaryColor)}, 0.08)`);
}

function addAiLog(text, color = '#00ff88') {
  const logEl = document.getElementById('ai-hud-log');
  if (logEl) {
    const span = document.createElement('span');
    span.className = 'ai-log-entry';
    span.style.color = color;
    span.textContent = `> ${text}`;
    logEl.appendChild(span);
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function renderVersionFeatures(theme) {
  const container = document.getElementById('ai-version-features');
  if (!container) return;
  
  container.innerHTML = `
    <div style="width:100%; margin-top:15px; border-top:1px solid rgba(255,255,255,0.08); padding-top:15px;">
      <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--purple-glow); font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <span>🤖 Novedades detectadas por IA (${theme.name}):</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
        ${theme.features.map(feat => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:10px 14px; font-size:0.8rem; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <span>${feat}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function runAiAnalysis(versionString) {
  const cleanVersion = versionString.replace(/^v/i, '').replace(/^release[- ]/i, '').trim();
  
  const aiHud = document.getElementById('ai-hud');
  if (aiHud && window.innerWidth > 768) aiHud.style.display = 'flex';
  
  const logEl = document.getElementById('ai-hud-log');
  if (logEl) logEl.innerHTML = '';
  
  const statusEl = document.getElementById('ai-hud-status');
  if (statusEl) {
    statusEl.textContent = 'BUSCANDO';
    statusEl.style.color = '#ff9f43';
  }

  const delay = ms => new Promise(res => setTimeout(res, ms));
  
  addAiLog("Módulo IA activo. Escaneando versión...");
  await delay(450);
  
  addAiLog(`Metadatos analizados: "${versionString}"`);
  await delay(400);
  
  addAiLog("Iniciando análisis semántico del release...");
  await delay(600);
  
  const major = parseMinecraftVersion(cleanVersion);
  addAiLog(`Mapeado a versión del juego: v${major}`);
  await delay(400);
  
  addAiLog("Buscando arte conceptual y paleta de colores...");
  await delay(500);
  
  let theme = MC_VERSION_THEMES[major];
  let isProcedural = false;
  
  if (!theme) {
    isProcedural = true;
    theme = generateProceduralTheme(cleanVersion, major);
    addAiLog("⚠️ Versión desconocida. Usando buscador generativo procedimental...", "#ffd700");
    await delay(600);
  } else {
    addAiLog(`✅ Tema encontrado: "${theme.name}"`, "#00ff88");
    await delay(400);
  }
  
  addAiLog("Aplicando paleta de colores CSS dinámicamente...");
  applyVersionTheme(theme);
  await delay(400);
  
  addAiLog("Actualizando banner de fondo temático...");
  const bannerImg = document.getElementById('dl-version-banner');
  if (bannerImg) {
    bannerImg.style.opacity = '0';
    setTimeout(() => {
      // Usar imagen local directamente (sin dependencia de red)
      bannerImg.src = theme.banner;
      bannerImg.style.opacity = '0.75';
    }, 300);
  }
  await delay(350);
  
  renderVersionFeatures(theme);
  
  if (statusEl) {
    statusEl.textContent = isProcedural ? 'DIFUSO' : 'LISTO';
    statusEl.style.color = '#00ff88';
  }
  addAiLog("🤖 Análisis completado con éxito.", "#00ff88");
}

/* ═════════════════════════════════════════════
   Fetch latest Minecraft version from GitHub
   ═════════════════════════════════════════════ */
async function fetchMinecraftVersion() {
  const versionEl  = document.getElementById('mcVersionText');
  const dotEl      = document.getElementById('mcVersionDisplay')?.querySelector('.status-dot');

  try {
    const res  = await fetch(MC_GITHUB_API, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      cache: 'no-cache'
    });

    if (!res.ok) throw new Error('GitHub API error: ' + res.status);

    const data = await res.json();

    let version = data.tag_name || data.name || 'Desconocido';
    version = version
      .replace(/^v/i, '')
      .replace(/^release[- ]/i, '')
      .trim();

    if (versionEl)  versionEl.textContent = version;
    if (dotEl)      { dotEl.classList.remove('loading'); dotEl.classList.add(''); }

    document.querySelectorAll('.mc-version-display').forEach(el => {
      el.textContent = version;
    });

    sessionStorage.setItem('mcVersion', version);
    sessionStorage.setItem('mcVersionTime', Date.now());

    renderDownloads(data, version);
    return version;

  } catch (err) {
    console.warn('[MC Version] Could not fetch from GitHub, using fallback:', err.message);

    const fallbackData = {
      name: "mc26.40",
      tag_name: "mc26.40",
      assets: [
        {
          name: "MCPE-26.40-32Bit.apk",
          size: 784991701,
          download_count: 512,
          browser_download_url: "https://github.com/lyssadev/mcs/releases/download/mc26.40/MCPE-26.40-32Bit.apk"
        },
        {
          name: "MCPE-26.40-32Bit_Music.apk",
          size: 1129755125,
          download_count: 455,
          browser_download_url: "https://github.com/lyssadev/mcs/releases/download/mc26.40/MCPE-26.40-32Bit_Music.apk"
        },
        {
          name: "MCPE-26.40-64Bit.apk",
          size: 796325395,
          download_count: 1246,
          browser_download_url: "https://github.com/lyssadev/mcs/releases/download/mc26.40/MCPE-26.40-64Bit.apk"
        },
        {
          name: "MCPE-26.40-64Bit_Music.apk",
          size: 1141088819,
          download_count: 831,
          browser_download_url: "https://github.com/lyssadev/mcs/releases/download/mc26.40/MCPE-26.40-64Bit_Music.apk"
        }
      ]
    };

    let version = fallbackData.tag_name;
    version = version.replace(/^v/i, '').replace(/^release[- ]/i, '').trim();

    if (versionEl) versionEl.textContent = version + ' (caché)';
    if (dotEl) { dotEl.classList.remove('loading'); dotEl.classList.add(''); }

    document.querySelectorAll('.mc-version-display').forEach(el => {
      el.textContent = version;
    });

    renderDownloads(fallbackData, version);
    return version;
  }
}

/* ═════════════════════════════════════════════
   Get dynamic Minecraft themed 3D icons
   ═════════════════════════════════════════════ */
// Iconos locales de los tipos de archivo (guardados en assets/)
const MC_ICONS = {
  apk64:  { src: 'assets/icon_apk64.png', filter: '' },           // Verde - original
  apk32:  { src: 'assets/icon_apk32.png', filter: '' },           // Naranja - original
  exe:    { src: 'assets/icon_apk64.png', filter: 'hue-rotate(180deg) saturate(1.4)' }, // Azul
  zip:    { src: 'assets/icon_apk32.png', filter: 'hue-rotate(270deg) saturate(1.2)' }, // Morado
  default:{ src: 'assets/icon_apk64.png', filter: '' }
};

function getMinecraftIcon(fileName, version, is64bit, is32bit) {
  const name = fileName.toLowerCase();

  let icon;
  let altText;

  if (name.endsWith('.apk')) {
    icon    = is64bit ? MC_ICONS.apk64 : MC_ICONS.apk32;
    altText = is64bit ? 'APK 64-bit' : 'APK 32-bit';
  } else if (name.endsWith('.exe')) {
    icon    = MC_ICONS.exe;
    altText = 'Windows EXE';
  } else if (name.endsWith('.zip')) {
    icon    = MC_ICONS.zip;
    altText = 'ZIP file';
  } else {
    icon    = MC_ICONS.default;
    altText = 'Archivo';
  }

  return `<img src="${icon.src}" alt="${altText}" style="width:34px; height:34px; object-fit:contain; filter:${icon.filter} drop-shadow(0 0 5px rgba(255,255,255,0.25));" />`;
}

/* ═════════════════════════════════════════════
   Render downloads section (Filtered list)
   ═════════════════════════════════════════════ */
function renderDownloads(data, version) {
  const titleEl = document.getElementById('dl-version-title');
  const badgeEl = document.getElementById('dl-tag-badge');
  const listEl  = document.getElementById('downloads-list');

  if (!listEl) return;

  if (titleEl) titleEl.textContent = `Minecraft Bedrock v${version}`;
  if (badgeEl && data.name) badgeEl.textContent = data.name;

  if (!data.assets || data.assets.length === 0) {
    listEl.innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted);">No se encontraron archivos de descarga para esta versión.</div>';
    return;
  }

  // Filter only game files (apk, exe, zip, ipa, msix, appxbundle)
  const validExtensions = ['.apk', '.exe', '.zip', '.ipa', '.msix', '.appxbundle', '.mcpack', '.mcworld'];
  const filteredAssets = data.assets.filter(asset => {
    const name = (asset.name || '').toLowerCase();
    return validExtensions.some(ext => name.endsWith(ext)) && !name.includes('source');
  });

  if (filteredAssets.length === 0) {
    listEl.innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted);">No se encontraron archivos de instalación válidos en esta versión.</div>';
    return;
  }

  listEl.innerHTML = filteredAssets.map(asset => {
    const name = asset.name || '';
    const size = formatBytes(asset.size);
    const dl   = asset.download_count?.toLocaleString() || '0';

    const is64  = name.includes('64Bit') || name.includes('64-bit');
    const is32  = name.includes('32Bit') || name.includes('32-bit');
    const hasMusic = name.toLowerCase().includes('music');
    const isApk = name.endsWith('.apk');
    const isExe = name.endsWith('.exe');
    const isZip = name.endsWith('.zip');

    let color = '#7b2fff';
    let label = name;
    let sublabel = '';

    if (isApk) {
      color = is64 ? '#7b2fff' : '#ff6b35';
      label = is64 ? 'Android 64-bit' : 'Android 32-bit';
      sublabel = hasMusic ? '🎵 Con música incluida' : '⚡ Sin música (más liviano)';
    } else if (isExe) {
      color = '#0070e0'; 
      label = 'Windows (.exe)';
      sublabel = 'Instalador ejecutable de Windows';
    } else if (isZip) {
      color = '#00aacc'; 
      label = 'Archivo ZIP';
      sublabel = 'Carpeta comprimida con archivos del juego';
    }

    const recBadge = (is64 && hasMusic)
      ? `<span style="background:rgba(255,215,0,0.18);color:var(--gold);border:1px solid rgba(255,215,0,0.4);padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:800;">⭐ Recomendado</span>`
      : '';
    
    const bitBadge = is64
      ? `<span style="background:rgba(123,47,255,0.25);color:var(--purple-glow);border:1px solid rgba(123,47,255,0.4);padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700;">64-bit</span>`
      : is32
      ? `<span style="background:rgba(255,107,53,0.25);color:#ff6b35;border:1px solid rgba(255,107,53,0.4);padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700;">32-bit</span>`
      : '';
    
    const musicBadge = hasMusic
      ? `<span style="background:rgba(0,255,136,0.15);color:#00ff88;border:1px solid rgba(0,255,136,0.3);padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:700;">🎵 Música</span>`
      : `<span style="background:rgba(255,255,255,0.06);color:var(--text-muted);border:1px solid rgba(255,255,255,0.12);padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:600;">⚡ Liviano</span>`;

    return `
      <div class="dl-item-card" style="border-color:${color}44;">
        <div class="dl-item-top">
          <div class="dl-item-main">
            <div class="dl-item-icon-wrap" style="background:linear-gradient(135deg,${color}25,${color}08); border:1px solid ${color}66;">
              ${getMinecraftIcon(name, version, is64, is32)}
            </div>
            <div style="min-width:0;">
              <div class="dl-item-name">${label}</div>
              <div class="dl-item-sub">${sublabel || name}</div>
            </div>
          </div>
          <div class="dl-item-badges">
            ${recBadge}
            ${bitBadge}
            ${musicBadge}
          </div>
        </div>
        <div class="dl-item-bottom">
          <div class="dl-item-stats">
            <span>📦 <strong style="color:var(--text-primary);">${size}</strong></span>
            <span>📥 <strong style="color:var(--text-primary);">${dl}</strong> descargas</span>
          </div>
          <a href="${asset.browser_download_url}" target="_blank" rel="noopener noreferrer"
             class="dl-item-btn"
             style="background:linear-gradient(135deg,${color},${color}dd); box-shadow:0 4px 15px ${color}44;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar APK
          </a>
        </div>
      </div>
    `;
  }).join('');

  // Start the AI analysis flow asynchronously
  runAiAnalysis(version);
}

function renderDownloadsError() {
  const titleEl = document.getElementById('dl-version-title');
  const listEl  = document.getElementById('downloads-list');
  
  if (titleEl) titleEl.textContent = 'Error al cargar versión';
  if (listEl) {
    listEl.innerHTML = '<div class="text-center w-full" style="padding:40px;color:var(--fire-orange);">Hubo un problema al cargar los archivos desde GitHub. Por favor, intenta más tarde.</div>';
  }
}

/* ═════════════════════════════════════════════
   Fake server status (simulate Bedrock ping)
   ═════════════════════════════════════════════ */
function updateServerStatus() {
  const statusDot  = document.getElementById('serverStatusDot');
  const statusText = document.getElementById('serverStatusText');
  const playerCount = document.getElementById('playerCount');
  const playerPercent = document.getElementById('playerPercent');
  const progressBar = document.getElementById('playerProgressBar');

  const MAX_PLAYERS = 100;

  const baseOnline  = 12;
  const variance    = Math.floor(Math.random() * 30);
  const online      = baseOnline + variance;
  const percent     = Math.round((online / MAX_PLAYERS) * 100);

  if (statusDot)  { statusDot.classList.remove('offline', 'loading'); }
  if (statusText) { statusText.textContent = 'En línea • Bedrock'; }
  if (playerCount) { playerCount.textContent = online + '/' + MAX_PLAYERS; }
  if (playerPercent) { playerPercent.textContent = percent + '%'; }

  if (progressBar) {
    setTimeout(() => { progressBar.style.width = percent + '%'; }, 300);
  }
}

/* ═════════════════════════════════════════════
   Initialize Page
   ═════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  fetchMinecraftVersion();
  updateServerStatus();
  setInterval(updateServerStatus, 60_000);
});
