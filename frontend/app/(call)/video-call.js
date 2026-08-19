import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions, BackHandler, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Camera, CameraView } from 'expo-camera';
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

const { height: SH } = Dimensions.get('window');
// Agora RTC SDK — native module, only available on dev/native builds.
// We try to load the native module regardless of the execution environment; it
// is only unavailable inside Expo Go (which lacks native module support). Dev
// client builds CAN load native modules even though executionEnvironment may
// still report 'storeClient'.
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
  RtcSurfaceView,
  RtcTextureView,
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  RemoteVideoState,
  RemoteAudioState,
  RenderModeType,
  VideoMirrorModeType,
} = AgoraSDK || {};

// On Android, TextureView (RtcTextureView) is preferred for small floating subviews / overlays
// so it renders inside the view hierarchy without SurfaceFlinger occlusion or black rectangle issues.
const LocalVideoView = (Platform.OS === 'android' && RtcTextureView) ? RtcTextureView : RtcSurfaceView;

const SafeLocalVideoView = (props) => {
  const Comp = LocalVideoView || RtcSurfaceView || RtcTextureView;
  if (!Comp) return <View style={[props.style, { backgroundColor: '#111' }]} />;
  try {
    return <Comp {...props} />;
  } catch (e) {
    console.error('[VideoCall] Error rendering LocalVideoView:', e);
    return <View style={[props.style, { backgroundColor: '#111' }]} />;
  }
};

const SafeRemoteVideoView = (props) => {
  const Comp = RtcSurfaceView || RtcTextureView || LocalVideoView;
  if (!Comp) return <View style={[props.style, { backgroundColor: '#000' }]} />;
  try {
    return <Comp {...props} />;
  } catch (e) {
    console.error('[VideoCall] Error rendering RtcSurfaceView:', e);
    return <View style={[props.style, { backgroundColor: '#000' }]} />;
  }
};

class CallErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CallErrorBoundary] Caught error in VideoCallScreen:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#050101', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Video Call Failed
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

/**
 * Owns the Agora engine for the duration of the video call and renders the
 * remote participant's video surface. Controls are exposed imperatively via
 * the ref so the screen can wire them to the existing UI buttons.
 *
 * The engine is created once per mount and only re-created if the channel
 * credentials change. uid 0 is used when joining — the SDK assigns each
 * participant a unique uid — which is why the same backend token works for
 * both sides.
 */
const AgoraVideoView = forwardRef(
  (
    {
      appId,
      token,
      channelName,
      cameraEnabled,
      onRemoteVideoActiveChange,
      onRemoteJoinedChange,
      onRemoteLeft,
      onFailedToConnect,
      onEngineError,
      onJoinSuccess,
    },
    ref
  ) => {
    const engineRef = useRef(null);
    const [remoteUid, setRemoteUid] = useState(null);
    const [remoteVideoActive, setRemoteVideoActive] = useState(false);
    // Live value of the camera toggle so async engine callbacks (join success)
    // can re-assert the preview without clobbering a user who turned it off.
    const cameraEnabledRef = useRef(cameraEnabled);

    const ensureLocalPreview = useCallback(() => {
      const engine = engineRef.current;
      if (!engine || !cameraEnabledRef.current) return;

      try { engine.enableVideo(); } catch (e) {}
      try { engine.enableLocalVideo(true); } catch (e) {}
      try { engine.startPreview(); } catch (e) {}
      try { engine.muteLocalVideoStream(false); } catch (e) {}
    }, []);

    useEffect(() => {
      cameraEnabledRef.current = cameraEnabled;
      const engine = engineRef.current;
      if (!engine) return;
      if (cameraEnabled) {
        try { engine.enableLocalVideo(true); } catch (e) {}
        try { engine.startPreview(); } catch (e) {}
        try { engine.muteLocalVideoStream(false); } catch (e) {}
        try { engine.updateChannelMediaOptions({ publishCameraTrack: true }); } catch (e) {}
      } else {
        try { engine.muteLocalVideoStream(true); } catch (e) {}
        try { engine.enableLocalVideo(false); } catch (e) {}
        try { engine.stopPreview(); } catch (e) {}
        try { engine.updateChannelMediaOptions({ publishCameraTrack: false }); } catch (e) {}
      }
    }, [cameraEnabled]);

    const onRemoteVideoActiveChangeRef = useRef(onRemoteVideoActiveChange);
    const onRemoteJoinedChangeRef = useRef(onRemoteJoinedChange);
    const onRemoteLeftRef = useRef(onRemoteLeft);
    const onFailedToConnectRef = useRef(onFailedToConnect);
    const onEngineErrorRef = useRef(onEngineError);
    const onJoinSuccessRef = useRef(onJoinSuccess);

    useEffect(() => { onRemoteVideoActiveChangeRef.current = onRemoteVideoActiveChange; });
    useEffect(() => { onRemoteJoinedChangeRef.current = onRemoteJoinedChange; });
    useEffect(() => { onRemoteLeftRef.current = onRemoteLeft; });
    useEffect(() => { onFailedToConnectRef.current = onFailedToConnect; });
    useEffect(() => { onEngineErrorRef.current = onEngineError; });
    useEffect(() => { onJoinSuccessRef.current = onJoinSuccess; });

    const setRemoteActive = useCallback((active) => {
      setRemoteVideoActive(active);
      if (onRemoteVideoActiveChangeRef.current) {
        onRemoteVideoActiveChangeRef.current(active);
      }
    }, []);

    // Remote "joined" is tracked separately from "video active": a participant
    // who joins but has their camera off (or whose video stalls) is still in
    // the call, so the caller must not keep showing "Connecting…" or hit the
    // "remote never joined" timeout.
    const setRemoteJoined = useCallback((joined) => {
      if (onRemoteJoinedChangeRef.current) {
        onRemoteJoinedChangeRef.current(joined);
      }
    }, []);

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
          engine.enableVideo();

          // Start local camera capture preview
          try {
            const previewRet = engine.startPreview();
            if (previewRet !== 0) console.log('[Agora] startPreview result:', previewRet);
          } catch (e) {}

          engine.registerEventHandler({
            onJoinChannelSuccess: () => {
              if (!active) return;
              joinedSuccessfully = true;
              console.log('[Agora] Joined channel:', channelName);
              // Route audio through the loudspeaker by default — mirrors the
              // old Zego config so "no audio" is never mistaken for a failure.
              try { engine.setEnableSpeakerphone(true); } catch (e) {}
              ensureLocalPreview();
              if (onJoinSuccessRef.current) onJoinSuccessRef.current();
            },
            onUserJoined: (connection, uid) => {
              if (!active) return;
              console.log('[Agora] Remote user joined:', uid);
              setRemoteUid(uid);
              setRemoteJoined(true);
            },
            onUserOffline: (connection, uid, reason) => {
              if (!active) return;
              console.log('[Agora] Remote user offline:', uid, 'reason:', reason);
              setRemoteUid(null);
              setRemoteActive(false);
              setRemoteJoined(false);
              // In a 1-on-1 call the other participant leaving ends the call —
              // same behavior as Zego's onOnlySelfInRoom.
              if (onRemoteLeftRef.current) onRemoteLeftRef.current();
            },
            onFirstRemoteVideoDecoded: (connection, uid) => {
              if (!active) return;
              console.log('[Agora] First remote video decoded for uid:', uid);
              setRemoteUid(uid);
              setRemoteActive(true);
              setRemoteJoined(true);
            },
            onRemoteVideoStateChanged: (connection, uid, state) => {
              if (!active) return;
              // Decoding (2) → video playing. Stopped (0) → camera off/black —
              // fade back to the avatar, mirroring Zego's avatarBuilder.
              const decoded = state === RemoteVideoState.RemoteVideoStateDecoding;
              console.log('[Agora] Remote video state:', uid, state, 'decoded:', decoded);
              setRemoteUid(uid);
              setRemoteActive(decoded);
              setRemoteJoined(true);
            },
            onRemoteAudioStateChanged: (connection, uid, state) => {
              if (!active) return;
              // Decoding (2) → remote audio is playing. Extra "remote is in the
              // call" signal for participants whose camera is off, so the UI
              // never treats an audio-only participant as "never joined".
              if (state === RemoteAudioState.RemoteAudioStateDecoding) {
                console.log('[Agora] Remote audio playing:', uid);
                setRemoteUid(uid);
                setRemoteJoined(true);
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
            publishCameraTrack: !!cameraEnabled,
            publishMicrophoneTrack: true,
            autoSubscribeAudio: true,
            autoSubscribeVideo: true,
          });
          console.log('[Agora] joinChannel result:', ret);
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
      setCameraEnabled(enabled) {
        const engine = engineRef.current;
        if (!engine) return;
        if (enabled) {
          try { engine.enableLocalVideo(true); } catch (e) {}
          try { engine.startPreview(); } catch (e) {}
          try { engine.muteLocalVideoStream(false); } catch (e) {}
          try { engine.updateChannelMediaOptions({ publishCameraTrack: true }); } catch (e) {}
        } else {
          try { engine.muteLocalVideoStream(true); } catch (e) {}
          try { engine.enableLocalVideo(false); } catch (e) {}
          try { engine.stopPreview(); } catch (e) {}
          try { engine.updateChannelMediaOptions({ publishCameraTrack: false }); } catch (e) {}
        }
      },
      restartLocalPreview: ensureLocalPreview,
      switchCamera() {
        if (!engineRef.current) return;
        try { engineRef.current.switchCamera(); } catch (e) {}
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

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {remoteUid != null && remoteVideoActive && (
          <SafeRemoteVideoView
            canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }}
            zOrderMediaOverlay={Platform.OS === 'android'}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
    );
  }
);

function VideoCallScreenComponent() {
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
  const [myAvatarUrl, setMyAvatarUrl] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(null);
  const [lowBalanceMessage, setLowBalanceMessage] = useState('');
  const [permission, setPermission] = useState({ camera: false, mic: false });
  // True once the permission prompts have finished (granted or denied). The
  // real-call verdict below must wait for this — otherwise a fresh screen
  // would be misread as "permissions denied" while the prompts are pending.
  const [permissionsResolved, setPermissionsResolved] = useState(false);
  const [isListener, setIsListener] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [callCancelledMessage, setCallCancelledMessage] = useState(
    'The call was cancelled by the user.'
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const remoteAvatarOpacity = useRef(new Animated.Value(1)).current;
  const agoraRef = useRef(null);
  const callEndedRef = useRef(false);
  const cancelledExitTimerRef = useRef(null);
  const remoteJoinedRef = useRef(false);
  // Agora credentials — the backend mints a session-scoped token for video
  // calls (agoraAppId + agoraToken). Falls back to the bundled App ID only
  // when the server did not attach one.
  const resolvedAppId = agoraAppId || AGORA_APP_ID;

  // Live camera (fallback path) only needs the camera permission. The Agora
  // path joins the real call when EITHER camera or mic is granted, so a
  // denied mic doesn't silently remove all audio (and vice-versa).
  const showCamera = permission.camera && !isCameraOff && !cameraError;
  const canJoinRealCall = permission.camera || permission.mic;

  const hasPlaceholderAppId = !resolvedAppId || /your_agora|placeholder|change_me/i.test(resolvedAppId);
  const canUseAgora =
    !isExpoGo &&
    !!AgoraSDK &&
    typeof createAgoraRtcEngine === 'function' &&
    !hasPlaceholderAppId &&
    !!agoraToken &&
    !!roomId &&
    canJoinRealCall;

  // ── Diagnostic: log every factor that decides whether Agora can start ──
  useEffect(() => {
    console.log('[VideoCall] ── Agora readiness check ──');
    console.log('[VideoCall]   isExpoGo:', isExpoGo);
    console.log('[VideoCall]   AgoraSDK loaded:', !!AgoraSDK);
    console.log('[VideoCall]   resolvedAppId:', resolvedAppId ? resolvedAppId.substring(0, 8) + '...' : '(empty)');
    console.log('[VideoCall]   hasPlaceholderAppId:', hasPlaceholderAppId);
    console.log('[VideoCall]   agoraToken:', agoraToken ? agoraToken.substring(0, 12) + '...' : '(empty)');
    console.log('[VideoCall]   roomId:', roomId || '(empty)');
    console.log('[VideoCall]   permission.camera:', permission.camera, 'mic:', permission.mic);
    console.log('[VideoCall]   canUseAgora:', canUseAgora);
    console.log('[VideoCall]   callId:', callId);
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
          params: { name, sessionId: callId, listenerId, callType: 'video' },
        });
      }
    }, 800);
  }, [callId, name, listenerId, roomId, router]);

  // The remote avatar fades out once the remote camera feed actually decodes.
  // "Joined" (audio or video) is tracked separately so the UI never falls back
  // to "Connecting…" for a participant who is in the call with their camera off.
  useEffect(() => {
    remoteJoinedRef.current = remoteJoined;
  }, [remoteJoined]);

  useEffect(() => {
    Animated.timing(remoteAvatarOpacity, {
      toValue: remoteVideoActive ? 0 : 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [remoteVideoActive, remoteAvatarOpacity]);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
        const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
        console.log('Permissions - Camera:', cameraStatus, 'Mic:', micStatus);
        setPermission({
          camera: cameraStatus === 'granted',
          mic: micStatus === 'granted',
        });
      } catch (err) {
        console.log('Failed to request video/mic permissions:', err);
        setPermission({ camera: false, mic: false });
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
          // Build my own avatar URL the same way the profile screen does.
          const rawGender = user.gender || 'Male';
          const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
          const avatarIndex = user.avatarIndex !== undefined && user.avatarIndex !== null ? String(user.avatarIndex) : '0';
          setMyAvatarUrl(getAvatarUrl(normalizedGender, avatarIndex));
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
        if (data.coins >= 60) {
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

  // The remote participant hung up / dropped — treat it as the call ending
  // (mirrors Zego's onOnlySelfInRoom + onCallEnd behavior).
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
    setCallCancelledMessage("Couldn't connect to the video call. Please try again.");
    setShowCallCancelled(true);
    cancelledExitTimerRef.current = setTimeout(() => {
      setShowCallCancelled(false);
      finishAndExit();
    }, 3500);
  }, [finishAndExit]);

  // If the remote never joins the channel, end the call after a generous
  // window instead of leaving "Connecting…" (and billing) running forever.
  // This keys off the remote JOINING (audio or video), not video decoding, so
  // a camera-off participant is never treated as "never joined".
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

  // When the real Agora call cannot start, the old code silently showed the
  // avatar-preview "fallback" UI — the user saw no video, heard no audio, and
  // was still billed. Diagnose WHY we're stuck on the fallback and surface a
  // clear message, then end the call so billing stops. (The remote-join
  // timeout above only applies once the Agora path is active.)
  const fallbackDiagnosedRef = useRef(false);
  useEffect(() => {
    if (canUseAgora || !permissionsResolved || fallbackDiagnosedRef.current) return;
    if (callEndedRef.current) return;

    let message = '';
    if (isExpoGo) {
      message =
        "Video calls need the development or production build — they can't run inside Expo Go. Please install the app build to make video calls.";
    } else if (!AgoraSDK) {
      message =
        "The video call module isn't available in this build. Please update the app to the latest version.";
    } else if (!permission.camera && !permission.mic) {
      message =
        'Camera and microphone access is required for video calls. Please allow both and start the call again.';
    } else if (!agoraToken || !roomId || hasPlaceholderAppId) {
      message =
        "Video call couldn't connect — the server isn't configured for video calls yet. Please try again later.";
    } else {
      message =
        "Video call connection unavailable. Please check your network and permissions and try again.";
    }

    console.log('[VideoCall] Real call unavailable, ending:', message);
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
    permission.camera,
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

  const toggleCamera = useCallback(() => {
    setIsCameraOff(prev => {
      const next = !prev;
      // Clear any previous mount error so the camera can retry when re-enabled.
      if (!next) setCameraError(false);
      if (agoraRef.current) agoraRef.current.setCameraEnabled(!next);
      return next;
    });
  }, []);

  const handleSwitchCamera = useCallback(() => {
    if (agoraRef.current) agoraRef.current.switchCamera();
  }, []);

  // Tap anywhere on the screen (except the video feeds) toggles all controls.
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

  if (canUseAgora) {
    return (
      <Pressable style={styles.container} onPress={toggleControls}>
        <LinearGradient
          colors={['#2E0A0A', '#140505', '#050101']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Remote participant — the avatar stands in until their live camera
            feed decodes (and whenever they turn their camera off). */}
        <Animated.View
          style={[styles.remoteAvatarLayer, { opacity: remoteAvatarOpacity }]}
          pointerEvents="none"
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
              {!remoteJoined
                ? 'Connecting...'
                : remoteVideoActive
                  ? 'Video Call in Progress'
                  : 'Call in Progress'}
            </Text>
          </View>
        </Animated.View>

        {/* Agora engine + remote video surface */}
        <AgoraVideoView
          ref={agoraRef}
          appId={resolvedAppId}
          token={agoraToken}
          channelName={roomId}
          cameraEnabled={showCamera}
          onRemoteVideoActiveChange={setRemoteVideoActive}
          onRemoteJoinedChange={setRemoteJoined}
          onRemoteLeft={handleRemoteLeft}
          onFailedToConnect={handleAgoraFailedToConnect}
          onEngineError={(err, msg) => console.log('[Agora] Engine error:', err, msg)}
          onJoinSuccess={() => {
            // Toggle camera off then on immediately when call connects for both users and listeners
            setTimeout(() => {
              toggleCamera();
              setTimeout(() => {
                toggleCamera();
              }, 300);
            }, 100);
          }}
        />

        {/* Call duration timer — centered near the top with enough clearance
            below the status bar / notch. Always visible while the call is
            connected (not tied to the controls toggle). */}
        <View style={[styles.topBar, { paddingTop: insets.top + hp(12) }]} pointerEvents="none">
          {remoteJoined && (
            <View style={styles.topBarTimerWrap}>
              <CallTimer active />
            </View>
          )}
        </View>

        {/* Self-view preview — my own live camera in the bottom-right corner.
            Like the main video feeds, this is NOT toggled by the tap gesture. */}
        <View style={styles.selfPreview} pointerEvents="none">
          <View style={styles.selfCamera}>
            {showCamera && !!AgoraSDK ? (
              <SafeLocalVideoView
                key="agora-local"
                canvas={{
                  uid: 0,
                  // Fill (crop) so the camera covers the whole self-view with
                  // no black bars on the left/right, matching the container.
                  renderMode: RenderModeType.RenderModeHidden,
                  mirrorMode: VideoMirrorModeType.VideoMirrorModeEnabled,
                }}
                zOrderMediaOverlay={Platform.OS === 'android'}
                zOrderOnTop={Platform.OS === 'android'}
                style={StyleSheet.absoluteFill}
              />
            ) : myAvatarUrl ? (
              <Image source={{ uri: myAvatarUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Ionicons name="videocam-off" size={32} color="#6B7280" />
            )}
          </View>
        </View>

        {/* Floating overlay — tap anywhere toggles it (video feeds stay) */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
        >
          {/* Balance badge + Recharge + Gift — stacked on the top right */}
          <View style={styles.floatingTopRight}>
            {currentCoins !== null && !isListener && (
              <View style={styles.coinsBadge}>
                <Text style={{ fontSize: 12, marginRight: 4 }}>🪙</Text>
                <Text style={styles.coinsBadgeText}>{currentCoins}</Text>
              </View>
            )}
            {!isListener && (
              <TouchableOpacity
                style={styles.floatingRechargeGift}
                onPress={(e) => { e.stopPropagation?.(); setShowRecharge(true); }}
                activeOpacity={0.8}
              >
                <Ionicons name="wallet-outline" size={24} color="#10B981" />
                <Text style={[styles.floatingRechargeText, { color: '#10B981' }]}>Recharge</Text>
              </TouchableOpacity>
            )}

            {!isListener && (
              <TouchableOpacity
                style={styles.floatingRechargeGift}
                onPress={(e) => { e.stopPropagation?.(); setShowGiftPopup(true); }}
                activeOpacity={0.8}
              >
                <Ionicons name="gift-outline" size={24} color="#10B981" />
                <Text style={[styles.floatingRechargeText, { color: '#10B981' }]}>Gift</Text>
              </TouchableOpacity>
            )}
          </View>

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

        {/* Bottom controls dock — replaces Zego's native bottom bar. The
            layer is anchored to the bottom of the screen so the dock inside
            it renders at the bottom, not off-screen. */}
        <Animated.View
          style={[styles.agoraControlsLayer, { opacity: controlsOpacity }]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          <View style={[styles.agoraControlsWrap, { paddingBottom: Math.max(insets.bottom, vs(12)) }]}>
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
                  id: 'camera',
                  icon: 'videocam',
                  iconActive: 'videocam-off',
                  label: 'Camera',
                  active: isCameraOff,
                  onPress: toggleCamera,
                },
                {
                  id: 'switch',
                  icon: 'camera-reverse',
                  label: 'Flip',
                  active: false,
                  onPress: handleSwitchCamera,
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

  return (
    <Pressable style={styles.container} onPress={toggleControls}>
      <LinearGradient
        colors={['#2E0A0A', '#140505', '#050101']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={{ opacity: controlsOpacity }} pointerEvents={controlsVisible ? 'auto' : 'none'}>
      {/* Timer sits clearly below the notification bar — insets.top clears
          the status bar/notch, and hp(12) adds a consistent %-based gap
          so it stays visible on every screen size. */}
      <View style={[styles.topBar, { paddingTop: insets.top + hp(12) }]}>
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
        </Animated.View>
      )}

      <View style={styles.videoArea}>
        {/* Remote participant — the avatar stands in for their live feed (only
            the Agora path on native builds streams their actual camera). */}
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
        </Animated.View>
      </View>

      {/* Self-view preview — my own live camera in the bottom-right corner.
          Like the main video feeds, this is NOT toggled by the tap gesture. */}
      <View style={styles.selfPreview} pointerEvents="none">
        <View style={styles.selfCamera}>
          {showCamera ? (
            <CameraView
              key="front"
              style={StyleSheet.absoluteFill}
              facing="front"
              mirror
              active
              onMountError={() => setCameraError(true)}
            />
          ) : myAvatarUrl ? (
            <Image source={{ uri: myAvatarUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Ionicons name="videocam-off" size={32} color="#6B7280" />
          )}
        </View>
      </View>

      {/* Safety — left side, middle of the page */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
        pointerEvents={controlsVisible ? 'box-none' : 'none'}
      >
        <TouchableOpacity
          style={styles.safetyFloat}
          onPress={(e) => { e.stopPropagation?.(); setShowSafety(true); }}
          activeOpacity={0.8}
          accessibilityLabel="Open safety guidance"
        >
          <Ionicons name="shield-checkmark" size={26} color="#4ADE80" />
        </TouchableOpacity>
      </Animated.View>

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
                onPress: () => setIsMuted(!isMuted),
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
                id: 'camera',
                icon: 'videocam',
                iconActive: 'videocam-off',
                label: 'Camera',
                active: isCameraOff,
                onPress: () => {
                  const next = !isCameraOff;
                  setIsCameraOff(next);
                  // Clear any previous mount error so the camera can retry when re-enabled.
                  if (!next) setCameraError(false);
                },
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

  // Full-screen layer that hosts the remote avatar while their video is not
  // decoded (connecting / camera off).
  remoteAvatarLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
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
  selfPreview: {
    position: 'absolute',
    bottom: vs(120),
    right: s(16),
    zIndex: 100,
    elevation: 10,
  },
  selfCamera: {
    width: SCREEN_WIDTH * 0.22,
    height: SCREEN_WIDTH * 0.3,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
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
  fallbackTopRight: {
    position: 'absolute',
    top: hp(16),
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

  // Agora mode floating elements
  floatingTopRight: {
    position: 'absolute',
    top: SH * 0.08,
    right: s(12),
    alignItems: 'flex-end',
    gap: vs(10),
    zIndex: 999,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: s(14),
    paddingVertical: vs(6),
    borderRadius: 20,
    gap: s(6),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  coinsBadgeText: {
    color: '#F59E0B',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_700Bold',
  },
  floatingRechargeText: {
    color: '#fff',
    fontSize: ms(13.5, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },

  // Bottom controls dock (Agora mode) — sits where Zego's native bar used to.
  // The layer is absolutely anchored to the bottom of the screen; the dock is
  // a normal in-flow child so the layer's height matches the dock.
  agoraControlsLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
    elevation: 60,
  },
  agoraControlsWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: vs(10),
  },

  giftNotification: {
    position: 'absolute',
    top: hp(15),
    left: wp(5),
    right: wp(5),
    zIndex: 1000,
  },
  giftNotifContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  giftNotifIcon: {
    fontSize: ms(40),
  },
  giftNotifTitle: {
    color: '#fff',
    fontSize: ms(16),
    fontFamily: 'Inter_700Bold',
  },
  giftNotifText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
  },
});

export default function VideoCallScreen(props) {
  const router = useRouter();
  return (
    <CallErrorBoundary onDismiss={() => router.back()}>
      <VideoCallScreenComponent {...props} />
    </CallErrorBoundary>
  );
}
