import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder.supabase.co') &&
  supabaseAnonKey !== 'placeholder-anon-key'
);

if (!isSupabaseConfigured) {
  console.error(
    '[Supabase] Error: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or invalid. Verify environment variables before building.'
  );
}

/**
 * Universal SSR-safe storage adapter for Supabase Auth.
 * Prevents "ReferenceError: window is not defined" when executing in Node.js / Expo CLI.
 */
const universalStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: universalStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export type UserRole = 'student' | 'coach';

export interface UserProfile {
  id: string;
  role: UserRole;
  display_name: string;
  email: string | null;
  avatar_url?: string | null;
  bio?: string;
  rank_sash?: string;
  experience_years?: number;
  created_at?: string;
  updated_at?: string;
}
