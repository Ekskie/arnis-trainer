import React, { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, type ErrorBoundaryProps, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { MartialTheme } from '@/constants/theme';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: MartialTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 28,
        gap: 14,
      }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: MartialTheme.colors.text, textAlign: 'center' }}>
        Something Went Wrong
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: MartialTheme.colors.textSecondary,
          textAlign: 'center',
          lineHeight: 20,
        }}>
        {error?.message || 'An unexpected error interrupted this screen. Tap Try Again to recover.'}
      </Text>
      <TouchableOpacity
        onPress={retry}
        style={{
          backgroundColor: MartialTheme.colors.primary,
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 12,
          marginTop: 6,
        }}
        activeOpacity={0.85}>
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootNavigator() {
  const { user, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const segment0 = segments[0] as string | undefined;
    const inAuthGroup = segment0 === '(auth)';
    const inCoachGroup = segment0 === '(coach)';
    const isAuthenticated = Boolean(user);

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome' as any);
      }
    } else {
      const role = profile?.role || 'student';
      if (role === 'coach') {
        // Coach is allowed in (coach), direct-chat, and lesson preview.
        // Redirect only if coach is in student-only areas or unauthenticated auth screens.
        const inStudentOnlyArea =
          segment0 === '(tabs)' ||
          segment0 === 'coach-hub' ||
          segment0 === 'coach-connect' ||
          inAuthGroup;

        if (inStudentOnlyArea) {
          router.replace('/(coach)/roster' as any);
        }
      } else {
        // Student is allowed in (tabs), direct-chat, coach-hub, coach-connect, and lesson.
        // Redirect if student enters coach-exclusive area or auth screens.
        if (inAuthGroup || inCoachGroup) {
          router.replace('/(tabs)' as any);
        }
      }
    }
  }, [user, profile, isLoading, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: MartialTheme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(coach)" options={{ headerShown: false }} />
      <Stack.Screen
        name="lesson/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="coach-hub"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="coach-connect"
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="direct-chat/[partnerId]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider value={DefaultTheme}>
          <RootNavigator />
          <StatusBar style="dark" />
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
