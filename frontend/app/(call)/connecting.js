import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../../utils/socket';
import { callAPI } from '../../utils/api';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

const { width: SW, height: SH } = Dimensions.get('window');

const INTERESTS = [
  { label: 'Career', icon: 'briefcase-outline' },
  { label: 'Emotional & Supportive Talk', icon: 'heart-outline' },
  { label: 'Childhood and Memories', icon: 'heart-outline' },
  { label: 'Films and Music', icon: 'musical-notes-outline' },
  { label: 'Growth & Ideas', icon: 'bulb-outline' },
  { label: 'Family & Relationships', icon: 'heart-outline' },
];

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

export default function ConnectingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { 
    name = 'Priya Sharma',
    callId: initialCallId,
    roomId: initialRoomId,
    listenerId,
    avatarIndex,
    gender,
    zegoAppId,
    zegoAppSign,
    callType = 'audio',
    isRandom
  } = useLocalSearchParams();

  const [realCallId, setRealCallId] = React.useState(initialCallId);
  const [realRoomId, setRealRoomId] = React.useState(initialRoomId);

  const [errorModal, setErrorModal] = React.useState({
    visible: false,
    title: '',
    message: '',
  });

  const handleErrorModalClose = () => {
    setErrorModal(prev => ({ ...prev, visible: false }));
    router.back();
  };

  const realCallIdRef = useRef(initialCallId);
  const realRoomIdRef = useRef(initialRoomId);
  
  useEffect(() => {
    realCallIdRef.current = realCallId;
  }, [realCallId]);

  useEffect(() => {
    realRoomIdRef.current = realRoomId;
  }, [realRoomId]);

  const [partnerName, setPartnerName] = React.useState(name);
  const [partnerListenerId, setPartnerListenerId] = React.useState(listenerId);
  const [partnerAvatarIndex, setPartnerAvatarIndex] = React.useState(avatarIndex);
  const [partnerGender, setPartnerGender] = React.useState(gender);

  const partnerNameRef = useRef(name);
  const partnerListenerIdRef = useRef(listenerId);
  const partnerAvatarIndexRef = useRef(avatarIndex);
  const partnerGenderRef = useRef(gender);

  useEffect(() => { partnerNameRef.current = partnerName; }, [partnerName]);
  useEffect(() => { partnerListenerIdRef.current = partnerListenerId; }, [partnerListenerId]);
  useEffect(() => { partnerAvatarIndexRef.current = partnerAvatarIndex; }, [partnerAvatarIndex]);
  useEffect(() => { partnerGenderRef.current = partnerGender; }, [partnerGender]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const callTimeoutRef = useRef(null);

  const handleCancel = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    const targetUserId = partnerListenerIdRef.current || listenerId;
    socketService.emit('call_cancelled', { 
      userId: targetUserId, 
      sessionId: realCallIdRef.current || initialCallId 
    });
    socketService.emit('cancel_random_search');
    router.back();
  }, [listenerId, initialCallId]);

  useEffect(() => {
    // Start animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(dotsAnim, {
        toValue: 3,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    // Signal incoming call to listener via socket
    const signalCall = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const userGender = await AsyncStorage.getItem('userGender') || 'Female';
        const userAvatar = await AsyncStorage.getItem('userAvatarIndex') || '0';
        
        let callerName = 'User';
        let callerId = null;
        let userRole = 'USER';
        
        if (userStr) {
          const user = JSON.parse(userStr);
          callerName = user.name || user.username || 'Mingo User';
          callerId = user.id || user._id;
          userRole = user.role || 'USER';
        }

        await socketService.connect();
        
        // Listen for acceptance
        socketService.on('call_accepted', (data) => {
          console.log('Call accepted by listener!');
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          const targetScreen = callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
          router.replace({ 
            pathname: targetScreen, 
            params: { 
              name: partnerNameRef.current, 
              callId: data.sessionId || realCallIdRef.current || initialCallId, 
              roomId: data.roomId || realRoomIdRef.current || initialRoomId, 
              listenerId: partnerListenerIdRef.current, 
              avatarIndex: partnerAvatarIndexRef.current, 
              gender: partnerGenderRef.current, 
              zegoAppId, 
              zegoAppSign, 
              callType 
            } 
          });
        });

        // Listen for rejection
        socketService.on('call_rejected', (data) => {
          console.log('Call rejected by listener:', data.reason);
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          router.replace({
            pathname: '/(call)/user-busy',
            params: { name: partnerNameRef.current, reason: data.reason || 'rejected' },
          });
        });

        if (isRandom === 'true') {
          // RANDOM CALL FLOW
          
          socketService.on('random_match_found', async (data) => {
            console.log('Random match found:', data);
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
            }
            
            try {
              // Now that we have a partner, create a real session in DB
              const targetListenerId = data.role === 'LISTENER' ? data.partnerId : callerId;
              const sessionRes = await callAPI.startCall(targetListenerId, callType);
              
              const finalSessionId = sessionRes.data.sessionId;
              const finalRoomId = sessionRes.data.roomId;
              
              setRealCallId(finalSessionId);
              setRealRoomId(finalRoomId);

              // Update local state to show partner avatar/name and save refs
              setPartnerName(data.partnerName);
              setPartnerListenerId(targetListenerId);
              setPartnerAvatarIndex(data.partnerAvatar);
              setPartnerGender(data.partnerGender);

              // Found a partner, now signal them
              socketService.emit('call_incoming', {
                listenerId: targetListenerId,
                callData: {
                  callerId: data.role === 'USER' ? data.partnerId : callerId,
                  callerName: data.partnerName,
                  callType,
                  callId: finalSessionId,
                  roomId: finalRoomId,
                  avatarIndex: data.partnerAvatar,
                  gender: data.partnerGender,
                  role: data.role
                }
              });
              
              // Start a fresh 30s ringing timeout for the matched listener
              callTimeoutRef.current = setTimeout(() => {
                socketService.off('call_accepted');
                socketService.off('call_rejected');
                socketService.emit('call_cancelled', { 
                  userId: targetListenerId, 
                  sessionId: finalSessionId 
                });
                router.replace({
                  pathname: '/(call)/user-busy',
                  params: { name: data.partnerName, reason: 'timeout' },
                });
              }, 30000);

            } catch (err) {
              console.error('Error starting random call session:', err);
              setErrorModal({
                visible: true,
                title: 'Failed to Connect',
                message: err.message || 'Failed to start call session',
              });
            }
          });

          socketService.on('searching_random', (data) => {
            console.log(data.message);
          });

          socketService.on('random_search_timeout', () => {
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
            }
            setErrorModal({
              visible: true,
              title: 'Search Timeout',
              message: 'No online partner found. Please try again later.',
            });
          });

          socketService.emit('request_random_call', { role: userRole });
        } else {
          // DIRECT CALL FLOW
          try {
            // 1. Create real session in backend first
            const sessionRes = await callAPI.startCall(listenerId, callType);
            const finalSessionId = sessionRes.data.sessionId;
            const finalRoomId = sessionRes.data.roomId;
            
            setRealCallId(finalSessionId);
            setRealRoomId(finalRoomId);

            // 2. Signal the listener with the real IDs
            socketService.emit('call_incoming', {
              listenerId,
              callData: {
                callerId,
                callerName,
                callType,
                callId: finalSessionId,
                roomId: finalRoomId,
                avatarIndex: userAvatar,
                gender: userGender,
              }
            });
          } catch (err) {
            console.error('Error starting call session:', err);
            const isOffline = err.message === 'Listener is offline';
            if (isOffline) {
              socketService.triggerLocalEvent('listener_status_changed', {
                userId: listenerId,
                isOnline: false,
                isBusy: false,
              });
            }
            setErrorModal({
              visible: true,
              title: isOffline ? 'Listener Offline' : 'Failed to Connect',
              message: isOffline 
                ? `${partnerName} is currently offline. Please try again later.` 
                : (err.message || 'Failed to start call session'),
            });
          }
        }

        // Timeout if no response after 30 seconds
        if (isRandom !== 'true') {
          callTimeoutRef.current = setTimeout(() => {
            socketService.off('call_accepted');
            socketService.off('call_rejected');
            socketService.emit('call_cancelled', { 
              userId: listenerId, 
              sessionId: realCallIdRef.current || initialCallId 
            });
            router.replace({
              pathname: '/(call)/user-busy',
              params: { name, reason: 'timeout' },
            });
          }, 30000);
        }

      } catch (err) {
        console.error('Error signaling call:', err);
      }
    };

    signalCall();

    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      socketService.off('call_accepted');
      socketService.off('call_rejected');
      socketService.off('random_match_found');
      socketService.off('searching_random');
      socketService.off('random_search_timeout');
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#000', '#1A0000', '#4A0000']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topSection, { paddingTop: insets.top + vs(30) }]}>
        <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
          <Image
            source={getAvatarImage(partnerGender, partnerAvatarIndex)}
            style={styles.avatar}
          />
        </Animated.View>
        <Text style={styles.callerName}>{partnerName}</Text>
        <Text style={styles.connectingText}>Connecting...</Text>
        <View style={styles.costBadge}>
          <Text style={styles.diamondEmoji}>💎</Text>
          <Text style={styles.costText}>
            {callType === 'video' ? '4 Diamonds/min' : '1 Diamond/min'}
          </Text>
        </View>
      </View>

      <View style={styles.interestsSection}>
        <View style={styles.chipsWrap}>
          {INTERESTS.map((item, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{item.label}</Text>
              <Ionicons name={item.icon} size={14} color="#9CA3AF" />
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + vs(16), vs(32)) }]}>
        <Text style={styles.safetyText}>
          Keep the conversation safe & respectful.
        </Text>
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>Cancel Call</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Error/Offline Alert Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleErrorModalClose}
      >
        <View style={styles.errorOverlay}>
          <View style={styles.errorModalBox}>
            <View style={styles.errorIconContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={SW * 0.12}
                color="#EF4444"
              />
            </View>

            <Text style={styles.errorTitle}>{errorModal.title}</Text>
            <Text style={styles.errorMessage}>{errorModal.message}</Text>

            <TouchableOpacity
              style={styles.errorBtn}
              onPress={handleErrorModalClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#A855F7', '#EC4899']}
                style={styles.errorBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.errorBtnText}>Okay</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  topSection: {
    alignItems: 'center',
    marginBottom: vs(20),
  },
  avatarRing: {
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    borderWidth: 4,
    borderColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(14),
  },
  avatar: {
    width: s(108),
    height: s(108),
    borderRadius: s(54),
  },
  callerName: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(4),
  },
  connectingText: {
    fontSize: ms(15, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  interestsSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: s(16),
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(8),
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    gap: 6,
    backgroundColor: 'rgba(20,20,20,0.6)',
  },
  chipText: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  safetyText: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginBottom: vs(16),
    textAlign: 'center',
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#6B7280',
    borderRadius: 26,
    paddingHorizontal: s(36),
    paddingVertical: vs(12),
  },
  cancelText: {
    fontSize: ms(15, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_500Medium',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    marginTop: vs(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  diamondEmoji: {
    fontSize: ms(14, 0.3),
    marginRight: s(4),
  },
  costText: {
    fontSize: ms(13, 0.3),
    color: '#38BDF8',
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  errorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SW * 0.05,
  },
  errorModalBox: {
    width: SW * 0.85,
    backgroundColor: '#0D0D10',
    borderRadius: SW * 0.06,
    borderWidth: 1.5,
    borderColor: '#1F1F24',
    padding: SW * 0.06,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  errorIconContainer: {
    width: SW * 0.18,
    height: SW * 0.18,
    borderRadius: SW * 0.09,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SH * 0.02,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorTitle: {
    color: '#fff',
    fontSize: SW * 0.05,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: SH * 0.01,
  },
  errorMessage: {
    color: '#9CA3AF',
    fontSize: SW * 0.038,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: SW * 0.052,
    marginBottom: SH * 0.03,
  },
  errorBtn: {
    width: '100%',
    borderRadius: SW * 0.035,
    overflow: 'hidden',
  },
  errorBtnGradient: {
    paddingVertical: SH * 0.016,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBtnText: {
    color: '#fff',
    fontSize: SW * 0.038,
    fontFamily: 'Inter_700Bold',
  },
});
