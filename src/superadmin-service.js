/**
 * Super Admin Service
 * Operations reserved for superadmin users.
 */

import { supabase } from './supabase-client.js';
import AuthService from './auth-service.js';

class SuperAdminService {
  constructor() {
    this.ADMIN_CREATE_COOLDOWN_KEY = 'superadmin_admin_create_cooldown_until';
    this.ADMIN_CREATE_COOLDOWN_MS = 70000;
    this.ADMIN_CREATE_FUNCTION_NAME = 'admin-create-user';
  }

  async _requireSuperAdmin() {
    await AuthService.authReady;
    if (!AuthService.isSuperAdmin || !AuthService.isSuperAdmin()) {
      throw new Error('Accès réservé au super admin.');
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = Boolean(sessionData?.session?.access_token);
    if (!hasSession) {
      throw new Error('Session Supabase absente ou expirée. Reconnectez-vous en superadmin.');
    }

    const userId = AuthService.currentUser?.id || null;
    if (!userId) {
      throw new Error('Session super admin invalide.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;

    const role = String(data?.role || '').toLowerCase();
    if (role !== 'superadmin') {
      throw new Error('Accès réservé au super admin.');
    }
  }

  _normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  _normalizeName(value) {
    return String(value || '').trim();
  }

  _getCooldownUntil() {
    try {
      const raw = localStorage.getItem(this.ADMIN_CREATE_COOLDOWN_KEY);
      const parsed = Number(raw || 0);
      if (!Number.isFinite(parsed) || parsed <= Date.now()) return 0;
      return parsed;
    } catch {
      return 0;
    }
  }

  _setCooldown(ms = this.ADMIN_CREATE_COOLDOWN_MS) {
    try {
      localStorage.setItem(this.ADMIN_CREATE_COOLDOWN_KEY, String(Date.now() + Number(ms || 0)));
    } catch {
      // ignore storage errors
    }
  }

  _isRateLimitError(error) {
    const status = Number(error?.status || 0);
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();
    return status === 429
      || message.includes('rate limit')
      || message.includes('email rate limit')
      || code.includes('too_many_requests');
  }

  _isAlreadyRegisteredError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('already registered')
      || message.includes('already exists')
      || message.includes('already been registered');
  }

  _isAuthUserNotFoundError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('utilisateur auth introuvable')
      || message.includes('auth user not found');
  }

  _isNetworkError(error) {
    const message = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    return name === 'typeerror'
      || message.includes('failed to fetch')
      || message.includes('network')
      || message.includes('internet disconnected')
      || message.includes('err_network_changed')
      || message.includes('err_internet_disconnected');
  }

  _ensureOnline() {
    if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
      throw new Error('Connexion Internet indisponible. Vérifiez le réseau puis réessayez.');
    }
  }

  async _findProfileByEmail(email) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async _findAuthUserByEmail(email) {
    const normalizedEmail = this._normalizeEmail(email);
    if (!normalizedEmail) return null;
    const rows = await this.getAuthenticatedUsers({ search: normalizedEmail, limit: 200 });
    return (rows || []).find((u) => this._normalizeEmail(u?.email) === normalizedEmail) || null;
  }

  _deriveNameFromAuthUser(authUser, fallbackEmail = '', fallbackName = '') {
    const byMeta = String(
      authUser?.user_metadata?.name
      || authUser?.user_metadata?.full_name
      || ''
    ).trim();
    if (byMeta) return byMeta;
    const byProvided = String(fallbackName || '').trim();
    if (byProvided) return byProvided;
    const email = String(fallbackEmail || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return 'Administrator';
    const raw = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (!raw) return 'Administrator';
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async _tryPromoteExistingAuthUser({ email, fullName, role }) {
    const authUser = await this._findAuthUserByEmail(email);
    if (!authUser?.id) return null;
    const promoted = await this.promoteAuthenticatedUser(authUser.id, { role, fullName });
    return {
      id: promoted?.id || authUser.id,
      email: promoted?.email || authUser.email || email,
      full_name: promoted?.full_name || authUser.full_name || fullName || 'Administrator',
      role: promoted?.role || role,
      switchedSession: false,
      status: 'promoted_existing_auth_user'
    };
  }

  _allowLegacySignupFallback() {
    return String(import.meta.env.VITE_ALLOW_LEGACY_ADMIN_SIGNUP_FALLBACK || '') === '1';
  }

  _useEdgeAdminCreate() {
    return String(import.meta.env.VITE_USE_EDGE_ADMIN_CREATE || '') === '1';
  }

  async _formatEdgeInvokeError(error) {
    const defaultMessage = String(error?.message || 'erreur inconnue');
    try {
      const response = error?.context;
      if (typeof Response !== 'undefined' && response instanceof Response) {
        const status = Number(response.status || 0);
        let bodyMessage = '';
        try {
          const body = await response.clone().json();
          bodyMessage = String(body?.error || body?.message || '').trim();
        } catch {
          try {
            bodyMessage = String(await response.clone().text() || '').trim();
          } catch {
            bodyMessage = '';
          }
        }
        if (bodyMessage) {
          return `Edge Function erreur (${status || 'n/a'}): ${bodyMessage}`;
        }
        if (status) {
          return `Edge Function erreur HTTP ${status}.`;
        }
      }
    } catch {
      // ignore parse errors
    }
    return `Edge Function indisponible: ${defaultMessage}.`;
  }

  _allowLegacyAuthSignupCreate() {
    const raw = String(import.meta.env.VITE_ALLOW_LEGACY_AUTH_SIGNUP_CREATE || '').trim().toLowerCase();
    if (raw === '0' || raw === 'false' || raw === 'no') return false;
    return true;
  }

  async _createAdminViaEdge({ email, password, fullName, role }) {
    const payload = {
      email,
      password,
      fullName,
      role
    };

    const { data, error } = await supabase.functions.invoke(this.ADMIN_CREATE_FUNCTION_NAME, {
      body: payload
    });

    if (error) {
      throw new Error(await this._formatEdgeInvokeError(error));
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Réponse Edge invalide.');
    }

    if (data.error) {
      throw new Error(String(data.error));
    }

    return {
      id: data.id || null,
      email: data.email || email,
      full_name: data.full_name || fullName,
      role: data.role || role,
      switchedSession: false,
      status: data.status || 'created_by_edge'
    };
  }

  async _createAdminLegacy({ email, password, fullName, role }) {
    this._ensureOnline();

    const actorId = AuthService.currentUser?.id || null;
    const actorEmail = AuthService.currentUser?.email || null;
    const normalizedEmail = this._normalizeEmail(email);
    const normalizedName = this._normalizeName(fullName);
    const normalizedRole = String(role || 'admin').toLowerCase();

    const cooldownUntil = this._getCooldownUntil();
    if (cooldownUntil > Date.now()) {
      const seconds = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
      throw new Error(`Trop de créations rapprochées. Réessayez dans ${seconds}s.`);
    }

    const existingProfile = await this._findProfileByEmail(normalizedEmail);
    if (existingProfile) {
      const currentRole = String(existingProfile.role || '').toLowerCase();
      if (currentRole === normalizedRole && String(existingProfile.full_name || '') === normalizedName) {
        return {
          id: existingProfile.id,
          email: normalizedEmail,
          full_name: normalizedName,
          role: normalizedRole,
          switchedSession: false,
          status: 'already_exists'
        };
      }

      let promoted = null;
      try {
        promoted = await this.promoteAuthenticatedUser(existingProfile.id, {
          role: normalizedRole,
          fullName: normalizedName
        });
      } catch (error) {
        if (!this._isAuthUserNotFoundError(error)) throw error;
      }

      if (!promoted) {
        const promotedAuthUser = await this._tryPromoteExistingAuthUser({
          email: normalizedEmail,
          fullName: normalizedName,
          role: normalizedRole
        });
        if (promotedAuthUser) {
          return {
            ...promotedAuthUser,
            status: currentRole === 'admin' || currentRole === 'superadmin'
              ? 'updated_existing_admin'
              : 'promoted_existing_profile'
          };
        }
      } else {
        return {
          id: promoted?.id || existingProfile.id,
          email: promoted?.email || normalizedEmail,
          full_name: promoted?.full_name || normalizedName,
          role: promoted?.role || normalizedRole,
          switchedSession: false,
          status: currentRole === 'admin' || currentRole === 'superadmin'
            ? 'updated_existing_admin'
            : 'promoted_existing_profile'
        };
      }

      // Aucun auth user lié trouvé pour ce profil legacy: on continue vers le flux signUp.
    }

    const promotedAuthUser = await this._tryPromoteExistingAuthUser({
      email: normalizedEmail,
      fullName: normalizedName,
      role: normalizedRole
    });
    if (promotedAuthUser) {
      return promotedAuthUser;
    }

    if (!this._allowLegacyAuthSignupCreate()) {
      throw new Error('Création automatique Auth désactivée par configuration (VITE_ALLOW_LEGACY_AUTH_SIGNUP_CREATE=0).');
    }

    this._ensureOnline();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: String(password || ''),
      options: {
        data: {
          name: normalizedName,
          role: normalizedRole
        }
      }
    });
    if (authError) {
      if (this._isNetworkError(authError)) {
        throw new Error('Réseau instable pendant la création. Réessayez quand la connexion est stable.');
      }
      if (this._isRateLimitError(authError)) {
        this._setCooldown();
        const recovered = await this._tryPromoteExistingAuthUser({
          email: normalizedEmail,
          fullName: normalizedName,
          role: normalizedRole
        });
        if (recovered) {
          return {
            ...recovered,
            status: 'recovered_after_rate_limit'
          };
        }
        throw new Error(
          'Email rate limit exceeded. Si ce compte vient d’être créé, réessayez avec les mêmes identifiants dans 60s.'
        );
      }
      if (this._isAlreadyRegisteredError(authError)) {
        throw new Error(
          'Ce compte existe déjà côté authentification, mais aucun profil admin exploitable n’a été trouvé. ' +
          'Connectez-vous une fois avec ce compte puis relancez la promotion.'
        );
      }
      throw authError;
    }

    const userId = authData?.user?.id;
    if (!userId) throw new Error('Utilisateur non créé.');
    const effectiveName = this._deriveNameFromAuthUser(authData?.user, normalizedEmail, normalizedName);

    const promoted = await this.promoteAuthenticatedUser(userId, {
      role: normalizedRole,
      fullName: effectiveName
    });

    const { data: activeUserData } = await supabase.auth.getUser();
    const activeUserId = activeUserData?.user?.id || null;
    const switchedSession = Boolean(actorId && activeUserId && String(actorId) !== String(activeUserId));
    if (switchedSession) {
      await supabase.auth.signOut();
      throw new Error(
        `Création effectuée, mais la session active a basculé. ` +
        `Reconnectez-vous avec votre compte superadmin (${actorEmail || 'initial'}) puis continuez.`
      );
    }

    return {
      id: promoted?.id || userId,
      email: promoted?.email || normalizedEmail,
      full_name: promoted?.full_name || effectiveName,
      role: promoted?.role || normalizedRole,
      switchedSession,
      status: 'created'
    };
  }

  async _updateAdminPhone({ userId = null, email = '', phone = '' } = {}) {
    const safePhone = String(phone || '').trim();
    if (!safePhone) return;

    if (userId) {
      const byId = await supabase
        .from('profiles')
        .update({ phone: safePhone })
        .eq('id', userId)
        .select('id')
        .maybeSingle();
      if (!byId.error) return;
    }

    const safeEmail = this._normalizeEmail(email);
    if (!safeEmail) return;
    await supabase
      .from('profiles')
      .update({ phone: safePhone })
      .ilike('email', safeEmail);
  }

  async getAdmins() {
    await this._requireSuperAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at, phone, company')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).filter((row) => {
      const role = String(row?.role || '').trim().toLowerCase();
      return role === 'admin' || role === 'superadmin';
    });
  }

  async getClients() {
    await this._requireSuperAdmin();
    const direct = await supabase
      .from('projects')
      .select('id, name, client_name, client_email, client_phone, status, created_at')
      .order('created_at', { ascending: false });

    if (!direct.error) {
      return direct.data || [];
    }

    const rpc = await supabase.rpc('get_superadmin_clients_for_graphs');
    if (rpc.error) throw direct.error;
    return Array.isArray(rpc.data) ? rpc.data : [];
  }

  async getOverview() {
    const [admins, clients, projects] = await Promise.all([
      this.getAdmins(),
      this.getClients(),
      supabase.from('projects').select('id, status', { count: 'exact' })
    ]);
    const normalizedAdminRows = (admins || []).map((a) => String(a?.role || '').toLowerCase());
    const projectsData = projects?.error ? (clients || []) : (projects.data || []);
    const activeProjects = projectsData.filter((p) => ['active', 'in_progress', 'planning'].includes(String(p.status || '').toLowerCase())).length;
    const pausedProjects = projectsData.filter((p) => String(p.status || '').toLowerCase() === 'paused').length;
    return {
      adminsCount: normalizedAdminRows.filter((role) => role === 'admin').length,
      superAdminsCount: normalizedAdminRows.filter((role) => role === 'superadmin').length,
      clientsCount: new Set(clients.map((c) => c.client_email || `${c.client_name || ''}:${c.client_phone || ''}`)).size,
      projectsCount: projects?.error ? projectsData.length : (projects.count || projectsData.length),
      activeProjects,
      pausedProjects
    };
  }

  async getAuthenticatedUsers({ search = '', limit = 200 } = {}) {
    await this._requireSuperAdmin();
    const safeLimit = Math.min(500, Math.max(1, Number(limit || 200)));
    const normalizedSearch = String(search || '').trim();
    const { data, error } = await supabase.rpc('get_superadmin_auth_users', {
      p_search: normalizedSearch || null,
      p_limit: safeLimit
    });
    if (error) {
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('accès réservé au superadmin') || msg.includes('acces reserve au superadmin')) {
        throw new Error('Accès RPC refusé: votre profil doit avoir le rôle superadmin en base.');
      }
      if (msg.includes('function') && msg.includes('get_superadmin_auth_users')) {
        throw new Error('RPC get_superadmin_auth_users introuvable. Exécutez le script SQL superadmin.');
      }
      if (msg.includes('jwt') || msg.includes('auth.uid') || msg.includes('permission denied')) {
        throw new Error('Session invalide pour RPC superadmin. Déconnectez-vous puis reconnectez-vous.');
      }
      throw error;
    }
    return Array.isArray(data) ? data : [];
  }

  async promoteAuthenticatedUser(userId, { role = 'admin', fullName = '' } = {}) {
    await this._requireSuperAdmin();
    const normalizedRole = String(role || 'admin').toLowerCase();
    if (!['admin', 'superadmin'].includes(normalizedRole)) {
      throw new Error('Rôle invalide.');
    }
    const safeUserId = String(userId || '').trim();
    if (!safeUserId) {
      throw new Error('Utilisateur requis.');
    }
    const safeName = String(fullName || '').trim();
    const { data, error } = await supabase.rpc('promote_auth_user_to_admin', {
      p_user_id: safeUserId,
      p_role: normalizedRole,
      p_full_name: safeName || null
    });
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) return data[0];
    return data || null;
  }

  async createAdmin({ email, password, fullName, role = 'admin', phone = '' }) {
    this._ensureOnline();
    await this._requireSuperAdmin();
    const normalizedEmail = this._normalizeEmail(email);
    const normalizedName = this._normalizeName(fullName);
    const normalizedRole = String(role || 'admin').toLowerCase();
    const normalizedPhone = String(phone || '').trim();

    if (!normalizedEmail) {
      throw new Error('Email requis.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Format email invalide.');
    }
    if (!normalizedName) {
      throw new Error('Nom complet requis.');
    }
    if (!['admin', 'superadmin'].includes(normalizedRole)) {
      throw new Error('Rôle invalide.');
    }
    if (String(password || '').length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
    }

    if (!this._useEdgeAdminCreate()) {
      const result = await this._createAdminLegacy({
        email: normalizedEmail,
        password: String(password || ''),
        fullName: normalizedName,
        role: normalizedRole
      });
      await this._updateAdminPhone({
        userId: result?.id || null,
        email: result?.email || normalizedEmail,
        phone: normalizedPhone
      });
      return result;
    }

    try {
      const result = await this._createAdminViaEdge({
        email: normalizedEmail,
        password: String(password || ''),
        fullName: normalizedName,
        role: normalizedRole
      });
      await this._updateAdminPhone({
        userId: result?.id || null,
        email: result?.email || normalizedEmail,
        phone: normalizedPhone
      });
      return result;
    } catch (edgeError) {
      if (this._allowLegacySignupFallback()) {
        const result = await this._createAdminLegacy({
          email: normalizedEmail,
          password: String(password || ''),
          fullName: normalizedName,
          role: normalizedRole
        });
        await this._updateAdminPhone({
          userId: result?.id || null,
          email: result?.email || normalizedEmail,
          phone: normalizedPhone
        });
        return result;
      }
      throw edgeError;
    }
  }

  async updateAdminRole(userId, role) {
    await this._requireSuperAdmin();
    const normalizedRole = String(role || '').toLowerCase();
    if (!['admin', 'superadmin'].includes(normalizedRole)) {
      throw new Error('Rôle invalide.');
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: normalizedRole })
      .eq('id', userId)
      .in('role', ['admin', 'superadmin'])
      .select('id, email, full_name, role')
      .single();
    if (error) throw error;
    return data;
  }

  async updateAdminProfile(userId, updates = {}) {
    await this._requireSuperAdmin();
    const safeUserId = String(userId || '').trim();
    if (!safeUserId) throw new Error('Utilisateur requis.');

    const payload = {
      full_name: String(updates.fullName || '').trim() || null,
      email: this._normalizeEmail(updates.email || ''),
      phone: String(updates.phone || '').trim() || null,
      company: String(updates.company || '').trim() || null,
      role: String(updates.role || '').trim().toLowerCase()
    };

    if (!payload.email) throw new Error('Email requis.');
    if (!['admin', 'superadmin'].includes(payload.role)) {
      throw new Error('Rôle invalide.');
    }

    let { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', safeUserId)
      .in('role', ['admin', 'superadmin'])
      .select('id, full_name, email, role, phone, company, created_at')
      .single();

    if (error && String(error.message || '').toLowerCase().includes('column') && String(error.message || '').toLowerCase().includes('company')) {
      const fallbackPayload = {
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role
      };
      const retry = await supabase
        .from('profiles')
        .update(fallbackPayload)
        .eq('id', safeUserId)
        .in('role', ['admin', 'superadmin'])
        .select('id, full_name, email, role, phone, company, created_at')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return data;
  }

  async deleteAdmin(userId) {
    await this._requireSuperAdmin();
    const me = AuthService.currentUser?.id;
    if (String(userId) === String(me)) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte.');
    }

    const { data: target, error: readError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();
    if (readError) throw readError;
    if (!target || !['admin', 'superadmin'].includes(String(target.role || '').toLowerCase())) {
      throw new Error('Compte admin introuvable.');
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
    return { success: true };
  }

  async deleteClientProjects(clientEmail) {
    await this._requireSuperAdmin();
    const email = String(clientEmail || '').trim();
    if (!email) throw new Error('Email client requis.');
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('client_email', email);
    if (error) throw error;
    return { success: true };
  }

  async getAdminActions({ limit = 300 } = {}) {
    await this._requireSuperAdmin();
    const safeLimit = Math.min(1000, Math.max(1, Number(limit || 300)));

    let eventsRows = [];
    let eventsError = null;
    try {
      const res = await supabase
        .from('admin_events')
        .select('id, title, event_type, priority, event_date, event_time, notes, created_by, created_at, updated_at, project_id')
        .order('created_at', { ascending: false })
        .limit(safeLimit);
      eventsRows = Array.isArray(res.data) ? res.data : [];
      eventsError = res.error || null;
    } catch (error) {
      eventsError = error;
    }

    if (eventsError) {
      let fallbackRows = null;
      let fallbackError = null;

      const attemptActivityLogs = await supabase
        .from('activity_logs')
        .select('id, action, details, created_at, user_id, project_id, entity_type')
        .order('created_at', { ascending: false })
        .limit(safeLimit);
      if (!attemptActivityLogs.error) {
        fallbackRows = attemptActivityLogs.data || [];
      } else {
        const attemptActivityLog = await supabase
          .from('activity_log')
          .select('id, action, details, created_at, user_id, project_id, entity_type')
          .order('created_at', { ascending: false })
          .limit(safeLimit);
        if (!attemptActivityLog.error) {
          fallbackRows = attemptActivityLog.data || [];
        } else {
          fallbackError = attemptActivityLog.error;
        }
      }

      if (fallbackError) throw fallbackError;

      return (fallbackRows || []).map((row) => ({
        id: row.id,
        type: row.entity_type || 'activity',
        title: row.action || 'Action',
        priority: 'medium',
        date: row.created_at ? String(row.created_at).slice(0, 10) : null,
        time: row.created_at ? String(new Date(row.created_at).toISOString()).slice(11, 16) : null,
        notes: row.details || '',
        admin_id: row.user_id || null,
        admin_name: null,
        admin_email: null,
        project_id: row.project_id || null,
        project_name: null,
        created_at: row.created_at || null
      }));
    }

    const creatorIds = [...new Set(eventsRows.map((row) => row.created_by).filter(Boolean))];
    const projectIds = [...new Set(eventsRows.map((row) => row.project_id).filter(Boolean))];

    let profilesById = new Map();
    if (creatorIds.length) {
      const { data: profilesRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds);
      if (!profilesError) {
        profilesById = new Map((profilesRows || []).map((row) => [String(row.id), row]));
      }
    }

    let projectsById = new Map();
    if (projectIds.length) {
      const { data: projectRows, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      if (!projectError) {
        projectsById = new Map((projectRows || []).map((row) => [String(row.id), row]));
      }
    }

    return eventsRows.map((row) => {
      const profile = profilesById.get(String(row.created_by || ''));
      const project = projectsById.get(String(row.project_id || ''));
      return {
        id: row.id,
        type: row.event_type || 'general',
        title: row.title || 'Action admin',
        priority: row.priority || 'medium',
        date: row.event_date || null,
        time: row.event_time ? String(row.event_time).slice(0, 5) : null,
        notes: row.notes || '',
        admin_id: row.created_by || null,
        admin_name: profile?.full_name || null,
        admin_email: profile?.email || null,
        project_id: row.project_id || null,
        project_name: project?.name || null,
        created_at: row.created_at || null,
        updated_at: row.updated_at || null
      };
    });
  }

  async getUserDirectories() {
    await this._requireSuperAdmin();
    const [admins, clients, authUsers] = await Promise.all([
      this.getAdmins(),
      this.getClients(),
      this.getAuthenticatedUsers({ limit: 500 }).catch(() => [])
    ]);

    const clientsGrouped = new Map();
    (clients || []).forEach((row) => {
      const key = row.client_email || `${row.client_name || ''}:${row.client_phone || ''}`;
      if (!clientsGrouped.has(key)) {
        clientsGrouped.set(key, {
          client_name: row.client_name || 'Client',
          client_email: row.client_email || '',
          client_phone: row.client_phone || '',
          projects_count: 0,
          projects_active: 0,
          last_project_created_at: row.created_at || null
        });
      }
      const current = clientsGrouped.get(key);
      current.projects_count += 1;
      if (['active', 'in_progress', 'planning'].includes(String(row.status || '').toLowerCase())) {
        current.projects_active += 1;
      }
      if (!current.last_project_created_at || new Date(row.created_at) > new Date(current.last_project_created_at)) {
        current.last_project_created_at = row.created_at;
      }
    });

    return {
      admins: Array.isArray(admins) ? admins : [],
      clients: [...clientsGrouped.values()],
      authUsers: Array.isArray(authUsers) ? authUsers : []
    };
  }
}

const superAdminService = new SuperAdminService();
if (typeof window !== 'undefined') {
  window.superAdminService = superAdminService;
}
export default superAdminService;
