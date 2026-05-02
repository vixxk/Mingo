import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
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

export default function BannedMembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unbanning, setUnbanning] = useState(null);

  const fetchBannedMembers = useCallback(async () => {
    try {
      const response = await adminAPI.getBannedMembers();
      const data = response.data || [];
      setMembers(data);
    } catch (error) {
      console.error('Failed to load banned members:', error);
      Alert.alert('Error', 'Failed to load banned members.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBannedMembers();
  }, [fetchBannedMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBannedMembers();
  }, [fetchBannedMembers]);

  const handleUnban = async (id) => {
    Alert.alert('Unban Member', 'Are you sure you want to unban this member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unban',
        onPress: async () => {
          setUnbanning(id);
          try {
            await adminAPI.toggleBanUser(id);
            setMembers((prev) => prev.filter((m) => (m._id || m.id) !== id));
          } catch (error) {
            console.error('Failed to unban:', error);
            Alert.alert('Error', 'Failed to unban member.');
          } finally {
            setUnbanning(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[st.container, st.center, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={st.loadingText}>Loading banned members...</Text>
      </View>
    );
  }

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={st.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={st.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Banned Members</Text>
        <View style={{ width: s(40) }} />
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
            tintColor="#A855F7"
            colors={['#A855F7']}
          />
        }
      >
        {members.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#333" />
            <Text style={st.emptyText}>No banned members found</Text>
          </View>
        ) : (
          members.map((member) => {
            const memberId = member._id || member.id;
            return (
              <View key={memberId} style={st.card}>
                <Image
                  source={getAvatarImage(member.gender, member.avatarIndex)}
                  style={st.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={st.name}>{member.name || member.username}</Text>
                  <Text style={st.meta}>
                    {member.phone} • {member.role}
                  </Text>
                  <View style={st.badge}>
                    <Ionicons name="ban" size={12} color="#EF4444" />
                    <Text style={st.badgeText}>Banned</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={st.unbanBtn}
                  activeOpacity={0.7}
                  onPress={() => handleUnban(memberId)}
                  disabled={unbanning === memberId}
                >
                  {unbanning === memberId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={st.unbanText}>Unban</Text>
                  )}
                </TouchableOpacity>
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

  list: { flex: 1, marginTop: vs(10) },
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
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: s(8),
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  badgeText: { color: '#EF4444', fontSize: ms(10, 0.3), fontFamily: 'Inter_600SemiBold' },
  unbanBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: s(16),
    paddingVertical: SH * 0.008,
    borderRadius: 16,
    minWidth: s(70),
    alignItems: 'center',
  },
  unbanText: { color: '#fff', fontSize: ms(12, 0.3), fontFamily: 'Inter_700Bold' },

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
});
