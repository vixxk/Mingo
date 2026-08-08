import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Modal,
  Animated,
  AppState,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, hp, wp, SCREEN_WIDTH } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../utils/api';
import LogoutPopup from '../../components/shared/LogoutPopup';
import ToastNotification from '../../components/shared/ToastNotification';

const INFO_CARDS = [
  {
    icon: 'person-outline',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#FCA5A5',
    title: 'Use the app as a User',
    description: 'You can continue using all features as a regular user while waiting.',
  },
  {
    icon: 'shield-checkmark-outline',
    iconBg: 'rgba(249, 115, 22, 0.15)',
    iconColor: '#FB923C',
    title: "We're reviewing your details",
    description: "We'll review your profile and your listener account is approved.",
  },
  {
    icon: 'notifications-outline',
    iconBg: 'rgba(248, 113, 113, 0.15)',
    iconColor: '#F87171',
    title: 'Check your notifications',
    description: 'You will receive an update once the review is complete.',
  },
];

const StatusChangePopup = ({ visible, type, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  const isApproved = type === 'approved';
  const title = isApproved ? 'Congratulations! 🎉' : 'Application Update';
  const message = isApproved
    ? 'Your listener application has been approved! You can now start taking calls and earning.'
    : 'Your listener application was not approved at this time. Please check your profile for details.';
  const buttonColor = isApproved ? '#22C55E' : '#EF4444';

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.popupOverlay}>
        <Animated.View
          style={[
            styles.popupContent,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={isApproved ? ['#0D3B2E', '#14532D'] : ['#3B1A1A', '#4A1C1C']}
            style={styles.popupGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.popupIconCircle, { backgroundColor: isApproved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
              <Ionicons
                name={isApproved ? 'checkmark-circle' : 'close-circle'}
                size={hp(6)}
                color={isApproved ? '#22C55E' : '#EF4444'}
              />
            </View>
            <Text style={styles.popupTitle}>{title}</Text>
            <Text style={styles.popupMessage}>{message}</Text>
            <TouchableOpacity
              style={[styles.popupButton, { backgroundColor: buttonColor }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.popupButtonText}>
                {isApproved ? 'Start Taking Calls' : 'Got it'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function ListenerPendingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [submittedDate, setSubmittedDate] = useState(null);
  const [statusPopup, setStatusPopup] = useState({ visible: false, type: null });
  // Manual refresh — spins the top-right icon while a status check is running.
  const [refreshing, setRefreshing] = useState(false);

  const dotRotate = useRef(new Animated.Value(0)).current;
  const refreshSpin = useRef(new Animated.Value(0)).current;
  const dotRingRotation = dotRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(dotRotate, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [dotRotate]);

  // Spins the refresh icon while a manual status check is in flight.
  const refreshSpinRotation = refreshSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  useEffect(() => {
    if (refreshing) {
      const anim = Animated.loop(
        Animated.timing(refreshSpin, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    }
    refreshSpin.setValue(0);
  }, [refreshing, refreshSpin]);

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });

  // Poll for status changes via API (backend SSE only broadcasts online/offline, not application status)
  const pollStatus = useCallback(async () => {
    try {
      const res = await authAPI.me();
      if (res?.data) {
        const user = res.data;
        const newStatus = user.listener?.status;
        // Persist the latest profile so the header name/avatar stay fresh too.
        await AsyncStorage.setItem('user', JSON.stringify(user));
        // Refresh the displayed "Submitted On" date from the server's data.
        if (user.listener?.createdAt) {
          setSubmittedDate(new Date(user.listener.createdAt));
        } else if (user.createdAt) {
          setSubmittedDate(new Date(user.createdAt));
        }
        if (newStatus === 'approved' || newStatus === 'rejected') {
          await AsyncStorage.setItem('listenerStatus', newStatus);
          setStatusPopup({ visible: true, type: newStatus });
        }
      }
    } catch (err) {
      console.log('[ListenerPending] Poll error:', err.message);
    }
  }, []);

  // Manual refresh (top-right button) — re-checks the application status now.
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await pollStatus();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, pollStatus]);

  // Poll on app foreground and every 30 seconds
  useEffect(() => {
    const interval = setInterval(pollStatus, 30000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') pollStatus();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [pollStatus]);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.listener?.createdAt) {
            setSubmittedDate(new Date(user.listener.createdAt));
          } else if (user.createdAt) {
            setSubmittedDate(new Date(user.createdAt));
          }
        }
      } catch (e) {
        console.log('Error loading user info:', e);
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, []);

  useEffect(() => {
    const backAction = () => {
      setShowLogoutPopup(true);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const statusPopupTypeRef = useRef(null);

  const handleStatusPopupClose = async () => {
    const currentType = statusPopupTypeRef.current;
    setStatusPopup({ visible: false, type: null });
    if (currentType === 'approved') {
      router.replace('/(listener)');
    } else {
      router.replace('/(auth)/verification-failed');
    }
  };

  useEffect(() => {
    statusPopupTypeRef.current = statusPopup.type;
  }, [statusPopup.type]);

  const handleUseAppAsUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const updatedUser = { ...user, role: 'USER' };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        await AsyncStorage.setItem('listenerStatus', 'user');
        await AsyncStorage.setItem('useAppAsUser', 'true');
        router.replace('/(tabs)');
      }
    } catch (err) {
      showToast('Failed to switch role.', 'error');
    }
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await AsyncStorage.multiRemove(['userToken', 'token', 'user', 'listenerStatus', 'isAdmin', 'userGender', 'userAvatarIndex', 'userName']);
      try { await authAPI.logout(); } catch (apiErr) {}
      setShowLogoutPopup(false);
      setTimeout(() => router.replace('/welcome'), 300);
    } catch (err) {
      showToast('Failed to logout.', 'error');
      setShowLogoutPopup(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const options = { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true };
    return date.toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.6, 1]}
        style={styles.bgGradient}
      />

      {/* Refresh button — top right. Re-checks the application status now
          instead of waiting for the 30s auto-poll. Spins while in flight. */}
      <TouchableOpacity
        style={[styles.refreshButton, { top: insets.top + vs(8) }]}
        onPress={handleRefresh}
        activeOpacity={0.7}
        disabled={refreshing}
        accessibilityLabel="Refresh application status"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Animated.View style={{ transform: [{ rotate: refreshSpinRotation }] }}>
          <Ionicons name="refresh" size={wp(5.5)} color={refreshing ? '#F87171' : '#FCA5A5'} />
        </Animated.View>
      </TouchableOpacity>

      <View
        style={[styles.scrollView, styles.scrollContent, { paddingTop: insets.top }]}
      >
        {/* Hourglass Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="hourglass-outline" size={hp(5)} color="#F87171" />
          </View>
          {/* Revolving dots */}
          <Animated.View
            style={[styles.dotRing, { transform: [{ rotate: dotRingRotation }] }]}
            pointerEvents="none"
          >
            <View style={[styles.decorDot, styles.dotTop]} />
            <View style={[styles.decorDot, styles.dotRight]} />
            <View style={[styles.decorDot, styles.dotBottom]} />
            <View style={[styles.decorDot, styles.dotLeft]} />
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Listener Application Pending</Text>

        {/* Description */}
        <Text style={styles.description}>
          Thank you for applying to become a Listener.{'\n'}
          Our team is reviewing your application.{'\n'}
          This usually takes{' '}
          <Text style={styles.descriptionHighlight}>1–2 business days</Text>.
        </Text>

        {/* Status Cards */}
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <View style={styles.statusIconWrap}>
              <Ionicons name="document-text-outline" size={wp(5)} color="#FCA5A5" />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusLabel}>Application Status</Text>
              <Text style={[styles.statusValue, styles.statusValueReview]} numberOfLines={1}>Under Review</Text>
            </View>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <View style={styles.statusIconWrap}>
              <Ionicons name="calendar-outline" size={wp(5)} color="#F87171" />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusLabel}>Submitted On</Text>
              <Text style={styles.statusValue} numberOfLines={1}>{formatDate(submittedDate)}</Text>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          {INFO_CARDS.map((card, index) => (
            <View key={index} style={styles.infoCard}>
              <View style={[styles.infoIconCircle, { backgroundColor: card.iconBg }]}>
                <Ionicons name={card.icon} size={wp(5)} color={card.iconColor} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle}>{card.title}</Text>
                <Text style={styles.infoDescription}>{card.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + vs(16) }]}>
        <TouchableOpacity style={styles.useAppButton} onPress={handleUseAppAsUser} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={wp(4.5)} color="#fff" />
          <Text style={styles.useAppButtonText}>Use App as User</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBottomBtn} onPress={() => setShowLogoutPopup(true)} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={wp(4.5)} color="#EF4444" />
          <Text style={styles.logoutBottomLink}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <LogoutPopup visible={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onConfirm={confirmLogout} loading={loggingOut} />
      <ToastNotification visible={toast.visible} message={toast.message} type={toast.type} onDismiss={() => setToast(prev => ({ ...prev, visible: false }))} />
      <StatusChangePopup visible={statusPopup.visible} type={statusPopup.type} onClose={handleStatusPopupClose} />
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
    height: hp(45),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingBottom: vs(150),
    alignItems: 'center',
  },
  iconContainer: {
    width: hp(12),
    height: hp(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  iconCircle: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dotRing: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorDot: {
    position: 'absolute',
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#F87171',
  },
  dotTop: {
    top: hp(1) - wp(1),
    left: '50%',
    marginLeft: -wp(1),
  },
  dotRight: {
    right: hp(1) - wp(1),
    top: '50%',
    marginTop: -wp(1),
  },
  dotBottom: {
    bottom: hp(1) - wp(1),
    left: '50%',
    marginLeft: -wp(1),
  },
  dotLeft: {
    left: hp(1) - wp(1),
    top: '50%',
    marginTop: -wp(1),
  },
  title: {
    fontSize: ms(22),
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: vs(12),
  },
  description: {
    fontSize: ms(14),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: vs(16),
    paddingHorizontal: wp(5),
  },
  descriptionHighlight: {
    color: '#FACC15',
    fontFamily: 'Inter_700Bold',
  },
  statusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingVertical: wp(2),
    paddingHorizontal: wp(3),
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrap: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2),
  },
  statusTextWrap: {
    flex: 1,
  },
  statusLabel: {
    fontSize: ms(10),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    marginBottom: 1,
  },
  statusValue: {
    fontSize: ms(11.5),
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  statusValueReview: {
    color: '#FACC15',
    fontFamily: 'Inter_700Bold',
  },
  statusDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#1F1F1F',
    marginHorizontal: wp(2),
  },
  infoCardsContainer: {
    width: '100%',
    gap: vs(12),
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: wp(4),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  infoIconCircle: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: ms(12),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    lineHeight: ms(16),
  },
  refreshButton: {
    position: 'absolute',
    right: wp(4),
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: wp(5),
    paddingTop: vs(12),
  },
  useAppButton: {
    width: '100%',
    height: vs(52),
    borderRadius: 26,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginBottom: vs(12),
  },
  useAppButtonText: {
    fontSize: ms(16),
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  logoutBottomBtn: {
    width: '100%',
    height: vs(48),
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  logoutBottomLink: {
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
    color: '#FCA5A5',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  popupContent: {
    width: '100%',
    maxWidth: wp(90),
  },
  popupGradient: {
    borderRadius: 24,
    padding: wp(6),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  popupIconCircle: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  popupTitle: {
    fontSize: ms(22),
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: vs(12),
  },
  popupMessage: {
    fontSize: ms(14),
    fontFamily: 'Inter_400Regular',
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: hp(3),
    paddingHorizontal: wp(2),
  },
  popupButton: {
    width: '100%',
    height: vs(52),
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupButtonText: {
    fontSize: ms(16),
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});
