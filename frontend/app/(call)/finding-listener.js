import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, wp, hp } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';
import { socketService } from '../../utils/socket';

// Animated soundwave bars that pulse like a heartbeat monitor
function SoundWaveBars({ color = '#EF4444', side = 'left' }) {
  const bars = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const animations = bars.map((v, i) => {
      const delay = side === 'left' ? (bars.length - 1 - i) * 60 : i * 60;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(v, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(v, {
              toValue: 0.3,
              duration: 300,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.waveContainer}>
      {bars.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              transform: [{ scaleY: v }],
              opacity: v.interpolate({
                inputRange: [0.3, 1],
                outputRange: [0.4, 0.9],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function FindingListenerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { callType = 'audio' } = useLocalSearchParams();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const [userAvatar, setUserAvatar] = useState(null);
  const [modal, setModal] = useState({
    visible: false,
    title: '',
    message: '',
    showWallet: false,
  });
  const matchedRef = useRef(false);
  const navigationTimerRef = useRef(null);

  // ── Animations ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    ringLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    const dotsLoop = Animated.loop(
      Animated.timing(dotsAnim, {
        toValue: 3,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    dotsLoop.start();

    return () => {
      pulseLoop.stop();
      ringLoop.stop();
      glowLoop.stop();
      dotsLoop.stop();
    };
  }, []);

  const [dotsText, setDotsText] = useState('');

  useEffect(() => {
    const listener = dotsAnim.addListener(({ value }) => {
      setDotsText(['', '.', '..', '...'][Math.round(value)]);
    });
    return () => dotsAnim.removeListener(listener);
  }, [dotsAnim]);

  // ── Load the user's own avatar ──
  useEffect(() => {
    const loadUser = async () => {
      try {
        const gender = (await AsyncStorage.getItem('userGender')) || 'Female';
        const ai = await AsyncStorage.getItem('userAvatarIndex');
        const avatarIndex = ai != null ? ai : '0';
        setUserAvatar({ uri: getAvatarUrl(gender, avatarIndex) });
      } catch (e) {
        console.log('Failed to load avatar:', e);
      }
    };
    loadUser();
  }, []);

  const handleModalClose = () => {
    setModal(prev => ({ ...prev, visible: false }));
    router.back();
  };

  const goToWallet = () => {
    setModal(prev => ({ ...prev, visible: false }));
    router.replace('/balance');
  };

  const handleCancel = () => {
    socketService.emit('cancel_random_search');
    router.back();
  };

  // ── Real random-match socket flow ──
  useEffect(() => {
    let cancelled = false;

    const goToConnecting = (data) => {
      router.replace({
        pathname: '/(call)/connecting',
        params: {
          name: data.partnerName || 'Listener',
          callId: `call_${Date.now()}`,
          roomId: `room_${Date.now()}`,
          listenerId: data.partnerId || '',
          avatarIndex: data.partnerAvatar ?? '0',
          gender: data.partnerGender || 'Female',
          callType,
          isRandom: 'true',
          matched: 'true',
          partnerRole: data.role || 'LISTENER',
        },
      });
    };

    const onMatchFound = (data) => {
      if (cancelled) return;
      console.log('Random match found on finding screen:', data);
      matchedRef.current = true;
      navigationTimerRef.current = setTimeout(() => {
        goToConnecting(data);
      }, 1400);
    };

    const onSearching = (data) => {
      if (cancelled) return;
      console.log('Searching for a listener:', data?.message);
    };

    const onSearchTimeout = () => {
      if (cancelled) return;
      setModal({
        visible: true,
        title: 'No Listener Available',
        message: 'No online listener is available right now. Please try again in a moment.',
        showWallet: false,
      });
    };

    const onInsufficientBalance = (data) => {
      if (cancelled) return;
      setModal({
        visible: true,
        title: 'Not Enough Coins',
        message: `You need at least ${data?.requiredCoins || 10} coins to start a call. Recharge to keep talking.`,
        showWallet: true,
      });
    };

    const startSearch = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        let userRole = 'USER';
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userRole = user.role || 'USER';
          } catch (e) {}
        }

        await socketService.connect();

        socketService.on('random_match_found', onMatchFound);
        socketService.on('searching_random', onSearching);
        socketService.on('random_search_timeout', onSearchTimeout);
        socketService.on('insufficient_balance', onInsufficientBalance);

        socketService.emit('request_random_call', { role: userRole });
      } catch (err) {
        console.error('Error starting random search:', err);
        if (!cancelled) {
          setModal({
            visible: true,
            title: 'Connection Error',
            message: 'Could not start the search. Please check your connection and try again.',
            showWallet: false,
          });
        }
      }
    };

    startSearch();

    return () => {
      cancelled = true;
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
      socketService.off('random_match_found', onMatchFound);
      socketService.off('searching_random', onSearching);
      socketService.off('random_search_timeout', onSearchTimeout);
      socketService.off('insufficient_balance', onInsufficientBalance);
      if (!matchedRef.current) {
        socketService.emit('cancel_random_search');
      }
    };
  }, []);

  const outerRingScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });
  const outerRingOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#000000', '#1A0000', '#330000']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Branded header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + hp(1), opacity: fadeAnim }]}>
        <Image
          source={require('../../images/Mingo Splash Text.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Reassurance notice */}
      <Animated.View style={[styles.noticePill, { opacity: fadeAnim }]}>
        <Ionicons name="warning-outline" size={wp(3.5)} color="#FBBF24" />
        <Text style={styles.noticeText}>Do not close or minimize the app</Text>
      </Animated.View>

      {/* Radar: avatar + soundwaves */}
      <Animated.View style={[styles.centerSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.radarWrap}>
          <SoundWaveBars side="left" />
          
          <View style={styles.avatarArea}>
            {/* Animated expanding ring */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: outerRingScale }],
                  opacity: outerRingOpacity,
                },
              ]}
            />
            
            {/* Main glowing ring */}
            <Animated.View
              style={[
                styles.avatarRing,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Image
                source={userAvatar || require('../../images/avatar_2.png')}
                style={styles.avatar}
                resizeMode="cover"
              />
            </Animated.View>
            
            {/* Inner glow */}
            <Animated.View
              style={[
                styles.innerGlow,
                {
                  opacity: glowAnim,
                },
              ]}
            />
          </View>
          
          <SoundWaveBars side="right" />
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            Finding a listener for you
            <Animated.Text style={styles.heading}>{dotsText}</Animated.Text>
          </Text>
          <Text style={styles.subtitle}>
            Please wait while we connect you to{'\n'}an available listener
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Cancel */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + hp(2), hp(4)) }]}>
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Error / info modal */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleModalClose}
      >
        <View style={styles.errorOverlay}>
          <View style={styles.errorModalBox}>
            <View style={styles.errorIconContainer}>
              <Ionicons
                name={modal.showWallet ? 'wallet-outline' : 'alert-circle-outline'}
                size={wp(12)}
                color="#EF4444"
              />
            </View>

            <Text style={styles.errorTitle}>{modal.title}</Text>
            <Text style={styles.errorMessage}>{modal.message}</Text>

            {modal.showWallet ? (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={handleModalClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnGhostText}>Not Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnFlex]}
                  onPress={goToWallet}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#DC2626', '#991B1B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalBtnGradient}
                  >
                    <Text style={styles.modalBtnText}>Add Coins</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalBtn} onPress={handleModalClose} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#DC2626', '#991B1B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalBtnGradient}
                >
                  <Text style={styles.modalBtnText}>Okay</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    paddingBottom: hp(1),
  },
  logo: {
    width: wp(42),
    height: hp(5.5),
  },
  noticePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: wp(5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    marginTop: hp(0.5),
  },
  noticeText: {
    fontSize: ms(11.5, 0.3),
    color: '#FDE68A',
    fontFamily: 'Inter_500Medium',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  radarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(4),
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.8),
    height: wp(16),
  },
  waveBar: {
    width: wp(1.2),
    height: '100%',
    borderRadius: wp(0.6),
  },
  avatarArea: {
    width: wp(34),
    height: wp(34),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: wp(34),
    height: wp(34),
    borderRadius: wp(17),
    borderWidth: wp(0.6),
    borderColor: '#EF4444',
  },
  avatarRing: {
    width: wp(30),
    height: wp(30),
    borderRadius: wp(15),
    borderWidth: wp(1.2),
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: wp(6),
    elevation: 15,
  },
  innerGlow: {
    position: 'absolute',
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    borderWidth: wp(0.4),
    borderColor: 'rgba(239, 68, 68, 0.5)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: wp(8),
    elevation: 20,
  },
  avatar: {
    width: wp(27),
    height: wp(27),
    borderRadius: wp(13.5),
  },
  heading: {
    fontSize: ms(22, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: hp(1.2),
  },
  subtitle: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(19),
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: wp(7),
    paddingHorizontal: wp(10),
    paddingVertical: hp(1.6),
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  cancelText: {
    fontSize: ms(15, 0.3),
    color: '#FCA5A5',
    fontFamily: 'Inter_600SemiBold',
  },
  errorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  errorModalBox: {
    width: wp(85),
    backgroundColor: '#0D0505',
    borderRadius: wp(6),
    borderWidth: 1.5,
    borderColor: '#3B0000',
    padding: wp(6),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  errorIconContainer: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  errorTitle: {
    color: '#fff',
    fontSize: wp(5),
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  errorMessage: {
    color: '#9CA3AF',
    fontSize: wp(3.8),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: wp(5.2),
    marginBottom: hp(3),
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: wp(3),
    width: '100%',
  },
  modalBtn: {
    width: '100%',
    borderRadius: wp(3.5),
    overflow: 'hidden',
  },
  modalBtnFlex: {
    flex: 1,
  },
  modalBtnGhost: {
    width: '38%',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#3B0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGradient: {
    paddingVertical: hp(1.6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: wp(3.8),
    fontFamily: 'Inter_700Bold',
  },
  modalBtnGhostText: {
    color: '#9CA3AF',
    fontSize: wp(3.8),
    fontFamily: 'Inter_700Bold',
  },
});
