/**
 * Authentication Service - Supabase Edition
 * Manages Admin and Client authentication using Supabase Auth
 */

import { supabase } from './supabase-client.js';

class AuthenticationService {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this._adminLoginPromise = null;
        this.ADMIN_SESSION_KEY = 'admin_session';
        this.ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24h
        this.ADMIN_PROFILE_CACHE_KEY = 'tde_admin_profile_cache_v1';
        this.BOOTSTRAP_ADMIN_EMAILS = this._getBootstrapAdminEmails();
        this.authReady = new Promise(resolve => {
            this._resolveAuthReady = resolve;
        });
        this._initializeAuth();
    }

    // --- INITIALIZATION ---

    async _initializeAuth() {
        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Keep user early to avoid false negatives during profile fetch.
                this.currentUser = session.user;
                this._setAdminSession(session.user.id);
                const cachedProfile = this._readCachedAdminProfile(session.user.id);
                if (cachedProfile) {
                    this.currentProfile = cachedProfile;
                }
                await this._loadUserProfile(session.user.id);
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
        } finally {
            this._resolveAuthReady(true);
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);

            if (session) {
                this.currentUser = session.user;
                this._setAdminSession(session.user.id);
                const cachedProfile = this._readCachedAdminProfile(session.user.id);
                if (cachedProfile) {
                    this.currentProfile = cachedProfile;
                }
                await this._loadUserProfile(session.user.id);
            } else {
                this.currentUser = null;
                this.currentProfile = null;
                this._clearCachedAdminProfile();
                this._clearAdminSession();
            }
        });
    }

    async _loadUserProfile(userId) {
        const { data: userData } = await supabase.auth.getUser();
        this.currentUser = userData?.user || this.currentUser || null;

        let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            const bootstrapped = await this._ensureBootstrapAdminProfile(this.currentUser);
            if (bootstrapped) {
                ({ data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single());
            }
        }

        if (error) {
            console.error('Error loading profile:', error);
            const cachedProfile = this._readCachedAdminProfile(userId);
            if (cachedProfile) {
                this.currentProfile = cachedProfile;
                this._setAdminSession(userId);
            }
            return;
        }

        this.currentProfile = data;
        this._writeCachedAdminProfile(data);
        const role = String(data?.role || '').toLowerCase();
        if (role === 'admin' || role === 'superadmin') {
            this._setAdminSession(userId);
        } else {
            this._clearAdminSession();
        }
    }

    _getBootstrapAdminEmails() {
        const defaults = ['nkada@justin.com'];
        const fromEnv = String(import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAILS || '')
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean);
        return new Set([...defaults, ...fromEnv]);
    }

    _isBootstrapAdminEmail(email) {
        return this.BOOTSTRAP_ADMIN_EMAILS.has(String(email || '').trim().toLowerCase());
    }

    async _ensureBootstrapAdminProfile(user) {
        const userId = user?.id || null;
        const email = String(user?.email || '').trim().toLowerCase();
        if (!userId || !email || !this._isBootstrapAdminEmail(email)) return false;

        const fullName = String(
            user?.user_metadata?.name
            || user?.user_metadata?.full_name
            || 'Administrator'
        ).trim();

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email,
                full_name: fullName,
                role: 'admin'
            }, { onConflict: 'id' });

        if (error) {
            console.error('Bootstrap admin upsert error:', error);
            return false;
        }
        return true;
    }

    _readAdminSession() {
        try {
            const raw = sessionStorage.getItem(this.ADMIN_SESSION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.userId || !parsed.expiresAt) return null;
            if (Date.now() > Number(parsed.expiresAt)) {
                this._clearAdminSession();
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    }

    _setAdminSession(userId) {
        if (!userId) return;
        try {
            const current = this._readAdminSession();
            const loginTime = current?.loginTime || Date.now();
            const next = {
                userId: String(userId),
                loginTime,
                expiresAt: Date.now() + this.ADMIN_SESSION_DURATION
            };
            sessionStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(next));
        } catch {
            // ignore
        }
    }

    _clearAdminSession() {
        try {
            sessionStorage.removeItem(this.ADMIN_SESSION_KEY);
        } catch {
            // ignore
        }
    }

    _readCachedAdminProfile(userId = null) {
        try {
            const raw = localStorage.getItem(this.ADMIN_PROFILE_CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.id || !parsed.role) return null;
            if (userId && String(parsed.id) !== String(userId)) return null;
            if (!['admin', 'superadmin'].includes(String(parsed.role).toLowerCase())) return null;
            return parsed;
        } catch {
            return null;
        }
    }

    _writeCachedAdminProfile(profile) {
        if (!profile || !profile.id) return;
        const role = String(profile.role || '').toLowerCase();
        if (!['admin', 'superadmin'].includes(role)) return;
        try {
            localStorage.setItem(this.ADMIN_PROFILE_CACHE_KEY, JSON.stringify(profile));
        } catch (error) {
            console.warn('Unable to cache admin profile:', error?.message || error);
        }
    }

    _clearCachedAdminProfile() {
        try {
            localStorage.removeItem(this.ADMIN_PROFILE_CACHE_KEY);
        } catch {
            // ignore
        }
    }

    // --- AUTHENTICATION METHODS ---

    _isAbortError(error) {
        const name = String(error?.name || '');
        const message = String(error?.message || '').toLowerCase();
        return name === 'AbortError' || message.includes('signal is aborted');
    }

    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Admin Login using Supabase Auth
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} { success, error, user }
     */
    async loginAdmin(email, password) {
        if (this._adminLoginPromise) {
            return this._adminLoginPromise;
        }

        this._adminLoginPromise = this._loginAdminInternal(email, password);
        try {
            return await this._adminLoginPromise;
        } finally {
            this._adminLoginPromise = null;
        }
    }

    async _loginAdminInternal(email, password) {
        try {
            await this.authReady;

            let data = null;
            let error = null;

            for (let attempt = 1; attempt <= 2; attempt += 1) {
                ({ data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                }));

                if (!error) break;
                if (!this._isAbortError(error) || attempt === 2) break;

                // Short retry for transient Supabase/browser aborts.
                await this._delay(250);
            }

            if (error) throw error;

            // Verify user is admin
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError || !['admin', 'superadmin'].includes(String(profile?.role || '').toLowerCase())) {
                const bootstrapped = await this._ensureBootstrapAdminProfile(data.user);
                if (bootstrapped) {
                    ({ data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single());
                }
            }

            if (profileError || !['admin', 'superadmin'].includes(String(profile?.role || '').toLowerCase())) {
                await supabase.auth.signOut();
                return {
                    success: false,
                    error: 'Access denied. Admin credentials required.'
                };
            }

            this.currentUser = data.user;
            this.currentProfile = profile;
            this._writeCachedAdminProfile(profile);
            this._setAdminSession(data.user.id);

            return {
                success: true,
                user: data.user,
                profile: profile
            };
        } catch (error) {
            console.error('Admin login error:', error);
            return {
                success: false,
                error: this._isAbortError(error)
                    ? 'Connexion interrompue temporairement. Réessaie dans 1 seconde.'
                    : error.message
            };
        }
    }

    /**
     * Client Login using Project ID and PIN
     * @param {string} projectId 
     * @param {string} pin 
     * @returns {Promise<Object>} { success, error, project }
     */
    async loginClient(projectId, pin) {
        try {
            // Determine if input is a valid UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

            let project = null;
            let projectError = null;

            if (isUUID) {
                console.log('Attempting RPC login for:', projectId);
                // Try RPC first (Security Definer - Bypasses RLS)
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('login_client', { p_id: projectId, p_pin: pin });

                if (rpcError) {
                    console.error('RPC Error:', rpcError);
                    if (rpcError.message.includes('function') && rpcError.message.includes('not found')) {
                        return { success: false, error: 'Database setup incomplete. Ask Admin to run the SQL script.' };
                    }
                }

                if (!rpcError && rpcData) {
                    project = rpcData;
                    console.log('RPC Login Successful');
                } else {
                    // Fallback to direct query (might fail if RLS is strict)
                    console.warn('RPC failed or returned null, trying direct query...');

                    const { data, error } = await supabase
                        .from('projects')
                        .select('*, profiles!client_id(*)')
                        .eq('id', projectId)
                        .single();

                    if (!error && data) {
                        project = data;
                        // Verify PIN manually if direct query worked
                        if ((project.pin || '000000') !== pin) {
                            return { success: false, error: 'Invalid PIN (Direct Query)' };
                        }
                    } else {
                        console.error('Direct Query Error:', error);
                        projectError = error;
                    }
                }
            } else {
                // Email Login Fallback
                ({ data: project, error: projectError } = await supabase
                    .from('projects')
                    .select('*, profiles!client_id(*)')
                    .eq('client_email', projectId)
                    .limit(1)
                    .maybeSingle());

                if (project) {
                    if ((project.pin || '000000') !== pin) {
                        return { success: false, error: 'Invalid PIN' };
                    }
                }
            }

            if (!project) {
                return {
                    success: false,
                    error: 'Project not found or Invalid PIN. (Check console for details)'
                };
            }

            // Create a custom session for client
            const clientSession = {
                type: 'client',
                projectId: project.id,
                projectName: project.name,
                clientId: project.client_id,
                loginTime: new Date().toISOString()
            };

            localStorage.setItem('tde_client_session', JSON.stringify(clientSession));

            // Load client profile if exists
            if (project.profiles) {
                this.currentProfile = project.profiles;
            }

            return {
                success: true,
                project: project
            };
        } catch (error) {
            console.error('Client login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Logout current user
     */
    async logout() {
        const wasAdmin = this.isAdmin();
        const wasClient = this.isClient();

        // Sign out from Supabase
        await supabase.auth.signOut();

        // Clear client session if exists
        localStorage.removeItem('tde_client_session');
        this._clearCachedAdminProfile();
        this._clearAdminSession();

        this.currentUser = null;
        this.currentProfile = null;

        // Redirect based on previous session type
        if (wasAdmin) {
            window.location.href = 'login.html';
        } else if (wasClient) {
            window.location.href = 'client-login.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    // --- SESSION CHECKS ---

    /**
     * Check if user is authenticated as admin
     * @returns {boolean}
     */
    isAdmin() {
        if (!this.currentUser) return false;

        const adminSession = this._readAdminSession();
        if (adminSession && String(adminSession.userId) !== String(this.currentUser.id)) {
            this._clearAdminSession();
            return false;
        }

        const role = String(this.currentProfile?.role || '').toLowerCase();
        if (role === 'admin' || role === 'superadmin') {
            this._setAdminSession(this.currentUser.id);
            return true;
        }

        const cachedRole = String(this._readCachedAdminProfile(this.currentUser.id)?.role || '').toLowerCase();
        if (cachedRole === 'admin' || cachedRole === 'superadmin') {
            this._setAdminSession(this.currentUser.id);
            return true;
        }
        return false;
    }

    isSuperAdmin() {
        if (!this.currentUser) return false;
        const role = String(this.currentProfile?.role || '').toLowerCase();
        if (role === 'superadmin') return true;
        const cachedRole = String(this._readCachedAdminProfile(this.currentUser.id)?.role || '').toLowerCase();
        return cachedRole === 'superadmin';
    }

    /**
     * Check if user is authenticated as client
     * @returns {boolean}
     */
    isClient() {
        const clientSession = localStorage.getItem('tde_client_session');
        return clientSession !== null;
    }

    /**
     * Check if any user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.isAdmin() || this.isClient();
    }

    /**
     * Get current session data
     * @returns {Object|null}
     */
    getCurrentUser() {
        if (this.isAdmin()) {
            return {
                type: 'admin',
                user: this.currentUser,
                profile: this.currentProfile
            };
        } else if (this.isClient()) {
            const clientSession = JSON.parse(localStorage.getItem('tde_client_session'));
            return {
                type: 'client',
                ...clientSession
            };
        }
        return null;
    }

    /**
     * Get current client's project (if authenticated as client)
     * @returns {Promise<Object|null>}
     */
    async getClientProject() {
        if (!this.isClient()) return null;

        const clientSession = JSON.parse(localStorage.getItem('tde_client_session'));
        if (!clientSession || !clientSession.projectId) return null;

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', clientSession.projectId)
            .single();

        if (error) {
            console.error('Error fetching client project:', error);
            return null;
        }

        return data;
    }

    // --- PAGE GUARDS ---

    /**
     * Require admin authentication for current page
     * Redirects to admin-login.html if not authenticated as admin
     */
    async requireAdmin() {
        // Wait for auth to initialize
        await this.authReady;

        if (!this.isAdmin()) {
            const nextPath = `${window.location.pathname || ''}${window.location.search || ''}${window.location.hash || ''}`;
            sessionStorage.setItem('redirect_after_login', nextPath);
            window.location.href = 'login.html';
        }
    }

    async requireSuperAdmin() {
        await this.authReady;
        if (!this.isSuperAdmin()) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Require client authentication for current page
     * Redirects to client-login.html if not authenticated as client
     */
    requireClient() {
        if (!this.isClient()) {
            window.location.href = 'client-login.html';
        }
    }

    /**
     * Prevent admin from accessing client portal
     * Redirects to admin dashboard if admin tries to access client pages
     */
    preventAdminAccess() {
        if (this.isAdmin()) {
            window.location.href = 'admin-dashboard.html';
        }
    }

    /**
     * Get redirect URL after successful login
     * @returns {string}
     */
    getRedirectUrl() {
        const redirect = sessionStorage.getItem('redirect_after_login');
        sessionStorage.removeItem('redirect_after_login');
        return redirect || (this.isAdmin() ? 'index.html' : 'my-project.html');
    }

    getAdminSessionTimeRemaining() {
        const session = this._readAdminSession();
        if (!session) return 0;
        const remaining = Number(session.expiresAt) - Date.now();
        return Math.max(0, Math.floor(remaining / 60000));
    }

    // --- UTILITY METHODS ---

    /**
     * Get current user's profile
     * @returns {Object|null}
     */
    getProfile() {
        return this.currentProfile;
    }

    /**
     * Check if Supabase is connected
     * @returns {Promise<boolean>}
     */
    async isConnected() {
        try {
            const { error } = await supabase.from('profiles').select('count').limit(1);
            return !error;
        } catch {
            return false;
        }
    }
}

// Global instance
const authService = new AuthenticationService();
window.AuthService = authService;

export default authService;
