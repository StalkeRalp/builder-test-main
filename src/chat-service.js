/**
 * Chat Service - Supabase Edition
 * Manages real-time messaging using Supabase Database and Realtime
 */

import { supabase } from './supabase-client.js';

class ChatService {
    constructor() {
        this.activeSubscription = null;
        this.messageCallbacks = [];
        this.hasReadColumn = null;
    }

    // --- MESSAGING ---

    /**
     * Send a message
     * @param {string} projectId 
     * @param {string} senderRole 
     * @param {string} senderName 
     * @param {string} content 
     * @param {string} photoUrl - Optional photo URL
     * @returns {Promise<Object>}
     */
    async sendMessage(projectId, senderRole, senderName, content, photoUrl = null) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const messageData = {
                project_id: projectId,
                sender_id: user?.id || null,
                sender_role: senderRole,
                sender_name: senderName,
                content: content?.trim() || ''
            };

            // Add photo_url if provided
            if (photoUrl) {
                messageData.photo_url = photoUrl;
            }

            // Try with `read` column first (newer schema), fallback if column does not exist.
            let insertPayload = { ...messageData, read: false };
            let { data, error } = await supabase
                .from('messages')
                .insert(insertPayload)
                .select()
                .single();

            if (error && String(error.message || '').includes("'read' column")) {
                this.hasReadColumn = false;
                insertPayload = { ...messageData };
                const retry = await supabase
                    .from('messages')
                    .insert(insertPayload)
                    .select()
                    .single();
                data = retry.data;
                error = retry.error;
            } else if (!error) {
                this.hasReadColumn = true;
            }

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Get conversation for a specific project
     * @param {string} projectId 
     * @returns {Promise<Array>}
     */
    async getConversation(projectId) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching conversation:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get all conversations (for admin)
     * @returns {Promise<Array>}
     */
    async getAllConversations() {
        try {
            // Get all projects with their latest message
            const { data: projects, error } = await supabase
                .from('projects')
                .select('id, name, client_name');

            if (error) throw error;

            const conversations = [];

            for (const project of projects) {
                // Get messages for this project
                const { data: messages, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('project_id', project.id)
                    .order('created_at', { ascending: false });

                if (messagesError) {
                    console.error(`Error fetching messages for project ${project.id}:`, messagesError);
                    continue;
                }

                if (messages && messages.length > 0) {
                    const lastMessage = messages[0];
                    const supportsRead = messages.some(m => Object.prototype.hasOwnProperty.call(m, 'read'));
                    const unreadCount = supportsRead
                        ? messages.filter(m => m.sender_role !== 'admin' && !m.read).length
                        : 0;
                    const latestClientMessage = messages.find(
                        (m) => m.sender_role === 'client' && String(m.sender_name || '').trim()
                    );
                    const totalAdminMessages = messages.filter((m) => m.sender_role === 'admin').length;
                    const totalClientMessages = messages.filter((m) => m.sender_role === 'client').length;

                    conversations.push({
                        projectId: project.id,
                        projectName: project.name,
                        clientName: latestClientMessage?.sender_name || project.client_name || 'Client',
                        lastMessage: lastMessage,
                        unreadCount: unreadCount,
                        messageCount: messages.length,
                        totalAdminMessages,
                        totalClientMessages
                    });
                }
            }

            // Sort by last message timestamp
            conversations.sort((a, b) =>
                new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
            );

            return conversations;
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }
    }

    /**
     * Mark messages as read
     * @param {string} projectId 
     * @param {string} senderRole 
     */
    async markAsRead(projectId, senderRole) {
        // If schema has no `read` column, silently skip.
        if (this.hasReadColumn === false) return;

        const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('project_id', projectId)
            .neq('sender_role', senderRole);

        if (error) {
            if (String(error.message || '').includes("'read' column")) {
                this.hasReadColumn = false;
                return;
            }
            console.error('Error marking messages as read:', error);
        } else {
            this.hasReadColumn = true;
        }
    }

    /**
     * Get unread count for a project
     * @param {string} projectId 
     * @param {string} forRole 
     * @returns {Promise<number>}
     */
    async getUnreadCount(projectId, forRole) {
        if (this.hasReadColumn === false) return 0;

        const { data, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('project_id', projectId)
            .neq('sender_role', forRole)
            .eq('read', false);

        if (error) {
            if (String(error.message || '').includes("'read' column")) {
                this.hasReadColumn = false;
                return 0;
            }
            console.error('Error getting unread count:', error);
            return 0;
        }

        this.hasReadColumn = true;
        return data?.length || 0;
    }

    /**
     * Get total unread count (for admin)
     * @returns {Promise<number>}
     */
    async getTotalUnreadCount() {
        if (this.hasReadColumn === false) return 0;

        const { data, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('sender_role', 'client')
            .eq('read', false);

        if (error) {
            if (String(error.message || '').includes("'read' column")) {
                this.hasReadColumn = false;
                return 0;
            }
            console.error('Error getting total unread count:', error);
            return 0;
        }

        this.hasReadColumn = true;
        return data?.length || 0;
    }

    // --- REAL-TIME SUBSCRIPTIONS ---

    /**
     * Subscribe to real-time messages for a project
     * @param {string} projectId 
     * @param {Function} callback 
     */
    subscribeToMessages(projectId, callback) {
        // Unsubscribe from previous subscription
        this.unsubscribeFromMessages();

        // Create new subscription
        this.activeSubscription = supabase
            .channel(`messages:${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    console.log('New message received:', payload.new);
                    callback(payload.new);
                }
            )
            .subscribe();

        console.log(`Subscribed to messages for project ${projectId}`);
    }

    /**
     * Subscribe to all messages (for admin)
     * @param {Function} callback 
     */
    subscribeToAllMessages(callback) {
        // Unsubscribe from previous subscription
        this.unsubscribeFromMessages();

        // Create new subscription
        this.activeSubscription = supabase
            .channel('all-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    console.log('New message received:', payload.new);
                    callback(payload.new);
                }
            )
            .subscribe();

        console.log('Subscribed to all messages');
    }

    /**
     * Unsubscribe from messages
     */
    unsubscribeFromMessages() {
        if (this.activeSubscription) {
            supabase.removeChannel(this.activeSubscription);
            this.activeSubscription = null;
            console.log('Unsubscribed from messages');
        }
    }

    /**
     * Delete a message
     * @param {string} messageId 
     * @returns {Promise<boolean>}
     */
    async deleteMessage(messageId) {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('Error deleting message:', error);
            return false;
        }

        return true;
    }

    /**
     * Delete all messages for a project
     * @param {string} projectId 
     * @returns {Promise<boolean>}
     */
    async deleteConversation(projectId) {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('project_id', projectId);

        if (error) {
            console.error('Error deleting conversation:', error);
            return false;
        }

        return true;
    }
}

// Global instance
const chatService = new ChatService();
window.ChatService = chatService;

export default chatService;
