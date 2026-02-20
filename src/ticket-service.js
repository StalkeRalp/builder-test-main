/**
 * Ticket Service - Supabase Edition
 * Manages support tickets
 */

import { supabase } from './supabase-client.js';

class TicketService {
    constructor() {
        this.tickets = [];
    }

    _normalizeTicket(ticket) {
        if (!ticket) return ticket;
        const statusRaw = String(ticket.status || 'open').toLowerCase();
        const normalizedStatus = statusRaw === 'in-progress' ? 'in_progress' : statusRaw;
        return {
            ...ticket,
            title: ticket.title || ticket.subject || 'Ticket',
            description: ticket.description || ticket.message || '',
            created_by_display:
                ticket.created_by_email ||
                ticket.created_by ||
                ticket.sender_name ||
                (ticket.created_by_role ? `(${ticket.created_by_role})` : 'Client'),
            status: normalizedStatus
        };
    }

    /**
     * Get all tickets
     * @param {Object} filters 
     * @returns {Promise<Array>}
     */
    async getAll(filters = {}) {
        let query = supabase
            .from('tickets')
            .select('*');

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.priority) {
            query = query.eq('priority', filters.priority);
        }

        if (filters.project_id) {
            query = query.eq('project_id', filters.project_id);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
            return [];
        }

        this.tickets = (data || []).map((ticket) => this._normalizeTicket(ticket));
        return this.tickets;
    }

    /**
     * Get tickets by project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getByProjectId(projectId) {
        return this.getAll({ project_id: projectId });
    }

    /**
     * Create a new ticket
     * @param {Object} ticket 
     * @returns {Promise<Object>}
     */
    async create(ticket) {
        try {
            const ticketData = {
                project_id: ticket.project_id || null,
                title: ticket.title?.trim() || '',
                description: ticket.description?.trim() || '',
                priority: ticket.priority || 'medium',
                status: ticket.status || 'open',
                created_by: ticket.created_by || null,
                assigned_to: ticket.assigned_to || null,
                tags: ticket.tags || []
            };

            const { data, error } = await supabase
                .from('tickets')
                .insert(ticketData)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error creating ticket:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a ticket
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async update(id, updates) {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error updating ticket:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a ticket
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('tickets')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error deleting ticket:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single ticket
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching ticket:', error);
            return null;
        }

        return this._normalizeTicket(data);
    }

    /**
     * Add a comment to a ticket
     * @param {string} ticketId 
     * @param {string} comment 
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async addComment(ticketId, comment, userId) {
        try {
            const { data, error } = await supabase
                .from('ticket_comments')
                .insert({
                    ticket_id: ticketId,
                    comment: comment?.trim() || '',
                    created_by: userId
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get comments for a ticket
     * @param {string} ticketId 
     * @returns {Promise<Array>}
     */
    async getComments(ticketId) {
        const { data, error } = await supabase
            .from('ticket_comments')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }

        return data || [];
    }
}

export default new TicketService();
