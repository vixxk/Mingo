import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, hp, wp, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/responsive';
import { listenerAPI, userAPI, walletAPI, authAPI, listenersAPI } from '../../utils/api';
import { useFocusEffect, useRouter } from 'expo-router';


const ConfirmationModal = ({ visible, isOnline, onConfirm, onCancel }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <View style={styles.modalContent}>
          {}
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onCancel}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={[styles.modalIconContainer, isOnline ? styles.modalIconOffline : styles.modalIconOnline]}>
            <Ionicons 
              name={isOnline ? "power" : "radio"} 
              size={32} 
              color="#fff" 
            />
          </View>
          
          <Text style={styles.modalTitle}>
            {isOnline ? 'Go Offline?' : 'Go Online?'}
          </Text>
          <Text style={styles.modalSub}>
            {isOnline 
              ? 'You will stop receiving new calls and earning until you switch back online.' 
              : 'You will start receiving calls from users and can start earning!'}
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalCancelBtn} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalConfirmBtn, isOnline ? styles.modalConfirmOffline : styles.modalConfirmOnline]} 
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.modalConfirmText}>
                {isOnline ? 'Confirm Offline' : 'Confirm Online'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const CantGoOnlinePopup = ({ visible, onClose }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          {}
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Ionicons name="alert" size={32} color="#EF4444" />
          </View>
          
          <Text style={styles.modalTitle}>Cannot Go Online</Text>
          <Text style={styles.modalSub}>
            Please enable audio, video calls or chat to go online and receive requests.
          </Text>

          <TouchableOpacity 
            style={{
              width: '100%',
              backgroundColor: '#EF4444',
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 18,
            }}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

export default function ListenerHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [userAvatar, setUserAvatar] = useState(require('../../images/user_avatar.png'));
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCantGoOnline, setShowCantGoOnline] = useState(false);

  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline]);



  const [earnings, setEarnings] = useState(0);
  const [totalCalls, setTotalCalls] = useState({ audio: 0, video: 0 });
  const [balance, setBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadListenerData = async () => {
        try {
          // Refresh Avatar/Profile first
          const gender = await AsyncStorage.getItem('userGender');
          const avatarIndex = await AsyncStorage.getItem('userAvatarIndex');
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

          const userStr = await AsyncStorage.getItem('user');
          let userId = null;
          if (userStr) {
            const userObj = JSON.parse(userStr);
            userId = userObj.id || userObj._id;
          }

          if (userId) {
            const profileRes = await listenerAPI.getMyProfile();
            if (profileRes?.data) {
              setEarnings(profileRes.data.earnings || 0);
              const sessions = profileRes.data.totalSessions || 0;
              setTotalCalls({ audio: profileRes.data.audioCalls || 0, video: profileRes.data.videoCalls || 0 });
              setIsOnline(profileRes.data.isOnline);
              setAudioEnabled(profileRes.data.audioEnabled !== false);
              setVideoEnabled(profileRes.data.videoEnabled === true);
              setChatEnabled(profileRes.data.chatEnabled !== false);
            }
          }

          const balRes = await walletAPI.getBalance();
          if (balRes?.data) setBalance(balRes.data.coins);

        } catch (e) {
          console.error('Error fetching listener data:', e);
        }
      };
      loadListenerData();
    }, [])
  );

  const handleStatusToggle = () => {
    if (!isOnline && !audioEnabled && !videoEnabled && !chatEnabled) {
      setShowCantGoOnline(true);
      return;
    }
    setShowConfirm(true);
  };

  const confirmStatusChange = async () => {
    try {
      if (isOnline) {
        await listenerAPI.goOffline();
        setIsOnline(false);
      } else {
        await listenerAPI.goOnline();
        setIsOnline(true);
      }
    } catch (e) {
      console.error('Failed to change status', e);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
    setShowConfirm(false);
  };

  const updateSettings = async (updates) => {
    try {
      await listenerAPI.updateSettings(updates);
    } catch (e) {
      console.error('Failed to update settings', e);
    }
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <ConfirmationModal 
        visible={showConfirm}
        isOnline={isOnline}
        onConfirm={confirmStatusChange}
        onCancel={() => setShowConfirm(false)}
      />

      <CantGoOnlinePopup 
        visible={showCantGoOnline}
        onClose={() => setShowCantGoOnline(false)}
      />

      {}
      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.65, 1]}
        style={styles.bgGradient}
      />

      {}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../images/Mingo Splash Text.png')} 
            style={styles.logoImage} 
            resizeMode="contain" 
          />
        </View>
        <View style={styles.headerRight}>
          <View style={styles.balanceBadge}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.balanceText}>₹{balance}</Text>
          </View>
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => router.push('/(listener)/listener-profile')}
          >
            <Image
              source={userAvatar}
              style={styles.headerAvatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      {}
      <LinearGradient
        colors={isOnline 
          ? ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)'] 
          : ['rgba(107, 114, 128, 0.15)', 'rgba(107, 114, 128, 0.05)']}
        style={[styles.statusBanner, isOnline ? styles.statusBannerOnline : styles.statusBannerOffline]}
      >
        <View style={styles.statusBannerContent}>
          <Animated.View style={[styles.bannerDot, isOnline && styles.bannerDotOnline, isOnline && { transform: [{ scale: pulseAnim }] }]} />
          <Text style={[styles.statusBannerText, isOnline ? styles.statusBannerTextOnline : styles.statusBannerTextOffline]}>
            You are {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
        <Text style={styles.statusBannerSub}>
          {isOnline ? 'You will receive calls from users' : 'Switch online to start earning'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {}
        <View style={[styles.card, isOnline && { opacity: 0.7 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(14) }}>
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Mingo Mode</Text>
            {isOnline && (
              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: 'bold' }}>OFFLINE TO EDIT</Text>
              </View>
            )}
          </View>

          {}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="mic-outline" size={20} color="#9CA3AF" />
              <Text style={styles.toggleLabel}>Audio</Text>
            </View>
            <Switch
              value={audioEnabled}
              disabled={isOnline}
              onValueChange={(val) => {
                setAudioEnabled(val);
                updateSettings({ audioEnabled: val });
                if (!val && !videoEnabled && !chatEnabled && isOnline) {
                  setIsOnline(false);
                  listenerAPI.goOffline();
                }
              }}
              trackColor={{ false: '#333', true: '#22C55E' }}
              thumbColor="#fff"
              ios_backgroundColor="#333"
            />
          </View>

          {}
          <View style={styles.cardDivider} />

          {}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="videocam-outline" size={20} color="#9CA3AF" />
              <Text style={styles.toggleLabel}>Video</Text>
            </View>
            <Switch
              value={videoEnabled}
              disabled={isOnline}
              onValueChange={(val) => {
                setVideoEnabled(val);
                updateSettings({ videoEnabled: val });
                if (!val && !audioEnabled && !chatEnabled && isOnline) {
                  setIsOnline(false);
                  listenerAPI.goOffline();
                }
              }}
              trackColor={{ false: '#333', true: '#22C55E' }}
              thumbColor="#fff"
              ios_backgroundColor="#333"
            />
          </View>

          {}
          <View style={styles.cardDivider} />

          {}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="chatbubble-outline" size={20} color="#9CA3AF" />
              <Text style={styles.toggleLabel}>Chat</Text>
            </View>
            <Switch
              value={chatEnabled}
              disabled={isOnline}
              onValueChange={(val) => {
                setChatEnabled(val);
                updateSettings({ chatEnabled: val });
                if (!val && !audioEnabled && !videoEnabled && isOnline) {
                  setIsOnline(false);
                  listenerAPI.goOffline();
                }
              }}
              trackColor={{ false: '#333', true: '#22C55E' }}
              thumbColor="#fff"
              ios_backgroundColor="#333"
            />
          </View>
          
          {isOnline && (
            <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
              You must go offline to change these settings
            </Text>
          )}
        </View>

        {}
        <TouchableOpacity
          style={[styles.onlineCard, isOnline ? styles.onlineCardActive : styles.onlineCardInactive]}
          activeOpacity={0.8}
          onPress={handleStatusToggle}
        >
          <View style={styles.onlineCardInner}>
            <View style={[styles.onlineIconContainer, isOnline ? styles.onlineIconActive : styles.onlineIconInactive]}>
              <Ionicons 
                name={isOnline ? "power" : "power-outline"} 
                size={32} 
                color={isOnline ? "#fff" : "#9CA3AF"} 
              />
            </View>
            <View style={styles.onlineTextContainer}>
              <Text style={styles.onlineMainText}>
                {isOnline ? 'Go Offline' : 'Go Online'}
              </Text>
              <Text style={styles.onlineSubText}>
                {isOnline ? 'Stop receiving calls' : 'Tap to become available'}
              </Text>
            </View>
            <View style={styles.toggleIndicator}>
              <View style={[styles.toggleBall, isOnline && styles.toggleBallActive]} />
            </View>
          </View>
        </TouchableOpacity>

        {}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Earnings</Text>

          {}
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Estimated Earnings</Text>
            <Text style={styles.earningsValue}>₹{earnings}</Text>
          </View>

          {}
          <View style={styles.cardDivider} />

          {}
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Total Calls</Text>
            <Text style={styles.earningsCallsValue}>{String(totalCalls.audio).padStart(2, '0')} Audio  •  {String(totalCalls.video).padStart(2, '0')} Video</Text>
          </View>
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
  },

  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: s(100),
    height: vs(40),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    gap: 4,
  },
  coinEmoji: {
    fontSize: ms(14, 0.3),
  },
  balanceText: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  headerAvatar: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    borderWidth: 2,
    borderColor: '#EC4899',
  },

  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  modalContent: {
    backgroundColor: '#141414',
    borderRadius: 32,
    padding: s(24),
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(24),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalIconContainer: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
  },
  modalIconOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  modalIconOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  modalTitle: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(12),
  },
  modalSub: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: vs(20),
    fontFamily: 'Inter_400Regular',
    marginBottom: vs(32),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: s(12),
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: vs(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1F1F1F',
  },
  modalCancelText: {
    fontSize: ms(16, 0.3),
    color: '#D1D5DB',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: vs(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  modalConfirmOnline: {
    backgroundColor: '#10B981',
  },
  modalConfirmOffline: {
    backgroundColor: '#EF4444',
  },
  modalConfirmText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },

  
  statusBanner: {
    marginHorizontal: s(16),
    marginTop: vs(8),
    marginBottom: vs(4),
    paddingVertical: vs(12),
    paddingHorizontal: s(16),
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBannerOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusBannerOffline: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(2),
  },
  bannerDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: '#6B7280',
  },
  bannerDotOnline: {
    backgroundColor: '#10B981',
  },
  statusBannerText: {
    fontSize: ms(15, 0.3),
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.5,
  },
  statusBannerTextOnline: {
    color: '#10B981',
  },
  statusBannerTextOffline: {
    color: '#9CA3AF',
  },
  statusBannerSub: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginLeft: s(16),
  },

  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: vs(10),
    paddingBottom: vs(40),
    gap: vs(14),
  },

  
  card: {
    backgroundColor: '#141414',
    borderRadius: 18,
    paddingHorizontal: s(18),
    paddingVertical: vs(18),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  cardTitle: {
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(14),
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginVertical: vs(12),
  },

  
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  toggleLabel: {
    fontSize: ms(15, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_500Medium',
  },

  
  onlineCard: {
    borderRadius: 24,
    padding: s(2),
    borderWidth: 1,
  },
  onlineCardActive: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
  },
  onlineCardInactive: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  onlineCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: s(16),
    backgroundColor: '#111',
    borderRadius: 22,
  },
  onlineIconContainer: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIconActive: {
    backgroundColor: '#064E3B',
  },
  onlineIconInactive: {
    backgroundColor: '#1F2937',
  },
  onlineTextContainer: {
    flex: 1,
    marginLeft: s(14),
  },
  onlineMainText: {
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  onlineSubText: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  toggleIndicator: {
    width: s(44),
    height: vs(24),
    borderRadius: 12,
    backgroundColor: '#1F2937',
    padding: 2,
    justifyContent: 'center',
  },
  toggleBall: {
    width: s(20),
    height: s(20),
    borderRadius: 10,
    backgroundColor: '#4B5563',
  },
  toggleBallActive: {
    backgroundColor: '#10B981',
    alignSelf: 'flex-end',
  },

  
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsLabel: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  earningsValue: {
    fontSize: ms(18, 0.3),
    color: '#22C55E',
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
  },
  earningsCallsValue: {
    fontSize: ms(14, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_500Medium',
  },

  // FAB & Random Styles
  floatingRandomWrapper: {
    position: 'absolute',
    zIndex: 100,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingVertical: vs(12),
    paddingHorizontal: s(20),
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  randomBtnText: {
    color: '#fff',
    fontSize: ms(16, 0.3),
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
  },
  fabOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: hp(15),
    paddingRight: wp(5),
  },
  fabMenu: {
    alignItems: 'center',
    gap: hp(2),
  },
  fabVideoRow: {
    alignSelf: 'flex-end',
  },
  fabBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
  },
  fabCircle: {
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabCloseCircle: {
    width: hp(7.5),
    height: hp(7.5),
    borderRadius: hp(3.75),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
