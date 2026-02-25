(function () {
  if (window.__refreshFeedbackInit) return;
  window.__refreshFeedbackInit = true;

  const style = document.createElement('style');
  style.textContent = [
    '.rf-loading { position: relative; overflow: hidden; }',
    '.rf-loading .material-icons { animation: rf-spin 0.9s linear infinite; }',
    '.rf-loading::after {',
    '  content: "";',
    '  position: absolute;',
    '  inset: 0;',
    '  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent);',
    '  animation: rf-sheen 0.9s ease;',
    '  pointer-events: none;',
    '}',
    '@keyframes rf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
    '@keyframes rf-sheen { from { transform: translateX(-100%); } to { transform: translateX(100%); } }'
  ].join('');
  document.head.appendChild(style);

  function activate(el, ms) {
    if (!el) return;
    const duration = Number(ms || 1000);
    el.classList.add('rf-loading');
    el.setAttribute('aria-busy', 'true');
    window.setTimeout(function () {
      el.classList.remove('rf-loading');
      el.removeAttribute('aria-busy');
    }, duration);
  }

  window.showRefreshFeedback = activate;

  document.addEventListener('click', function (event) {
    const target = event.target && event.target.closest
      ? event.target.closest('button[id*="refresh" i], a[id*="refresh" i], button[data-refresh="true"], button[data-action="refresh"]')
      : null;
    if (!target) return;
    activate(target, 1100);
  }, true);
})();
