/**
 * Client Profile Shortcut Card
 * Injecte un cadre profil cliquable dans la sidebar des pages client.
 */
(function () {
  const STYLE_ID = 'client-profile-shortcut-style';
  const CARD_ID = 'clientProfileShortcutCard';

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getInitials(name) {
    const clean = String(name || '').trim();
    if (!clean) return 'CL';
    const parts = clean.split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join('');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .client-profile-shortcut {
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid #dbeafe;
        background: linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(37, 99, 235, 0.08));
        border-radius: 12px;
        padding: 10px;
        text-decoration: none;
        color: #0f172a;
        transition: transform .2s ease, box-shadow .2s ease;
      }
      .client-profile-shortcut:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
      }
      .client-profile-shortcut-avatar {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        overflow: hidden;
        flex: 0 0 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #0f766e;
        color: #fff;
        font-size: 0.74rem;
        font-weight: 700;
      }
      .client-profile-shortcut-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .client-profile-shortcut-meta {
        min-width: 0;
      }
      .client-profile-shortcut-title {
        margin: 0;
        font-size: 0.75rem;
        color: #334155;
      }
      .client-profile-shortcut-name {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    document.head.appendChild(style);
  }

  async function renderCard() {
    try {
      if (!window.clientAuthService?.isAuthenticated?.()) return;

      const logoutBtn = document.getElementById('logoutBtn');
      if (!logoutBtn || !logoutBtn.parentElement) return;

      injectStyle();

      const existing = document.getElementById(CARD_ID);
      if (existing) existing.remove();

      let profile = null;
      try {
        profile = await window.clientDataService?.getProfile?.();
      } catch (error) {
        console.warn('Profile shortcut: failed to load profile', error);
      }

      const name = profile?.name || 'Client';
      const photoUrl = profile?.photo_url || profile?.avatar || profile?.avatar_url || '';

      const card = document.createElement('a');
      card.id = CARD_ID;
      card.href = './profile.html';
      card.className = 'client-profile-shortcut';
      card.innerHTML = `
        <div class="client-profile-shortcut-avatar">
          ${photoUrl
            ? `<img src="${escapeHtml(photoUrl)}" alt="Photo profil">`
            : `<span>${escapeHtml(getInitials(name))}</span>`}
        </div>
        <div class="client-profile-shortcut-meta">
          <p class="client-profile-shortcut-title">Profil client</p>
          <p class="client-profile-shortcut-name">${escapeHtml(name)}</p>
        </div>
      `;

      logoutBtn.parentElement.insertBefore(card, logoutBtn);
    } catch (error) {
      console.warn('Profile shortcut: render error', error);
    }
  }

  document.addEventListener('DOMContentLoaded', renderCard);
  window.refreshClientProfileShortcut = renderCard;
})();
