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

const formatExactTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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
          time: formatActivityTime(a.createdAt),
          exactTime: formatExactTime(a.createdAt)
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

  const maxRevenueVal = Math.max(...revenueData.map(d => d.value), 0);
  const chartMaxValue = maxRevenueVal === 0 ? 100 : Math.ceil(maxRevenueVal * 1.25);

  // Calculate analytics insights for the revenue trend
  const revenueValues = revenueData.map(d => d.value);
  const maxDayRevenue = revenueValues.length > 0 ? Math.max(...revenueValues) : 0;
  const avgDayRevenue = revenueValues.length > 0 ? (revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length) : 0;
  const activeDaysCount = revenueValues.filter(v => v > 0).length;

  const userGrowthData = (stats.charts?.dailyRegistrations || []).map(item => ({
    value: item.count,
    label: item._id.split('-').slice(1).join('/'),
  }));

  // Calculate analytics insights for user registrations
  const registrationValues = userGrowthData.map(d => d.value);
  const maxDayRegistrations = registrationValues.length > 0 ? Math.max(...registrationValues) : 0;
  const avgDayRegistrations = registrationValues.length > 0 ? (registrationValues.reduce((a, b) => a + b, 0) / registrationValues.length) : 0;
  const totalRegistrations = registrationValues.reduce((a, b) => a + b, 0);

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
            subtitle={`${stats.activeChats} active now`}
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
        {/* Creative Redesigned Revenue Trends Section */}
        <View style={styles.premiumChartCard}>
          {/* Card Header with Trend Indicator and Quick Stats */}
          <View style={styles.chartHeaderRow}>
            <View>
              <View style={styles.chartTitleWithIcon}>
                <Ionicons name="trending-up" size={ms(16)} color="#10B981" style={{ marginRight: wp(1.5) }} />
                <Text style={styles.premiumChartTitle}>Revenue Analysis</Text>
              </View>
              <Text style={styles.chartSubtitle}>Daily earnings trends over the past week</Text>
            </View>
            <View style={styles.trendBadge}>
              <Ionicons name="caret-up" size={ms(12)} color="#10B981" />
              <Text style={styles.trendBadgeText}>Active</Text>
            </View>
          </View>

          {revenueData.length > 0 ? (
            <View style={styles.chartWrapper}>
              <LineChart
                areaChart
                data={revenueData}
                color="#10B981"
                thickness={3}
                dataPointsColor="#10B981"
                dataPointsRadius={4}
                noOfSections={3}
                maxValue={chartMaxValue}
                yAxisLabelWidth={s(35)}
                yAxisTextStyle={{ color: '#4B5563', fontSize: ms(9), fontFamily: 'Inter_500Medium' }}
                xAxisLabelTextStyle={{ color: '#4B5563', fontSize: ms(8), fontFamily: 'Inter_500Medium' }}
                startFillColor="rgba(16, 185, 129, 0.24)"
                endFillColor="rgba(16, 185, 129, 0.0)"
                startOpacity={0.8}
                endOpacity={0.0}
                initialSpacing={wp(3)}
                rulesType="dashed"
                rulesColor="#1C1C1E"
                xAxisColor="#1C1C1E"
                yAxisColor="#1C1C1E"
                curved
                width={wp(68)}
                height={hp(16)}
                spacing={wp(10.2)}
                pointerConfig={{
                  pointerStripColor: 'rgba(16, 185, 129, 0.3)',
                  pointerStripWidth: 1.5,
                  pointerColor: '#10B981',
                  radius: 5,
                  pointerLabelWidth: s(105),
                  pointerLabelHeight: vs(45),
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: items => {
                    if (!items || items.length === 0) return null;
                    return (
                      <View style={styles.premiumChartTooltip}>
                        <Text style={styles.premiumTooltipLabel}>{items[0].label || 'Date'}</Text>
                        <Text style={styles.premiumTooltipVal}>₹{Number(items[0].value || 0).toFixed(2)}</Text>
                      </View>
                    );
                  },
                }}
              />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="stats-chart" size={ms(32)} color="#1C1C1E" />
              <Text style={styles.emptyChartText}>No transactional activity logged</Text>
            </View>
          )}

          {/* Quick Insights Sub-Bar */}
          <View style={styles.chartInsightsRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>PEAK REVENUE</Text>
              <Text style={[styles.insightValue, { color: '#fff' }]}>₹{maxDayRevenue.toFixed(1)}</Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>DAILY AVERAGE</Text>
              <Text style={[styles.insightValue, { color: '#10B981' }]}>₹{avgDayRevenue.toFixed(1)}</Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>ACTIVE DAYS</Text>
              <Text style={[styles.insightValue, { color: '#A855F7' }]}>{activeDaysCount} Days</Text>
            </View>
          </View>
        </View>

        {/* Creative Redesigned Daily Registrations Section */}
        <View style={styles.premiumChartCard}>
          {/* Card Header with Trend Indicator and Quick Stats */}
          <View style={styles.chartHeaderRow}>
            <View>
              <View style={styles.chartTitleWithIcon}>
                <Ionicons name="people" size={ms(16)} color="#A855F7" style={{ marginRight: wp(1.5) }} />
                <Text style={styles.premiumChartTitle}>Registration Analysis</Text>
              </View>
              <Text style={styles.chartSubtitle}>New user signups over the past week</Text>
            </View>
            <View style={[styles.trendBadge, { borderColor: 'rgba(168, 85, 247, 0.15)', backgroundColor: 'rgba(168, 85, 247, 0.08)' }]}>
              <Ionicons name="caret-up" size={ms(12)} color="#A855F7" />
              <Text style={[styles.trendBadgeText, { color: '#A855F7' }]}>Growth</Text>
            </View>
          </View>

          {userGrowthData.length > 0 ? (
            <View style={styles.chartWrapper}>
              <BarChart
                data={userGrowthData}
                barWidth={wp(4.2)}
                noOfSections={3}
                barBorderRadius={6}
                frontColor="#A855F7"
                gradientColor="#6D28D9"
                showGradient
                yAxisLabelWidth={s(35)}
                yAxisTextStyle={{ color: '#4B5563', fontSize: ms(9), fontFamily: 'Inter_500Medium' }}
                xAxisLabelTextStyle={{ color: '#4B5563', fontSize: ms(8), fontFamily: 'Inter_500Medium' }}
                initialSpacing={wp(3)}
                rulesType="dashed"
                rulesColor="#1C1C1E"
                xAxisColor="#1C1C1E"
                yAxisColor="#1C1C1E"
                width={wp(68)}
                height={hp(16)}
                spacing={wp(4.8)}
              />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="stats-chart" size={ms(32)} color="#1C1C1E" />
              <Text style={styles.emptyChartText}>No signup data available</Text>
            </View>
          )}

          {/* Quick Insights Sub-Bar */}
          <View style={styles.chartInsightsRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>PEAK SIGNUPS</Text>
              <Text style={[styles.insightValue, { color: '#fff' }]}>{maxDayRegistrations} Users</Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>DAILY AVERAGE</Text>
              <Text style={[styles.insightValue, { color: '#A855F7' }]}>{avgDayRegistrations.toFixed(1)} / Day</Text>
            </View>
            <View style={styles.insightDivider} />
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>TOTAL ACQUIRED</Text>
              <Text style={[styles.insightValue, { color: '#10B981' }]}>{totalRegistrations} Users</Text>
            </View>
          </View>
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
    backgroundColor: '#111',
    paddingHorizontal: s(10),
    paddingVertical: vs(6),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    minWidth: s(80),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipText: {
    color: '#10B981',
    fontSize: ms(12),
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

  // Premium Redesigned Revenue Trends Layout Styles
  premiumChartCard: {
    backgroundColor: '#070708',
    borderRadius: 24,
    padding: wp(5),
    marginBottom: hp(2.2),
    borderWidth: 1.2,
    borderColor: '#151518',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(2),
  },
  chartTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumChartTitle: {
    color: '#fff',
    fontSize: ms(15),
    fontFamily: 'Inter_700Bold',
  },
  chartSubtitle: {
    color: '#6B7280',
    fontSize: ms(10),
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    gap: 4,
  },
  trendBadgeText: {
    color: '#10B981',
    fontSize: ms(10),
    fontFamily: 'Inter_700Bold',
  },
  chartWrapper: {
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  premiumChartTooltip: {
    backgroundColor: '#111115',
    borderRadius: 10,
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 99,
    zIndex: 999,
  },
  premiumTooltipLabel: {
    color: '#9CA3AF',
    fontSize: ms(9),
    fontFamily: 'Inter_500Medium',
  },
  premiumTooltipVal: {
    color: '#10B981',
    fontSize: ms(12),
    fontFamily: 'Inter_900Black',
    marginTop: 1,
  },
  chartInsightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D0D10',
    borderRadius: 16,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: '#151518',
    marginTop: hp(1),
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightLabel: {
    color: '#4B5563',
    fontSize: ms(8),
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: ms(13),
    fontFamily: 'Inter_800ExtraBold',
  },
  insightDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: '#1A1A22',
  },
});
