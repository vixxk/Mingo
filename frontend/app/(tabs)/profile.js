import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs } from '../../utils/responsive';
import { authAPI } from '../../utils/api';
import RaiseIssuePopup from '../../components/shared/RaiseIssuePopup';
import LogoutPopup from '../../components/shared/LogoutPopup';

const MENU_ITEMS = [
  { id: '1', label: 'Wallet', icon: 'wallet-outline', route: '/balance' },
  { id: '2', label: 'Transactions', icon: 'receipt-outline', route: '/payment-failed' },
  { id: '3', label: 'Language Settings', icon: 'globe-outline', route: '/language?fromSettings=true' },
  { id: '4', label: 'Become a Listener', icon: 'star-outline', route: '/listener' },
  { id: '5', label: 'Help & Support', icon: 'help-circle-outline', route: '/help-support' },
  { id: '7', label: 'Raise an Issue', icon: 'flag-outline', action: 'issue' },
  { id: '6', label: 'Account Settings', icon: 'person-outline', route: '/edit-profile' },
];

const MenuItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.6}
    onPress={() => onPress(item)}
  >
    <Ionicons name={item.icon} size={22} color="#9CA3AF" style={styles.menuIcon} />
    <Text style={styles.menuLabel}>{item.label}</Text>
    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userAvatar, setUserAvatar] = useState(require('../../images/user_avatar.png'));
  const [showIssuePopup, setShowIssuePopup] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [username, setUsername] = useState('Userid1234');

  
  const profileCardAnim = useRef(new Animated.Value(0)).current;
  const menuCardAnim = useRef(new Animated.Value(0)).current;
  const logoutCardAnim = useRef(new Animated.Value(0)).current;
  const profileSlide = useRef(new Animated.Value(20)).current;
  const menuSlide = useRef(new Animated.Value(20)).current;
  const logoutSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(profileCardAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(profileSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(menuCardAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(menuSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(logoutCardAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoutSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const gender = await AsyncStorage.getItem('userGender');
          const avatarIndex = await AsyncStorage.getItem('userAvatarIndex');
          const storedUsername = await AsyncStorage.getItem('userName');
          
          if (storedUsername) setUsername(storedUsername);
          
          if (gender && avatarIndex) {
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
            const avatars = gender === 'Male' ? maleAvatars : femaleAvatars;
            setUserAvatar(avatars[parseInt(avatarIndex, 10)] || avatars[0]);
          }
        } catch (e) {
          console.error('Error loading profile:', e);
        }
      };
      loadProfile();
    }, [])
  );

  const handleMenuPress = (item) => {
    if (item.action === 'issue') {
      setShowIssuePopup(true);
    } else if (item.route) {
      router.push(item.route);
    } else {
      console.log('Navigate to:', item.label);
    }
  };

  const handleLogout = () => {
    setShowLogoutPopup(true);
  };

  const confirmLogout = async () => {
    try {
      await authAPI.logout();
      await AsyncStorage.multiRemove(['userToken', 'user', 'listenerStatus', 'isAdmin']);
      setShowLogoutPopup(false);
      router.replace('/welcome');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutPopup(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {}
        <Animated.View style={[styles.profileCard, { opacity: profileCardAnim, transform: [{ translateY: profileSlide }] }]}>
          {}
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.7} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="pencil-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
 
          {}
          <View style={styles.avatarRing}>
            <Image
              source={userAvatar}
              style={styles.avatar}
            />
          </View>

          {}
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.profileDate}>Profile created on 17/04/2025</Text>
        </Animated.View>

        {}
        <Animated.View style={[styles.menuCard, { opacity: menuCardAnim, transform: [{ translateY: menuSlide }] }]}>
          {MENU_ITEMS.map((item, index) => (
            <View key={item.id}>
              <MenuItem item={item} onPress={handleMenuPress} />
              {index < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </Animated.View>

        {}
        <Animated.View style={[styles.logoutCard, { opacity: logoutCardAnim, transform: [{ translateY: logoutSlide }] }]}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.6}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#9CA3AF" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </Animated.View>

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
    borderColor: '#14B8A6',
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
});
