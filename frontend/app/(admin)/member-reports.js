import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { FilterTab } from '../../components/admin/AdminComponents';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

const { height: SH } = Dimensions.get('window');

const formatTime = (dateStr) => {
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

export default function MemberReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);

  const fetchReports = useCallback(async (status) => {
    try {
      const response = await adminAPI.getReports({ status });
      const data = response.data?.reports || response.data || [];
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
      Alert.alert('Error', 'Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchReports(filter);
  }, [filter, fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports(filter);
  }, [filter, fetchReports]);

  const handleAction = (id, newStatus) => {
    const actionLabel = newStatus === 'resolved' ? 'Resolve' : 'Dismiss';
    Alert.alert(
      `${actionLabel} Report`,
      `Are you sure you want to ${actionLabel.toLowerCase()} this issue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(id);
            try {
              await adminAPI.updateReport(id, { status: newStatus });
              setReports((prev) => prev.filter((r) => r._id !== id));
            } catch (error) {
              console.error('Failed to update report:', error);
              Alert.alert('Error', 'Failed to update report. Please try again.');
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[st.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="list" />
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
        <Text style={st.headerTitle}>Member Reports</Text>
        <View style={{ width: s(40) }} />
      </View>

      {}
      <View style={st.filterRow}>
        <FilterTab
          label="Pending"
          active={filter === 'pending'}
          onPress={() => setFilter('pending')}
        />
        <FilterTab
          label="Resolved"
          active={filter === 'resolved'}
          onPress={() => setFilter('resolved')}
        />
      </View>

      <ScrollView
        style={st.list}
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
            colors={['#A855F7']}
          />
        }
      >
        {reports.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="checkmark-done-circle" size={60} color="#1F2937" />
            <Text style={st.emptyText}>No {filter} reports found</Text>
          </View>
        ) : (
          reports.map((report) => {
            const reportId = report._id || report.id;
            const reporterName =
              report.reporter?.name || report.reporter?.username || 'Unknown User';
            const reporterRole = report.reporterRole || 'user';

            return (
              <View key={reportId} style={st.reportCard}>
                <View style={st.cardHeader}>
                  <View style={st.reporterInfo}>
                    <Text style={st.reporterName}>{reporterName}</Text>
                    <View
                      style={[
                        st.roleBadge,
                        {
                          backgroundColor:
                            reporterRole === 'listener'
                              ? 'rgba(168,85,247,0.15)'
                              : 'rgba(59,130,246,0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          st.roleText,
                          {
                            color:
                              reporterRole === 'listener' ? '#A855F7' : '#3B82F6',
                          },
                        ]}
                      >
                        {reporterRole.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={st.timeText}>{formatTime(report.createdAt)}</Text>
                </View>

                <Text style={st.messageText}>{report.message}</Text>

                {filter === 'pending' && (
                  <View style={st.cardActions}>
                    <TouchableOpacity
                      style={[st.actionBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => handleAction(reportId, 'resolved')}
                      disabled={updating === reportId}
                    >
                      {updating === reportId ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={st.actionText}>Resolve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[st.actionBtn, { backgroundColor: '#374151' }]}
                      onPress={() => handleAction(reportId, 'reviewed')}
                      disabled={updating === reportId}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text style={st.actionText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
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
  filterRow: {
    flexDirection: 'row',
    gap: s(10),
    paddingHorizontal: s(16),
    marginBottom: vs(15),
  },
  list: { flex: 1 },
  reportCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: s(16),
    marginBottom: vs(12),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: vs(10),
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  reporterName: {
    fontSize: ms(15, 0.3),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  roleBadge: {
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: ms(10, 0.3),
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },
  timeText: {
    fontSize: ms(11, 0.3),
    color: '#4B5563',
    fontFamily: 'Inter_400Regular',
  },
  messageText: {
    fontSize: ms(14, 0.3),
    color: '#D1D5DB',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(20),
    marginBottom: vs(15),
  },
  cardActions: {
    flexDirection: 'row',
    gap: s(10),
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    borderRadius: 12,
  },
  actionText: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SH * 0.2,
  },
  emptyText: {
    color: '#4B5563',
    fontSize: ms(16, 0.3),
    fontFamily: 'Inter_500Medium',
    marginTop: vs(10),
  },
});
