/**
 * Client Backend Service - Supabase
 * Couche backend dédiée au portail client, alignée sur le backend admin.
 */

import { supabase } from './supabase-client.js';
const CURRENT_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const CURRENT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class ClientBackendService {
    constructor() {
        this.messageSubscription = null;
        this.SESSION_KEY = 'client_session';
        this.LEGACY_SESSION_KEY = 'tde_client_session';
        this.PIN_KEY = 'client_pin';
    }

    // --- SESSION CONTEXT ---

    getSession() {
        const raw = sessionStorage.getItem(this.SESSION_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    getLegacySession() {
        const raw = localStorage.getItem(this.LEGACY_SESSION_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    getProjectId() {
        return this.getSession()?.projectId || this.getLegacySession()?.projectId || null;
    }

    getClientPin() {
        return sessionStorage.getItem(this.PIN_KEY) || null;
    }

    _isAbortError(error) {
        const name = String(error?.name || '');
        const message = String(error?.message || '').toLowerCase();
        const hint = String(error?.hint || '').toLowerCase();
        return name === 'AbortError' || message.includes('aborted') || hint.includes('aborted');
    }

    async _rpcViaRest(functionName, args = {}) {
        if (!CURRENT_SUPABASE_URL || !CURRENT_SUPABASE_ANON_KEY) {
            throw new Error('Supabase config manquante pour fallback REST.');
        }

        const response = await fetch(`${CURRENT_SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
            method: 'POST',
            headers: {
                apikey: CURRENT_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${CURRENT_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify(args || {})
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            const message =
                payload?.message ||
                payload?.error_description ||
                payload?.error ||
                `RPC ${functionName} failed (${response.status})`;
            throw {
                message,
                details: payload?.details || null,
                hint: payload?.hint || null,
                code: payload?.code || String(response.status)
            };
        }

        return payload;
    }

    async _rpc(functionName, args = {}) {
        try {
            const { data, error } = await supabase.rpc(functionName, args);
            if (error) throw error;
            return data;
        } catch (error) {
            if (!this._isAbortError(error)) throw error;
            try {
                return await this._rpcViaRest(functionName, args);
            } catch (restError) {
                throw restError;
            }
        }
    }

    _isMissingRpc(error) {
        const message = String(error?.message || '').toLowerCase();
        return message.includes('could not find the function') || message.includes('function') && message.includes('not found');
    }

    // --- AUTH / ACCESS ---

    /**
     * Authentifie un client via RPC login_client
     * puis crée une session locale utilisée par le portail client.
     */
    async loginWithProjectPin(projectId, pin, rememberProjectId = false) {
        try {
            const data = await this._rpc('login_client', {
                p_id: projectId,
                p_pin: pin
            });
            if (!data) {
                return { success: false, error: 'Project ID ou PIN invalide.' };
            }

            const session = {
                projectId: data.id,
                loginTime: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            };

            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
            sessionStorage.setItem(this.PIN_KEY, pin);

            if (rememberProjectId) {
                localStorage.setItem('client_project_id', data.id);
            }

            // Compatibilité avec les flux existants basés sur AuthService
            localStorage.setItem(this.LEGACY_SESSION_KEY, JSON.stringify({
                type: 'client',
                projectId: data.id,
                projectName: data.name || '',
                clientId: data.client_id || null,
                loginTime: new Date().toISOString()
            }));

            return { success: true, project: data };
        } catch (error) {
            console.error('Client login error:', error);
            if (this._isAbortError(error)) {
                return { success: false, error: 'Connexion interrompue. Vérifiez votre réseau puis réessayez.' };
            }
            return { success: false, error: error.message || 'Erreur de connexion client.' };
        }
    }

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.PIN_KEY);
        localStorage.removeItem(this.LEGACY_SESSION_KEY);
    }

    // --- PROJECT ---

    async getProject(projectId = this.getProjectId(), pin = this.getClientPin()) {
        if (!projectId || !pin) return null;

        try {
            const data = await this._rpc('get_project_details_for_client', {
                p_id: projectId,
                p_pin: pin
            });
            return data || null;
        } catch (error) {
            console.error('Error fetching client project:', error);
            return null;
        }
    }

    async getDashboardSummary(projectId = this.getProjectId()) {
        if (!projectId) return null;

        const [project, phases, documents, tickets] = await Promise.all([
            this.getProject(projectId),
            this.getTimeline(projectId),
            this.getDocuments(projectId),
            this.getTickets(projectId)
        ]);

        return {
            project,
            phases,
            documents,
            tickets,
            stats: {
                phasesCount: phases.length,
                completedPhases: phases.filter((p) => p.status === 'completed').length,
                documentsCount: documents.length,
                openTickets: tickets.filter((t) => ['open', 'active'].includes((t.status || '').toLowerCase())).length
            }
        };
    }

    // --- TIMELINE / PHASES ---

    async getTimeline(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return [];

        try {
            const data = await this._rpc('get_client_timeline', { p_id: projectId, p_pin: pin });
            const phases = Array.isArray(data) ? data : [];
            return await this._attachProjectImagesToPhases(projectId, phases);
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.warn('RPC get_client_timeline failed, using fallback query:', error.message);
            }
        }

        // Secondary fallback: some DB versions expose phases via project details RPC.
        try {
            const project = await this.getProject(projectId, pin);
            const embeddedPhases = Array.isArray(project?.phases) ? project.phases : [];
            if (embeddedPhases.length > 0) {
                return await this._attachProjectImagesToPhases(projectId, embeddedPhases);
            }
        } catch (error) {
            console.warn('Embedded phases fallback failed:', error.message);
        }

        // Fallback for environments without RPC
        try {
            const [{ data: phases, error: phasesError }, { data: images, error: imagesError }] = await Promise.all([
                supabase
                    .from('phases')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('start_date', { ascending: true }),
                supabase
                    .from('project_images')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('uploaded_at', { ascending: false })
            ]);

            if (phasesError) throw phasesError;
            if (imagesError) {
                console.warn('Project images fallback query failed:', imagesError.message);
            }

            const safeImages = Array.isArray(images) ? images : [];
            return this._mergeImagesIntoPhases(phases || [], safeImages);
        } catch (error) {
            console.error('Error fetching timeline fallback:', error);
            return [];
        }
    }

    async getProjectImages(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return [];

        try {
            const data = await this._rpc('get_client_project_images', { p_id: projectId, p_pin: pin });
            if (Array.isArray(data)) return data;
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.warn('RPC get_client_project_images failed:', error.message);
            }
        }

        try {
            const { data, error } = await supabase
                .from('project_images')
                .select('*')
                .eq('project_id', projectId)
                .order('uploaded_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.warn('Fallback get project images failed:', error.message);
            return [];
        }
    }

    async getAdminEvents(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return [];

        try {
            const data = await this._rpc('get_client_admin_events', {
                p_id: projectId,
                p_pin: pin
            });
            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.warn('RPC get_client_admin_events failed:', error.message);
            }
            return [];
        }
    }

    async _attachProjectImagesToPhases(projectId, phases) {
        const safePhases = Array.isArray(phases) ? phases : [];
        const images = await this.getProjectImages(projectId);
        return this._mergeImagesIntoPhases(safePhases, images);
    }

    _mergeImagesIntoPhases(phases, images) {
        const safeImages = Array.isArray(images) ? images : [];
        return (phases || []).map((phase) => {
            const byId = safeImages.filter((img) => img.phase_id && String(img.phase_id) === String(phase.id));
            const byName = safeImages.filter((img) => {
                const imgPhaseName = String(img.phase_name || '').trim().toLowerCase();
                const phaseName = String(phase.name || phase.title || '').trim().toLowerCase();
                return !img.phase_id && imgPhaseName && phaseName && imgPhaseName === phaseName;
            });
            const existing = Array.isArray(phase.photos) ? phase.photos : [];
            const mapped = [...byId, ...byName].map((img) => ({
                id: img.id,
                url: img.url,
                thumbnail_url: img.thumbnail_url || null,
                caption: img.caption || 'Photo chantier'
            }));

            const dedup = [];
            const seen = new Set();
            for (const photo of [...existing, ...mapped]) {
                const key = `${photo.id || ''}::${photo.url || ''}`;
                if (seen.has(key)) continue;
                seen.add(key);
                dedup.push(photo);
            }

            return { ...phase, photos: dedup };
        });
    }

    // --- DOCUMENTS ---

    async getDocuments(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return [];

        try {
            const data = await this._rpc('get_client_documents', { p_id: projectId, p_pin: pin });
            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error fetching documents via RPC:', error);
                return [];
            }
        }

        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('project_id', projectId)
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching documents fallback:', error);
            return [];
        }
    }

    async getSignedDocumentUrl(publicUrl, expiresInSeconds = 300) {
        if (!publicUrl) return { success: false, error: 'URL document manquante.' };

        try {
            const urlObj = new URL(publicUrl, window.location.origin);
            const publicMarker = '/storage/v1/object/public/';
            const signedMarker = '/storage/v1/object/sign/';
            let marker = publicMarker;
            let markerIndex = urlObj.pathname.indexOf(publicMarker);

            if (markerIndex === -1) {
                marker = signedMarker;
                markerIndex = urlObj.pathname.indexOf(signedMarker);
            }
            if (markerIndex === -1) {
                return { success: false, error: 'URL document invalide.' };
            }

            const remainder = urlObj.pathname.substring(markerIndex + marker.length);
            const [bucketName, ...pathParts] = remainder.split('/');
            const filePath = pathParts.join('/');
            if (!bucketName || !filePath) {
                return { success: false, error: 'URL document invalide.' };
            }
            const rewrittenPublicUrl = `${CURRENT_SUPABASE_URL}/storage/v1/object/public/project-documents/${filePath}`;

            const bucketsToTry = Array.from(new Set([
                'project-documents',
                bucketName,
                'documents',
                'project_documents'
            ]));

            const collectedErrors = [];
            for (const targetBucket of bucketsToTry) {
                const { data, error } = await supabase.storage
                    .from(targetBucket)
                    .createSignedUrl(filePath, expiresInSeconds);

                if (!error && data?.signedUrl) {
                    return { success: true, url: data.signedUrl, bucket: targetBucket, publicUrl: rewrittenPublicUrl };
                }

                const msg = String(error?.message || '').toLowerCase();
                collectedErrors.push(`${targetBucket}: ${error?.message || 'Unknown error'}`);

                // Keep trying other buckets for common storage mismatches.
                const retryable =
                    msg.includes('bucket not found') ||
                    msg.includes('object not found') ||
                    msg.includes('resource was not found') ||
                    msg.includes('not found') ||
                    error?.statusCode === '400';

                if (!retryable) {
                    return { success: false, error: error?.message || 'Erreur signature URL' };
                }
            }

            // Last-resort fallback: rewrite host to current project host
            if (CURRENT_SUPABASE_URL) {
                return { success: true, url: rewrittenPublicUrl, bucket: 'project-documents', publicUrl: rewrittenPublicUrl };
            }

            return {
                success: false,
                error: `Impossible de signer le document. Essais: ${collectedErrors.join(' | ')}`
            };
        } catch (error) {
            console.error('Error creating signed document URL:', error);
            return { success: false, error: error.message };
        }
    }

    // --- CHAT / MESSAGES ---

    async getMessages(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return [];

        try {
            const data = await this._rpc('get_client_messages', { p_id: projectId, p_pin: pin });
            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error fetching messages via RPC:', error);
                return [];
            }
        }

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching messages fallback:', error);
            return [];
        }
    }

    async sendMessage(content, options = {}) {
        const projectId = options.projectId || this.getProjectId();
        const pin = this.getClientPin();
        if (!projectId || !pin) return { success: false, error: 'Projet client introuvable.' };

        try {
            const data = await this._rpc('send_client_message', {
                p_id: projectId,
                p_pin: pin,
                p_content: (content || '').trim(),
                p_sender_name: options.senderName || 'Client',
                p_photo_url: options.photoUrl || null
            });
            return { success: true, data };
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error sending message via RPC:', error);
                return { success: false, error: error.message };
            }
        }

        const payload = {
            project_id: projectId,
            sender_id: null,
            sender_role: 'client',
            sender_name: options.senderName || 'Client',
            content: (content || '').trim()
        };

        if (options.photoUrl) payload.photo_url = options.photoUrl;

        try {
            const insert = await supabase
                .from('messages')
                .insert(payload)
                .select()
                .single();

            if (insert.error) throw insert.error;
            return { success: true, data: insert.data };
        } catch (error) {
            console.error('Error sending message fallback:', error);
            return { success: false, error: error.message };
        }
    }

    async markAdminMessagesAsRead(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return;

        try {
            await this._rpc('mark_client_messages_read', { p_id: projectId, p_pin: pin });
            return;
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error marking messages as read via RPC:', error);
                return;
            }
        }

        try {
            const { error } = await supabase
                .from('messages')
                .update({ read: true })
                .eq('project_id', projectId)
                .eq('sender_role', 'admin');

            if (error) {
                const msg = String(error.message || '').toLowerCase();
                if (!msg.includes('read') && !msg.includes('schema cache')) {
                    console.error('Error marking admin messages as read (fallback):', error);
                }
            }
        } catch (error) {
            const msg = String(error?.message || '').toLowerCase();
            if (!msg.includes('read') && !msg.includes('schema cache')) {
                console.error('Error marking admin messages as read (fallback):', error);
            }
        }
    }

    subscribeToProjectMessages(projectId, callback) {
        this.unsubscribeMessages();
        this.messageSubscription = supabase
            .channel(`client-messages:${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => callback(payload.new)
            )
            .subscribe();
    }

    unsubscribeMessages() {
        if (this.messageSubscription) {
            supabase.removeChannel(this.messageSubscription);
            this.messageSubscription = null;
        }
    }

    // --- TICKETS ---

    async getTickets(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return [];

        try {
            const data = await this._rpc('get_client_tickets', { p_id: projectId, p_pin: pin });
            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error fetching tickets via RPC:', error);
                return [];
            }
        }

        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching tickets fallback:', error);
            return [];
        }
    }

    async createTicket(ticket, projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return { success: false, error: 'Projet client introuvable.' };

        try {
            const data = await this._rpc('create_client_ticket', {
                p_id: projectId,
                p_pin: pin,
                p_title: ticket.title?.trim() || ticket.subject?.trim() || 'Nouveau ticket',
                p_description: ticket.description?.trim() || ticket.message?.trim() || '',
                p_priority: ticket.priority || 'medium',
                p_tags: ticket.tags || []
            });
            return { success: true, data };
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error creating ticket via RPC:', error);
                return { success: false, error: error.message };
            }
        }

        const payload = {
            project_id: projectId,
            title: ticket.title?.trim() || ticket.subject?.trim() || 'Nouveau ticket',
            description: ticket.description?.trim() || ticket.message?.trim() || '',
            priority: ticket.priority || 'medium',
            status: ticket.status || 'open'
        };

        try {
            let { data, error } = await supabase
                .from('tickets')
                .insert(payload)
                .select()
                .single();

            if (error) {
                const message = String(error.message || '').toLowerCase();
                if (message.includes('created_by') && message.includes('null')) {
                    const { data: projectMeta } = await supabase
                        .from('projects')
                        .select('created_by')
                        .eq('id', projectId)
                        .maybeSingle();

                    if (projectMeta?.created_by) {
                        const retry = await supabase
                            .from('tickets')
                            .insert({ ...payload, created_by: projectMeta.created_by })
                            .select()
                            .single();
                        data = retry.data;
                        error = retry.error;
                    }
                }
            }

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating ticket fallback:', error);
            return { success: false, error: error.message };
        }
    }

    // --- PROFILE ---

    async getClientProfile(projectId = this.getProjectId()) {
        const pin = this.getClientPin();
        if (!projectId || !pin) return null;

        try {
            const data = await this._rpc('get_client_profile', { p_id: projectId, p_pin: pin });
            if (data) return data;
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error fetching client profile via RPC:', error);
                return null;
            }
        }

        // Fallback for environments without RPC
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, client_name, client_email, client_photo_url, client_contact_preferences')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            console.error('Error fetching project for profile:', projectError);
            return null;
        }

        let linkedClientId = null;
        const { data: member } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId)
            .not('user_id', 'is', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (member?.user_id) {
            linkedClientId = member.user_id;
        }

        if (linkedClientId) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', linkedClientId)
                .single();

            if (!error && profile) {
                return {
                    ...profile,
                    name: profile.name || profile.full_name || project.client_name || 'Client',
                    email: profile.email || project.client_email || '',
                    photo_url: profile.photo_url || profile.avatar_url || project.client_photo_url || null,
                    contactPreferences: project.client_contact_preferences || null
                };
            }
        }

        return {
            id: linkedClientId,
            name: project.client_name || 'Client',
            email: project.client_email || '',
            phone: '',
            photo_url: project.client_photo_url || null,
            contactPreferences: project.client_contact_preferences || null
        };
    }

    async updateClientProfile(clientId, updates) {
        const projectId = this.getProjectId();
        const pin = this.getClientPin();
        if (!projectId || !pin) return { success: false, error: 'Contexte projet invalide.' };

        try {
            const data = await this._rpc('update_client_profile', {
                p_id: projectId,
                p_pin: pin,
                p_name: updates.name || null,
                p_email: updates.email || null,
                p_phone: updates.phone || null,
                p_company: updates.company || null
            });

            if (updates.contactPreferences) {
                try {
                    await this._rpc('update_client_profile_preferences', {
                        p_id: projectId,
                        p_pin: pin,
                        p_contact_preferences: updates.contactPreferences
                    });
                } catch (prefsError) {
                    if (!this._isMissingRpc(prefsError)) {
                        console.warn('Could not update contact preferences via RPC:', prefsError);
                    }
                }
            }

            return { success: true, data };
        } catch (error) {
            if (!this._isMissingRpc(error)) {
                console.error('Error updating profile via RPC:', error);
                return { success: false, error: error.message };
            }
        }

        if (!clientId) {
            try {
                const { error } = await supabase
                    .from('projects')
                    .update({
                        client_name: updates.name || null,
                        client_email: updates.email || null,
                        client_phone: updates.phone || null,
                        client_contact_preferences: updates.contactPreferences || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', projectId);

                if (error) throw error;
                return { success: true, data: await this.getClientProfile(projectId) };
            } catch (fallbackProjectError) {
                console.error('Error updating project-based client profile fallback:', fallbackProjectError);
                return { success: false, error: fallbackProjectError.message };
            }
        }

        const payload = {
            full_name: updates.name || null,
            email: updates.email || null,
            phone: updates.phone || null,
            company: updates.company || null
        };

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', clientId)
                .select()
                .single();
            if (error) throw error;

            if (updates.contactPreferences) {
                await supabase
                    .from('projects')
                    .update({ client_contact_preferences: updates.contactPreferences, updated_at: new Date().toISOString() })
                    .eq('id', projectId);
            }

            return { success: true, data: { ...data, contactPreferences: updates.contactPreferences || null } };
        } catch (error) {
            console.error('Error updating client profile fallback:', error);
            return { success: false, error: error.message };
        }
    }

    async uploadClientProfilePhoto(file) {
        const projectId = this.getProjectId();
        const pin = this.getClientPin();
        if (!projectId || !pin) {
            return { success: false, error: 'Session client invalide.' };
        }
        if (!file || !file.type?.startsWith('image/')) {
            return { success: false, error: 'Veuillez sélectionner une image valide.' };
        }
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: 'Image trop volumineuse (max 5MB).' };
        }

        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const filename = `${projectId}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('profile-photos')
                .upload(filename, file, { upsert: true, cacheControl: '3600' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profile-photos')
                .getPublicUrl(filename);

            try {
                await this._rpc('update_client_profile_photo', {
                    p_id: projectId,
                    p_pin: pin,
                    p_photo_url: publicUrl
                });
            } catch (rpcError) {
                if (!this._isMissingRpc(rpcError)) throw rpcError;
                try {
                    await supabase
                        .from('projects')
                        .update({ client_photo_url: publicUrl, updated_at: new Date().toISOString() })
                        .eq('id', projectId);
                } catch (fallbackError) {
                    console.warn('Fallback project photo update failed:', fallbackError);
                }
            }

            return { success: true, photoUrl: publicUrl };
        } catch (error) {
            console.error('Error uploading client profile photo:', error);
            return { success: false, error: error.message || 'Upload impossible.' };
        }
    }

    // --- UTILS ---

    async checkConnection() {
        try {
            const { error } = await supabase.from('profiles').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    }
}

const clientBackendService = new ClientBackendService();
window.ClientBackendService = clientBackendService;

export default clientBackendService;
