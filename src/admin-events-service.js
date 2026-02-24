/**
 * Admin Events Service (Supabase)
 * Shared events storage for all admins with realtime sync.
 */

import { supabase } from './supabase-client.js';

class AdminEventsService {
  constructor() {
    this.channel = null;
  }

  _normalizePriority(priority) {
    const p = String(priority || 'medium').toLowerCase();
    return ['high', 'medium', 'low'].includes(p) ? p : 'medium';
  }

  _normalizeType(type) {
    const t = String(type || 'general').toLowerCase();
    return ['meeting', 'delivery', 'deadline', 'task', 'general'].includes(t) ? t : 'general';
  }

  _normalizeDate(date) {
    const d = String(date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new Error('Date invalide (format attendu: YYYY-MM-DD)');
    }
    return d;
  }

  _normalizeTime(time) {
    const value = String(time || '').trim();
    if (!value) return null;
    if (!/^\d{2}:\d{2}$/.test(value)) {
      throw new Error('Heure invalide (format attendu: HH:MM)');
    }
    return value;
  }

  _mapRowToEvent(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      date: row.event_date,
      time: row.event_time ? String(row.event_time).slice(0, 5) : '',
      priority: row.priority || 'medium',
      type: row.event_type || 'general',
      projectId: row.project_id || null,
      notes: row.notes || '',
      createdBy: row.created_by || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    };
  }

  _mapInputToRow(input) {
    const title = String(input?.title || '').trim();
    if (!title) {
      throw new Error('Le titre est requis');
    }

    return {
      title,
      event_date: this._normalizeDate(input?.date),
      event_time: this._normalizeTime(input?.time),
      priority: this._normalizePriority(input?.priority),
      event_type: this._normalizeType(input?.type),
      project_id: input?.projectId ? String(input.projectId) : null,
      notes: String(input?.notes || '').trim()
    };
  }

  async _getCurrentUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = data?.user?.id;
    if (!userId) throw new Error('Utilisateur non authentifié');
    return userId;
  }

  async getAll() {
    const { data, error } = await supabase
      .from('admin_events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true });

    if (error) {
      console.error('admin_events getAll error:', error);
      return [];
    }

    return (data || []).map((row) => this._mapRowToEvent(row)).filter(Boolean);
  }

  async getById(id) {
    const { data, error } = await supabase
      .from('admin_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('admin_events getById error:', error);
      return null;
    }

    return this._mapRowToEvent(data);
  }

  async getByDate(date) {
    const target = this._normalizeDate(date);
    const { data, error } = await supabase
      .from('admin_events')
      .select('*')
      .eq('event_date', target)
      .order('event_time', { ascending: true });

    if (error) {
      console.error('admin_events getByDate error:', error);
      return [];
    }

    return (data || []).map((row) => this._mapRowToEvent(row)).filter(Boolean);
  }

  async getUpcoming(limit = 10, fromDate = null) {
    const now = new Date();
    const from = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fromKey = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('admin_events')
      .select('*')
      .gte('event_date', fromKey)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true })
      .limit(Math.max(1, Number(limit) || 10));

    if (error) {
      console.error('admin_events getUpcoming error:', error);
      return [];
    }

    return (data || []).map((row) => this._mapRowToEvent(row)).filter(Boolean);
  }

  async create(input) {
    const userId = await this._getCurrentUserId();
    const payload = {
      ...this._mapInputToRow(input),
      created_by: userId
    };

    const { data, error } = await supabase
      .from('admin_events')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw new Error(error.message || 'Impossible de créer l\'événement');
    return this._mapRowToEvent(data);
  }

  async update(id, patch) {
    const payload = this._mapInputToRow(patch);
    const { data, error } = await supabase
      .from('admin_events')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message || 'Impossible de modifier l\'événement');
    return this._mapRowToEvent(data);
  }

  async remove(id) {
    const { error } = await supabase
      .from('admin_events')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message || 'Impossible de supprimer l\'événement');
  }

  subscribe(onChange) {
    this.unsubscribe();
    this.channel = supabase
      .channel(`admin-events-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_events' }, (payload) => {
        try {
          onChange?.(payload);
        } catch (error) {
          console.error('admin_events subscribe callback error:', error);
        }
      })
      .subscribe();

    return () => this.unsubscribe();
  }

  unsubscribe() {
    if (!this.channel) return;
    supabase.removeChannel(this.channel);
    this.channel = null;
  }
}

const adminEventsService = new AdminEventsService();
if (typeof window !== 'undefined') {
  window.adminEventsService = adminEventsService;
}

export default adminEventsService;
