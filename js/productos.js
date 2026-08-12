/* =============================================
   PRODUCTOS Y CANJES
   Este archivo centraliza todos los productos de la tienda y los items de canje.
   ¡Solo tienes que editar este archivo para añadir, quitar o modificar items!
   ============================================= */

const STORE_ITEMS = [
  // ══════ KITS ══════
  {
    id: 'kit-guerrero',
    cat: 'kits',
    name: 'Kit Guerrero',
    desc: 'Equipo de combate básico con espada de hierro encantada y armadura completa.',
    icon: '⚔️',
    price: 2.99,
    originalPrice: 4.99,
    banner: 'banner-purple',
    badge: 'HOT',
    features: [
      'Espada de Hierro (Sharp III)',
      'Armadura Hierro (Prot II)',
      '32x Flechas',
      '5x Pociones de Curación'
    ]
  },
  {
    id: 'kit-titan',
    cat: 'kits',
    name: 'Kit Titan',
    desc: 'El kit más poderoso del servidor. Armadura de diamante completa con encantamientos supremos.',
    icon: '👑',
    price: 9.99,
    originalPrice: 14.99,
    banner: 'banner-gold',
    badge: 'POPULAR',
    features: [
      'Espada Diamante (Sharp V, Fire Asp. II)',
      'Armadura Diamante (Prot IV, Unbreaking III)',
      'Arco (Power V, Infinity)',
      'Totem de Inmortalidad x2',
      'Pociones Variadas x16'
    ]
  },
  {
    id: 'kit-arquero',
    cat: 'kits',
    name: 'Kit Arquero',
    desc: 'Especializado en combate a distancia. Arco definitivo con flechas especiales.',
    icon: '🏹',
    price: 3.99,
    banner: 'banner-green',
    features: [
      'Arco (Power IV, Punch II, Flame)',
      '64x Flechas Spectral',
      'Armadura Cuero Encantada',
      'Botas (Depth Strider III, Feather Fall)'
    ]
  },
  {
    id: 'kit-mago',
    cat: 'kits',
    name: 'Kit Mago',
    desc: 'Domina la magia del servidor con pociones poderosas y encantamientos arcanos.',
    icon: '🔮',
    price: 4.99,
    originalPrice: 6.99,
    banner: 'banner-pink',
    badge: 'NUEVO',
    features: [
      'Bastón Arcano (exclusivo)',
      '16x Pociones de Velocidad IV',
      '16x Pociones de Fuerza II',
      'Armadura Especial de Mago'
    ]
  },

  // ══════ RANGOS ══════
  {
    id: 'rango-noble',
    cat: 'rangos',
    name: 'Rango Noble',
    desc: 'Tu primer paso hacia el poder. Prefijo [Noble] y beneficios básicos.',
    icon: '💙',
    price: 4.99,
    banner: 'banner-blue',
    features: [
      'Prefijo [Noble] en el chat',
      '2 hogares adicionales',
      'Kit Noble cada 24h',
      'Color de nombre azul'
    ]
  },
  {
    id: 'rango-elite',
    cat: 'rangos',
    name: 'Rango Élite',
    desc: 'El rango más elegido. Comandos especiales y acceso a áreas exclusivas.',
    icon: '💜',
    price: 8.99,
    originalPrice: 12.99,
    banner: 'banner-purple',
    badge: 'HOT',
    features: [
      'Prefijo [Élite] animado',
      '5 hogares adicionales',
      'Kit Élite cada 12h',
      'Volar en spawn',
      'Acceso a áreas VIP'
    ]
  },
  {
    id: 'rango-leyenda',
    cat: 'rangos',
    name: 'Rango Leyenda',
    desc: 'El rango definitivo. Todos los privilegios del servidor más ventajas únicas.',
    icon: '🔱',
    price: 17.99,
    originalPrice: 24.99,
    banner: 'banner-fire',
    badge: 'EXCLUSIVO',
    features: [
      'Prefijo [Leyenda] con partículas',
      '10 hogares + /back',
      'Kit Leyenda cada 6h',
      'Volar en todo el mundo',
      'Mascota exclusiva',
      'Acceso a servidor privado'
    ]
  },

  // ══════ MASCOTAS ══════
  {
    id: 'mascota-dragon',
    cat: 'mascotas',
    name: 'Dragón de Fuego',
    desc: 'Un bebé dragón que lanza partículas de fuego mientras te sigue. ¡El más impresionante!',
    icon: '🐉',
    price: 5.99,
    originalPrice: 7.99,
    banner: 'banner-fire',
    badge: 'HOT',
    features: [
      'Modelo 3D exclusivo',
      'Partículas de fuego animadas',
      'Efecto de calor al caminar',
      'Sonido de rugido especial'
    ]
  },
  {
    id: 'mascota-lobo',
    cat: 'mascotas',
    name: 'Lobo Sombra',
    desc: 'Un lobo oscuro con ojos brillantes y aura de sombras. Protector eterno de tu lado.',
    icon: '🐺',
    price: 8.99,
    banner: 'banner-purple',
    badge: 'RARO',
    features: [
      'Modelo lobo personalizado',
      'Aura de sombras animada',
      'Ruge cuando atacas',
      'Solo 50 disponibles'
    ]
  },

  // ══════ ESPECIALES ══════
  {
    id: 'pack-starter',
    cat: 'especiales',
    name: 'Pack Titan Starter',
    desc: 'El paquete perfecto para comenzar. Incluye kit, rango Noble y una mascota a elegir.',
    icon: '⚡',
    price: 12.99,
    originalPrice: 19.99,
    banner: 'banner-gold',
    badge: 'MEJOR VALOR',
    features: [
      'Kit Guerrero + Kit Arquero',
      'Rango Noble (permanente)',
      'Mascota a elegir (1)',
      '$10,000 en economía'
    ]
  },
  {
    id: 'caja-mist',
    cat: 'especiales',
    name: 'Caja Misteriosa',
    desc: '¡Sorpresa! Contiene items aleatorios épicos, desde kits hasta rangos exclusivos.',
    icon: '🎁',
    price: 2.99,
    banner: 'banner-fire',
    features: [
      'Item aleatorio de alta rareza',
      '10% chance de Rango Leyenda',
      '30% chance de Kit Titan',
      'Siempre trae algo valioso'
    ]
  }
];


const REDEEM_ITEMS = [
  // ══════ MASCOTAS ══════
  { id:'r-pet-fox',   cat:'mascotas', icon:'🦊', name:'Mascota Zorro',     desc:'Un adorable zorro que te sigue con partículas de corazones.',      cost:200,  banner:'banner-fire',   badge:null },
  { id:'r-pet-cat',   cat:'mascotas', icon:'🐱', name:'Mascota Gato',      desc:'Gato del servidor con collar brillante y maullidos especiales.',    cost:150,  banner:'banner-pink',   badge:'Cute' },
  { id:'r-pet-owl',   cat:'mascotas', icon:'🦉', name:'Búho Sabio',        desc:'Búho que emite sabiduría y partículas de estrellas.',               cost:350,  banner:'banner-dark',   badge:'Raro' },
  { id:'r-pet-baby-dragon', cat:'mascotas', icon:'🐲', name:'Dragón Bebé', desc:'Pequeño dragón púrpura que suelta chispas al caminar.',             cost:500,  banner:'banner-purple', badge:'Épico' },

  // ══════ EFECTOS ══════
  { id:'r-fx-hearts', cat:'efectos', icon:'💗', name:'Trail Corazones',    desc:'Deja un rastro de corazones brillantes al moverte.',                cost:100,  banner:'banner-pink',   badge:null },
  { id:'r-fx-fire',   cat:'efectos', icon:'🔥', name:'Trail de Fuego',     desc:'Partículas de fuego épico al caminar por el servidor.',             cost:150,  banner:'banner-fire',   badge:'Hot' },
  { id:'r-fx-stars',  cat:'efectos', icon:'⭐', name:'Trail Estrellas',    desc:'Estrellas doradas que caen a tu paso.',                             cost:200,  banner:'banner-gold',   badge:null },
  { id:'r-fx-aura',   cat:'efectos', icon:'✨', name:'Aura Mística',       desc:'Aura de partículas moradas que te rodean constantemente.',          cost:300,  banner:'banner-purple', badge:'Épico' },
  { id:'r-fx-light',  cat:'efectos', icon:'🌟', name:'Efecto Relámpago',   desc:'Rayos de electricidad azul al saltar o atacar.',                    cost:400,  banner:'banner-cyan',   badge:'Raro' },

  // ══════ TITULOS ══════
  { id:'r-tit-novice', cat:'titulos', icon:'📜', name:'Título: Novato',     desc:'Prefijo [Novato] en el chat del servidor.',                         cost:50,   banner:'banner-dark',   badge:null },
  { id:'r-tit-hero',   cat:'titulos', icon:'🦸', name:'Título: Héroe',      desc:'Prefijo [Héroe] con color especial en el chat.',                    cost:200,  banner:'banner-blue',   badge:null },
  { id:'r-tit-legend', cat:'titulos', icon:'🌟', name:'Título: Leyenda',    desc:'El título más codiciado. [Leyenda] con brillo dorado.',             cost:800,  banner:'banner-gold',   badge:'Raro' },
  { id:'r-tit-titan',  cat:'titulos', icon:'🔱', name:'Título: Titán',      desc:'[Titán] exclusivo para los más dedicados. Solo 20 disponibles.',   cost:2000, banner:'banner-purple', badge:'Épico' },

  // ══════ KITS ══════
  { id:'r-kit-wood',  cat:'kits', icon:'🪵', name:'Kit Madera',            desc:'Kit básico de herramientas de madera para comenzar.',               cost:50,   banner:'banner-dark',   badge:null },
  { id:'r-kit-stone', cat:'kits', icon:'🪨', name:'Kit Piedra',            desc:'Herramientas y armadura de piedra completa.',                       cost:150,  banner:'banner-dark',   badge:null },
  { id:'r-kit-iron',  cat:'kits', icon:'⚔️', name:'Kit Hierro',            desc:'Equipo de hierro completo con encantamientos básicos.',             cost:300,  banner:'banner-blue',   badge:null },
  { id:'r-kit-food',  cat:'kits', icon:'🍖', name:'Kit Comida',            desc:'64 unidades de comida variada y pociones de regeneración.',         cost:80,   banner:'banner-green',  badge:null },

  // ══════ ESPECIAL ══════
  { id:'r-sp-chest',  cat:'especial', icon:'📦', name:'Cofre Misterioso',  desc:'Cofre con item aleatorio de rareza épica o legendaria.',            cost:600,  banner:'banner-fire',   badge:'Especial' },
  { id:'r-sp-role',   cat:'especial', icon:'💬', name:'Rol Discord',        desc:'Rol especial en el servidor de Discord de Titan Community.',        cost:500,  banner:'banner-purple', badge:'Discord' },
  { id:'r-sp-coins',  cat:'especial', icon:'💰', name:'500 Monedas',        desc:'$500 monedas del servidor para gastar en la economía interna.',     cost:400,  banner:'banner-gold',   badge:null },
  { id:'r-sp-reset',  cat:'especial', icon:'🏳️', name:'Reset de Cooldowns', desc:'Restablece todos los cooldowns de kits y comandos al instante.',   cost:700,  banner:'banner-cyan',   badge:'Útil' }
];

/* =============================================
   ADDONS - Agrega tus addons aquí
   =============================================
   Para agregar un addon:
   1. Ve a tu canal de Discord #descarga-addons
   2. Sube el archivo (.mcpack / .mcaddon)
   3. Haz clic derecho en el archivo subido → "Copiar enlace"
      El enlace se verá así:
      https://cdn.discordapp.com/attachments/CANAL/ARCHIVO/nombre.mcpack
   4. Pégalo en 'downloadUrl' abajo

   Campos disponibles:
     id          → Identificador único (sin espacios)
     name        → Nombre del addon
     desc        → Descripción corta
     icon        → Emoji representativo
     version     → Versión (ej: 'v1.2')
     size        → Tamaño del archivo (ej: '4.2 MB')
     badge       → Etiqueta visible (ej: '🔥 Popular')
     badgeClass  → Estilo: 'badge-hot', 'badge-new', 'badge-popular', 'badge-exclusive'
     downloadUrl → Enlace directo del archivo desde Discord CDN
   ============================================= */

const ADDON_ITEMS = [
  // Ejemplo (borra esto y pon tus addons reales):
  // {
  //   id: 'mi-addon',
  //   name: 'Mi Addon',
  //   desc: 'Descripción de mi addon.',
  //   icon: '⚔️',
  //   version: 'v1.0',
  //   size: '2.5 MB',
  //   badge: '🔥 Popular',
  //   badgeClass: 'badge-hot',
  //   downloadUrl: 'https://cdn.discordapp.com/attachments/.../mi-addon.mcpack'
  // },
];
