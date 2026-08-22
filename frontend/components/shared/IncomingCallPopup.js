import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Vibration,
  AppState,
  SafeAreaView,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, hp, wp, s } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';
import { playIncomingCallSound, stopIncomingCallSound } from '../../utils/callSounds';

const SwipeButton = ({ label, icon, iconRotate = '0deg', color, direction = 'right', onSwipe }) => {
  const isLeft = direction === 'left';
  const panX = React.useRef(new Animated.Value(0)).current;
  const isSwipedRef = React.useRef(false);

  const trackWidth = wp(86);
  const knobSize = wp(14);
  const maxSwipe = trackWidth - knobSize - s(8);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (isSwipedRef.current) return;
        if (isLeft) {
          if (gestureState.dx < 0) {
            panX.setValue(Math.max(gestureState.dx, -maxSwipe));
          }
        } else {
          if (gestureState.dx > 0) {
            panX.setValue(Math.min(gestureState.dx, maxSwipe));
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isSwipedRef.current) return;
        const dragDist = isLeft ? -gestureState.dx : gestureState.dx;
        if (dragDist >= maxSwipe * 0.55) {
          isSwipedRef.current = true;
          Animated.timing(panX, {
            toValue: isLeft ? -maxSwipe : maxSwipe,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            onSwipe();
          });
        } else {
          Animated.spring(panX, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const chevronOpacity = React.useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(chevronOpacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [chevronOpacity]);

  return (
    <View style={[styles.swipeTrack, { borderColor: color }]}>
      <Animated.View
        style={[
          styles.swipeFill,
          {
            backgroundColor: color,
            opacity: panX.interpolate({
              inputRange: isLeft ? [-maxSwipe, 0] : [0, Math.max(1, maxSwipe)],
              outputRange: isLeft ? [0.3, 0.08] : [0.08, 0.3],
            }),
          },
        ]}
      />

      <View
        style={[
          styles.swipeTextContainer,
          isLeft ? { paddingLeft: wp(6), paddingRight: wp(16) } : { paddingLeft: wp(16), paddingRight: wp(6) },
        ]}
        pointerEvents="none"
      >
        {isLeft && (
          <Animated.View style={{ opacity: chevronOpacity, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={s(16)} color={color} style={{ marginRight: -s(6) }} />
            <Ionicons name="chevron-back" size={s(16)} color={color} style={{ marginRight: -s(6) }} />
            <Ionicons name="chevron-back" size={s(16)} color={color} />
          </Animated.View>
        )}

        <Text style={styles.swipeLabel}>{label}</Text>

        {!isLeft && (
          <Animated.View style={{ opacity: chevronOpacity, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-forward" size={s(16)} color={color} style={{ marginRight: -s(6) }} />
            <Ionicons name="chevron-forward" size={s(16)} color={color} style={{ marginRight: -s(6) }} />
            <Ionicons name="chevron-forward" size={s(16)} color={color} />
          </Animated.View>
        )}
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.swipeKnob,
          isLeft ? { right: s(4), position: 'absolute' } : { left: s(4), position: 'absolute' },
          {
            backgroundColor: color,
            transform: [{ translateX: panX }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (isSwipedRef.current) return;
            isSwipedRef.current = true;
            Animated.timing(panX, {
              toValue: isLeft ? -maxSwipe : maxSwipe,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              onSwipe();
            });
          }}
          style={styles.knobInnerTouch}
        >
          <Ionicons
            name={icon}
            size={wp(6)}
            color="#FFFFFF"
            style={{ transform: [{ rotate: iconRotate }] }}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const DedicatedCallPage = ({ call, onAccept, onReject }) => {
  const avatarUrl = getAvatarUrl(call.gender, call.avatarIndex);
  const isVideo = call.callType === 'video';

  const avatarPulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Subtle pulsing animation for avatar
    const avatarLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    avatarLoop.start();
    return () => avatarLoop.stop();
  }, [avatarPulseAnim]);

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#09090E" translucent />
      <LinearGradient
        colors={['#0A0A0F', '#141028', '#09090E']}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar with Mingo Logo on Top Left */}
          <View style={styles.headerRow}>
            <Image
              source={require('../../images/Mingo Splash Text.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Center Section with Caller Photo & Details */}
          <View style={styles.centerSection}>
            <Animated.View
              style={[
                styles.avatarOuterRing,
                { transform: [{ scale: avatarPulseAnim }] },
              ]}
            >
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            </Animated.View>

            <Text style={styles.callerName} numberOfLines={1}>
              {call.callerName || 'Mingo User'}
            </Text>

            <Text style={styles.callTypeSubtitle}>
              {isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'}
            </Text>
          </View>

          {/* Bottom Action Rows: Two separate swipe button rows stacked vertically */}
          <View style={styles.bottomSwipeRowsContainer}>
            {/* Row 1: Swipe Right to Answer (Left to Right) */}
            <SwipeButton
              label="Swipe right to answer"
              icon={isVideo ? 'videocam' : 'call'}
              direction="right"
              color="#10B981"
              onSwipe={() => onAccept(call)}
            />

            {/* Row 2: Swipe Left to Decline (Right to Left) */}
            <SwipeButton
              label="Swipe left to decline"
              icon="call-outline"
              iconRotate="135deg"
              direction="left"
              color="#EF4444"
              onSwipe={() => onReject(call)}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const IncomingCallPopup = ({ calls = [], onAccept, onReject, visible }) => {
  const [dismissedCallIds, setDismissedCallIds] = useState([]);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const parentCalls = Array.isArray(calls) ? calls : [];
    setDismissedCallIds((prev) =>
      prev.filter((id) =>
        parentCalls.some((c) => String(c.callId || c.sessionId || c.id || c._id || '') === id)
      )
    );
  }, [calls]);

  const activeCalls = (Array.isArray(calls) ? calls : []).filter((call) => {
    const cid = String(call?.callId || call?.sessionId || call?.id || call?._id || '');
    if (!cid) return false;
    return !dismissedCallIds.includes(cid);
  });

  useEffect(() => {
    if (activeCalls.length > 0 && appActive) {
      const topCall = activeCalls[0];
      const customSoundUrl = topCall?.customRingtoneUrl || topCall?.ringtoneUrl;
      playIncomingCallSound(customSoundUrl);
      Vibration.vibrate([1000, 1000], true);
    } else {
      stopIncomingCallSound();
      Vibration.cancel();
    }
    return () => {
      stopIncomingCallSound();
      Vibration.cancel();
    };
  }, [activeCalls.length, appActive]);

  if (activeCalls.length === 0) return null;

  const currentCall = activeCalls[0];

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <DedicatedCallPage
        call={currentCall}
        onAccept={() => onAccept(currentCall)}
        onReject={() => onReject(currentCall)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#09090E',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: wp(6),
  },
  headerRow: {
    marginTop: hp(4),
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: wp(40),
    height: hp(6),
    marginLeft: -wp(4),
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: hp(2),
  },
  avatarOuterRing: {
    width: wp(36),
    height: wp(36),
    borderRadius: wp(18),
    borderWidth: 3,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1B2E',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarImage: {
    width: wp(33),
    height: wp(33),
    borderRadius: wp(16.5),
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: ms(24, 0.3),
    fontFamily: 'Inter_700Bold',
    marginTop: hp(3),
    textAlign: 'center',
    paddingHorizontal: wp(5),
  },
  callTypeSubtitle: {
    color: '#C084FC',
    fontSize: ms(16, 0.3),
    fontFamily: 'Inter_500Medium',
    marginTop: hp(1),
    textAlign: 'center',
  },
  bottomSwipeRowsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: hp(5),
    paddingHorizontal: wp(2),
    gap: hp(2),
  },
  swipeTrack: {
    width: wp(86),
    height: hp(7.5),
    borderRadius: hp(3.75),
    borderWidth: 1.5,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  swipeFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: hp(3.75),
  },
  swipeTextContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: wp(16),
    paddingRight: wp(6),
    gap: s(8),
  },
  swipeLabel: {
    color: '#E5E7EB',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_500Medium',
  },
  swipeKnob: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  knobInnerTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IncomingCallPopup;
