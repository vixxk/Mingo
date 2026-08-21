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
import VideoUpgradeModal from '../../components/call/VideoUpgradeModal';
import { callAPI, walletAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import { AGORA_APP_ID } from '../../utils/agoraConfig';
import { ms, s, vs, SCREEN_WIDTH, hp, wp } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';

// ZegoCloud SDK has been fully removed — all audio calls use Agora RTC.

// Agora RTC SDK — native module fallback for audio calls
let AgoraSDK = null;
let isExpoGo = false;
try {
  AgoraSDK = require('react-native-agora');
} catch (e) {
  isExpoGo = true;
  console.log('Agora SDK not available (likely Expo Go):', e.message);
}

const {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  RemoteAudioState,
  AudioProfileType,
  AudioScenarioType,
} = AgoraSDK || {};

const VIDEO_UPGRADE_MIN_COINS = 40;

// ZegoCallWrapper removed — audio calls use AgoraAudioEngine exclusively.

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
      onJoinSuccess,
    },
    ref
  ) => {
    const engineRef = useRef(null);

    const onRemoteJoinedChangeRef = useRef(onRemoteJoinedChange);
    const onRemoteLeftRef = useRef(onRemoteLeft);
    const onFailedToConnectRef = useRef(onFailedToConnect);
    const onEngineErrorRef = useRef(onEngineError);
    const onJoinSuccessRef = useRef(onJoinSuccess);

    useEffect(() => { onRemoteJoinedChangeRef.current = onRemoteJoinedChange; });
    useEffect(() => { onRemoteLeftRef.current = onRemoteLeft; });
    useEffect(() => { onFailedToConnectRef.current = onFailedToConnect; });
    useEffect(() => { onEngineErrorRef.current = onEngineError; });
    useEffect(() => { onJoinSuccessRef.current = onJoinSuccess; });

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

          const initRet = engine.initialize({ appId });
          console.log('[Agora] Audio initialize result:', initRet);
          if (initRet !== 0) {
            console.error('[Agora] Audio engine initialize failed with code:', initRet);
            if (onEngineErrorRef.current) onEngineErrorRef.current(initRet, 'Audio engine initialize failed');
            return;
          }
          engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
          engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

          // Set audio profile optimized for voice calls before enabling audio.
          // SpeechStandard + ChatRoom gives low-latency narrow-band audio ideal
          // for 1-on-1 voice conversations on Android.
          try {
            if (AudioProfileType && AudioScenarioType) {
              engine.setAudioProfile(
                AudioProfileType.AudioProfileSpeechStandard,
                AudioScenarioType.AudioScenarioChatRoom
              );
            }
          } catch (e) {
            console.log('[Agora] setAudioProfile failed (non-fatal):', e.message);
          }

          engine.enableAudio();
          // Explicitly enable local audio capture — on some Android builds
          // enableAudio() alone does not start the microphone.
          try { engine.enableLocalAudio(true); } catch (e) {}
          // Ensure recording and playback volumes are at full scale so
          // neither side hears silence.
          try { engine.adjustRecordingSignalVolume(400); } catch (e) {}
          try { engine.adjustPlaybackSignalVolume(400); } catch (e) {}

          engine.registerEventHandler({
            onJoinChannelSuccess: () => {
              if (!active) return;
              joinedSuccessfully = true;
              console.log('[Agora] Audio joined channel:', channelName);
              // Route audio through the loudspeaker by default — the SDK's
              // default routes to the earpiece, which is easily mistaken for
              // no audio at all.
              try { engine.setEnableSpeakerphone(true); } catch (e) {}
              // Re-assert audio capture & subscription after joining — belt
              // and suspenders for stubborn devices.
              try { engine.enableLocalAudio(true); } catch (e) {}
              try { engine.muteLocalAudioStream(false); } catch (e) {}
              try { engine.muteAllRemoteAudioStreams(false); } catch (e) {}
              if (onJoinSuccessRef.current) onJoinSuccessRef.current();
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
          console.log('[Agora] Audio joinChannel result:', ret, '(token:', token ? token.substring(0, 12) + '...' : 'null', ', channel:', channelName, ')');
          if (ret !== 0) {
            console.error('[Agora] Audio joinChannel failed with code:', ret);
            if (onFailedToConnectRef.current) onFailedToConnectRef.current();
          }
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

class CallErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CallErrorBoundary] Caught error in AudioCallScreen:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#050101', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Audio Call Failed
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            {this.state.error?.message || 'An unexpected initialization error occurred. Please try starting the call again.'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 }}
            onPress={() => this.props.onDismiss ? this.props.onDismiss() : this.setState({ hasError: false })}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Close & Exit Call</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function AudioCallScreenComponent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const {
    name = 'Listener',
    listenerId = '',
    userId: paramUserId = '',
    avatarIndex = '0',
    gender = 'Female',
    agoraAppId,
    agoraToken,
  } = rawParams;

  const callId = String(rawParams.callId || rawParams.sessionId || rawParams.id || rawParams._id || '');
  const roomId = String(rawParams.roomId || '');

  const [userID, setUserID] = useState(paramUserId || '');
  const [userName, setUserName] = useState('');
  const [showSafety, setShowSafety] = useState(false);
  const [showEndCallPopup, setShowEndCallPopup] = useState(false);
  const [showCallCancelled, setShowCallCancelled] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [receivedGift, setReceivedGift] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeModalMode, setUpgradeModalMode] = useState('request');
  const [pendingUpgradeState, setPendingUpgradeState] = useState(null); // null | 'incoming' | 'pending'
  const [callCancelledNotice, setCallCancelledNotice] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(null);
  const [lowBalanceMessage, setLowBalanceMessage] = useState('');
  const [permission, setPermission] = useState({ mic: false });
  const [permissionsResolved, setPermissionsResolved] = useState(false);
  const [isListener, setIsListener] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState('');
  const [callCancelledMessage, setCallCancelledMessage] = useState(
    'The call was cancelled by the user.'
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const agoraRef = useRef(null);
  const callEndedRef = useRef(false);
  const cancelledExitTimerRef = useRef(null);
  const remoteJoinedRef = useRef(false);
  const upgradeNavigatedRef = useRef(false);
  const isListenerRef = useRef(false);

  const [currentAgoraToken, setCurrentAgoraToken] = useState(agoraToken || '');
  const [currentAgoraAppId, setCurrentAgoraAppId] = useState(agoraAppId || '');

  useEffect(() => {
    if (callId || roomId) {
      socketService.triggerLocalEvent('register_active_call_id', { callId, roomId });
    }
  }, [callId, roomId]);

  useEffect(() => {
    if (agoraToken) setCurrentAgoraToken(agoraToken);
    if (agoraAppId) setCurrentAgoraAppId(agoraAppId);
  }, [agoraToken, agoraAppId]);

  useEffect(() => {
    const handleCallAccepted = (data) => {
      if ((data.sessionId && data.sessionId === callId) || (data.roomId && data.roomId === roomId)) {
        if (data.agoraToken) setCurrentAgoraToken(data.agoraToken);
        if (data.agoraAppId) setCurrentAgoraAppId(data.agoraAppId);
      }
    };
    socketService.on('call_accepted', handleCallAccepted);
    return () => {
      socketService.off('call_accepted', handleCallAccepted);
    };
  }, [callId, roomId]);

  const effectiveAgoraToken = currentAgoraToken || agoraToken;
  const effectiveAgoraAppId = currentAgoraAppId || agoraAppId;

  const resolvedAppId = effectiveAgoraAppId || AGORA_APP_ID;

  const canJoinRealCall = permission.mic;

  const hasPlaceholderAppId = !resolvedAppId || /your_agora|placeholder|change_me/i.test(resolvedAppId);

  // All audio calls use Agora RTC (Zego has been fully removed).
  const canUseAgora =
    !isExpoGo &&
    !!AgoraSDK &&
    typeof createAgoraRtcEngine === 'function' &&
    !hasPlaceholderAppId &&
    !!effectiveAgoraToken &&
    !!roomId &&
    canJoinRealCall;

  // ── Diagnostic: log every factor that decides the call engine ──
  useEffect(() => {
    console.log('[AudioCall] ── Call engine readiness check ──');
    console.log('[AudioCall]   isExpoGo:', isExpoGo);
    console.log('[AudioCall]   AgoraSDK loaded:', !!AgoraSDK);
    console.log('[AudioCall]   resolvedAppId:', resolvedAppId ? resolvedAppId.substring(0, 8) + '...' : '(empty)');
    console.log('[AudioCall]   hasPlaceholderAppId:', hasPlaceholderAppId);
    console.log('[AudioCall]   agoraToken:', effectiveAgoraToken ? effectiveAgoraToken.substring(0, 12) + '...' : '(empty)');
    console.log('[AudioCall]   roomId:', roomId || '(empty)');
    console.log('[AudioCall]   permission.mic:', permission.mic);
    console.log('[AudioCall]   canUseAgora:', canUseAgora);
    console.log('[AudioCall]   callId:', callId);
  }, [canUseAgora, permissionsResolved]);

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
      const activeId = callId || roomId;
      if (activeId && activeId !== 'demo_zego_call' && activeId !== 'test_call_id') {
        socketService.emit('stop_call_billing', { sessionId: activeId, roomId });
        // Emit call_ended via socket to instantly disconnect both parties
        socketService.emit('call_ended', { sessionId: activeId, roomId });
        callAPI.endCall(activeId).catch((error) => {
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
          params: { name, sessionId: callId || roomId, listenerId, callType: 'audio' },
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
    isListenerRef.current = isListener;
  }, [isListener]);

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
          setUserID(user.id || user._id || '');
          setUserName(user.name || user.username || 'User');
          // Build my own avatar URL the same way the video call screen does.
          const rawGender = user.gender || 'Male';
          const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
          const myAvatarIdx = user.avatarIndex !== undefined && user.avatarIndex !== null ? String(user.avatarIndex) : '0';
          setMyAvatarUrl(getAvatarUrl(normalizedGender, myAvatarIdx));
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
      // Billing is started AFTER Agora connects (in onJoinSuccess) so the
      // user is only charged once both participants can actually talk.
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
      console.log('[AudioCall] Received call_ended socket event:', data);
      const incId = String(data?.sessionId || data?.callId || data?.id || '');
      const curId = String(callId || '');
      if (!incId || !curId || incId === curId || (data?.roomId && data.roomId === roomId)) {
        await finishAndExit();
      }
    };

    const handleCallCancelled = async (data) => {
      if (data.sessionId === callId || data.callId === callId) {
        setCallCancelledMessage('The call was cancelled by the user.');
        // A real cancellation must close with the end-call handler, so clear
        // any stale notice flag first.
        setCallCancelledNotice(false);
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

    const handleUpgradeRequested = (data) => {
      console.log('[Socket] handleUpgradeRequested received:', data);
      const isMatch = !callId || String(data.sessionId) === String(callId) || (data.roomId && data.roomId === roomId);
      if (isMatch) {
        setPendingUpgradeState('incoming');
        setUpgradeModalMode('incoming');
        setUpgradeModalVisible(true);
      }
    };

    const handleUpgradeAccepted = (data) => {
      console.log('[Socket] handleUpgradeAccepted received:', data);
      // Guard against duplicate events (user room + Agora room both trigger)
      if (upgradeNavigatedRef.current) return;
      const isMatch = !callId || String(data.sessionId) === String(callId) || (data.roomId && data.roomId === roomId);
      if (isMatch) {
        upgradeNavigatedRef.current = true;
        // Mark the audio call as "ended" from this screen's perspective BEFORE
        // leaving the Agora channel. Two things depend on this:
        //   1. The beforeRemove guard below blocks router.replace for ANY
        //      state-changing action (including REPLACE), so unless we flip
        //      this flag the conversion never navigates to the video screen.
        //   2. Leaving the channel makes the OTHER participant's engine fire
        //      onUserOffline → handleRemoteLeft → finishAndExit. With this
        //      flag set, that teardown is a no-op, so the call isn't ended and
        //      routed to feedback mid-conversion — the video screen takes over.
        callEndedRef.current = true;
        setPendingUpgradeState(null);
        setUpgradeModalVisible(false);
        // Leave the audio channel before navigating to video
        if (agoraRef.current) {
          try { agoraRef.current.leave(); } catch (e) {}
        }
        // Small delay to let Agora engine release before video-call mounts
        setTimeout(() => {
          router.replace({
            pathname: '/(call)/video-call',
            params: {
              name,
              callId: data.sessionId || callId,
              roomId: data.roomId || roomId,
              listenerId,
              avatarIndex,
              gender,
              agoraAppId: data.agoraAppId || agoraAppId,
              agoraToken: data.agoraToken || agoraToken,
              isConverted: 'true',
            },
          });
        }, 300);
      }
    };

    const handleUpgradeDeclined = (data) => {
      console.log('[Socket] handleUpgradeDeclined received:', data);
      const isMatch = !callId || String(data.sessionId) === String(callId) || (data.roomId && data.roomId === roomId);
      if (isMatch) {
        setPendingUpgradeState(null);
        setUpgradeModalVisible(false);
        setCallCancelledMessage(data.message || 'The upgrade to video call was declined.');
        // This is only a notice — the ongoing audio call keeps running, so
        // closing it must NOT end the call (unlike a real cancellation).
        setCallCancelledNotice(true);
        setShowCallCancelled(true);
      }
    };
    const handleUpgradeFailed = (data) => {
      console.log('[Socket] handleUpgradeFailed received:', data);
      setPendingUpgradeState(null);
      setUpgradeModalVisible(false);
      // The backend refused the upgrade because the PAYING user (session.userId)
      // can't afford one video minute. Prompt them to recharge instead of
      // letting the call convert and then auto-end on the first video minute.
      if (data.reason === 'insufficient_balance') {
        if (isListenerRef.current) {
          // The listener doesn't pay — the other side is short on balance, so
          // just inform (without ending the call).
          setCallCancelledMessage(
            data.message || 'The user does not have enough balance to switch to a video call.'
          );
          setCallCancelledNotice(true);
          setShowCallCancelled(true);
        } else {
          setLowBalanceMessage(
            data.message ||
              `Video calls cost ${VIDEO_UPGRADE_MIN_COINS} 💎 per minute. Please recharge to switch.`
          );
          setShowRecharge(true);
        }
      } else {
        // Handle session_inactive, session_not_found, server_error, etc.
        const msg = data.reason === 'session_not_found'
          ? 'Could not find the active session. Please try again.'
          : data.reason === 'session_inactive'
          ? 'The session is no longer active. Cannot upgrade to video.'
          : 'Something went wrong while requesting the video upgrade. Please try again.';
        setCallCancelledMessage(msg);
        setCallCancelledNotice(true);
        setShowCallCancelled(true);
      }
    };

    // Register listeners
    socketService.on('balance_updated', handleBalanceUpdate);
    socketService.on('low_balance_warning', handleLowBalance);
    socketService.on('call_auto_ended', handleAutoEnded);
    socketService.on('call_ended', handleCallEnded);
    socketService.on('call_cancelled', handleCallCancelled);
    socketService.on('call_validation_failed', handleCallCancelled);
    socketService.on('gift_received', handleGiftReceived);
    socketService.on('call_upgrade_requested', handleUpgradeRequested);
    socketService.on('call_upgrade_accepted', handleUpgradeAccepted);
    socketService.on('call_upgrade_declined', handleUpgradeDeclined);
    socketService.on('call_upgrade_failed', handleUpgradeFailed);

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
      socketService.off('call_upgrade_requested', handleUpgradeRequested);
      socketService.off('call_upgrade_accepted', handleUpgradeAccepted);
      socketService.off('call_upgrade_declined', handleUpgradeDeclined);
      socketService.off('call_upgrade_failed', handleUpgradeFailed);
    };
  }, [callId]);

  // Billing is started in the onJoinSuccess callback of AgoraAudioEngine
  // so the user is only charged once both sides are in the channel.

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
    } else if (!effectiveAgoraToken || !roomId || hasPlaceholderAppId) {
      message =
        "Audio call couldn't connect — the server isn't configured for calls yet. Please try again later.";
    } else {
      message =
        "Audio call connection unavailable. Please check your network and permissions and try again.";
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
    effectiveAgoraToken,
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
    setCallCancelledNotice(false);
    setShowCallCancelled(false);
    // finishAndExit performs the full teardown (leave Agora + stop billing +
    // endCall API + navigate), so closing the popup behaves exactly like
    // tapping End Call — identically for both roles.
    finishAndExit();
  }, [finishAndExit]);

  // Closing a notice popup (upgrade declined, other side low on balance) only
  // dismisses it — the ongoing audio call keeps running untouched.
  const handleCallCancelledNoticeClose = useCallback(() => {
    setCallCancelledNotice(false);
    setShowCallCancelled(false);
  }, []);

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

  const handleVideoUpgradePress = useCallback(() => {
    if (pendingUpgradeState === 'incoming') {
      setUpgradeModalMode('incoming');
      setUpgradeModalVisible(true);
    } else if (pendingUpgradeState === 'pending') {
      setUpgradeModalMode('pending');
      setUpgradeModalVisible(true);
    } else {
      setUpgradeModalMode('request');
      setUpgradeModalVisible(true);
    }
  }, [pendingUpgradeState]);

  const handleSendUpgradeRequest = useCallback(async () => {
    // The USER pays for the video minutes — check their balance up front so a
    // low-balance user is prompted to recharge instead of having the request
    // rejected (or worse, converting and auto-ending on the first video
    // minute). The listener never pays, so the backend validates the user's
    // balance in that case.
    if (!isListener) {
      let balance = currentCoins;
      if (balance === null || balance === undefined) {
        try {
          const res = await walletAPI.getBalance();
          if (res?.data?.coins !== undefined) {
            balance = res.data.coins;
            setCurrentCoins(balance);
          }
        } catch (e) {
          console.log('Balance check before upgrade request failed:', e);
        }
      }
      if (balance !== null && balance !== undefined && balance < VIDEO_UPGRADE_MIN_COINS) {
        setLowBalanceMessage(
          `Video calls cost ${VIDEO_UPGRADE_MIN_COINS} 💎 per minute. You need at least ${VIDEO_UPGRADE_MIN_COINS} coins to switch — please recharge.`
        );
        setShowRecharge(true);
        return;
      }
    }
    setPendingUpgradeState('pending');
    setUpgradeModalMode('pending');
    socketService.emit('request_call_upgrade', { sessionId: callId, roomId, targetUserId: listenerId });
  }, [callId, roomId, listenerId, isListener, currentCoins]);

  const handleAcceptUpgradeRequest = useCallback(async () => {
    // Same payer balance gate as the request side: when the USER accepts an
    // incoming upgrade, their balance may have dropped below one video minute
    // since the request arrived. Prompt them to recharge instead of accepting
    // and getting auto-ended on the first video minute. (The listener never
    // pays — the backend re-checks the user's balance on accept regardless.)
    if (!isListener) {
      let balance = currentCoins;
      if (balance === null || balance === undefined) {
        try {
          const res = await walletAPI.getBalance();
          if (res?.data?.coins !== undefined) {
            balance = res.data.coins;
            setCurrentCoins(balance);
          }
        } catch (e) {
          console.log('Balance check before accepting upgrade failed:', e);
        }
      }
      if (balance !== null && balance !== undefined && balance < VIDEO_UPGRADE_MIN_COINS) {
        setUpgradeModalVisible(false);
        setPendingUpgradeState(null);
        setLowBalanceMessage(
          `Video calls cost ${VIDEO_UPGRADE_MIN_COINS} 💎 per minute. You need at least ${VIDEO_UPGRADE_MIN_COINS} coins to switch — please recharge.`
        );
        setShowRecharge(true);
        return;
      }
    }
    setPendingUpgradeState(null);
    socketService.emit('respond_call_upgrade', { sessionId: callId, roomId, accepted: true });
  }, [callId, roomId, isListener, currentCoins]);

  const handleDeclineUpgradeRequest = useCallback(() => {
    setPendingUpgradeState(null);
    setUpgradeModalVisible(false);
    socketService.emit('respond_call_upgrade', { sessionId: callId, roomId, accepted: false });
  }, [callId, roomId]);

  const handleCancelUpgradeModal = useCallback(() => {
    if (upgradeModalMode === 'pending') {
      setPendingUpgradeState(null);
    }
    setUpgradeModalVisible(false);
  }, [upgradeModalMode]);

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
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Agora RTC Audio Engine */}
      {canUseAgora && (
        <AgoraAudioEngine
          ref={agoraRef}
          appId={resolvedAppId}
          token={effectiveAgoraToken}
          channelName={roomId}
          onRemoteJoinedChange={setRemoteJoined}
          onRemoteLeft={handleRemoteLeft}
          onFailedToConnect={handleAgoraFailedToConnect}
          onEngineError={(err, msg) => console.log('[Agora] Engine error:', err, msg)}
          onJoinSuccess={() => {
            console.log('[AudioCall] Agora joinChannel succeeded — local user is in the audio channel');

            // Start billing NOW that we're actually connected and can talk.
            if (callId && callId !== 'demo_zego_call' && callId !== 'test_call_id') {
              socketService.emit('start_call_billing', { sessionId: callId });
            }

            // Fallback: if onUserJoined / onRemoteAudioStateChanged never fires
            // (can happen on certain builds where Agora callbacks are delayed or
            // swallowed), mark remote as joined after a short grace period so the
            // UI transitions from "Connecting…" to "Audio Call in Progress".
            setTimeout(() => {
              if (!remoteJoinedRef.current && !callEndedRef.current) {
                console.log('[AudioCall] Fallback: remote never joined callback — marking as connected');
                setRemoteJoined(true);
              }
            }, 8000);
          }}
        />
      )}

      {/* Call duration timer — always visible, with a generous gap below the
          status bar / notch so it never overlaps them. */}
      <View style={[styles.topBar, { paddingTop: insets.top + hp(12) }]} pointerEvents="none">
        {/* Call duration timer — only appears once the call connects */}
        {remoteJoined && (
          <View style={styles.topBarTimerWrap}>
            <CallTimer active />
          </View>
        )}
      </View>

      <View style={styles.videoArea}>
        {/* Remote participant — their avatar with a pulsing glow while the
            call connects. Stays on screen even when the controls are hidden. */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
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
              {remoteJoined ? 'Audio Call in Progress' : 'Connecting…'}
            </Text>
          </View>
        </View>
      </View>

      {/* Floating overlay — coins badge + Recharge + Gift (top right, user
          only) and the Safety button (left middle). Rendered as a full-screen
          layer so the buttons sit INSIDE the overlay's touch bounds and stay
          tappable — a zero-height wrapper would let taps fall through to the
          background Pressable, which toggled the controls instead of opening
          the popups. Everything shares the controls fade. Mirrors the video
          call's overlay structure. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
        pointerEvents={controlsVisible ? 'box-none' : 'none'}
      >
        {!isListener && (
          <View style={styles.floatingTopRight}>
            {currentCoins !== null && (
              <View style={styles.coinsBadge}>
                <Text style={{ fontSize: 12, marginRight: 4 }}>🪙</Text>
                <Text style={styles.coinsBadgeText}>{currentCoins}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.floatingRechargeGift}
              onPress={(e) => { e.stopPropagation?.(); setShowRecharge(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={24} color="#10B981" />
              <Text style={[styles.floatingRechargeText, { color: '#10B981' }]}>Recharge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingRechargeGift}
              onPress={(e) => { e.stopPropagation?.(); setShowGiftPopup(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="gift-outline" size={24} color="#10B981" />
              <Text style={[styles.floatingRechargeText, { color: '#10B981' }]}>Gift</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Safety — left side, middle of the page */}
        <TouchableOpacity
          style={styles.safetyFloat}
          onPress={(e) => { e.stopPropagation?.(); setShowSafety(true); }}
          activeOpacity={0.8}
          accessibilityLabel="Open safety guidance"
        >
          <Ionicons name="shield-checkmark" size={26} color="#4ADE80" />
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
                icon: 'volume-off',
                iconActive: 'volume-high',
                label: 'Speaker',
                active: isSpeaker,
                activeColor: '#22C55E',
                onPress: toggleSpeaker,
              },
              {
                id: 'video_switch',
                icon: 'videocam-outline',
                label: 'Video',
                active: false,
                onPress: handleVideoUpgradePress,
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

      <VideoUpgradeModal
        visible={upgradeModalVisible}
        mode={upgradeModalMode}
        name={name}
        onSend={handleSendUpgradeRequest}
        onAccept={handleAcceptUpgradeRequest}
        onDecline={handleDeclineUpgradeRequest}
        onCancel={handleCancelUpgradeModal}
      />

      <CallCancelledPopup
        visible={showCallCancelled}
        message={callCancelledMessage}
        onClose={callCancelledNotice ? handleCallCancelledNoticeClose : handleCallCancelledClose}
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
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: 16,
    gap: s(4),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  coinsBadgeText: {
    color: '#F59E0B',
    fontSize: ms(13, 0.3),
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
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
    shadowColor: '#EF4444',
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
    marginTop: -s(27),
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.5)',
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
  // Positioned identically to the video call's floatingTopRight (top: 8% of
  // screen height) so the coins badge, Recharge and Gift buttons land in the
  // exact same spot on both call screens. hp(8) === SH * 0.08.
  floatingTopRight: {
    position: 'absolute',
    top: hp(8),
    right: s(12),
    alignItems: 'flex-end',
    gap: vs(10),
    zIndex: 999,
  },
  floatingRechargeGift: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 28,
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    zIndex: 999,
  },
  floatingRechargeText: {
    color: '#fff',
    fontSize: ms(13.5, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },
});

export default function AudioCallScreen(props) {
  const router = useRouter();
  return (
    <CallErrorBoundary onDismiss={() => router.back()}>
      <AudioCallScreenComponent {...props} />
    </CallErrorBoundary>
  );
}
