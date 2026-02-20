/**
 * Data Store Service - Supabase Edition
 * Manages complex project data using Supabase Database
 */

import { supabase } from './supabase-client.js';
import Toast from './components/toast.js';

class ProjectStore {
    constructor() {
        this.projects = [];
        this._loadProjects();
    }

    async _loadProjects() {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading projects:', error);
            return;
        }

        this.projects = data || [];
    }

    // --- CORE CRUD OPERATIONS ---

    /**
     * Get all projects
     * @returns {Promise<Array>}
     */
    async getAll() {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            return [];
        }

        this.projects = data || [];
        return this.projects;
    }

    /**
     * Get project by ID
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
        // Determine if we are Admin (Authenticated) or Client (Anon/ID-PIN)
        const session = await supabase.auth.getSession();
        const isAdmin = session?.data?.session?.user;

        if (isAdmin) {
            // ADMIN: Full Access via standard Select (RLS Policy allows this)
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching project (Admin):', error);
                return null;
            }
            return data;
        } else {
            // CLIENT: Use Secure RPC to bypass RLS safely and hide confidential fields
            // We need the PIN from session storage to authenticate the request
            const pin = sessionStorage.getItem('client_pin');

            if (!pin) {
                console.error('No PIN found for client access');
                return null;
            }

            const { data, error } = await supabase
                .rpc('get_project_details_for_client', {
                    p_id: id,
                    p_pin: pin
                });

            if (error) {
                console.error('Error fetching project (Client RPC):', error);
                return null;
            }
            return data; // Returns JSON object from RPC
        }
    }

    /**
     * Add new project
     * @param {Object} project 
     * @returns {Promise<Object>}
     */
    async add(project) {
        // Prepare project data
        const projectData = {
            id: project.id,
            client_id: project.client_id || null,
            name: project.name,
            client_name: project.client || project.client_name,
            client_email: project.email || project.client_email,
            location: project.location,
            type: project.type,
            status: project.status || 'planning',
            progress: project.progress || 0,
            budget: project.budget,
            start_date: project.startDate || project.start_date,
            end_date: project.deliveryDate || project.end_date,
            manager: project.manager,
            pin: project.pin || '000000',
            description: project.description,
            phases: project.phases || [],
            documents: project.documents || []
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(projectData)
            .select()
            .single();

        if (error) {
            console.error('Error adding project:', error);

            // Check for Schema Mismatch (Missing Columns)
            if (error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the'))) {
                console.error('CRITICAL DATABASE ERROR: Schema Mismatch');
                Toast.error('CRITICAL DATABASE ERROR: Schema Mismatch. Check console for details.', 10000);
            }

            throw new Error(error.message);
        }

        // Add initial log
        await this.addLog(data.id, 'Project Initialized');

        await this._loadProjects();
        return data;
    }

    /**
     * Create new project (modern API for create-project.html form)
     * @param {Object} projectData 
     * @returns {Promise<Object>} { success, projectId, error }
     */
    async create(projectData) {
        try {
            // Get current user ID for created_by
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return {
                    success: false,
                    error: 'User not authenticated'
                };
            }

            // Use provided UUID or generate one
            const projectId = projectData.project_uuid || (crypto.randomUUID ? crypto.randomUUID() : this._generateId());

            // Prepare data for INSERT (only columns that exist in projects table)
            const normalized = {
                id: projectId,
                name: projectData.name,
                description: projectData.description,
                project_type: projectData.project_type,
                client_name: projectData.client_name,
                client_email: projectData.client_email,
                client_phone: projectData.client_phone || null,
                project_manager: projectData.project_manager || null,
                manager_email: projectData.manager_email || null,
                start_date: projectData.start_date,
                end_date: projectData.end_date,
                budget: projectData.budget || null,
                access_pin: projectData.access_pin,
                status: projectData.status || 'planning',
                progress: projectData.progress || 0,
                created_by: user.id
            };

            // Insert into database
            let insertPayload = { ...normalized };
            if (projectData.location) {
                insertPayload.location = projectData.location;
            }

            let { data, error } = await supabase
                .from('projects')
                .insert([insertPayload])
                .select()
                .single();

            if (error && error.message && error.message.includes('location')) {
                const { location, ...retryPayload } = insertPayload;
                const retry = await supabase
                    .from('projects')
                    .insert([retryPayload])
                    .select()
                    .single();
                data = retry.data;
                error = retry.error;
            }

            if (error) {
                console.error('Error creating project:', error);
                return {
                    success: false,
                    error: error.message || 'Failed to create project'
                };
            }

            // Add activity log if available
            if (this.addLog) {
                try {
                    await this.addLog(data.id, `Project created by admin: ${data.name}`);
                } catch (logError) {
                    console.warn('Could not add log:', logError);
                }
            }

            // Reload projects
            await this._loadProjects();

            return {
                success: true,
                projectId: data.id,
                project: data
            };
        } catch (error) {
            console.error('Create project error:', error);
            return {
                success: false,
                error: error.message || 'Unexpected error creating project'
            };
        }
    }

    /**
     * Helper: Generate UUID if crypto not available
     */
    _generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Update project
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object|null>}
     */
    async update(id, updates) {
        // Convert field names if needed
        const updateData = {};

        if (updates.name) updateData.name = updates.name;
        if (updates.location) updateData.location = updates.location;
        if (updates.status) updateData.status = updates.status;
        if (updates.progress !== undefined) updateData.progress = updates.progress;
        if (updates.budget !== undefined) updateData.budget = updates.budget;
        if (updates.startDate) updateData.start_date = updates.startDate;
        if (updates.deliveryDate) updateData.end_date = updates.deliveryDate;
        if (updates.manager) updateData.manager = updates.manager;
        if (updates.description) updateData.description = updates.description;
        if (updates.phases) updateData.phases = updates.phases;
        if (updates.documents) updateData.documents = updates.documents;
        if (updates.project_type) updateData.project_type = updates.project_type;
        if (updates.client_name) updateData.client_name = updates.client_name;
        if (updates.client_email) updateData.client_email = updates.client_email;
        if (updates.client_phone !== undefined) updateData.client_phone = updates.client_phone;
        if (updates.project_manager) updateData.project_manager = updates.project_manager;
        if (updates.manager_email !== undefined) updateData.manager_email = updates.manager_email;
        if (updates.start_date) updateData.start_date = updates.start_date;
        if (updates.end_date) updateData.end_date = updates.end_date;
        if (updates.access_pin) updateData.access_pin = updates.access_pin;

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating project:', error);
            return { success: false, error: error.message };
        }

        // Add logs for significant changes
        if (updates.status) {
            await this.addLog(id, `Status changed to ${updates.status}`);
        }
        if (updates.progress !== undefined) {
            await this.addLog(id, `Progress updated to ${updates.progress}%`);
        }

        await this._loadProjects();
        return { success: true, data };
    }

    /**
     * Delete project
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);

            // Check for Schema Mismatch (Missing Columns)
            if (error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the'))) {
                console.error('CRITICAL DATABASE ERROR: Schema Mismatch');
                Toast.error('CRITICAL DATABASE ERROR: Schema Mismatch. Check console for details.', 10000);
            }

            throw new Error(error.message);
        }

        await this._loadProjects();
        return true;
    }

    // --- PHASES ---

    /**
     * Update phase status
     * @param {string} projectId 
     * @param {number} phaseId 
     * @param {string} status 
     */
    async updatePhase(projectId, phaseId, status) {
        const project = await this.getById(projectId);
        if (!project) return;

        const phases = project.phases || [];
        const phase = phases.find(p => p.id == phaseId);

        if (phase) {
            phase.status = status;
            await this.update(projectId, { phases });
            await this.addLog(projectId, `Phase "${phase.name}" marked as ${status}`);
        }
    }

    /**
     * Upload file to Supabase Storage
     * @param {File} file 
     * @param {string} bucket 
     * @returns {Promise<string>} Public URL
     */
    async uploadFile(file, bucket) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) {
            console.error(`Error uploading to ${bucket}:`, error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    }

    // --- IMAGES ---

    /**
     * Add image to project
     * @param {string} projectId 
     * @param {Object} imageObj 
     */
    async addImage(projectId, imageObj) {
        let url = imageObj.src;
        let thumbnailUrl = imageObj.thumbnailUrl || null;

        try {
            if (imageObj.fullFile) {
                url = await this.uploadFile(imageObj.fullFile, 'project-images');
            } else if (imageObj.file) {
                url = await this.uploadFile(imageObj.file, 'project-images');
            }

            if (imageObj.thumbnailFile) {
                thumbnailUrl = await this.uploadFile(imageObj.thumbnailFile, 'project-images');
            }
        } catch (err) {
            console.error('Failed to upload image', err);
        }

        let { data, error } = await supabase
            .from('project_images')
            .insert({
                project_id: projectId,
                url: url,
                thumbnail_url: thumbnailUrl,
                caption: imageObj.caption,
                phase_id: imageObj.phase_id || null,
                phase_name: imageObj.phase_name || null
            })
            .select()
            .single();

        if (error && error.message && (error.message.includes('thumbnail_url') || error.message.includes('phase_id') || error.message.includes('phase_name'))) {
            const retry = await supabase
                .from('project_images')
                .insert({
                    project_id: projectId,
                    url: url,
                    caption: imageObj.caption
                })
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            console.error('Error adding image:', error);
            return;
        }

        await this.addLog(projectId, `New image uploaded: ${imageObj.caption}`);
    }

    /**
     * Delete image by id
     * @param {string} imageId
     */
    async deleteImage(imageId) {
        const { error } = await supabase
            .from('project_images')
            .delete()
            .eq('id', imageId);

        if (error) {
            console.error('Error deleting image:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    /**
     * Get images for project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getImages(projectId) {
        const { data, error } = await supabase
            .from('project_images')
            .select('*')
            .eq('project_id', projectId)
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching images:', error);
            return [];
        }

        return data || [];
    }

    // --- TICKETS ---

    /**
     * Add ticket to project
     * @param {string} projectId 
     * @param {Object} ticket 
     */
    async addTicket(projectId, ticket) {
        const { data, error } = await supabase
            .from('tickets')
            .insert({
                project_id: projectId,
                subject: ticket.subject,
                message: ticket.description || ticket.message || '',
                priority: ticket.priority || 'medium',
                status: ticket.status || 'active',
                created_by: ticket.created_by || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding ticket:', error);
            return;
        }

        await this.addLog(projectId, `New Ticket: ${ticket.subject}`);
    }

    /**
     * Update ticket status
     * @param {string} projectId 
     * @param {string} ticketId 
     * @param {string} status 
     */
    async updateTicket(projectId, ticketId, status) {
        const { error } = await supabase
            .from('tickets')
            .update({ status })
            .eq('id', ticketId);

        if (error) {
            console.error('Error updating ticket:', error);
            return;
        }

        await this.addLog(projectId, `Ticket status updated to ${status}`);
    }

    /**
     * Get tickets for project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getTickets(projectId) {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
            return [];
        }

        return data || [];
    }

    // --- LOGS ---

    /**
     * Add activity log
     * @param {string} projectId 
     * @param {string} action 
     * @param {string} user 
     */
    async addLog(projectId, action, user = 'Admin') {
        const { error } = await supabase
            .from('activity_logs')
            .insert({
                project_id: projectId,
                action: action,
                user: user
            });

        if (error) {
            console.error('Error adding log:', error);
        }
    }

    /**
     * Get activity logs for project
     * @param {string} projectId 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async getLogs(projectId, limit = 50) {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching logs:', error);
            return [];
        }

        return data || [];
    }

    // --- CRM HELPERS ---

    /**
     * Get all clients
     * @returns {Promise<Array>}
     */
    async getAllClients() {
        const projects = await this.getAll();

        return projects.map(p => ({
            name: p.client_name,
            email: p.client_email,
            projectId: p.id,
            projectName: p.name,
            location: p.location,
            status: p.status
        }));
    }

    /**
     * Get all tickets across all projects
     * @returns {Promise<Array>}
     */
    async getAllTickets() {
        const { data, error } = await supabase
            .from('tickets')
            .select('*, projects(id, name, client_name)')
            .order('status', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all tickets:', error);
            return [];
        }

        return data.map(t => ({
            ...t,
            projectId: t.projects?.id,
            projectName: t.projects?.name,
            client: t.projects?.client_name
        }));
    }

    // --- AUTH & STATS ---

    /**
     * Authenticate client with project ID and PIN
     * @param {string} id 
     * @param {string} pin 
     * @returns {Promise<Object|null>}
     */
    async authenticate(id, pin) {
        const project = await this.getById(id);
        if (project && project.pin === pin) {
            return project;
        }
        return null;
    }

    /**
     * Get project statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        const projects = await this.getAll();

        const total = projects.length;
        const active = projects.filter(p => p.status === 'in_progress').length;
        const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);

        return { total, active, totalBudget };
    }

    // --- MIGRATION HELPER ---

    /**
     * Migrate data from localStorage to Supabase
     * This should be run once to transfer existing data
     */
    async migrateFromLocalStorage() {
        const STORAGE_KEY = 'tde_projects_v2';
        const localData = localStorage.getItem(STORAGE_KEY);

        if (!localData) {
            console.log('No localStorage data to migrate');
            return;
        }

        const projects = JSON.parse(localData);
        console.log(`Migrating ${projects.length} projects...`);

        for (const project of projects) {
            try {
                await this.add(project);
                console.log(`✓ Migrated: ${project.name}`);
            } catch (error) {
                console.error(`✗ Failed to migrate ${project.name}:`, error);
            }
        }

        console.log('Migration complete!');
    }
}

// Global instance
const projectStore = new ProjectStore();
window.ProjectStore = projectStore;

export default projectStore;
