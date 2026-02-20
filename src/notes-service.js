/**
 * Internal Notes Service - Supabase Edition
 * Manages internal project notes (admin only)
 */

import { supabase } from './supabase-client.js';

class NotesService {
    constructor() {
        this.notes = [];
    }

    /**
     * Get all notes for a project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getByProjectId(projectId) {
        const { data, error } = await supabase
            .from('internal_notes')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notes:', error);
            return [];
        }

        this.notes = data || [];
        return this.notes;
    }

    /**
     * Create a new note
     * @param {Object} note 
     * @returns {Promise<Object>}
     */
    async create(note) {
        try {
            const noteData = {
                project_id: note.project_id,
                content: note.content?.trim() || '',
                created_by: note.created_by || null
            };

            const { data, error } = await supabase
                .from('internal_notes')
                .insert(noteData)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error creating note:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a note
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async update(id, updates) {
        try {
            const { data, error } = await supabase
                .from('internal_notes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error updating note:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a note
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('internal_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error deleting note:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single note
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('internal_notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching note:', error);
            return null;
        }

        return data;
    }
}

export default new NotesService();
