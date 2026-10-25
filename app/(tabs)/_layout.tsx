import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { MartialTheme } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Responsively adapt to system navigation (Android 3-button bar ~48px, gesture bar ~16-24px, iOS bar ~34px)
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 12);
  const tabHeight = 60 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: MartialTheme.colors.primary,
        tabBarInactiveTintColor: '#8E9A92',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: MartialTheme.colors.border,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="evaluate"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="sword-cross" size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
