/* =============================================
   ADDONS.JS - Dynamic rendering of addons
   ============================================= */

function renderAddonItems() {
  const grid = document.querySelector('.addons-grid');
  if (!grid || typeof ADDON_ITEMS === 'undefined') return;

  if (ADDON_ITEMS.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
        <div style="font-size:4rem; margin-bottom:16px;">🔮</div>
        <h3 style="font-family:'Cinzel',serif; font-size:1.3rem; margin-bottom:12px; color:var(--text-primary);">Próximamente</h3>
        <p style="color:var(--text-muted); font-size:0.9rem; max-width:420px; margin:0 auto 24px;">
          Los addons se estarán subiendo en breve. Únete a Discord para recibirlos primero.
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

  grid.innerHTML = ADDON_ITEMS.map((item, index) => {
    const delay = index % 4 === 0 ? '' : `reveal-delay-${index % 4}`;
    const badgeHtml = item.badge ? `<div class="addon-badge badge ${item.badgeClass}">${item.badge}</div>` : '';
    const metaVersion = item.version ? `<span>📦 ${item.version}</span>` : '';
    const metaSize    = item.size    ? `<span>💾 ${item.size}</span>` : '';

    // Detect direct CDN download link
    const isDirect = item.downloadUrl &&
      (item.downloadUrl.includes('cdn.discordapp.com') ||
       item.downloadUrl.includes('media.discordapp.net') ||
       item.downloadUrl.includes('/attachments/'));
    
    const btnText  = isDirect ? '📥 Descargar Addon' : '💬 Ver en Discord';
    const btnClass = isDirect ? 'btn btn-primary btn-sm w-full mt-16' : 'btn btn-secondary btn-sm w-full mt-16';

    return `
      <div class="addon-card card reveal ${delay}">
        ${badgeHtml}
        <div class="addon-icon">${item.icon}</div>
        <h3 class="addon-title">${item.name}</h3>
        <p class="addon-desc">${item.desc}</p>
        <div class="addon-meta" style="flex-wrap:wrap; gap:8px;">
          ${metaVersion}
          ${metaSize}
        </div>
        <a href="${item.downloadUrl}" target="_blank" class="${btnClass}">
          ${btnText}
        </a>
      </div>
    `;
  }).join('');

  setTimeout(() => {
    document.querySelectorAll('.addon-card.reveal').forEach(el => el.classList.add('visible'));
  }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  renderAddonItems();
});

