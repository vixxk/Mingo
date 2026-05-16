import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

const FILTERS = ['all', 'completed', 'active', 'cancelled'];

const FILTER_CONFIG = {
  all: { icon: 'layers', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  completed: { icon: 'checkmark-circle', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  active: { icon: 'pulse', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  cancelled: { icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return '#22C55E';
    case 'active': return '#3B82F6';
    case 'cancelled': return '#EF4444';
    case 'missed': return '#F59E0B';
    default: return '#6B7280';
  }
};

export default function AdminSessions() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadSessions = useCallback(async (p = 1, statusFilter = filter) => {
    try {
      if (p === 1) setLoading(true);
      const params = { page: p, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await adminAPI.getSessions(params);
      const data = res.data;
      setSessions(p === 1 ? data.sessions : [...sessions, ...data.sessions]);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, sessions]);

  useEffect(() => {
    loadSessions(1, filter);
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions(1, filter);
  }, [filter]);

  if (loading && sessions.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="list" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Sessions</Text>
        <Text style={styles.headerCount}>{total}</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterWrapper}>
          {FILTERS.map((f) => {
            const active = filter === f;
            const config = FILTER_CONFIG[f];
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterTab,
                  active && { backgroundColor: config.bg, borderColor: config.color }
                ]}
                onPress={() => setFilter(f)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? config.icon : `${config.icon}-outline`}
                  size={16}
                  color={active ? config.color : '#6B7280'}
                />
                <Text style={[
                  styles.filterTabText,
                  active && { color: config.color, fontWeight: '700' }
                ]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Session List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" colors={['#A855F7']} />
        }
      >
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>No sessions found</Text>
          </View>
        ) : (
          sessions.map((sess) => (
            <View key={sess.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.callTypeBadge}>
                  <Ionicons
                    name={sess.callType === 'video' ? 'videocam' : 'call'}
                    size={14}
                    color={sess.callType === 'video' ? '#3B82F6' : '#10B981'}
                  />
                  <Text style={[styles.callTypeText, { color: sess.callType === 'video' ? '#3B82F6' : '#10B981' }]}>
                    {sess.callType}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(sess.status)}22` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(sess.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(sess.status) }]}>
                    {sess.status}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionBody}>
                <View style={styles.participantRow}>
                  <Ionicons name="person" size={14} color="#9CA3AF" />
                  <Text style={styles.participantText}>{sess.userName}</Text>
                  <Ionicons name="arrow-forward" size={12} color="#4B5563" />
                  <Ionicons name="headset" size={14} color="#A855F7" />
                  <Text style={styles.participantText}>{sess.listenerName}</Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{sess.duration || 0} min</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Coins</Text>
                    <Text style={styles.statValue}>{sess.coinsDeducted || 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Earnings</Text>
                    <Text style={styles.statValue}>₹{(sess.listenerEarnings || 0).toFixed(1)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Profit</Text>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>
                      ₹{(sess.platformProfit || 0).toFixed(1)}
                    </Text>
                  </View>
                </View>

                {/* Rating & Feedback */}
                {sess.rating && (
                  <View style={styles.ratingRow}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= sess.rating ? 'star' : 'star-outline'}
                          size={14}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                    {sess.feedback && (
                      <Text style={styles.feedbackText} numberOfLines={2}>
                        "{sess.feedback}"
                      </Text>
                    )}
                  </View>
                )}

                <Text style={styles.dateText}>{formatDate(sess.startTime)}</Text>
              </View>
            </View>
          ))
        )}

        {sessions.length < total && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => loadSessions(page + 1, filter)}
            activeOpacity={0.7}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: hp(10) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  headerTitle: {
    flex: 1,
    fontSize: ms(20),
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  headerCount: {
    fontSize: ms(14),
    color: '#A855F7',
    fontFamily: 'Inter_700Bold',
    backgroundColor: 'rgba(168,85,247,0.12)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.4),
    borderRadius: 12,
  },

  filterContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  filterWrapper: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderRadius: ms(14),
    padding: ms(4),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    borderRadius: ms(10),
    gap: s(6),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabText: {
    color: '#6B7280',
    fontSize: ms(11),
    fontFamily: 'Inter_500Medium',
  },

  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },

  sessionCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: '#111',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.4),
    borderRadius: 12,
  },
  callTypeText: {
    fontSize: ms(11),
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.4),
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: ms(11),
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },

  sessionBody: {},
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  participantText: {
    color: '#D1D5DB',
    fontSize: ms(13),
    fontFamily: 'Inter_500Medium',
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.2),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: ms(10),
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },

  ratingRow: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: wp(3),
    marginBottom: hp(1),
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: hp(0.5),
  },
  feedbackText: {
    color: '#9CA3AF',
    fontSize: ms(11),
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },

  dateText: {
    color: '#4B5563',
    fontSize: ms(11),
    fontFamily: 'Inter_400Regular',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(15),
  },
  emptyText: {
    color: '#6B7280',
    fontSize: ms(14),
    fontFamily: 'Inter_500Medium',
    marginTop: hp(1.5),
  },

  loadMoreBtn: {
    alignSelf: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A855F7',
    marginTop: hp(1),
  },
  loadMoreText: {
    color: '#A855F7',
    fontSize: ms(13),
    fontFamily: 'Inter_600SemiBold',
  },
});
