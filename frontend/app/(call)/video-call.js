import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions, BackHandler, Pressable } from 'react-native';
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
import CallCancelledPopup from '../../components/shared/CallCancelledPopup';
import GiftPopup from '../../components/shared/GiftPopup';
import GiftAnimationOverlay from '../../components/call/GiftAnimationOverlay';
import { callAPI, walletAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import { ZEGO_APP_ID, ZEGO_APP_SIGN } from '../../utils/zegoConfig';
import { ms, s, vs, SCREEN_WIDTH, hp, wp } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';

const { height: SH } = Dimensions.get('window');
const isExpoGo = Constants.appOwnership === 'expo';

let ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG, ZegoMenuBarButtonName, ZegoUIKit;
try {
  if (!isExpoGo) {
    const zegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn');
    ZegoUIKitPrebuiltCall = zegoModule.ZegoUIKitPrebuiltCall;
    ZegoMenuBarButtonName = zegoModule.ZegoMenuBarButtonName;
    ONE_ON_ONE_VIDEO_CALL_CONFIG =
      zegoModule.ONE_ON_ONE_VIDEO_CALL_CONFIG || ZegoMenuBarButtonName;
    // ZegoUIKit drives the actual camera device; used to flip front/back from
    // the floating overlay (the prebuilt SDK keeps its own menu bar button).
    const uikitModule = require('@zegocloud/zego-uikit-rn');
    ZegoUIKit = uikitModule.default || uikitModule;
  } else {
    console.log('Skipping ZegoCloud load in Expo Go mode');
  }
} catch (e) {
  console.log('ZegoCloud not available (Expo Go mode)');
}

const ZegoCallWrapper = React.memo(({ appId, appSign, userId, userName, roomId, onCallEnd, turnOnCamera = true, turnOnMic = true }) => {
  if (!ZegoUIKitPrebuiltCall) return null;

  // Remove Zego's built-in hang-up button so every end-call request goes
  // through the end-call confirmation popup (falls back to default if the
  // config keys are unavailable).
  const menuBar = ONE_ON_ONE_VIDEO_CALL_CONFIG?.bottomMenuBarConfig;
  const safeButtons = Array.isArray(menuBar?.buttons)
    ? menuBar.buttons.filter((b) => b !== ZegoMenuBarButtonName?.hangUpButton)
    : undefined;

  return (
    <ZegoUIKitPrebuiltCall
      appID={appId}
      appSign={appSign}
      userID={userId}
      userName={userName}
      callID={roomId}
      config={{
        ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
        ...(safeButtons ? { bottomMenuBarConfig: { ...menuBar, buttons: safeButtons } } : {}),
        onCallEnd: onCallEnd,
        onHangUp: onCallEnd,
        onOnlySelfInRoom: onCallEnd,
        // Enable a device only when its permission was granted — a denied mic
        // (or camera) must not silently kill the whole call.
        turnOnCameraWhenJoining: turnOnCamera,
        turnOnMicrophoneWhenJoining: turnOnMic,
        // Route audio through the loudspeaker by default — the SDK's default
        // can fall back to the earpiece, which sounds like "no audio".
        useSpeakerWhenJoining: false,
        layout: {
          // pictureInPicture (0) — remote fills the screen, the local camera
          // shows as a draggable PiP in the bottom-right corner (standard 1-on-1).
          mode: 0,
        },
        audioVideoViewConfig: {
          showMicrophoneStateOnView: false,
          showCameraStateOnView: false,
        },
      }}
    />
  );
});



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
  const [showEndCallPopup, setShowEndCallPopup] = useState(false);
  const [showCallCancelled, setShowCallCancelled] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [receivedGift, setReceivedGift] = useState(null);
  const [userID, setUserID] = useState('');
  const [userName, setUserName] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [currentCoins, setCurrentCoins] = useState(null);
  const [lowBalanceMessage, setLowBalanceMessage] = useState('');
  const [permission, setPermission] = useState({ camera: false, mic: false });
  const [isListener, setIsListener] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);
  const callEndedRef = useRef(false);
  const exitCallScreenRef = useRef(null);
  const cancelledExitTimerRef = useRef(null);

  const resolvedAppId = zegoAppId ? parseInt(zegoAppId) : ZEGO_APP_ID;
  const resolvedAppSign = zegoAppSign || ZEGO_APP_SIGN;

  // Live camera (fallback path) only needs the camera permission. The Zego
  // path joins the real call when EITHER camera or mic is granted, so a denied
  // mic doesn't silently remove all audio (and vice-versa).
  const showCamera = permission.camera && !isCameraOff && !cameraError;
  const canJoinRealCall = permission.camera || permission.mic;

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
          setUserID(user._id || user.id || `user_${Date.now()}`);
          setUserName(user.name || user.username || 'User');
          setIsListener(user.role === 'LISTENER');
        } else {
          setUserID(`user_${Date.now()}`);
          setUserName('User');
          setIsListener(false);
        }
      } catch {
        setUserID(`user_${Date.now()}`);
        setUserName('User');
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

    const exitCallScreen = async () => {
      if (callEndedRef.current) return;
      callEndedRef.current = true;
      clearInterval(intervalRef.current);
      
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
    };

    exitCallScreenRef.current = exitCallScreen;

    const handleAutoEnded = async (data) => {
      if (data.sessionId === callId) {
        await exitCallScreen();
      }
    };

    const handleCallEnded = async (data) => {
      if (data.sessionId === callId) {
        await exitCallScreen();
      }
    };

    const handleCallCancelled = async (data) => {
      if (data.sessionId === callId || data.callId === callId) {
        setShowCallCancelled(true);
        // Fallback auto-exit: if the user doesn't dismiss the popup, leave the
        // call so billing doesn't keep running on an already-cancelled session.
        cancelledExitTimerRef.current = setTimeout(() => {
          setShowCallCancelled(false);
          if (exitCallScreenRef.current) {
            exitCallScreenRef.current();
          }
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
    intervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      clearInterval(intervalRef.current);
    };
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

  const handleEndCall = useCallback(async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    clearInterval(intervalRef.current);

    try {
      if (callId && callId !== 'demo_zego_call' && callId !== 'test_call_id') {
        socketService.emit('stop_call_billing', { sessionId: callId });
        // Also emit call_ended via socket as belt-and-suspenders
        socketService.emit('call_ended', { sessionId: callId, roomId });
        await callAPI.endCall(callId);
      }
    } catch (error) {
      console.log('Failed to end call on backend:', error);
    } finally {
      setTimeout(() => {
        if (isListener) {
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
    }
  }, [callId, name, listenerId, isListener, roomId]);

  const handleCallCancelledClose = useCallback(() => {
    if (cancelledExitTimerRef.current) {
      clearTimeout(cancelledExitTimerRef.current);
      cancelledExitTimerRef.current = null;
    }
    setShowCallCancelled(false);
    if (exitCallScreenRef.current) {
      exitCallScreenRef.current();
    }
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

  // Flip the camera. In the fallback path this just re-points the expo-camera
  // preview; in a Zego call it switches the actual SDK camera device.
  const handleFlipCamera = useCallback(() => {
    const next = !isFrontCamera;
    setIsFrontCamera(next);
    // Allow the newly selected camera to retry if it previously failed.
    setCameraError(false);
    if (!isExpoGo && ZegoUIKit) {
      ZegoUIKit.useFrontFacingCamera(next);
    }
  }, [isFrontCamera]);

  if (!isExpoGo && ZegoUIKitPrebuiltCall && userID && roomId && canJoinRealCall) {
    return (
      <Pressable style={{ flex: 1 }} onPress={toggleControls}>
        <ZegoCallWrapper
          appId={resolvedAppId}
          appSign={resolvedAppSign}
          userId={userID}
          userName={userName}
          roomId={roomId}
          onCallEnd={handleEndCall}
          turnOnCamera={permission.camera}
          turnOnMic={permission.mic}
        />

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
                onPress={() => setShowRecharge(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="wallet-outline" size={22} color="#EC4899" />
                <Text style={[styles.floatingRechargeText, { color: '#EC4899' }]}>Recharge</Text>
              </TouchableOpacity>
            )}

            {!isListener && (
              <TouchableOpacity
                style={[styles.floatingRechargeGift, { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.3)' }]}
                onPress={() => setShowGiftPopup(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="gift-outline" size={22} color="#A855F7" />
                <Text style={[styles.floatingRechargeText, { color: '#A855F7' }]}>Gift</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Call control dock — safety, camera flip + end call */}
          <View style={styles.zegoControls}>
            <CallControls
              buttons={[
                {
                  id: 'flip',
                  icon: 'camera-reverse-outline',
                  label: 'Flip',
                  onPress: handleFlipCamera,
                },
              ]}
              onEndCall={() => setShowEndCallPopup(true)}
              onSafety={() => setShowSafety(true)}
            />
          </View>
        </Animated.View>

        <EndCallPopup
          visible={showEndCallPopup}
          onEndCall={handleEndCall}
          onDismiss={() => setShowEndCallPopup(false)}
        />
        <CallCancelledPopup
          visible={showCallCancelled}
          message="The call was cancelled by the user."
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
        colors={['#000000', '#0C0C0E', '#151518']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={{ opacity: controlsOpacity }} pointerEvents={controlsVisible ? 'auto' : 'none'}>
      <View style={[styles.topBar, { paddingTop: insets.top + vs(8) }]}>
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
            style={[styles.floatingRechargeGift, { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.3)' }]}
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
        {/* Remote participant — the avatar stands in for their live feed (only
            the Zego path on native builds streams their actual camera). */}
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

      {/* Remote participant preview — the other side's camera feed is only
          available through the Zego SDK on native builds, so the partner's
          avatar stands in for it here. */}
      {/* Self-view preview — my own live camera in the bottom-right corner.
          Like the main video feeds, this is NOT toggled by the tap gesture. */}
      <View style={styles.selfPreview}>
        <View style={styles.selfCamera}>
          {showCamera ? (
            <CameraView
              key={isFrontCamera ? 'front' : 'back'}
              style={StyleSheet.absoluteFill}
              facing={isFrontCamera ? 'front' : 'back'}
              mirror={isFrontCamera}
              active
              onMountError={() => setCameraError(true)}
            />
          ) : (
            <Ionicons name="videocam-off" size={32} color="#6B7280" />
          )}
        </View>
      </View>

      <Animated.View style={{ opacity: controlsOpacity }} pointerEvents={controlsVisible ? 'auto' : 'none'}>
        <View style={[styles.fallbackControls, { paddingBottom: Math.max(insets.bottom, vs(24)) }]}>
          <CallControls
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
              {
                id: 'flip',
                icon: 'camera-reverse-outline',
                label: 'Flip',
                onPress: handleFlipCamera,
              },
            ]}
            onEndCall={() => setShowEndCallPopup(true)}
            onSafety={() => setShowSafety(true)}
          />
        </View>
      </Animated.View>

      <EndCallPopup
        visible={showEndCallPopup}
        onEndCall={handleEndCall}
        onDismiss={() => setShowEndCallPopup(false)}
      />

      <CallCancelledPopup
        visible={showCallCancelled}
        message="The call was cancelled by the user."
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
  selfPreview: {
    position: 'absolute',
    bottom: vs(120),
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
    overflow: 'hidden',
  },

  zegControls: {
    position: 'absolute',
    bottom: hp(18),
    alignSelf: 'center',
    // Moderate layer — floats above the native call surface but stays below
    // the in-call recharge/gift popups (which layer higher).
    zIndex: 50,
    elevation: 50,
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

  // Zego mode floating elements
  floatingTopRight: {
    position: 'absolute',
    top: SH * 0.08,
    right: s(12),
    alignItems: 'flex-end',
    gap: vs(8),
    zIndex: 999,
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
  floatingRechargeBtn: {
    backgroundColor: 'rgba(236, 72, 153, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: vs(8),
    borderRadius: 20,
    gap: s(6),
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingRechargeText: {
    color: '#fff',
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_600SemiBold',
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
