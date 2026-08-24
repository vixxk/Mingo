import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions, BackHandler, Pressable, Platform, AppState } from 'react-native';
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
import NetworkQualityIndicator from '../../components/call/NetworkQualityIndicator';
import { callAPI, walletAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import { incomingCallNative } from '../../utils/incomingCall';
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
  AudioProfileType,
  AudioScenarioType,
} = AgoraSDK || {};

// On Android, TextureView (RtcTextureView) is preferred for small floating subviews / overlays
// so it renders inside the view hierarchy without SurfaceFlinger occlusion or black rectangle issues.
const LocalVideoView = (Platform.OS === 'android' && RtcTextureView) ? RtcTextureView : RtcSurfaceView;

const SafeLocalVideoView = ({ canvas, style, fallbackAvatarUrl, zOrderMediaOverlay, zOrderOnTop }) => {
  const Comp = LocalVideoView || RtcSurfaceView || RtcTextureView;
  if (!Comp) {
    return fallbackAvatarUrl ? (
      <Image source={{ uri: fallbackAvatarUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <View style={[style, { backgroundColor: '#050101', justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="videocam-off" size={28} color="#9CA3AF" />
      </View>
    );
  }

  const compProps = { canvas, style };
  if (Platform.OS === 'android') {
    compProps.zOrderMediaOverlay = zOrderMediaOverlay !== undefined ? zOrderMediaOverlay : true;
    compProps.zOrderOnTop = zOrderOnTop !== undefined ? zOrderOnTop : true;
  }

  try {
    return <Comp {...compProps} />;
  } catch (e) {
    console.error('[VideoCall] Error rendering LocalVideoView:', e);
    return fallbackAvatarUrl ? (
      <Image source={{ uri: fallbackAvatarUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <View style={[style, { backgroundColor: '#050101', justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="videocam-off" size={28} color="#9CA3AF" />
      </View>
    );
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

const SafeCameraView = (props) => {
  if (!CameraView || (typeof CameraView !== 'function' && typeof CameraView !== 'object')) {
    return <View style={[props.style, { backgroundColor: '#111' }]} />;
  }
  try {
    return <CameraView {...props} />;
  } catch (e) {
    console.error('[VideoCall] Error rendering CameraView:', e);
    return <View style={[props.style, { backgroundColor: '#111' }]} />;
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
      initialIsSpeaker = false,
      initialIsMuted = false,
      onRemoteVideoActiveChange,
      onRemoteJoinedChange,
      onRemoteLeft,
      onFailedToConnect,
      onEngineError,
      onJoinSuccess,
      onNetworkQuality,
      onConnectionStateChanged,
    },
    ref
  ) => {
    const engineRef = useRef(null);
    const [remoteUid, setRemoteUid] = useState(null);
    const [remoteVideoActive, setRemoteVideoActive] = useState(false);
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
    const onNetworkQualityRef = useRef(onNetworkQuality);
    const onConnectionStateChangedRef = useRef(onConnectionStateChanged);

    useEffect(() => { onRemoteVideoActiveChangeRef.current = onRemoteVideoActiveChange; });
    useEffect(() => { onRemoteJoinedChangeRef.current = onRemoteJoinedChange; });
    useEffect(() => { onRemoteLeftRef.current = onRemoteLeft; });
    useEffect(() => { onFailedToConnectRef.current = onFailedToConnect; });
    useEffect(() => { onEngineErrorRef.current = onEngineError; });
    useEffect(() => { onJoinSuccessRef.current = onJoinSuccess; });
    useEffect(() => { onNetworkQualityRef.current = onNetworkQuality; });
    useEffect(() => { onConnectionStateChangedRef.current = onConnectionStateChanged; });

    const setRemoteActive = useCallback((active) => {
      setRemoteVideoActive(active);
      if (onRemoteVideoActiveChangeRef.current) {
        onRemoteVideoActiveChangeRef.current(active);
      }
    }, []);

    const setRemoteJoined = useCallback((joined) => {
      if (onRemoteJoinedChangeRef.current) {
        onRemoteJoinedChangeRef.current(joined);
      }
    }, []);

    useEffect(() => {
      if (!appId || !token || !channelName) return;

      let engine = null;
      let active = true;
      let joinedSuccessfully = false;

      const setup = () => {
        try {
          engine = createAgoraRtcEngine();
          engineRef.current = engine;

          const initRet = engine.initialize({ appId });
          console.log('[Agora] initialize result:', initRet);
          if (initRet !== 0) {
            console.error('[Agora] Engine initialize failed with code:', initRet);
            if (onEngineErrorRef.current) onEngineErrorRef.current(initRet, 'Engine initialize failed');
            return;
          }
          // Tell Agora to keep audio streaming when the app is in the background
          try { engine.setParameters('{"che.audio.keep.audiosession":true}'); } catch (e) {}
          try { engine.setParameters('{"che.audio.opensl":true}'); } catch (e) {}
          engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
          engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
          if (AudioProfileType && AudioScenarioType) {
            try {
              engine.setAudioProfile(
                AudioProfileType.AudioProfileMusicStandard || 2,
                AudioScenarioType.AudioScenarioGameStreaming || 3
              );
            } catch (e) {
              console.log('[Agora] setAudioProfile failed in video call:', e.message);
            }
          }
          engine.enableVideo();
          try { engine.enableAudio(); } catch (e) {}
          try { engine.enableLocalAudio(true); } catch (e) {}
          try { engine.adjustRecordingSignalVolume(400); } catch (e) {}
          try { engine.adjustPlaybackSignalVolume(400); } catch (e) {}

          try {
            const previewRet = engine.startPreview();
            console.log('[Agora] startPreview result:', previewRet);
          } catch (e) { console.log('[Agora] startPreview error:', e.message); }

          engine.registerEventHandler({
            onJoinChannelSuccess: () => {
              if (!active) return;
              joinedSuccessfully = true;
              console.log('[Agora] Joined channel:', channelName);
              // Route audio through earpiece or speaker according to user preference
              try { engine.setEnableSpeakerphone(!!initialIsSpeaker); } catch (e) {}
              // Re-assert audio capture & subscription after joining.
              try { engine.enableLocalAudio(true); } catch (e) {}
              try { engine.muteLocalAudioStream(!!initialIsMuted); } catch (e) {}
              try { engine.muteAllRemoteAudioStreams(false); } catch (e) {}
              ensureLocalPreview();

              if (onJoinSuccessRef.current) onJoinSuccessRef.current();
            },
            onUserJoined: (connection, uid) => {
              if (!active) return;
              console.log('[Agora] Remote user joined:', uid);
              setRemoteUid(uid);
              setRemoteActive(true);
              setRemoteJoined(true);
            },
            onUserOffline: (connection, uid, reason) => {
              if (!active) return;
              console.log('[Agora] Remote user offline:', uid, 'reason:', reason);
              // Hide the remote video surface so Agora does not render a grey box,
              // showing the avatar overlay instead while keeping the call active.
              setRemoteActive(false);
              console.log('[Agora] Remote user went offline — showing avatar layer and keeping call alive');
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
              // state 0 = Stopped, 1 = Starting, 2 = Decoding, 3 = Frozen, 4 = Failed
              const isPlaying = state !== 0 && state !== RemoteVideoState?.RemoteVideoStateStopped && state !== 3;
              console.log('[Agora] Remote video state:', uid, state, 'isPlaying:', isPlaying);
              setRemoteUid(uid);
              setRemoteActive(isPlaying);
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
            onNetworkQuality: (connection, uid, txQuality, rxQuality) => {
              if (!active) return;
              let targetUid = uid;
              let tx = txQuality;
              let rx = rxQuality;
              if (typeof connection === 'number') {
                targetUid = connection;
                tx = uid;
                rx = txQuality;
              }
              if (onNetworkQualityRef.current) {
                onNetworkQualityRef.current(targetUid, tx, rx);
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
              if (!active) return;
              console.log('[Agora] Connection state:', state, 'reason:', reason);
              if (onConnectionStateChangedRef.current) {
                onConnectionStateChangedRef.current(state, reason);
              }
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
            publishMicrophoneTrack: !initialIsMuted,
            autoSubscribeAudio: true,
            autoSubscribeVideo: true,
          });
          console.log('[Agora] joinChannel result:', ret, '(token:', token ? token.substring(0, 12) + '...' : 'null', ', channel:', channelName, ', camera:', !!cameraEnabled, ')');
          if (ret !== 0) {
            console.error('[Agora] joinChannel failed with code:', ret);
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
      ensureBackgroundAudio(isMuted) {
        if (!engineRef.current) return;
        try {
          engineRef.current.enableAudio();
          engineRef.current.enableLocalAudio(true);
          engineRef.current.muteLocalAudioStream(!!isMuted);
          engineRef.current.muteAllRemoteAudioStreams(false);
          engineRef.current.adjustRecordingSignalVolume(400);
          engineRef.current.adjustPlaybackSignalVolume(400);
        } catch (e) {
          console.log('[Agora] Background audio keepalive error:', e.message);
        }
      },
      leave() {
        if (!engineRef.current) return;
        try { engineRef.current.leaveChannel(); } catch (e) {}
      },
    }));

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {remoteUid != null && (
          <SafeRemoteVideoView
            canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }}
            style={[StyleSheet.absoluteFill, !remoteVideoActive && { opacity: 0 }]}
          />
        )}
      </View>
    );
  }
);

function VideoCallScreenComponent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const {
    name = 'Listener',
    listenerId = '',
    avatarIndex = '0',
    gender = 'Female',
    agoraAppId,
    agoraToken,
  } = rawParams;

  const callId = String(rawParams.callId || rawParams.sessionId || rawParams.id || rawParams._id || '');
  const roomId = String(rawParams.roomId || '');

  const [showSafety, setShowSafety] = useState(false);
  const [showEndCallPopup, setShowEndCallPopup] = useState(false);
  const [showCallCancelled, setShowCallCancelled] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [receivedGift, setReceivedGift] = useState(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState('');
  const initialIsSpeaker = rawParams.isSpeaker ? rawParams.isSpeaker === 'true' : true;
  const initialIsMuted = rawParams.isMuted === 'true';
  const initialIsCameraOff = rawParams.isCameraOff === 'true';
  const [isMuted, setIsMuted] = useState(initialIsMuted);
  const [isSpeaker, setIsSpeaker] = useState(initialIsSpeaker);
  const [isCameraOff, setIsCameraOff] = useState(initialIsCameraOff);
  const [currentCoins, setCurrentCoins] = useState(null);
  const [lowBalanceMessage, setLowBalanceMessage] = useState('');
  const [permission, setPermission] = useState({ camera: true, mic: true });
  // True once the permission prompts have finished (granted or denied). The
  // real-call verdict below must wait for this — otherwise a fresh screen
  // would be misread as "permissions denied" while the prompts are pending.
  const [permissionsResolved, setPermissionsResolved] = useState(false);
  const [isListener, setIsListener] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [networkQuality, setNetworkQuality] = useState('strong');
  const localQualityRef = useRef(1);
  const remoteQualityRef = useRef(1);
  const qualityHistoryRef = useRef([]);

  const updateOverallQuality = useCallback(() => {
    const qLocal = localQualityRef.current;
    const qRemote = remoteQualityRef.current;
    const currentSample = Math.max(qLocal, qRemote);

    // Maintain a rolling sample buffer (4 samples) to filter out single-second network spikes
    const history = qualityHistoryRef.current;
    history.push(currentSample);
    if (history.length > 4) history.shift();

    const avgQuality = history.reduce((acc, val) => acc + val, 0) / history.length;
    const maxQuality = Math.max(...history);

    let nextState = 'strong';
    if (maxQuality >= 6 || avgQuality >= 5.5) {
      nextState = 'reconnecting';
    } else if (maxQuality >= 4 || avgQuality >= 3.8) {
      nextState = 'poor';
    } else if (maxQuality === 3 || avgQuality >= 2.2) {
      nextState = 'medium';
    } else {
      nextState = 'strong';
    }

    setNetworkQuality(nextState);
  }, []);

  const handleNetworkQuality = useCallback((uid, txQuality, rxQuality) => {
    const quality = Math.max(txQuality || 1, rxQuality || 1);
    if (uid === 0) {
      localQualityRef.current = quality;
    } else {
      remoteQualityRef.current = quality;
    }
    updateOverallQuality();
  }, [updateOverallQuality]);

  const handleAgoraConnectionStateChanged = useCallback((state, reason) => {
    if (state === 4 || state === 5 || state === 1) {
      setNetworkQuality('reconnecting');
    } else if (state === 3) {
      updateOverallQuality();
    }
  }, [updateOverallQuality]);
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

  useEffect(() => {
    Animated.timing(remoteAvatarOpacity, {
      toValue: remoteVideoActive ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [remoteVideoActive, remoteAvatarOpacity]);

  const effectiveAgoraToken = currentAgoraToken || agoraToken;
  const effectiveAgoraAppId = currentAgoraAppId || agoraAppId;

  // Agora credentials — the backend mints a session-scoped token for video
  // calls (agoraAppId + agoraToken). Falls back to the bundled App ID only
  // when the server did not attach one.
  const resolvedAppId = effectiveAgoraAppId || AGORA_APP_ID;

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
    !!effectiveAgoraToken &&
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
    console.log('[VideoCall]   isListener:', isListener);
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

    // Stop the foreground service — the call is over.
    incomingCallNative.stopCallService();

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
          params: { name, sessionId: callId || roomId, listenerId, callType: 'video' },
        });
      }
    }, 800);
  }, [callId, name, listenerId, roomId, router]);

  // When both participants successfully connect (video call timer starts), toggle camera off and back on after a small gap.
  // Skip this automatic toggle if the user explicitly chose to turn the camera off during the connecting phase.
  const cameraRestartDoneRef = useRef(initialIsCameraOff);
  useEffect(() => {
    if (remoteJoined && !cameraRestartDoneRef.current && !initialIsCameraOff) {
      cameraRestartDoneRef.current = true;
      console.log('[VideoCall] Video call timer started. Scheduling camera toggle (off then back on) after gap...');

      let timer2 = null;
      // Initial gap of 1.5 seconds after timer starts
      const timer1 = setTimeout(() => {
        if (callEndedRef.current) return;
        console.log('[VideoCall] Toggling camera button OFF...');
        setIsCameraOff(true);
        if (agoraRef.current) {
          try { agoraRef.current.setCameraEnabled(false); } catch (e) {}
        }

        // Small gap of 800ms while camera is off
        timer2 = setTimeout(() => {
          if (callEndedRef.current) return;
          console.log('[VideoCall] Toggling camera button back ON...');
          setIsCameraOff(false);
          setCameraError(false);
          if (agoraRef.current) {
            try { agoraRef.current.setCameraEnabled(true); } catch (e) {}
          }
        }, 800);
      }, 1500);

      return () => {
        clearTimeout(timer1);
        if (timer2) clearTimeout(timer2);
      };
    }
  }, [remoteJoined, initialIsCameraOff]);

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
          let url = user.avatarUrl || user.profileImage;
          if (!url) {
            const rawGender = user.gender || 'Male';
            const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
            const avatarIdx = user.avatarIndex !== undefined && user.avatarIndex !== null ? String(user.avatarIndex) : '0';
            url = getAvatarUrl(normalizedGender, avatarIdx);
          }
          setMyAvatarUrl(url);
        } else {
          setIsListener(false);
          setMyAvatarUrl(getAvatarUrl('Male', '0'));
        }
      } catch {
        setIsListener(false);
        setMyAvatarUrl(getAvatarUrl('Male', '0'));
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
      console.log('[VideoCall] Received call_ended socket event:', data);
      const incId = String(data?.sessionId || data?.callId || data?.id || '');
      const curId = String(callId || '');
      if (!incId || !curId || incId === curId || (data?.roomId && data.roomId === roomId)) {
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

  // Keep call audio and microphone active when app transitions to background / another app
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('[VideoCall] AppState change:', nextAppState);
      if (agoraRef.current && !callEndedRef.current) {
        agoraRef.current.ensureBackgroundAudio?.(isMuted);
        if (nextAppState === 'active') {
          try {
            agoraRef.current.ensureBackgroundAudio?.(isMuted);
            agoraRef.current.setSpeaker?.(isSpeaker);
            agoraRef.current.setCameraEnabled?.(!isCameraOff);
            agoraRef.current.restartLocalPreview?.();
          } catch (e) {}
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isMuted, isSpeaker, isCameraOff]);

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
      <View style={styles.container}>
        <LinearGradient
          colors={['#2E0A0A', '#140505', '#050101']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Agora engine + remote video surface */}
        <AgoraVideoView
          ref={agoraRef}
          appId={resolvedAppId}
          token={effectiveAgoraToken}
          channelName={roomId}
          cameraEnabled={showCamera}
          initialIsSpeaker={initialIsSpeaker}
          initialIsMuted={initialIsMuted}
          onRemoteVideoActiveChange={setRemoteVideoActive}
          onRemoteJoinedChange={setRemoteJoined}
          onRemoteLeft={handleRemoteLeft}
          onFailedToConnect={handleAgoraFailedToConnect}
          onEngineError={(err, msg) => console.log('[Agora] Engine error:', err, msg)}
          onNetworkQuality={handleNetworkQuality}
          onConnectionStateChanged={handleAgoraConnectionStateChanged}
          onJoinSuccess={() => {
            console.log('[VideoCall] Agora joinChannel succeeded — local user is in the channel');

            // Start the foreground service so Android keeps Agora alive when
            // the user switches to another app / locks the screen.
            incomingCallNative.startCallService();

            // Start billing NOW that we're actually connected and can talk.
            if (callId && callId !== 'demo_zego_call' && callId !== 'test_call_id') {
              socketService.emit('start_call_billing', { sessionId: callId });
            }

            // Fallback: if onUserJoined / onRemoteAudioStateChanged never fires
            // (can happen on certain builds where Agora callbacks are delayed or
            // swallowed), mark remote as joined after a short grace period so the
            // UI transitions from "Connecting…" to "Call in Progress". Without
            // this the user sees "Connecting…" indefinitely even though both
            // participants are in the channel.
            setTimeout(() => {
              if (!remoteJoinedRef.current && !callEndedRef.current) {
                console.log('[VideoCall] Fallback: onUserJoined never fired — marking remote as joined');
                setRemoteJoined(true);
              }
            }, 8000);
          }}
        />

        {/* Remote participant — the avatar stands in until their live camera
            feed decodes (and whenever they turn their camera off). */}
        <Animated.View
          style={[styles.remoteAvatarLayer, { opacity: remoteAvatarOpacity }]}
          pointerEvents={remoteVideoActive ? 'none' : 'auto'}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: getAvatarUrl(gender, avatarIndex) }}
              style={styles.mainAvatar}
            />
          </View>
          <Text style={styles.callerName}>{name}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: '#22C55E' },
              ]}
            />
            <Text style={styles.statusText}>
              {remoteVideoActive ? 'Video Call in Progress' : 'Call in Progress'}
            </Text>
          </View>
        </Animated.View>

        {/* Call duration timer + Network Quality Indicator — centered near top */}
        <View style={[styles.topBar, { paddingTop: insets.top + hp(12) }]} pointerEvents="box-none">
          {remoteJoined && (
            <View style={styles.topBarTimerWrap} pointerEvents="box-none">
              <CallTimer active />
              <NetworkQualityIndicator quality={networkQuality} />
            </View>
          )}
        </View>

        {/* Self-view preview — my own live camera in the bottom-right corner. */}
        <View style={styles.selfPreview} pointerEvents="none">
          <View style={styles.selfCamera}>
            {showCamera && !!AgoraSDK ? (
              <SafeLocalVideoView
                key="agora-local"
                canvas={{
                  uid: 0,
                  renderMode: RenderModeType.RenderModeHidden,
                  mirrorMode: VideoMirrorModeType.VideoMirrorModeEnabled,
                }}
                style={StyleSheet.absoluteFill}
                zOrderMediaOverlay={Platform.OS === 'android'}
                zOrderOnTop={Platform.OS === 'android'}
                fallbackAvatarUrl={myAvatarUrl}
              />
            ) : myAvatarUrl ? (
              <View style={StyleSheet.absoluteFill}>
                <Image source={{ uri: myAvatarUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="videocam-off" size={24} color="rgba(255, 255, 255, 0.85)" />
                </View>
              </View>
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050101', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="videocam-off" size={28} color="#9CA3AF" />
              </View>
            )}
          </View>
        </View>

        {/* Floating overlay — controls stay permanently visible */}
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
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
        </View>

        {/* Bottom controls dock — permanently visible call controls */}
        <View
          style={styles.agoraControlsLayer}
          pointerEvents="box-none"
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
        </View>

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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2E0A0A', '#140505', '#050101']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="box-none">
      {/* Timer sits clearly below the notification bar — insets.top clears
          the status bar/notch, and hp(12) adds a consistent %-based gap
          so it stays visible on every screen size. */}
      <View style={[styles.topBar, { paddingTop: insets.top + hp(12) }]}>
        {/* Call duration timer — only appears once the call connects */}
        {remoteJoined && (
          <View style={styles.topBarTimerWrap} pointerEvents="box-none">
            <CallTimer active />
            <NetworkQualityIndicator quality={networkQuality} />
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
      </View>

      {/* Recharge + Gift — stacked on the top right (user only) */}
      {!isListener && (
        <View pointerEvents="box-none">
        <View style={styles.fallbackTopRight}>
          <TouchableOpacity
            style={styles.floatingRechargeGift}
            onPress={(e) => { e.stopPropagation?.(); setShowRecharge(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet-outline" size={18} color="#10B981" />
            <Text style={[styles.floatingRechargeText, { color: '#10B981' }]}>Recharge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingRechargeGift}
            onPress={(e) => { e.stopPropagation?.(); setShowGiftPopup(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="gift-outline" size={18} color="#10B981" />
            <Text style={[styles.floatingRechargeText, { color: '#10B981' }]}>Gift</Text>
          </TouchableOpacity>
        </View>
        </View>
      )}

      <View style={styles.videoArea}>
        {/* Remote participant — the avatar stands in for their live feed (only
            the Agora path on native builds streams their actual camera). */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: getAvatarUrl(gender, avatarIndex) }}
              style={styles.mainAvatar}
            />
          </View>
          <Text style={styles.callerName}>{name}</Text>
        </View>
      </View>

      {/* Self-view preview — my own live camera in the bottom-right corner. */}
      <View style={styles.selfPreview} pointerEvents="none">
        <View style={styles.selfCamera}>
          {showCamera ? (
            <SafeCameraView
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
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.safetyFloat}
          onPress={(e) => { e.stopPropagation?.(); setShowSafety(true); }}
          activeOpacity={0.8}
          accessibilityLabel="Open safety guidance"
        >
          <Ionicons name="shield-checkmark" size={26} color="#4ADE80" />
        </TouchableOpacity>
      </View>

      <View pointerEvents="box-none">
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
      </View>

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
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
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
    top: hp(14),
    right: s(12),
    alignItems: 'flex-end',
    gap: vs(8),
    zIndex: 999,
  },
  floatingRechargeGift: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    zIndex: 999,
  },

  // Agora mode floating elements
  floatingTopRight: {
    position: 'absolute',
    top: hp(14),
    right: s(12),
    alignItems: 'flex-end',
    gap: vs(8),
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
    fontSize: ms(12, 0.3),
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
