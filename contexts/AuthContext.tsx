import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase, UserProfile, UserRole } from '@/services/supabase';
import { setActiveCurriculumUserId, resetCurriculumProgress } from '@/constants/curriculumStore';
import { setActiveHistoryUserId, clearHistory, clearStrikeMastery } from '@/constants/historyStore';
import { setActiveGamificationUserId, clearGamificationStats } from '@/constants/gamificationStore';
import { clearAllUserStrikeMedia } from '@/services/mediaStorageService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isRecoveringPassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    bio?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  verifySignupOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  beginPasswordRecovery: () => void;
  cancelPasswordRecovery: () => Promise<void>;
  verifyRecoveryAndUpdatePassword: (
    email: string,
    token: string,
    newPassword: string,
    otpAlreadyVerified?: boolean
  ) => Promise<{ error: Error | null; otpVerified?: boolean }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{
    error: Error | null;
    currentEmail?: string | null;
    pendingNewEmail?: string | null;
  }>;
  verifyEmailChangeOtp: (
    targetEmail: string,
    token: string
  ) => Promise<{
    error: Error | null;
    completed: boolean;
    currentEmail?: string | null;
    pendingNewEmail?: string | null;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CLOUD_UNAVAILABLE_MSG =
  'Cloud authentication is unavailable in this build. Please verify Supabase environment settings.';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState<boolean>(false);

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

      if (error) {
        console.warn('[AuthContext] Error fetching profile:', error.message);
      }

      if (!data) {
        // Profile does not exist yet; create it from signup metadata
        const newProfile: UserProfile = {
          id: userId,
          role: fallbackData?.role || 'student',
          display_name:
            fallbackData?.display_name ||
            fallbackData?.displayName ||
            userEmail?.split('@')[0] ||
            'Arnisador',
          email: userEmail || null,
          bio: fallbackData?.bio || '',
          rank_sash: fallbackData?.role === 'coach' ? 'Guro / Instructor' : 'White Sash',
        };

        const { data: insertedData, error: insErr } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .maybeSingle();

        if (insErr) {
          console.warn('[AuthContext] Profile auto-create warning:', insErr.message);
        }

        if (insertedData) {
          setProfile(insertedData as UserProfile);
          return;
        } else {
          setProfile(newProfile);
          return;
        }
      }

      setProfile(data as UserProfile);
    } catch (err) {
      console.error('[AuthContext] Error loading profile:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Safety watchdog: prevent infinite loading screen on mobile if network is slow or offline
    const timeoutTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Auth initialization timeout reached; releasing loading screen.');
        setIsLoading(false);
      }
    }, 6000);

    if (!isSupabaseConfigured) {
      clearTimeout(timeoutTimer);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    // Live Supabase initialization
    supabase.auth
      .getSession()
      .then(({ data: { session: activeSession } }) => {
        if (!isMounted) return;
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        if (activeSession?.user) {
          fetchProfile(
            activeSession.user.id,
            activeSession.user.email,
            activeSession.user.user_metadata
          )
            .catch((err) => console.warn('[AuthContext] Profile fetch error:', err))
            .finally(() => {
              if (isMounted) {
                clearTimeout(timeoutTimer);
                setIsLoading(false);
              }
            });
        } else {
          if (isMounted) {
            clearTimeout(timeoutTimer);
            setIsLoading(false);
          }
        }
      })
      .catch((err) => {
        console.warn('[AuthContext] Supabase getSession error:', err);
        if (isMounted) {
          clearTimeout(timeoutTimer);
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await fetchProfile(
          nextSession.user.id,
          nextSession.user.email,
          nextSession.user.user_metadata
        ).catch(() => {});
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
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
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
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
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    bio?: string
  ): Promise<{ error: Error | null; needsEmailConfirmation?: boolean }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }

    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
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

      // If Confirm Email is enabled in Supabase, session will be null until user clicks verification link
      if (!data.session) {
        return { error: null, needsEmailConfirmation: true };
      }

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          role,
          display_name: displayName.trim(),
          email: data.user.email || cleanEmail,
          bio: bio || '',
          rank_sash: role === 'coach' ? 'Guro / Instructor' : 'White Sash',
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(newProfile);

        if (profileError) {
          console.warn('[AuthContext] Profile upsert warning:', profileError.message);
        }

        setProfile(newProfile);
      }

      return { error: null, needsEmailConfirmation: false };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const verifySignupOtp = async (
    email: string,
    token: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }
    const cleanEmail = email.trim();
    const cleanToken = token.trim();
    if (!cleanEmail || !cleanToken) {
      return { error: new Error('Please enter your 6-digit verification code.') };
    }
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });
      if (error) {
        return { error: new Error(error.message) };
      }
      if (data.session) {
        setSession(data.session);
      }
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email, data.user.user_metadata);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { error: new Error('Please enter your email address.') };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const beginPasswordRecovery = () => {
    setIsRecoveringPassword(true);
  };

  const cancelPasswordRecovery = async () => {
    setIsRecoveringPassword(false);
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
        setProfile(null);
        setSession(null);
      }
    } catch {
      // Ignore cleanup errors when cancelling recovery
    }
  };

  const verifyRecoveryAndUpdatePassword = async (
    email: string,
    token: string,
    newPassword: string,
    otpAlreadyVerified = false
  ): Promise<{ error: Error | null; otpVerified?: boolean }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG), otpVerified: otpAlreadyVerified };
    }
    const cleanEmail = email.trim();
    const cleanToken = token.trim();
    if (!otpAlreadyVerified && (!cleanEmail || !cleanToken)) {
      return { error: new Error('Please enter the 6-digit reset code from your email.'), otpVerified: false };
    }

    // Hold recovery lock so RootNavigator does not redirect before password update completes
    setIsRecoveringPassword(true);
    let verified = otpAlreadyVerified;

    try {
      if (!verified) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery',
        });
        if (verifyError) {
          return { error: new Error(verifyError.message), otpVerified: false };
        }
        verified = true;
        if (verifyData.session) setSession(verifyData.session);
        if (verifyData.user) setUser(verifyData.user);
      }

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        return { error: new Error(updateError.message), otpVerified: true };
      }

      if (updateData.user) {
        setUser(updateData.user);
        await fetchProfile(updateData.user.id, updateData.user.email, updateData.user.user_metadata);
      }
      setIsRecoveringPassword(false);
      return { error: null, otpVerified: true };
    } catch (err: any) {
      return {
        error: err instanceof Error ? err : new Error(String(err)),
        otpVerified: verified,
      };
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { error: new Error('Please enter your email address.') };
    }
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch((err) => {
        console.warn('[AuthContext] signOut warning:', err);
      });
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const deleteUserBucketFiles = async (bucket: 'snapshots' | 'practice-videos', userId: string) => {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(userId, { limit: 1000 });
      if (listError || !files || files.length === 0) return;

      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) {
        console.warn(`[AuthContext] Storage cleanup notice (${bucket}):`, removeError.message);
      }
    } catch (e) {
      console.warn(`[AuthContext] Storage cleanup exception (${bucket}):`, e);
    }
  };

  const deleteAccount = async (): Promise<{ error: Error | null }> => {
    const currentUserId = user?.id;
    if (!currentUserId) {
      return { error: new Error('No active user session found.') };
    }
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }

    try {
      // 1. Best-effort cleanup of stored media files belonging to this user
      await Promise.all([
        deleteUserBucketFiles('snapshots', currentUserId),
        deleteUserBucketFiles('practice-videos', currentUserId),
      ]);

      // 2. Delete auth + cascaded profile/sessions/messages on server
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) {
        return {
          error: new Error(
            rpcError.message ||
              'Could not delete your server account. Please verify your internet connection and try again.'
          ),
        };
      }

      // 3. Sign out local session (ignore errors since auth.users row was already removed)
      await supabase.auth.signOut().catch(() => {});

      // 4. Clean up user-specific local storage caches & media files
      await resetCurriculumProgress(currentUserId).catch(() => {});
      await clearHistory(currentUserId, true).catch(() => {});
      await clearStrikeMastery(currentUserId).catch(() => {});
      await clearGamificationStats(currentUserId).catch(() => {});
      await clearAllUserStrikeMedia().catch(() => {});

      // 5. Reset active user store IDs & React context state
      setActiveCurriculumUserId(null);
      setActiveHistoryUserId(null);
      setActiveGamificationUserId(null);
      setUser(null);
      setProfile(null);
      setSession(null);

      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] Error deleting account:', err);
      return {
        error: err instanceof Error ? err : new Error('Failed to delete account. Please try again.'),
      };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
    if (!profile) return { error: new Error('No user profile found') };
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }

    const previous = profile;
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() };
    setProfile(updated);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        setProfile(previous);
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: any) {
      setProfile(previous);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updateEmail = async (
    newEmail: string
  ): Promise<{
    error: Error | null;
    currentEmail?: string | null;
    pendingNewEmail?: string | null;
  }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG) };
    }
    const cleanNewEmail = newEmail.trim();
    if (!cleanNewEmail) {
      return { error: new Error('Please enter a valid email address.') };
    }
    try {
      const { data, error } = await supabase.auth.updateUser({ email: cleanNewEmail });
      if (error) return { error: new Error(error.message) };

      const updatedUser = data.user;
      if (updatedUser) {
        setUser(updatedUser);
      }

      const confirmedImmediately =
        updatedUser &&
        updatedUser.email?.toLowerCase() === cleanNewEmail.toLowerCase() &&
        !updatedUser.new_email;

      if (confirmedImmediately && profile) {
        await updateProfile({ email: updatedUser.email || cleanNewEmail });
        return {
          error: null,
          currentEmail: updatedUser.email || cleanNewEmail,
          pendingNewEmail: null,
        };
      }

      return {
        error: null,
        currentEmail: updatedUser?.email ?? user?.email ?? null,
        pendingNewEmail: updatedUser?.new_email ?? cleanNewEmail,
      };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const verifyEmailChangeOtp = async (
    targetEmail: string,
    token: string
  ): Promise<{
    error: Error | null;
    completed: boolean;
    currentEmail?: string | null;
    pendingNewEmail?: string | null;
  }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error(CLOUD_UNAVAILABLE_MSG), completed: false };
    }
    const cleanTarget = targetEmail.trim();
    const cleanToken = token.trim();
    if (!cleanTarget || !cleanToken) {
      return { error: new Error('Please enter the 6-digit verification code.'), completed: false };
    }
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanTarget,
        token: cleanToken,
        type: 'email_change',
      });
      if (error) {
        return { error: new Error(error.message), completed: false };
      }

      if (data.session) {
        setSession(data.session);
      }
      const resolvedUser = data.user ?? (await supabase.auth.getUser()).data.user;
      if (resolvedUser) {
        setUser(resolvedUser);
      }

      const pendingNewEmail = resolvedUser?.new_email ?? null;
      const currentEmail = resolvedUser?.email ?? null;
      const completed = !pendingNewEmail;

      if (completed && currentEmail) {
        await updateProfile({ email: currentEmail });
      }

      return {
        error: null,
        completed,
        currentEmail,
        pendingNewEmail,
      };
    } catch (err: any) {
      return {
        error: err instanceof Error ? err : new Error(String(err)),
        completed: false,
      };
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
        isRecoveringPassword,
        signIn,
        signUp,
        verifySignupOtp,
        resetPasswordForEmail,
        beginPasswordRecovery,
        cancelPasswordRecovery,
        verifyRecoveryAndUpdatePassword,
        resendConfirmationEmail,
        signOut,
        deleteAccount,
        refreshProfile,
        updateProfile,
        updatePassword,
        updateEmail,
        verifyEmailChangeOtp,
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
