import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, Modal, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Linking } from 'react-native';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';
import ToastNotification from '../../components/shared/ToastNotification';

const { height: SH } = Dimensions.get('window');

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

const IntroAudio = ({ url }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) { sound.unloadAsync(); }
    };
  }, [sound]);

  const handlePlay = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
      return;
    }
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) setIsPlaying(false);
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (e) {
      setError(true);
    }
  };

  if (!url) return null;
  return (
    <View style={st.audioContainer}>
      <TouchableOpacity onPress={handlePlay} style={st.audioPlayBtn}>
        <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={36} color="#A855F7" />
      </TouchableOpacity>
      <Text style={st.audioLabel}>Voice Sample</Text>
      {error && (
        <View style={st.audioError}>
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={st.errorText}>Audio failed to load</Text>
        </View>
      )}
    </View>
  );
};

export default function AdminListenersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { initialFilter } = useLocalSearchParams();
  const [listeners, setListeners] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [selectedListener, setSelectedListener] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Message State
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Custom Confirmation Dialog State
  const [confirmAction, setConfirmAction] = useState(null); // { type: string, title: string, desc: string, onConfirm: () => void }

  const FILTER_CONFIG = {
    all: { icon: 'layers', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    pending: { icon: 'time', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    approved: { icon: 'checkmark-circle', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    verified: { icon: 'shield-checkmark', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    bestChoice: { icon: 'star', color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
    rejected: { icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    deleted: { icon: 'trash', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  };

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const loadListeners = async (isRefresher = false) => {
    try {
      if (!isRefresher) setLoading(true);
      const res = await adminAPI.getListeners({ limit: 100 });
      if (res?.data) {
        const listenersList = res.data.listeners || (Array.isArray(res.data) ? res.data : []);
        const formatted = listenersList.map(l => ({
          id: l._id || l.id,
          userId: l.userId?._id || l.userId, // Add userId
          name: l.name || l.userId?.name || 'Unknown',
          phone: l.phone || l.userId?.phone || 'Unknown',
          avatar: getAvatarImage(l.gender || l.userId?.gender, l.avatarIndex || l.userId?.avatarIndex),
          status: l.status,
          isBanned: l.isBanned || l.userId?.isBanned, // Add isBanned status
          verified: l.verified,
          bestChoice: l.bestChoice,
          totalCalls: l.totalCalls !== undefined ? l.totalCalls : (l.audioCalls || 0) + (l.videoCalls || 0),
          audioCalls: l.audioCalls || 0,
          videoCalls: l.videoCalls || 0,
          earnings: typeof l.earnings === 'string' ? l.earnings : `₹${l.earnings || 0}`,
          rating: l.rating,
          introAudioUrl: l.introAudioUrl,
          isDeleted: l.isDeleted || false,
          deletionReason: l.deletionReason || ''
        }));
        setListeners(formatted);
      }
    } catch (e) {
      console.log('Failed to fetch listeners:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadListeners(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadListeners();
    }, [])
  );

  const filtered = listeners.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery);
    
    if (filter === 'deleted') {
      return matchSearch && l.isDeleted;
    }
    
    // Hide deleted listeners from other filters
    if (l.isDeleted) {
      return false;
    }
    
    const matchFilter = filter === 'all' || filter === l.status || (filter === 'verified' && l.verified) || (filter === 'bestChoice' && l.bestChoice);
    return matchSearch && matchFilter;
  });

  const updateListenerState = (id, updates) => {
    setListeners(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (selectedListener?.id === id) setSelectedListener(prev => ({ ...prev, ...updates }));
  };

  const handleApprove = (id) => {
    setConfirmAction({
      type: 'approve',
      title: 'Approve Listener',
      desc: 'Are you sure you want to approve this listener application?',
      onConfirm: async () => {
        // Optimistically update UI immediately
        updateListenerState(id, { status: 'approved' });
        setConfirmAction(null);
        setShowDetail(false);
        setToast({ visible: true, message: 'Listener approved successfully', type: 'success' });
        
        try {
          await adminAPI.approveListener(id);
        } catch (e) {
          // Rollback on error
          updateListenerState(id, { status: 'pending' });
          setToast({ visible: true, message: 'Failed to approve listener', type: 'error' });
        }
      }
    });
  };

  const handleReject = (id) => {
    setConfirmAction({
      type: 'reject',
      title: 'Reject Listener',
      desc: 'Are you sure you want to reject this listener application?',
      onConfirm: async () => {
        // Optimistically update UI immediately
        updateListenerState(id, { status: 'rejected' });
        setConfirmAction(null);
        setShowDetail(false);
        setToast({ visible: true, message: 'Listener rejected successfully', type: 'success' });
        
        try {
          await adminAPI.rejectListener(id);
        } catch (e) {
          // Rollback on error
          updateListenerState(id, { status: 'pending' });
          setToast({ visible: true, message: 'Failed to reject listener', type: 'error' });
        }
      }
    });
  };

  const toggleVerified = async (id, current) => { 
    await adminAPI.toggleVerified(id);
    updateListenerState(id, { verified: !current }); 
  };

  const toggleBestChoice = async (id, current) => { 
    await adminAPI.toggleBestChoice(id);
    updateListenerState(id, { bestChoice: !current }); 
  };

  const handleBanUser = (userId, isCurrentlyBanned) => {
    setConfirmAction({
      type: 'ban',
      title: isCurrentlyBanned ? 'Unban User' : 'Ban User',
      desc: `Are you sure you want to ${isCurrentlyBanned ? 'unban' : 'ban'} this listener's user account?`,
      onConfirm: async () => {
        try {
          await adminAPI.toggleBanUser(userId);
          setListeners(prev => prev.map(l => l.userId === userId ? { ...l, isBanned: !isCurrentlyBanned } : l));
          if (selectedListener?.userId === userId) {
            setSelectedListener(prev => ({ ...prev, isBanned: !isCurrentlyBanned }));
          }
          setConfirmAction(null);
          setToast({ visible: true, message: `User ${isCurrentlyBanned ? 'unbanned' : 'banned'} successfully`, type: 'success' });
        } catch(e) {
          setToast({ visible: true, message: 'Failed to update user status', type: 'error' });
        }
      }
    });
  };

  const handleDeleteListener = (id, userId) => {
    setConfirmAction({
      type: 'delete',
      title: 'Delete Listener',
      desc: 'This will delete both the listener profile and the user account permanently. This action cannot be undone. Are you sure?',
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(userId);
          setListeners(prev => prev.filter(l => l.id !== id));
          setShowDetail(false);
          setSelectedListener(null);
          setConfirmAction(null);
          setToast({ visible: true, message: 'Listener deleted successfully', type: 'success' });
        } catch(e) {
          setToast({ visible: true, message: 'Failed to delete listener', type: 'error' });
        }
      }
    });
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !selectedListener) return;

    if (!selectedListener.userId) {
      setToast({ visible: true, message: 'Listener has no associated user account', type: 'error' });
      return;
    }

    try {
      setSendingMessage(true);
      await adminAPI.sendAdminMessage(selectedListener.userId, trimmed);
      setMessageText('');
      setIsMessaging(false);
      setToast({ visible: true, message: 'Message sent successfully', type: 'success' });
    } catch (e) {
      console.log('Failed to send message:', e);
      setToast({ visible: true, message: 'Failed to send message', type: 'error' });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return '#10B981';
    if (status === 'pending') return '#F59E0B';
    return '#EF4444';
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
      <Modal transparent visible={showDetail} animationType="slide" statusBarTranslucent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <TouchableOpacity style={st.modalClose} onPress={() => { setShowDetail(false); setSelectedListener(null); }}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>

            {selectedListener && (
              <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingBottom: SH * 0.04 }} showsVerticalScrollIndicator={false}>
                <Image source={selectedListener.avatar} style={st.modalAvatar} />
                <Text style={st.modalName}>{selectedListener.name}</Text>
                <Text style={st.modalPhone}>{selectedListener.phone}</Text>

                <View style={{ flexDirection: 'row', gap: s(8), marginTop: SH * 0.01, marginBottom: SH * 0.02 }}>
                  <View style={[st.badge, { backgroundColor: `${getStatusColor(selectedListener.status)}20` }]}>
                    <Text style={[st.badgeText, { color: getStatusColor(selectedListener.status) }]}>{selectedListener.status.toUpperCase()}</Text>
                  </View>
                  {selectedListener.verified && (
                    <View style={[st.badge, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                      <Ionicons name="checkmark-circle" size={12} color="#3B82F6" />
                      <Text style={[st.badgeText, { color: '#3B82F6' }]}>VERIFIED</Text>
                    </View>
                  )}
                  {selectedListener.bestChoice && (
                    <View style={[st.badge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={[st.badgeText, { color: '#F59E0B' }]}>BEST CHOICE</Text>
                    </View>
                  )}
                  {selectedListener.isBanned && (
                    <View style={[st.badge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                      <Ionicons name="ban" size={12} color="#EF4444" />
                      <Text style={[st.badgeText, { color: '#EF4444' }]}>BANNED</Text>
                    </View>
                  )}
                  {selectedListener.isDeleted && (
                    <View style={[st.badge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <Ionicons name="trash" size={12} color="#F59E0B" />
                      <Text style={[st.badgeText, { color: '#F59E0B' }]}>DELETED</Text>
                    </View>
                  )}
                </View>

                <View style={st.statsRow}>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.totalCalls}</Text><Text style={st.statLbl}>Calls</Text></View>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.earnings}</Text><Text style={st.statLbl}>Earnings</Text></View>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.rating || '-'}</Text><Text style={st.statLbl}>Rating</Text></View>
                </View>

                <View style={[st.statsRow, { marginTop: -SH * 0.01 }]}>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.audioCalls}</Text><Text style={st.statLbl}>Audio</Text></View>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.videoCalls}</Text><Text style={st.statLbl}>Video</Text></View>
                </View>

                {selectedListener.isDeleted && (
                  <View style={{ width: '100%', backgroundColor: '#141414', borderRadius: 16, padding: s(14), marginBottom: SH * 0.02, borderWidth: 1, borderColor: '#1F1F1F' }}>
                    <Text style={{ color: '#6B7280', fontSize: ms(12), fontFamily: 'Inter_500Medium', marginBottom: 4 }}>Reason for Deletion</Text>
                    <Text style={{ color: '#F59E0B', fontSize: ms(14), fontFamily: 'Inter_700Bold' }}>{selectedListener.deletionReason || 'Not specified'}</Text>
                  </View>
                )}
 
                {selectedListener.introAudioUrl && (
                  <View style={{ width: '100%', marginBottom: SH * 0.02 }}>
                    <Text style={st.sectionLabel}>Introductory Audio</Text>
                    <IntroAudio url={selectedListener.introAudioUrl} />
                  </View>
                )}

                <View style={{ width: '100%', gap: SH * 0.01 }}>
                  {!selectedListener.isDeleted && (
                    <>
                      {selectedListener.status === 'pending' && (
                        <View style={{ flexDirection: 'row', gap: s(10) }}>
                          <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#10B981', flex: 2 }]} onPress={() => handleApprove(selectedListener.id)}>
                            <Ionicons name="checkmark" size={18} color="#fff" />
                            <Text style={st.actionBtnText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#EF4444', flex: 1 }]} onPress={() => handleReject(selectedListener.id)}>
                            <Ionicons name="close" size={18} color="#fff" />
                            <Text style={st.actionBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {selectedListener.status === 'approved' && (
                        <>
                          <TouchableOpacity style={[st.actionBtn, { backgroundColor: selectedListener.verified ? 'rgba(59,130,246,0.15)' : '#3B82F6' }]} onPress={() => toggleVerified(selectedListener.id, selectedListener.verified)}>
                            <Ionicons name={selectedListener.verified ? 'checkmark-circle' : 'checkmark-circle-outline'} size={18} color={selectedListener.verified ? '#3B82F6' : '#fff'} />
                            <Text style={[st.actionBtnText, selectedListener.verified && { color: '#3B82F6' }]}>{selectedListener.verified ? 'Remove Verified' : 'Mark as Verified'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[st.actionBtn, { backgroundColor: selectedListener.bestChoice ? 'rgba(245,158,11,0.15)' : '#F59E0B' }]} onPress={() => toggleBestChoice(selectedListener.id, selectedListener.bestChoice)}>
                            <Ionicons name={selectedListener.bestChoice ? 'star' : 'star-outline'} size={18} color={selectedListener.bestChoice ? '#F59E0B' : '#fff'} />
                            <Text style={[st.actionBtnText, selectedListener.bestChoice && { color: '#F59E0B' }]}>{selectedListener.bestChoice ? 'Remove Best Choice' : 'Set Best Choice'}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      
                      {/* Ban/Unban Button */}
                      <TouchableOpacity 
                        style={[st.actionBtn, { backgroundColor: selectedListener.isBanned ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]} 
                        onPress={() => handleBanUser(selectedListener.userId, selectedListener.isBanned)}
                      >
                        <Ionicons name={selectedListener.isBanned ? "checkmark-circle" : "ban"} size={18} color={selectedListener.isBanned ? "#10B981" : "#EF4444"} />
                        <Text style={[st.actionBtnText, { color: selectedListener.isBanned ? "#10B981" : "#EF4444" }]}>
                          {selectedListener.isBanned ? 'Unban User' : 'Ban User'}
                        </Text>
                      </TouchableOpacity>

                      {/* Message Button */}
                      <TouchableOpacity 
                        style={[st.actionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]} 
                        onPress={() => setIsMessaging(true)}
                      >
                        <Ionicons name="chatbubble" size={18} color="#A855F7" />
                        <Text style={[st.actionBtnText, { color: '#A855F7' }]}>Message</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={[st.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                    onPress={() => handleDeleteListener(selectedListener.id, selectedListener.userId)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[st.actionBtnText, { color: '#EF4444' }]}>Delete Listener</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

          </View>

          {/* MESSAGE OVERLAY */}
          {isMessaging && selectedListener && (
            <View style={st.overlayContainer}>
              <View style={st.dialogBox}>
                <View style={[st.confirmIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                  <Ionicons name="chatbubble" size={28} color="#A855F7" />
                </View>
                <Text style={st.dialogTitle}>Send Message</Text>
                <Text style={st.dialogDesc}>Send a support message directly to {selectedListener.name}.</Text>

                <TextInput
                  style={st.dialogInput}
                  placeholder="Type your message here..."
                  placeholderTextColor="#4B5563"
                  multiline
                  numberOfLines={4}
                  value={messageText}
                  onChangeText={setMessageText}
                />

                <View style={st.dialogButtons}>
                  <TouchableOpacity
                    style={st.dialogBtnCancel}
                    onPress={() => { setIsMessaging(false); setMessageText(''); }}
                    disabled={sendingMessage}
                  >
                    <Text style={st.dialogBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.dialogBtnConfirm}
                    onPress={handleSendMessage}
                    disabled={sendingMessage || !messageText.trim()}
                  >
                    <LinearGradient
                      colors={['#A855F7', '#7C3AED']}
                      style={st.gradientBtn}
                    >
                      {sendingMessage ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={st.dialogBtnConfirmText}>Send</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* CUSTOM CONFIRMATION DIALOG */}
          {confirmAction && (
            <View style={st.overlayContainer}>
              <View style={st.dialogBox}>
                <View style={[st.confirmIconContainer, { backgroundColor: confirmAction.type === 'delete' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(168, 85, 247, 0.1)' }]}>
                  <Ionicons
                    name={confirmAction.type === 'delete' ? 'trash' : 'ban'}
                    size={28}
                    color={confirmAction.type === 'delete' ? '#EF4444' : '#A855F7'}
                  />
                </View>
                <Text style={st.dialogTitle}>{confirmAction.title}</Text>
                <Text style={st.dialogDesc}>{confirmAction.desc}</Text>

                <View style={st.dialogButtons}>
                  <TouchableOpacity
                    style={st.dialogBtnCancel}
                    onPress={() => setConfirmAction(null)}
                  >
                    <Text style={st.dialogBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.dialogBtnConfirm}
                    onPress={confirmAction.onConfirm}
                  >
                    <LinearGradient
                      colors={confirmAction.type === 'delete' ? ['#EF4444', '#DC2626'] : ['#A855F7', '#7C3AED']}
                      style={st.gradientBtn}
                    >
                      <Text style={st.dialogBtnConfirmText}>Confirm</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          {/* Toast Notification inside Modal */}
          <ToastNotification
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
          />

        </View>
      </Modal>

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Listeners</Text>
        <Text style={st.headerCount}>{filtered.length}</Text>
      </View>

      {}
      <View style={st.searchBox}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput style={st.searchInput} placeholder="Search listeners..." placeholderTextColor="#4B5563" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {}
      <View style={{ paddingVertical: SH * 0.012 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: s(16), gap: s(8) }}>
          {['all','pending','approved','verified','bestChoice','rejected','deleted'].map(f => {
            const active = filter === f;
            const config = FILTER_CONFIG[f];
            return (
              <TouchableOpacity
                key={f}
                style={[
                  st.filterTab,
                  active && { backgroundColor: config.bg, borderColor: config.color }
                ]}
                onPress={() => setFilter(f)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? config.icon : `${config.icon}-outline`}
                  size={14}
                  color={active ? config.color : '#6B7280'}
                />
                <Text style={[st.filterText, active && { color: config.color, fontWeight: '700' }]}>
                  {f === 'bestChoice' ? 'Best Choice' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A855F7']}
            tintColor="#A855F7"
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: SH * 0.1 }}>
            <Ionicons name="headset-outline" size={64} color="#333" />
            <Text style={{ color: '#6B7280', fontSize: ms(16, 0.3), fontFamily: 'Inter_500Medium', marginTop: vs(12) }}>No listeners found</Text>
          </View>
        ) : (
          filtered.map(listener => (
            <TouchableOpacity key={listener.id} style={st.card} activeOpacity={0.7} onPress={() => { setSelectedListener(listener); setShowDetail(true); }}>
              <Image source={listener.avatar} style={st.avatar} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
                  <Text style={st.name}>{listener.name}</Text>
                  {listener.verified && <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />}
                  {listener.bestChoice && <Ionicons name="star" size={14} color="#F59E0B" />}
                </View>
                <Text style={st.meta}>{listener.phone} • {listener.totalCalls} calls</Text>
                {listener.isDeleted ? (
                  <View style={[st.statusBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                    <Ionicons name="trash" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
                    <Text style={[st.statusText, { color: '#F59E0B' }]}>deleted</Text>
                  </View>
                ) : (
                  <View style={[st.statusBadge, { backgroundColor: `${getStatusColor(listener.status)}20` }]}>
                    <View style={[st.statusDot, { backgroundColor: getStatusColor(listener.status) }]} />
                    <Text style={[st.statusText, { color: getStatusColor(listener.status) }]}>{listener.status}</Text>
                  </View>
                )}
              </View>
              {listener.status === 'pending' && !listener.isDeleted ? (
                <Ionicons name="time" size={18} color="#F59E0B" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#4B5563" />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Toast Notification */}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const st = StyleSheet.create({
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
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', marginHorizontal: s(16), paddingHorizontal: s(14), height: SH * 0.055, borderRadius: 16, borderWidth: 1, borderColor: '#1F1F1F', gap: s(8) },
  searchInput: { flex: 1, color: '#fff', fontSize: ms(14, 0.3), fontFamily: 'Inter_400Regular' },
  filterRow: { paddingHorizontal: s(16), paddingVertical: SH * 0.012, gap: s(8) },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: ms(20),
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    gap: s(6),
  },
  filterText: { fontSize: ms(11), color: '#6B7280', fontFamily: 'Inter_500Medium' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 18, padding: s(14), marginBottom: SH * 0.01, borderWidth: 1, borderColor: '#1F1F1F' },
  avatar: { width: SH * 0.06, height: SH * 0.06, borderRadius: SH * 0.03, marginRight: s(12) },
  name: { fontSize: ms(15, 0.3), color: '#fff', fontFamily: 'Inter_700Bold' },
  meta: { fontSize: ms(12, 0.3), color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: s(8), paddingVertical: 3, borderRadius: 8, marginTop: 4, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: ms(10, 0.3), fontFamily: 'Inter_700Bold', textTransform: 'capitalize' },
  quickBtn: { width: SH * 0.04, height: SH * 0.04, borderRadius: SH * 0.02, alignItems: 'center', justifyContent: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: SH * 0.02, paddingHorizontal: s(20), maxHeight: SH * 0.85, borderWidth: 1, borderColor: '#1F1F1F', alignItems: 'center' },
  modalClose: { position: 'absolute', top: SH * 0.02, right: s(20), width: SH * 0.04, height: SH * 0.04, borderRadius: SH * 0.02, backgroundColor: '#1F1F1F', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalAvatar: { width: SH * 0.1, height: SH * 0.1, borderRadius: SH * 0.05, borderWidth: 3, borderColor: '#A855F7', marginBottom: SH * 0.012 },
  modalName: { fontSize: ms(22, 0.3), fontWeight: '900', color: '#fff', fontFamily: 'Inter_900Black' },
  modalPhone: { fontSize: ms(13, 0.3), color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(10), paddingVertical: 4, borderRadius: 10, gap: 4 },
  badgeText: { fontSize: ms(10, 0.3), fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', width: '100%', marginBottom: SH * 0.02 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: '#141414', borderRadius: 16, paddingVertical: SH * 0.015, marginHorizontal: s(4), borderWidth: 1, borderColor: '#1F1F1F' },
  statVal: { fontSize: ms(18, 0.3), fontWeight: '800', color: '#fff', fontFamily: 'Inter_900Black' },
  statLbl: { fontSize: ms(10, 0.3), color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(6), paddingVertical: SH * 0.016, borderRadius: 16 },
  actionBtnText: { fontSize: ms(14, 0.3), color: '#fff', fontFamily: 'Inter_700Bold' },
  
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: ms(13, 0.3),
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
    alignSelf: 'flex-start',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  audioPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168,85,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioLabel: {
    color: '#E5E7EB',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  audioError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
  },
  linkText: {
    color: '#A855F7',
    fontSize: 12,
    marginTop: 10,
    fontFamily: 'Inter_700Bold',
    textDecorationLine: 'underline',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  dialogBox: {
    width: wp(82),
    backgroundColor: '#0F0E11',
    borderRadius: 24,
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1F1F1F',
  },
  confirmIconContainer: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  dialogTitle: {
    fontSize: ms(18),
    fontFamily: 'Inter_900Black',
    color: '#FFF',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: ms(13),
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: hp(2.2),
    marginBottom: hp(2.5),
  },
  dialogInput: {
    width: '100%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 14,
    color: '#fff',
    padding: wp(3),
    fontSize: ms(13.5),
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
    height: hp(12),
    marginBottom: hp(2.5),
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: wp(3),
    width: '100%',
  },
  dialogBtnCancel: {
    flex: 1,
    height: hp(5.5),
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnCancelText: {
    color: '#A1A1AA',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
  dialogBtnConfirm: {
    flex: 1,
    height: hp(5.5),
    borderRadius: 30,
    overflow: 'hidden',
  },
  gradientBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBtnConfirmText: {
    color: '#FFF',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
});
