import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Image, Alert, ActivityIndicator, RefreshControl,
  Linking, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';
import { ms, s, vs, wp, hp } from '../../utils/responsive';

const { width: SW, height: SH } = Dimensions.get('window');

const getAvatarImage = (gender, index) => {
  const parsedIndex = parseInt(index, 10) || 0;
  if (gender === 'Male') {
    const m = [
      require('../../images/male_avatar_1_1776972918440.png'),
      require('../../images/male_avatar_2_1776972933241.png'),
      require('../../images/male_avatar_3_1776972950218.png'),
      require('../../images/male_avatar_4_1776972963577.png'),
      require('../../images/male_avatar_5_1776972978900.png'),
      require('../../images/male_avatar_6_1776972993180.png'),
      require('../../images/male_avatar_7_1776973008143.png'),
      require('../../images/male_avatar_8_1776973021635.png'),
    ];
    return m[parsedIndex] || m[0];
  }
  const f = [
    require('../../images/female_avatar_1_1776973035859.png'),
    require('../../images/female_avatar_2_1776973050039.png'),
    require('../../images/female_avatar_3_1776973063471.png'),
    require('../../images/female_avatar_4_1776973077539.png'),
    require('../../images/female_avatar_5_1776973090730.png'),
    require('../../images/female_avatar_6_1776973108100.png'),
    require('../../images/female_avatar_7_1776973124018.png'),
    require('../../images/female_avatar_8_1776973138772.png'),
  ];
  return f[parsedIndex] || f[0];
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const IntroVideo = ({ url }) => {
  const [error, setError] = useState(false);
  const player = useVideoPlayer(url, (p) => { p.loop = true; p.pause(); });
  if (!url) return null;
  return (
    <View style={styles.videoContainer}>
      <VideoView style={styles.video} player={player} fullscreenOptions={{ enabled: true }} allowsPictureInPicture onError={() => setError(true)} />
      {error && (
        <View style={styles.videoError}>
          <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
          <Text style={styles.errorText}>Video failed to load</Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)}>
            <Text style={styles.linkText}>Open in browser</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const FieldDiff = ({ label, current, draft }) => {
  if (!draft && !current) return null;
  const changed = draft !== undefined && draft !== current;
  return (
    <View style={styles.diffRow}>
      <Text style={styles.changeLabel}>{label}</Text>
      {changed ? (
        <View>
          <Text style={[styles.changeValue, { color: '#6B7280', textDecorationLine: 'line-through' }]}>{current || '(empty)'}</Text>
          <Text style={[styles.changeValue, { color: '#22C55E' }]}>{draft || '(empty)'}</Text>
        </View>
      ) : (
        <Text style={styles.changeValue}>{current || draft || '(empty)'}</Text>
      )}
    </View>
  );
};

const TagsDiff = ({ label, current = [], draft = [] }) => {
  const added = draft.filter((t) => !current.includes(t));
  const removed = current.filter((t) => !draft.includes(t));
  const kept = current.filter((t) => draft.includes(t));
  if (!draft.length && !current.length) return null;
  return (
    <View style={styles.diffRow}>
      <Text style={styles.changeLabel}>{label}</Text>
      <View style={styles.tagsRow}>
        {kept.map((t) => (<View key={t} style={styles.tagChip}><Text style={styles.tagChipText}>{t}</Text></View>))}
        {added.map((t) => (<View key={t} style={[styles.tagChip, styles.tagAdded]}><Text style={[styles.tagChipText, { color: '#22C55E' }]}>+ {t}</Text></View>))}
        {removed.map((t) => (<View key={t} style={[styles.tagChip, styles.tagRemoved]}><Text style={[styles.tagChipText, { color: '#EF4444', textDecorationLine: 'line-through' }]}>{t}</Text></View>))}
      </View>
    </View>
  );
};

const ImagesDiff = ({ label, current = [], draft = [], onImagePress }) => {
  if (!draft.length && !current.length) return null;
  const images = draft.length ? draft : current;
  return (
    <View style={styles.diffRow}>
      <Text style={styles.changeLabel}>{label} ({images.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
        {images.map((url, i) => (
          <TouchableOpacity key={i} onPress={() => onImagePress(url)}>
            <Image source={{ uri: url }} style={styles.thumbImg} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default function ProfileApprovalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState('pending');

  // Reject modal
  const [rejectModal, setRejectModal] = useState({ visible: false, id: null });
  const [rejectNotes, setRejectNotes] = useState('');

  // Image Preview
  const [previewImage, setPreviewImage] = useState(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await adminAPI.getProfileApprovals({ status: filter });
      const data = res.data?.approvals || [];
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load profile approvals:', error);
      Alert.alert('Error', 'Failed to load profile approvals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchApprovals();
  }, [fetchApprovals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (id) => {
    Alert.alert('Approve Changes', 'This will make the draft profile live. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          setProcessing(id);
          try {
            await adminAPI.approveProfileChanges(id);
            Alert.alert('Approved', 'Profile changes are now live.');
            setApprovals((prev) => prev.filter((r) => r.id !== id));
          } catch (error) {
            console.error('Failed to approve:', error);
            Alert.alert('Error', 'Failed to approve profile changes.');
          } finally {
            setProcessing(null);
          }
        },
      },
    ]);
  };

  const openRejectModal = (id) => {
    setRejectNotes('');
    setRejectModal({ visible: true, id });
  };

  const handleReject = async () => {
    const { id } = rejectModal;
    setRejectModal({ visible: false, id: null });
    setProcessing(id);
    try {
      await adminAPI.rejectProfileChanges(id, rejectNotes || 'Your profile changes did not meet our guidelines.');
      Alert.alert('Rejected', 'Profile changes have been rejected.');
      setApprovals((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to reject:', error);
      Alert.alert('Error', 'Failed to reject profile changes.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="list" />
      </View>
    );
  }

  const FILTERS = ['pending', 'approved', 'rejected', 'all'];
  const FILTER_CONFIG = {
    pending: { icon: 'time', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    approved: { icon: 'checkmark-circle', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    rejected: { icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    all: { icon: 'layers', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Approvals</Text>
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" colors={['#A855F7']} />}
      >
        {approvals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#22C55E" />
            <Text style={styles.emptyText}>
              {filter === 'pending' ? 'No pending profile approvals.' : `No ${filter} profile changes.`}
            </Text>
          </View>
        ) : (
          approvals.map((req) => {
            const cur = req.currentProfile || {};
            const draft = req.draftProfile || {};
            const statusColor = req.profileStatus === 'approved' ? '#22C55E' : req.profileStatus === 'rejected' ? '#EF4444' : '#F59E0B';

            return (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Image source={getAvatarImage(req.gender, req.avatarIndex)} style={styles.avatar} />
                  <View style={styles.headerInfo}>
                    <Text style={styles.listenerName}>{req.name || req.displayName}</Text>
                    <Text style={styles.submittedAt}>
                      Submitted {formatTime(req.profileSubmittedAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusDotText}>
                      {req.profileStatus?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Profile Image Diff */}
                {(draft.profileImage || cur.profileImage) && (
                  <View style={styles.diffRow}>
                    <Text style={styles.changeLabel}>Profile Image</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      {cur.profileImage && (
                        <TouchableOpacity onPress={() => setPreviewImage(cur.profileImage)}>
                          <Image source={{ uri: cur.profileImage }} style={styles.profileThumb} />
                          <Text style={styles.diffLabel}>Current</Text>
                        </TouchableOpacity>
                      )}
                      {draft.profileImage && draft.profileImage !== cur.profileImage && (
                        <TouchableOpacity onPress={() => setPreviewImage(draft.profileImage)}>
                          <Image source={{ uri: draft.profileImage }} style={[styles.profileThumb, { borderColor: '#22C55E' }]} />
                          <Text style={[styles.diffLabel, { color: '#22C55E' }]}>New</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.changesSection}>
                  <FieldDiff label="Hookline" current={cur.hookline} draft={draft.hookline} />
                  <FieldDiff label="About Me" current={cur.aboutMe} draft={draft.aboutMe} />
                  <TagsDiff label="Expertise Tags" current={cur.expertiseTags} draft={draft.expertiseTags} />
                  <TagsDiff label="Languages" current={cur.languages} draft={draft.languages} />
                  <ImagesDiff label="Gallery Images" current={cur.galleryImages} draft={draft.galleryImages} onImagePress={setPreviewImage} />
                </View>

                {req.introVideoUrl && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.changeLabel}>Intro Video</Text>
                    <IntroVideo url={req.introVideoUrl} />
                  </View>
                )}

                {/* Admin Notes */}
                {req.profileAdminNotes ? (
                  <View style={styles.notesBox}>
                    <Ionicons name="document-text-outline" size={16} color="#F59E0B" />
                    <Text style={styles.notesText}>{req.profileAdminNotes}</Text>
                  </View>
                ) : null}

                {/* Actions (only for pending) */}
                {req.profileStatus === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => openRejectModal(req.id)}
                      disabled={processing === req.id}
                    >
                      {processing === req.id ? <ActivityIndicator size="small" color="#EF4444" /> : (
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
                      {processing === req.id ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                          <Ionicons name="checkmark" size={20} color="#fff" />
                          <Text style={styles.btnText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBg}>
                <Ionicons name="alert-circle" size={28} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>Reject Profile</Text>
            </View>
            
            <Text style={styles.modalSubtitle}>Provide a reason for rejection. This will be shown to the listener to help them improve.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Profile image is blurry, hookline contains inappropriate language..."
              placeholderTextColor="#4B5563"
              value={rejectNotes}
              onChangeText={setRejectNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setRejectModal({ visible: false, id: null })}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleReject}
                activeOpacity={0.8}
                style={styles.modalRejectBtnWrapper}
              >
                <LinearGradient
                  colors={['#EF4444', '#B91C1C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalRejectBtnGradient}
                >
                  <Text style={styles.modalRejectText}>Reject Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Screen Image Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.previewOverlay}>
          <TouchableOpacity 
            style={styles.previewClose} 
            onPress={() => setPreviewImage(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              style={styles.fullImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
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

  // Filters
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

  scrollContent: { padding: '5%' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: '30%' },
  emptyText: { color: '#9CA3AF', fontSize: SW * 0.04, marginTop: '4%', fontFamily: 'Inter_500Medium' },

  card: {
    backgroundColor: '#111', borderRadius: 16, padding: '5%',
    marginBottom: '5%', borderWidth: 1, borderColor: '#222',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: '4%' },
  avatar: { width: SW * 0.12, height: SW * 0.12, borderRadius: (SW * 0.12) / 2, marginRight: '3%' },
  headerInfo: { flex: 1 },
  listenerName: { color: '#fff', fontSize: SW * 0.042, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  submittedAt: { color: '#6B7280', fontSize: SW * 0.03, marginTop: 2 },
  statusDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  statusDotText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  changesSection: {
    backgroundColor: '#1A1A1A', padding: '4%', borderRadius: 12, marginBottom: '4%',
  },
  diffRow: { marginBottom: 12 },
  changeLabel: {
    color: '#9CA3AF', fontSize: SW * 0.031, marginBottom: 2,
    fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  changeValue: { color: '#E5E7EB', fontSize: SW * 0.034, fontFamily: 'Inter_400Regular', lineHeight: SW * 0.05 },
  diffLabel: { color: '#6B7280', fontSize: 10, textAlign: 'center', marginTop: 3, fontFamily: 'Inter_400Regular' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagChip: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  tagAdded: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  tagRemoved: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  tagChipText: { color: '#C4B5FD', fontSize: SW * 0.028, fontFamily: 'Inter_500Medium' },

  // Thumbnails
  thumbImg: {
    width: SW * 0.2, height: SW * 0.15, borderRadius: 8,
    marginRight: 8, backgroundColor: '#222',
  },
  profileThumb: {
    width: SW * 0.16, height: SW * 0.16, borderRadius: SW * 0.08,
    borderWidth: 2, borderColor: '#333',
  },

  // Notes
  notesBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: '3%',
    backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', marginBottom: 12,
  },
  notesText: { flex: 1, color: '#FCD34D', fontSize: SW * 0.03, fontFamily: 'Inter_400Regular' },

  // Actions
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: '3%', borderRadius: 12, borderWidth: 1,
  },
  rejectBtn: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  approveBtn: { borderColor: '#22C55E', backgroundColor: '#22C55E' },
  btnText: { color: '#fff', fontSize: SW * 0.036, fontWeight: '600', marginLeft: 6 },

  // Video
  videoContainer: { marginTop: 8, width: '100%', height: SW * 0.5, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  videoError: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#9CA3AF', fontSize: 14, marginTop: 8, fontFamily: 'Inter_400Regular' },
  linkText: { color: '#A855F7', fontSize: 14, marginTop: 12, fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: wp(6) },
  modalContent: { 
    backgroundColor: '#0F0F0F', 
    borderRadius: ms(24), 
    padding: wp(6), 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#1F1F1F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: s(12), marginBottom: hp(2) },
  modalIconBg: { 
    width: ms(48), 
    height: ms(48), 
    borderRadius: ms(24), 
    backgroundColor: 'rgba(239,68,68,0.1)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modalTitle: { color: '#fff', fontSize: ms(20), fontWeight: '800', fontFamily: 'Inter_900Black' },
  modalSubtitle: { color: '#9CA3AF', fontSize: ms(13), fontFamily: 'Inter_400Regular', marginBottom: hp(2), lineHeight: ms(18) },
  modalInput: {
    backgroundColor: '#050505', 
    borderWidth: 1, 
    borderColor: '#1F1F1F', 
    borderRadius: ms(16),
    color: '#fff', 
    padding: wp(4), 
    fontSize: ms(14), 
    fontFamily: 'Inter_400Regular',
    minHeight: hp(12), 
    textAlignVertical: 'top',
    marginBottom: hp(2.5),
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: s(12) },
  modalCancelBtn: { 
    flex: 1, 
    paddingVertical: hp(1.8), 
    borderRadius: ms(16), 
    borderWidth: 1, 
    borderColor: '#333', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modalCancelText: { color: '#9CA3AF', fontSize: ms(14), fontFamily: 'Inter_600SemiBold' },
  modalRejectBtnWrapper: { flex: 1.5, borderRadius: ms(16), overflow: 'hidden' },
  modalRejectBtnGradient: { 
    paddingVertical: hp(1.8), 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modalRejectText: { color: '#fff', fontSize: ms(14), fontWeight: '700', fontFamily: 'Inter_700Bold' },

  // Preview Modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: hp(6),
    right: wp(5),
    zIndex: 100,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
  },
  fullImage: {
    width: wp(100),
    height: hp(80),
  },
});
