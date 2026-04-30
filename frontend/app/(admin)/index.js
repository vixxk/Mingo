import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { ADMIN_STATS, RECENT_ACTIVITIES } from '../../data/admin/adminData';
import { StatCard, SectionTitle, ActivityItem } from '../../components/admin/AdminComponents';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const STATS = ADMIN_STATS;

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Admin Panel</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={STATS.totalUsers.toLocaleString()}
            icon="people"
            gradient={['#1E3A5F', '#0F2439']}
            subtitle="+23 this week"
          />
          <StatCard
            title="Listeners"
            value={STATS.totalListeners}
            icon="headset"
            gradient={['#2D1B4E', '#1A0F2E']}
            subtitle={`${STATS.pendingApprovals} pending`}
          />
          <StatCard
            title="Active Now"
            value={STATS.activeNow}
            icon="radio"
            gradient={['#1B4332', '#0B2B1F']}
            subtitle="Online users"
          />
          <StatCard
            title="Total Calls"
            value={STATS.totalCalls.toLocaleString()}
            icon="call"
            gradient={['#4A1D1D', '#2D1010']}
            subtitle="All time"
          />
        </View>

        {}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <Text style={styles.revenueTitle}>Total Revenue</Text>
            <View style={styles.revenueBadge}>
              <Ionicons name="trending-up" size={14} color="#10B981" />
              <Text style={styles.revenueBadgeText}>+12.5%</Text>
            </View>
          </View>
          <Text style={styles.revenueValue}>₹{STATS.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.revenueSubtext}>Lifetime earnings across platform</Text>
        </View>

        {}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/(admin)/admin-listeners', params: { initialFilter: 'pending' } })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={22} color="#A855F7" />
              {STATS.pendingApprovals > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{STATS.pendingApprovals}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionText}>Approve{'\n'}Listeners</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(admin)/member-reports')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="flag" size={22} color="#3B82F6" />
              {STATS.pendingReports > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{STATS.pendingReports}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionText}>Member{'\n'}Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(admin)/best-choice')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="star" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Best{'\n'}Choice</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionBtn} 
            activeOpacity={0.7}
            onPress={() => router.push('/(admin)/profile-approvals')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Ionicons name="images" size={22} color="#EC4899" />
            </View>
            <Text style={styles.quickActionText}>Profile{'\n'}Approvals</Text>
          </TouchableOpacity>
        </View>

        {}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(10), marginTop: vs(15) }}>
          <Text style={styles.sectionTitle}>Real-time Activities</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/activities')}>
            <Text style={{ color: '#A855F7', fontSize: ms(13), fontFamily: 'Inter_600SemiBold', marginRight: s(4) }}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.activityCard}>
          {RECENT_ACTIVITIES.map((activity, index) => (
            <ActivityItem 
              key={activity.id} 
              activity={activity} 
              isLast={index === RECENT_ACTIVITIES.length - 1} 
            />
          ))}
        </View>

        <View style={{ height: vs(40) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingVertical: SCREEN_HEIGHT * 0.015,
  },
  headerGreeting: {
    fontSize: ms(12, 0.3),
    color: '#A855F7',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
    width: SCREEN_HEIGHT * 0.05,
    height: SCREEN_HEIGHT * 0.05,
    borderRadius: SCREEN_HEIGHT * 0.025,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '800',
  },

  
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: SCREEN_HEIGHT * 0.01,
    paddingBottom: SCREEN_HEIGHT * 0.05,
  },

  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  
  revenueCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: s(20),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: SCREEN_HEIGHT * 0.025,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  revenueTitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },
  revenueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: s(8),
    paddingVertical: vs(3),
    borderRadius: 10,
  },
  actionBadge: {
    position: 'absolute',
    top: -vs(4),
    right: -s(4),
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  actionBadgeText: {
    fontSize: ms(9, 0.3),
    color: '#fff',
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
  },
  revenueBadgeText: {
    fontSize: ms(12, 0.3),
    color: '#10B981',
    fontFamily: 'Inter_700Bold',
  },
  revenueValue: {
    fontSize: ms(36, 0.3),
    fontWeight: '900',
    color: '#10B981',
    fontFamily: 'Inter_900Black',
  },
  revenueSubtext: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },

  
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SCREEN_HEIGHT * 0.025,
  },
  quickActionBtn: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - s(64)) / 4,
  },
  quickActionIcon: {
    width: SCREEN_HEIGHT * 0.06,
    height: SCREEN_HEIGHT * 0.06,
    borderRadius: SCREEN_HEIGHT * 0.03,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.008,
  },
  quickActionText: {
    fontSize: ms(11, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: ms(14),
  },

  
  activityCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(6),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
});
