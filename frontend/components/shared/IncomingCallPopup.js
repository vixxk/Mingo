import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, hp, wp } from '../../utils/responsive';

const AVATAR_SIZE = Math.min(wp(12.8), 52);
const AVATAR_RING_SIZE = AVATAR_SIZE + 6;
const ACTION_BTN_SIZE = Math.min(wp(11.5), 46);

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

const IncomingCallCard = ({ call, onAccept, onReject, onDismiss, isStacked, style }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detect vertical drag upwards
        return Math.abs(gestureState.dx) < Math.abs(gestureState.dy) && gestureState.dy < -5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -60) {
          // Swipe up threshold met -> slide away completely
          Animated.timing(panY, {
            toValue: -300,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onDismiss) onDismiss();
          });
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const animatedStyle = [
    styles.card,
    style,
    {
      transform: [
        ...(style?.transform || []),
        { translateY: !isStacked ? Animated.add(slideAnim, panY) : panY }
      ]
    }
  ];

  return (
    <Animated.View style={animatedStyle} {...panResponder.panHandlers}>
      <LinearGradient
        colors={['#1F1F1F', '#141414']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.left}>
            <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
              <Image
                source={getAvatarImage(call.gender, call.avatarIndex)}
                style={styles.avatar}
              />
            </Animated.View>
            <View style={styles.info}>
              <Text style={styles.callType}>
                Incoming {call.callType === 'video' ? 'Video' : 'Audio'} Call
              </Text>
              <Text style={styles.name}>{call.callerName}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={onReject}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Ionicons name={call.callType === 'video' ? "videocam" : "call"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const IncomingCallPopup = ({ calls = [], onAccept, onReject, visible }) => {
  const [dismissedCallIds, setDismissedCallIds] = useState([]);

  // Keep local dismissed set in sync with actual active calls
  useEffect(() => {
    const parentCalls = Array.isArray(calls) ? calls : [];
    setDismissedCallIds(prev => prev.filter(id => parentCalls.some(c => c.callId === id)));
  }, [calls]);

  const handleDismissCall = (callId) => {
    setDismissedCallIds(prev => [...prev, callId]);
  };

  const activeCalls = (Array.isArray(calls) ? calls : []).filter(
    (call) => !dismissedCallIds.includes(call.callId)
  );
  
  if (activeCalls.length === 0) return null;

  const isOverflow = activeCalls.length > 3;

  if (isOverflow) {
    // Stacked deck layout: top 3 calls shown stacked
    return (
      <View style={styles.stackOuterContainer}>
        {activeCalls.slice(0, 3).reverse().map((call, reverseIdx, arr) => {
          // Compute original index in slice (0 is top/front, 2 is back)
          const originalIdx = arr.length - 1 - reverseIdx;
          
          const offsetTop = originalIdx * hp(1.5);
          const scale = 1 - originalIdx * 0.04;
          const opacity = 1 - originalIdx * 0.15;
          const zIndex = 100 - originalIdx;
          const isBehind = originalIdx > 0;

          return (
            <View 
              key={call.callId} 
              pointerEvents={isBehind ? "none" : "auto"}
              style={{
                position: 'absolute',
                top: offsetTop,
                left: 0,
                right: 0,
                zIndex,
                elevation: zIndex,
              }}
            >
              <IncomingCallCard
                call={call}
                onAccept={() => onAccept(call)}
                onReject={() => onReject(call)}
                onDismiss={() => handleDismissCall(call.callId)}
                isStacked={true}
                style={{
                  transform: [{ scale }],
                  opacity,
                }}
              />
            </View>
          );
        })}
      </View>
    );
  }

  // Normal column layout
  return (
    <View style={styles.columnOuterContainer}>
      {activeCalls.map((call) => (
        <IncomingCallCard
          key={call.callId}
          call={call}
          onAccept={() => onAccept(call)}
          onReject={() => onReject(call)}
          onDismiss={() => handleDismissCall(call.callId)}
          isStacked={false}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  columnOuterContainer: {
    position: 'absolute',
    top: hp(7.5),
    width: wp(92),
    alignSelf: 'center',
    gap: hp(1.2),
    zIndex: 99999,
  },
  stackOuterContainer: {
    position: 'absolute',
    top: hp(7.5),
    width: wp(92),
    alignSelf: 'center',
    height: hp(15),
    zIndex: 99999,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)', // Premium purple glass border
  },
  gradient: {
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarRing: {
    width: AVATAR_RING_SIZE,
    height: AVATAR_RING_SIZE,
    borderRadius: AVATAR_RING_SIZE / 2,
    borderWidth: 2,
    borderColor: '#A855F7', // brand theme purple
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  info: {
    marginLeft: wp(3.5),
    flex: 1,
  },
  callType: {
    color: '#C084FC', // brand theme secondary accent
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  name: {
    color: '#fff',
    fontSize: ms(16, 0.3),
    fontFamily: 'Inter_700Bold',
  },
  actions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  actionBtn: {
    width: ACTION_BTN_SIZE,
    height: ACTION_BTN_SIZE,
    borderRadius: ACTION_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  acceptBtn: {
    backgroundColor: '#22C55E',
  },
});

export default IncomingCallPopup;
