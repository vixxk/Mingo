import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Animated,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { authAPI, listenerAPI, userAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs } from '../../utils/responsive';
import RaiseIssuePopup from '../../components/shared/RaiseIssuePopup';
import LogoutPopup from '../../components/shared/LogoutPopup';
import DeleteAccountPopup from '../../components/shared/DeleteAccountPopup';

const MENU_ITEMS = [
  { id: '2', label: 'Transactions', icon: 'receipt-outline', route: '/transactions' },
  { id: '3', label: 'Language Settings', icon: 'globe-outline', route: '/language?fromSettings=true' },
  { id: '5', label: 'Help & Support', icon: 'headset-outline', route: '/help-support' },
  { id: '7', label: 'Raise an Issue', icon: 'flag-outline', action: 'issue' },
  { id: '8', label: 'Edit Public Profile', icon: 'id-card-outline', route: '/(listener)/edit-public-profile' },
  { id: '6', label: 'Account Settings', icon: 'person-outline', route: '/edit-profile' },
  { id: '10', label: 'Privacy Policy', icon: 'shield-checkmark-outline', action: 'privacy' },
  { id: '11', label: 'Terms & Conditions', icon: 'document-text-outline', action: 'terms' },
  { id: '12', label: 'Community Guidelines', icon: 'information-circle-outline', action: 'guidelines' },
  { id: '9', label: 'Delete Account', icon: 'trash-outline', action: 'delete', danger: true },
];

const MenuItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.6}
    onPress={() => onPress(item)}
  >
    <Ionicons name={item.icon} size={22} color={item.danger ? '#EF4444' : '#9CA3AF'} style={styles.menuIcon} />
    <Text style={[styles.menuLabel, item.danger && { color: '#EF4444' }]}>{item.label}</Text>
    <Ionicons name="chevron-forward" size={20} color={item.danger ? '#EF4444' : '#6B7280'} />
  </TouchableOpacity>
);

export default function ListenerProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showIssuePopup, setShowIssuePopup] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userAvatar, setUserAvatar] = useState(require('../../images/user_avatar.png'));
  const [username, setUsername] = useState('Listener');
  const [joinDate, setJoinDate] = useState('Member');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animLoop;
    if (isLoading) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      );
      animLoop.start();
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await authAPI.me();
      if (res?.data) {
        const userObj = res.data;
        await AsyncStorage.setItem('user', JSON.stringify(userObj));
        setUsername(userObj.name || userObj.username || 'Listener');
        if (userObj.createdAt) {
          const d = new Date(userObj.createdAt);
          setJoinDate(`Listener since ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`);
        }
        const rawGender = userObj.gender || 'Male';
        const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
        const avatarIndex = userObj.avatarIndex !== undefined ? userObj.avatarIndex.toString() : '0';
        
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
        const avatars = normalizedGender === 'Male' ? maleAvatars : femaleAvatars;
        setUserAvatar(avatars[parseInt(avatarIndex, 10)] || avatars[0]);
      }
    } catch (e) {
      console.log('Error refreshing profile:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        setIsLoading(true);
        try {
          // 1. Fetch fresh data from API
          const res = await authAPI.me();
          let userObj = null;
          
          if (res?.data) {
            userObj = res.data;
            await AsyncStorage.setItem('user', JSON.stringify(userObj));
            if (userObj.gender) await AsyncStorage.setItem('userGender', userObj.gender);
            if (userObj.avatarIndex !== undefined) await AsyncStorage.setItem('userAvatarIndex', userObj.avatarIndex.toString());
            if (userObj.name) await AsyncStorage.setItem('userName', userObj.name);
          } else {
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) userObj = JSON.parse(userStr);
          }

          if (userObj) {
            setUsername(userObj.name || userObj.username || 'Listener');
            if (userObj.createdAt) {
              const d = new Date(userObj.createdAt);
              setJoinDate(`Listener since ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`);
            }

            const rawGender = userObj.gender || (await AsyncStorage.getItem('userGender')) || 'Male';
            const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
            const avatarIndex = userObj.avatarIndex !== undefined ? userObj.avatarIndex.toString() : (await AsyncStorage.getItem('userAvatarIndex') || '0');
            
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
            const avatars = normalizedGender === 'Male' ? maleAvatars : femaleAvatars;
            setUserAvatar(avatars[parseInt(avatarIndex, 10)] || avatars[0]);
          }
        } catch (e) {
          console.error('Error loading profile:', e);
        } finally {
          setIsLoading(false);
        }
      };
      loadProfile();
    }, [])
  );

  const handleMenuPress = (item) => {
    if (item.action === 'issue') {
      setShowIssuePopup(true);
    } else if (item.action === 'privacy') {
      Linking.openURL('https://www.talkmingo.com/privacy-policy');
    } else if (item.action === 'terms') {
      Linking.openURL('https://www.talkmingo.com/terms');
    } else if (item.action === 'guidelines') {
      Linking.openURL('https://www.talkmingo.com/community-guidelines');
    } else if (item.action === 'delete') {
      setShowDeletePopup(true);
    } else if (item.route) {
      router.push(item.route);
    }
  };

  const handleLogout = () => {
    setShowLogoutPopup(true);
  };

  const confirmLogout = async () => {
    try {
      // Clear keys first
      await AsyncStorage.multiRemove(['userToken', 'token', 'user', 'listenerStatus', 'isAdmin', 'userGender', 'userAvatarIndex', 'userName']);
      
      // Set listener offline before logging out
      try {
        await listenerAPI.goOffline();
      } catch (e) {
        console.log('Go offline on logout error (non-critical):', e);
      }
      // Disconnect socket so backend detects disconnect
      try {
        socketService.disconnect();
      } catch (e) {}
      try {
        await authAPI.logout();
      } catch (apiErr) {
        console.warn('API logout failed:', apiErr);
      }
      setShowLogoutPopup(false);
      setTimeout(() => {
        router.replace('/welcome');
      }, 300);
    } catch (e) {
      console.error('Logout error:', e);
      setShowLogoutPopup(false);
      setTimeout(() => {
        router.replace('/welcome');
      }, 300);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.scrollContent}>
          {/* Skeleton Profile Card */}
          <View style={styles.profileCard}>
            <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerAnim }]} />
            <Animated.View style={[styles.skeletonName, { opacity: shimmerAnim }]} />
            <Animated.View style={[styles.skeletonDate, { opacity: shimmerAnim }]} />
          </View>

          {/* Skeleton Menu Card */}
          <View style={styles.menuCard}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.skeletonRowContainer}>
                <Animated.View style={[styles.skeletonIcon, { opacity: shimmerAnim }]} />
                <Animated.View style={[styles.skeletonLine, { opacity: shimmerAnim }]} />
              </View>
            ))}
          </View>

          {/* Skeleton Logout Card */}
          <View style={styles.logoutCard}>
            <View style={styles.skeletonRowContainer}>
              <Animated.View style={[styles.skeletonIcon, { opacity: shimmerAnim }]} />
              <Animated.View style={[styles.skeletonLine, { width: '40%', opacity: shimmerAnim }]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
      >
        {}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.7} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="pencil-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.avatarRing}>
            <Image
              source={userAvatar}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.username}>{username}</Text>
          <Text style={styles.profileDate}>{joinDate}</Text>
        </View>

        {}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <View key={item.id}>
              <MenuItem item={item} onPress={handleMenuPress} />
              {index < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        {}
        <View style={styles.logoutCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.6}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#9CA3AF" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={{ height: vs(30) }} />
      </ScrollView>

      <RaiseIssuePopup 
        visible={showIssuePopup} 
        onClose={() => setShowIssuePopup(false)} 
      />
      <LogoutPopup 
        visible={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onConfirm={confirmLogout}
      />
      <DeleteAccountPopup
        visible={showDeletePopup}
        onClose={() => setShowDeletePopup(false)}
        isDeleting={isDeleting}
        onConfirm={async (reason) => {
          setIsDeleting(true);
          try {
            await AsyncStorage.multiRemove(['userToken', 'token', 'user', 'listenerStatus', 'isAdmin', 'userGender', 'userAvatarIndex', 'userName']);
            await userAPI.deleteAccount(reason);
            try {
              await listenerAPI.goOffline();
            } catch (e) {
              console.log('Go offline on delete account error (non-critical):', e);
            }
            try {
              socketService.disconnect();
            } catch (e) {}
            setShowDeletePopup(false);
            setTimeout(() => {
              router.replace('/welcome');
            }, 300);
          } catch (err) {
            console.error('Delete account error:', err);
            setShowDeletePopup(false);
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: vs(12),
  },

  
  profileCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingTop: vs(24),
    paddingBottom: vs(20),
    paddingHorizontal: s(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: vs(16),
  },
  editBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(16),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    borderWidth: 2.5,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(12),
  },
  avatar: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
  },
  username: {
    fontSize: ms(20, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(4),
  },
  profileDate: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },

  
  menuCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(6),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: vs(16),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(15),
    paddingHorizontal: s(18),
  },
  menuIcon: {
    marginRight: s(14),
    width: s(24),
  },
  menuLabel: {
    flex: 1,
    fontSize: ms(15, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_500Medium',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginHorizontal: s(18),
  },

  
  logoutCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  skeletonAvatar: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#1F2937',
    alignSelf: 'center',
    marginBottom: vs(16),
  },
  skeletonName: {
    width: s(120),
    height: vs(18),
    borderRadius: 9,
    backgroundColor: '#1F2937',
    alignSelf: 'center',
    marginBottom: vs(8),
  },
  skeletonDate: {
    width: s(160),
    height: vs(12),
    borderRadius: 6,
    backgroundColor: '#1F2937',
    alignSelf: 'center',
    marginBottom: vs(16),
  },
  skeletonRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(15),
    paddingHorizontal: s(18),
    gap: s(14),
  },
  skeletonIcon: {
    width: s(24),
    height: s(24),
    borderRadius: s(6),
    backgroundColor: '#1F2937',
  },
  skeletonLine: {
    flex: 1,
    height: vs(16),
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
});
