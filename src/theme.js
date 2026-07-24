// ====== THEME SYSTEM MANAGER ======
// Handles seamless Light / Dark mode switching across TDE Group platform

export function initTheme() {
  const storedTheme = localStorage.getItem('tde-theme') || 'dark';
  applyTheme(storedTheme);

  // Setup toggle button event listeners (both desktop & mobile)
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTheme = document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
    });
  });
}

export function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-mode');
    localStorage.setItem('tde-theme', 'light');
  } else {
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark-mode');
    localStorage.setItem('tde-theme', 'dark');
  }
  updateThemeIcons(theme);
}

function updateThemeIcons(theme) {
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    const sunIcon = btn.querySelector('.theme-icon-sun');
    const moonIcon = btn.querySelector('.theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'light') {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      }
    }
  });
}

// Auto-run theme check immediately before render to avoid flash of wrong theme
(function() {
  const savedTheme = localStorage.getItem('tde-theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-mode');
  }
})();
