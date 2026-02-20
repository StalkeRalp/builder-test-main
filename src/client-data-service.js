/**
 * Client Data Service
 * Passerelle frontend client vers le backend Supabase réel.
 */

class ClientDataService {
  constructor() {
    this._profileCache = null;
  }

  async _getBackend() {
    const mod = await import('./client-backend-service.js');
    return mod.default || window.ClientBackendService;
  }

  _computeDaysRemaining(endDate) {
    if (!endDate) return null;
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return null;
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  _normalizeProject(project) {
    if (!project) return null;
    const startDate = project.startDate || project.start_date || null;
    const endDate = project.endDate || project.end_date || null;
    return {
      ...project,
      type: project.type || project.project_type || null,
      manager: project.manager || project.project_manager || null,
      adminDescription: project.adminDescription || project.admin_description || project.description || '',
      startDate,
      endDate,
      daysRemaining: this._computeDaysRemaining(endDate),
      currency: project.currency || 'XOF'
    };
  }

  _normalizePhase(phase) {
    return {
      ...phase,
      name: phase.name || phase.title || 'Phase',
      status: phase.status || 'planning',
      progress: Number(phase.progress) || 0,
      startDate: phase.startDate || phase.start_date || null,
      endDate: phase.endDate || phase.end_date || null,
      notes: phase.notes || phase.description || '',
      photos: Array.isArray(phase.photos) ? phase.photos : []
    };
  }

  _normalizeDocument(doc) {
    const bytes = Number(doc.file_size || doc.size || 0);
    return {
      ...doc,
      name: doc.name || 'Document',
      type: (doc.file_type || doc.type || 'other').toLowerCase(),
      size: bytes > 0 ? bytes / (1024 * 1024) : 0,
      uploadDate: doc.uploadDate || doc.created_at || doc.uploaded_at || null,
      url: doc.file_url || doc.url || null
    };
  }

  _normalizeMessage(msg) {
    const role = msg.role || msg.sender_role || 'team';
    const isClient = role === 'client';
    const attachments = [];
    if (msg.photo_url) {
      attachments.push({ type: 'image', url: msg.photo_url });
    }

    return {
      ...msg,
      role,
      sender: msg.sender || msg.sender_name || (isClient ? 'Vous' : 'Équipe'),
      text: msg.text || msg.content || '',
      timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
      read: isClient ? true : Boolean(msg.read),
      attachments
    };
  }

  _normalizeTicket(ticket) {
    return {
      ...ticket,
      title: ticket.title || ticket.subject || 'Ticket',
      description: ticket.description || ticket.message || '',
      status: ticket.status || 'open',
      priority: (ticket.priority || 'medium').toLowerCase(),
      createdDate: ticket.createdDate || ticket.created_at || null
    };
  }

  _normalizeProfile(profile) {
    return {
      ...profile,
      name: profile.name || profile.full_name || 'Client',
      email: profile.email || '',
      phone: profile.phone || '',
      avatar: profile.avatar || profile.photo_url || profile.avatar_url || null,
      photo_url: profile.photo_url || profile.avatar_url || null,
      contactPreferences: profile.contactPreferences || {
        email: false,
        phone: false,
        chat: false
      }
    };
  }

  async getProject() {
    try {
      const backend = await this._getBackend();
      const project = await backend.getProject();
      return this._normalizeProject(project);
    } catch (error) {
      console.error('getProject error:', error);
      return null;
    }
  }

  async getPhases() {
    try {
      const backend = await this._getBackend();
      const phases = await backend.getTimeline();
      return Array.isArray(phases) ? phases.map((phase) => this._normalizePhase(phase)) : [];
    } catch (error) {
      console.error('getPhases error:', error);
      return [];
    }
  }

  async getDocuments() {
    try {
      const backend = await this._getBackend();
      const docs = await backend.getDocuments();
      return Array.isArray(docs) ? docs.map((doc) => this._normalizeDocument(doc)) : [];
    } catch (error) {
      console.error('getDocuments error:', error);
      return [];
    }
  }

  async getMessages() {
    try {
      const backend = await this._getBackend();
      const messages = await backend.getMessages();
      return Array.isArray(messages) ? messages.map((msg) => this._normalizeMessage(msg)) : [];
    } catch (error) {
      console.error('getMessages error:', error);
      return [];
    }
  }

  async sendMessage(text, attachments = []) {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
      throw new Error('Message vide');
    }

    const photoUrl = Array.isArray(attachments) ? attachments.find((a) => a?.url)?.url : null;

    if (!this._profileCache) {
      await this.getProfile();
    }
    const senderName = this._profileCache?.name || 'Client';

    const backend = await this._getBackend();
    const response = await backend.sendMessage(trimmed, { photoUrl, senderName });
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to send message');
    }
    return response.data;
  }

  async markAdminMessagesAsRead() {
    const backend = await this._getBackend();
    if (!backend?.markAdminMessagesAsRead) return;
    await backend.markAdminMessagesAsRead();
  }

  async getTickets() {
    try {
      const backend = await this._getBackend();
      const tickets = await backend.getTickets();
      return Array.isArray(tickets) ? tickets.map((ticket) => this._normalizeTicket(ticket)) : [];
    } catch (error) {
      console.error('getTickets error:', error);
      return [];
    }
  }

  async createTicket(ticket) {
    const backend = await this._getBackend();
    const payload = {
      title: ticket?.title || '',
      description: ticket?.description || '',
      priority: ticket?.priority || 'medium',
      status: 'open',
      tags: ticket?.category ? [ticket.category] : []
    };
    const response = await backend.createTicket(payload);
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to create ticket');
    }
    return response.data;
  }

  async getProfile() {
    try {
      const backend = await this._getBackend();
      const profile = await backend.getClientProfile();
      const normalized = this._normalizeProfile(profile || {});
      this._profileCache = normalized;
      return normalized;
    } catch (error) {
      console.error('getProfile error:', error);
      return this._normalizeProfile(this._profileCache || {});
    }
  }

  async updateProfile(profileData) {
    const backend = await this._getBackend();

    if (!this._profileCache) {
      this._profileCache = await this.getProfile();
    }

    const current = this._profileCache || {};
    const merged = {
      ...current,
      ...profileData,
      contactPreferences: {
        ...(current.contactPreferences || {}),
        ...(profileData.contactPreferences || {})
      }
    };

    const response = await backend.updateClientProfile(current.id || null, {
      name: merged.name || current.name,
      email: merged.email || current.email,
      phone: merged.phone,
      contactPreferences: merged.contactPreferences
    });
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to update profile');
    }

    this._profileCache = this._normalizeProfile(response.data || merged);
    return this._profileCache;
  }

  async uploadProfilePhoto(file) {
    const backend = await this._getBackend();
    if (!backend?.uploadClientProfilePhoto) {
      throw new Error('Upload photo indisponible.');
    }

    const response = await backend.uploadClientProfilePhoto(file);
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to upload profile photo');
    }

    const photoUrl = response.photoUrl || null;
    if (photoUrl && this._profileCache) {
      this._profileCache = {
        ...this._profileCache,
        avatar: photoUrl,
        photo_url: photoUrl
      };
    }

    return photoUrl;
  }

  async getRecentActivity() {
    try {
      const [messages, tickets, documents, phases] = await Promise.all([
        this.getMessages(),
        this.getTickets(),
        this.getDocuments(),
        this.getPhases()
      ]);

      const activity = [];
      messages.slice(-10).forEach((msg) => {
        activity.push({
          type: 'message',
          message: `${msg.sender}: ${msg.text}`.trim(),
          timestamp: msg.timestamp
        });
      });

      tickets.slice(0, 10).forEach((ticket) => {
        activity.push({
          type: 'ticket',
          message: `Ticket: ${ticket.title}`,
          timestamp: ticket.createdDate
        });
      });

      documents.slice(0, 10).forEach((doc) => {
        activity.push({
          type: 'document',
          message: `Document: ${doc.name}`,
          timestamp: doc.uploadDate
        });
      });

      phases.slice(0, 10).forEach((phase) => {
        activity.push({
          type: 'phase',
          message: `Phase: ${phase.name} (${phase.progress}%)`,
          timestamp: phase.endDate || phase.startDate
        });
      });

      return activity
        .filter((item) => item.timestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 30);
    } catch (error) {
      console.error('getRecentActivity error:', error);
      return [];
    }
  }
}

var clientDataService = new ClientDataService();
window.clientDataService = clientDataService;
