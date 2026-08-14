/* =============================================
   ADDONS.JS - Dynamic loading of addons via GitHub
   API and AI-powered metadata decoration
   ============================================= */

// Metadata dictionary for known release assets
const KNOWN_ADDONS = {
  "CAVE.DWELLER.Add-On.Official.addon.mcaddon": {
    name: "Cave Dweller (Official Add-On)",
    desc: "¡Enfréntate al temible Cave Dweller en la oscuridad de las minas! Esta criatura acecha en las sombras, emitiendo sonidos aterradores y persiguiéndote por las cuevas más profundas.",
    badge: "💀 Terror",
    badgeClass: "badge-exclusive",
    imageUrl: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccf7581b-e666-4ec6-a7d1-4bfccf09a7d5/CaveDweller_Thumbnail_0.jpg",
    version: "Official v1.2",
    category: "Terror"
  },
  "CAVES.Fire.Ice.addon.mcaddon": {
    name: "Caves Fire & Ice",
    desc: "Expande las cuevas con biomas extremos de fuego y hielo. Encuentra monstruos elementales, tesoros congelados y dragones ancestrales custodiando cuevas místicas.",
    badge: "🔮 Aventura",
    badgeClass: "badge-popular",
    imageUrl: "https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/1dcb302c-2dfd-40aa-a776-10318f8cdc94/CaveBiomes_Thumbnail_0.jpg",
    version: "v1.4",
    category: "Aventura"
  },
  "Disaster.Defense.world_template.mctemplate": {
    name: "Disaster Defense Map",
    desc: "Un mapa de defensa contra desastres naturales devastadores. Sobrevive a terremotos, tornados, tsunamis y lluvias de meteoritos usando tecnología avanzada de protección.",
    badge: "🛡️ Survival",
    badgeClass: "badge-hot",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/3121056a-a177-44e4-bcfe-c23fbd9ba717/DD_Thumbnail_0.jpg",
    version: "v2.0",
    category: "Survival"
  },
  "Over.Mob.Add-On.addon.mcaddon": {
    name: "Over Mob Add-On",
    desc: "Añade decenas de nuevos mobs hostiles y pacíficos al Overworld. Criaturas mitológicas, jefes gigantes y animales salvajes que harán tu supervivencia mucho más desafiante.",
    badge: "👾 Mobs",
    badgeClass: "badge-new",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/4fefe28d-861f-4937-9272-552ff66d78be/over_mob_addon_Thumbnail_0.jpg",
    version: "v1.2",
    category: "Mobs"
  },
  "Realight.Reimagined.addon.mcaddon": {
    name: "Realight Reimagined",
    desc: "Iluminación dinámica y realista para tu juego. Antorchas, linternas y objetos luminosos alumbrarán tu camino al sostenerlos en la mano sin necesidad de colocarlos.",
    badge: "💡 Realismo",
    badgeClass: "badge-exclusive",
    imageUrl: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/926b5cc5-049c-4c3a-9384-fa014995fb2e/Thumbnail_0.jpg",
    version: "v3.1",
    category: "Realismo"
  },
  "Smartphones.2.0.Add-On.addon.mcaddon": {
    name: "Smartphones 2.0 Add-On",
    desc: "Lleva la tecnología moderna a Minecraft. Fabrica teléfonos inteligentes funcionales para tomar fotos, enviar mensajes, jugar minijuegos y reproducir música en tu mundo.",
    badge: "📱 Tecnología",
    badgeClass: "badge-popular",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/878ef567-5ddc-4c3b-813b-9c5d75392ee0/SmartphonesAddOn_Thumbnail_0.jpg",
    version: "v2.0",
    category: "Tecnología"
  },
  "Spacecraft.addon.mcaddon": {
    name: "Spacecraft Galactic",
    desc: "¡Viaja al espacio exterior! Construye cohetes espaciales, explora la Luna y otros planetas del sistema solar, y sobrevive en gravedad cero con trajes de astronauta.",
    badge: "🚀 Espacio",
    badgeClass: "badge-exclusive",
    imageUrl: "https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/9843eecc-6430-49f4-b3f2-c541628984bf/SC_Thumbnail_0.jpg",
    version: "v1.5",
    category: "Espacio"
  }
};

let currentAddons = [];
let activeFilter = 'Todos';

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper to sanitize name to ID
function sanitizeId(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// AI Dynamic metadata generator for unknown addons
function generateDynamicAddonDetails(fileName) {
  // Clean file name
  let cleanName = fileName
    .replace(/\.addon|\.mcaddon|\.mctemplate|\.world_template/gi, '')
    .replace(/[\._\-]/g, ' ')
    .trim();
  
  // Title casing
  cleanName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');

  let category = "Aventura";
  let badge = "🔮 Aventura";
  let badgeClass = "badge-new";
  let desc = `Un addon emocionante que introduce dinámicas y mecánicas optimizadas para tu aventura. Diseñado especialmente para Titan Community.`;
  let imageUrl = `https://loremflickr.com/600/400/minecraft,gaming?random=${Math.floor(Math.random() * 1000)}`;

  const lower = fileName.toLowerCase();
  
  if (lower.includes('cave') || lower.includes('dweller') || lower.includes('horror') || lower.includes('spooky') || lower.includes('scary')) {
    category = "Terror";
    badge = "💀 Terror";
    badgeClass = "badge-exclusive";
    desc = `Introduce elementos de supervivencia y horror con monstruos acechantes y atmósferas terroríficas que pondrán a prueba tu valentía.`;
    imageUrl = "https://images.unsplash.com/photo-1507166763745-bfe008fbb9f1?q=80&w=600&auto=format&fit=crop";
  } else if (lower.includes('fire') || lower.includes('ice') || lower.includes('element') || lower.includes('dragon') || lower.includes('adventure')) {
    category = "Aventura";
    badge = "🔮 Aventura";
    badgeClass = "badge-popular";
    desc = `Explora nuevos mundos con biomas mágicos, criaturas elementales y tesoros ocultos esperándote.`;
    imageUrl = "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600&auto=format&fit=crop";
  } else if (lower.includes('disaster') || lower.includes('defense') || lower.includes('survival') || lower.includes('shield')) {
    category = "Survival";
    badge = "🛡️ Survival";
    badgeClass = "badge-hot";
    desc = `Pon a prueba tus tácticas de defensa y supervivencia contra amenazas extremas y eventos climáticos devastadores.`;
    imageUrl = "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?q=80&w=600&auto=format&fit=crop";
  } else if (lower.includes('mob') || lower.includes('entity') || lower.includes('boss') || lower.includes('creature')) {
    category = "Mobs";
    badge = "👾 Mobs";
    badgeClass = "badge-new";
    desc = `Añade una amplia variedad de nuevas criaturas con comportamientos únicos e IA avanzada al ecosistema del juego.`;
    imageUrl = "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop";
  } else if (lower.includes('light') || lower.includes('shader') || lower.includes('real') || lower.includes('graphics')) {
    category = "Realismo";
    badge = "💡 Realismo";
    badgeClass = "badge-exclusive";
    desc = `Mejora la inmersión visual con iluminación dinámica y efectos realistas para una experiencia de juego cinematográfica.`;
    imageUrl = "https://images.unsplash.com/photo-1517006859690-6013d9550225?q=80&w=600&auto=format&fit=crop";
  } else if (lower.includes('phone') || lower.includes('smartphone') || lower.includes('tech') || lower.includes('machine') || lower.includes('modern')) {
    category = "Tecnología";
    badge = "📱 Tecnología";
    badgeClass = "badge-popular";
    desc = `Integra sistemas de comunicación y herramientas tecnológicas modernas completamente funcionales dentro del juego.`;
    imageUrl = "https://images.unsplash.com/photo-1551645121-d1034da75057?q=80&w=600&auto=format&fit=crop";
  } else if (lower.includes('space') || lower.includes('rocket') || lower.includes('star') || lower.includes('galaxy') || lower.includes('moon')) {
    category = "Espacio";
    badge = "🚀 Espacio";
    badgeClass = "badge-exclusive";
    desc = `Despega hacia las estrellas. Construye cohetes, viaja a satélites cercanos y explora la galaxia con gravedad modificada.`;
    imageUrl = "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=600&auto=format&fit=crop";
  }

  return { name: cleanName, category, badge, badgeClass, desc, imageUrl, version: "v1.0" };
}

// Fetch addons from GitHub Releases API
async function fetchAddons() {
  try {
    const response = await fetch('https://api.github.com/repos/Anonimous7800/practicas/releases/tags/addons');
    if (!response.ok) throw new Error('GitHub API Limit or Network Error');
    const data = await response.json();
    
    if (data.assets && data.assets.length > 0) {
      return data.assets.map(asset => {
        const metadata = KNOWN_ADDONS[asset.name] || generateDynamicAddonDetails(asset.name);
        return {
          id: sanitizeId(asset.name),
          fileName: asset.name,
          name: metadata.name,
          desc: metadata.desc,
          badge: metadata.badge,
          badgeClass: metadata.badgeClass,
          imageUrl: metadata.imageUrl,
          version: metadata.version,
          category: metadata.category,
          size: formatBytes(asset.size),
          downloadUrl: asset.browser_download_url,
          downloadCount: asset.download_count
        };
      });
    }
  } catch (error) {
    console.warn('Usando base de datos local debido a error en fetch:', error);
  }

  // Fallback database mapping the exact files in the GitHub release
  const localAssets = [
    { name: "CAVE.DWELLER.Add-On.Official.addon.mcaddon", size: 6887035, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/CAVE.DWELLER.Add-On.Official.addon.mcaddon" },
    { name: "CAVES.Fire.Ice.addon.mcaddon", size: 17906375, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/CAVES.Fire.Ice.addon.mcaddon" },
    { name: "Disaster.Defense.world_template.mctemplate", size: 83152561, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Disaster.Defense.world_template.mctemplate" },
    { name: "Over.Mob.Add-On.addon.mcaddon", size: 13901891, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Over.Mob.Add-On.addon.mcaddon" },
    { name: "Realight.Reimagined.addon.mcaddon", size: 316418, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Realight.Reimagined.addon.mcaddon" },
    { name: "Smartphones.2.0.Add-On.addon.mcaddon", size: 18703555, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Smartphones.2.0.Add-On.addon.mcaddon" },
    { name: "Spacecraft.addon.mcaddon", size: 14066466, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Spacecraft.addon.mcaddon" }
  ];

  return localAssets.map(asset => {
    const metadata = KNOWN_ADDONS[asset.name] || generateDynamicAddonDetails(asset.name);
    return {
      id: sanitizeId(asset.name),
      fileName: asset.name,
      name: metadata.name,
      desc: metadata.desc,
      badge: metadata.badge,
      badgeClass: metadata.badgeClass,
      imageUrl: metadata.imageUrl,
      version: metadata.version,
      category: metadata.category,
      size: formatBytes(asset.size),
      downloadUrl: asset.url,
      downloadCount: 0
    };
  });
}

// Render the AI Control Panel
function renderControlPanel(container, addonsCount) {
  let panel = document.getElementById('aiControlPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'aiControlPanel';
    panel.className = 'ai-control-panel reveal';
    container.insertBefore(panel, document.querySelector('.addons-grid'));
  }

  // Categories list
  const categories = ['Todos', 'Terror', 'Aventura', 'Survival', 'Mobs', 'Realismo', 'Tecnología', 'Espacio'];
  const filterHtml = categories.map(cat => {
    const activeClass = cat === activeFilter ? 'active' : '';
    return `<button class="filter-btn ${activeClass}" onclick="filterCategory('${cat}')">${cat}</button>`;
  }).join('');

  panel.innerHTML = `
    <div class="ai-status-badge">
      <span class="icon">🤖</span>
      <div class="status-text">IA Activa: <span id="aiActiveCount">${addonsCount}</span> addons indexados.</div>
    </div>
    <div class="addon-filters">
      ${filterHtml}
    </div>
    <button class="btn-ai-rescan" onclick="triggerAIScan()">
      🔄 Re-escanear con IA
    </button>
  `;

  setTimeout(() => panel.classList.add('visible'), 50);
}

// Filter cards based on Category
window.filterCategory = function(category) {
  activeFilter = category;
  
  // Re-render control panel to show active filter button
  const grid = document.querySelector('.addons-grid');
  renderControlPanel(grid.parentElement, currentAddons.length);

  // Filter elements
  document.querySelectorAll('.addon-card').forEach(card => {
    const cardId = card.id.replace('card-', '');
    const addon = currentAddons.find(a => a.id === cardId);
    
    if (!addon) return;

    const matches = category === 'Todos' || addon.category === category;
    
    if (matches) {
      card.style.display = '';
      card.classList.add('visible');
    } else {
      card.style.display = 'none';
      card.classList.remove('visible');
    }
  });
};

// Simulation of AI analysis / scanning for cards
function runAIScanningSimulation(addon, index) {
  const cardId = `card-${addon.id}`;
  const cardEl = document.getElementById(cardId);
  if (!cardEl) return;

  const barEl = document.getElementById(`bar-${addon.id}`);
  const logsEl = document.getElementById(`logs-${addon.id}`);
  
  const steps = [
    { progress: 15, log: `[NLP] Indexando archivo: ${addon.fileName}` },
    { progress: 30, log: `[NLP] Tokenización y análisis semántico...` },
    { progress: 45, log: `[AI-Search] Consultando base de datos visual para "${addon.category}"...` },
    { progress: 65, log: `[AI-Search] Imagen semántica vinculada exitosamente.` },
    { progress: 80, log: `[AI-NLG] Redactando descripción optimizada en español...` },
    { progress: 100, log: `[OK] Optimización IA completada.` }
  ];

  let currentStepIndex = 0;
  const totalDuration = 1200 + index * 300 + Math.random() * 500; // staggered loading
  const stepTime = totalDuration / steps.length;

  const interval = setInterval(() => {
    if (currentStepIndex >= steps.length) {
      clearInterval(interval);
      resolveCard(addon);
    } else {
      const step = steps[currentStepIndex];
      if (barEl) barEl.style.width = `${step.progress}%`;
      if (logsEl) {
        // Append new line to logs
        const logLine = document.createElement('div');
        logLine.className = 'ai-log-line';
        logLine.textContent = step.log;
        
        // Remove previous log items if there are too many
        if (logsEl.children.length >= 3) {
          logsEl.children[0].classList.add('muted');
          if (logsEl.children.length >= 4) {
            logsEl.removeChild(logsEl.children[0]);
          }
        }
        logsEl.appendChild(logLine);
        logsEl.scrollTop = logsEl.scrollHeight;
      }
      currentStepIndex++;
    }
  }, stepTime);
}

// Convert scanning card to final gorgeous load
function resolveCard(addon) {
  const cardId = `card-${addon.id}`;
  const cardEl = document.getElementById(cardId);
  if (!cardEl) return;

  cardEl.classList.remove('scanning');
  cardEl.classList.add('loaded');

  const downloadsMeta = addon.downloadCount > 0 ? `<span>🔥 ${addon.downloadCount} descargas</span>` : '';

  cardEl.innerHTML = `
    <div class="addon-image-wrapper">
      <img src="${addon.imageUrl}" alt="${addon.name}" class="addon-image" onerror="this.src='https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop'" />
      <div class="addon-image-overlay"></div>
      <div class="addon-badge badge ${addon.badgeClass}">${addon.badge}</div>
    </div>
    <div class="addon-content">
      <h3 class="addon-title">${addon.name}</h3>
      <p class="addon-desc">${addon.desc}</p>
      <div class="addon-meta">
        <span>📦 ${addon.version}</span>
        <span>💾 ${addon.size}</span>
        ${downloadsMeta}
      </div>
      <a href="${addon.downloadUrl}" target="_blank" class="btn btn-primary btn-sm w-full mt-16">
        📥 Descargar Addon
      </a>
    </div>
  `;

  // Retrigger entrance transition smoothly
  setTimeout(() => {
    cardEl.classList.add('visible');
    // If card doesn't match active filter, hide it
    if (activeFilter !== 'Todos' && addon.category !== activeFilter) {
      cardEl.style.display = 'none';
      cardEl.classList.remove('visible');
    }
  }, 50);
}

// Main execution triggers
window.triggerAIScan = async function() {
  const grid = document.querySelector('.addons-grid');
  if (!grid) return;

  // Clear and show scanning state
  grid.innerHTML = currentAddons.map(addon => `
    <div class="addon-card card scanning" id="card-${addon.id}">
      <div class="ai-status">
        <span class="ai-status-dot pulse"></span>
        <span class="ai-status-text">🤖 IA ANALIZANDO ARCHIVO...</span>
      </div>
      <div class="scanner-container">
        <div class="scanner-line"></div>
        <div class="scanner-grid"></div>
      </div>
      <div class="addon-loading-details">
        <div class="loading-bar">
          <div class="loading-bar-fill" id="bar-${addon.id}" style="width: 0%"></div>
        </div>
        <div class="ai-logs" id="logs-${addon.id}">
          <div class="ai-log-line">Examinando: ${addon.fileName}</div>
          <div class="ai-log-line muted">Cargando metadatos de la Release...</div>
        </div>
      </div>
      <div class="addon-meta">
        <span>💾 ${addon.size}</span>
        <span>🤖 AI Engine Ready</span>
      </div>
    </div>
  `).join('');

  // Start animations
  currentAddons.forEach((addon, index) => {
    runAIScanningSimulation(addon, index);
  });
};

async function initAddonsSystem() {
  const grid = document.querySelector('.addons-grid');
  if (!grid) return;

  // Initial loader
  grid.innerHTML = `
    <div style="grid-column:1/-1; text-align:center; padding:60px 20px;" class="reveal visible">
      <div class="ai-status-dot pulse" style="width:16px; height:16px; margin:0 auto 16px;"></div>
      <h3 style="font-family:'Cinzel',serif; font-size:1.3rem; margin-bottom:12px;">Sincronizando con GitHub Releases</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; max-width:420px; margin:0 auto;">
        Estableciendo conexión con el repositorio y descargando los paquetes de addons. Por favor espere...
      </p>
    </div>
  `;

  // Fetch data
  currentAddons = await fetchAddons();

  if (currentAddons.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
        <div style="font-size:4rem; margin-bottom:16px;">🔮</div>
        <h3 style="font-family:'Cinzel',serif; font-size:1.3rem; margin-bottom:12px; color:var(--text-primary);">Próximamente</h3>
        <p style="color:var(--text-muted); font-size:0.9rem; max-width:420px; margin:0 auto 24px;">
          No se encontraron addons en la Release actual de GitHub. Únete a Discord para recibirlos primero.
        </p>
        <a href="https://discord.com/channels/1536546099962314843/1536555165535178852"
           target="_blank"
           class="btn btn-primary">
          💬 Ver canal de Addons en Discord
        </a>
      </div>
    `;
    return;
  }

  // Render Control Panel
  renderControlPanel(grid.parentElement, currentAddons.length);

  // Trigger scanning sequence
  triggerAIScan();
}

// Start on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initAddonsSystem();
});
