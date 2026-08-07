import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, BackHandler, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import SafetyPopup from '../../components/call/SafetyPopup';
import InCallRechargePopup from '../../components/call/InCallRechargePopup';
import EndCallPopup from '../../components/call/EndCallPopup';
import CallControls from '../../components/call/CallControls';
import CallTimer from '../../components/call/CallTimer';
import CallCancelledPopup from '../../components/shared/CallCancelledPopup';
import GiftPopup from '../../components/shared/GiftPopup';
import GiftAnimationOverlay from '../../components/call/GiftAnimationOverlay';
import { callAPI, walletAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import { AGORA_APP_ID } from '../../utils/agoraConfig';
import { ms, s, vs, SCREEN_WIDTH, hp, wp } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';

// Expo Go cannot host the native Agora module, so the SDK is only loaded
// outside it. `executionEnvironment` is 'storeClient' ONLY in Expo Go — the
// old `appOwnership === 'expo'` check also matched development builds, which
// silently disabled the real call everywhere except standalone builds.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Agora RTC SDK — native module, only available on dev/native builds. Audio
// calls run on the same Agora engine as video calls now (Zego was removed).
let AgoraSDK = null;
try {
  if (!isExpoGo) {
    AgoraSDK = require('react-native-agora');
  } else {
    console.log('Skipping Agora SDK load in Expo Go mode');
  }
} catch (e) {
  console.log('Agora SDK not available (Expo Go mode):', e.message);
}

const {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  RemoteAudioState,
} = AgoraSDK || {};

/**
 * Owns the Agora engine for the duration of the audio call. Controls are
 * exposed imperatively via the ref so the screen can wire them to the UI
 * buttons. The engine is audio-only: no video module is enabled and neither
 * side publishes camera tracks.
 *
 * uid 0 is used when joining — the SDK assigns each participant a unique
 * uid — which is why the same backend token works for both sides.
 */
const AgoraAudioEngine = forwardRef(
  (
    {
      appId,
      token,
      channelName,
      onRemoteJoinedChange,
      onRemoteLeft,
      onFailedToConnect,
      onEngineError,
    },
    ref
  ) => {
    const engineRef = useRef(null);

    const onRemoteJoinedChangeRef = useRef(onRemoteJoinedChange);
    const onRemoteLeftRef = useRef(onRemoteLeft);
    const onFailedToConnectRef = useRef(onFailedToConnect);
    const onEngineErrorRef = useRef(onEngineError);

    useEffect(() => { onRemoteJoinedChangeRef.current = onRemoteJoinedChange; });
    useEffect(() => { onRemoteLeftRef.current = onRemoteLeft; });
    useEffect(() => { onFailedToConnectRef.current = onFailedToConnect; });
    useEffect(() => { onEngineErrorRef.current = onEngineError; });

    useEffect(() => {
      if (!appId || !token || !channelName) return;

      let engine = null;
      let active = true;
      // Tracks whether the local user successfully joined — connection failures
      // before this point mean the channel is unreachable (bad credentials,
      // blocked network) and the call cannot proceed.
      let joinedSuccessfully = false;

      const setup = () => {
        try {
          engine = createAgoraRtcEngine();
          engineRef.current = engine;

          engine.initialize({ appId });
          engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
          engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
          engine.enableAudio();

          engine.registerEventHandler({
            onJoinChannelSuccess: () => {
              if (!active) return;
              joinedSuccessfully = true;
              console.log('[Agora] Audio joined channel:', channelName);
              // Route audio through the loudspeaker by default — the SDK's
              // default routes to the earpiece, which is easily mistaken for
              // no audio at all.
              try { engine.setEnableSpeakerphone(true); } catch (e) {}
            },
            onUserJoined: (connection, uid) => {
              if (!active) return;
              console.log('[Agora] Remote user joined audio:', uid);
              if (onRemoteJoinedChangeRef.current) onRemoteJoinedChangeRef.current(true);
            },
            onUserOffline: (connection, uid, reason) => {
              if (!active) return;
              console.log('[Agora] Remote user offline:', uid, 'reason:', reason);
              // In a 1-on-1 call the other participant leaving ends the call.
              if (onRemoteLeftRef.current) onRemoteLeftRef.current();
            },
            onRemoteAudioStateChanged: (connection, uid, state) => {
              if (!active) return;
              // Decoding (2) → remote audio is playing — the remote is in the
              // call, so the UI never treats them as "never joined".
              if (state === RemoteAudioState.RemoteAudioStateDecoding) {
                console.log('[Agora] Remote audio playing:', uid);
                if (onRemoteJoinedChangeRef.current) onRemoteJoinedChangeRef.current(true);
              }
            },
            onTokenPrivilegeWillExpire: () => {
              console.log('[Agora] Token privilege about to expire');
            },
            onError: (err, msg) => {
              console.log('[Agora] Engine error:', err, msg);
              if (onEngineErrorRef.current) onEngineErrorRef.current(err, msg);
            },
            onConnectionStateChanged: (connection, state, reason) => {
              console.log('[Agora] Connection state:', state, 'reason:', reason);
              // If the channel is unreachable before we ever joined, the call
              // cannot proceed — surface it so the screen ends instead of
              // showing "Connecting…" forever.
              if (
                !joinedSuccessfully &&
                state === ConnectionStateType.ConnectionStateFailed
              ) {
                if (onFailedToConnectRef.current) onFailedToConnectRef.current();
              }
            },
          });

          const ret = engine.joinChannel(token, channelName, 0, {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
            channelProfile: ChannelProfileType.ChannelProfileCommunication,
            publishCameraTrack: false,
            publishMicrophoneTrack: true,
            autoSubscribeAudio: true,
            autoSubscribeVideo: false,
          });
          console.log('[Agora] Audio joinChannel result:', ret);
        } catch (e) {
          console.log('[Agora] Engine setup failed:', e.message);
          if (onEngineErrorRef.current) onEngineErrorRef.current(-1, e.message);
        }
      };

      setup();

      return () => {
        active = false;
        if (engineRef.current) {
          try { engineRef.current.leaveChannel(); } catch (e) {}
          try { engineRef.current.release(); } catch (e) {}
        }
        engineRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appId, token, channelName]);

    useImperativeHandle(ref, () => ({
      mute(muted) {
        if (!engineRef.current) return;
        try { engineRef.current.muteLocalAudioStream(!!muted); } catch (e) {}
      },
      setSpeaker(on) {
        if (!engineRef.current) return;
        try { engineRef.current.setEnableSpeakerphone(!!on); } catch (e) {}
      },
      leave() {
        if (!engineRef.current) return;
        try { engineRef.current.leaveChannel(); } catch (e) {}
      },
    }));

    return null;
  }
);

export default function AudioCallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    name = 'Listener',
    callId = '',
    roomId = '',
    listenerId = '',
    avatarIndex = '0',
    gender = 'Female',
    agoraAppId,
    agoraToken,
  } = useLocalSearchParams();

  const [showSafety, setShowSafety] = useState(false);
  const [showEndCallPopup, setShowEndCallPopup] = useState(false);
  const [showCallCancelled, setShowCallCancelled] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [receivedGift, setReceivedGift] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [currentCoins, setCurrentCoins] = useState(null);
  const [lowBalanceMessage, setLowBalanceMessage] = useState('');
  const [permission, setPermission] = useState({ mic: false });
  // True once the permission prompts have finished (granted or denied). The
  // real-call verdict below must wait for this — otherwise a fresh screen
  // would be misread as "permissions denied" while the prompts are pending.
  const [permissionsResolved, setPermissionsResolved] = useState(false);
  const [isListener, setIsListener] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [callCancelledMessage, setCallCancelledMessage] = useState(
    'The call was cancelled by the user.'
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const agoraRef = useRef(null);
  const callEndedRef = useRef(false);
  const cancelledExitTimerRef = useRef(null);
  const remoteJoinedRef = useRef(false);
  // Agora credentials — the backend mints a session-scoped token for audio
  // calls (agoraAppId + agoraToken). Falls back to the bundled App ID only
  // when the server did not attach one.
  const resolvedAppId = agoraAppId || AGORA_APP_ID;

  const canJoinRealCall = permission.mic;

  const hasPlaceholderAppId = !resolvedAppId || /your_agora|placeholder|change_me/i.test(resolvedAppId);
  const canUseAgora =
    !isExpoGo &&
    !!AgoraSDK &&
    !hasPlaceholderAppId &&
    !!agoraToken &&
    !!roomId &&
    canJoinRealCall;

  // ─── Unified end-of-call teardown (both roles) ─────────────────
  // Every way a call ends funnels through here so the USER and LISTENER sides
  // always end in sync with identical work:
  //   1. Leave the Agora channel immediately — the other participant gets the
  //      userOffline callback and can end their side right away.
  //   2. Stop per-minute billing and notify the backend. The endCall API is
  //      idempotent, so it is safe even when the other side (or the billing
  //      timer / socket handler) already completed the session.
  //   3. Navigate by role — USER → call feedback, LISTENER → listener home.
  // The role is read fresh from storage at exit time because the isListener
  // state loads asynchronously after mount and could be stale.
  const finishAndExit = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    // Leave the Agora channel immediately so the other participant gets the
    // userOffline callback and their side can end too.
    if (agoraRef.current) {
      try { agoraRef.current.leave(); } catch (e) {}
    }

    // Notify the backend via socket first (instant, same connection that
    // drives billing), then fire-and-forget the REST endCall — never await it
    // before navigating, or a slow network could trap the user on this screen
    // for up to the 15s request timeout. The endCall API is idempotent, so it
    // is safe when the socket handler (or the other side) already ended the
    // session.
    try {
      if (callId && callId !== 'demo_zego_call' && callId !== 'test_call_id') {
        socketService.emit('stop_call_billing', { sessionId: callId });
        // Also emit call_ended via socket as belt-and-suspenders
        socketService.emit('call_ended', { sessionId: callId, roomId });
        callAPI.endCall(callId).catch((error) => {
          console.log('Failed to end call on backend:', error);
        });
      }
    } catch (error) {
      console.log('Failed to end call on backend:', error);
    }

    let role = 'USER';
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        role = u.role || 'USER';
      }
    } catch (e) {}

    setTimeout(() => {
      if (role === 'LISTENER') {
        try {
          router.dismissAll();
        } catch (e) {}
        // Go straight to the listener dashboard — avoids re-showing the
        // splash screen, which made the app look like it restarted.
        router.replace('/(listener)');
      } else {
        router.replace({
          pathname: '/(call)/call-feedback',
          params: { name, sessionId: callId, listenerId, callType: 'audio' },
        });
      }
    }, 800);
  }, [callId, name, listenerId, roomId, router]);

  // "Joined" (audio) is tracked so the UI never falls back to "Connecting…"
  // for a participant who is in the call.
  useEffect(() => {
    remoteJoinedRef.current = remoteJoined;
  }, [remoteJoined]);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
        console.log('Microphone permission status:', micStatus);
        setPermission({ mic: micStatus === 'granted' });
      } catch (err) {
        console.log('Failed to request mic permission:', err);
        setPermission({ mic: false });
      } finally {
        setPermissionsResolved(true);
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setIsListener(user.role === 'LISTENER');
        } else {
          setIsListener(false);
        }
      } catch {
        setIsListener(false);
      }
    };
    loadUser();
  }, []);

  const triggerGiftAnimation = useCallback((data) => {
    setReceivedGift(data);
    // GiftAnimationOverlay unmounts itself via onComplete
  }, []);

  // Start call billing and listen for socket events
  useEffect(() => {
    const setupBilling = async () => {
      await socketService.connect();

      // Tell the server to start per-minute billing for this session
      if (callId && callId !== 'demo_zego_call' && callId !== 'test_call_id') {
        socketService.emit('start_call_billing', { sessionId: callId });
      }
    };

    const handleBalanceUpdate = (data) => {
      // Update coins for any balance change (call billing, gift send, etc.)
      if (data.coins !== undefined) {
        setCurrentCoins(data.coins);
        // Clear low balance warning if balance is now healthy
        if (data.coins >= 20) {
          setLowBalanceMessage('');
        }
      }
    };

    const handleLowBalance = (data) => {
      setLowBalanceMessage(data.message);
      setShowRecharge(true);
    };

    const handleAutoEnded = async (data) => {
      if (data.sessionId === callId) {
        await finishAndExit();
      }
    };

    const handleCallEnded = async (data) => {
      if (data.sessionId === callId) {
        await finishAndExit();
      }
    };

    const handleCallCancelled = async (data) => {
      if (data.sessionId === callId || data.callId === callId) {
        setCallCancelledMessage('The call was cancelled by the user.');
        setShowCallCancelled(true);
        // Fallback auto-exit: if the user doesn't dismiss the popup, leave the
        // call so billing doesn't keep running on an already-cancelled session.
        cancelledExitTimerRef.current = setTimeout(() => {
          setShowCallCancelled(false);
          finishAndExit();
        }, 5000);
      }
    };

    const handleGiftReceived = (data) => {
      triggerGiftAnimation(data);
    };

    // Register listeners
    socketService.on('balance_updated', handleBalanceUpdate);
    socketService.on('low_balance_warning', handleLowBalance);
    socketService.on('call_auto_ended', handleAutoEnded);
    socketService.on('call_ended', handleCallEnded);
    socketService.on('call_cancelled', handleCallCancelled);
    socketService.on('call_validation_failed', handleCallCancelled);
    socketService.on('gift_received', handleGiftReceived);

    setupBilling();

    return () => {
      if (cancelledExitTimerRef.current) {
        clearTimeout(cancelledExitTimerRef.current);
        cancelledExitTimerRef.current = null;
      }
      socketService.off('balance_updated', handleBalanceUpdate);
      socketService.off('low_balance_warning', handleLowBalance);
      socketService.off('call_auto_ended', handleAutoEnded);
      socketService.off('call_ended', handleCallEnded);
      socketService.off('call_cancelled', handleCallCancelled);
      socketService.off('call_validation_failed', handleCallCancelled);
      socketService.off('gift_received', handleGiftReceived);
    };
  }, [callId]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Block back button and gestures
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
    });

    const backAction = () => {
      // Return true to prevent default back action
      if (!callEndedRef.current) {
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!callEndedRef.current) {
        e.preventDefault();
      }
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation]);

  // The remote participant hung up / dropped — treat it as the call ending.
  const handleRemoteLeft = useCallback(() => {
    console.log('[Agora] Remote participant left — ending call');
    finishAndExit();
  }, [finishAndExit]);

  // Agora could not establish the channel (bad credentials / blocked
  // network). Show a message, then end the call so billing doesn't run on a
  // call that never connected.
  const handleAgoraFailedToConnect = useCallback(() => {
    if (callEndedRef.current) return;
    console.log('[Agora] Failed to connect to the channel — ending call');
    setCallCancelledMessage("Couldn't connect to the audio call. Please try again.");
    setShowCallCancelled(true);
    cancelledExitTimerRef.current = setTimeout(() => {
      setShowCallCancelled(false);
      finishAndExit();
    }, 3500);
  }, [finishAndExit]);

  // If the remote never joins the channel, end the call after a generous
  // window instead of leaving "Connecting…" (and billing) running forever.
  useEffect(() => {
    if (!canUseAgora) return;
    const timer = setTimeout(() => {
      if (remoteJoinedRef.current || callEndedRef.current) return;
      console.log('[Agora] Remote never joined — ending call');
      setCallCancelledMessage("The other person couldn't join the call. Please try again.");
      setShowCallCancelled(true);
      cancelledExitTimerRef.current = setTimeout(() => {
        setShowCallCancelled(false);
        finishAndExit();
      }, 3500);
    }, 45000);
    return () => clearTimeout(timer);
  }, [canUseAgora, finishAndExit]);

  // When the real Agora call cannot start, the old code silently showed an
  // avatar-only UI — the user heard nothing and was still billed. Diagnose WHY
  // we're stuck and surface a clear message, then end the call so billing
  // stops. (The remote-join timeout above only applies once Agora is active.)
  const fallbackDiagnosedRef = useRef(false);
  useEffect(() => {
    if (canUseAgora || !permissionsResolved || fallbackDiagnosedRef.current) return;
    if (callEndedRef.current) return;

    let message = '';
    if (isExpoGo) {
      message =
        "Audio calls need the development or production build — they can't run inside Expo Go. Please install the app build to make calls.";
    } else if (!AgoraSDK) {
      message =
        "The call module isn't available in this build. Please update the app to the latest version.";
    } else if (!permission.mic) {
      message =
        'Microphone access is required for audio calls. Please allow it and start the call again.';
    } else if (!agoraToken || !roomId || hasPlaceholderAppId) {
      message =
        "Audio call couldn't connect — the server isn't configured for calls yet. Please try again later.";
    } else {
      // Everything looks configured but the call still can't start — leave the
      // screen up so the user can retry manually; don't force an exit.
      return;
    }

    console.log('[AudioCall] Real call unavailable, ending:', message);
    fallbackDiagnosedRef.current = true;
    setCallCancelledMessage(message);
    setShowCallCancelled(true);
    cancelledExitTimerRef.current = setTimeout(() => {
      setShowCallCancelled(false);
      finishAndExit();
    }, 4500);
  }, [
    canUseAgora,
    permissionsResolved,
    permission.mic,
    agoraToken,
    roomId,
    hasPlaceholderAppId,
    isExpoGo,
    finishAndExit,
  ]);

  const handleCallCancelledClose = useCallback(() => {
    if (cancelledExitTimerRef.current) {
      clearTimeout(cancelledExitTimerRef.current);
      cancelledExitTimerRef.current = null;
    }
    setShowCallCancelled(false);
    // finishAndExit performs the full teardown (leave Agora + stop billing +
    // endCall API + navigate), so closing the popup behaves exactly like
    // tapping End Call — identically for both roles.
    finishAndExit();
  }, [finishAndExit]);

  const handleRechargeSuccess = useCallback(async () => {
    try {
      const res = await walletAPI.getBalance();
      if (res.data?.coins !== undefined) {
        setCurrentCoins(res.data.coins);
      }
    } catch (e) {
      console.log('Balance refresh failed after recharge', e);
    }
    setLowBalanceMessage('');
    setShowRecharge(false);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    if (agoraRef.current) agoraRef.current.mute(next);
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    if (agoraRef.current) agoraRef.current.setSpeaker(next);
  }, [isSpeaker]);

  // Tap anywhere on the screen toggles all controls.
  const toggleControls = useCallback(() => {
    // Don't toggle while a popup is open — its backdrop may pass taps through.
    if (showEndCallPopup || showCallCancelled || showSafety || showRecharge || showGiftPopup) return;
    const next = !controlsVisible;
    setControlsVisible(next);
    Animated.timing(controlsOpacity, {
      toValue: next ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsOpacity, showEndCallPopup, showSafety, showRecharge, showGiftPopup]);

  return (
    <Pressable style={styles.container} onPress={toggleControls}>
      <LinearGradient
        colors={['#000000', '#0C0C0E', '#151518']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Agora audio engine — active only when the real call can start */}
      {canUseAgora && (
        <AgoraAudioEngine
          ref={agoraRef}
          appId={resolvedAppId}
          token={agoraToken}
          channelName={roomId}
          onRemoteJoinedChange={setRemoteJoined}
          onRemoteLeft={handleRemoteLeft}
          onFailedToConnect={handleAgoraFailedToConnect}
          onEngineError={(err, msg) => console.log('[Agora] Engine error:', err, msg)}
        />
      )}

      <Animated.View style={{ opacity: controlsOpacity }} pointerEvents={controlsVisible ? 'auto' : 'none'}>
        <View style={[styles.topBar, { paddingTop: insets.top + vs(8) }]}>
          {/* Call duration timer — only appears once the call connects */}
          {remoteJoined && (
            <View style={styles.topBarTimerWrap}>
              <CallTimer active />
            </View>
          )}
          <View style={styles.topBarRight}>
            {currentCoins !== null && !isListener && (
              <View style={styles.coinsBadgeInline}>
                <Text style={{ fontSize: 12, marginRight: 4 }}>🪙</Text>
                <Text style={styles.coinsBadgeInlineText}>{currentCoins}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Recharge + Gift — stacked on the top right (user only) */}
      {!isListener && (
        <Animated.View style={{ opacity: controlsOpacity }} pointerEvents={controlsVisible ? 'auto' : 'none'}>
          <View style={styles.fallbackTopRight}>
            <TouchableOpacity
              style={styles.floatingRechargeGift}
              onPress={() => setShowRecharge(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={20} color="#EC4899" />
              <Text style={[styles.floatingRechargeText, { color: '#EC4899' }]}>Recharge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingRechargeGift}
              onPress={() => setShowGiftPopup(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="gift-outline" size={20} color="#A855F7" />
              <Text style={[styles.floatingRechargeText, { color: '#A855F7' }]}>Gift</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <View style={styles.videoArea}>
        {/* Remote participant — their avatar with a pulsing glow while the
            call connects (and whenever they're in the call). */}
        <Animated.View
          style={{ opacity: controlsOpacity, alignItems: 'center', justifyContent: 'center' }}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Image
              source={{ uri: getAvatarUrl(gender, avatarIndex) }}
              style={styles.mainAvatar}
            />
          </Animated.View>
          <Text style={styles.callerName}>{name}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: remoteJoined ? '#22C55E' : '#F59E0B' },
              ]}
            />
            <Text style={styles.statusText}>
              {remoteJoined ? 'Audio Call in Progress' : 'Connecting...'}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Safety — left side, middle of the page */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
        pointerEvents={controlsVisible ? 'box-none' : 'none'}
      >
        <TouchableOpacity
          style={styles.safetyFloat}
          onPress={() => setShowSafety(true)}
          activeOpacity={0.8}
          accessibilityLabel="Open safety guidance"
        >
          <Ionicons name="shield-checkmark" size={22} color="#4ADE80" />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom controls dock — same flat design as the video call screen */}
      <Animated.View style={{ opacity: controlsOpacity }} pointerEvents={controlsVisible ? 'auto' : 'none'}>
        <View style={[styles.fallbackControls, { paddingBottom: Math.max(insets.bottom, vs(24)) }]}>
          <CallControls
            flat
            onEndCall={() => setShowEndCallPopup(true)}
            buttons={[
              {
                id: 'mute',
                icon: 'mic',
                iconActive: 'mic-off',
                label: 'Mute',
                labelActive: 'Unmute',
                active: isMuted,
                onPress: toggleMute,
              },
              {
                id: 'speaker',
                icon: 'volume-high',
                iconActive: 'volume-mute',
                label: 'Speaker',
                active: isSpeaker,
                activeColor: '#A855F7',
                onPress: toggleSpeaker,
              },
            ]}
          />
        </View>
      </Animated.View>

      <EndCallPopup
        visible={showEndCallPopup}
        onEndCall={finishAndExit}
        onDismiss={() => setShowEndCallPopup(false)}
      />

      <CallCancelledPopup
        visible={showCallCancelled}
        message={callCancelledMessage}
        onClose={handleCallCancelledClose}
      />

      <SafetyPopup
        visible={showSafety}
        onDismiss={() => setShowSafety(false)}
      />

      <InCallRechargePopup
        visible={showRecharge}
        onClose={() => setShowRecharge(false)}
        onRechargeSuccess={handleRechargeSuccess}
        lowBalanceMessage={lowBalanceMessage}
      />

      <GiftPopup
        visible={showGiftPopup}
        onClose={() => setShowGiftPopup(false)}
        receiverId={listenerId}
        sessionId={callId}
        onGiftSent={(gift) => {
          // Update balance immediately from gift response
          if (gift.remainingCoins !== undefined) {
            setCurrentCoins(gift.remainingCoins);
          } else if (gift.price) {
            setCurrentCoins(prev => prev !== null ? Math.max(0, prev - gift.price) : prev);
          }
          triggerGiftAnimation({
            isSentByMe: true,
            gift: gift,
          });
        }}
      />

      {/* Received Gift Full Screen Animation */}
      {receivedGift && (
        <GiftAnimationOverlay
          giftName={receivedGift.gift.name}
          giftIcon={receivedGift.gift.icon}
          giftPrice={receivedGift.gift.price}
          giftCount={receivedGift.gift.count || 1}
          senderName={receivedGift.isSentByMe ? 'You' : receivedGift.senderName || 'Someone'}
          receiverName={receivedGift.isSentByMe ? name : 'You'}
          isSentByMe={receivedGift.isSentByMe}
          onComplete={() => setReceivedGift(null)}
        />
      )}
    </Pressable>
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
  topBarTimerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  coinsBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: 16,
    gap: s(4),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  coinsBadgeInlineText: {
    color: '#F59E0B',
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_700Bold',
  },
  videoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarContainer: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    borderWidth: 3,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
    shadowColor: '#A855F7',
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
  },
  statusText: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },

  safetyFloat: {
    position: 'absolute',
    left: s(12),
    top: '50%',
    marginTop: -wp(6.25),
    width: wp(12.5),
    height: wp(12.5),
    borderRadius: wp(6.25),
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  fallbackControls: {
    alignItems: 'center',
    paddingTop: vs(10),
    paddingBottom: vs(24),
  },
  fallbackTopRight: {
    position: 'absolute',
    top: hp(16),
    right: s(12),
    alignItems: 'flex-end',
    gap: vs(8),
    zIndex: 999,
  },
  floatingRechargeGift: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    zIndex: 999,
  },
  floatingRechargeText: {
    color: '#fff',
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },
});
