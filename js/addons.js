/* =============================================
   ADDONS.JS - Dynamic loading of addons via GitHub
   API and AI-powered metadata decoration
   Version 2.1 - Auto-detect + Marketplace Lookup + Auto-update Detection
   ============================================= */

// FILE TYPE DETECTOR
// Detects content type from filename: addon, world, shader, texture, skin
function detectFileType(fileName) {
  const f = fileName.toLowerCase();

  // SKIN detection
  if (
    f.includes('skin') || f.includes('skins') || f.includes('persona') ||
    f.includes('aspecto') || f.includes('aspectos')
  ) {
    return {
      type: 'skin',
      typeLabel: '\ud83d\udc65 Skin',
      category: 'Skins',
      badge: '\ud83d\udc65 Skin',
      badgeClass: 'badge-skin',
      defaultDesc: 'Pack de skins (aspectos) personalizado para cambiar la apariencia de tu personaje en el juego.',
      downloadLabel: '\ud83d\udce5 Descargar Skins'
    };
  }

  // SHADER detection
  if (
    f.includes('shader') || f.includes('shaders') || f.includes('rtx') ||
    f.includes('render') || f.includes('deferred') || f.includes('ray') ||
    f.includes('gfx') || f.includes('lighting') || f.includes('bsrp') ||
    f.includes('rpe') || f.includes('newb') || f.includes('fog')
  ) {
    return {
      type: 'shader',
      typeLabel: '\u2728 Shader',
      category: 'Shaders',
      badge: '\u2728 Shader',
      badgeClass: 'badge-shader',
      defaultDesc: 'Pack de shaders que transforma la iluminacion y los graficos de Minecraft Bedrock con efectos visuales cinematograficos.',
      downloadLabel: '\ud83d\udce5 Descargar Shader'
    };
  }

  // WORLD detection
  if (
    f.endsWith('.mctemplate') || f.endsWith('.mcworld') ||
    f.includes('world_template') || f.includes('_world')
  ) {
    return {
      type: 'world',
      typeLabel: '\ud83c\udf0d Mundo',
      category: 'Mundos',
      badge: '\ud83c\udf0d Mundo',
      badgeClass: 'badge-world',
      defaultDesc: 'Mapa o mundo personalizado con construcciones unicas, desafios y experiencias disenadas para la comunidad.',
      downloadLabel: '\ud83d\udce5 Descargar Mundo'
    };
  }

  // TEXTURE detection
  if (
    f.includes('texture') || f.includes('textures') || f.includes('resource') ||
    f.includes('faithful') || f.includes('16x') || f.includes('32x') || f.includes('64x')
  ) {
    return {
      type: 'texture',
      typeLabel: '\ud83c\udfa8 Textura',
      category: 'Texturas',
      badge: '\ud83c\udfa8 Textura',
      badgeClass: 'badge-texture',
      defaultDesc: 'Pack de texturas que redisena los bloques y entidades de Minecraft con un estilo visual unico.',
      downloadLabel: '\ud83d\udce5 Descargar Textura'
    };
  }

  return {
    type: 'addon',
    typeLabel: '\u2699\ufe0f Addon',
    category: 'Addons',
    badge: '\u2699\ufe0f Addon',
    badgeClass: 'badge-new',
    defaultDesc: 'Addon que expande las mecanicas y contenido de Minecraft Bedrock con nuevas funciones, mobs, items o dimensiones.',
    downloadLabel: '\ud83d\udce5 Descargar Addon'
  };
}

// CACHE
const CACHE_KEY = 'titan_marketplace_cache_v3';
function getCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function setCache(key, value) {
  try {
    const c = getCache();
    c[key] = value;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

function cleanNameForSearch(fileName) {
  return fileName
    .replace(/\.(mcaddon|mctemplate|mcworld|mcpack|zip)$/gi, '')
    .replace(/\.(addon|shader|texture|resource|behavior|world_template|skin)/gi, '')
    .replace(/[\._\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(str) {
  const minor = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'of', 'with', 'add', 'on'];
  return str.split(' ').map((w, i) =>
    (i === 0 || !minor.includes(w.toLowerCase()))
      ? w.charAt(0).toUpperCase() + w.slice(1)
      : w.toLowerCase()
  ).join(' ');
}

// MARKETPLACE SEARCH via BedrockExplorer
async function searchMarketplace(query) {
  const cacheKey = 'mkt:' + query.toLowerCase();
  const cached = getCache()[cacheKey];
  if (cached) return cached;

  try {
    const url = 'https://www.bedrockexplorer.com/api/search?q=' + encodeURIComponent(query) + '&limit=5';
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const result = {
          name: item.title || null,
          desc: item.description || null,
          imageUrl: item.thumbnail || item.keyArt || null,
          creator: item.creator || null
        };
        setCache(cacheKey, result);
        return result;
      }
    }
  } catch {}

  try {
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    for (const prefix of ['/add-ons/', '/worlds/', '/texture-packs/']) {
      try {
        const pageUrl = 'https://www.bedrockexplorer.com' + prefix + slug;
        const res = await fetch(pageUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const html = await res.text();
          const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/i);
          const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i);
          const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i);
          if (ogImg && ogImg[1] && !ogImg[1].includes('bedrockexplorer.com/images/bedrockexplorer')) {
            const result = {
              name: ogTitle ? ogTitle[1].split('-')[0].trim() : null,
              desc: ogDesc ? ogDesc[1] : null,
              imageUrl: ogImg[1],
              creator: null
            };
            setCache(cacheKey, result);
            return result;
          }
        }
      } catch {}
    }
  } catch {}

  return null;
}

// HEURISTIC CATEGORY DETECTOR
function detectCategory(fileName) {
  const l = fileName.toLowerCase();
  if (l.includes('skin') || l.includes('skins'))
    return { category: 'Skins', badge: '\ud83d\udc65 Skins', badgeClass: 'badge-skin' };
  if (l.includes('cave') || l.includes('dweller') || l.includes('horror') || l.includes('spooky') || l.includes('scary') || l.includes('zombie') || l.includes('ghost'))
    return { category: 'Terror', badge: '\ud83d\udc80 Terror', badgeClass: 'badge-exclusive' };
  if (l.includes('fire') || l.includes('ice') || l.includes('dragon') || l.includes('magic') || l.includes('adventure') || l.includes('quest') || l.includes('element'))
    return { category: 'Aventura', badge: '\ud83d\udd2e Aventura', badgeClass: 'badge-popular' };
  if (l.includes('disaster') || l.includes('defense') || l.includes('survival') || l.includes('shield') || l.includes('tower') || l.includes('defend'))
    return { category: 'Survival', badge: '\ud83d\udee1\ufe0f Survival', badgeClass: 'badge-hot' };
  if (l.includes('mob') || l.includes('entity') || l.includes('boss') || l.includes('creature') || l.includes('animal') || l.includes('monster'))
    return { category: 'Mobs', badge: '\ud83d\udc7e Mobs', badgeClass: 'badge-new' };
  if (l.includes('light') || l.includes('real') || l.includes('graphics') || l.includes('hd') || l.includes('ultra') || l.includes('visual'))
    return { category: 'Realismo', badge: '\ud83d\udca1 Realismo', badgeClass: 'badge-exclusive' };
  if (l.includes('phone') || l.includes('smart') || l.includes('tech') || l.includes('machine') || l.includes('modern') || l.includes('robot'))
    return { category: 'Tecnologia', badge: '\ud83d\udcf1 Tecnologia', badgeClass: 'badge-popular' };
  if (l.includes('space') || l.includes('rocket') || l.includes('star') || l.includes('galaxy') || l.includes('moon') || l.includes('planet'))
    return { category: 'Espacio', badge: '\ud83d\ude80 Espacio', badgeClass: 'badge-exclusive' };
  if (l.includes('car') || l.includes('vehicle') || l.includes('truck') || l.includes('bike') || l.includes('plane') || l.includes('train'))
    return { category: 'Vehiculos', badge: '\ud83d\ude97 Vehiculos', badgeClass: 'badge-hot' };
  if (l.includes('rpg') || l.includes('level') || l.includes('skill') || l.includes('class') || l.includes('warrior') || l.includes('mage'))
    return { category: 'RPG', badge: '\u2694\ufe0f RPG', badgeClass: 'badge-popular' };
  return { category: 'Aventura', badge: '\ud83d\udd2e Aventura', badgeClass: 'badge-new' };
}

const FALLBACK_IMAGES = {
  'Terror':     'https://images.unsplash.com/photo-1507166763745-bfe008fbb9f1?q=80&w=600&auto=format&fit=crop',
  'Aventura':   'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600&auto=format&fit=crop',
  'Survival':   'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?q=80&w=600&auto=format&fit=crop',
  'Mobs':       'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
  'Realismo':   'https://images.unsplash.com/photo-1517006859690-6013d9550225?q=80&w=600&auto=format&fit=crop',
  'Tecnologia': 'https://images.unsplash.com/photo-1551645121-d1034da75057?q=80&w=600&auto=format&fit=crop',
  'Espacio':    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=600&auto=format&fit=crop',
  'Vehiculos':  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=600&auto=format&fit=crop',
  'RPG':        'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=600&auto=format&fit=crop',
  'Shaders':    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=600&auto=format&fit=crop',
  'Mundos':     'https://images.unsplash.com/photo-1541855492-581f618f69a0?q=80&w=600&auto=format&fit=crop',
  'Texturas':   'https://images.unsplash.com/photo-1558591710-4b4a1ae0f004?q=80&w=600&auto=format&fit=crop',
  'Skins':      'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=600&auto=format&fit=crop',
  'Addons':     'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop'
};

// KNOWN ADDONS - curated metadata for the initial 7 release assets
const KNOWN_ADDONS = {
  "CAVE.DWELLER.Add-On.Official.addon.mcaddon": {
    name: "Cave Dweller (Official Add-On)",
    desc: "Enfrentate al temible Cave Dweller en la oscuridad de las minas! Esta criatura acecha en las sombras, emitiendo sonidos aterradores.",
    badge: "\ud83d\udc80 Terror",
    badgeClass: "badge-exclusive",
    imageUrl: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccf7581b-e666-4ec6-a7d1-4bfccf09a7d5/CaveDweller_Thumbnail_0.jpg",
    version: "Official v1.2",
    category: "Terror",
    type: "addon"
  },
  "CAVES.Fire.Ice.addon.mcaddon": {
    name: "Caves Fire & Ice",
    desc: "Expande las cuevas con biomas extremos de fuego y hielo. Encuentra dragones ancestrales y tesoros congelados en cuevas misticas.",
    badge: "\ud83d\udd2e Aventura",
    badgeClass: "badge-popular",
    imageUrl: "https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/1dcb302c-2dfd-40aa-a776-10318f8cdc94/CaveBiomes_Thumbnail_0.jpg",
    version: "v1.4",
    category: "Aventura",
    type: "addon"
  },
  "Disaster.Defense.world_template.mctemplate": {
    name: "Disaster Defense Map",
    desc: "Un mapa de defensa contra desastres naturales devastadores. Sobrevive a terremotos, tornados y tsunamis con tecnologia avanzada.",
    badge: "\ud83d\udee1\ufe0f Survival",
    badgeClass: "badge-hot",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/3121056a-a177-44e4-bcfe-c23fbd9ba717/DD_Thumbnail_0.jpg",
    version: "v2.0",
    category: "Survival",
    type: "world"
  },
  "Over.Mob.Add-On.addon.mcaddon": {
    name: "Over Mob Add-On",
    desc: "Anade decenas de nuevos mobs hostiles y pacificos al Overworld. Criaturas mitologicas y jefes gigantes.",
    badge: "\ud83d\udc7e Mobs",
    badgeClass: "badge-new",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/4fefe28d-861f-4937-9272-552ff66d78be/over_mob_addon_Thumbnail_0.jpg",
    version: "v1.2",
    category: "Mobs",
    type: "addon"
  },
  "Realight.Reimagined.addon.mcaddon": {
    name: "Realight Reimagined",
    desc: "Iluminacion dinamica y realista. Antorchas y linternas alumbraran tu camino al sostenerlos en la mano.",
    badge: "\ud83d\udca1 Realismo",
    badgeClass: "badge-exclusive",
    imageUrl: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/926b5cc5-049c-4c3a-9384-fa014995fb2e/Thumbnail_0.jpg",
    version: "v3.1",
    category: "Realismo",
    type: "addon"
  },
  "Smartphones.2.0.Add-On.addon.mcaddon": {
    name: "Smartphones 2.0 Add-On",
    desc: "Lleva la tecnologia moderna a Minecraft. Fabrica telefonos inteligentes funcionales para tomar fotos y enviar mensajes.",
    badge: "\ud83d\udcf1 Tecnologia",
    badgeClass: "badge-popular",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/878ef567-5ddc-4c3b-813b-9c5d75392ee0/SmartphonesAddOn_Thumbnail_0.jpg",
    version: "v2.0",
    category: "Tecnologia",
    type: "addon"
  },
  "Spacecraft.addon.mcaddon": {
    name: "Spacecraft Galactic",
    desc: "Viaja al espacio exterior! Construye cohetes espaciales, explora la Luna y otros planetas con gravedad modificada.",
    badge: "\ud83d\ude80 Espacio",
    badgeClass: "badge-exclusive",
    imageUrl: "https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/9843eecc-6430-49f4-b3f2-c541628984bf/SC_Thumbnail_0.jpg",
    version: "v1.5",
    category: "Espacio",
    type: "addon"
  }
};

let currentAddons = [];
let activeFilter = 'Todos';

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function sanitizeId(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// FUZZY MATCHING FOR FILE UPDATES ("Casi iguales")
function cleanBaseName(name) {
  return name.toLowerCase()
    .replace(/v\d+(\.\d+)*/gi, '') // remove v1, v2.3, v1.0.0
    .replace(/(official|beta|alpha|update|upd|fix|patch)/gi, '') // remove labels
    .replace(/\.(mcaddon|mctemplate|mcworld|mcpack|zip|addon|world_template|skin)/gi, '') // remove extensions
    .replace(/[^a-z0-9]/gi, '') // strip special chars
    .trim();
}

// Extract numeric version for comparison (e.g. "v2.3" -> 2.3, "v10" -> 10, no version -> 0)
function extractVersionNumber(fileName) {
  const match = fileName.match(/v(\d+(?:\.\d+)*)/i);
  if (!match) return 0;
  // Convert "2.3.1" -> 2.0031, "2" -> 2, "1.10" -> 1.10
  return match[1].split('.').reduce(function(acc, part, i) {
    return acc + parseInt(part, 10) / Math.pow(1000, i);
  }, 0);
}

function findCloseKnownMatch(fileName) {
  const cleanNew = cleanBaseName(fileName);
  if (!cleanNew) return null;

  for (const knownKey in KNOWN_ADDONS) {
    const cleanKnown = cleanBaseName(knownKey);
    if (cleanKnown === cleanNew || cleanNew.includes(cleanKnown) || cleanKnown.includes(cleanNew)) {
      return {
        key: knownKey,
        addon: KNOWN_ADDONS[knownKey]
      };
    }
  }
  return null;
}

// DEDUPLICATION - keeps only the latest version of each item
// Groups resolved addons by their clean base name.
// If two files match the same base name, only the one with the highest version number is kept.
function deduplicateByBaseName(addons) {
  const map = {};
  addons.forEach(function(addon) {
    const key = cleanBaseName(addon.fileName);
    if (!key) return;
    if (!map[key]) {
      map[key] = addon;
    } else {
      // Compare version numbers extracted from the original file names
      const existingVer = extractVersionNumber(map[key].fileName);
      const newVer = extractVersionNumber(addon.fileName);
      if (newVer > existingVer) {
        map[key] = addon; // Replace with newer version
      }
    }
  });
  return Object.values(map);
}

// AI METADATA RESOLUTION
// For unknown addons: detect type, search Marketplace, build full metadata
async function resolveAddonMetadata(fileName) {
  const fileType = detectFileType(fileName);
  const searchQuery = cleanNameForSearch(fileName);
  const cleanName = toTitleCase(searchQuery);

  let marketResult = null;
  try { marketResult = await searchMarketplace(searchQuery); } catch {}

  let catInfo;
  if (fileType.type === 'shader')       catInfo = { category: 'Shaders',  badge: '\u2728 Shader',    badgeClass: 'badge-shader'  };
  else if (fileType.type === 'world')   catInfo = { category: 'Mundos',   badge: '\ud83c\udf0d Mundo',    badgeClass: 'badge-world'   };
  else if (fileType.type === 'texture') catInfo = { category: 'Texturas', badge: '\ud83c\udfa8 Textura',  badgeClass: 'badge-texture' };
  else if (fileType.type === 'skin')    catInfo = { category: 'Skins',    badge: '\ud83d\udc65 Skin',     badgeClass: 'badge-skin'    };
  else catInfo = detectCategory(fileName);

  return {
    name: marketResult && marketResult.name ? marketResult.name : cleanName,
    desc: marketResult && marketResult.desc ? marketResult.desc : fileType.defaultDesc,
    badge: catInfo.badge,
    badgeClass: catInfo.badgeClass,
    imageUrl: (marketResult && marketResult.imageUrl) ? marketResult.imageUrl : (FALLBACK_IMAGES[catInfo.category] || FALLBACK_IMAGES['Addons']),
    version: 'v1.0',
    category: catInfo.category,
    type: fileType.type,
    typeLabel: fileType.typeLabel,
    downloadLabel: fileType.downloadLabel,
    fromMarketplace: !!(marketResult && marketResult.imageUrl),
    creator: (marketResult && marketResult.creator) ? marketResult.creator : null
  };
}

// BUILD ADDON OBJECT from asset + metadata
function buildAddon(asset, metadata, urlKey) {
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
    type: metadata.type || 'addon',
    typeLabel: metadata.typeLabel || '\u2699\ufe0f Addon',
    downloadLabel: metadata.downloadLabel || '\ud83d\udce5 Descargar Addon',
    fromMarketplace: metadata.fromMarketplace || false,
    creator: metadata.creator || null,
    size: formatBytes(asset.size),
    downloadUrl: asset[urlKey],
    downloadCount: asset.download_count || 0
  };
}

function enrichKnown(known) {
  const t = known.type || 'addon';
  return {
    ...known,
    typeLabel: t === 'world' ? '\ud83c\udf0d Mundo' :
               t === 'shader' ? '\u2728 Shader' :
               t === 'texture' ? '\ud83c\udfa8 Textura' :
               t === 'skin' ? '\ud83d\udc65 Skin' : '\u2699\ufe0f Addon',
    downloadLabel: t === 'world' ? '\ud83d\udce5 Descargar Mundo' :
                   t === 'shader' ? '\ud83d\udce5 Descargar Shader' :
                   t === 'texture' ? '\ud83d\udce5 Descargar Textura' :
                   t === 'skin' ? '\ud83d\udce5 Descargar Skins' : '\ud83d\udce5 Descargar Addon',
    fromMarketplace: true,
    creator: null
  };
}

// FETCH ADDONS FROM GITHUB - loads ALL releases automatically
async function fetchAddons() {
  try {
    // Fetch ALL releases (not just one tag), so every new release appears automatically
    const response = await fetch(
      'https://api.github.com/repos/Anonimous7800/practicas/releases',
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );
    if (!response.ok) throw new Error('GitHub API error ' + response.status);
    const releases = await response.json();

    // Flatten assets from ALL releases into one list
    const allAssets = [];
    releases.forEach(function(release) {
      if (release.assets && release.assets.length > 0) {
        release.assets.forEach(function(asset) {
          allAssets.push(asset);
        });
      }
    });

    if (allAssets.length > 0) {
      const resolved = await Promise.all(allAssets.map(async function(asset) {
        let known = KNOWN_ADDONS[asset.name];
        let isUpdate = false;
        let detectedVersion = null;

        if (!known) {
          const matchResult = findCloseKnownMatch(asset.name);
          if (matchResult) {
            known = matchResult.addon;
            isUpdate = true;
            const verMatch = asset.name.match(/v\d+(\.\d+)*/i);
            if (verMatch) detectedVersion = verMatch[0];
          }
        }

        let meta;
        if (known) {
          meta = enrichKnown(known);
          if (isUpdate) {
            meta.version = detectedVersion
              ? detectedVersion + ' (Actualizaci\u00f3n)'
              : (meta.version || 'v1.0') + ' (Actualizado)';
          }
        } else {
          meta = await resolveAddonMetadata(asset.name);
        }
        return buildAddon(asset, meta, 'browser_download_url');
      }));

      // Deduplicate: if same item appears in multiple releases, keep newest version
      return deduplicateByBaseName(resolved);
    }
  } catch (error) {
    console.warn('GitHub API no disponible, usando fallback local:', error);
  }

  // FALLBACK - hardcoded assets if GitHub API is unavailable
  const localAssets = [
    { name: "CAVE.DWELLER.Add-On.Official.addon.mcaddon", size: 6887035, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/CAVE.DWELLER.Add-On.Official.addon.mcaddon" },
    { name: "CAVES.Fire.Ice.addon.mcaddon", size: 17906375, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/CAVES.Fire.Ice.addon.mcaddon" },
    { name: "Disaster.Defense.world_template.mctemplate", size: 83152561, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Disaster.Defense.world_template.mctemplate" },
    { name: "Over.Mob.Add-On.addon.mcaddon", size: 13901891, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Over.Mob.Add-On.addon.mcaddon" },
    { name: "Realight.Reimagined.addon.mcaddon", size: 316418, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Realight.Reimagined.addon.mcaddon" },
    { name: "Smartphones.2.0.Add-On.addon.mcaddon", size: 18703555, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Smartphones.2.0.Add-On.addon.mcaddon" },
    { name: "Spacecraft.addon.mcaddon", size: 14066466, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Spacecraft.addon.mcaddon" },
    { name: "Altfit.skin_pack.mcpack", size: 0, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Altfit.skin_pack.mcpack" }
  ];

  return deduplicateByBaseName(await Promise.all(localAssets.map(async function(asset) {
    const known = KNOWN_ADDONS[asset.name];
    let meta;
    if (known) {
      meta = enrichKnown(known);
    } else {
      meta = await resolveAddonMetadata(asset.name);
    }
    return buildAddon({ ...asset, download_count: 0 }, meta, 'url');
  })));
}

// CONTROL PANEL
function renderControlPanel(container, addonsCount) {
  let panel = document.getElementById('aiControlPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'aiControlPanel';
    panel.className = 'ai-control-panel reveal';
    container.insertBefore(panel, document.querySelector('.addons-grid'));
  }

  const baseCategories = ['Todos'];
  const presentCategories = [...new Set(currentAddons.map(a => a.category))].sort();
  const categories = [...baseCategories, ...presentCategories];

  const icons = {
    'Todos': '\ud83d\uddc2\ufe0f', 'Terror': '\ud83d\udc80', 'Aventura': '\ud83d\udd2e',
    'Survival': '\ud83d\udee1\ufe0f', 'Mobs': '\ud83d\udc7e', 'Realismo': '\ud83d\udca1',
    'Tecnologia': '\ud83d\udcf1', 'Espacio': '\ud83d\ude80', 'Vehiculos': '\ud83d\ude97',
    'RPG': '\u2694\ufe0f', 'Shaders': '\u2728', 'Mundos': '\ud83c\udf0d',
    'Texturas': '\ud83c\udfa8', 'Skins': '\ud83d\udc65', 'Addons': '\u2699\ufe0f'
  };

  const filterHtml = categories.map(cat => {
    const activeClass = cat === activeFilter ? 'active' : '';
    const icon = icons[cat] || '\ud83d\udd39';
    return '<button class="filter-btn ' + activeClass + '" onclick="filterCategory(\'' + cat + '\')">' + icon + ' ' + cat + '</button>';
  }).join('');

  const typeBadges = [
    currentAddons.filter(a => a.type === 'addon').length > 0 ? '<span class="type-count-badge">\u2699\ufe0f ' + currentAddons.filter(a => a.type === 'addon').length + ' Addons</span>' : '',
    currentAddons.filter(a => a.type === 'world').length > 0 ? '<span class="type-count-badge">\ud83c\udf0d ' + currentAddons.filter(a => a.type === 'world').length + ' Mundos</span>' : '',
    currentAddons.filter(a => a.type === 'shader').length > 0 ? '<span class="type-count-badge">\u2728 ' + currentAddons.filter(a => a.type === 'shader').length + ' Shaders</span>' : '',
    currentAddons.filter(a => a.type === 'texture').length > 0 ? '<span class="type-count-badge">\ud83c\udfa8 ' + currentAddons.filter(a => a.type === 'texture').length + ' Texturas</span>' : '',
    currentAddons.filter(a => a.type === 'skin').length > 0 ? '<span class="type-count-badge">\ud83d\udc65 ' + currentAddons.filter(a => a.type === 'skin').length + ' Skins</span>' : ''
  ].filter(Boolean).join('');

  panel.innerHTML =
    '<div class="ai-status-badge">' +
      '<span class="icon">\ud83e\udd16</span>' +
      '<div class="status-text">IA Activa: <span id="aiActiveCount">' + addonsCount + '</span> items. ' + typeBadges + '</div>' +
    '</div>' +
    '<div class="addon-filters">' + filterHtml + '</div>' +
    '<button class="btn-ai-rescan" onclick="triggerAIScan()">\ud83d\udd04 Re-escanear con IA</button>';

  setTimeout(function() { panel.classList.add('visible'); }, 50);
}

// FILTER
window.filterCategory = function(category) {
  activeFilter = category;
  const grid = document.querySelector('.addons-grid');
  renderControlPanel(grid.parentElement, currentAddons.length);
  document.querySelectorAll('.addon-card').forEach(function(card) {
    const cardId = card.id.replace('card-', '');
    const addon = currentAddons.find(function(a) { return a.id === cardId; });
    if (!addon) return;
    const matches = category === 'Todos' || addon.category === category;
    card.style.display = matches ? '' : 'none';
    if (matches) card.classList.add('visible'); else card.classList.remove('visible');
  });
};

// AI SCAN SIMULATION - type-specific logs
function runAIScanningSimulation(addon, index) {
  const cardEl = document.getElementById('card-' + addon.id);
  if (!cardEl) return;
  const barEl = document.getElementById('bar-' + addon.id);
  const logsEl = document.getElementById('logs-' + addon.id);

  const typeSteps = {
    'shader': [
      { progress: 15, log: '[DETECT] Tipo: SHADER (.mcpack)' },
      { progress: 35, log: '[GLSL] Analizando pipeline grafico...' },
      { progress: 55, log: '[RTX] Verificando compatibilidad Ray Tracing...' },
      { progress: 75, log: '[Marketplace] Buscando shader en BedrockExplorer...' },
      { progress: 90, log: '[AI] Descripcion visual generada.' },
      { progress: 100, log: '[OK] Shader indexado exitosamente.' }
    ],
    'world': [
      { progress: 12, log: '[DETECT] Tipo: MUNDO (.mctemplate / .mcworld)' },
      { progress: 30, log: '[MAP] Analizando estructura del mapa...' },
      { progress: 52, log: '[Marketplace] Buscando mapa en Minecraft Marketplace...' },
      { progress: 72, log: addon.fromMarketplace ? '[OK] Imagen oficial de Marketplace vinculada! v' : '[AI-IMG] Imagen asignada por categoria.' },
      { progress: 88, log: '[AI-NLG] Generando descripcion del mundo...' },
      { progress: 100, log: '[OK] Mapa indexado: ' + addon.category }
    ],
    'texture': [
      { progress: 15, log: '[DETECT] Tipo: TEXTURA / RESOURCE PACK' },
      { progress: 35, log: '[TEX] Inspeccionando paleta de colores...' },
      { progress: 55, log: '[Marketplace] Buscando pack en BedrockExplorer...' },
      { progress: 75, log: addon.fromMarketplace ? '[OK] Imagen de Marketplace encontrada! v' : '[AI-IMG] Imagen semantica asignada.' },
      { progress: 90, log: '[AI-NLG] Descripcion de estilo generada.' },
      { progress: 100, log: '[OK] Textura indexada correctamente.' }
    ],
    'skin': [
      { progress: 15, log: '[DETECT] Tipo: ASPECTOS / SKINS (.mcpack)' },
      { progress: 35, log: '[TEX] Analizando mapeo UV de skins...' },
      { progress: 55, log: '[Marketplace] Buscando catalogo de skins...' },
      { progress: 75, log: addon.fromMarketplace ? '[OK] Imagen oficial encontrada! v' : '[AI-IMG] Skin asignado por categoria.' },
      { progress: 90, log: '[AI] Descripcion de skins generada.' },
      { progress: 100, log: '[OK] Skins indexadas correctamente.' }
    ],
    'addon': [
      { progress: 15, log: '[NLP] Indexando: ' + addon.fileName },
      { progress: 32, log: '[DETECT] Tipo: ADDON (.mcaddon)' },
      { progress: 52, log: '[Marketplace] Buscando "' + addon.name + '" en Marketplace...' },
      { progress: 70, log: addon.fromMarketplace ? '[OK] Imagen oficial de Marketplace! v' : '[AI-IMG] Imagen semantica por categoria.' },
      { progress: 86, log: '[AI-NLG] Descripcion optimizada en espanol.' },
      { progress: 100, log: '[OK] Addon indexado. Categoria: ' + addon.category }
    ]
  };

  const steps = typeSteps[addon.type] || typeSteps['addon'];
  let currentStepIndex = 0;
  const totalDuration = 1400 + index * 280 + Math.random() * 400;
  const stepTime = totalDuration / steps.length;

  const interval = setInterval(function() {
    if (currentStepIndex >= steps.length) {
      clearInterval(interval);
      resolveCard(addon);
    } else {
      const step = steps[currentStepIndex];
      if (barEl) barEl.style.width = step.progress + '%';
      if (logsEl) {
        const logLine = document.createElement('div');
        logLine.className = 'ai-log-line';
        logLine.textContent = step.log;
        if (logsEl.children.length >= 3) {
          logsEl.children[0].classList.add('muted');
          if (logsEl.children.length >= 4) logsEl.removeChild(logsEl.children[0]);
        }
        logsEl.appendChild(logLine);
        logsEl.scrollTop = logsEl.scrollHeight;
      }
      currentStepIndex++;
    }
  }, stepTime);
}

// RESOLVE CARD (final render)
function resolveCard(addon) {
  const cardEl = document.getElementById('card-' + addon.id);
  if (!cardEl) return;
  cardEl.classList.remove('scanning');
  cardEl.classList.add('loaded');

  const fallback = FALLBACK_IMAGES[addon.category] || FALLBACK_IMAGES['Addons'];
  const downloadsMeta = addon.downloadCount > 0 ? '<span>\ud83d\udd25 ' + addon.downloadCount + ' descargas</span>' : '';
  const marketplaceBadge = addon.fromMarketplace ? '<span class="marketplace-verified">\u2714 Marketplace</span>' : '';
  const creatorMeta = addon.creator ? '<span>\ud83d\udc64 ' + addon.creator + '</span>' : '';

  cardEl.innerHTML =
    '<div class="addon-image-wrapper">' +
      '<img src="' + addon.imageUrl + '" alt="' + addon.name + '" class="addon-image" onerror="this.src=\'' + fallback + '\'" />' +
      '<div class="addon-image-overlay"></div>' +
      '<div class="addon-type-label">' + addon.typeLabel + '</div>' +
      '<div class="addon-badge badge ' + addon.badgeClass + '">' + addon.badge + '</div>' +
    '</div>' +
    '<div class="addon-content">' +
      '<h3 class="addon-title">' + addon.name + '</h3>' +
      marketplaceBadge +
      '<p class="addon-desc">' + addon.desc + '</p>' +
      '<div class="addon-meta">' +
        '<span>\ud83d\udce6 ' + addon.version + '</span>' +
        '<span>\ud83d\udcbe ' + addon.size + '</span>' +
        downloadsMeta + creatorMeta +
      '</div>' +
      '<a href="' + addon.downloadUrl + '" target="_blank" class="btn btn-primary btn-sm w-full mt-16">' +
        addon.downloadLabel +
      '</a>' +
    '</div>';

  setTimeout(function() {
    cardEl.classList.add('visible');
    if (activeFilter !== 'Todos' && addon.category !== activeFilter) {
      cardEl.style.display = 'none';
      cardEl.classList.remove('visible');
    }
  }, 50);
}

// TRIGGER AI SCAN
window.triggerAIScan = async function() {
  const grid = document.querySelector('.addons-grid');
  if (!grid) return;

  grid.innerHTML = currentAddons.map(function(addon) {
    return '<div class="addon-card card scanning" id="card-' + addon.id + '">' +
      '<div class="ai-status">' +
        '<span class="ai-status-dot pulse"></span>' +
        '<span class="ai-status-text">\ud83e\udd16 IA DETECTANDO TIPO...</span>' +
      '</div>' +
      '<div class="scanner-container">' +
        '<div class="scanner-line"></div>' +
        '<div class="scanner-grid"></div>' +
      '</div>' +
      '<div class="addon-loading-details">' +
        '<div class="loading-bar"><div class="loading-bar-fill" id="bar-' + addon.id + '" style="width:0%"></div></div>' +
        '<div class="ai-logs" id="logs-' + addon.id + '">' +
          '<div class="ai-log-line">Examinando: ' + addon.fileName + '</div>' +
          '<div class="ai-log-line muted">Identificando tipo de archivo...</div>' +
        '</div>' +
      '</div>' +
      '<div class="addon-meta"><span>\ud83d\udcbe ' + addon.size + '</span><span>\ud83e\udd16 AI Engine v2.1</span></div>' +
    '</div>';
  }).join('');

  currentAddons.forEach(function(addon, index) {
    runAIScanningSimulation(addon, index);
  });
};

// INIT
async function initAddonsSystem() {
  const grid = document.querySelector('.addons-grid');
  if (!grid) return;

  grid.innerHTML =
    '<div style="grid-column:1/-1; text-align:center; padding:60px 20px;" class="reveal visible">' +
      '<div class="ai-status-dot pulse" style="width:16px; height:16px; margin:0 auto 16px;"></div>' +
      '<h3 style="font-family:\'Cinzel\',serif; font-size:1.3rem; margin-bottom:12px;">\ud83e\udd16 IA buscando en GitHub y Marketplace...</h3>' +
      '<p style="color:var(--text-muted); font-size:0.9rem; max-width:460px; margin:0 auto;">' +
        'Descargando release, detectando tipos (addon / mundo / shader / textura / skins) y buscando imagenes en la Marketplace. Espere...' +
      '</p>' +
    '</div>';

  currentAddons = await fetchAddons();

  if (currentAddons.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1; text-align:center; padding:60px 20px;">' +
        '<div style="font-size:4rem; margin-bottom:16px;">\ud83d\udd2e</div>' +
        '<h3 style="font-family:\'Cinzel\',serif; font-size:1.3rem; margin-bottom:12px; color:var(--text-primary);">Proximamente</h3>' +
        '<p style="color:var(--text-muted); font-size:0.9rem; max-width:420px; margin:0 auto 24px;">' +
          'No se encontraron addons. Unete a Discord para recibirlos primero.' +
        '</p>' +
        '<a href="https://discord.com/channels/1536546099962314843/1536555165535178852" target="_blank" class="btn btn-primary">' +
          '\ud83d\udcac Ver canal de Addons en Discord' +
        '</a>' +
      '</div>';
    return;
  }

  renderControlPanel(grid.parentElement, currentAddons.length);
  triggerAIScan();
}

document.addEventListener('DOMContentLoaded', function() {
  initAddonsSystem();
});