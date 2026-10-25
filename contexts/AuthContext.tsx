import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase, UserProfile, UserRole } from '@/services/supabase';
import { setActiveCurriculumUserId, resetCurriculumProgress } from '@/constants/curriculumStore';
import { setActiveHistoryUserId, clearHistory } from '@/constants/historyStore';
import { setActiveGamificationUserId, clearGamificationStats } from '@/constants/gamificationStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    bio?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_MOCK_USER_KEY = 'arnis_dev_mock_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize active user ID to curriculum, history, and gamification stores
  useEffect(() => {
    const uid = user ? user.id : null;
    setActiveCurriculumUserId(uid);
    setActiveHistoryUserId(uid);
    setActiveGamificationUserId(uid);
  }, [user]);

  // Fetch user profile from Supabase profiles table
  const fetchProfile = async (userId: string, userEmail?: string, fallbackData?: any) => {
    if (!isSupabaseConfigured) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!data) {
        // Profile does not exist yet; create it from metadata
        const newProfile: UserProfile = {
          id: userId,
          role: fallbackData?.role || 'student',
          display_name: fallbackData?.display_name || fallbackData?.displayName || userEmail?.split('@')[0] || 'Arnisador',
          email: userEmail || null,
          bio: fallbackData?.bio || '',
          rank_sash: fallbackData?.role === 'coach' ? 'Guro / Instructor' : 'White Sash',
        };

        const { data: insertedData, error: insErr } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .maybeSingle();

        if (insertedData) {
          setProfile(insertedData as UserProfile);
          return;
        } else {
          setProfile(newProfile);
          return;
        }
      }

      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('[AuthContext] Error loading profile:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Check for local dev mock session
      AsyncStorage.getItem(DEV_MOCK_USER_KEY)
        .then((stored) => {
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setProfile(parsed.profile);
              setUser(parsed.user);
            } catch (e) {
              console.warn('[AuthContext] Failed to parse stored mock profile');
            }
          }
        })
        .finally(() => setIsLoading(false));
      return;
    }

    // Live Supabase initialization
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email, user.user_metadata);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      // Local development mock sign-in
      const mockRole: UserRole = email.toLowerCase().includes('coach') ? 'coach' : 'student';
      const mockUser: any = {
        id: `mock-${Date.now()}`,
        email,
        user_metadata: { display_name: email.split('@')[0], role: mockRole },
      };
      const mockProf: UserProfile = {
        id: mockUser.id,
        role: mockRole,
        display_name: email.split('@')[0] || 'Arnis Warrior',
        email,
        bio: mockRole === 'coach' ? 'Master Instructor / Arnis Guro' : 'Dedicated Student',
        rank_sash: mockRole === 'coach' ? 'Guro / Instructor' : 'White Sash',
      };
      setUser(mockUser);
      setProfile(mockProf);
      await AsyncStorage.setItem(DEV_MOCK_USER_KEY, JSON.stringify({ user: mockUser, profile: mockProf }));
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        await fetchProfile(data.user.id, data.user.email, data.user.user_metadata);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    bio?: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      // Local development mock sign-up
      const mockUser: any = {
        id: `mock-${Date.now()}`,
        email,
        user_metadata: { display_name: displayName, role },
      };
      const mockProf: UserProfile = {
        id: mockUser.id,
        role,
        display_name: displayName,
        email,
        bio: bio || '',
        rank_sash: role === 'coach' ? 'Guro / Instructor' : 'White Sash',
      };
      setUser(mockUser);
      setProfile(mockProf);
      await AsyncStorage.setItem(DEV_MOCK_USER_KEY, JSON.stringify({ user: mockUser, profile: mockProf }));
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            role,
            bio: bio || '',
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          role,
          display_name: displayName.trim(),
          email: data.user.email || email,
          bio: bio || '',
          rank_sash: role === 'coach' ? 'Guro / Instructor' : 'White Sash',
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(newProfile);

        if (profileError) {
          console.warn('[AuthContext] Profile upsert warning:', profileError);
        }

        setProfile(newProfile);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      await AsyncStorage.removeItem(DEV_MOCK_USER_KEY);
      setUser(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const deleteAccount = async (): Promise<{ error: Error | null }> => {
    const currentUserId = user?.id;

    try {
      if (isSupabaseConfigured && currentUserId) {
        // 1. Attempt to invoke the delete_user_account RPC
        const { error: rpcError } = await supabase.rpc('delete_user_account');

        if (rpcError) {
          console.warn('[AuthContext] delete_user_account RPC warning, attempting direct profile delete:', rpcError);
          // Fallback: delete row directly from public.profiles
          const { error: profileDelError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', currentUserId);
          if (profileDelError) {
            console.warn('[AuthContext] Direct profile delete warning:', profileDelError);
          }
        }

        // 2. Sign out session from Supabase
        await supabase.auth.signOut().catch((e) => console.warn('[AuthContext] SignOut error during delete:', e));
      }

      // 3. Clean up user-specific local storage caches
      if (currentUserId) {
        await resetCurriculumProgress(currentUserId).catch(() => {});
        await clearHistory(currentUserId).catch(() => {});
        await clearGamificationStats(currentUserId).catch(() => {});
      }

      // 4. Remove mock user session if any
      await AsyncStorage.removeItem(DEV_MOCK_USER_KEY).catch(() => {});

      // 5. Reset active user store IDs
      setActiveCurriculumUserId(null);
      setActiveHistoryUserId(null);
      setActiveGamificationUserId(null);

      // 6. Clear React context state
      setUser(null);
      setProfile(null);
      setSession(null);

      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] Error deleting account:', err);
      // Ensure state is wiped even if an unexpected network error occurs
      setUser(null);
      setProfile(null);
      setSession(null);
      return { error: err };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
    if (!profile) return { error: new Error('No user profile found') };

    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() };
    setProfile(updated);

    if (!isSupabaseConfigured) {
      await AsyncStorage.setItem(DEV_MOCK_USER_KEY, JSON.stringify({ user, profile: updated }));
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updateEmail = async (newEmail: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      if (profile) {
        const updated = { ...profile, email: newEmail };
        setProfile(updated);
        await AsyncStorage.setItem(DEV_MOCK_USER_KEY, JSON.stringify({ user, profile: updated }));
      }
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) return { error: new Error(error.message) };
      if (profile) {
        await updateProfile({ email: newEmail });
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        deleteAccount,
        refreshProfile,
        updateProfile,
        updatePassword,
        updateEmail,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
