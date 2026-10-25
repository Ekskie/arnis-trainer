import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { MartialTheme } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationContext';

export default function CoachTabLayout() {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  // Responsively adapt to system navigation (Android 3-button bar ~48px, gesture bar ~16-24px, iOS bar ~34px)
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 12);
  const tabHeight = 60 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D97706', // Coach Gold/Amber theme
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
        name="roster"
        options={{
          title: 'Students',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="drills"
        options={{
          title: 'Curriculum',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="shield-sword" size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Guro Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={23} color={color} />
          ),
        }}
      />
      {/* Hide dynamic student detail route from tab bar */}
      <Tabs.Screen
        name="student/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
