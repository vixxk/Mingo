import { useState } from 'react';
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
import { ms, s, vs } from '../../utils/responsive';
import { DEMO_USERS } from '../../data/admin/adminData';
import UserDetailModal from '../../components/admin/UserDetailModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState(DEMO_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');

  const handleDeleteUser = (userId) => {
    Alert.alert('Delete User', 'Are you sure you want to permanently delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setShowDetail(false);
        setSelectedUser(null);
      }},
    ]);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phone.includes(searchQuery);
    const matchesFilter = filter === 'all' || u.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <UserDetailModal
        visible={showDetail}
        user={selectedUser}
        onClose={() => { setShowDetail(false); setSelectedUser(null); }}
        onDelete={handleDeleteUser}
      />

      {}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users</Text>
        <Text style={styles.headerCount}>{users.length} total</Text>
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
      <View style={styles.filterRow}>
        {['all', 'active', 'inactive'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredUsers.map((user) => (
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
                <Text style={styles.userStatItem}>📱 {user.appOpens} opens</Text>
                <Text style={styles.userStatItem}>⏱ {user.totalTimeSpent}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#4B5563" />
          </TouchableOpacity>
        ))}
        <View style={{ height: SCREEN_HEIGHT * 0.04 }} />
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: s(16),
    paddingVertical: SCREEN_HEIGHT * 0.015,
  },
  headerTitle: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  headerCount: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },

  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: s(16),
    paddingHorizontal: s(14),
    height: SCREEN_HEIGHT * 0.055,
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

  
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: s(16),
    marginTop: SCREEN_HEIGHT * 0.012,
    marginBottom: SCREEN_HEIGHT * 0.01,
    gap: s(8),
  },
  filterTab: {
    paddingHorizontal: s(16),
    paddingVertical: SCREEN_HEIGHT * 0.008,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  filterTabActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#A855F7',
  },
  filterTabText: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
  filterTabTextActive: {
    color: '#A855F7',
  },

  
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: SCREEN_HEIGHT * 0.005,
  },

  
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: s(14),
    marginBottom: SCREEN_HEIGHT * 0.01,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  userAvatar: {
    width: SCREEN_HEIGHT * 0.06,
    height: SCREEN_HEIGHT * 0.06,
    borderRadius: SCREEN_HEIGHT * 0.03,
    marginRight: s(12),
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
