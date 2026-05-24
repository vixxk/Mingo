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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';
import { FilterTab } from '../../components/admin/AdminComponents';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

const { width: SW, height: SH } = Dimensions.get('window');

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

const formatAbsoluteTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function MemberReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    reportId: null,
    status: null,
    title: '',
    message: '',
  });

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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReports(filter);
    }, [filter, fetchReports])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports(filter);
  }, [filter, fetchReports]);

  const handleAction = (id, newStatus) => {
    const actionLabel = newStatus === 'resolved' ? 'Resolve' : 'Dismiss';
    setConfirmModal({
      visible: true,
      reportId: id,
      status: newStatus,
      title: `${actionLabel} Report`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} this issue?`,
    });
  };

  const confirmAction = async () => {
    const { reportId, status } = confirmModal;
    if (!reportId || !status) return;

    setUpdating(reportId);
    try {
      await adminAPI.updateReport(reportId, { status });
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      setConfirmModal({
        visible: false,
        reportId: null,
        status: null,
        title: '',
        message: '',
      });
    } catch (error) {
      console.error('Failed to update report:', error);
      Alert.alert('Error', 'Failed to update report. Please try again.');
    } finally {
      setUpdating(null);
    }
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

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={st.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Member Reports</Text>
        <View style={{ width: s(40) }} />
      </View>

      {/* Filter Tabs */}
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
        <FilterTab
          label="Dismissed"
          active={filter === 'reviewed'}
          onPress={() => setFilter('reviewed')}
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
            <Text style={st.emptyText}>No {filter === 'reviewed' ? 'dismissed' : filter} reports found</Text>
          </View>
        ) : (
          reports.map((report) => {
            const reportId = report._id || report.id;
            const reporterName = report.reporter?.name || 'No Name';
            const reporterUsername = report.reporter?.username ? `@${report.reporter.username}` : 'unknown';
            const displayName = `${reporterName} (${reporterUsername})`;
            const reporterRole = report.reporterRole || 'user';

            return (
              <View key={reportId} style={st.reportCard}>
                <View style={st.cardHeader}>
                  <View style={st.reporterInfo}>
                    <Text style={st.reporterName}>{displayName}</Text>
                    <View
                      style={[
                        st.roleBadge,
                        {
                          backgroundColor:
                            reporterRole === 'listener'
                              ? 'rgba(168,85,247,0.12)'
                              : 'rgba(59,130,246,0.12)',
                          borderColor:
                            reporterRole === 'listener'
                              ? 'rgba(168,85,247,0.25)'
                              : 'rgba(59,130,246,0.25)',
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          st.roleText,
                          {
                            color:
                              reporterRole === 'listener' ? '#C084FC' : '#60A5FA',
                          },
                        ]}
                      >
                        {reporterRole.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Subtitle/Time of reporting */}
                <View style={st.reportMetaRow}>
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text style={st.metaTimeText}>
                    Reported {formatTime(report.createdAt)} ({formatAbsoluteTime(report.createdAt)})
                  </Text>
                </View>

                <View style={st.messageBox}>
                  <Text style={st.messageText}>{report.message}</Text>
                </View>

                {filter === 'pending' && (
                  <View style={st.cardActions}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleAction(reportId, 'resolved')}
                      disabled={updating === reportId}
                      style={st.cardActionBtnContainer}
                    >
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={st.actionBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {updating === reportId ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                            <Text style={st.actionText}>Resolve</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleAction(reportId, 'reviewed')}
                      disabled={updating === reportId}
                      style={st.cardActionBtnContainer}
                    >
                      <LinearGradient
                        colors={['#374151', '#1F2937']}
                        style={st.actionBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#fff" />
                        <Text style={st.actionText}>Dismiss</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Custom Resolve/Dismiss Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={st.overlay}>
          <View style={st.modalBox}>
            <View style={[
              st.modalIconContainer,
              { backgroundColor: confirmModal.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
            ]}>
              <Ionicons
                name={confirmModal.status === 'resolved' ? 'checkmark-circle' : 'trash'}
                size={SW * 0.08}
                color={confirmModal.status === 'resolved' ? '#10B981' : '#EF4444'}
              />
            </View>

            <Text style={st.modalTitle}>{confirmModal.title}</Text>
            <Text style={st.modalMessage}>{confirmModal.message}</Text>

            <View style={st.modalButtons}>
              <TouchableOpacity
                style={st.modalBtnCancel}
                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                activeOpacity={0.8}
              >
                <Text style={st.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={st.modalBtnConfirm}
                onPress={confirmAction}
                activeOpacity={0.8}
                disabled={updating === confirmModal.reportId}
              >
                <LinearGradient
                  colors={confirmModal.status === 'resolved' ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                  style={st.modalBtnConfirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {updating === confirmModal.reportId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={st.modalBtnConfirmText}>Confirm</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#0D0D10',
    borderRadius: 20,
    padding: s(18),
    marginBottom: vs(14),
    borderWidth: 1.2,
    borderColor: '#1F1F24',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: vs(6),
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: s(8),
  },
  reporterName: {
    fontSize: ms(14, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
  },
  roleBadge: {
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: ms(9, 0.3),
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },
  reportMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginBottom: vs(12),
  },
  metaTimeText: {
    fontSize: ms(11, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  messageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: s(12),
    paddingVertical: vs(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: vs(16),
  },
  messageText: {
    fontSize: ms(13, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(19),
  },
  cardActions: {
    flexDirection: 'row',
    gap: s(10),
  },
  cardActionBtnContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingVertical: vs(12),
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SW * 0.05,
  },
  modalBox: {
    width: SW * 0.88,
    backgroundColor: '#0D0D10',
    borderRadius: SW * 0.06,
    borderWidth: 1.5,
    borderColor: '#1F1F24',
    padding: SW * 0.06,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: SW * 0.16,
    height: SW * 0.16,
    borderRadius: SW * 0.08,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SH * 0.02,
  },
  modalTitle: {
    color: '#fff',
    fontSize: SW * 0.05,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: SH * 0.01,
  },
  modalMessage: {
    color: '#9CA3AF',
    fontSize: SW * 0.036,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: SW * 0.052,
    marginBottom: SH * 0.03,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: SW * 0.03,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: SH * 0.016,
    borderRadius: SW * 0.03,
    borderWidth: 1.2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    color: '#9CA3AF',
    fontSize: SW * 0.036,
    fontFamily: 'Inter_600SemiBold',
  },
  modalBtnConfirm: {
    flex: 1.2,
    borderRadius: SW * 0.03,
    overflow: 'hidden',
  },
  modalBtnConfirmGradient: {
    paddingVertical: SH * 0.016,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnConfirmText: {
    color: '#fff',
    fontSize: SW * 0.036,
    fontFamily: 'Inter_700Bold',
  },
});
