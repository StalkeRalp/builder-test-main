/**
 * Client Service - Supabase Edition
 * Manages client/project member relationships
 */

import { supabase } from './supabase-client.js';

class ClientService {
    constructor() {
        this.clients = [];
    }

    /**
     * Get all unique clients (from projects)
     * @returns {Promise<Array>}
     */
    async getAll() {
        const { data, error } = await supabase
            .from('projects')
            .select('id, client_name, client_email, client_phone')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching clients:', error);
            return [];
        }

        // Remove duplicates based on client_email
        const uniqueClients = [];
        const seenEmails = new Set();

        for (const project of data || []) {
            if (project.client_email && !seenEmails.has(project.client_email)) {
                seenEmails.add(project.client_email);
                uniqueClients.push({
                    email: project.client_email,
                    name: project.client_name,
                    phone: project.client_phone,
                    project_id: project.id
                });
            }
        }

        this.clients = uniqueClients;
        return this.clients;
    }

    /**
     * Get projects for a client
     * @param {string} clientEmail 
     * @returns {Promise<Array>}
     */
    async getProjectsByEmail(clientEmail) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('client_email', clientEmail)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching client projects:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get a single client by email
     * @param {string} email 
     * @returns {Promise<Object|null>}
     */
    async getByEmail(email) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('client_email', email)
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching client:', error);
            return null;
        }

        return {
            email: data.client_email,
            name: data.client_name,
            phone: data.client_phone
        };
    }

    /**
     * Get clients by project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getByProjectId(projectId) {
        const { data, error } = await supabase
            .from('project_members')
            .select('*')
            .eq('project_id', projectId);

        if (error) {
            console.error('Error fetching project members:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Add a member to a project
     * @param {Object} member 
     * @returns {Promise<Object>}
     */
    async addProjectMember(member) {
        try {
            const memberData = {
                project_id: member.project_id,
                user_id: member.user_id || null,
                email: member.email?.trim() || '',
                role: member.role || 'client',
                name: member.name?.trim() || ''
            };

            const { data, error } = await supabase
                .from('project_members')
                .insert(memberData)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error adding member:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove a member from a project
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async removeProjectMember(id) {
        try {
            const { error } = await supabase
                .from('project_members')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error removing member:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search clients by name or email
     * @param {string} query 
     * @returns {Promise<Array>}
     */
    async search(query) {
        const allClients = await this.getAll();
        const lowerQuery = query.toLowerCase();

        return allClients.filter(client =>
            client.name.toLowerCase().includes(lowerQuery) ||
            client.email.toLowerCase().includes(lowerQuery)
        );
    }
}

export default new ClientService();
