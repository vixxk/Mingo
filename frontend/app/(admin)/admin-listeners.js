import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { DEMO_LISTENERS } from '../../data/admin/adminData';

const { height: SH } = Dimensions.get('window');

export default function AdminListenersScreen() {
  const insets = useSafeAreaInsets();
  const { initialFilter } = useLocalSearchParams();
  const [listeners, setListeners] = useState(DEMO_LISTENERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [selectedListener, setSelectedListener] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const filtered = listeners.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery);
    const matchFilter = filter === 'all' || filter === l.status || (filter === 'verified' && l.verified) || (filter === 'bestChoice' && l.bestChoice);
    return matchSearch && matchFilter;
  });

  const updateListener = (id, updates) => {
    setListeners(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (selectedListener?.id === id) setSelectedListener(prev => ({ ...prev, ...updates }));
  };

  const handleApprove = (id) => { updateListener(id, { status: 'approved' }); Alert.alert('Approved', 'Listener has been approved.'); };
  const handleReject = (id) => { updateListener(id, { status: 'rejected' }); Alert.alert('Rejected', 'Listener has been rejected.'); };
  const toggleVerified = (id, current) => { updateListener(id, { verified: !current }); };
  const toggleBestChoice = (id, current) => { updateListener(id, { bestChoice: !current }); };
  const handleDeleteListener = (id) => {
    Alert.alert('Delete Listener', 'Are you sure you want to permanently delete this listener?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setListeners(prev => prev.filter(l => l.id !== id));
        setShowDetail(false);
        setSelectedListener(null);
      }},
    ]);
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return '#10B981';
    if (status === 'pending') return '#F59E0B';
    return '#EF4444';
  };

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
                  {}
                  <TouchableOpacity
                    style={[st.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                    onPress={() => handleDeleteListener(selectedListener.id)}
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

      {}
      <View style={st.header}><Text style={st.headerTitle}>Listeners</Text><Text style={st.headerCount}>{listeners.length} total</Text></View>

      {}
      <View style={st.searchBox}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput style={st.searchInput} placeholder="Search listeners..." placeholderTextColor="#4B5563" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {}
      <View style={{ paddingVertical: SH * 0.012 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: s(16) }}>
          <View style={{ flexDirection: 'row', gap: s(8) }}>
            {['all','pending','approved','verified','bestChoice','rejected'].map(f => (
              <TouchableOpacity key={f} style={[st.filterTab, filter === f && st.filterActive]} onPress={() => setFilter(f)} activeOpacity={0.7}>
                <Text style={[st.filterText, filter === f && st.filterTextActive]}>
                  {f === 'bestChoice' ? 'Best Choice' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} showsVerticalScrollIndicator={false}>
        {filtered.map(listener => (
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
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: s(16), paddingVertical: SH * 0.015 },
  headerTitle: { fontSize: ms(28, 0.3), fontWeight: '900', color: '#fff', fontFamily: 'Inter_900Black' },
  headerCount: { fontSize: ms(13, 0.3), color: '#6B7280', fontFamily: 'Inter_500Medium' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', marginHorizontal: s(16), paddingHorizontal: s(14), height: SH * 0.055, borderRadius: 16, borderWidth: 1, borderColor: '#1F1F1F', gap: s(8) },
  searchInput: { flex: 1, color: '#fff', fontSize: ms(14, 0.3), fontFamily: 'Inter_400Regular' },
  filterRow: { paddingHorizontal: s(16), paddingVertical: SH * 0.012, gap: s(8) },
  filterTab: { paddingHorizontal: s(14), paddingVertical: SH * 0.008, borderRadius: 20, backgroundColor: '#111', borderWidth: 1, borderColor: '#1F1F1F' },
  filterActive: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: '#A855F7' },
  filterText: { fontSize: ms(12, 0.3), color: '#6B7280', fontFamily: 'Inter_500Medium' },
  filterTextActive: { color: '#A855F7' },
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
});
