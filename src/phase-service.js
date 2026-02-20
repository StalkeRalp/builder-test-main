/**
 * Phase Service - Supabase Edition
 * Manages project phases/timelines
 */

import { supabase } from './supabase-client.js';

class PhaseService {
    constructor() {
        this.phases = [];
    }

    /**
     * Get all phases for a project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getByProjectId(projectId) {
        const { data, error } = await supabase
            .from('phases')
            .select('*')
            .eq('project_id', projectId)
            .order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching phases:', error);
            return [];
        }

        this.phases = data || [];
        return this.phases;
    }

    /**
     * Create a new phase
     * @param {Object} phase 
     * @returns {Promise<Object>}
     */
    async create(phase) {
        try {
            const phaseData = {
                project_id: phase.project_id,
                name: phase.title?.trim() || phase.name?.trim() || '',
                description: phase.description?.trim() || '',
                status: phase.status || 'pending',
                start_date: phase.start_date || null,
                end_date: phase.end_date || null,
                progress: phase.progress ?? 0,
                order_index: phase.order_index ?? phase.order ?? 0
            };

            const { data, error } = await supabase
                .from('phases')
                .insert(phaseData)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error creating phase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a phase
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async update(id, updates) {
        try {
            const updateData = { ...updates };
            if (updateData.order !== undefined && updateData.order_index === undefined) {
                updateData.order_index = updateData.order;
                delete updateData.order;
            }
            if (updateData.title !== undefined && updateData.name === undefined) {
                updateData.name = updateData.title;
                delete updateData.title;
            }

            const { data, error } = await supabase
                .from('phases')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error updating phase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a phase
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('phases')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error deleting phase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single phase
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('phases')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching phase:', error);
            return null;
        }

        return data;
    }
}

export default new PhaseService();
