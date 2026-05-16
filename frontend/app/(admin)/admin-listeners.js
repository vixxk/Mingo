import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Linking } from 'react-native';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

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

const IntroVideo = ({ url }) => {
  const [error, setError] = useState(false);
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.pause();
  });

  if (!url) return null;

  return (
    <View style={st.videoContainer}>
      <VideoView 
        style={st.video} 
        player={player} 
        fullscreenOptions={{ enabled: true }}
        allowsPictureInPicture 
        onError={() => setError(true)}
      />
      {error && (
        <View style={st.videoError}>
          <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
          <Text style={st.errorText}>Video failed to load</Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)}>
            <Text style={st.linkText}>Open link in browser</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function AdminListenersScreen() {
  const insets = useSafeAreaInsets();
  const { initialFilter } = useLocalSearchParams();
  const [listeners, setListeners] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [selectedListener, setSelectedListener] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const FILTER_CONFIG = {
    all: { icon: 'layers', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    pending: { icon: 'time', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    approved: { icon: 'checkmark-circle', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    verified: { icon: 'shield-checkmark', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    bestChoice: { icon: 'star', color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
    rejected: { icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  };

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const loadListeners = async () => {
    try {
      setLoading(true);
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
          introVideoUrl: l.introVideoUrl
        }));
        setListeners(formatted);
      }
    } catch (e) {
      console.log('Failed to fetch listeners:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadListeners();
    }, [])
  );

  const filtered = listeners.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery);
    const matchFilter = filter === 'all' || filter === l.status || (filter === 'verified' && l.verified) || (filter === 'bestChoice' && l.bestChoice);
    return matchSearch && matchFilter;
  });

  const updateListenerState = (id, updates) => {
    setListeners(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (selectedListener?.id === id) setSelectedListener(prev => ({ ...prev, ...updates }));
  };

  const handleApprove = async (id) => { 
    await adminAPI.approveListener(id);
    updateListenerState(id, { status: 'approved' }); 
    Alert.alert('Approved', 'Listener has been approved.'); 
  };
  const handleReject = async (id) => { 
    await adminAPI.rejectListener(id);
    updateListenerState(id, { status: 'rejected' }); 
    Alert.alert('Rejected', 'Listener has been rejected.'); 
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
    Alert.alert(
      isCurrentlyBanned ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${isCurrentlyBanned ? 'unban' : 'ban'} this listener's user account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isCurrentlyBanned ? 'Unban' : 'Ban', 
          style: isCurrentlyBanned ? 'default' : 'destructive', 
          onPress: async () => {
            try {
              await adminAPI.toggleBanUser(userId);
              setListeners(prev => prev.map(l => l.userId === userId ? { ...l, isBanned: !isCurrentlyBanned } : l));
              if (selectedListener?.userId === userId) {
                setSelectedListener(prev => ({ ...prev, isBanned: !isCurrentlyBanned }));
              }
              Alert.alert('Success', `User ${isCurrentlyBanned ? 'unbanned' : 'banned'} successfully.`);
            } catch(e) {
              Alert.alert('Error', 'Failed to update user status');
            }
          }
        },
      ]
    );
  };

  const handleDeleteListener = (id, userId) => {
    Alert.alert('Delete Listener Permanently', 'This will delete both the listener profile and the user account. This action cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminAPI.deleteUser(userId);
          setListeners(prev => prev.filter(l => l.id !== id));
          setShowDetail(false);
          setSelectedListener(null);
          Alert.alert('Success', 'Listener deleted successfully.');
        } catch(e) {
          Alert.alert('Error', 'Failed to delete listener');
        }
      }},
    ]);
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

                {}
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
                </View>

                {}
                <View style={st.statsRow}>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.totalCalls}</Text><Text style={st.statLbl}>Calls</Text></View>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.earnings}</Text><Text style={st.statLbl}>Earnings</Text></View>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.rating || '-'}</Text><Text style={st.statLbl}>Rating</Text></View>
                </View>

                <View style={[st.statsRow, { marginTop: -SH * 0.01 }]}>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.audioCalls}</Text><Text style={st.statLbl}>Audio</Text></View>
                  <View style={st.statBox}><Text style={st.statVal}>{selectedListener.videoCalls}</Text><Text style={st.statLbl}>Video</Text></View>
                </View>
 
                {selectedListener.introVideoUrl && (
                  <View style={{ width: '100%', marginBottom: SH * 0.02 }}>
                    <Text style={st.sectionLabel}>Introductory Video</Text>
                    <IntroVideo url={selectedListener.introVideoUrl} />
                  </View>
                )}

                {}
                <View style={{ width: '100%', gap: SH * 0.01 }}>
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
        </View>
      </Modal>

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Listeners</Text>
        <Text style={st.headerCount}>{listeners.length}</Text>
      </View>

      {}
      <View style={st.searchBox}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput style={st.searchInput} placeholder="Search listeners..." placeholderTextColor="#4B5563" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {}
      <View style={{ paddingVertical: SH * 0.012 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: s(16), gap: s(8) }}>
          {['all','pending','approved','verified','bestChoice','rejected'].map(f => {
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} showsVerticalScrollIndicator={false}>
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
                <View style={[st.statusBadge, { backgroundColor: `${getStatusColor(listener.status)}20` }]}>
                  <View style={[st.statusDot, { backgroundColor: getStatusColor(listener.status) }]} />
                  <Text style={[st.statusText, { color: getStatusColor(listener.status) }]}>{listener.status}</Text>
                </View>
              </View>
              {listener.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: s(6) }}>
                  <TouchableOpacity style={[st.quickBtn, { backgroundColor: 'rgba(16,185,129,0.2)' }]} onPress={() => handleApprove(listener.id)}>
                    <Ionicons name="checkmark" size={16} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.quickBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }]} onPress={() => handleReject(listener.id)}>
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
              {listener.status !== 'pending' && <Ionicons name="chevron-forward" size={18} color="#4B5563" />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  videoContainer: {
    width: '100%',
    height: SH * 0.25,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
});
