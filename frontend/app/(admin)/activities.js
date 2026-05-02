import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { ActivityItem } from '../../components/admin/AdminComponents';
import { adminAPI } from '../../utils/api';

const { height: SH } = Dimensions.get('window');
const PAGE_SIZE = 20;

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

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchActivities = useCallback(async (pageNum = 1, append = false) => {
    try {
      const response = await adminAPI.getActivities(PAGE_SIZE, pageNum);
      const rawActivities = response.data?.activities || response.data || [];
      const total = response.data?.total || rawActivities.length;

      const formatted = rawActivities.map((a) => ({
        id: a._id || a.id,
        user: a.user,
        action: a.action,
        type: a.type || 'system',
        time: formatActivityTime(a.createdAt),
        icon: a.icon || 'information-circle',
        color: a.color || '#3B82F6',
      }));

      if (append) {
        setActivities((prev) => [...prev, ...formatted]);
      } else {
        setActivities(formatted);
      }

      setHasMore(pageNum * PAGE_SIZE < total);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchActivities(1);
  }, [fetchActivities]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  }, [loadingMore, hasMore, page, fetchActivities]);

  const handleScroll = useCallback(
    (event) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const isNearBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - SH * 0.1;
      if (isNearBottom && hasMore && !loadingMore) {
        loadMore();
      }
    },
    [hasMore, loadingMore, loadMore]
  );

  if (loading) {
    return (
      <View style={[st.container, st.center, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={st.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={st.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>All Activities</Text>
        <View style={{ width: s(40) }} />
      </View>

      <ScrollView
        style={st.list}
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
            colors={['#A855F7']}
          />
        }
      >
        {activities.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="time-outline" size={48} color="#333" />
            <Text style={st.emptyText}>No activities recorded yet</Text>
          </View>
        ) : (
          <View style={st.activityCard}>
            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
              />
            ))}
          </View>
        )}

        {loadingMore && (
          <View style={st.loadingMore}>
            <ActivityIndicator size="small" color="#A855F7" />
            <Text style={st.loadingMoreText}>Loading more...</Text>
          </View>
        )}

        {!hasMore && activities.length > 0 && (
          <Text style={st.endText}>All activities loaded</Text>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    color: '#9CA3AF',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    marginTop: vs(12),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingVertical: SH * 0.015,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: ms(20, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  list: { flex: 1, marginTop: vs(10) },
  activityCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(6),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH * 0.15,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_500Medium',
    marginTop: vs(12),
    textAlign: 'center',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(16),
    gap: s(8),
  },
  loadingMoreText: {
    color: '#6B7280',
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_400Regular',
  },
  endText: {
    color: '#374151',
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: vs(16),
  },
});
