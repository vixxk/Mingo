import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { DEMO_USERS, DEMO_LISTENERS } from '../../data/admin/adminData';

const { height: SH } = Dimensions.get('window');

export default function BannedMembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [users, setUsers] = useState(DEMO_USERS);
  const [listeners, setListeners] = useState(DEMO_LISTENERS);
  const [activeTab, setActiveTab] = useState('users'); 

  
  const bannedMembers = useMemo(() => {
    if (activeTab === 'users') {
      return users.filter(u => u.isBanned);
    } else {
      return listeners.filter(l => l.isBanned);
    }
  }, [users, listeners, activeTab]);

  const toggleBan = (id) => {
    if (activeTab === 'users') {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned: false } : u));
    } else {
      setListeners(prev => prev.map(l => l.id === id ? { ...l, isBanned: false } : l));
    }
  };

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={st.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Banned Members</Text>
        <View style={{ width: s(40) }} />
      </View>

      {}
      <View style={st.tabContainer}>
        <TouchableOpacity 
          style={[st.tab, activeTab === 'users' && st.activeTab]} 
          onPress={() => setActiveTab('users')}
          activeOpacity={0.8}
        >
          <Text style={[st.tabText, activeTab === 'users' && st.activeTabText]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[st.tab, activeTab === 'listeners' && st.activeTab]} 
          onPress={() => setActiveTab('listeners')}
          activeOpacity={0.8}
        >
          <Text style={[st.tabText, activeTab === 'listeners' && st.activeTabText]}>Listeners</Text>
        </TouchableOpacity>
      </View>

      {}
      <ScrollView 
        style={st.list} 
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} 
        showsVerticalScrollIndicator={false}
      >
        {bannedMembers.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#333" />
            <Text style={st.emptyText}>No banned {activeTab} found</Text>
          </View>
        ) : (
          bannedMembers.map(member => (
            <View key={member.id} style={st.card}>
              <Image source={member.avatar} style={st.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{member.name}</Text>
                <Text style={st.meta}>ID: {member.id} • {member.phone}</Text>
                <View style={st.badge}>
                  <Ionicons name="ban" size={12} color="#EF4444" />
                  <Text style={st.badgeText}>Banned</Text>
                </View>
              </View>
              <TouchableOpacity style={st.unbanBtn} activeOpacity={0.7} onPress={() => toggleBan(member.id)}>
                <Text style={st.unbanText}>Unban</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s(16), paddingVertical: SH * 0.015 },
  backBtn: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: ms(20, 0.3), fontWeight: '900', color: '#fff', fontFamily: 'Inter_900Black' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#141414', marginHorizontal: s(16), borderRadius: 20, padding: 4, marginBottom: SH * 0.02 },
  tab: { flex: 1, paddingVertical: SH * 0.012, alignItems: 'center', borderRadius: 16 },
  activeTab: { backgroundColor: '#2D1B36' },
  tabText: { color: '#6B7280', fontSize: ms(14, 0.3), fontFamily: 'Inter_600SemiBold' },
  activeTabText: { color: '#A855F7' },

  list: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderRadius: 16, padding: s(14), marginBottom: SH * 0.012, borderWidth: 1, borderColor: '#1F1F1F' },
  avatar: { width: SH * 0.06, height: SH * 0.06, borderRadius: SH * 0.03, marginRight: s(12) },
  name: { fontSize: ms(15, 0.3), color: '#fff', fontFamily: 'Inter_700Bold' },
  meta: { fontSize: ms(12, 0.3), color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: s(8), paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6, gap: 4 },
  badgeText: { color: '#EF4444', fontSize: ms(10, 0.3), fontFamily: 'Inter_600SemiBold' },
  unbanBtn: { backgroundColor: '#374151', paddingHorizontal: s(16), paddingVertical: SH * 0.008, borderRadius: 16 },
  unbanText: { color: '#fff', fontSize: ms(12, 0.3), fontFamily: 'Inter_700Bold' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: SH * 0.1 },
  emptyText: { color: '#6B7280', fontSize: ms(14, 0.3), fontFamily: 'Inter_500Medium', marginTop: vs(12), textAlign: 'center' },
});
