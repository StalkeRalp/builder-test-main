/**
 * Client Authentication Service
 * Gère l'authentification PIN pour le portail client
 */

class ClientAuthService {
  constructor() {
    this.PROJECT_ID_KEY = 'client_project_id';
    this.PIN_KEY = 'client_pin';
    this.SESSION_KEY = 'client_session';
    this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 heures
  }

  /**
   * Valide le PIN (6 chiffres)
   */
  validatePin(pin) {
    return /^\d{6}$/.test(pin);
  }

  /**
   * Valide le Project ID (UUID format)
   */
  validateProjectId(projectId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(projectId);
  }

  /**
   * Se connecter avec Project ID et PIN
   */
  login(projectId, pin, rememberMe = false) {
    // Validation
    if (!this.validateProjectId(projectId)) {
      throw new Error('Invalid Project ID format');
    }
    if (!this.validatePin(pin)) {
      throw new Error('PIN must be 6 digits');
    }

    // Créer session
    const session = {
      projectId,
      loginTime: Date.now(),
      expiresAt: Date.now() + this.SESSION_DURATION
    };

    // Stocker
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(this.PIN_KEY, pin);

    if (rememberMe) {
      localStorage.setItem(this.PROJECT_ID_KEY, projectId);
    }

    return session;
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated() {
    const session = sessionStorage.getItem(this.SESSION_KEY);
    if (!session) return false;

    try {
      const parsed = JSON.parse(session);
      if (Date.now() > parsed.expiresAt) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir l'ID du projet
   */
  getProjectId() {
    const session = sessionStorage.getItem(this.SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session).projectId;
    } catch {
      return null;
    }
  }

  /**
   * Obtenir les identifiants mémorisés
   */
  getRememberedProjectId() {
    return localStorage.getItem(this.PROJECT_ID_KEY);
  }

  /**
   * Se déconnecter
   */
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.PIN_KEY);
  }

  /**
   * Obtenir le temps restant de session (en minutes)
   */
  getSessionTimeRemaining() {
    const session = sessionStorage.getItem(this.SESSION_KEY);
    if (!session) return 0;

    try {
      const parsed = JSON.parse(session);
      const remaining = parsed.expiresAt - Date.now();
      return Math.max(0, Math.floor(remaining / 60000));
    } catch {
      return 0;
    }
  }
}

const clientAuthService = new ClientAuthService();
window.clientAuthService = clientAuthService;
