import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, vs } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const [counts, setCounts] = useState({ approvals: 0, reports: 0, payouts: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await adminAPI.getStats(7);
        setCounts({
          approvals: res.data.pendingApprovals || 0,
          reports: res.data.pendingReports || 0,
          payouts: res.data.pendingPayoutsCount || 0,
        });
      } catch (e) {
        console.error('Failed to fetch admin counts:', e);
      }
    };
    fetchCounts();
    // Refresh every 2 minutes
    const interval = setInterval(fetchCounts, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: { backgroundColor: '#000' },
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? vs(75) + insets.bottom : vs(65),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : vs(10),
          paddingTop: vs(6),
        },
        tabBarActiveTintColor: '#A855F7',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: ms(10, 0.3),
        },
        tabBarBadgeStyle: {
          backgroundColor: '#EF4444',
          fontSize: ms(8),
          lineHeight: ms(11),
          marginTop: vs(-2),
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people-sharp' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-listeners"
        options={{
          title: 'Listeners',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'headset-sharp' : 'headset-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'call-sharp' : 'call-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile-approvals"
        options={{
          title: 'Approvals',
          tabBarBadge: counts.approvals > 0 ? counts.approvals : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark-sharp' : 'shield-checkmark-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="best-choice"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="banned-members"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="member-reports"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-wallet"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-payouts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-analytics"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="system-config"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
