import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { 
  useFonts, 
  Inter_900Black,
  Inter_700Bold,
  Inter_500Medium,
  Inter_400Regular 
} from '@expo-google-fonts/inter';
import { Merriweather_700Bold_Italic } from '@expo-google-fonts/merriweather';
import { 
  PlayfairDisplay_700Bold_Italic, 
  PlayfairDisplay_400Regular_Italic 
} from '@expo-google-fonts/playfair-display';
import { View, ActivityIndicator, Alert, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNotificationReceivedListener, addNotificationResponseReceivedListener, dismissCallNotification } from '../utils/notifications';
import { socketService } from '../utils/socket';
import { incomingCallNative, onIncomingCallAction } from '../utils/incomingCall';
import { callAPI, walletAPI } from '../utils/api';
import IncomingCallPopup from '../components/shared/IncomingCallPopup';
import CallCancelledPopup from '../components/shared/CallCancelledPopup';
import InsufficientBalancePopup from '../components/shared/InsufficientBalancePopup';
import WelcomePopup from '../components/shared/WelcomePopup';



function RootLayout() {
  const router = useRouter();
  const [loaded] = useFonts({
    Inter_900Black,
    Inter_700Bold,
    Inter_500Medium,
    Inter_400Regular,
    'Merriweather-Italic': Merriweather_700Bold_Italic,
    'Playfair-Italic': PlayfairDisplay_400Regular_Italic,
    'Playfair-Bold-Italic': PlayfairDisplay_700Bold_Italic,
  });

  // ── Global incoming-call overlay ──────────────────────────────────────────
  // Mounted at the root so the popup appears on EVERY screen (tabs, chat,
  // profile, wallet, ...) — not just inside the tab navigators.
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [callCancelledVisible, setCallCancelledVisible] = useState(false);
  // Recharge gate: user tried to answer a call without enough coins
  const [rechargeGate, setRechargeGate] = useState(null); // { callerName, callType, minCoins, balance }

  // ── Welcome / "I Agree" popup ─────────────────────────────────────────────
  // Shows on EVERY login for regular users (never for listeners/admins). The
  // auth screens set `pendingWelcomePopup` right after a successful login; we
  // render it here at the root so it appears on whatever screen the user lands
  // on first — home, chat (active-session redirect), etc.
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const pending = await AsyncStorage.getItem('pendingWelcomePopup');
        if (pending !== 'true') return;

        // Only regular users see it — never listeners or admins
        const userData = await AsyncStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);
        const role = String(user.role || 'USER').toUpperCase();
        if (role.includes('LISTENER') || role.includes('ADMIN')) return;

        // Don't interrupt the auth / onboarding screens themselves. (Listeners
        // are already excluded by the role check above.)
        const p = pathname || '';
        if (/welcome|login|signup|role-selection|gender|language|onboarding|voice-id|verification|banned/i.test(p)) return;

        // Display the mandatory popup (flag is cleared in handleWelcomeAgree once agreed)
        setShowWelcomePopup(true);
      } catch (e) {
        console.log('[RootLayout] Welcome popup check error:', e);
      }
    };
    checkWelcome();
  }, [pathname]);

  // ── Global Listener Permissions Check ──────────────────────────────────────
  // Checks and requests 'Display over other apps' overlay permission prior for
  // listeners so call pages work when app is backgrounded or killed.
  useEffect(() => {
    const checkListenerPermissions = async () => {
      if (Platform.OS !== 'android') return;
      try {
        const userData = await AsyncStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);
        const role = String(user.role || 'USER').toUpperCase();
        if (role.includes('LISTENER')) {
          const hasOverlay = await incomingCallNative.hasOverlayPermission();
          if (!hasOverlay) {
            Alert.alert(
              'Display Over Other Apps Permission Required',
              'To receive full-screen incoming call pages when the app is in the background or closed, Mingo requires the "Display over other apps" permission.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Enable in Settings',
                  onPress: () => incomingCallNative.requestOverlayPermission(),
                },
              ]
            );
          }
        }
      } catch (e) {
        console.log('[RootLayout] Permission check error:', e);
      }
    };
    checkListenerPermissions();
  }, [pathname]);

  const handleWelcomeAgree = useCallback(async () => {
    setShowWelcomePopup(false);
    await AsyncStorage.removeItem('pendingWelcomePopup');
    // Preserve the existing flow: after agreeing, users with an empty wallet
    // get the coins offer on the home screen.
    let balance = 0;
    try {
      const balRes = await walletAPI.getBalance();
      balance = balRes?.data?.coins ?? 0;
    } catch (e) {
      console.log('[RootLayout] Balance check after welcome agree:', e);
    }
    if (balance === 0) {
      await AsyncStorage.setItem('welcomeCoinsOfferPending', 'true');
    }
    // Live signal for the home screen (if it's currently mounted underneath).
    socketService.triggerLocalEvent('welcome_agreed');
  }, []);

  const incomingCallsRef = useRef([]);
  const handledCallIdsRef = useRef(new Set());
  useEffect(() => {
    incomingCallsRef.current = incomingCalls;
  }, [incomingCalls]);

  const handleAcceptCall = useCallback(async (acceptedCall) => {
    if (!acceptedCall) return;
    if (acceptedCall.callId) handledCallIdsRef.current.add(acceptedCall.callId);

    // Ensure socket is connected before emitting events
    await socketService.connect();

    // A native call card may still be ringing (accept happened from the
    // background/killed card) — dismiss it and the shade notification.
    incomingCallNative.stopIncomingCall();

    const { callerId, callerName, callType, callId, roomId, avatarIndex, gender } = acceptedCall;

    let session;
    try {
      // Validate that the session is still active
      const sessionRes = await callAPI.getSession(callId);
      session = sessionRes?.data;
      if (!session || session.status === 'cancelled' || session.status === 'completed') {
        setCallCancelledVisible(true);
        setIncomingCalls(prev => prev.filter(c => c.callId !== callId));
        return;
      }
    } catch (err) {
      console.log('Error validating session before accept:', err);
      Alert.alert('Call Unavailable', 'This call is no longer available.', [{ text: 'OK' }]);
      setIncomingCalls(prev => prev.filter(c => c.callId !== callId));
      return;
    }

    // Determine own role — users pay per call (recharge gate), listeners don't
    let myRole = 'USER';
    let myUserId = '';
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        myRole = u.role || 'USER';
        myUserId = u._id || u.id || '';
      }
    } catch (e) {}

    if (myRole === 'USER') {
      // ── Recharge gate: a call must not proceed without enough coins ──
      const minCoins = callType === 'video' ? 40 : 10;
      let balance = 0;
      try {
        const balRes = await walletAPI.getBalance();
        balance = balRes?.data?.coins ?? 0;
      } catch (e) {
        console.log('Error fetching balance before accept:', e);
      }
      if (balance < minCoins) {
        // Decline the call so the caller is not left hanging, then prompt recharge
        socketService.emit('call_rejected', {
          userId: callerId,
          sessionId: callId,
          reason: 'insufficient_balance',
        });
        setIncomingCalls(prev => prev.filter(c => c.callId !== callId));
        setRechargeGate({ callerName, callType, minCoins, balance });
        return;
      }
    }

    // Automatically reject all other active requests
    incomingCallsRef.current
      .filter(c => c.callId !== callId)
      .forEach(otherCall => {
        socketService.emit('call_rejected', {
          userId: otherCall.callerId,
          sessionId: otherCall.callId,
          reason: 'busy',
        });
      });

    // Notify caller we accepted — include session-scoped credentials so the
    // user's connecting screen has the latest Zego/Agora tokens (they may
    // differ from the initial startCall response if the backend regenerated
    // them).
    socketService.emit('call_accepted', {
      userId: callerId,
      sessionId: callId,
      roomId,
      ...(session?.zegoAppId ? { zegoAppId: session.zegoAppId } : {}),
      ...(session?.zegoAppSign ? { zegoAppSign: session.zegoAppSign } : {}),
      ...(session?.agoraAppId ? { agoraAppId: session.agoraAppId } : {}),
      ...(session?.agoraToken ? { agoraToken: session.agoraToken } : {}),
    });

    setIncomingCalls([]);

    // Remove the incoming-call push notification from the system tray
    dismissCallNotification(acceptedCall);

    // Route to call screen
    const targetScreen = callType === 'video' ? '/(call)/video-call' : '/(call)/audio-call';
    router.push({
      pathname: targetScreen,
      params: {
        name: callerName,
        callId,
        roomId,
        // For a listener, listenerId is their OWN id (us); for a user, the
        // caller is the listener they're joining. userId is always the
        // CURRENT participant's own id — used as the Zego/Agora uid so both
        // sides always have unique ids in the call channel.
        ...(myRole === 'LISTENER'
          ? { listenerId: myUserId, userId: myUserId }
          : { listenerId: callerId }),
        avatarIndex,
        gender,
        callType,
        isIncoming: 'true',
        // Session-scoped credentials (Zego for audio calls, Agora for video calls)
        ...(session?.zegoAppId ? { zegoAppId: String(session.zegoAppId) } : {}),
        ...(session?.zegoAppSign ? { zegoAppSign: String(session.zegoAppSign) } : {}),
        ...(session?.agoraAppId ? { agoraAppId: String(session.agoraAppId) } : {}),
        ...(session?.agoraToken ? { agoraToken: String(session.agoraToken) } : {}),
      },
    });
  }, [router]);

  const handleRejectCall = useCallback(async (rejectedCall) => {
    if (!rejectedCall) return;
    if (rejectedCall.callId) handledCallIdsRef.current.add(rejectedCall.callId);
    // Ensure socket is connected so the rejection reaches the caller
    await socketService.connect();
    // Dismiss any native card/notification still ringing
    incomingCallNative.stopIncomingCall();
    socketService.emit('call_rejected', {
      userId: rejectedCall.callerId,
      sessionId: rejectedCall.callId,
      reason: 'busy',
    });
    setIncomingCalls(prev => prev.filter(c => c.callId !== rejectedCall.callId));
  }, []);

  // Refs so the once-registered socket handlers always call the latest ones
  const handleAcceptCallRef = useRef(handleAcceptCall);
  const handleRejectCallRef = useRef(handleRejectCall);
  useEffect(() => {
    handleAcceptCallRef.current = handleAcceptCall;
    handleRejectCallRef.current = handleRejectCall;
  }, [handleAcceptCall, handleRejectCall]);

  // ── Native incoming-call card (background / killed app) ────────────────
  const handleNativeCallAction = useCallback(async (action, callData) => {
    if (!callData || !callData.callId) return;
    console.log('[RootLayout] Native call card action:', action, callData.callId);
    if (action === 'accept' || action === 'decline' || action === 'timeout') {
      handledCallIdsRef.current.add(callData.callId);
    }
    if (action === 'accept') {
      socketService.triggerLocalEvent('accept_incoming_call', callData);
    } else if (action === 'decline') {
      socketService.triggerLocalEvent('reject_incoming_call', callData);
    } else if (action === 'timeout') {
      console.log('[RootLayout] Native call card timed out:', callData.callId);
      incomingCallNative.stopIncomingCall();
      socketService.emit('call_rejected', {
        userId: callData.callerId,
        sessionId: callData.callId,
        reason: 'timeout',
      });
      setIncomingCalls(prev => prev.filter(c => c.callId !== callData.callId));
    } else if (action === 'open') {
      if (!handledCallIdsRef.current.has(callData.callId)) {
        socketService.triggerLocalEvent('incoming_call', callData);
      }
      try {
        const userData = await AsyncStorage.getItem('user');
        const u = userData ? JSON.parse(userData) : null;
        router.push(u?.role === 'LISTENER' ? '/(listener)' : '/(tabs)');
      } catch (roleErr) {
        router.push('/(listener)');
      }
    }
  }, [router]);

  const handleNativeCallActionRef = useRef(handleNativeCallAction);
  useEffect(() => {
    handleNativeCallActionRef.current = handleNativeCallAction;
  }, [handleNativeCallAction]);

  // Native card actions while the app is running in the background
  useEffect(() => {
    const unsubscribe = onIncomingCallAction((action, payload) => {
      handleNativeCallActionRef.current(action, payload);
    });
    return unsubscribe;
  }, []);

  // Sync active incoming call from REST API (in case socket was slow or app opened mid-ring)
  const syncActiveIncomingCall = useCallback(async () => {
    try {
      const res = await callAPI.getActiveIncomingCall();
      if (res?.data?.hasIncomingCall && res.data.callData) {
        const cid = res.data.callData.callId;
        if (handledCallIdsRef.current.has(cid)) return;
        console.log('[RootLayout] Found active incoming call from REST sync:', res.data.callData);
        setIncomingCalls(prev => {
          if (prev.some(c => c.callId === cid)) return prev;
          return [...prev, res.data.callData];
        });
      }
    } catch (e) {
      console.log('[RootLayout] Sync active incoming call error:', e.message);
    }
  }, []);

  // When the app returns to the foreground the in-app popup takes over from
  // the native card: stop the ringtone/card but keep the shade notification so
  // a call is never silently dropped if the socket missed the event.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        incomingCallNative.dismissCard();
        syncActiveIncomingCall();
      }
    });
    return () => subscription.remove();
  }, [syncActiveIncomingCall]);

  // Global socket listeners — show the incoming-call popup on every screen
  useEffect(() => {
    const handleIncomingCall = (callData) => {
      if (!callData?.callId || handledCallIdsRef.current.has(callData.callId)) {
        console.log('[RootLayout] Ignoring incoming_call for already handled call:', callData?.callId);
        return;
      }
      console.log('[RootLayout] Incoming call received:', callData);
      setIncomingCalls((prev) => {
        if (prev.some(c => c.callId === callData.callId)) return prev;
        return [...prev, callData];
      });
      if (AppState.currentState !== 'active') {
        incomingCallNative.showIncomingCall(callData);
      }
    };

    const handleCallCancelled = (data) => {
      const cid = data?.callId || data?.sessionId;
      if (cid) handledCallIdsRef.current.add(cid);
      console.log('[RootLayout] Call cancelled by caller:', data);
      setIncomingCalls(prev => (cid ? prev.filter(c => c.callId !== cid) : []));
      incomingCallNative.stopIncomingCall();
    };

    const handleCallValidationFailed = (data) => {
      const cid = data?.sessionId;
      console.log('[RootLayout] Call validation failed:', data.reason, cid);
      // If we already navigated to the call screen, finishAndExit will handle it.
      // If we're still on the layout, remove the incoming call and notify the user.
      if (cid) handledCallIdsRef.current.add(cid);
      setIncomingCalls(prev => (cid ? prev.filter(c => c.callId !== cid) : []));
      incomingCallNative.stopIncomingCall();
    };

    const handleAccountBanned = (data) => {
      console.log('[RootLayout] Account banned event received:', data);
      Alert.alert('Account Suspended', data.message || 'Your account has been suspended.', [
        {
          text: 'OK',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('user');
            router.replace('/banned');
          },
        },
      ]);
    };

    const handleAcceptLocal = (callData) => {
      console.log('[RootLayout] Accept call via local trigger:', callData);
      handleAcceptCallRef.current(callData);
    };

    const handleRejectLocal = (callData) => {
      console.log('[RootLayout] Reject call via local trigger:', callData);
      handleRejectCallRef.current(callData);
    };

    const setup = async () => {
      await socketService.connect();

      socketService.on('incoming_call', handleIncomingCall);
      socketService.on('call_cancelled', handleCallCancelled);
      socketService.on('call_validation_failed', handleCallValidationFailed);
      socketService.on('account_banned', handleAccountBanned);
      socketService.on('accept_incoming_call', handleAcceptLocal);
      socketService.on('reject_incoming_call', handleRejectLocal);

      // Check server for any active ringing call
      await syncActiveIncomingCall();

      if (socketService.pendingAcceptCall) {
        const pending = socketService.pendingAcceptCall;
        socketService.pendingAcceptCall = null;
        handleAcceptCallRef.current(pending);
      } else if (socketService.pendingRejectCall) {
        const pending = socketService.pendingRejectCall;
        socketService.pendingRejectCall = null;
        handleRejectCallRef.current(pending);
      } else if (socketService.pendingIncomingCall) {
        const pending = socketService.pendingIncomingCall;
        socketService.pendingIncomingCall = null;
        if (pending?.callId && !handledCallIdsRef.current.has(pending.callId)) {
          setIncomingCalls((prev) => {
            if (prev.some(c => c.callId === pending.callId)) return prev;
            return [...prev, pending];
          });
        }
      }

      const pendingNative = await incomingCallNative.getPendingCallAction();
      if (pendingNative) {
        handleNativeCallActionRef.current(pendingNative.action, pendingNative.payload);
      }
    };

    setup();

    return () => {
      socketService.off('incoming_call', handleIncomingCall);
      socketService.off('call_cancelled', handleCallCancelled);
      socketService.off('call_validation_failed', handleCallValidationFailed);
      socketService.off('account_banned', handleAccountBanned);
      socketService.off('accept_incoming_call', handleAcceptLocal);
      socketService.off('reject_incoming_call', handleRejectLocal);
    };
  }, [router]);

  useEffect(() => {
    const subscription = addNotificationReceivedListener((notification) => {
      try {
        const data = notification?.request?.content?.data;
        if (!data || !data.callId) return;
        if (data.type === 'incoming_call') {
          if (handledCallIdsRef.current.has(data.callId)) return;
          if (AppState.currentState !== 'active') {
            incomingCallNative.showIncomingCall(data);
          }
          setIncomingCalls((prev) => {
            if (prev.some(c => c.callId === data.callId)) return prev;
            return [...prev, data];
          });
        } else if (data.type === 'call_cancelled') {
          const cid = data.callId || data.sessionId;
          if (cid) handledCallIdsRef.current.add(cid);
          incomingCallNative.stopIncomingCall();
          setIncomingCalls(prev => prev.filter(c => c.callId !== data.callId && c.callId !== data.sessionId));
        }
      } catch (e) {
        console.log('[RootLayout] Push-received handler error:', e.message);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = addNotificationResponseReceivedListener(async (response) => {
      try {
        const data = response.notification.request.content.data;
        console.log('[RootLayout] Notification tapped, data:', JSON.stringify(data));
        
        if (data?.type === 'incoming_call') {
          const actionId = response.actionIdentifier;
          if (actionId === 'accept') {
            console.log('[Expo] User clicked Accept button on call notification');
            socketService.triggerLocalEvent('accept_incoming_call', data);
          } else if (actionId === 'decline') {
            console.log('[Expo] User clicked Decline button on call notification');
            socketService.triggerLocalEvent('reject_incoming_call', data);
          } else {
            console.log('[Expo] User clicked call notification body');
            socketService.triggerLocalEvent('incoming_call', data);
          }
          // Land the user in the correct tab root for their role
          try {
            const userData = await AsyncStorage.getItem('user');
            const u = userData ? JSON.parse(userData) : null;
            router.push(u?.role === 'LISTENER' ? '/(listener)' : '/(tabs)');
          } catch (roleErr) {
            router.push('/(listener)');
          }
        } else if (data?.type === 'payout') {
          // Payout update notification — open the listener Payout screen
          router.push('/(listener)/payout');
        } else if (data?.conversationId) {
          // Chat message notification — navigate to the chat screen
          router.push({
            pathname: '/chat',
            params: { id: data.conversationId },
          });
        } else if (data?.url) {
          router.push(data.url);
        }
      } catch (err) {
        console.error('Error handling notification tap:', err);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9333EA" />
      </View>
    );
  }

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#000000',
      card: '#000000',
      border: '#000000',
    },
  };

  return (
    <ThemeProvider value={CustomDarkTheme}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            presentation: 'card',
            gestureEnabled: true,
            contentStyle: { backgroundColor: '#000' },
          }}
        />

        {/* Global overlays — visible on every screen */}
        <IncomingCallPopup
          calls={incomingCalls}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />

        <CallCancelledPopup
          visible={callCancelledVisible}
          message="This call has been cancelled by the caller."
          onClose={() => setCallCancelledVisible(false)}
        />

        {/* Recharge gate — user tried to answer a call without enough coins */}
        <InsufficientBalancePopup
          visible={!!rechargeGate}
          balance={rechargeGate?.balance || 0}
          title={rechargeGate ? `${rechargeGate.callerName} is waiting` : ''}
          subtitle={
            rechargeGate
              ? `You need at least ${rechargeGate.minCoins} coins to answer this ${rechargeGate.callType === 'video' ? 'video' : 'audio'} call. Please recharge to continue.`
              : ''
          }
          buttonLabel="Recharge Now"
          onBuyCoins={() => {
            setRechargeGate(null);
            router.push('/balance');
          }}
          onClose={() => setRechargeGate(null)}
        />

        {/* Welcome / "I Agree" popup — shown on every login for users */}
        <WelcomePopup visible={showWelcomePopup} onAgree={handleWelcomeAgree} />
      </View>
    </ThemeProvider>
  );
}

export default RootLayout;
