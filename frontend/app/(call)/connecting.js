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
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../../utils/socket';
import { callAPI, listenersAPI, walletAPI } from '../../utils/api';
import { playRingtone, stopRingtone, setAudioOutputMode } from '../../utils/callSounds';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';
import InsufficientBalancePopup from '../../components/shared/InsufficientBalancePopup';
import EndCallPopup from '../../components/call/EndCallPopup';

const { width: SW, height: SH } = Dimensions.get('window');

export default function ConnectingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  // Disable hardware back button & swipe back gesture on dialing screen
  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: false });
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation]);

  const { 
    name,
    callId: initialCallId,
    roomId: initialRoomId,
    listenerId,
    avatarIndex,
    gender,
    zegoAppId,
    zegoAppSign,
    agoraAppId,
    agoraToken,
    callType = 'audio',
    isRandom,
    matched,
    partnerRole
  } = useLocalSearchParams();

  const [realCallId, setRealCallId] = React.useState(initialCallId);
  const [realRoomId, setRealRoomId] = React.useState(initialRoomId);

  const [errorModal, setErrorModal] = React.useState({
    visible: false,
    title: '',
    message: '',
  });

  // Recharge gate — shown when the user tries to start a call without enough coins
  const [showRechargeGate, setShowRechargeGate] = React.useState(false);
  const [rechargeCallType, setRechargeCallType] = React.useState('audio');
  const [rechargeBalance, setRechargeBalance] = React.useState(0);

  const handleErrorModalClose = () => {
    setErrorModal(prev => ({ ...prev, visible: false }));
    router.back();
  };

  const realCallIdRef = useRef(initialCallId);
  const realRoomIdRef = useRef(initialRoomId);

  // Zego credentials (audio calls) & Agora credentials (video calls) resolved from the backend session
  const zegoAppIdRef = useRef(zegoAppId);
  const zegoAppSignRef = useRef(zegoAppSign);
  const agoraAppIdRef = useRef(agoraAppId);
  const agoraTokenRef = useRef(agoraToken);
  
  useEffect(() => {
    realCallIdRef.current = realCallId;
  }, [realCallId]);

  useEffect(() => {
    realRoomIdRef.current = realRoomId;
  }, [realRoomId]);

  const [partnerName, setPartnerName] = React.useState(name || '');
  const [partnerListenerId, setPartnerListenerId] = React.useState(listenerId || '');
  const [partnerAvatarIndex, setPartnerAvatarIndex] = React.useState(avatarIndex || '0');
  const [partnerGender, setPartnerGender] = React.useState(gender || 'Female');

  const partnerNameRef = useRef(name || '');
  const partnerListenerIdRef = useRef(listenerId || '');
  const partnerAvatarIndexRef = useRef(avatarIndex || '0');
  const partnerGenderRef = useRef(gender || 'Female');

  // Quick Action Toggles (Speaker, Mic, Camera) & Confirmation Popup
  const [isSpeaker, setIsSpeaker] = React.useState(callType === 'video');
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCameraOff, setIsCameraOff] = React.useState(false);
  const [showEndCallPopup, setShowEndCallPopup] = React.useState(false);

  const isSpeakerRef = useRef(callType === 'video');
  const isMutedRef = useRef(false);
  const isCameraOffRef = useRef(false);

  useEffect(() => { partnerNameRef.current = partnerName; }, [partnerName]);
  useEffect(() => { partnerListenerIdRef.current = partnerListenerId; }, [partnerListenerId]);
  useEffect(() => { partnerAvatarIndexRef.current = partnerAvatarIndex; }, [partnerAvatarIndex]);
  useEffect(() => { partnerGenderRef.current = partnerGender; }, [partnerGender]);

  useEffect(() => { isSpeakerRef.current = isSpeaker; }, [isSpeaker]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isCameraOffRef.current = isCameraOff; }, [isCameraOff]);

  const toggleSpeaker = () => {
    const nextState = !isSpeaker;
    setIsSpeaker(nextState);
    setAudioOutputMode(nextState);
  };

  const toggleMic = () => {
    setIsMuted(prev => !prev);
  };

  const toggleCamera = () => {
    setIsCameraOff(prev => !prev);
  };

  // Sync state with parameters as they load/resolve from Expo Router search params
  useEffect(() => {
    if (isRandom !== 'true') {
      if (name) {
        setPartnerName(name);
        partnerNameRef.current = name;
      }
      if (listenerId) {
        setPartnerListenerId(listenerId);
        partnerListenerIdRef.current = listenerId;
      }
      if (avatarIndex !== undefined && avatarIndex !== null) {
        setPartnerAvatarIndex(avatarIndex);
        partnerAvatarIndexRef.current = avatarIndex;
      }
      if (gender) {
        setPartnerGender(gender);
        partnerGenderRef.current = gender;
      }
    }
  }, [name, listenerId, avatarIndex, gender, isRandom]);

  useEffect(() => {
    const cid = realCallId || initialCallId;
    const rid = realRoomId || initialRoomId;
    if (cid || rid) {
      socketService.triggerLocalEvent('register_active_call_id', { callId: cid, roomId: rid });
    }
  }, [realCallId, initialCallId, realRoomId, initialRoomId]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const callTimeoutRef = useRef(null);
  
  const [listenerInterests, setListenerInterests] = React.useState([]);

  useEffect(() => {
    const fetchDirectInterests = async () => {
      const targetId = partnerListenerId || listenerId;
      if (!targetId || isRandom === 'true') return;
      try {
        const res = await listenersAPI.getPublicProfile(targetId);
        if (res?.data) {
          const profileData = res.data;
          const pub = profileData.publicProfile || {};
          
          if (profileData.displayName || profileData.name) {
            const resolvedName = profileData.displayName || profileData.name;
            setPartnerName(resolvedName);
            partnerNameRef.current = resolvedName;
          }
          if (profileData.avatarIndex !== undefined && profileData.avatarIndex !== null) {
            setPartnerAvatarIndex(profileData.avatarIndex.toString());
            partnerAvatarIndexRef.current = profileData.avatarIndex.toString();
          }
          if (profileData.gender) {
            setPartnerGender(profileData.gender);
            partnerGenderRef.current = profileData.gender;
          }
          if (pub.expertiseTags) {
            setListenerInterests(pub.expertiseTags);
          }
        }
      } catch (err) {
        console.log('Error fetching listener interests:', err);
      }
    };
    fetchDirectInterests();
  }, [partnerListenerId, listenerId]);

  // Fetch the user's real balance and open the recharge gate
  const showRechargeGateFor = async (type) => {
    setRechargeCallType(type);
    setShowRechargeGate(true);
    try {
      const balRes = await walletAPI.getBalance();
      setRechargeBalance(balRes?.data?.coins ?? 0);
    } catch (e) {
      console.log('Balance fetch failed in recharge gate:', e);
    }
  };

  // Missed-call screen (the listener never answered) — carries the listener's
  // details so the user can call again immediately.
  const goToMissedCall = (callerName, listenerIdValue, avatarIdx, callerGender) => {
    router.replace({
      pathname: '/(call)/missed-call',
      params: {
        name: callerName,
        listenerId: listenerIdValue,
        callType,
        avatarIndex: avatarIdx,
        gender: callerGender,
      },
    });
  };

  const isCancelledRef = useRef(false);

  const handleCancel = useCallback(() => {
    isCancelledRef.current = true;
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    stopRingtone();
    const targetUserId = partnerListenerIdRef.current || listenerId;
    const currentSessionId = realCallIdRef.current || initialCallId;
    console.log('[Connecting] Cancelling call for listener:', targetUserId, 'Session:', currentSessionId);
    socketService.emit('call_cancelled', { 
      userId: targetUserId, 
      sessionId: currentSessionId 
    });
    if (currentSessionId) {
      callAPI.endCall(currentSessionId).catch(err => {
        console.log('[Connecting] REST callAPI.endCall on cancel error:', err.message);
      });
    }
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

    // Play the caller ringback while we wait for the listener
    playRingtone();

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
          stopRingtone();
          const targetScreen = callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
          const zegoAppIdVal = data.zegoAppId || zegoAppIdRef.current;
          const zegoAppSignVal = data.zegoAppSign || zegoAppSignRef.current;
          const agoraAppIdVal = data.agoraAppId || agoraAppIdRef.current;
          const agoraTokenVal = data.agoraToken || agoraTokenRef.current;
          router.replace({ 
            pathname: targetScreen, 
            params: { 
              name: partnerNameRef.current, 
              callId: data.sessionId || realCallIdRef.current || initialCallId, 
              roomId: data.roomId || realRoomIdRef.current || initialRoomId, 
              listenerId: partnerListenerIdRef.current, 
              avatarIndex: partnerAvatarIndexRef.current, 
              gender: partnerGenderRef.current, 
              ...(zegoAppIdVal ? { zegoAppId: String(zegoAppIdVal) } : {}),
              ...(zegoAppSignVal ? { zegoAppSign: String(zegoAppSignVal) } : {}),
              ...(agoraAppIdVal ? { agoraAppId: String(agoraAppIdVal) } : {}),
              ...(agoraTokenVal ? { agoraToken: String(agoraTokenVal) } : {}),
              callType,
              isSpeaker: isSpeakerRef.current ? 'true' : 'false',
              isMuted: isMutedRef.current ? 'true' : 'false',
              isCameraOff: isCameraOffRef.current ? 'true' : 'false',
            } 
          });
        });

        // Listen for rejection or end/cancelled events
        const handleCallTerminated = (data) => {
          console.log('[Connecting] Call rejected/ended/cancelled by listener/server:', data?.reason);
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          stopRingtone();
          router.replace({
            pathname: '/(call)/user-busy',
            params: { name: partnerNameRef.current, reason: data?.reason || 'rejected' },
          });
        };

        socketService.on('call_rejected', handleCallTerminated);
        socketService.on('call_ended', handleCallTerminated);
        socketService.on('call_cancelled', handleCallTerminated);

        // Listen for validation failure — the backend could not relay the
        // acceptance to us (session cancelled, caller offline, etc.)
        socketService.on('call_validation_failed', (data) => {
          console.log('Call validation failed:', data.reason);
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          stopRingtone();
          setErrorModal({
            visible: true,
            title: 'Call Unavailable',
            message: data.message || 'This call is no longer available. Please try again.',
          });
        });

        if (isRandom === 'true') {
          // RANDOM CALL FLOW

          const handleRandomMatch = async (data) => {
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

              // Use the backend's session-scoped Zego credentials so both
              // participants always join the same Zego app.
              if (sessionRes.data?.zegoAppId) zegoAppIdRef.current = sessionRes.data.zegoAppId;
              if (sessionRes.data?.zegoAppSign) zegoAppSignRef.current = sessionRes.data.zegoAppSign;
              if (sessionRes.data?.agoraAppId) agoraAppIdRef.current = sessionRes.data.agoraAppId;
              if (sessionRes.data?.agoraToken) agoraTokenRef.current = sessionRes.data.agoraToken;

              setRealCallId(finalSessionId);
              setRealRoomId(finalRoomId);

              // Update local state to show partner avatar/name and save refs
              setPartnerName(data.partnerName);
              setPartnerListenerId(targetListenerId);
              setPartnerAvatarIndex(data.partnerAvatar);
              setPartnerGender(data.partnerGender);

              // Fetch matched listener interests
              listenersAPI.getPublicProfile(targetListenerId).then(res => {
                if (res?.data?.publicProfile?.expertiseTags) {
                  setListenerInterests(res.data.publicProfile.expertiseTags);
                }
              }).catch(err => console.log('Error fetching matched listener interests:', err));

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
                  role: data.role,
                  ...(sessionRes.data?.zegoAppId ? { zegoAppId: sessionRes.data.zegoAppId } : {}),
                  ...(sessionRes.data?.zegoAppSign ? { zegoAppSign: sessionRes.data.zegoAppSign } : {}),
                  ...(sessionRes.data?.agoraAppId ? { agoraAppId: sessionRes.data.agoraAppId } : {}),
                  ...(sessionRes.data?.agoraToken ? { agoraToken: sessionRes.data.agoraToken } : {}),
                }
              });

              // Start a fresh 30s ringing timeout for the matched listener
              callTimeoutRef.current = setTimeout(() => {
                socketService.off('call_accepted');
                socketService.off('call_rejected');
                socketService.off('call_validation_failed');
                stopRingtone();
                socketService.emit('call_cancelled', { 
                  userId: targetListenerId, 
                  sessionId: finalSessionId,
                  reason: 'timeout',
                });
                router.replace({
                  pathname: '/(call)/user-busy',
                  params: { name: data.partnerName, reason: 'no_answer' },
                });
              }, 30000);

            } catch (err) {
              console.error('Error starting random call session:', err);
              stopRingtone();
              if (err.status === 402 || (err.message && err.message.toLowerCase().includes('insufficient'))) {
                showRechargeGateFor(callType);
              } else {
                setErrorModal({
                  visible: true,
                  title: 'Failed to Connect',
                  message: err.message || 'Failed to start call session',
                });
              }
            }
          };

          if (matched === 'true') {
            // Partner was already matched on the finding screen — continue directly
            handleRandomMatch({
              partnerId: listenerId,
              partnerName: name,
              partnerAvatar: avatarIndex ?? '0',
              partnerGender: gender || 'Female',
              role: partnerRole || 'LISTENER',
            });
          } else {
            socketService.on('random_match_found', handleRandomMatch);

            socketService.on('searching_random', (data) => {
              console.log(data.message);
            });

            socketService.on('random_search_timeout', () => {
              if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current);
                callTimeoutRef.current = null;
              }
              stopRingtone();
              setErrorModal({
                visible: true,
                title: 'Search Timeout',
                message: 'No online partner found. Please try again later.',
              });
            });

            socketService.emit('request_random_call', { role: userRole });
          }
        } else {
          // DIRECT CALL FLOW
          try {
            const sessionRes = await callAPI.startCall(listenerId, callType);
            const finalSessionId = sessionRes.data.sessionId;
            const finalRoomId = sessionRes.data.roomId;
            const finalListenerId = sessionRes.data.listenerId;

            // Synchronously store in refs so instant clicks on Cancel Call find the IDs
            realCallIdRef.current = finalSessionId;
            realRoomIdRef.current = finalRoomId;
            if (finalListenerId) {
              partnerListenerIdRef.current = finalListenerId;
              setPartnerListenerId(finalListenerId);
            }

            if (sessionRes.data?.zegoAppId) zegoAppIdRef.current = sessionRes.data.zegoAppId;
            if (sessionRes.data?.zegoAppSign) zegoAppSignRef.current = sessionRes.data.zegoAppSign;
            if (sessionRes.data?.agoraAppId) agoraAppIdRef.current = sessionRes.data.agoraAppId;
            if (sessionRes.data?.agoraToken) agoraTokenRef.current = sessionRes.data.agoraToken;
            
            setRealCallId(finalSessionId);
            setRealRoomId(finalRoomId);

            if (isCancelledRef.current) {
              console.log('[Connecting] User cancelled call while startCall was in-flight');
              socketService.emit('call_cancelled', {
                userId: finalListenerId || listenerId,
                sessionId: finalSessionId,
              });
              callAPI.endCall(finalSessionId).catch(() => {});
              return;
            }

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
                ...(sessionRes.data?.zegoAppId ? { zegoAppId: sessionRes.data.zegoAppId } : {}),
                ...(sessionRes.data?.zegoAppSign ? { zegoAppSign: sessionRes.data.zegoAppSign } : {}),
                ...(sessionRes.data?.agoraAppId ? { agoraAppId: sessionRes.data.agoraAppId } : {}),
                ...(sessionRes.data?.agoraToken ? { agoraToken: sessionRes.data.agoraToken } : {}),
              }
            });
          } catch (err) {
            console.error('Error starting call session:', err);
            stopRingtone();
            if (err.status === 402 || (err.message && err.message.toLowerCase().includes('insufficient'))) {
              // Recharge gate: the call must not proceed without enough coins
              showRechargeGateFor(callType);
            } else {
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
        }

        // Timeout if no response after 30 seconds
        if (isRandom !== 'true') {
          callTimeoutRef.current = setTimeout(() => {
            socketService.off('call_accepted');
            socketService.off('call_rejected');
            socketService.off('call_validation_failed');
            stopRingtone();
            socketService.emit('call_cancelled', { 
              userId: listenerId, 
              sessionId: realCallIdRef.current || initialCallId,
              reason: 'timeout',
            });
            router.replace({
              pathname: '/(call)/user-busy',
              params: { name: name || 'User', reason: 'no_answer' },
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
      stopRingtone();
      socketService.off('call_accepted');
      socketService.off('call_rejected');
      socketService.off('call_ended');
      socketService.off('call_cancelled');
      socketService.off('call_validation_failed');
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
            source={{ uri: getAvatarUrl(partnerGender, partnerAvatarIndex) }}
            style={styles.avatar}
          />
        </Animated.View>
        <Text style={styles.callerName}>{partnerName || (isRandom === 'true' ? 'Random User' : 'Connecting...')}</Text>
        <Text style={styles.connectingText}>Connecting...</Text>
        <View style={styles.costBadge}>
          <Text style={styles.diamondEmoji}>💎</Text>
          <Text style={styles.costText}>
            {callType === 'video' ? '4 Diamonds/min' : '1 Diamond/min'}
          </Text>
        </View>
      </View>

      <View style={styles.interestsSection}>
        {/* Only the listener's real interests — no loading placeholders and no
            mock chips. If they've selected nothing, this stays empty (the
            section simply acts as vertical spacing). */}
        {listenerInterests.length > 0 && (
          <View style={styles.chipsWrap}>
            {listenerInterests.map((interest, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{interest}</Text>
                <Ionicons name="sparkles" size={14} color="#A855F7" />
              </View>
            ))}
          </View>
        )}
      </View>



      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + vs(16), vs(32)) }]}>
        <Text style={styles.safetyText}>
          Keep the conversation safe & respectful.
        </Text>
        <View style={styles.controlsRow}>
          {/* Speaker Button */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
              activeOpacity={0.8}
              onPress={toggleSpeaker}
            >
              <Ionicons
                name={isSpeaker ? "volume-high" : "volume-medium-outline"}
                size={ms(24)}
                color={isSpeaker ? "#000" : "#FFF"}
              />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>Speaker</Text>
          </View>

          {/* Mic Button */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              activeOpacity={0.8}
              onPress={toggleMic}
            >
              <Ionicons
                name={isMuted ? "mic-off" : "mic"}
                size={ms(24)}
                color={isMuted ? "#000" : "#FFF"}
              />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>{isMuted ? "Muted" : "Mic"}</Text>
          </View>

          {/* Camera Button (Video Call Only) */}
          {callType === 'video' && (
            <View style={styles.actionItem}>
              <TouchableOpacity
                style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                activeOpacity={0.8}
                onPress={toggleCamera}
              >
                <Ionicons
                  name={isCameraOff ? "videocam-off" : "videocam"}
                  size={ms(24)}
                  color={isCameraOff ? "#000" : "#FFF"}
                />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{isCameraOff ? "Cam Off" : "Camera"}</Text>
            </View>
          )}

          {/* End Call Button */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.endCallBtn}
              activeOpacity={0.8}
              onPress={() => setShowEndCallPopup(true)}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.endCallCircle}
              >
                <Ionicons
                  name="call"
                  size={ms(24)}
                  color="#FFF"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.endCallLabel}>End Call</Text>
          </View>
        </View>
      </View>

      <EndCallPopup
        visible={showEndCallPopup}
        onEndCall={() => {
          setShowEndCallPopup(false);
          handleCancel();
        }}
        onDismiss={() => setShowEndCallPopup(false)}
      />

      {/* Recharge gate — the call cannot proceed without enough coins */}
      <InsufficientBalancePopup
        visible={showRechargeGate}
        balance={rechargeBalance}
        title={rechargeCallType === 'video' ? 'Video calls need coins' : 'Audio calls need coins'}
        subtitle={`You need at least ${rechargeCallType === 'video' ? 40 : 10} coins to start this ${rechargeCallType} call. Please recharge to continue.`}
        buttonLabel="Recharge Now"
        onBuyCoins={() => {
          setShowRechargeGate(false);
          router.replace('/balance');
        }}
        onClose={() => {
          setShowRechargeGate(false);
          router.back();
        }}
      />

      {/* Custom Error/Offline Alert Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleErrorModalClose}
      >
        <View style={styles.errorOverlay}>
          <LinearGradient
            colors={['#1A0505', '#0A0000']}
            style={styles.errorModalBox}
          >
            <View style={styles.errorIconContainer}>
              <Ionicons
                name="close-circle"
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
                colors={['#EF4444', '#B91C1C']}
                style={styles.errorBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.errorBtnText}>Okay</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
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
    paddingHorizontal: s(20),
  },
  safetyText: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginBottom: vs(20),
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtn: {
    width: s(58),
    height: s(58),
    borderRadius: s(29),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  controlLabel: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
    marginTop: vs(8),
    textAlign: 'center',
  },
  endCallBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallCircle: {
    width: s(58),
    height: s(58),
    borderRadius: s(29),
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallLabel: {
    fontSize: ms(12, 0.3),
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
    marginTop: vs(8),
    textAlign: 'center',
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
    borderRadius: SW * 0.06,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: SW * 0.06,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
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
  audioOutputContainer: {
    paddingHorizontal: s(24),
    marginBottom: vs(20),
    alignItems: 'center',
    width: '100%',
  },
  audioCardsRow: {
    flexDirection: 'row',
    gap: s(12),
    width: '100%',
    justifyContent: 'center',
  },
  audioCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(12),
    paddingHorizontal: s(10),
    borderRadius: s(16),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  audioCardActive: {
    backgroundColor: '#2D0D1E',
    borderColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  activeCheckBadge: {
    position: 'absolute',
    top: vs(6),
    right: s(8),
  },
  audioIconCircle: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(6),
  },
  audioIconCircleActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
  },
  audioCardTextWrap: {
    alignItems: 'center',
  },
  audioCardTitle: {
    fontSize: ms(13, 0.3),
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
    marginBottom: vs(2),
  },
  audioCardTitleActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  audioCardSubtitle: {
    fontSize: ms(9.5, 0.3),
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});
