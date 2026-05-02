import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminAPI } from '../../utils/api';
import { ms, s, vs } from '../../utils/responsive';

const { width: SW, height: SH } = Dimensions.get('window');

const getAvatarImage = (gender, index) => {
  const parsedIndex = parseInt(index, 10) || 0;
  if (gender === 'Male') {
    const maleAvatars = [
      require('../../images/male_avatar_1_1776972918440.png'),
      require('../../images/male_avatar_2_1776972933241.png'),
      require('../../images/male_avatar_3_1776972950218.png'),
      require('../../images/male_avatar_4_1776972963577.png'),
      require('../../images/male_avatar_5_1776972978900.png'),
      require('../../images/male_avatar_6_1776972993180.png'),
      require('../../images/male_avatar_7_1776973008143.png'),
      require('../../images/male_avatar_8_1776973021635.png'),
    ];
    return maleAvatars[parsedIndex] || maleAvatars[0];
  } else {
    const femaleAvatars = [
      require('../../images/female_avatar_1_1776973035859.png'),
      require('../../images/female_avatar_2_1776973050039.png'),
      require('../../images/female_avatar_3_1776973063471.png'),
      require('../../images/female_avatar_4_1776973077539.png'),
      require('../../images/female_avatar_5_1776973090730.png'),
      require('../../images/female_avatar_6_1776973108100.png'),
      require('../../images/female_avatar_7_1776973124018.png'),
      require('../../images/female_avatar_8_1776973138772.png'),
    ];
    return femaleAvatars[parsedIndex] || femaleAvatars[0];
  }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function ProfileApprovalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);

  const fetchPendingListeners = useCallback(async () => {
    try {
      const response = await adminAPI.getListeners({ status: 'pending' });
      const data = response.data?.listeners || response.data || [];
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      Alert.alert('Error', 'Failed to load pending approvals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingListeners();
  }, [fetchPendingListeners]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPendingListeners();
  }, [fetchPendingListeners]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await adminAPI.approveListener(id);
      Alert.alert('Approved', 'Listener has been approved and is now live.');
      setApprovals((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Failed to approve:', error);
      Alert.alert('Error', 'Failed to approve listener.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    try {
      await adminAPI.rejectListener(id);
      Alert.alert('Rejected', 'Listener application has been rejected.');
      setApprovals((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Failed to reject:', error);
      Alert.alert('Error', 'Failed to reject listener.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.loadingText}>Loading pending approvals...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Approvals</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
            colors={['#A855F7']}
          />
        }
      >
        {approvals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#22C55E" />
            <Text style={styles.emptyText}>
              All caught up! No pending profile approvals.
            </Text>
          </View>
        ) : (
          approvals.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Image
                  source={getAvatarImage(req.gender, req.avatarIndex)}
                  style={styles.avatar}
                />
                <View style={styles.headerInfo}>
                  <Text style={styles.listenerName}>{req.name}</Text>
                  <Text style={styles.submittedAt}>
                    Submitted {formatTime(req.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.changesSection}>
                <Text style={styles.changeLabel}>Phone:</Text>
                <Text style={styles.changeValue}>{req.phone || 'N/A'}</Text>

                <Text style={styles.changeLabel}>Rating:</Text>
                <Text style={styles.changeValue}>
                  {req.rating ? `${req.rating} ⭐` : 'New Listener'}
                </Text>

                <Text style={styles.changeLabel}>Verified:</Text>
                <Text style={styles.changeValue}>
                  {req.verified ? 'Yes ✓' : 'No'}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleReject(req.id)}
                  disabled={processing === req.id}
                >
                  {processing === req.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="close" size={20} color="#EF4444" />
                      <Text style={[styles.btnText, { color: '#EF4444' }]}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(req.id)}
                  disabled={processing === req.id}
                >
                  {processing === req.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.btnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: SW * 0.035,
    fontFamily: 'Inter_400Regular',
    marginTop: '3%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '4%',
    paddingVertical: '3%',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: SW * 0.045,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  scrollContent: {
    padding: '5%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '30%',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: SW * 0.04,
    marginTop: '4%',
    fontFamily: 'Inter_500Medium',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: '5%',
    marginBottom: '5%',
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '4%',
  },
  avatar: {
    width: SW * 0.12,
    height: SW * 0.12,
    borderRadius: (SW * 0.12) / 2,
    marginRight: '3%',
  },
  headerInfo: {
    flex: 1,
  },
  listenerName: {
    color: '#fff',
    fontSize: SW * 0.045,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  submittedAt: {
    color: '#6B7280',
    fontSize: SW * 0.03,
    marginTop: 2,
  },
  changesSection: {
    backgroundColor: '#1A1A1A',
    padding: '4%',
    borderRadius: 12,
    marginBottom: '5%',
  },
  changeLabel: {
    color: '#9CA3AF',
    fontSize: SW * 0.032,
    marginBottom: 2,
    marginTop: 6,
    fontFamily: 'Inter_500Medium',
  },
  changeValue: {
    color: '#E5E7EB',
    fontSize: SW * 0.035,
    fontFamily: 'Inter_400Regular',
    lineHeight: SW * 0.05,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: '3%',
    borderRadius: 12,
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  approveBtn: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E',
  },
  btnText: {
    color: '#fff',
    fontSize: SW * 0.038,
    fontWeight: '600',
    marginLeft: 6,
  },
});
