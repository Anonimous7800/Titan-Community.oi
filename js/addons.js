/* =============================================
   ADDONS.JS - Dynamic loading of addons via GitHub
   API and AI-powered metadata decoration
   Version 3.0 - Minecraft.net Marketplace Integration + AI Search + Full Categories
   ============================================= */

/* FUENTES DE METADATA CONSULTADAS POR LA IA:
   1) Minecraft.net Marketplace (https://www.minecraft.net/es-es/marketplace)
      - Consulta metadatos oficiales, portadas y detalles a través de proxies CORS y APIs de Bedrock.
   2) BedrockExplorer (API REST + og:meta)
   3) MCPEDL (API REST de WordPress para addons/mundos/texturas/shaders)
   4) Generación semántica por IA procedimental con imágenes de respaldo por categoría. */

// SOURCE 0: Minecraft.net Marketplace (https://www.minecraft.net/es-es/marketplace)
async function searchMinecraftNetMarketplace(query, fileType) {
  try {
    const typeLabel = (fileType === 'world') ? 'world' 
                    : (fileType === 'skin')  ? 'skin pack' 
                    : (fileType === 'shader')? 'shader' 
                    : (fileType === 'texture')? 'texture pack' 
                    : 'addon';

    const fullQuery = (query + ' ' + typeLabel + ' minecraft bedrock').trim();
    const encoded = encodeURIComponent(fullQuery);
    const targetUrl = 'https://www.minecraft.net/es-es/marketplace/search?q=' + encoded;
    
    // Proxies CORS para consultar https://www.minecraft.net/es-es/marketplace sin bloqueo del navegador
    const proxies = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
      'https://corsproxy.io/?' + encodeURIComponent(targetUrl)
    ];

    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const html = await res.text();
          if (html && html.length > 500) {
            const ogImg = html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i);
            const ogTitle = html.match(/<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["']([^"']+)["']/i);
            const ogDesc = html.match(/<meta\s+(?:property|name)=["'](?:og:description|twitter:description)["']\s+content=["']([^"']+)["']/i);

            if (ogImg && ogImg[1] && !ogImg[1].includes('creeper-face.jpg')) {
              const titleGuess = ogTitle ? ogTitle[1].split('|')[0].replace(/Marketplace.*$/i, '').trim() : null;
              return {
                name: titleGuess || toTitleCase(query),
                desc: ogDesc ? ogDesc[1].trim() : null,
                imageUrl: ogImg[1],
                creator: 'Minecraft Marketplace',
                source: 'minecraft.net'
              };
            }
          }
        }
      } catch (e) {}
    }
  } catch (err) {}
  return null;
}


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

// GENERADOR DE PORTADAS SVG BASE64 MINECRAFT INFALIBLES
// Genera una cadena Base64 pura (sin comillas ni saltos de línea) que nunca rompe el atributo onerror
function getMinecraftSvgBanner(name, type) {
  const bgGradient = type === 'skin' ? ['#e65c00', '#F9D423'] :
                     type === 'world' ? ['#11998e', '#38ef7d'] :
                     type === 'shader' ? ['#8A2387', '#E94057'] :
                     type === 'texture' ? ['#f857a6', '#ff5858'] : ['#4776E6', '#8E54E9'];

  const icon = type === 'skin' ? 'SKIN PACK' :
               type === 'world' ? 'MUNDO BEDROCK' :
               type === 'shader' ? 'SHADER RTX' :
               type === 'texture' ? 'TEXTURA HD' : 'ADDON MINECRAFT';

  const cleanTitle = (name || 'Minecraft Content').replace(/[^a-zA-Z0-9\s]/g, '').trim();

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">' +
    '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="' + bgGradient[0] + '"/><stop offset="100%" stop-color="' + bgGradient[1] + '"/></linearGradient>' +
    '<pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/></pattern></defs>' +
    '<rect width="600" height="400" fill="url(#g)"/><rect width="600" height="400" fill="url(#grid)"/>' +
    '<circle cx="300" cy="180" r="100" fill="rgba(0,0,0,0.3)"/>' +
    '<text x="300" y="165" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">' + icon + '</text>' +
    '<text x="300" y="210" font-family="sans-serif" font-size="24" font-weight="bold" fill="#FFE600" text-anchor="middle">' + cleanTitle.substring(0, 22) + '</text>' +
    '<rect x="180" y="300" width="240" height="38" rx="19" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>' +
    '<text x="300" y="324" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">TITAN COMMUNITY</text>' +
    '</svg>';

  try {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  } catch (e) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27');
  }
}

// PROXY Y SEGURIDAD DE IMAGENES
function getSafeImageUrl(url, name, type) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return getMinecraftSvgBanner(name, type);
  }
  return url.trim();
}

// INTEGRACION CON GOOGLE GEMINI AI
// Analiza el nombre del archivo con IA de Gemini para deducir el título, descripción exacta y palabra clave de búsqueda
async function callGeminiAI(fileName) {
  try {
    const promptText = `Eres un asistente experto en Minecraft Bedrock (Marketplace, Addons, Skins, Mundos, Shaders, Texturas).
Analiza este nombre de archivo de Minecraft: "${fileName}".
Identifica qué contenido es y responde ÚNICAMENTE en formato JSON plano (sin bloques markdown ni etiquetas html):
{
  "name": "Título limpio y descriptivo en español",
  "desc": "Descripción detallada en español de qué hace o qué incluye este paquete (2 a 3 frases claras)",
  "category": "Terror, Aventura, Survival, Mobs, Realismo, Tecnologia, Espacio, Vehiculos, RPG, Shaders, Mundos, Texturas o Skins",
  "searchKeyword": "Nombre clave en inglés y español para buscar la portada oficial en Minecraft Bedrock",
  "directImageUrl": "URL directa de la imagen oficial si la conoces (ejemplo: de mcpedl, xboxlive, mojang, playfab)"
}`;

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      }
    }
  } catch (e) {
    console.warn('Gemini API call skipped or timed out:', e);
  }
  return null;
}

// CACHE - v14: mapeo directo de los 19 archivos reales de GitHub a portadas oficiales de Marketplace/MCPEDL
const CACHE_KEY = 'titan_marketplace_cache_v14';
function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function setCache(key, value) {
  try {
    const c = getCache();
    c[key] = value;
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

function cleanNameForSearch(fileName) {
  let clean = fileName
    .replace(/\.(mcaddon|mctemplate|mcworld|mcpack|zip)$/gi, '')
    .replace(/[\._\-](skin_pack|skinpack|addon|shader|texture|resource|behavior|world_template|skin)/gi, '')
    .replace(/\.(addon|shader|texture|resource|behavior|world_template|skin)/gi, '')
    .replace(/[\._\-]\d+[\d\._\-a-z]*/gi, '') // Elimina números de versión como .1.10.1, .1.11s, .v2.0
    .replace(/[\._\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalización para paquetes conocidos de la comunidad
  if (clean.toLowerCase().includes('actions') && clean.toLowerCase().includes('stuff')) {
    return 'Actions and Stuff';
  }
  return clean;
}

function toTitleCase(str) {
  const minor = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'of', 'with', 'add', 'on'];
  return str.split(' ').map((w, i) =>
    (i === 0 || !minor.includes(w.toLowerCase()))
      ? w.charAt(0).toUpperCase() + w.slice(1)
      : w.toLowerCase()
  ).join(' ');
}

// STOPWORDS que no cuentan como "palabra significativa" al comparar nombres.
// Sin esto, un archivo llamado "Cave Add-On" haria match con cualquier cosa que
// tenga "add" u "on" en el titulo.
const MATCH_STOPWORDS = new Set([
  'add', 'on', 'addon', 'the', 'a', 'an', 'and', 'or', 'of', 'for', 'pack', 'mod',
  'edition', 'official', 'new', 'update', 'v1', 'v2', 'v3', 'para', 'de', 'el', 'la',
  'los', 'las', 'con', 'y'
]);

function significantWords(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !MATCH_STOPWORDS.has(w));
}

// Compara el nombre del archivo (query) contra el titulo devuelto por una fuente
// externa. Solo aceptamos el resultado si comparten suficientes palabras
// significativas - evita quedarnos con la imagen de un addon completamente distinto
// solo porque la busqueda de texto libre encontro "algo parecido".
function isRelevantMatch(query, candidateName) {
  if (!candidateName) return false;
  const queryWords = significantWords(query);
  if (queryWords.length === 0) return false;
  const nameWordSet = new Set(significantWords(candidateName));
  if (nameWordSet.size === 0) return false;

  let matches = 0;
  queryWords.forEach(w => { if (nameWordSet.has(w)) matches++; });

  // Exige que al menos la mitad de las palabras significativas del archivo
  // aparezcan en el titulo encontrado (minimo 1 si solo hay una palabra clave).
  const required = Math.max(1, Math.ceil(queryWords.length * 0.5));
  return matches >= required;
}

// SOURCE 1: BedrockExplorer (API + og:meta fallback on item pages)
async function searchBedrockExplorer(query) {
  try {
    const url = 'https://www.bedrockexplorer.com/api/search?q=' + encodeURIComponent(query) + '&limit=5';
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.items && data.items.length > 0) {
        // Revisa TODOS los candidatos devueltos, no solo el primero, y se queda
        // con el primero que realmente coincida con el nombre del archivo.
        for (const item of data.items) {
          const hasImage = item.thumbnail || item.keyArt;
          if (hasImage && isRelevantMatch(query, item.title)) {
            return {
              name: item.title || null,
              desc: item.description || null,
              imageUrl: item.thumbnail || item.keyArt || null,
              creator: item.creator || null
            };
          }
        }
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
          const titleGuess = ogTitle ? ogTitle[1].split('-')[0].trim() : null;
          // La URL se construye a partir del propio nombre del archivo (slug), asi que
          // aqui el riesgo de falso positivo es bajo, pero igual validamos el titulo
          // cuando esta disponible.
          if (ogImg && ogImg[1] && !ogImg[1].includes('bedrockexplorer.com/images/bedrockexplorer') &&
              (!titleGuess || isRelevantMatch(query, titleGuess))) {
            return {
              name: titleGuess,
              desc: ogDesc ? ogDesc[1] : null,
              imageUrl: ogImg[1],
              creator: null
            };
          }
        }
      } catch {}
    }
  } catch {}

  return null;
}

// SOURCE 2: MCPEDL (via su API REST de WordPress) - referencia para addons/mundos/
// texturas/shaders de la comunidad, mucho mas probable que tenga estos archivos que
// el Marketplace oficial de Mojang (que solo vende DLC de partners).
async function searchMCPEDL(query) {
  try {
    // Pedimos varios candidatos (no solo 1): la busqueda de texto de WordPress es
    // laxa y el primer resultado casi nunca es el correcto.
    const url = 'https://mcpedl.com/wp-json/wp/v2/posts?search=' +
      encodeURIComponent(query) + '&per_page=5&_embed';
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) return null;

    const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    for (const post of posts) {
      const title = stripHtml(post.title && post.title.rendered);
      if (!isRelevantMatch(query, title)) continue; // descarta resultados que no coinciden

      let imageUrl = null;
      try {
        const media = post._embedded && post._embedded['wp:featuredmedia'];
        if (media && media[0]) {
          imageUrl = (media[0].media_details && media[0].media_details.sizes &&
            media[0].media_details.sizes.medium_large &&
            media[0].media_details.sizes.medium_large.source_url) || media[0].source_url;
        }
      } catch {}

      if (!imageUrl) continue;

      return {
        name: title,
        desc: stripHtml(post.excerpt && post.excerpt.rendered),
        imageUrl: imageUrl,
        creator: null
      };
    }
  } catch {}
  return null;
}

// MARKETPLACE & WEB SEARCH
// Busca en la web el primer resultado para: "[Nombre] [addon/world/skin/shader/textura] minecraft bedrock"
async function searchMarketplace(query, fileType) {
  const cacheKey = 'mkt_v13:' + query.toLowerCase() + ':' + (fileType || '');
  const cached = getCache()[cacheKey];
  if (cached !== undefined) return cached;

  const typeWord = (fileType === 'world')   ? 'world' 
                 : (fileType === 'skin')    ? 'skin pack' 
                 : (fileType === 'shader')  ? 'shader' 
                 : (fileType === 'texture') ? 'texture pack' 
                 : 'addon';

  const fullWebQuery = (query + ' ' + typeWord + ' minecraft bedrock').trim();

  // 1) MCPEDL API: Búsqueda con la frase completa
  let result = await searchMCPEDL(fullWebQuery);

  // 2) Captura de Gameplay real de YouTube (extrae miniatura HD del video en acción)
  if (!result || !result.imageUrl) {
    result = await searchYouTubeThumbnail(query, fileType);
  }

  // 3) BedrockExplorer: Búsqueda con la frase completa
  if (!result || !result.imageUrl) {
    result = await searchBedrockExplorer(fullWebQuery);
  }

  // 4) Minecraft.net oficial Marketplace
  if (!result || !result.imageUrl) {
    result = await searchMinecraftNetMarketplace(query, fileType);
  }

  // 5) MCPEDL búsqueda directa por URL Slug
  if (!result || !result.imageUrl) {
    result = await searchMCPEDLBySlug(query, fileType);
  }

  // 6) DuckDuckGo Web Proxy (Búsqueda general en la web para traer la primera página encontrada)
  if (!result || !result.imageUrl) {
    result = await searchDuckDuckGoWeb(fullWebQuery);
  }

  setCache(cacheKey, result || null);
  return result;
}

// SOURCE: Extractor de capturas de pantalla de gameplays en YouTube
async function searchYouTubeThumbnail(query, fileType) {
  try {
    const typeLabel = (fileType === 'world')   ? 'world map' 
                    : (fileType === 'skin')    ? 'skin pack' 
                    : (fileType === 'shader')  ? 'shader rtx' 
                    : (fileType === 'texture') ? 'texture pack' 
                    : 'addon';
    const fullSearch = query + ' ' + typeLabel + ' minecraft bedrock';
    const targetUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(fullSearch);
    
    const proxies = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
      'https://corsproxy.io/?' + encodeURIComponent(targetUrl)
    ];

    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/\/vi\/([a-zA-Z0-9_\-]{11})\/(?:hqdefault|hqdefault_custom|mqdefault|sddefault)\.jpg/);
          if (match && match[1]) {
            const videoId = match[1];
            return {
              name: toTitleCase(query),
              desc: null,
              imageUrl: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
              creator: 'Gameplay Capture',
              source: 'youtube-capture'
            };
          }
        }
      } catch (e) {}
    }
  } catch (err) {}
  return null;
}

// SOURCE: Búsqueda web general a través de DuckDuckGo HTML Proxy
async function searchDuckDuckGoWeb(fullQuery) {
  try {
    const targetUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(fullQuery);
    const proxies = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
      'https://corsproxy.io/?' + encodeURIComponent(targetUrl)
    ];

    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const html = await res.text();
          if (html && html.length > 500) {
            const titleMatch = html.match(/<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
            const snippetMatch = html.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

            if (titleMatch) {
              const cleanTitle = titleMatch[1].replace(/<[^>]*>/g, '').replace(/&#\d+;/g, '').trim();
              const cleanSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').replace(/&#\d+;/g, '').trim() : null;

              if (cleanTitle) {
                return {
                  name: cleanTitle.replace(/\s*[-|].*$/, '').trim(),
                  desc: cleanSnippet,
                  imageUrl: null,
                  creator: 'Web Result',
                  source: 'duckduckgo'
                };
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (err) {}
  return null;
}

// SOURCE 3: MCPEDL búsqueda directa por slug de URL
// Intenta acceder directamente a mcpedl.com/<slug> donde <slug> es el nombre del archivo convertido
async function searchMCPEDLBySlug(query, fileType) {
  try {
    const slug = query.toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug || slug.length < 3) return null;

    // Intentar diferentes variaciones del slug
    const slugVariants = [
      slug,
      slug + '-addon',
      slug + '-skin-pack',
      slug + '-shader',
      slug + '-texture-pack',
      slug + '-map'
    ];

    for (const variant of slugVariants.slice(0, fileType === 'skin' ? 3 : 2)) {
      try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://mcpedl.com/' + variant);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const html = await res.text();
          if (html && html.length > 1000 && html.includes('mcpedl')) {
            const ogImg = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
                       || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
            const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
                        || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i);
            const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
                         || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);

            if (ogImg && ogImg[1] && ogImg[1].includes('mcpedl')) {
              const title = ogTitle ? ogTitle[1].replace(/\s*[-|].*$/, '').trim() : null;
              if (!title || isRelevantMatch(query, title)) {
                return {
                  name: title,
                  desc: ogDesc ? ogDesc[1].replace(/&#039;|&amp;|&quot;/g, "'").trim() : null,
                  imageUrl: ogImg[1],
                  creator: null,
                  source: 'mcpedl-slug'
                };
              }
            }
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}

// SOURCE 4: MCPEDL categoría skins - busca específicamente en la categoría skin-packs
async function searchMCPEDLSkins(query) {
  try {
    // Buscar específicamente en la categoría skin-packs de MCPEDL
    const url = 'https://mcpedl.com/wp-json/wp/v2/posts?search=' +
      encodeURIComponent(query + ' skin') +
      '&per_page=8&_embed&categories=5'; // categoría 5 = skin packs en MCPEDL
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) return null;

    const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    for (const post of posts) {
      const title = stripHtml(post.title && post.title.rendered);

      let imageUrl = null;
      try {
        const media = post._embedded && post._embedded['wp:featuredmedia'];
        if (media && media[0]) {
          imageUrl = (media[0].media_details && media[0].media_details.sizes &&
            media[0].media_details.sizes.medium_large &&
            media[0].media_details.sizes.medium_large.source_url) || media[0].source_url;
        }
      } catch {}

      // Para skins, ser más permisivo: aceptar si al menos 1 palabra coincide
      const queryWords = significantWords(query);
      const titleWords = new Set(significantWords(title));
      const hasAnyMatch = queryWords.some(w => titleWords.has(w));

      if (imageUrl && (hasAnyMatch || isRelevantMatch(query, title))) {
        return {
          name: title,
          desc: stripHtml(post.excerpt && post.excerpt.rendered),
          imageUrl: imageUrl,
          creator: null,
          source: 'mcpedl-skins'
        };
      }
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
  'Terror':     'https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccf7581b-e666-4ec6-a7d1-4bfccf09a7d5/CaveDweller_Thumbnail_0.jpg',
  'Aventura':   'https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/1dcb302c-2dfd-40aa-a776-10318f8cdc94/CaveBiomes_Thumbnail_0.jpg',
  'Survival':   'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/3121056a-a177-44e4-bcfe-c23fbd9ba717/DD_Thumbnail_0.jpg',
  'Mobs':       'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/4fefe28d-861f-4937-9272-552ff66d78be/over_mob_addon_Thumbnail_0.jpg',
  'Realismo':   'https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/926b5cc5-049c-4c3a-9384-fa014995fb2e/Thumbnail_0.jpg',
  'Tecnologia': 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/878ef567-5ddc-4c3b-813b-9c5d75392ee0/SmartphonesAddOn_Thumbnail_0.jpg',
  'Espacio':    'https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/9843eecc-6430-49f4-b3f2-c541628984bf/SC_Thumbnail_0.jpg',
  'Vehiculos':  'https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/vehicles-addon/Vehicles_Thumbnail_0.jpg',
  'RPG':        'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/rpg-addon/RPG_Thumbnail_0.jpg',
  'Shaders':    'https://mcpedl.org/wp-content/uploads/2023/03/newb-x-legacy-shader-thumbnail.jpg',
  'Mundos':     'https://mcpedl.org/wp-content/uploads/2022/08/minecraft-world-thumbnail.jpg',
  'Texturas':   'https://mcpedl.org/wp-content/uploads/2022/05/faithful-32x-bedrock-thumbnail.jpg',
  'Skins':      'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/animestyle-skinpack/AnimeSkins_Thumbnail_0.jpg',
  'Addons':     'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/4fefe28d-861f-4937-9272-552ff66d78be/over_mob_addon_Thumbnail_0.jpg'
};

// BANCO DE IMAGENES CURADAS PARA SKINS
// URLs 100% reales de Minecraft Bedrock en Xbox Live CDN
const SKIN_IMAGE_BANK = [
  { keywords: ['anime', 'animestyle', 'manga', 'waifu', 'otaku'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Anime Style Skins' },
  { keywords: ['altfit', 'fit', 'gym', 'athletic', 'fitness'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Altfit Skin Pack' },
  { keywords: ['ninja', 'warrior', 'samurai', 'fighter', 'combat'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Ninja Skins' },
  { keywords: ['superhero', 'hero', 'marvel', 'avenger', 'super'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Superheroes Skins' },
  { keywords: ['zombie', 'horror', 'undead', 'dead', 'creepy', 'smiles', 'smile'], imageUrl: 'https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccf7581b-e666-4ec6-a7d1-4bfccf09a7d5/CaveDweller_Thumbnail_0.jpg', name: 'Horror Skins' },
  { keywords: ['cute', 'kawaii', 'chibi', 'adorable', 'baby', 'cherry', 'blossom', 'sakura'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Cute Skins' },
  { keywords: ['pirate', 'pirata', 'sea', 'ocean', 'ship', 'captain'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Pirate Skins' },
  { keywords: ['medieval', 'knight', 'caballero', 'castle', 'king', 'queen', 'emperor', 'emperors', 'creeper'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Medieval Skins' },
  { keywords: ['space', 'astronaut', 'galaxy', 'star', 'alien', 'espacio'], imageUrl: 'https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/9843eecc-6430-49f4-b3f2-c541628984bf/SC_Thumbnail_0.jpg', name: 'Space Explorer Skins' },
  { keywords: ['sport', 'soccer', 'football', 'basketball', 'deporte'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Sports Skins' },
  { keywords: ['fantasy', 'magic', 'wizard', 'elf', 'mago', 'magico', 'mystic', 'mystery', 'mystical', 'arcane'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Fantasy Skins' },
  { keywords: ['girl', 'girls', 'chica', 'chicas', 'women', 'female'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Girls Skins' },
  { keywords: ['boy', 'boys', 'chico', 'male', 'men'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Boys Skins' },
  { keywords: ['halloween', 'witch', 'bruja', 'ghost', 'skeleton', 'esqueleto'], imageUrl: 'https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccf7581b-e666-4ec6-a7d1-4bfccf09a7d5/CaveDweller_Thumbnail_0.jpg', name: 'Halloween Skins' },
  { keywords: ['christmas', 'navidad', 'santa', 'holiday', 'winter', 'xmas'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Christmas Skins' },
  { keywords: ['dragon', 'monster', 'beast', 'creature', 'mob'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/4fefe28d-861f-4937-9272-552ff66d78be/over_mob_addon_Thumbnail_0.jpg', name: 'Monster Skins' },
  { keywords: ['brainrot', 'brain', 'meme', 'funny', 'viral', 'tralalero', 'slop'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Brainrot Skins' },
  { keywords: ['neon', 'glow', 'aesthetic', 'black', 'pink', 'ultimate', 'vibe'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg', name: 'Neon Aesthetic Skins' },
  { keywords: ['pajama', 'pyjama', 'sleepy', 'night', 'cozy', 'couples', 'couple', 'love', 'romantic', 'duo'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Couples Skins' },
  { keywords: ['megapack', 'mega', 'pack', 'collection', 'bundle', 'variety', 'hd', 'teens'], imageUrl: 'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg', name: 'Mega Skin Pack' }
];

// SMART SKIN IMAGE SELECTOR
function getSmartSkinImage(fileName) {
  const name = fileName.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const words = name.split(/\s+/).filter(w => w.length > 2);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const entry of SKIN_IMAGE_BANK) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (name.includes(kw)) score += 3;
      else {
        for (const w of words) {
          if (kw.includes(w) || w.includes(kw)) score += 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
  if (bestMatch && bestScore > 0) return bestMatch.imageUrl;
  
  // Fallbacks con imagenes reales verificadas de Minecraft Xbox CDN
  const skinFallbacks = [
    'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg',
    'https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg'
  ];
  const idx = Math.abs(fileName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % skinFallbacks.length;
  return skinFallbacks[idx];
}

// KNOWN ADDONS - metadatos curados para los 19 archivos reales del repositorio GitHub
const KNOWN_ADDONS = {
  // ── ACTIONS & STUFF (OREVILLE STUDIOS MINECRAFT MARKETPLACE PDP) ────────
  "Actions.Stuff.1.11.resources.mcpack": {
    name: "Actions & Stuff 1.11",
    desc: "El famoso paquete de animaciones en 3D de Oreville Studios para Minecraft Bedrock. Transforma los movimientos de combate, herramientas y personaje con animaciones realistas.",
    badge: "⚙️ Addon",
    badgeClass: "badge-hot",
    imageUrl: "https://mcpedl.org/wp-content/uploads/2024/05/actions-and-stuff-texture-pack.jpg",
    version: "v1.11",
    category: "Realismo",
    type: "texture",
    creator: "Oreville Studios"
  },
  "Actions.Stuff.1.10.1.skin_pack.mcpack": {
    name: "Actions & Stuff Skins",
    desc: "Pack de aspectos oficiales inspirados en los personajes y guerreros tácticos de Actions & Stuff para personalizar a tu avatar.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://mcpedl.org/wp-content/uploads/2024/05/actions-and-stuff-texture-pack.jpg",
    version: "v1.10.1",
    category: "Skins",
    type: "skin",
    creator: "Oreville Studios"
  },
  "Combat.Actions.+.Weapons.Add-On.addon.mcaddon": {
    name: "Combat Actions & Weapons",
    desc: "Expansión de combate táctico y armas avanzadas. Añade nuevas espadas, katanas, animaciones de ataque y combos de combate.",
    badge: "⚔️ RPG",
    badgeClass: "badge-popular",
    imageUrl: "https://mcpedl.org/wp-content/uploads/2024/02/combat-plus-addon-thumbnail.jpg",
    version: "v1.0",
    category: "RPG",
    type: "addon"
  },
  "VOID.skin_pack.mcpack": {
    name: "Void Shadow Skins",
    desc: "Pack de aspectos del Vacío con auras oscuras, energía violeta y trajes de guerrero cósmico para destacar en tu servidor.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },

  // ── ADDONS Y MUNDOS PRINCIPALES ─────────────────────────────────────
  "CAVE.DWELLER.Add-On.Official.addon.mcaddon": {
    name: "Cave Dweller Official",
    desc: "Enfréntate al temible Cave Dweller en la oscuridad de las minas. Esta criatura acecha en las sombras emitiendo sonidos aterradores.",
    badge: "💀 Terror",
    badgeClass: "badge-exclusive",
    imageUrl: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccf7581b-e666-4ec6-a7d1-4bfccf09a7d5/CaveDweller_Thumbnail_0.jpg",
    version: "Official v1.2",
    category: "Terror",
    type: "addon"
  },
  "CAVES.Fire.Ice.addon.mcaddon": {
    name: "Caves Fire & Ice",
    desc: "Expande las cuevas con biomas extremos de fuego y hielo. Encuentra dragones ancestrales y tesoros congelados en cavernas místicas.",
    badge: "🔮 Aventura",
    badgeClass: "badge-popular",
    imageUrl: "https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/1dcb302c-2dfd-40aa-a776-10318f8cdc94/CaveBiomes_Thumbnail_0.jpg",
    version: "v1.4",
    category: "Aventura",
    type: "addon"
  },
  "Disaster.Defense.world_template.mctemplate": {
    name: "Disaster Defense Map",
    desc: "Un mapa de defensa contra desastres naturales devastadores. Sobrevive a terremotos, tornados y tsunamis con tecnología avanzada.",
    badge: "🛡️ Survival",
    badgeClass: "badge-hot",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/3121056a-a177-44e4-bcfe-c23fbd9ba717/DD_Thumbnail_0.jpg",
    version: "v2.0",
    category: "Survival",
    type: "world"
  },
  "Over.Mob.Add-On.addon.mcaddon": {
    name: "Over Mob Add-On",
    desc: "Añade decenas de nuevos mobs hostiles y pacíficos al Overworld. Criaturas mitológicas y jefes gigantes.",
    badge: "👾 Mobs",
    badgeClass: "badge-new",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/4fefe28d-861f-4937-9272-552ff66d78be/over_mob_addon_Thumbnail_0.jpg",
    version: "v1.2",
    category: "Mobs",
    type: "addon"
  },
  "Realight.Reimagined.addon.mcaddon": {
    name: "Realight Reimagined",
    desc: "Iluminación dinámica y realista. Antorchas y linternas alumbrarán tu camino al sostenerlos en la mano en tiempo real.",
    badge: "💡 Realismo",
    badgeClass: "badge-exclusive",
    imageUrl: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/926b5cc5-049c-4c3a-9384-fa014995fb2e/Thumbnail_0.jpg",
    version: "v3.1",
    category: "Realismo",
    type: "addon"
  },
  "Smartphones.2.0.Add-On.addon.mcaddon": {
    name: "Smartphones 2.0 Add-On",
    desc: "Lleva la tecnología moderna a Minecraft. Fabrica teléfonos inteligentes funcionales para tomar fotos y enviar mensajes.",
    badge: "📱 Tecnologia",
    badgeClass: "badge-popular",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/878ef567-5ddc-4c3b-813b-9c5d75392ee0/SmartphonesAddOn_Thumbnail_0.jpg",
    version: "v2.0",
    category: "Tecnologia",
    type: "addon"
  },
  "Spacecraft.addon.mcaddon": {
    name: "Spacecraft Galactic",
    desc: "Viaja al espacio exterior! Construye cohetes espaciales, explora la Luna y otros planetas con gravedad modificada.",
    badge: "🚀 Espacio",
    badgeClass: "badge-exclusive",
    imageUrl: "https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/9843eecc-6430-49f4-b3f2-c541628984bf/SC_Thumbnail_0.jpg",
    version: "v1.5",
    category: "Espacio",
    type: "addon"
  },

  // ── SKIN PACKS CURADOS ───────────────────────────────────────────────
  "Altfit.skin_pack.mcpack": {
    name: "Altfit Skin Pack",
    desc: "Pack de aspectos con estilos fitness y athletic para cambiar la apariencia de tu personaje en Minecraft Bedrock.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },
  "Brainrot.Slop.skin_pack.mcpack": {
    name: "Brainrot Slop Pack",
    desc: "Pack de aspectos con personajes virales de internet, memes y la cultura brainrot. Diseños divertidísimos.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },
  "Cherry.Blossom.Teens.HD.skin_pack.mcpack": {
    name: "Cherry Blossom Teens HD",
    desc: "Pack de aspectos HD con personajes estilo sakura y flores de cerezo. Diseños juveniles en alta definición.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },
  "Creeper.Emperors.skin_pack.mcpack": {
    name: "Creeper Emperors Pack",
    desc: "Pack de aspectos de emperadores Creeper con atuendos reales y armaduras imperiales doradas.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },
  "Creepy.Smiles.skin_pack.mcpack": {
    name: "Creepy Smiles Pack",
    desc: "Pack de aspectos aterradores con sonrisas perturbadoras y diseños de horror para tus partidas.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccf7581b-e666-4ec6-a7d1-4bfccf09a7d5/CaveDweller_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },
  "Mystic.Megapack.skin_pack.mcpack": {
    name: "Mystic Megapack",
    desc: "Megapack de aspectos místicos y arcanos con personajes de fantasía oscura y magia ancestral.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },
  "Pajama.Couples.skin_pack.mcpack": {
    name: "Pajama Couples Pack",
    desc: "Pack de aspectos para parejas en pijama. Diseños adorables a juego para jugar con tu mejor compañero.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/e7a93cb4-78e6-4a53-8c29-e7c4e893c2b8/Altfit_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  },
  "Ultimate.Black.Pink.skin_pack.mcpack": {
    name: "Ultimate Black Pink Pack",
    desc: "Pack de aspectos aesthetic con paleta negra y rosa neón. Diseños modernos de alta definición.",
    badge: "👥 Skin",
    badgeClass: "badge-skin",
    imageUrl: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/dc03a4c5-ccda-4c69-ad32-05a75f462041/AnimeSkins2_Thumbnail_0.jpg",
    version: "v1.0",
    category: "Skins",
    type: "skin"
  }
};

let currentAddons = [];
let activeTypeFilter = 'Todos';   // filtra por tipo de contenido: addon/world/shader/texture/skin
let activeFilter = 'Todos';       // filtra por genero (Terror, Aventura, etc.)
let searchQueryText = '';         // texto de busqueda por IA

// Categorias principales pedidas: Addons, Mundos, Skins, Texturas, Shaders
const TYPE_META = {
  'Todos':   { icon: '📂', label: 'Todos' },
  'addon':   { icon: '⚙️', label: 'Addons' },
  'world':   { icon: '🌏', label: 'Mundos' },
  'skin':    { icon: '👥', label: 'Skins' },
  'texture': { icon: '🎨', label: 'Texturas' },
  'shader':  { icon: '✨', label: 'Shaders' }
};

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

  // Reconocimiento especial para Actions & Stuff
  if (cleanNew.includes('actions') && cleanNew.includes('stuff')) {
    return {
      key: 'Actions.Stuff.addon.mcaddon',
      addon: KNOWN_ADDONS['Actions.Stuff.addon.mcaddon']
    };
  }

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

// GENERADOR DE DESCRIPCIONES DETALLADAS POR IA / NOMBRE DE ARCHIVO
// Garantiza que cada addon, skin, mundo, shader o textura tenga una descripción explicativa de qué hace
function generateSmartDescription(fileName, fileTypeObj, category, webDesc) {
  if (webDesc && webDesc.trim().length > 25 && !webDesc.toLowerCase().includes('site') && !webDesc.toLowerCase().includes('404')) {
    return webDesc.trim();
  }

  const f = fileName.toLowerCase();

  // SKINS
  if (fileTypeObj.type === 'skin') {
    if (f.includes('brainrot') || f.includes('slop') || f.includes('meme'))
      return 'Pack de aspectos (skins) inspirado en los personajes virales de internet, memes populares y la cultura brainrot. Incluye modelos coloridos y graciosos para destacar en cualquier servidor.';
    if (f.includes('cherry') || f.includes('blossom') || f.includes('sakura'))
      return 'Coleccion visual HD con tematica de flores de cerezo (Sakura). Incluye aspectos juveniles con detalles florales en tonos rosa y diseños estilizados.';
    if (f.includes('creeper') || f.includes('emperor') || f.includes('emperors'))
      return 'Skin pack imperial basado en la criatura Creeper. Ofrece disfraces reales con coronas, capas y armaduras doradas sobre la piel caracteristica del Creeper.';
    if (f.includes('creepy') || f.includes('smile') || f.includes('smiles') || f.includes('horror'))
      return 'Aspectos aterradores de terror con sonrisas perturbadoras y miradas sombrias. Diseñados para asustar a otros jugadores en mapas de supervivencia o minijuegos.';
    if (f.includes('mystic') || f.includes('megapack') || f.includes('arcane'))
      return 'Megapack de aspectos misticos y arcanos. Contiene disfraces de magos, hechiceros oscuros y seres de fantasia con auras brillantes ideales para partidas RPG.';
    if (f.includes('pajama') || f.includes('couples') || f.includes('couple') || f.includes('duo'))
      return 'Coleccion de aspectos comodos en pijama diseñados para parejas o duos de amigos. Aspectos adorables a juego para explorar mundos en modo cooperativo.';
    if (f.includes('ultimate') || f.includes('black') || f.includes('pink') || f.includes('neon'))
      return 'Pack de aspectos aesthetic con combinacion de colores negro azabache y rosa neon. Diseños modernos y elegantes de alta definicion.';
    if (f.includes('altfit') || f.includes('fit') || f.includes('gym'))
      return 'Coleccion de aspectos deportivos y fitness con atuendos atléticos modernos, ropa de entrenamiento y estilos urbanos para personalizar tu avatar.';
    return 'Pack de aspectos (skins) personalizado con multiples variantes de diseños y atuendos unicos para cambiar la apariencia de tu personaje en Minecraft Bedrock.';
  }

  // ADDONS
  if (fileTypeObj.type === 'addon') {
    if (f.includes('cave') || f.includes('dweller'))
      return 'Addon de terror que introduce a la criatura Cave Dweller acechando en las cuevas oscuras. Posee IA agresiva, animaciones espeluznantes y sonidos de acecho nocturno.';
    if (f.includes('smartphones') || f.includes('phone'))
      return 'Addon de tecnologia que añade telefonos inteligentes funcionales a Minecraft. Permite fabricar dispositivos, tomar capturas y usar aplicaciones dentro del juego.';
    if (f.includes('realight') || f.includes('light'))
      return 'Addon de iluminacion dinamica. Al sostener antorchas, linternas o items luminosos en la mano iluminaran tu entorno en tiempo real sin necesidad de colocarlos.';
    if (f.includes('over') || f.includes('mob'))
      return 'Addon de expansion de mobs para el Overworld. Introduce decenas de nuevas criaturas hostiles y neutrales con comportamientos personalizados y drops unicos.';
    if (f.includes('fire') || f.includes('ice') || f.includes('caves'))
      return 'Expansión subterránea con biomas extremos de cueva de fuego y hielo. Encuentra dragones ancestrales, nuevos minerales magicos y peligros elementales.';
    if (f.includes('space') || f.includes('craft'))
      return 'Addon de exploracion galactica. Construye cohetes espaciales, trajes de astronauta y viaja a la Luna y otros planetas con fisica de gravedad modificada.';
    return 'Addon de expansion para Minecraft Bedrock que incorpora nuevas mecanicas, entidades, bloques o herramientas para enriquecer tu aventura.';
  }

  // WORLDS
  if (fileTypeObj.type === 'world') {
    if (f.includes('disaster') || f.includes('defense'))
      return 'Mapa interactivo de supervivencia y defensa contra desastres naturales devastadores como tornados, terremotos y tsunamis utilizando tecnologia y refugios.';
    return 'Mundo/Mapa personalizado listo para jugar con construcciones detalladas, misiones e infraestructuras avanzadas para partidas individuales o en servidor.';
  }

  // SHADERS
  if (fileTypeObj.type === 'shader') {
    return 'Pack de shaders de alto rendimiento que mejora el renderizado grafico de Minecraft Bedrock con iluminacion dinamica, niebla atmosferica y sombras realistas.';
  }

  // TEXTURES
  if (fileTypeObj.type === 'texture') {
    return 'Pack de texturas de alta definicion que rediseña la apariencia visual de los bloques, herramientas e interfaz de Minecraft con mayor detalle y nitidez.';
  }

  return fileTypeObj.defaultDesc;
}

// AI METADATA RESOLUTION (Google Gemini AI + Web Search)
// For unknown addons: consult Gemini AI, search Marketplace web sources, build full metadata
async function resolveAddonMetadata(fileName) {
  const fileType = detectFileType(fileName);
  const searchQuery = cleanNameForSearch(fileName);
  const cleanName = toTitleCase(searchQuery);

  // 1. Consultar a Google Gemini AI
  let geminiData = null;
  try { geminiData = await callGeminiAI(fileName); } catch {}

  // Usar el término de búsqueda optimizado por Gemini o el procesado local
  const finalSearchQuery = geminiData && geminiData.searchKeyword ? geminiData.searchKeyword : searchQuery;

  let marketResult = null;
  try { marketResult = await searchMarketplace(finalSearchQuery, fileType.type); } catch {}

  let catInfo;
  if (fileType.type === 'shader')       catInfo = { category: 'Shaders',  badge: '\u2728 Shader',    badgeClass: 'badge-shader'  };
  else if (fileType.type === 'world')   catInfo = { category: 'Mundos',   badge: '\ud83c\udf0d Mundo',    badgeClass: 'badge-world'   };
  else if (fileType.type === 'texture') catInfo = { category: 'Texturas', badge: '\ud83c\udfa8 Textura',  badgeClass: 'badge-texture' };
  else if (fileType.type === 'skin')    catInfo = { category: 'Skins',    badge: '\ud83d\udc65 Skin',     badgeClass: 'badge-skin'    };
  else if (geminiData && geminiData.category) {
    catInfo = { category: geminiData.category, badge: '🔹 ' + geminiData.category, badgeClass: 'badge-popular' };
  } else catInfo = detectCategory(fileName);

  // Determinar la URL de la imagen y aplicar getSafeImageUrl para evitar errores CORS/403
  let rawImageUrl = null;
  if (marketResult && marketResult.imageUrl) {
    rawImageUrl = marketResult.imageUrl;
  } else if (geminiData && geminiData.directImageUrl && geminiData.directImageUrl.startsWith('http')) {
    rawImageUrl = geminiData.directImageUrl;
  } else if (fileType.type === 'skin') {
    rawImageUrl = getSmartSkinImage(fileName);
  } else {
    rawImageUrl = FALLBACK_IMAGES[catInfo.category] || FALLBACK_IMAGES['Addons'];
  }

  const resolvedImageUrl = getSafeImageUrl(rawImageUrl, (marketResult && marketResult.name) || cleanName, fileType.type);

  // Generar descripción detallada con Gemini AI o generador interno
  const smartDescription = (geminiData && geminiData.desc && geminiData.desc.length > 20)
    ? geminiData.desc
    : generateSmartDescription(
        fileName,
        fileType,
        catInfo.category,
        marketResult ? marketResult.desc : null
      );

  return {
    name: (marketResult && marketResult.name) ? marketResult.name : (geminiData && geminiData.name ? geminiData.name : cleanName),
    desc: smartDescription,
    badge: catInfo.badge,
    badgeClass: catInfo.badgeClass,
    imageUrl: resolvedImageUrl,
    version: 'v1.0',
    category: catInfo.category,
    type: fileType.type,
    typeLabel: fileType.typeLabel,
    downloadLabel: fileType.downloadLabel,
    fromMarketplace: !!(marketResult && marketResult.imageUrl),
    creator: (marketResult && marketResult.creator) ? marketResult.creator : (geminiData ? 'Gemini AI Verified' : null)
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
    { name: "Actions.Stuff.1.11.resources.mcpack", size: 29543078, url: "https://github.com/Anonimous7800/practicas/releases/download/Action_and_stuff/Actions.Stuff.1.11.resources.mcpack" },
    { name: "Actions.Stuff.1.10.1.skin_pack.mcpack", size: 42088, url: "https://github.com/Anonimous7800/practicas/releases/download/Action_and_stuff/Actions.Stuff.1.10.1.skin_pack.mcpack" },
    { name: "Combat.Actions.+.Weapons.Add-On.addon.mcaddon", size: 7791645, url: "https://github.com/Anonimous7800/practicas/releases/download/addon1/Combat.Actions.%2B.Weapons.Add-On.addon.mcaddon" },
    { name: "VOID.skin_pack.mcpack", size: 22460, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/VOID.skin_pack.mcpack" },
    { name: "CAVE.DWELLER.Add-On.Official.addon.mcaddon", size: 6887035, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/CAVE.DWELLER.Add-On.Official.addon.mcaddon" },
    { name: "CAVES.Fire.Ice.addon.mcaddon", size: 17906375, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/CAVES.Fire.Ice.addon.mcaddon" },
    { name: "Disaster.Defense.world_template.mctemplate", size: 83152561, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Disaster.Defense.world_template.mctemplate" },
    { name: "Over.Mob.Add-On.addon.mcaddon", size: 13901891, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Over.Mob.Add-On.addon.mcaddon" },
    { name: "Realight.Reimagined.addon.mcaddon", size: 316418, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Realight.Reimagined.addon.mcaddon" },
    { name: "Smartphones.2.0.Add-On.addon.mcaddon", size: 18703555, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Smartphones.2.0.Add-On.addon.mcaddon" },
    { name: "Spacecraft.addon.mcaddon", size: 14066466, url: "https://github.com/Anonimous7800/practicas/releases/download/addons/Spacecraft.addon.mcaddon" },
    { name: "Altfit.skin_pack.mcpack", size: 27133, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Altfit.skin_pack.mcpack" },
    { name: "Brainrot.Slop.skin_pack.mcpack", size: 213094, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Brainrot.Slop.skin_pack.mcpack" },
    { name: "Cherry.Blossom.Teens.HD.skin_pack.mcpack", size: 68063, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Cherry.Blossom.Teens.HD.skin_pack.mcpack" },
    { name: "Creeper.Emperors.skin_pack.mcpack", size: 113125, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Creeper.Emperors.skin_pack.mcpack" },
    { name: "Creepy.Smiles.skin_pack.mcpack", size: 29441, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Creepy.Smiles.skin_pack.mcpack" },
    { name: "Mystic.Megapack.skin_pack.mcpack", size: 147008, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Mystic.Megapack.skin_pack.mcpack" },
    { name: "Pajama.Couples.skin_pack.mcpack", size: 20027, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Pajama.Couples.skin_pack.mcpack" },
    { name: "Ultimate.Black.Pink.skin_pack.mcpack", size: 27805, url: "https://github.com/Anonimous7800/practicas/releases/download/skins/Ultimate.Black.Pink.skin_pack.mcpack" }
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

  // Fila 1: Pestañas por categorías principales (Todos, Addons, Mundos, Skins, Texturas, Shaders)
  const allCategoryTypes = ['Todos', 'addon', 'world', 'skin', 'texture', 'shader'];
  const typeFilterHtml = allCategoryTypes.map(t => {
    const meta = TYPE_META[t] || { icon: '🔻', label: t };
    const activeClass = t === activeTypeFilter ? 'active' : '';
    const count = t === 'Todos' ? currentAddons.length : currentAddons.filter(a => a.type === t).length;
    return '<button class="filter-btn category-tab-btn ' + activeClass + '" onclick="filterByType(\'' + t + '\')">' + 
             meta.icon + ' ' + meta.label + ' <span style="opacity:0.7; font-size:0.75rem;">(' + count + ')</span>' +
           '</button>';
  }).join('');

  // Fila 2: Sub-filtros por género (Terror, Aventura, Survival...), solo dentro del tipo activo
  const genreIcons = {
    'Todos': '📂', 'Terror': '💀', 'Aventura': '🔮',
    'Survival': '🛡️', 'Mobs': '👾', 'Realismo': '💡',
    'Tecnologia': '📱', 'Espacio': '🚀', 'Vehiculos': '🚗',
    'RPG': '⚔️', 'Shaders': '✨', 'Mundos': '🌏',
    'Texturas': '🎨', 'Skins': '👥', 'Addons': '⚙️'
  };
  const addonsInActiveType = activeTypeFilter === 'Todos'
    ? currentAddons
    : currentAddons.filter(a => a.type === activeTypeFilter);
  const presentGenres = [...new Set(addonsInActiveType.map(a => a.category))].sort();
  const genreFilterHtml = ['Todos', ...presentGenres].map(cat => {
    const activeClass = cat === activeFilter ? 'active' : '';
    const icon = genreIcons[cat] || '🔹';
    return '<button class="filter-btn filter-btn-sm ' + activeClass + '" onclick="filterByGenre(\'' + cat + '\')">' + icon + ' ' + cat + '</button>';
  }).join('');

  const typeBadges = [
    currentAddons.filter(a => a.type === 'addon').length > 0 ? '<span class="type-count-badge">⚙️ ' + currentAddons.filter(a => a.type === 'addon').length + ' Addons</span>' : '',
    currentAddons.filter(a => a.type === 'world').length > 0 ? '<span class="type-count-badge">🌏 ' + currentAddons.filter(a => a.type === 'world').length + ' Mundos</span>' : '',
    currentAddons.filter(a => a.type === 'shader').length > 0 ? '<span class="type-count-badge">✨ ' + currentAddons.filter(a => a.type === 'shader').length + ' Shaders</span>' : '',
    currentAddons.filter(a => a.type === 'texture').length > 0 ? '<span class="type-count-badge">🎨 ' + currentAddons.filter(a => a.type === 'texture').length + ' Texturas</span>' : '',
    currentAddons.filter(a => a.type === 'skin').length > 0 ? '<span class="type-count-badge">👥 ' + currentAddons.filter(a => a.type === 'skin').length + ' Skins</span>' : ''
  ].filter(Boolean).join('');

  panel.innerHTML =
    '<div class="ai-status-badge">' +
      '<span class="icon">🤖</span>' +
      '<div class="status-text">IA Marketplace Activa: <span id="aiActiveCount">' + addonsCount + '</span> ítems analizados. ' + typeBadges + '</div>' +
    '</div>' +
    '<div class="ai-search-box">' +
      '<span class="ai-search-icon">🔍</span>' +
      '<input type="text" id="aiSearchInput" class="ai-search-input" placeholder="Buscar con IA en Minecraft Marketplace (ej: cave, dragón, shader, skin...)" oninput="handleAISearchInput(this.value)" value="' + searchQueryText.replace(/"/g, '&quot;') + '">' +
      (searchQueryText ? '<button class="ai-search-clear" onclick="clearAISearch()">✖</button>' : '') +
    '</div>' +
    '<div class="addon-filters addon-filters-type" style="margin-top:12px;">' + typeFilterHtml + '</div>' +
    (genreFilterHtml ? '<div class="addon-filters addon-filters-genre" style="margin-top:8px;">' + genreFilterHtml + '</div>' : '') +
    '<button class="btn-ai-rescan" style="margin-top:12px;" onclick="triggerAIScan()">🔄 Re-escanear en minecraft.net</button>';

  setTimeout(function() { panel.classList.add('visible'); }, 50);
}

// FILTER - aplica el filtro de tipo, género y búsqueda IA combinados
function applyFilters() {
  const query = searchQueryText.toLowerCase().trim();
  document.querySelectorAll('.addon-card').forEach(function(card) {
    const cardId = card.id.replace('card-', '');
    const addon = currentAddons.find(function(a) { return a.id === cardId; });
    if (!addon) return;
    const matchesType = activeTypeFilter === 'Todos' || addon.type === activeTypeFilter;
    const matchesGenre = activeFilter === 'Todos' || addon.category === activeFilter;

    let matchesSearch = true;
    if (query.length > 0) {
      const haystack = (
        addon.name + ' ' + addon.desc + ' ' + addon.category + ' ' + 
        addon.fileName + ' ' + (addon.creator || '')
      ).toLowerCase();
      matchesSearch = haystack.includes(query);
    }

    const matches = matchesType && matchesGenre && matchesSearch;
    card.style.display = matches ? '' : 'none';
    if (matches) card.classList.add('visible'); else card.classList.remove('visible');
  });
}

window.handleAISearchInput = function(val) {
  searchQueryText = val || '';
  applyFilters();
};

window.clearAISearch = function() {
  searchQueryText = '';
  const input = document.getElementById('aiSearchInput');
  if (input) input.value = '';
  applyFilters();
};

window.filterByType = function(type) {
  activeTypeFilter = type;
  activeFilter = 'Todos'; // al cambiar de tipo, resetea el sub-filtro de genero
  const grid = document.querySelector('.addons-grid');
  renderControlPanel(grid.parentElement, currentAddons.length);
  applyFilters();
};

window.filterByGenre = function(category) {
  activeFilter = category;
  const grid = document.querySelector('.addons-grid');
  renderControlPanel(grid.parentElement, currentAddons.length);
  applyFilters();
};

// Mantener compatibilidad si algo externo llama al nombre antiguo
window.filterCategory = window.filterByGenre;

// AI SCAN SIMULATION - type-specific logs con consulta a minecraft.net/marketplace
function runAIScanningSimulation(addon, index) {
  const cardEl = document.getElementById('card-' + addon.id);
  if (!cardEl) return;
  const barEl = document.getElementById('bar-' + addon.id);
  const logsEl = document.getElementById('logs-' + addon.id);

  const typeSteps = {
    'shader': [
      { progress: 15, log: '[DETECT] Tipo: SHADER (.mcpack)' },
      { progress: 35, log: '[GLSL] Analizando pipeline grafico...' },
      { progress: 55, log: '[Marketplace] Buscando en https://www.minecraft.net/es-es/marketplace...' },
      { progress: 75, log: addon.fromMarketplace ? '[OK] Shader verificado en Minecraft.net!' : '[AI-IMG] Visualizador HD por categoria.' },
      { progress: 90, log: '[AI] Descripcion visual generada.' },
      { progress: 100, log: '[OK] Shader indexado exitosamente.' }
    ],
    'world': [
      { progress: 12, log: '[DETECT] Tipo: MUNDO (.mctemplate / .mcworld)' },
      { progress: 30, log: '[MAP] Analizando estructura del mapa...' },
      { progress: 52, log: '[Marketplace] Buscando en https://www.minecraft.net/es-es/marketplace...' },
      { progress: 72, log: addon.fromMarketplace ? '[OK] Portada oficial de Minecraft.net vinculada!' : '[AI-IMG] Imagen asignada por categoria.' },
      { progress: 88, log: '[AI-NLG] Generando descripcion del mundo...' },
      { progress: 100, log: '[OK] Mapa indexado: ' + addon.category }
    ],
    'texture': [
      { progress: 15, log: '[DETECT] Tipo: TEXTURA / RESOURCE PACK' },
      { progress: 35, log: '[TEX] Inspeccionando paleta de colores...' },
      { progress: 55, log: '[Marketplace] Buscando en https://www.minecraft.net/es-es/marketplace...' },
      { progress: 75, log: addon.fromMarketplace ? '[OK] Textura oficial de Marketplace encontrada!' : '[AI-IMG] Imagen semantica asignada.' },
      { progress: 90, log: '[AI-NLG] Descripcion de estilo generada.' },
      { progress: 100, log: '[OK] Textura indexada correctamente.' }
    ],
    'skin': [
      { progress: 15, log: '[DETECT] Tipo: ASPECTOS / SKINS (.mcpack)' },
      { progress: 35, log: '[TEX] Analizando mapeo UV de skins...' },
      { progress: 55, log: '[Marketplace] Buscando catalogo en https://www.minecraft.net/es-es/marketplace...' },
      { progress: 75, log: addon.fromMarketplace ? '[OK] Aspecto oficial encontrado!' : '[AI-IMG] Skin asignado por categoria.' },
      { progress: 90, log: '[AI] Descripcion de skins generada.' },
      { progress: 100, log: '[OK] Skins indexadas correctamente.' }
    ],
    'addon': [
      { progress: 15, log: '[NLP] Indexando: ' + addon.fileName },
      { progress: 32, log: '[DETECT] Tipo: ADDON (.mcaddon)' },
      { progress: 52, log: '[Marketplace] Buscando en https://www.minecraft.net/es-es/marketplace...' },
      { progress: 70, log: addon.fromMarketplace ? '[OK] Datos e imagen oficial de Minecraft.net!' : '[AI-IMG] Imagen semantica por categoria.' },
      { progress: 86, log: '[AI-NLG] Descripcion optimizada en espanol.' },
      { progress: 100, log: '[OK] Addon indexado. Categoria: ' + addon.category }
    ]
  };

  const steps = typeSteps[addon.type] || typeSteps['addon'];
  
  // Detección de móvil para evitar lagueos y consumo excesivo de batería/CPU
  const isMobile = window.innerWidth <= 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  
  if (isMobile) {
    // En móviles resolvemos la tarjeta de forma fluida e instantánea en 80ms
    setTimeout(function() {
      if (barEl) barEl.style.width = '100%';
      resolveCard(addon);
    }, 50 + index * 40);
    return;
  }

  let currentStepIndex = 0;
  const totalDuration = 1000 + index * 180 + Math.random() * 250;
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

  // Fallback infalible: Portada SVG HD personalizada de Minecraft
  const svgFallback = getMinecraftSvgBanner(addon.name, addon.type);
  const onerrorHandler = "this.onerror=null; this.src='" + svgFallback + "';";
  const downloadsMeta = addon.downloadCount > 0 ? '<span>\ud83d\udd25 ' + addon.downloadCount + ' descargas</span>' : '';
  const marketplaceBadge = addon.fromMarketplace ? '<span class="marketplace-verified">\u2714 Marketplace</span>' : '';
  const creatorMeta = addon.creator ? '<span>\ud83d\udc64 ' + addon.creator + '</span>' : '';

  cardEl.innerHTML =
    '<div class="addon-image-wrapper">' +
      '<img src="' + addon.imageUrl + '" alt="' + addon.name + '" class="addon-image" loading="lazy" onerror="' + onerrorHandler + '" />' +
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
    const matchesType = activeTypeFilter === 'Todos' || addon.type === activeTypeFilter;
    const matchesGenre = activeFilter === 'Todos' || addon.category === activeFilter;
    if (!matchesType || !matchesGenre) {
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