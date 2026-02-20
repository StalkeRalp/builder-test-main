/**
 * Document Service - Supabase Edition
 * Manages project documents
 */

import { supabase } from './supabase-client.js';

class DocumentService {
    constructor() {
        this.documents = [];
    }

    /**
     * Get all documents for a project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getByProjectId(projectId) {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            return [];
        }

        this.documents = data || [];
        return this.documents;
    }

    /**
     * Create a new document record
     * @param {Object} doc 
     * @returns {Promise<Object>}
     */
    async create(doc) {
        try {
            let uploadedBy = doc.uploaded_by || null;
            if (!uploadedBy) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error('User not authenticated');
                }
                uploadedBy = user.id;
            }

            const docData = {
                project_id: doc.project_id,
                name: doc.title?.trim() || doc.filename?.trim() || '',
                description: doc.description?.trim() || '',
                file_url: doc.file_url || '',
                file_type: doc.document_type || doc.file_type || 'other',
                file_size: doc.file_size || 0,
                is_public: doc.visible_to_client !== false,
                uploaded_by: uploadedBy
            };

            const { data, error } = await supabase
                .from('documents')
                .insert(docData)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error creating document:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a document
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async update(id, updates) {
        try {
            const { data, error } = await supabase
                .from('documents')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Error updating document:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a document
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error deleting document:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single document
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching document:', error);
            return null;
        }

        return data;
    }

    /**
     * Upload file to Supabase Storage
     * @param {string} projectId 
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async uploadFile(projectId, file) {
        try {
            const filename = `${projectId}/${Date.now()}_${file.name}`;
            
            const { data, error } = await supabase.storage
                .from('project-documents')
                .upload(filename, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('project-documents')
                .getPublicUrl(filename);

            return { success: true, filename, publicUrl };
        } catch (error) {
            console.error('Error uploading file:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a signed download URL for a stored public URL
     * @param {string} publicUrl
     * @param {number} expiresInSeconds
     * @returns {Promise<Object>}
     */
    async getSignedDownloadUrl(publicUrl, expiresInSeconds = 300) {
        try {
            if (!publicUrl) return { success: false, error: 'Missing file URL' };

            const marker = '/storage/v1/object/public/project-documents/';
            const idx = publicUrl.indexOf(marker);
            if (idx === -1) {
                return { success: false, error: 'Invalid file URL' };
            }

            const filePath = publicUrl.substring(idx + marker.length);
            const { data, error } = await supabase.storage
                .from('project-documents')
                .createSignedUrl(filePath, expiresInSeconds);

            if (error) throw error;
            return { success: true, url: data.signedUrl };
        } catch (error) {
            console.error('Error creating signed URL:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete file from storage
     * @param {string} filename 
     * @returns {Promise<Object>}
     */
    async deleteFile(filename) {
        try {
            const { error } = await supabase.storage
                .from('project-documents')
                .remove([filename]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new DocumentService();
