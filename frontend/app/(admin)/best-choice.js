import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { DEMO_LISTENERS } from '../../data/admin/adminData';

const { height: SH } = Dimensions.get('window');

export default function BestChoiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [listeners, setListeners] = useState(DEMO_LISTENERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Current Best Choice Listeners
  const bestChoiceListeners = useMemo(() => {
    return listeners.filter(l => l.bestChoice);
  }, [listeners]);

  // Approved Listeners available to become Best Choice
  const availableListeners = useMemo(() => {
    return listeners.filter(l => l.status === 'approved' && !l.bestChoice && (l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery)));
  }, [listeners, searchQuery]);

  const toggleBestChoice = (id, currentVal) => {
    setListeners(prev => prev.map(l => l.id === id ? { ...l, bestChoice: !currentVal } : l));
  };

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(12) }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={st.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Best Choice</Text>
        </View>
        <TouchableOpacity style={st.addBtn} activeOpacity={0.7} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color="#000" />
          <Text style={st.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {}
      <ScrollView style={st.list} contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} showsVerticalScrollIndicator={false}>
        {bestChoiceListeners.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="star-outline" size={48} color="#333" />
            <Text style={st.emptyText}>No Best Choice listeners yet</Text>
          </View>
        ) : (
          bestChoiceListeners.map(listener => (
            <View key={listener.id} style={st.card}>
              <Image source={listener.avatar} style={st.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{listener.name}</Text>
                <Text style={st.meta}>ID: {listener.id}</Text>
                <View style={st.badge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={st.badgeText}>Best Choice</Text>
                </View>
              </View>
              <TouchableOpacity style={st.removeBtn} activeOpacity={0.7} onPress={() => toggleBestChoice(listener.id, true)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {}
      <Modal visible={showAddModal} transparent animationType="slide" statusBarTranslucent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { marginTop: insets.top + vs(40) }]}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Listeners</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={st.searchBox}>
              <Ionicons name="search" size={18} color="#6B7280" />
              <TextInput 
                style={st.searchInput} 
                placeholder="Search approved listeners..." 
                placeholderTextColor="#4B5563"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} showsVerticalScrollIndicator={false}>
              {availableListeners.length === 0 ? (
                <Text style={st.emptyText}>No listeners available</Text>
              ) : (
                availableListeners.map(listener => (
                  <View key={listener.id} style={st.card}>
                    <Image source={listener.avatar} style={st.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.name}>{listener.name}</Text>
                      <Text style={st.meta}>{listener.phone}</Text>
                    </View>
                    <TouchableOpacity style={st.selectBtn} activeOpacity={0.7} onPress={() => toggleBestChoice(listener.id, false)}>
                      <Text style={st.selectBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s(16), paddingVertical: SH * 0.015 },
  backBtn: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: ms(24, 0.3), fontWeight: '900', color: '#fff', fontFamily: 'Inter_900Black' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: s(16), paddingVertical: SH * 0.01, borderRadius: 20, gap: s(4) },
  addBtnText: { color: '#000', fontSize: ms(14, 0.3), fontFamily: 'Inter_700Bold' },
  
  list: { flex: 1, paddingTop: SH * 0.02 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 16, padding: s(14), marginBottom: SH * 0.012, borderWidth: 1, borderColor: '#1F1F1F' },
  avatar: { width: SH * 0.06, height: SH * 0.06, borderRadius: SH * 0.03, marginRight: s(12) },
  name: { fontSize: ms(15, 0.3), color: '#fff', fontFamily: 'Inter_700Bold' },
  meta: { fontSize: ms(12, 0.3), color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: s(8), paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6, gap: 4 },
  badgeText: { color: '#F59E0B', fontSize: ms(10, 0.3), fontFamily: 'Inter_600SemiBold' },
  removeBtn: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  selectBtn: { backgroundColor: '#F59E0B', paddingHorizontal: s(16), paddingVertical: SH * 0.008, borderRadius: 16 },
  selectBtnText: { color: '#000', fontSize: ms(12, 0.3), fontFamily: 'Inter_700Bold' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: SH * 0.1 },
  emptyText: { color: '#6B7280', fontSize: ms(14, 0.3), fontFamily: 'Inter_500Medium', marginTop: vs(12), textAlign: 'center' },

  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { flex: 1, backgroundColor: '#0A0A0A', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: '#1F1F1F' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: s(20), borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  modalTitle: { fontSize: ms(18, 0.3), color: '#fff', fontFamily: 'Inter_800ExtraBold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', margin: s(16), paddingHorizontal: s(14), height: SH * 0.055, borderRadius: 16, borderWidth: 1, borderColor: '#1F1F1F', gap: s(8) },
  searchInput: { flex: 1, color: '#fff', fontSize: ms(14, 0.3), fontFamily: 'Inter_400Regular' },
});
