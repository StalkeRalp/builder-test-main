(function () {
  const STORAGE_PREFIX = 'ux_productivity_suite_v1';

  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function priorityRank(priority) {
    const p = String(priority || '').toLowerCase();
    if (p === 'urgent') return 0;
    if (p === 'high') return 1;
    if (p === 'deadline') return 2;
    if (p === 'warning') return 3;
    if (p === 'medium') return 4;
    if (p === 'low') return 5;
    return 6;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createStylesOnce() {
    if (document.getElementById('ux-productivity-suite-style')) return;
    const style = document.createElement('style');
    style.id = 'ux-productivity-suite-style';
    style.textContent = `
      .ux-bell-btn { position: relative; overflow: visible; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #334155; }
      .ux-bell-badge { position: absolute; top: -8px; right: -8px; min-width: 20px; height: 20px; border-radius: 999px; background: #dc2626; color: #fff; font-size: 11px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; border: 2px solid #fff; box-shadow: 0 8px 18px rgba(15,23,42,.24); display: inline-flex; align-items: center; justify-content: center; padding: 0 5px; z-index: 3; pointer-events: none; }
      .ux-panel { position: fixed; top: 72px; right: 24px; width: min(420px, calc(100vw - 24px)); max-height: 70vh; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; box-shadow: 0 16px 38px rgba(15,23,42,.16); z-index: 1200; display: none; }
      .ux-panel.open { display: block; }
      .ux-panel-head { padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .ux-panel-title { margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; }
      .ux-panel-actions { display: inline-flex; gap: 6px; }
      .ux-mini-btn { border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 6px 8px; font-size: 12px; font-weight: 700; cursor: pointer; color: #334155; }
      .ux-filter-row { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 6px; flex-wrap: wrap; }
      .ux-chip { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #475569; cursor: pointer; }
      .ux-chip.active { border-color: #0d9488; background: #ccfbf1; color: #0f766e; }
      .ux-panel-list { overflow: auto; max-height: calc(70vh - 96px); padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
      .ux-note { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 10px; text-decoration: none; color: inherit; display: block; }
      .ux-note.unread { border-left: 4px solid #0d9488; background: #f8fffd; }
      .ux-note-title { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }
      .ux-note-meta { margin-top: 4px; font-size: 12px; color: #64748b; }
      .ux-note-tags { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
      .ux-tag { font-size: 11px; border-radius: 999px; background: #eef2ff; color: #4338ca; padding: 2px 8px; font-weight: 700; }
      .ux-inbox-list { display: flex; flex-direction: column; gap: 10px; }
      .ux-inbox-item { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-decoration: none; color: inherit; background: #fff; display: block; }
      .ux-inbox-title { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }
      .ux-inbox-sub { margin-top: 4px; font-size: 12px; color: #64748b; }
      .ux-empty { border: 1px dashed #cbd5e1; border-radius: 10px; text-align: center; padding: 14px; color: #64748b; font-size: 12px; }
      .ux-cmd-overlay { position: fixed; inset: 0; z-index: 1300; background: rgba(15,23,42,.45); backdrop-filter: blur(2px); display: none; align-items: flex-start; justify-content: center; padding-top: 12vh; }
      .ux-cmd-overlay.open { display: flex; }
      .ux-cmd-card { width: min(760px, calc(100vw - 24px)); background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 44px rgba(15,23,42,.26); }
      .ux-cmd-input { width: 100%; border: 0; border-bottom: 1px solid #e2e8f0; padding: 14px; font-size: 14px; outline: none; }
      .ux-cmd-list { max-height: 48vh; overflow: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
      .ux-cmd-item { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 10px; cursor: pointer; }
      .ux-cmd-item:hover { border-color: #0d9488; background: #f0fdfa; }
      .ux-cmd-name { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }
      .ux-cmd-help { margin-top: 3px; font-size: 12px; color: #64748b; }
    `;
    document.head.appendChild(style);
  }

  function readStorage(key, fallback) {
    return safeJsonParse(localStorage.getItem(key), fallback);
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function init(options = {}) {
    createStylesOnce();
    function safeQuerySelector(selector, fallbackSelector = null) {
      const primary = typeof selector === 'string' ? selector.trim() : '';
      const fallback = typeof fallbackSelector === 'string' ? fallbackSelector.trim() : '';
      const candidates = [];
      if (primary) candidates.push(primary);
      if (fallback) candidates.push(fallback);
      for (const candidate of candidates) {
        try {
          return document.querySelector(candidate);
        } catch {
          // try next candidate
        }
      }
      return null;
    }

    const scope = String(options.scope || 'default');
    const notificationsKey = `${STORAGE_PREFIX}:${scope}:notifications`;
    const filterKey = `${STORAGE_PREFIX}:${scope}:notif_filter`;
    const prefKey = `${STORAGE_PREFIX}:${scope}:prefs`;
    let notifications = readStorage(notificationsKey, []);
    if (!Array.isArray(notifications)) notifications = [];
    let activeFilter = localStorage.getItem(filterKey) || 'all';
    const allowedFilters = new Set(['all', 'urgent', 'deadline', 'message']);
    if (!allowedFilters.has(activeFilter)) activeFilter = 'all';
    let commands = Array.isArray(options.commands) ? options.commands : [];

    const headerRight = safeQuerySelector(options.headerRightSelector, '.header-right');
    const bell = document.createElement('button');
    bell.type = 'button';
    bell.className = 'ux-bell-btn';
    bell.innerHTML = '<span class="material-icons" style="font-size:20px;">notifications</span><span class="ux-bell-badge" hidden>0</span>';
    if (headerRight) headerRight.prepend(bell);

    const panel = document.createElement('div');
    panel.className = 'ux-panel';
    panel.innerHTML = `
      <div class="ux-panel-head">
        <h4 class="ux-panel-title">Notifications</h4>
        <div class="ux-panel-actions">
          <button type="button" class="ux-mini-btn" data-action="read-all">Tout lire</button>
          <button type="button" class="ux-mini-btn" data-action="close">Fermer</button>
        </div>
      </div>
      <div class="ux-filter-row">
        <button type="button" class="ux-chip" data-filter="all">Tout</button>
        <button type="button" class="ux-chip" data-filter="urgent">Urgent</button>
        <button type="button" class="ux-chip" data-filter="deadline">Deadline</button>
        <button type="button" class="ux-chip" data-filter="message">Message</button>
      </div>
      <div class="ux-panel-list"></div>
    `;
    document.body.appendChild(panel);

    const cmdOverlay = document.createElement('div');
    cmdOverlay.className = 'ux-cmd-overlay';
    cmdOverlay.innerHTML = `
      <div class="ux-cmd-card">
        <input class="ux-cmd-input" type="text" placeholder="Tape une action (ex: nouveau projet, tickets ouverts...)">
        <div class="ux-cmd-list"></div>
      </div>
    `;
    document.body.appendChild(cmdOverlay);

    const panelList = panel.querySelector('.ux-panel-list');
    const badge = bell.querySelector('.ux-bell-badge');
    const cmdInput = cmdOverlay.querySelector('.ux-cmd-input');
    const cmdList = cmdOverlay.querySelector('.ux-cmd-list');

    function saveNotifications() {
      if (!Array.isArray(notifications)) notifications = [];
      writeStorage(notificationsKey, notifications.slice(0, 300));
    }

    function filteredNotifications() {
      if (!Array.isArray(notifications)) return [];
      return notifications.filter((n) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'urgent') return String(n.priority || '').toLowerCase() === 'urgent';
        if (activeFilter === 'deadline') return (n.tags || []).includes('deadline') || String(n.type || '').toLowerCase().includes('deadline');
        if (activeFilter === 'message') return (n.tags || []).includes('message') || String(n.type || '').toLowerCase().includes('message');
        return true;
      });
    }

    function renderBell() {
      if (!Array.isArray(notifications)) notifications = [];
      const unread = notifications.reduce((count, n) => count + (n?.read ? 0 : 1), 0);
      const safeUnread = Number.isFinite(unread) && unread > 0 ? unread : 0;
      badge.textContent = safeUnread > 99 ? '99+' : String(safeUnread);
      badge.hidden = safeUnread <= 0;
      bell.setAttribute('aria-label', safeUnread > 0 ? `${safeUnread} notification(s) non lue(s)` : 'Aucune notification non lue');
    }

    function renderNotifications() {
      panel.querySelectorAll('.ux-chip').forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.filter === activeFilter);
      });
      const list = filteredNotifications();
      if (!list.length) {
        panelList.innerHTML = '<div class="ux-empty">Aucune notification</div>';
        renderBell();
        return;
      }
      panelList.innerHTML = list.map((n) => `
        <a class="ux-note ${n.read ? '' : 'unread'}" href="${escapeHtml(n.url || '#')}" data-id="${escapeHtml(n.id)}">
          <p class="ux-note-title">${escapeHtml(n.title || 'Notification')}</p>
          <p class="ux-note-meta">${escapeHtml(n.message || '')}</p>
          <p class="ux-note-meta">${new Date(n.createdAt || nowIso()).toLocaleString('fr-FR')}</p>
          <div class="ux-note-tags">${(n.tags || []).map((tag) => `<span class="ux-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        </a>
      `).join('');

      panelList.querySelectorAll('.ux-note').forEach((el) => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          const item = notifications.find((n) => String(n.id) === String(id));
          if (item) {
            item.read = true;
            saveNotifications();
            renderBell();
          }
        });
      });

      renderBell();
    }

    function notify(item = {}) {
      const id = String(item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      if (notifications.some((n) => String(n.id) === id)) return;
      notifications.unshift({
        id,
        title: item.title || 'Notification',
        message: item.message || '',
        type: item.type || 'info',
        priority: item.priority || 'medium',
        tags: Array.isArray(item.tags) ? item.tags : [],
        url: item.url || '#',
        createdAt: item.createdAt || nowIso(),
        read: false
      });
      saveNotifications();
      renderNotifications();
    }

    function markAllRead() {
      notifications = notifications.map((n) => ({ ...n, read: true }));
      saveNotifications();
      renderNotifications();
    }

    function openPanel() {
      panel.classList.add('open');
      renderNotifications();
    }

    function closePanel() {
      panel.classList.remove('open');
    }

    bell.addEventListener('click', () => {
      if (panel.classList.contains('open')) closePanel();
      else openPanel();
    });

    panel.addEventListener('click', (event) => {
      const action = event.target?.dataset?.action;
      const filter = event.target?.dataset?.filter;
      if (action === 'close') closePanel();
      if (action === 'read-all') markAllRead();
      if (filter) {
        activeFilter = allowedFilters.has(filter) ? filter : 'all';
        localStorage.setItem(filterKey, activeFilter);
        renderNotifications();
      }
    });

    document.addEventListener('click', (event) => {
      if (!panel.contains(event.target) && !bell.contains(event.target)) {
        closePanel();
      }
    });

    function setCommands(nextCommands) {
      commands = Array.isArray(nextCommands) ? nextCommands : [];
      renderCommands('');
    }

    function renderCommands(query) {
      const q = String(query || '').trim().toLowerCase();
      const visible = commands
        .filter((cmd) => {
          if (!q) return true;
          const hay = `${cmd.label || ''} ${cmd.help || ''} ${(cmd.keywords || []).join(' ')}`.toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 30);
      if (!visible.length) {
        cmdList.innerHTML = '<div class="ux-empty">Aucune action</div>';
        return;
      }
      cmdList.innerHTML = visible.map((cmd, idx) => `
        <div class="ux-cmd-item" data-index="${idx}">
          <p class="ux-cmd-name">${escapeHtml(cmd.label || 'Action')}</p>
          <p class="ux-cmd-help">${escapeHtml(cmd.help || '')}</p>
        </div>
      `).join('');
      cmdList.querySelectorAll('.ux-cmd-item').forEach((el) => {
        el.addEventListener('click', () => {
          const item = visible[Number(el.dataset.index)];
          if (item?.action) item.action();
          closeCommandPalette();
        });
      });
    }

    function openCommandPalette() {
      cmdOverlay.classList.add('open');
      cmdInput.value = '';
      renderCommands('');
      cmdInput.focus();
    }

    function closeCommandPalette() {
      cmdOverlay.classList.remove('open');
    }

    cmdInput.addEventListener('input', () => renderCommands(cmdInput.value));
    cmdInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeCommandPalette();
    });
    cmdOverlay.addEventListener('click', (event) => {
      if (event.target === cmdOverlay) closeCommandPalette();
    });

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommandPalette();
      }
      if (event.key === 'Escape') closeCommandPalette();
    });

    const searchInput = safeQuerySelector(options.searchInputSelector);
    const searchButton = safeQuerySelector(options.searchButtonSelector);
    const onSearch = typeof options.onSearch === 'function' ? options.onSearch : null;
    if (searchInput && onSearch) {
      searchInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        onSearch(searchInput.value || '');
      });
    }
    if (searchButton && searchInput && onSearch) {
      searchButton.addEventListener('click', () => onSearch(searchInput.value || ''));
    }

    function renderInbox(containerSelector, items) {
      const container = safeQuerySelector(containerSelector);
      if (!container) return;
      const list = (Array.isArray(items) ? items : [])
        .slice()
        .sort((a, b) => {
          const p = priorityRank(a.priority) - priorityRank(b.priority);
          if (p !== 0) return p;
          return new Date(b.date || 0) - new Date(a.date || 0);
        })
        .slice(0, 20);
      if (!list.length) {
        container.innerHTML = '<div class="ux-empty">Aucun élément dans l\'inbox.</div>';
        return;
      }
      container.innerHTML = `<div class="ux-inbox-list">${list.map((item) => `
        <a class="ux-inbox-item" href="${escapeHtml(item.url || '#')}">
          <p class="ux-inbox-title">${escapeHtml(item.title || 'Élément')}</p>
          <p class="ux-inbox-sub">${escapeHtml(item.subtitle || '')}</p>
          <p class="ux-inbox-sub">${item.date ? new Date(item.date).toLocaleString('fr-FR') : ''}</p>
        </a>
      `).join('')}</div>`;
    }

    function getPrefs() {
      return readStorage(prefKey, {});
    }

    function savePref(key, value) {
      const current = getPrefs();
      current[key] = value;
      writeStorage(prefKey, current);
    }

    function getPref(key, fallback = null) {
      const current = getPrefs();
      return current[key] === undefined ? fallback : current[key];
    }

    renderNotifications();
    renderCommands('');

    return {
      notify,
      renderInbox,
      markAllRead,
      getNotifications: () => notifications.slice(),
      setCommands,
      openCommandPalette,
      closeCommandPalette,
      savePref,
      getPref
    };
  }

  window.UXProductivitySuite = { init };
})();
