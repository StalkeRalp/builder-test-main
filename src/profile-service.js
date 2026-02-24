/**
 * Profile Service - Supabase Edition
 * Manages user profiles using Supabase Database and Storage
 */

import { supabase } from './supabase-client.js';

class ProfileService {
    constructor() {
        this.currentProfile = null;
    }

    _normalizeProfile(profile) {
        if (!profile) return profile;
        return {
            ...profile,
            name: profile.name || profile.full_name || '',
            photo_url: profile.photo_url || profile.avatar_url || null
        };
    }

    // --- ADMIN PROFILE ---

    /**
     * Get admin profile
     * @returns {Promise<Object>}
     */
    async getAdminProfile() {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return this._getDefaultAdminProfile();
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        const role = String(data?.role || '').toLowerCase();
        if (error || !data || !['admin', 'superadmin'].includes(role)) {
            console.error('Error fetching admin profile:', error);
            const fallbackProfile = await this._ensureAdminProfileForUser(user);
            if (fallbackProfile) {
                return this._normalizeProfile(fallbackProfile);
            }
            return this._getDefaultAdminProfile();
        }

        return this._normalizeProfile(data);
    }

    async _ensureAdminProfileForUser(user) {
        if (!user?.id || !user?.email) return null;
        const safeName = String(
            user?.user_metadata?.name
            || user?.user_metadata?.full_name
            || 'Administrator'
        ).trim();
        const payload = {
            id: user.id,
            email: user.email,
            full_name: safeName,
            role: 'admin'
        };
        const { data, error } = await supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();
        if (error) {
            console.error('Error ensuring admin profile:', error);
            return null;
        }
        return data;
    }

    _getDefaultAdminProfile() {
        return {
            name: 'Administrator',
            email: 'admin@tdegroup.com',
            phone: '',
            position: 'System Administrator',
            photo_url: null
        };
    }

    /**
     * Update admin profile
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async updateAdminProfile(updates) {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Not authenticated');
        }

        const mergedName = (updates.name || `${updates.first_name || ''} ${updates.last_name || ''}`.trim()).trim();
        let updateData = {
            full_name: mergedName || null,
            email: updates.email,
            phone: updates.phone
        };

        let { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: updates.email || user.email,
                full_name: mergedName || null,
                phone: updates.phone || null,
                role: String(updates.role || '').toLowerCase() === 'superadmin' ? 'superadmin' : 'admin'
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error && error.message && error.message.includes('full_name')) {
            updateData = {
                email: updates.email,
                phone: updates.phone
            };
            const retry = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id)
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            console.error('Error updating admin profile:', error);
            throw error;
        }

        return this._normalizeProfile(data);
    }

    // --- CLIENT PROFILES ---

    /**
     * Get client profile by project ID
     * @param {string} projectId 
     * @returns {Promise<Object>}
     */
    async getClientProfile(projectId) {
        // Get project to find client_id
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('client_id, client_name, client_email')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return this._getDefaultClientProfile();
        }

        // If client_id exists, get full profile
        if (project.client_id) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', project.client_id)
                .single();

            if (!error && profile) {
                return this._normalizeProfile(profile);
            }
        }

        // Return basic profile from project data
        return {
            name: project.client_name || 'Client',
            email: project.client_email || '',
            phone: '',
            company: project.client_name || '',
            photo_url: null
        };
    }

    _getDefaultClientProfile() {
        return {
            name: 'Client',
            email: '',
            phone: '',
            company: '',
            photo_url: null
        };
    }

    /**
     * Update client profile
     * @param {string} clientId 
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async updateClientProfile(clientId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                full_name: updates.name,
                email: updates.email,
                phone: updates.phone,
                company: updates.company
            })
            .eq('id', clientId)
            .select()
            .single();

        if (error) {
            console.error('Error updating client profile:', error);
            throw error;
        }

        return this._normalizeProfile(data);
    }

    // --- PHOTO UPLOAD ---

    /**
     * Upload profile photo to Supabase Storage
     * @param {File} file 
     * @param {string} userId 
     * @returns {Promise<string>} Public URL of uploaded photo
     */
    async uploadProfilePhoto(file, userId) {
        return new Promise(async (resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Please select a valid image file'));
                return;
            }

            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('Image size must be less than 5MB'));
                return;
            }

            try {
                // Generate unique filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${userId}/${Date.now()}.${fileExt}`;

                // Upload to Supabase Storage
                const { data, error } = await supabase.storage
                    .from('profile-photos')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) throw error;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('profile-photos')
                    .getPublicUrl(fileName);

                // Update profile with new photo URL
                await supabase
                    .from('profiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', userId);

                resolve(publicUrl);
            } catch (error) {
                console.error('Error uploading photo:', error);
                reject(new Error('Failed to upload photo: ' + error.message));
            }
        });
    }

    /**
     * Delete profile photo
     * @param {string} userId 
     * @returns {Promise<boolean>}
     */
    async deleteProfilePhoto(userId) {
        try {
            // Get current profile to find photo path
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', userId)
                    .single();

                if (!profile || !profile.avatar_url) {
                    return true;
                }

            // Extract file path from URL
                const urlParts = profile.avatar_url.split('/');
            const fileName = `${userId}/${urlParts[urlParts.length - 1]}`;

            // Delete from storage
            const { error } = await supabase.storage
                .from('profile-photos')
                .remove([fileName]);

            if (error) throw error;

            // Update profile to remove photo URL
                await supabase
                    .from('profiles')
                    .update({ avatar_url: null })
                    .eq('id', userId);

            return true;
        } catch (error) {
            console.error('Error deleting photo:', error);
            return false;
        }
    }

    // --- HELPERS ---

    /**
     * Get initials from name
     * @param {string} name 
     * @returns {string}
     */
    getInitials(name) {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    /**
     * Get profile by user ID
     * @param {string} userId 
     * @returns {Promise<Object|null>}
     */
    async getProfileById(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return this._normalizeProfile(data);
    }
}

// Global instance
const profileService = new ProfileService();
window.ProfileService = profileService;

export default profileService;
