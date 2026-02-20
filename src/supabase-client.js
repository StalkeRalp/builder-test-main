/**
 * Supabase Client Configuration
 * Centralized Supabase client for all services
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'tde_supabase_auth'
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Helper function to check connection
export async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Supabase connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        return false;
    }
}

// Export for global access (for compatibility with existing code)
if (typeof window !== 'undefined') {
    window.supabase = supabase;
}

export default supabase;
