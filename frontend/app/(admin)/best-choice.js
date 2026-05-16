import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
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

export default function BestChoiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [listeners, setListeners] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(null);

  const fetchListeners = useCallback(async () => {
    try {
      const response = await adminAPI.getListeners({ status: 'approved' });
      const data = response.data?.listeners || response.data || [];
      setListeners(data);
    } catch (error) {
      console.error('Failed to load listeners:', error);
      Alert.alert('Error', 'Failed to load listeners.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListeners();
  }, [fetchListeners]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListeners();
  }, [fetchListeners]);

  const bestChoiceListeners = useMemo(() => {
    return listeners.filter((l) => l.bestChoice);
  }, [listeners]);

  const availableListeners = useMemo(() => {
    return listeners.filter(
      (l) =>
        !l.bestChoice &&
        (l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.phone?.includes(searchQuery))
    );
  }, [listeners, searchQuery]);

  const toggleBestChoice = async (id) => {
    setToggling(id);
    try {
      await adminAPI.toggleBestChoice(id);
      setListeners((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, bestChoice: !l.bestChoice } : l
        )
      );
    } catch (error) {
      console.error('Failed to toggle best choice:', error);
      Alert.alert('Error', 'Failed to update best choice status.');
    } finally {
      setToggling(null);
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

      {}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(12) }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={st.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Best Choice</Text>
        </View>
        <TouchableOpacity
          style={st.addBtn}
          activeOpacity={0.7}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#000" />
          <Text style={st.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {}
      <ScrollView
        style={st.list}
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
            colors={['#F59E0B']}
          />
        }
      >
        {bestChoiceListeners.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="star-outline" size={48} color="#333" />
            <Text style={st.emptyText}>No Best Choice listeners yet</Text>
          </View>
        ) : (
          bestChoiceListeners.map((listener) => (
            <View key={listener.id} style={st.card}>
              <Image
                source={getAvatarImage(listener.gender, listener.avatarIndex)}
                style={st.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{listener.name}</Text>
                <Text style={st.meta}>
                  {listener.rating ? `⭐ ${listener.rating}` : 'No rating'} • {listener.totalCalls || 0} calls
                </Text>
                <View style={st.badge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={st.badgeText}>Best Choice</Text>
                </View>
              </View>
              <TouchableOpacity
                style={st.removeBtn}
                activeOpacity={0.7}
                onPress={() => toggleBestChoice(listener.id)}
                disabled={toggling === listener.id}
              >
                {toggling === listener.id ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                )}
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

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }}
              showsVerticalScrollIndicator={false}
            >
              {availableListeners.length === 0 ? (
                <Text style={st.emptyText}>No listeners available</Text>
              ) : (
                availableListeners.map((listener) => (
                  <View key={listener.id} style={st.card}>
                    <Image
                      source={getAvatarImage(listener.gender, listener.avatarIndex)}
                      style={st.avatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={st.name}>{listener.name}</Text>
                      <Text style={st.meta}>{listener.phone}</Text>
                    </View>
                    <TouchableOpacity
                      style={st.selectBtn}
                      activeOpacity={0.7}
                      onPress={() => toggleBestChoice(listener.id)}
                      disabled={toggling === listener.id}
                    >
                      {toggling === listener.id ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={st.selectBtnText}>Add</Text>
                      )}
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
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: s(16),
    paddingVertical: SH * 0.01,
    borderRadius: 20,
    gap: s(4),
  },
  addBtnText: { color: '#000', fontSize: ms(14, 0.3), fontFamily: 'Inter_700Bold' },

  list: { flex: 1, paddingTop: SH * 0.02 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: s(14),
    marginBottom: SH * 0.012,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  avatar: {
    width: SH * 0.06,
    height: SH * 0.06,
    borderRadius: SH * 0.03,
    marginRight: s(12),
  },
  name: { fontSize: ms(15, 0.3), color: '#fff', fontFamily: 'Inter_700Bold' },
  meta: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: s(8),
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  badgeText: { color: '#F59E0B', fontSize: ms(10, 0.3), fontFamily: 'Inter_600SemiBold' },
  removeBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: s(16),
    paddingVertical: SH * 0.008,
    borderRadius: 16,
  },
  selectBtnText: { color: '#000', fontSize: ms(12, 0.3), fontFamily: 'Inter_700Bold' },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH * 0.1,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_500Medium',
    marginTop: vs(12),
    textAlign: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s(20),
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  modalTitle: { fontSize: ms(18, 0.3), color: '#fff', fontFamily: 'Inter_800ExtraBold' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    margin: s(16),
    paddingHorizontal: s(14),
    height: SH * 0.055,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    gap: s(8),
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
  },
});
