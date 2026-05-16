import React, { useState, useEffect, useCallback } from 'react';
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
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import UserDetailModal from '../../components/admin/UserDetailModal';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

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

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const FILTER_CONFIG = {
    all: { icon: 'layers', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    active: { icon: 'checkmark-circle', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    inactive: { icon: 'ban', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ limit: 100 });
      if (res?.data) {
        const usersList = res.data.users || (Array.isArray(res.data) ? res.data : []);
        const formatted = usersList.map(u => ({
          ...u,
          id: u._id,
          name: u.name || 'Unknown',
          phone: u.phone || 'Unknown',
          language: u.language || 'English',
          avatar: getAvatarImage(u.gender, u.avatarIndex),
          status: u.isBanned ? 'inactive' : 'active',
          totalCalls: u.totalCalls || 0,
          coins: u.coins || 0
        }));
        setUsers(formatted);
      }
    } catch (e) {
      console.log('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const handleBanUser = (userId, isCurrentlyBanned) => {
    Alert.alert(
      isCurrentlyBanned ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${isCurrentlyBanned ? 'unban' : 'ban'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isCurrentlyBanned ? 'Unban' : 'Ban', 
          style: isCurrentlyBanned ? 'default' : 'destructive', 
          onPress: async () => {
            try {
              await adminAPI.toggleBanUser(userId);
              setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: isCurrentlyBanned ? 'active' : 'inactive' } : u));
              setShowDetail(false);
              setSelectedUser(null);
            } catch(e) {
              Alert.alert('Error', 'Failed to update user status');
            }
          }
        },
      ]
    );
  };

  const handleDeleteUser = (userId) => {
    Alert.alert(
      'Delete User Permanently',
      'This action cannot be undone. All user data will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await adminAPI.deleteUser(userId);
              setUsers(prev => prev.filter(u => u.id !== userId));
              setShowDetail(false);
              setSelectedUser(null);
            } catch(e) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        },
      ]
    );
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phone.includes(searchQuery);
    const matchesFilter = filter === 'all' || u.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="list" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <UserDetailModal
        visible={showDetail}
        user={selectedUser}
        onClose={() => { setShowDetail(false); setSelectedUser(null); }}
        onDelete={handleDeleteUser}
        onBan={handleBanUser}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Users</Text>
        <Text style={styles.headerCount}>{users.length}</Text>
      </View>

      {}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#4B5563"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {}
      <View style={styles.filterContainer}>
        <View style={styles.filterWrapper}>
          {['all', 'active', 'inactive'].map((f) => {
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

      {}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredUsers.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: hp(10) }}>
            <Ionicons name="people-outline" size={64} color="#333" />
            <Text style={{ color: '#6B7280', fontSize: ms(16, 0.3), fontFamily: 'Inter_500Medium', marginTop: vs(12) }}>No users found</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              activeOpacity={0.7}
              onPress={() => { setSelectedUser(user); setShowDetail(true); }}
            >
              <Image source={user.avatar} style={styles.userAvatar} />
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <View style={[styles.statusDot, user.status === 'active' ? styles.dotActive : styles.dotInactive]} />
                </View>
                <Text style={styles.userMeta}>{user.phone} • {user.language}</Text>
                <View style={styles.userStats}>
                  <Text style={styles.userStatItem}>📞 {user.totalCalls} calls</Text>
                  <Text style={styles.userStatItem}>🪙 {user.coins} coins</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#4B5563" />
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: hp(4) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
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

  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: wp(4),
    paddingHorizontal: wp(4),
    height: hp(5.5),
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

  
  filterContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
  },
  filterWrapper: {
    flexDirection: 'row',
    backgroundColor: '#111',
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
    fontSize: ms(11),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },

  
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(0.5),
  },

  
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: wp(4),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  userAvatar: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    marginRight: wp(3),
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  userName: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#10B981',
  },
  dotInactive: {
    backgroundColor: '#4B5563',
  },
  userMeta: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  userStats: {
    flexDirection: 'row',
    gap: s(12),
    marginTop: 4,
  },
  userStatItem: {
    fontSize: ms(11, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
});
