import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SafetyPopup from '../../components/call/SafetyPopup';
import { callAPI } from '../../utils/api';
import { ZEGO_APP_ID, ZEGO_APP_SIGN } from '../../utils/zegoConfig';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';

const { height: SH } = Dimensions.get('window');

let ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG;
try {
  const zegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn');
  ZegoUIKitPrebuiltCall = zegoModule.default || zegoModule.ZegoUIKitPrebuiltCall;
  ONE_ON_ONE_VIDEO_CALL_CONFIG =
    zegoModule.ONE_ON_ONE_VIDEO_CALL_CONFIG || zegoModule.ZegoMenuBarButtonName;
} catch (e) {
  console.log('ZegoCloud not available (Expo Go mode)');
}

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

export default function VideoCallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    name = 'Listener',
    callId = '',
    roomId = '',
    listenerId = '',
    avatarIndex = '0',
    gender = 'Female',
    zegoAppId,
    zegoAppSign,
  } = useLocalSearchParams();

  const [showSafety, setShowSafety] = useState(true);
  const [userID, setUserID] = useState('');
  const [userName, setUserName] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  const resolvedAppId = zegoAppId ? parseInt(zegoAppId) : ZEGO_APP_ID;
  const resolvedAppSign = zegoAppSign || ZEGO_APP_SIGN;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setUserID(user._id || user.id || `user_${Date.now()}`);
          setUserName(user.name || user.username || 'User');
        } else {
          setUserID(`user_${Date.now()}`);
          setUserName('User');
        }
      } catch {
        setUserID(`user_${Date.now()}`);
        setUserName('User');
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(intervalRef.current);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    clearInterval(intervalRef.current);
    try {
      if (callId && callId !== 'demo_zego_call' && callId !== 'test_call_id') {
        await callAPI.endCall(callId);
      }
    } catch (error) {
      console.log('Failed to end call on backend:', error);
    } finally {
      router.replace({
        pathname: '/(call)/call-feedback',
        params: { name, sessionId: callId },
      });
    }
  };

  if (ZegoUIKitPrebuiltCall && userID && roomId) {
    return (
      <View style={{ flex: 1 }}>
        <ZegoUIKitPrebuiltCall
          appID={resolvedAppId}
          appSign={resolvedAppSign}
          userID={userID}
          userName={userName}
          callID={roomId}
          config={{
            ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
            onCallEnd: handleEndCall,
            onHangUp: handleEndCall,
            durationConfig: { isDurationVisible: true },
            turnOnCameraWhenJoining: true,
            turnOnMicrophoneWhenJoining: true,
          }}
        />
        {showSafety && (
          <SafetyPopup
            visible={showSafety}
            onDismiss={() => setShowSafety(false)}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0A', '#0F0520', '#1A0A30']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {}
      <View style={[styles.topBar, { paddingTop: insets.top + vs(8) }]}>
        <View style={styles.durationBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.durationBadgeText}>{formatDuration(callDuration)}</Text>
        </View>
        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setIsFrontCamera(!isFrontCamera)}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {}
      <View style={styles.videoArea}>
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Image
            source={getAvatarImage(gender, avatarIndex)}
            style={styles.mainAvatar}
          />
        </Animated.View>
        <Text style={styles.callerName}>{name}</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Video Call in Progress</Text>
        </View>
      </View>

      {}
      <View style={styles.selfPreview}>
        <View style={styles.selfCamera}>
          <Ionicons
            name={isCameraOff ? 'videocam-off' : 'person'}
            size={32}
            color="#6B7280"
          />
        </View>
      </View>

      {}
      <View
        style={[
          styles.controlsSection,
          { paddingBottom: Math.max(insets.bottom + vs(16), vs(32)) },
        ]}
      >
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={24}
            color={isMuted ? '#EF4444' : '#fff'}
          />
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
          onPress={() => setIsCameraOff(!isCameraOff)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCameraOff ? 'videocam-off' : 'videocam'}
            size={24}
            color={isCameraOff ? '#EF4444' : '#fff'}
          />
          <Text style={styles.controlLabel}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallBtn}
          onPress={handleEndCall}
          activeOpacity={0.8}
        >
          <Ionicons
            name="call"
            size={28}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setIsFrontCamera(!isFrontCamera)}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-reverse" size={24} color="#fff" />
          <Text style={styles.controlLabel}>Flip</Text>
        </TouchableOpacity>
      </View>

      {showSafety && (
        <SafetyPopup
          visible={showSafety}
          onDismiss={() => setShowSafety(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(16),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: s(14),
    paddingVertical: vs(6),
    borderRadius: 20,
    gap: s(6),
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  durationBadgeText: {
    color: '#fff',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },
  flipBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    borderWidth: 3,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 12,
  },
  mainAvatar: {
    width: SCREEN_WIDTH * 0.36,
    height: SCREEN_WIDTH * 0.36,
    borderRadius: SCREEN_WIDTH * 0.18,
  },
  callerName: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(6),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },

  selfPreview: {
    position: 'absolute',
    top: SH * 0.12,
    right: s(16),
    zIndex: 10,
  },
  selfCamera: {
    width: SCREEN_WIDTH * 0.22,
    height: SCREEN_WIDTH * 0.3,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SCREEN_WIDTH * 0.05,
    paddingVertical: SH * 0.03,
    paddingHorizontal: s(16),
  },
  controlBtn: {
    width: SCREEN_WIDTH * 0.14,
    height: SCREEN_WIDTH * 0.14,
    borderRadius: SCREEN_WIDTH * 0.07,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  controlLabel: {
    fontSize: ms(8, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  endCallBtn: {
    width: SCREEN_WIDTH * 0.16,
    height: SCREEN_WIDTH * 0.16,
    borderRadius: SCREEN_WIDTH * 0.08,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
