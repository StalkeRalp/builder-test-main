/**
 * Authentication Service - Supabase Edition
 * Manages Admin and Client authentication using Supabase Auth
 */

import { supabase } from './supabase-client.js';

class AuthenticationService {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
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
                await this._loadUserProfile(session.user.id);
            } else {
                this.currentUser = null;
                this.currentProfile = null;
            }
        });
    }

    async _loadUserProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error loading profile:', error);
            return;
        }

        this.currentProfile = data;
        this.currentUser = (await supabase.auth.getUser()).data.user;
    }

    // --- AUTHENTICATION METHODS ---

    /**
     * Admin Login using Supabase Auth
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} { success, error, user }
     */
    async loginAdmin(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Verify user is admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError || profile.role !== 'admin') {
                await supabase.auth.signOut();
                return {
                    success: false,
                    error: 'Access denied. Admin credentials required.'
                };
            }

            this.currentUser = data.user;
            this.currentProfile = profile;

            return {
                success: true,
                user: data.user,
                profile: profile
            };
        } catch (error) {
            console.error('Admin login error:', error);
            return {
                success: false,
                error: error.message
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
        return this.currentProfile && this.currentProfile.role === 'admin';
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
            sessionStorage.setItem('redirect_after_login', window.location.pathname);
            window.location.href = 'login.html';
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
        return redirect || (this.isAdmin() ? 'admin-dashboard.html' : 'client-dashboard.html');
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
