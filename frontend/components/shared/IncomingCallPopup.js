import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

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

const IncomingCallCard = ({ call, onAccept, onReject, isStacked, style }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    !isStacked && { transform: [{ translateY: slideAnim }] }
  ];

  return (
    <Animated.View style={animatedStyle}>
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
  // Backwards compatibility for older single-call usage
  const activeCalls = Array.isArray(calls) ? calls : [];
  
  if (activeCalls.length === 0) return null;

  const isOverflow = activeCalls.length > 3;

  if (isOverflow) {
    // Stacked deck layout: top 3 calls shown stacked
    return (
      <View style={styles.stackOuterContainer}>
        {activeCalls.slice(0, 3).reverse().map((call, reverseIdx, arr) => {
          // Compute original index in slice (0 is top/front, 2 is back)
          const originalIdx = arr.length - 1 - reverseIdx;
          
          const offsetTop = originalIdx * vs(12);
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
          isStacked={false}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  columnOuterContainer: {
    position: 'absolute',
    top: vs(60),
    left: s(16),
    right: s(16),
    gap: vs(10),
    zIndex: 99999,
  },
  stackOuterContainer: {
    position: 'absolute',
    top: vs(60),
    left: s(16),
    right: s(16),
    height: vs(120),
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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gradient: {
    padding: s(16),
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
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    borderWidth: 2,
    borderColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
  },
  info: {
    marginLeft: s(12),
    flex: 1,
  },
  callType: {
    color: '#9CA3AF',
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
    gap: s(12),
  },
  actionBtn: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
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
