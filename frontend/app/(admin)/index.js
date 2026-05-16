import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { StatCard, SectionTitle, ActivityItem } from '../../components/admin/AdminComponents';
import { adminAPI, authAPI } from '../../utils/api';
import { useFocusEffect } from 'expo-router';
import { LineChart, BarChart } from "react-native-gifted-charts";
import { AdminPageSkeleton } from '../../components/admin/Skeleton';
import LogoutPopup from '../../components/shared/LogoutPopup';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatActivityTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const handleLogout = () => setShowLogoutPopup(true);

  const handleConfirmLogout = async () => {
    setShowLogoutPopup(false);
    await authAPI.logout();
    router.replace('/login');
  };

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListeners: 0,
    pendingApprovals: 0,
    pendingReports: 0,
    activeNow: 0, // Online Listeners
    totalCalls: 0,
    totalRevenue: 0,
    activeUsersToday: 0,
    coinsPurchasedToday: 0,
    diamondsGenerated: 0,
    pendingPayoutAmount: 0,
    activeChats: 0,
    charts: {
      dailyRevenue: [],
      dailyRegistrations: []
    }
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAdminData = async () => {
    try {
      const statsRes = await adminAPI.getStats();
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
      const actsRes = await adminAPI.getActivities(3);
      if (actsRes?.data) {
        const rawActs = actsRes.data.activities || [];
        const formatted = rawActs.map(a => ({
          ...a,
          id: a._id || a.id,
          time: formatActivityTime(a.createdAt)
        }));
        setActivities(formatted);
      }
    } catch (e) {
      console.error('Failed to load admin stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const revenueData = (stats.charts?.dailyRevenue || []).map(item => ({
    value: item.amount,
    label: item._id.split('-').slice(1).join('/'),
  }));

  const userGrowthData = (stats.charts?.dailyRegistrations || []).map(item => ({
    value: item.count,
    label: item._id.split('-').slice(1).join('/'),
  }));

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="dashboard" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Mingo HQ</Text>
          <Text style={styles.headerTitle}>System Overview</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.exitBtn}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notifBtn}
            onPress={() => router.push('/(admin)/admin-notifications')}
          >
            <Ionicons name="notifications" size={24} color="#A855F7" />
            {stats.pendingReports > 0 && <View style={styles.notifBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />
        }
      >
        {/* Top 4 Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon="people"
            gradient={['#1E3A5F', '#0F2439']}
            subtitle={`${stats.activeUsersToday} active today`}
            onPress={() => router.push('/(admin)/admin-users')}
          />
          <StatCard
            title="Listeners"
            value={stats.totalListeners}
            icon="headset"
            gradient={['#2D1B4E', '#1A0F2E']}
            subtitle={`${stats.activeNow} online now`}
            onPress={() => router.push('/(admin)/admin-listeners')}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Revenue"
            value={`₹${stats.totalRevenue.toLocaleString()}`}
            icon="wallet"
            gradient={['#064E3B', '#022C22']}
            subtitle={`${stats.coinsPurchasedToday} coins today`}
            onPress={() => router.push('/(admin)/admin-wallet')}
          />
          <StatCard
            title="Total Sessions"
            value={stats.totalCalls}
            icon="call"
            gradient={['#3B2A10', '#1F1508']}
            subtitle={`${stats.activeChats} active chats`}
            onPress={() => router.push('/(admin)/admin-sessions')}
          />
        </View>

        {/* Secondary Stats Row */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Pending Payout"
            value={`₹${stats.pendingPayoutAmount.toLocaleString()}`}
            icon="cash"
            gradient={['#4A1D1D', '#2D1010']}
            onPress={() => router.push('/(admin)/admin-payouts')}
          />
          <StatCard
            title="Pending Reports"
            value={stats.pendingReports}
            icon="flag"
            gradient={['#1F2937', '#111827']}
            onPress={() => router.push('/(admin)/member-reports')}
          />
        </View>

        {/* Charts Section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Revenue Trend (₹)</Text>
          {revenueData.length > 0 ? (
            <LineChart
              areaChart
              data={revenueData}
              color="#10B981"
              thickness={3}
              dataPointsColor="#10B981"
              noOfSections={3}
              yAxisTextStyle={{ color: '#6B7280', fontSize: ms(10) }}
              xAxisLabelTextStyle={{ color: '#6B7280', fontSize: ms(9) }}
              startFillColor="rgba(16, 185, 129, 0.3)"
              endFillColor="rgba(16, 185, 129, 0.01)"
              startOpacity={0.8}
              endOpacity={0.1}
              initialSpacing={s(10)}
              hideRules
              curved
              width={SCREEN_WIDTH - s(80)}
              height={vs(120)}
              spacing={s(45)}
              pointerConfig={{
                pointerStripColor: '#10B981',
                pointerStripWidth: 2,
                pointerColor: '#10B981',
                radius: 4,
                pointerLabelComponent: items => (
                  <View style={styles.chartTooltip}>
                    <Text style={styles.tooltipText}>₹{items[0].value}</Text>
                  </View>
                ),
              }}
            />
          ) : (
            <View style={styles.emptyChart}><Text style={styles.emptyChartText}>No data available</Text></View>
          )}
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Daily Registrations</Text>
          {userGrowthData.length > 0 ? (
            <BarChart
              data={userGrowthData}
              barWidth={s(18)}
              noOfSections={3}
              barBorderRadius={6}
              frontColor="#A855F7"
              gradientColor="#6D28D9"
              showGradient
              yAxisTextStyle={{ color: '#6B7280', fontSize: ms(10) }}
              xAxisLabelTextStyle={{ color: '#6B7280', fontSize: ms(9) }}
              initialSpacing={s(10)}
              hideRules
              width={SCREEN_WIDTH - s(80)}
              height={vs(120)}
              spacing={s(20)}
            />
          ) : (
            <View style={styles.emptyChart}><Text style={styles.emptyChartText}>No data available</Text></View>
          )}
        </View>

        {/* Quick Management */}
        <Text style={styles.sectionTitle}>Management Modules</Text>
        <View style={styles.managementGrid}>
          {[
            { id: 'approvals', label: 'Approvals', icon: 'shield-checkmark', color: '#A855F7', route: '/(admin)/profile-approvals', badge: stats.pendingApprovals },
            { id: 'reports', label: 'Reports', icon: 'flag', color: '#EF4444', route: '/(admin)/member-reports', badge: stats.pendingReports },
            { id: 'sessions', label: 'Sessions', icon: 'call', color: '#22C55E', route: '/(admin)/admin-sessions', badge: stats.activeChats },
            { id: 'wallet', label: 'Wallet', icon: 'wallet', color: '#F59E0B', route: '/(admin)/admin-wallet' },
            { id: 'payouts', label: 'Payouts', icon: 'cash', color: '#10B981', route: '/(admin)/admin-payouts', badge: stats.pendingPayoutsCount },
            { id: 'analytics', label: 'Analytics', icon: 'stats-chart', color: '#3B82F6', route: '/(admin)/admin-analytics' },
            { id: 'notifs', label: 'Campaigns', icon: 'megaphone', color: '#EC4899', route: '/(admin)/admin-notifications' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.manageItem}
              onPress={() => router.push({ pathname: item.route, params: item.params })}
            >
              <View style={[styles.manageIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
                {item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text 
                style={styles.manageLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activities */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.sectionTitle}>System Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/activities')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityCard}>
            {activities.length === 0 ? (
              <View style={styles.emptyActivities}>
                <Ionicons name="time-outline" size={32} color="#333" />
                <Text style={styles.emptyActivitiesText}>No recent activity</Text>
              </View>
            ) : (
              activities.map((activity, index) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isLast={index === activities.length - 1}
                />
              ))
            )}
          </View>
        </View>

        <View style={{ height: vs(40) }} />
      </ScrollView>

      <LogoutPopup 
        visible={showLogoutPopup}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutPopup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  headerGreeting: {
    fontSize: ms(12),
    color: '#A855F7',
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingBottom: hp(2),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  exitBtn: {
    width: s(38),
    height: s(38),
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  notifBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: 20,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  headerTitle: {
    fontSize: ms(26),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  notifBadge: {
    position: 'absolute',
    top: hp(1),
    right: wp(3),
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(5),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  revenueCard: {
    borderRadius: 24,
    padding: wp(6),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  revLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(12),
    fontFamily: 'Inter_500Medium',
  },
  revValue: {
    color: '#fff',
    fontSize: ms(32),
    fontFamily: 'Inter_900Black',
  },
  revStatItem: {
    alignItems: 'flex-end',
  },
  revSubLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: ms(10),
  },
  chartTooltip: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  tooltipText: {
    color: '#fff',
    fontSize: ms(10),
    fontFamily: 'Inter_700Bold',
  },
  chartContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#111',
  },
  chartTitle: {
    color: '#9CA3AF',
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
    marginBottom: hp(1.5),
  },
  emptyChart: {
    height: vs(100),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: '#4B5563',
    fontSize: ms(12),
  },
  sectionTitle: {
    fontSize: ms(18),
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: hp(1.5),
    marginTop: hp(1),
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(3),
  },
  manageItem: {
    width: wp(28),
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: wp(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111',
  },
  manageIcon: {
    width: wp(12),
    height: wp(12),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  manageLabel: {
    color: '#9CA3AF',
    fontSize: ms(11),
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  badgeText: {
    color: '#fff',
    fontSize: ms(9),
    fontWeight: '900',
  },
  activitySection: {
    marginTop: hp(1),
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    color: '#A855F7',
    fontSize: ms(13),
    fontFamily: 'Inter_600SemiBold',
  },
  activityCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    paddingVertical: vs(5),
    borderWidth: 1,
    borderColor: '#111',
  },
  emptyActivities: {
    padding: hp(3),
    alignItems: 'center',
  },
  emptyActivitiesText: {
    color: '#4B5563',
    fontSize: ms(13),
    marginTop: hp(1),
  },
});
