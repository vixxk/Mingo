import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  TextInput, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
  Animated, Modal, Pressable, AppState, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { hp, wp, ms } from '../../utils/responsive';
import { chatAPI, walletAPI, giftsAPI, listenersAPI, listenerAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import GiftPopup from '../../components/shared/GiftPopup';
import GiftAnimationOverlay from '../../components/call/GiftAnimationOverlay';
import EndChatPopup from '../../components/shared/EndChatPopup';
import ContactShareBlockPopup from '../../components/shared/ContactShareBlockPopup';
import AbusiveMessagePopup from '../../components/shared/AbusiveMessagePopup';
import InsufficientBalancePopup from '../../components/shared/InsufficientBalancePopup';
import StatusPopup from '../../components/shared/StatusPopup';
import { getAvatarUrl } from '../../utils/avatars';
import { analyzeMessage, containsPhoneNumber, maskPhoneNumbers, stripPhoneNumbers } from '../../utils/contactSafety';
import { analyzeAbuse } from '../../utils/abusiveLanguage';



const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const getGiftPriceByName = (name) => {
  if (!name) return 10;
  const n = name.toLowerCase();
  if (n.includes('heart')) return 10;
  if (n.includes('cane')) return 50;
  if (n.includes('candy')) return 100;
  if (n.includes('box')) return 300;
  if (n.includes('wrapped') || n.includes('present')) return 500;
  if (n.includes('coin') || n.includes('gold')) return 1000;
  return 10;
};

// Premium themed message bubble for gift messages
const GiftMessageBubble = ({ item }) => {
  const isSentByMe = item.sent;
  const giftName = item.text ? item.text.replace('Sent a gift: ', '') : 'Gift';
  const giftIcon = item.mediaUrl || '🎁';
  const price = getGiftPriceByName(giftName);
  const giftCount = item.giftCount || 1;

  // Define themed colors and properties for the gift bubble
  let borderColors = ['#8B5CF6', '#EC4899']; // Default fuchsia/purple
  let bgColors = ['#0F0F1A', '#151522']; // Default
  let badgeText = 'Premium Surprise';
  let badgeBg = 'rgba(139, 92, 246, 0.15)';
  let textColor = '#C084FC';
  let borderWidth = 1.5;
  let glowOpacity = 0.15;

  if (price >= 1000) {
    borderColors = ['#FBBF24', '#F59E0B']; // Gold
    bgColors = ['#2E220F', '#181107'];
    badgeText = '👑 Legendary Royal Gift';
    badgeBg = 'rgba(245, 158, 11, 0.2)';
    textColor = '#FBBF24';
    borderWidth = 2.5;
    glowOpacity = 0.35;
  } else if (price >= 500) {
    borderColors = ['#F472B6', '#EC4899']; // Pink/Rose
    bgColors = ['#2E101A', '#18080E'];
    badgeText = '💝 Luxury Heart Gift';
    badgeBg = 'rgba(236, 72, 153, 0.2)';
    textColor = '#F472B6';
    borderWidth = 2.0;
    glowOpacity = 0.3;
  } else if (price >= 300) {
    borderColors = ['#A78BFA', '#8B5CF6']; // Purple/Magenta
    bgColors = ['#1D0E35', '#0E071D'];
    badgeText = '🎁 Special Gift Box';
    badgeBg = 'rgba(139, 92, 246, 0.2)';
    textColor = '#C084FC';
    borderWidth = 1.8;
    glowOpacity = 0.25;
  } else if (price >= 100) {
    borderColors = ['#22D3EE', '#06B6D4']; // Cyan/Blue
    bgColors = ['#062330', '#031119'];
    badgeText = '🍬 Delicious Gift';
    badgeBg = 'rgba(6, 182, 212, 0.2)';
    textColor = '#22D3EE';
    borderWidth = 1.5;
    glowOpacity = 0.2;
  } else if (price >= 50) {
    borderColors = ['#FB7185', '#F43F5E']; // Candy Pink
    bgColors = ['#2A0E18', '#16070B'];
    badgeText = '🍭 Sweet Treat';
    badgeBg = 'rgba(244, 63, 94, 0.2)';
    textColor = '#FB7185';
    borderWidth = 1.2;
    glowOpacity = 0.18;
  } else {
    borderColors = ['#F87171', '#EF4444']; // Red
    bgColors = ['#250E0E', '#140707'];
    badgeText = '❤️ Sweet Heart';
    badgeBg = 'rgba(239, 68, 68, 0.2)';
    textColor = '#F87171';
    borderWidth = 1.0;
    glowOpacity = 0.15;
  }

  return (
    <View style={[styles.bubbleRow, isSentByMe ? styles.bubbleRowSent : styles.bubbleRowReceived]}>
      <View style={[styles.giftBubbleContainer, isSentByMe ? styles.giftBubbleSent : styles.giftBubbleReceived]}>
        <LinearGradient
          colors={bgColors}
          style={styles.giftBubbleGradient}
        >
          {/* Border glowing gradient effect */}
          <View style={[styles.giftBubbleInner, { borderColor: borderColors[0], borderWidth }]}>
            {/* Glowing Icon Badge */}
            <View style={styles.giftIconWrapper}>
              <View style={[styles.giftIconGlow, { backgroundColor: borderColors[0], opacity: glowOpacity }]} />
              {giftCount > 1 ? (
                <View style={styles.giftIconStack}>
                  <Text style={[styles.giftBubbleIcon, styles.giftIconStacked, { left: wp(0.5), top: hp(0.2), transform: [{ scale: 0.8 }] }]}>{giftIcon}</Text>
                  <Text style={[styles.giftBubbleIcon, styles.giftIconStacked, { left: wp(1.5), top: hp(0.6), transform: [{ scale: 0.95 }] }]}>{giftIcon}</Text>
                </View>
              ) : (
                <Text style={styles.giftBubbleIcon}>{giftIcon}</Text>
              )}
              {giftCount > 1 && (
                <LinearGradient
                  colors={['#FBBF24', '#FBBF24']}
                  style={styles.multiplierBadge}
                >
                  <Text style={styles.multiplierBadgeText}>{giftCount}X</Text>
                </LinearGradient>
              )}
            </View>

            {/* Content Details */}
            <View style={styles.giftDetails}>
              <Text style={styles.giftBubbleTitle}>
                {isSentByMe 
                  ? (giftCount > 1 ? `Sent ${giftCount}X gifts` : 'You sent a gift!') 
                  : (giftCount > 1 ? `Received ${giftCount}X gifts` : 'Received a gift!')}
              </Text>
              <Text style={[styles.giftBubbleName, { color: textColor }]}>
                {giftName}
              </Text>
              <Text style={[styles.giftValueText, { color: textColor }]}>
                🪙 {price * giftCount} Coins {giftCount > 1 ? `(${price} × ${giftCount})` : ''}
              </Text>
              <View style={[styles.giftBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.giftBadgeText, { color: textColor }]}>{badgeText}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.giftTimeStamp}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
};

// System message bubble (recharge prompt)
const SystemBubble = ({ item }) => (
  <View style={styles.systemBubbleRow}>
    <View style={styles.systemBubble}>
      <Ionicons name="alert-circle" size={wp(4.2)} color="#F59E0B" style={{ marginRight: wp(2) }} />
      <Text style={styles.systemBubbleText}>{item.text}</Text>
    </View>
  </View>
);

const MessageBubble = ({ item }) => {
  if (item.type === 'date') {
    return <Text style={styles.dateLabel}>{item.text}</Text>;
  }
  if (item.type === 'system') {
    return <SystemBubble item={item} />;
  }
  if (item.type === 'gift') {
    return <GiftMessageBubble item={item} />;
  }
  if (item.isAdminMessage) {
    return (
      <View style={[styles.bubbleRow, styles.adminBubbleRow]}>
        <LinearGradient
          colors={['#4F46E5', '#1E1B4B']}
          style={styles.adminBubble}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.adminBadgeRow}>
            <Ionicons name="shield-checkmark" size={12} color="#FBBF24" style={{ marginRight: wp(1) }} />
            <Text style={styles.adminBadgeText}>MINGO SUPPORT</Text>
          </View>
          <Text style={styles.adminBubbleText}>{item.text}</Text>
          <Text style={styles.adminTimeStamp}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  const isMedia = item.type === 'image';
  const bubbleStyle = isMedia
    ? styles.mediaBubble
    : item.sent ? styles.bubbleSent : styles.bubbleReceived;

  const isTextMsg = !item.type || item.type === 'text';
  // Privacy: any phone number in an already-delivered message is masked on
  // screen (applies to both sides — the sender and the receiver).
  const hasContactInfo = isTextMsg && item.text && containsPhoneNumber(item.text);
  const displayText = hasContactInfo ? maskPhoneNumbers(item.text) : item.text;

  return (
    <View style={[styles.bubbleRow, item.sent ? styles.bubbleRowSent : styles.bubbleRowReceived]}>
      <View style={[styles.bubble, bubbleStyle]}>
        {isTextMsg && (
          <View>
            {hasContactInfo && (
              <View style={styles.contactMaskBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#F87171" style={{ marginRight: wp(1) }} />
                <Text style={styles.contactMaskBadgeText}>CONTACT INFO HIDDEN</Text>
              </View>
            )}
            <Text style={styles.bubbleText}>{displayText}</Text>
          </View>
        )}
        {item.type === 'image' && (
          <Image source={{ uri: item.mediaUrl }} style={{ width: wp(52), height: hp(25), borderRadius: wp(2.5) }} resizeMode="cover" />
        )}
        <Text style={styles.timeStamp}>
          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
    </View>
  );
};

const EMOJIS = [
  '😀','😂','🥺','😍','🙏','👍','😭','🔥','🥰','😊','✨','❤️','🙌','😎','🤔','😘',
  '🙄','😔','😏','💕','👏','😁','😌','😅','😜','💖','✌️','😉','🎉','🌟','💯','🔥',
];

// Minimum coins required to start/resume a 5-minute chat session — must stay
// in sync with the backend's CHAT_COINS_PER_SESSION constant.
const MIN_CHAT_COINS = 10;
// System bubble the backend persists when a chat gets blocked on balance.
const RECHARGE_PROMPT_TEXT = 'Please recharge to continue chatting.';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    name: paramName = 'User', id: conversationId, avatarIndex: paramAvatarIndex = '0', gender: paramGender = 'Female',
    listenerId: paramListenerId,
    sessionId,
    sessionStatus,
    isAdmin: paramIsAdmin,
    duration: paramDuration,
    coinsDeducted: paramCoinsDeducted,
    startTime: paramStartTime,
    endTime: paramEndTime,
  } = useLocalSearchParams();

  // Other user display info (will be resolved after loading)
  const [otherName, setOtherName] = useState(paramName);
  const [otherAvatarIndex, setOtherAvatarIndex] = useState(paramAvatarIndex);
  const [otherGender, setOtherGender] = useState(paramGender);
  // Call options the listener chose while going live (audio defaults to on,
  // video defaults to off — same convention used across the app).
  const [otherAudioEnabled, setOtherAudioEnabled] = useState(true);
  const [otherVideoEnabled, setOtherVideoEnabled] = useState(false);

  const avatarSource = { uri: getAvatarUrl(otherGender, otherAvatarIndex) };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSessionTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

  const formatSessionDuration = (dur, start, end) => {
    if (dur && Number(dur) > 0) return `${dur} min`;
    if (start && end) {
      const mins = Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000));
      return `${mins} min`;
    }
    return '—';
  };

  const handleEndSession = () => {
    if (realConversationIdRef.current) {
      setIsEndingSession(true);
      socketService.emit('end_chat_session', { conversationId: realConversationIdRef.current });
      
      // Safety timeout to reset loading state in case of connection issues
      setTimeout(() => {
        setIsEndingSession(false);
      }, 10000);
    }
  };

  // Start a brand-new session with the same partner straight from the ended
  // panel. Passing the other user's id (instead of the conversation id) makes
  // initiateConversation reuse the existing conversation and land on a fresh
  // live page (no closing and reopening the chat needed).
  const startNewSession = () => {
    if (!otherUserId) return;
    router.replace({
      pathname: '/chat',
      params: {
        name: otherName,
        id: otherUserId,
        avatarIndex: otherAvatarIndex || '0',
        gender: otherGender || 'Female',
      },
    });
  };

  // Session elapsed timer - counts UP from 0 starting when listener first replies
  const startElapsedTimer = (startedAtTime) => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    
    const calculateElapsed = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAtTime).getTime()) / 1000));
      setSessionRemaining(elapsed);
    };
    
    calculateElapsed();
    sessionTimerRef.current = setInterval(calculateElapsed, 1000);
  };

  const [messages, setMessages] = useState([]);
  const [isAdminChat, setIsAdminChat] = useState(paramIsAdmin === 'true');
  const [loading, setLoading] = useState(true);
  const [showEmojis, setShowEmojis] = useState(false);
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState('USER');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [realConversationId, setRealConversationId] = useState(conversationId);
  const [otherUserId, setOtherUserId] = useState(null);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [everHadSession, setEverHadSession] = useState(false);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const [isListenerOnline, setIsListenerOnline] = useState(true);
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [receivedGift, setReceivedGift] = useState(null);
  const [showListenerOfflinePopup, setShowListenerOfflinePopup] = useState(false);
  const [showCostPopup, setShowCostPopup] = useState(false);
  const [showEndChatPopup, setShowEndChatPopup] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  // Read-only history mode: an ended/cancelled session opened via its own
  // sessionId — messages are frozen and the input bar becomes a session panel.
  const [historyMode, setHistoryMode] = useState(false);
  // Live "Session ended" panel — shown on BOTH roles the moment the socket
  // reports the paid session ended. Unlike historyMode (a frozen read-only
  // page opened via an ended session's own id), the page stays live so a
  // restarted session wakes it back up. Renders the REAL server data.
  const [endedPanelVisible, setEndedPanelVisible] = useState(false);
  // Real session summary (duration / coins / time) sent with the ended event.
  const [endedSessionData, setEndedSessionData] = useState(null);

  // ── Contact-sharing safety ─────────────────────────────────
  const [showSafetyNotice, setShowSafetyNotice] = useState(true);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [blockedShare, setBlockedShare] = useState(null); // { text, phoneNumbers, intent }

  // ── Anti-abuse + recharge gate ─────────────────────────────
  const [abuseBlocked, setAbuseBlocked] = useState(null); // { text, matched }
  const [showRechargeGate, setShowRechargeGate] = useState(false);
  const [chatRestricted, setChatRestricted] = useState(false);

  // Refs mirror the above so socket handlers and focus refreshes (which don't
  // re-register on every state change) always read the current values.
  const userRoleRef = useRef(userRole);
  const chatRestrictedRef = useRef(chatRestricted);
  const historyModeRef = useRef(historyMode);
  const endedPanelVisibleRef = useRef(endedPanelVisible);
  useEffect(() => { userRoleRef.current = userRole; }, [userRole]);
  useEffect(() => { chatRestrictedRef.current = chatRestricted; }, [chatRestricted]);
  useEffect(() => { historyModeRef.current = historyMode; }, [historyMode]);
  useEffect(() => { endedPanelVisibleRef.current = endedPanelVisible; }, [endedPanelVisible]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (userRole === 'LISTENER') {
        router.replace('/(listener)');
      } else {
        router.replace('/(tabs)');
      }
    }
    return true;
  }, [userRole]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleBack]);

  // Once the balance is sufficient again, clear the balance gate so the
  // banner, placeholder, recharge popup and stale prompts don't linger.
  const resumeChatIfRecharged = useCallback((coins) => {
    if (
      userRoleRef.current === 'USER' &&
      !chatRestrictedRef.current &&
      coins >= MIN_CHAT_COINS
    ) {
      setChatBlocked(false);
      setShowRechargeGate(false);
      // After a recharge the user can resume right from this page — clear the
      // "Session ended" panel so the input bar comes back (the next paid
      // message restarts the session; the backend re-validates anyway).
      setEndedPanelVisible(false);
      setEndedSessionData(null);
      // Also clear the "waiting for listener's reply" gate: after a recharge
      // the user's next paid message can start/resume the session right away
      // (the backend re-validates balance and listener availability anyway).
      setWaitingForReply(false);
    }
  }, []);

  // Refresh the chat page when it regains focus — e.g. the user recharged on
  // the balance page and navigated back. Without this the insufficient-balance
  // UI stays visible even though the wallet is topped up.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const balRes = await walletAPI.getBalance();
          const coins = balRes?.data?.coins ?? 0;
          if (cancelled) return;
          setCoinBalance(coins);
          resumeChatIfRecharged(coins);
        } catch (e) {
          console.log('[Chat] Balance refresh on focus failed:', e);
        }
      })();
      return () => { cancelled = true; };
    }, [resumeChatIfRecharged])
  );

  const giftAnim = useRef(new Animated.Value(0)).current;
  // Header swap: fades the name/online block out while the session timer
  // capsule fades in (and back when the session ends).
  const headerSwapAnim = useRef(new Animated.Value(0)).current;
  const timerEnterAnim = useRef(new Animated.Value(0)).current;
  // Shared fade for the avatar + name/status blocks while the user's session
  // timer owns the header.
  const headerFade = headerSwapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const sessionTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);
  const realConversationIdRef = useRef(conversationId);
  const otherUserIdRef = useRef(null);

  useEffect(() => {
    realConversationIdRef.current = realConversationId;
  }, [realConversationId]);

  // Animate the header swap between the name/online label and the timer capsule.
  // Only the USER's header swaps (name fades out while the timer slides in) —
  // the listener always keeps the user's name + avatar visible next to it.
  useEffect(() => {
    const shouldSwap = sessionActive && userRole === 'USER';
    Animated.timing(headerSwapAnim, {
      toValue: shouldSwap ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    // The timer capsule is shown to BOTH roles whenever a session is live
    // (the listener keeps name + avatar and gets the capsule pinned beside
    // them); only the USER's header swaps the avatar/name away for it.
    if (sessionActive) {
      timerEnterAnim.setValue(0);
      Animated.timing(timerEnterAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [sessionActive, userRole, headerSwapAnim, timerEnterAnim]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (realConversationIdRef.current) {
        if (nextAppState === 'active') {
          console.log('[Chat] App returned to foreground, rejoining room:', realConversationIdRef.current);
          if (!historyModeRef.current) socketService.joinRoom(realConversationIdRef.current);
        } else if (nextAppState.match(/inactive|background/)) {
          console.log('[Chat] App went to background, leaving room:', realConversationIdRef.current);
          socketService.leaveRoom(realConversationIdRef.current);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const triggerGiftAnimation = useCallback((data) => {
    setReceivedGift(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Reset per navigation — the same screen instance is reused when
        // moving between a history page and a fresh session page.
        setLoading(true);
        setMessages([]);
        setHistoryMode(false);
        setEndedPanelVisible(false);
        setEndedSessionData(null);
        setSessionActive(false);
        setEverHadSession(false);
        setWaitingForReply(false);
        setChatBlocked(false);

        let myId = null;
        let myRole = 'USER';
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          myId = user._id || user.id;
          myRole = user.role || 'USER';
          setCurrentUserId(myId);
          setUserRole(myRole);
        }

        // Fetch balance
        try {
          const balRes = await walletAPI.getBalance();
          if (balRes?.data) setCoinBalance(balRes.data.coins || 0);
        } catch (e) { console.log('Balance fetch error:', e); }

        await socketService.connect();

        if (conversationId) {
          console.log('[Chat] Initiating conversation for ID:', conversationId);
          const response = await chatAPI.getOrCreateConversation(conversationId, sessionId);
          
          if (response?.data) {
            const actualConvId = response.data.conversationId;
            setRealConversationId(actualConvId);
            if (response.data.isAdmin !== undefined) {
              setIsAdminChat(response.data.isAdmin);
            }
            
            const parts = response.data.participants || [];
            const other = parts.find(p => p.toString() !== myId?.toString());
            if (other) {
              setOtherUserId(other.toString());
              otherUserIdRef.current = other.toString();

              // The backend always returns the other participant's public
              // profile — so the LISTENER reliably sees the user's name and
              // avatar in the header (and the user sees the listener's too).
              if (response.data.otherUser) {
                setOtherName(response.data.otherUser.name || paramName);
                setOtherAvatarIndex(String(response.data.otherUser.avatarIndex ?? paramAvatarIndex));
                setOtherGender(response.data.otherUser.gender || paramGender);
              }
              
              // Fetch the other user's profile for display (name, avatar, gender)
              try {
                if (myRole === 'USER') {
                  // I'm user, other is listener → get listener's public profile
                  const profileRes = await listenersAPI.getPublicProfile(other.toString());
                  if (profileRes?.data) {
                    setOtherName(profileRes.data.name || paramName);
                    setOtherAvatarIndex(String(profileRes.data.avatarIndex ?? paramAvatarIndex));
                    setOtherGender(profileRes.data.gender || paramGender);
                    // Show call buttons only for the options this listener enabled while going live.
                    setOtherAudioEnabled(profileRes.data.audioEnabled !== false);
                    setOtherVideoEnabled(profileRes.data.videoEnabled === true);
                    // Show the listener's real online state in the header.
                    setIsListenerOnline(profileRes.data.isOnline !== false);
                  }
                }
              } catch (profileErr) {
                console.log('Could not fetch other user profile:', profileErr);
              }
            } else {
              setOtherUserId(conversationId);
            }

            // Read-only history page: an ended/cancelled session opened via its
            // own sessionId (from the messages list). Its messages are frozen
            // and the input bar becomes a session-info panel.
            const openedSid = String(sessionId || '');
            const session = response.data.chatSession;
            const isEndedSessionPage = !!openedSid && !!session &&
              (session.status === 'completed' || session.status === 'cancelled');
            setHistoryMode(isEndedSessionPage);

            console.log('[Chat] Joining room:', actualConvId, isEndedSessionPage ? '(skipped: history page)' : '');
            if (!isEndedSessionPage) {
              socketService.joinRoom(actualConvId);
            }

            // Handle chat session from response
            let isOnline = true;
            if (myRole === 'LISTENER') {
              try {
                const profileRes = await listenerAPI.getMyProfile();
                if (profileRes?.data) {
                  isOnline = !!profileRes.data.isOnline;
                  setIsListenerOnline(isOnline);
                }
              } catch (e) {
                console.log('Error fetching self profile:', e);
              }
            }

            let blockedBySession = false;
            if (session && session.active) {
              setSessionActive(true);
              setEverHadSession(true);
              setActiveSessionId(session.sessionId);
              startElapsedTimer(session.startTime);
              blockedBySession = false;
            } else {
              setSessionActive(false);
              if (myRole === 'LISTENER') {
                // The listener is never limited — they can send as many
                // messages as they want even before the paid chat session
                // starts. Only the USER is gated (one free message per phase,
                // then paid messages start the session).
                blockedBySession = false;
              } else {
                blockedBySession = false;
                // No active session — the page shows the current phase window.
                // If the last message in it is ours (our free message), we wait
                // for the listener's reply before our next message starts the
                // paid session.
                const apiMessages = response.data.messages || [];
                const nonSystemMessages = apiMessages.filter(m => m.senderModel !== 'System' && m.type !== 'system');
                const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
                const lastSenderId = lastMessage ? String(lastMessage.sender?._id || lastMessage.sender || '') : '';
                if (lastMessage && lastSenderId && lastSenderId === String(myId)) {
                  setWaitingForReply(true);
                }
              }
            }

            setChatBlocked(blockedBySession || (myRole === 'LISTENER' && !isOnline) || isEndedSessionPage);

            const apiMessages = response.data.messages || [];
            const formatted = insertDateLabels(
              apiMessages.map((msg) => {
                let type = msg.type || 'text';
                let content = msg.content;
                let mediaUrl = msg.mediaUrl;

                if (type === 'text' && content && content.startsWith('Sent a gift:')) {
                  type = 'gift';
                  const parts = content.split(' ');
                  const lastPart = parts[parts.length - 1];
                  if (lastPart && lastPart.length <= 4) {
                    mediaUrl = lastPart;
                    content = content.substring(0, content.lastIndexOf(' '));
                  } else {
                    mediaUrl = '🎁';
                  }
                }

                return {
                  id: msg._id,
                  text: content,
                  sent: myId && String(msg.sender?._id || msg.sender) === String(myId),
                  type: type,
                  mediaUrl: mediaUrl,
                  giftCount: msg.giftCount || 1,
                  senderId: msg.sender?._id || msg.sender,
                  senderModel: msg.senderModel,
                  isAdminMessage: msg.isAdminMessage || false,
                  createdAt: msg.createdAt,
                };
              })
            );
            setMessages(formatted);
          }
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
      }
    };
    init();
    return () => { 
      if (realConversationIdRef.current) socketService.leaveRoom(realConversationIdRef.current); 
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [conversationId, sessionId]);

  useEffect(() => {
    if (!currentUserId) return;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.type === 'date' || msg.type === 'system') return msg;
        return { ...msg, sent: msg.senderId === currentUserId };
      })
    );
  }, [currentUserId]);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      console.log('[Chat] Received message via socket:', msg);
      // History pages are frozen — never append live messages to an ended session.
      if (historyModeRef.current) return;
      
      // Only process messages for the current conversation
      const msgConvId = (msg.conversationId?._id || msg.conversationId || '').toString();
      const currentConvId = (realConversationIdRef.current || '').toString();
      if (msgConvId && currentConvId && msgConvId !== currentConvId) {
        return; // Message belongs to a different conversation
      }

      const isSystem = msg.senderModel === 'System' || msg.type === 'system';
      const msgSenderId = (msg.sender?._id || msg.sender || '').toString();
      const myId = (currentUserId || '').toString();
      const isSent = !isSystem && msgSenderId === myId;

      let type = msg.type || 'text';
      let content = msg.content;
      let mediaUrl = msg.mediaUrl;

      // Map legacy/incoming text gifts to 'gift' type dynamically
      if (type === 'text' && content && content.startsWith('Sent a gift:')) {
        type = 'gift';
        const parts = content.split(' ');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.length <= 4) {
          mediaUrl = lastPart;
          content = content.substring(0, content.lastIndexOf(' '));
        } else {
          mediaUrl = '🎁';
        }
      }

      // If it's a gift received from the other user, trigger full-screen gift animation overlay
      if (type === 'gift' && !isSent) {
        const giftName = content.replace('Sent a gift: ', '');
        triggerGiftAnimation({
          isSentByMe: false,
          senderName: otherName || 'Someone',
          gift: {
            name: giftName,
            icon: mediaUrl || '🎁',
            price: getGiftPriceByName(giftName),
            count: msg.giftCount || 1
          }
        });
      }

      // Listener replies unlock the user's message box (session billing starts
      // only on the user's next message, guarded by the backend).
      if (userRole === 'LISTENER' && !isSent && !isSystem && msg.senderModel === 'User') {
        setChatBlocked(false);
      }
      if (userRole === 'USER' && !isSent && !isSystem && msg.senderModel === 'Listener') {
        setWaitingForReply(false);
      }
      // A real message after the session ended means the chat is resuming —
      // swap the "Session ended" panel back to the live input.
      if (!isSystem && !isSent) {
        setEndedPanelVisible(false);
      }

      setMessages((prev) => {
        const messageId = (msg._id || Math.random()).toString();
        if (prev.some(m => m.id?.toString() === messageId)) return prev;
        
        // If it's a message we sent, look for a matching optimistic message (temp_*) to replace
        if (isSent) {
          const optimisticIndex = prev.findIndex(m => 
            String(m.id).startsWith('temp_') && 
            m.text === content && 
            m.senderId === msgSenderId
          );
          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = {
              id: messageId,
              text: content,
              sent: true,
              type: type,
              mediaUrl: mediaUrl,
              giftCount: msg.giftCount || 1,
              senderId: msgSenderId,
              senderModel: msg.senderModel,
              isAdminMessage: msg.isAdminMessage || false,
              createdAt: msg.createdAt,
            };
            return updated;
          }
        }
        
        return [...prev, {
          id: messageId,
          text: content,
          sent: isSent,
          type: type,
          mediaUrl: mediaUrl,
          giftCount: msg.giftCount || 1,
          senderId: msgSenderId,
          senderModel: msg.senderModel,
          isAdminMessage: msg.isAdminMessage || false,
          createdAt: msg.createdAt,
        }];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);
    const handleBalanceUpdate = (data) => {
      setCoinBalance(data.coins);
      // A recharge pushes the fresh balance over the socket — clear the
      // balance gate immediately so the chat can resume without navigating.
      resumeChatIfRecharged(data.coins);
    };
    const handleInsufficientBalance = (data) => {
      setChatBlocked(true);
      // Sync the badge and prompt visibility with the server's actual balance.
      if (typeof data?.currentCoins === 'number') {
        setCoinBalance(data.currentCoins);
      }
      // Contextual recharge gate: "<name> is waiting. Please recharge to continue."
      setShowRechargeGate(true);
      // Unlock the input: the blocked send was a paid (2nd+) message, not the
      // free one, so the user isn't waiting for a reply anymore.
      setWaitingForReply(false);
      // Remove the optimistic (unsent) message that this blocked send left
      // behind, so it doesn't linger as a ghost bubble after recharge.
      setMessages((prev) =>
        prev.filter((m) => !(typeof m.id === 'string' && m.id.startsWith('temp_')))
      );
    };

    const handleSessionStarted = (data) => {
      if (historyModeRef.current) return;
      console.log('[Chat] Session started:', data);
      // Session restarted — swap the ended panel back to the live input.
      setEndedPanelVisible(false);
      setEndedSessionData(null);
      setSessionActive(true);
      setEverHadSession(true);
      setWaitingForReply(false);
      const session = data.chatSession;
      if (session?.sessionId) setActiveSessionId(session.sessionId);
      startElapsedTimer(session.startTime);
      setChatBlocked(false);
      setShowRechargeGate(false);
    };

    const handleSessionRenewed = (data) => {
      if (historyModeRef.current) return;
      console.log('[Chat] Session renewed:', data);
      setEndedPanelVisible(false);
      setEndedSessionData(null);
      setSessionActive(true);
      setEverHadSession(true);
      setWaitingForReply(false);
      const session = data.chatSession;
      if (session?.sessionId) setActiveSessionId(session.sessionId);
      startElapsedTimer(session.startTime);
      setChatBlocked(false);
      setShowRechargeGate(false);
    };

    const handleSessionEnded = (data) => {
      if (historyModeRef.current) return;
      console.log('[Chat] Session ended:', data);
      setSessionActive(false);
      setWaitingForReply(false);
      setSessionRemaining(0);
      setActiveSessionId(null);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      // Only the USER sees the "Session ended" panel (the input bar is
      // replaced by the summary) until their next message restarts the
      // session. The LISTENER keeps the live input — they can send as many
      // messages as they want even before the next session starts. The page
      // stays live — the user's panel clears again when a new message
      // restarts the session. Real duration / coins / time come from the
      // server payload (no need to close and reopen the chat).
      if (userRoleRef.current === 'USER') {
        setChatBlocked(true);
        setEndedPanelVisible(true);
        if (data?.session) {
          setEndedSessionData(data.session);
        }
      }
      setShowEndChatPopup(false);
      setIsEndingSession(false);
    };

    const handleGiftReceived = (data) => {
      console.log('[Chat] Gift received in chat:', data);
      triggerGiftAnimation(data);
    };

    const handleChatUserOffline = (data) => {
      console.log('[Chat] Other user went offline:', data);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.type === 'system' && lastMsg.text === (data.message || 'User went offline.')) {
          return prev;
        }
        const offlineMsg = {
          id: `offline_${Date.now()}`,
          text: data.message || 'User went offline.',
          sent: false,
          type: 'system',
          createdAt: new Date().toISOString(),
        };
        return [...prev, offlineMsg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleMessageError = (data) => {
      if (data.type === 'listener_offline') {
        setChatBlocked(true);
        const errorMsg = {
          id: `error_${Date.now()}`,
          text: data.error || 'You are offline. Please go online to send messages.',
          sent: false,
          type: 'system',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    // Safety net: server blocked a contact-sharing attempt (modified/buggy client)
    const handleContactShareBlocked = (data) => {
      const msgConvId = (data?.conversationId || '').toString();
      const currentConvId = (realConversationIdRef.current || '').toString();
      if (msgConvId && currentConvId && msgConvId !== currentConvId) return;

      // The server also emits the system bubble via receive_message,
      // so we only surface the block popup here (no duplicate bubbles).
      setBlockedShare((prev) => prev ?? {
        text: data?.content || '',
        phoneNumbers: data?.phoneNumbers || [],
        intent: !!data?.hasContactIntent,
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    // Safety net: server blocked an abusive message (modified/buggy client)
    const handleAbusiveMessageBlocked = (data) => {
      const msgConvId = (data?.conversationId || '').toString();
      const currentConvId = (realConversationIdRef.current || '').toString();
      if (msgConvId && currentConvId && msgConvId !== currentConvId) return;
      // Close the keyboard first so the popup appears over a clean screen.
      Keyboard.dismiss();
      setAbuseBlocked((prev) => prev ?? {
        text: data?.content || '',
        matched: data?.matched || null,
        severity: data?.severity || 'severe',
      });
    };

    // Server escalated: repeated violations -> temporary chat restriction
    const handleChatRestricted = (data) => {
      const msgConvId = (data?.conversationId || '').toString();
      const currentConvId = (realConversationIdRef.current || '').toString();
      if (msgConvId && currentConvId && msgConvId !== currentConvId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.type === 'system' && m.text?.includes('temporarily restricted'))) return prev;
        return [...prev, {
          id: `restricted_${Date.now()}`,
          text: 'Your chat access has been temporarily restricted for 24 hours due to repeated abusive messages.',
          sent: false,
          type: 'system',
          createdAt: new Date().toISOString(),
        }];
      });
      setChatRestricted(true);
      setChatBlocked(true);
      setShowRechargeGate(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleListenerStatusChanged = (data) => {
      console.log('[Chat] Listener status changed:', data);
      const { userId, isOnline } = data;
      const selfIsListener = userRole === 'LISTENER';
      // For a listener, the event is about their OWN online state. For a user,
      // it's about the listener they're chatting with.
      const targetId = selfIsListener
        ? (currentUserId || '').toString()
        : (otherUserIdRef.current || '').toString();
      if (!targetId || userId.toString() !== targetId) return;

      setIsListenerOnline(isOnline);
      if (selfIsListener) {
        if (!isOnline) {
          setChatBlocked(true);
        } else {
          // The listener is never gated by session state — they can send as
          // many messages as they want even before the chat session starts.
          setChatBlocked(false);
        }
      }
    };

    const handleListenerOffline = (data) => {
      console.log('[Chat] Listener offline, send blocked:', data);
      setIsListenerOnline(false);
      // Unlock the input: the blocked send was a paid (2nd+) message, not the
      // free one, so the user isn't waiting for a reply anymore.
      setWaitingForReply(false);
      // Remove the optimistic (unsent) message that this blocked send left behind.
      setMessages((prev) =>
        prev.filter((m) => !(typeof m.id === 'string' && m.id.startsWith('temp_')))
      );
      // Close the keyboard so the themed popup appears over a clean screen.
      Keyboard.dismiss();
      setShowListenerOfflinePopup(true);
    };

    socketService.on('receive_message', handleNewMessage);
    socketService.on('user_typing', handleTyping);
    socketService.on('user_stop_typing', handleStopTyping);
    socketService.on('balance_updated', handleBalanceUpdate);
    socketService.on('insufficient_balance', handleInsufficientBalance);
    socketService.on('chat_session_started', handleSessionStarted);
    socketService.on('chat_session_renewed', handleSessionRenewed);
    socketService.on('chat_session_ended', handleSessionEnded);
    socketService.on('gift_received', handleGiftReceived);
    socketService.on('chat_user_offline', handleChatUserOffline);
    socketService.on('message_error', handleMessageError);
    socketService.on('listener_status_changed', handleListenerStatusChanged);
    socketService.on('listener_offline', handleListenerOffline);
    socketService.on('contact_share_blocked', handleContactShareBlocked);
    socketService.on('abusive_message_blocked', handleAbusiveMessageBlocked);
    socketService.on('chat_restricted', handleChatRestricted);

    return () => {
      socketService.off('receive_message', handleNewMessage);
      socketService.off('user_typing', handleTyping);
      socketService.off('user_stop_typing', handleStopTyping);
      socketService.off('balance_updated', handleBalanceUpdate);
      socketService.off('insufficient_balance', handleInsufficientBalance);
      socketService.off('chat_session_started', handleSessionStarted);
      socketService.off('chat_session_renewed', handleSessionRenewed);
      socketService.off('chat_session_ended', handleSessionEnded);
      socketService.off('gift_received', handleGiftReceived);
      socketService.off('chat_user_offline', handleChatUserOffline);
      socketService.off('message_error', handleMessageError);
      socketService.off('listener_status_changed', handleListenerStatusChanged);
      socketService.off('listener_offline', handleListenerOffline);
      socketService.off('contact_share_blocked', handleContactShareBlocked);
      socketService.off('abusive_message_blocked', handleAbusiveMessageBlocked);
      socketService.off('chat_restricted', handleChatRestricted);
    };
  }, [currentUserId, sessionActive]);

  const insertDateLabels = (msgs) => {
    const result = [];
    let lastDate = '';
    msgs.forEach((msg) => {
      const d = msg.createdAt ? new Date(msg.createdAt).toDateString() : '';
      if (d && d !== lastDate) {
        lastDate = d;
        result.push({ id: `date-${d}`, type: 'date', text: formatDateLabel(msg.createdAt) });
      }
      result.push(msg);
    });
    return result;
  };

  // Actually deliver a text message (after safety checks have passed)
  const performSend = (msgContent) => {
    if (!msgContent || !realConversationId || !currentUserId) return;
    // Ended sessions are read-only — never send from a history page or while
    // the live "Session ended" panel is shown.
    if (historyModeRef.current || endedPanelVisibleRef.current) return;
    if (chatBlocked) {
      // Same gate as handleSend — never silently redirect
      if (userRole === 'USER') setShowRechargeGate(true);
      return;
    }

    const tempId = `temp_${Date.now()}`;

    // Add optimistic message to the UI instantly
    const optimisticMsg = {
      id: tempId,
      text: msgContent,
      sent: true,
      type: 'text',
      senderId: currentUserId,
      senderModel: userRole === 'LISTENER' ? 'Listener' : 'User',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const msgData = {
      conversationId: realConversationId, 
      senderId: currentUserId, 
      senderModel: userRole === 'LISTENER' ? 'Listener' : 'User',
      content: msgContent, 
      type: 'text',
    };
    console.log('[Chat] Sending message:', msgData);
    socketService.emit('send_message', msgData);
    socketService.emit('stop_typing', { conversationId: realConversationId, userId: currentUserId });
    setMessage('');
    setShowEmojis(false);
    setPhoneDetected(false);

    // One free message per session phase: after the user sends the phase's
    // first (free) message, lock the input until the listener replies and the
    // paid session starts on the user's next message.
    if (userRole === 'USER' && !sessionActive) {
      setWaitingForReply(true);
    }
  };

  const handleSend = () => {
    const msgContent = message.trim();
    if (!msgContent || !realConversationId || !currentUserId) return;
    // Ended sessions are read-only — never send from a history page or while
    // the live "Session ended" panel is shown.
    if (historyModeRef.current || endedPanelVisibleRef.current) return;
    if (waitingForReply) {
      // Free message already sent — waiting for the listener's reply to start the session
      return;
    }
    if (chatBlocked) {
      // Gate: surface the contextual recharge prompt instead of silently failing
      if (userRole === 'USER') setShowRechargeGate(true);
      return;
    }

    // Safety guard: messages containing a phone number are never sent.
    const analysis = analyzeMessage(msgContent);
    if (analysis.hasPhone) {
      setBlockedShare({
        text: msgContent,
        phoneNumbers: analysis.phoneNumbers,
        intent: analysis.hasContactIntent,
      });
      return;
    }

    // Anti-abuse guard: offensive messages are stopped before sending.
    const abuse = analyzeAbuse(msgContent);
    if (abuse.hasAbuse) {
      // Close the keyboard first so the popup appears over a clean screen.
      Keyboard.dismiss();
      setAbuseBlocked({ text: msgContent, matched: abuse.matched, severity: abuse.severity });
      return;
    }

    performSend(msgContent);
  };

  // Start an audio/video call straight from the chat header (user role).
  const handleStartCall = async (callType) => {
    if (!otherUserId) return;
    try {
      // Prompt recharge before the call can proceed when coins are short
      const balRes = await walletAPI.getBalance();
      const coins = balRes?.data?.coins ?? 0;
      const minCoins = callType === 'video' ? 40 : 10;
      if (coins < minCoins) {
        setShowRechargeGate(true);
        return;
      }
      router.push({
        pathname: '/(call)/connecting',
        params: {
          name: otherName,
          callType,
          callId: `call_${Date.now()}`,
          roomId: `room_${Date.now()}`,
          listenerId: otherUserId,
          avatarIndex: otherAvatarIndex,
          gender: otherGender,
        },
      });
    } catch (e) {
      console.log('[Chat] Balance check failed before call:', e);
    }
  };

  const handleTextChange = (text) => {
    setMessage(text);
    const analysis = analyzeMessage(text);
    const hasPhone = analysis.hasPhone;
    setPhoneDetected(hasPhone);
    // Reinforce the permanent reminder the moment a number is typed
    if (hasPhone && !showSafetyNotice) setShowSafetyNotice(true);
    if (realConversationId && currentUserId) {
      socketService.emit('typing', { conversationId: realConversationId, userId: currentUserId });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketService.emit('stop_typing', { conversationId: realConversationId, userId: currentUserId });
      }, 2000);
    }
  };

  const handleEmojiPress = (emoji) => setMessage((prev) => prev + emoji);

  // The backend persists "Please recharge to continue chatting." as a system
  // message, so show those prompt bubbles only while the user is actually
  // blocked on balance — once they can chat again (post-recharge) the stale
  // prompts are hidden instead of lingering in the visible history forever.
  const isBalanceBlocked = userRole === 'USER' && chatBlocked && !chatRestricted;
  const displayedMessages = isBalanceBlocked
    ? messages
    : messages.filter((m) => !(m.type === 'system' && m.text === RECHARGE_PROMPT_TEXT));

  // Real ended-session values — prefer the live socket payload over the
  // navigation params (which are stale/empty for a session that ends live).
  const endedDuration = endedSessionData?.duration || paramDuration;
  const endedCoins = Number(endedSessionData?.coinsDeducted ?? paramCoinsDeducted);
  const endedStart = endedSessionData?.startTime || paramStartTime;
  const endedEnd = endedSessionData?.endTime || paramEndTime;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        {/* Skeleton Header */}
        <View style={styles.header}>
          <View style={{ width: wp(5.5), height: wp(5.5), borderRadius: wp(1), backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: wp(2) }}>
            <View style={{ width: wp(10), height: wp(10), borderRadius: wp(5), backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View style={{ flex: 1 }}>
              <View style={{ width: wp(25), height: hp(1.8), borderRadius: wp(1), backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: hp(0.5) }} />
              <View style={{ width: wp(15), height: hp(1.2), borderRadius: wp(1), backgroundColor: 'rgba(255,255,255,0.06)' }} />
            </View>
          </View>
          <View style={{ width: wp(18), height: hp(3.5), borderRadius: wp(5), backgroundColor: 'rgba(255,255,255,0.06)' }} />
        </View>
        {/* Skeleton Messages */}
        <View style={{ paddingHorizontal: wp(4), paddingTop: hp(2), flex: 1 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <View key={i} style={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start', marginBottom: hp(1.5) }}>
              <View style={{
                width: wp(i % 3 === 0 ? 55 : i % 2 === 0 ? 40 : 65),
                height: hp(i % 3 === 0 ? 6 : 4),
                borderRadius: 18,
                backgroundColor: i % 2 === 0 ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255,255,255,0.05)',
              }} />
            </View>
          ))}
        </View>
        {/* Skeleton Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, hp(1.2)) }]}>
          <View style={{ flex: 1, height: hp(4.5), borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ width: wp(9), height: wp(9), borderRadius: wp(4.5), backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: wp(2) }} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
        </TouchableOpacity>
        
        {/* Middle: avatar + (name/status or the session timer capsule). Once the
            paid session timer starts, the capsule takes over the name's flex
            slot so the header stays balanced instead of cramming every control
            into the right edge. */}
        <View style={[styles.headerMiddle, sessionActive && userRole === 'USER' && styles.headerMiddleSession]}>
          {/* Avatar — always stays mounted (and is the tallest header element),
              so the header keeps its EXACT size when the session timer starts.
              Only the name/status block below collapses, handing its flex slot
              to the centered timer capsule. The listener keeps the name too. */}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={userRole !== 'USER' || !isListenerOnline}
            onPress={() => {
              if (userRole === 'USER' && otherUserId) {
                router.push({
                  pathname: '/listener-profile/[id]',
                  params: { id: otherUserId }
                });
              }
            }}
            style={{ opacity: userRole === 'USER' && !isListenerOnline ? 0.5 : 1 }}
          >
            <Image source={avatarSource} style={styles.headerAvatar} />
          </TouchableOpacity>

          {/* Name + online label — once the user's paid session timer starts,
              its flex slot collapses (width 0) and is handed to the timer
              capsule below, so the header never has a gap or overflow. The
              inner dim keeps the whole block at 50% when the listener is
              offline, matching the avatar's dim. */}
          <Animated.View
            style={[
              styles.headerInfo,
              {
                opacity: headerFade,
                transform: [
                  { translateY: headerSwapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
                ],
              },
              sessionActive && userRole === 'USER' && styles.headerInfoCollapsed,
            ]}
            pointerEvents={sessionActive ? 'none' : 'auto'}
          >
            <View style={{ opacity: userRole === 'USER' && !isListenerOnline ? 0.5 : 1 }}>
              <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
              <Text
                style={[
                  styles.headerStatus,
                  userRole === 'USER' && !isTyping && !isListenerOnline && styles.headerStatusOffline,
                ]}
              >
                {isTyping
                  ? 'Typing...'
                  : (userRole === 'USER' ? (isListenerOnline ? 'Online' : 'Offline') : 'Online')}
              </Text>
            </View>
          </Animated.View>

          {/* Timed Session Capsule — slides in as the name fades out. For the
              user it fills the freed middle slot (flex 1); for the listener it
              stays pinned next to the name on the right. */}
          {sessionActive && (
            <Animated.View
              style={[
                styles.sessionHeaderWrap,
                userRole === 'USER' && styles.sessionHeaderCenter,
                {
                  opacity: timerEnterAnim,
                  transform: [
                    { translateX: timerEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                    { scale: timerEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.timerBadge}
                activeOpacity={0.7}
                onPress={() => { if (userRole === 'USER') setShowCostPopup(true); }}
              >
                <Ionicons name="time" size={wp(3.5)} color="#F87171" style={{ marginRight: wp(1) }} />
                <Text style={styles.timerText}>{formatDuration(sessionRemaining)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.endSessionBtn}
                activeOpacity={0.7}
                onPress={() => setShowEndChatPopup(true)}
              >
                <Text style={styles.endSessionText}>End</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* In-chat call buttons — only shown for the options the listener enabled while going live */}
        {userRole === 'USER' && !isAdminChat && otherUserId && (
          <View style={styles.headerCallBtns}>
            {otherAudioEnabled && (
              <TouchableOpacity
                style={[styles.headerCallBtn, { borderColor: 'rgba(34,197,94,0.35)' }, !isListenerOnline && styles.headerCallBtnDisabled]}
                activeOpacity={0.7}
                disabled={!isListenerOnline}
                onPress={() => handleStartCall('audio')}
                accessibilityLabel="Start audio call"
              >
                <Ionicons name="call" size={wp(4.6)} color="#22C55E" />
              </TouchableOpacity>
            )}
            {otherVideoEnabled && (
              <TouchableOpacity
                style={[styles.headerCallBtn, { borderColor: 'rgba(59,130,246,0.35)' }, !isListenerOnline && styles.headerCallBtnDisabled]}
                activeOpacity={0.7}
                disabled={!isListenerOnline}
                onPress={() => handleStartCall('video')}
                accessibilityLabel="Start video call"
              >
                <Ionicons name="videocam" size={wp(4.6)} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Coin badge (Only for users) */}
        {userRole === 'USER' && (
          <TouchableOpacity style={styles.coinBadge} activeOpacity={0.7} onPress={() => router.push('/balance')}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinCount}>{coinBalance}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {/* Permanent safety reminder banner */}
        {showSafetyNotice && (
          <View style={styles.safetyNoticeBanner}>
            <View style={styles.safetyNoticeIconWrap}>
              <Ionicons name="shield-checkmark" size={wp(4.5)} color="#F87171" />
            </View>
            <Text style={styles.safetyNoticeText}>
              Safety Reminder: Please do not share your phone number or other personal contact details.
            </Text>
            <TouchableOpacity
              onPress={() => setShowSafetyNotice(false)}
              hitSlop={{ top: wp(2.5), bottom: wp(2.5), left: wp(2.5), right: wp(2.5) }}
              style={styles.safetyNoticeClose}
            >
              <Ionicons name="close" size={wp(4.2)} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        )}
        {loading ? (
          <View style={{ paddingHorizontal: wp(4), paddingTop: hp(2) }}>
            {/* Skeleton message bubbles */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start', marginBottom: hp(1.5) }}>
                <View style={{
                  width: wp(i % 3 === 0 ? 55 : i % 2 === 0 ? 45 : 65),
                  height: hp(i % 3 === 0 ? 6 : 4.5),
                  borderRadius: 18,
                  backgroundColor: i % 2 === 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.05)',
                  opacity: 0.6,
                }} />
              </View>
            ))}
          </View>
        ) : displayedMessages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={wp(12)} color="#333" />
            <Text style={styles.emptyChatText}>
              {userRole === 'LISTENER'
                ? 'Waiting for the user to start the conversation...'
                : 'Say hello! Your first message is free.'}
            </Text>
          </View>
        ) : (
          displayedMessages.map((item) => <MessageBubble key={item.id} item={item} />)
        )}
        <View style={{ height: hp(1) }} />
      </ScrollView>

      {/* Emoji panel */}
      {showEmojis && (
        <View style={styles.emojiPanel}>
          <ScrollView contentContainerStyle={styles.emojiContainer} showsVerticalScrollIndicator={false}>
            {EMOJIS.map((e, idx) => (
              <TouchableOpacity key={idx} onPress={() => handleEmojiPress(e)} style={styles.emojiButton}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat blocked banner (balance OR abuse restriction) — never on a
          read-only history page (it shows its own ended-session panel) */}
      {chatBlocked && userRole === 'USER' && !historyMode && !endedPanelVisible && (
        <TouchableOpacity
          style={[styles.blockedBanner, chatRestricted && styles.blockedBannerDanger]}
          activeOpacity={0.85}
          onPress={chatRestricted ? null : () => setShowRechargeGate(true)}
        >
          <Ionicons
            name={chatRestricted ? 'shield-outline' : 'wallet-outline'}
            size={wp(4.5)}
            color={chatRestricted ? '#EF4444' : '#F59E0B'}
          />
          <Text style={[styles.blockedBannerText, chatRestricted && { color: '#F87171' }]}>
            {chatRestricted
              ? 'Chat restricted due to repeated abusive messages.'
              : 'Insufficient balance. Tap to recharge.'}
          </Text>
          {!chatRestricted && <Ionicons name="chevron-forward" size={wp(4)} color="#F59E0B" />}
        </TouchableOpacity>
      )}

      {/* Live warning while a phone number is being typed */}
      {phoneDetected && !isAdminChat && sessionStatus !== 'completed' && (
        <View style={styles.phoneWarningChip}>
          <Ionicons name="alert-circle" size={wp(3.8)} color="#F87171" />
          <Text style={styles.phoneWarningText}>Phone number detected — sharing contact info isn't allowed.</Text>
        </View>
      )}

      {/* Input bar */}
      {isAdminChat ? (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, hp(1.2)), justifyContent: 'center', alignItems: 'center', minHeight: hp(6) }]}>
          <Text style={{ color: '#9CA3AF', fontSize: wp(3.5), fontFamily: 'Inter_500Medium', fontStyle: 'italic' }}>
            Replying to admin messages is disabled.
          </Text>
        </View>
      ) : (historyMode || endedPanelVisible) ? (
        <View style={[styles.endedPanel, { paddingBottom: Math.max(insets.bottom, hp(1.2)) }]}>
          <View style={styles.endedPanelHeader}>
            <Ionicons name="checkmark-circle-outline" size={wp(4.5)} color="#22C55E" />
            <Text style={styles.endedPanelTitle}>Session ended</Text>
          </View>
          <View style={styles.endedPanelMetaRow}>
            <View style={styles.endedMetaItem}>
              <Ionicons name="time-outline" size={wp(3.8)} color="#9CA3AF" />
              <Text style={styles.endedMetaText}>
                {formatSessionDuration(endedDuration, endedStart, endedEnd)}
              </Text>
            </View>
            {!!endedCoins && endedCoins > 0 && (
              <View style={styles.endedMetaItem}>
                <Text style={{ color: '#38BDF8', fontSize: wp(3.4) }}>💎</Text>
                <Text style={styles.endedMetaText}>
                  {Math.floor(endedCoins / 10)} diamonds
                </Text>
              </View>
            )}
            {(!!endedStart || !!endedEnd) && (
              <View style={styles.endedMetaItem}>
                <Ionicons name="calendar-outline" size={wp(3.8)} color="#9CA3AF" />
                <Text style={styles.endedMetaText}>{formatSessionTime(endedStart || endedEnd)}</Text>
              </View>
            )}
          </View>
          {userRole === 'USER' && (
            <TouchableOpacity style={styles.newSessionBtnWrap} activeOpacity={0.85} onPress={startNewSession}>
              <LinearGradient
                colors={['#3B82F6', '#EC4899']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.newSessionBtn}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={wp(4.2)} color="#fff" />
                <Text style={styles.newSessionBtnText}>Start New Session</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[styles.inputBar, phoneDetected && styles.inputBarDanger, { paddingBottom: Math.max(insets.bottom, hp(1.2)) }]}>
          <TextInput
            style={[styles.textInput, phoneDetected && styles.textInputDanger]}
            placeholder={
              waitingForReply
                ? 'Waiting for listener to reply...'
                : (chatBlocked 
                    ? (userRole === 'LISTENER' 
                        ? (!isListenerOnline 
                            ? 'Please go online to send messages.' 
                            : 'Waiting for user to send a message...') 
                        : 'Recharge to continue...') 
                    : 'Enter your message...')
            }
            placeholderTextColor="#6B7280"
            value={message}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            multiline
            editable={!chatBlocked && !waitingForReply}
          />
          <View style={styles.inputActions}>
            {userRole === 'USER' && (
              <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={() => !chatBlocked && !waitingForReply && setShowGiftPopup(true)}>
                <Ionicons name="gift-outline" size={wp(5.5)} color={waitingForReply ? '#4B5563' : '#A855F7'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={handleSend}>
              <Ionicons
                name={phoneDetected ? 'shield-checkmark' : 'send'}
                size={wp(5.5)}
                color={phoneDetected ? '#EF4444' : ((chatBlocked || waitingForReply) ? '#4B5563' : '#EC4899')}
              />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.inputAction}
              onPress={() => setShowEmojis(!showEmojis)}>
              <Ionicons name="happy-outline" size={wp(5.5)} color={showEmojis ? '#EC4899' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Gift Popup for sending gifts */}
      <GiftPopup
        visible={showGiftPopup}
        onClose={() => setShowGiftPopup(false)}
        receiverId={otherUserId || conversationId}
        sessionId={activeSessionId}
        onGiftSent={(gift) => {
          if (realConversationId && currentUserId && gift) {
            const giftName = gift.name || 'Gift';
            const giftIcon = gift.icon || '🎁';
            const giftMsg = `Sent a gift: ${giftName}`;
            
            // Update coin balance immediately from gift response
            if (gift.remainingCoins !== undefined) {
              setCoinBalance(gift.remainingCoins);
            } else if (gift.price) {
              setCoinBalance(prev => Math.max(0, prev - gift.price));
            }
            
            // Add optimistic message with gift type
            const tempId = `temp_gift_${Date.now()}`;
            setMessages((prev) => [...prev, {
              id: tempId,
              text: giftMsg,
              sent: true,
              type: 'gift',
              mediaUrl: giftIcon,
              giftCount: gift.count || 1,
              senderId: currentUserId,
              senderModel: 'User',
              createdAt: new Date().toISOString(),
            }]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
            
            socketService.emit('send_message', {
              conversationId: realConversationId,
              senderId: currentUserId,
              senderModel: 'User',
              content: giftMsg,
              type: 'gift',
              mediaUrl: giftIcon,
              giftCount: gift.count || 1,
            });
            
            triggerGiftAnimation({
              isSentByMe: true,
              gift: gift,
            });
          }
        }}
      />

      {/* Received Gift Animation/Overlay */}
      {receivedGift && (
        <GiftAnimationOverlay
          giftName={receivedGift.gift.name}
          giftIcon={receivedGift.gift.icon}
          giftPrice={receivedGift.gift.price}
          giftCount={receivedGift.gift.count || 1}
          senderName={receivedGift.isSentByMe ? 'You' : receivedGift.senderName || otherName || 'Someone'}
          receiverName={receivedGift.isSentByMe ? otherName : 'You'}
          isSentByMe={receivedGift.isSentByMe}
          onComplete={() => setReceivedGift(null)}
        />
      )}

      {/* Session Cost Info Popup */}
      <Modal transparent visible={showCostPopup} animationType="fade" statusBarTranslucent>
        <View style={styles.costPopupOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCostPopup(false)} />
          <View style={styles.costPopupCard}>
            <View style={styles.costPopupIconWrap}>
              <Ionicons name="time" size={wp(8)} color="#22C55E" />
            </View>
            <Text style={styles.costPopupTitle}>Session Cost</Text>
            <Text style={styles.costPopupDesc}>
              This chat session costs{' '}
              <Text style={{ color: '#F59E0B', fontWeight: '800' }}>2 coins/min</Text>
              {' '}(10 coins per 5 minutes).
            </Text>
            <Text style={styles.costPopupBalance}>
              Your balance: <Text style={{ color: '#22C55E', fontWeight: '800' }}>🪙 {coinBalance}</Text>
            </Text>
            <TouchableOpacity
              style={styles.costPopupBtn}
              activeOpacity={0.8}
              onPress={() => setShowCostPopup(false)}
            >
              <Text style={styles.costPopupBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contact Share Block Popup — phone numbers can't be sent */}
      <ContactShareBlockPopup
        visible={!!blockedShare}
        maskedNumber={blockedShare?.phoneNumbers?.[0] ? maskPhoneNumbers(blockedShare.phoneNumbers[0]) : null}
        hasContactIntent={blockedShare?.intent}
        onCancel={() => setBlockedShare(null)}
        onSendWithoutNumber={() => {
          const stripped = stripPhoneNumbers(blockedShare.text).trim();
          setBlockedShare(null);
          if (stripped) performSend(stripped);
        }}
      />

      {/* Anti-abuse popup — offensive language must be edited first */}
      <AbusiveMessagePopup
        visible={!!abuseBlocked}
        matchedWord={abuseBlocked?.matched || null}
        severity={abuseBlocked?.severity || 'severe'}
        onEdit={() => setAbuseBlocked(null)}
        onCancel={() => {
          setMessage('');
          setPhoneDetected(false);
          setAbuseBlocked(null);
        }}
      />

      {/* Recharge gate — "<name> is waiting. Please recharge to continue." */}
      <InsufficientBalancePopup
        visible={showRechargeGate}
        balance={coinBalance}
        title={`${otherName || 'The other person'} is waiting`}
        subtitle={"Please recharge to continue chatting. Your conversation will resume as soon as you have enough coins."}
        buttonLabel="Recharge Now"
        onBuyCoins={() => {
          setShowRechargeGate(false);
          router.push('/balance');
        }}
        onClose={() => setShowRechargeGate(false)}
      />

      {/* End Chat Confirmation Popup */}
      <EndChatPopup
        visible={showEndChatPopup}
        onConfirm={handleEndSession}
        onCancel={() => setShowEndChatPopup(false)}
        loading={isEndingSession}
      />

      {/* Listener Offline Popup (themed) */}
      <StatusPopup
        visible={showListenerOfflinePopup}
        type="error"
        title="Listener is offline"
        message={`${otherName || 'The listener'} isn't online right now. Please try again when they're back online.`}
        onClose={() => setShowListenerOfflinePopup(false)}
        icon="cloud-offline-outline"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: wp(3.6), marginTop: hp(1.5) },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: wp(3), paddingVertical: hp(1.2),
    borderBottomWidth: wp(0.25), borderBottomColor: '#1A1A1A', gap: wp(2),
    // The header height is FIXED (avatar + its vertical padding — the avatar
    // is the tallest element in every state), and overflow is hidden so the
    // session timer capsule can never push the row taller. The header stays
    // the exact same size whether the name is showing or the timer is live.
    height: wp(10) + hp(2.4),
    overflow: 'hidden',
  },
  headerAvatar: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    borderWidth: wp(0.5), borderColor: '#EC4899',
  },
  // Flex slot that holds the avatar + name (+ the session timer capsule once
  // the user's paid session starts). Keeps the header balanced in one row.
  headerMiddle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  headerInfo: { flex: 1 },
  // Collapsed while the user's session timer is live — frees the middle slot
  // for the timer capsule instead of leaving an invisible flex:1 gap that
  // squashes the header's right-side controls.
  headerInfoCollapsed: {
    flex: 0,
    width: 0,
    overflow: 'hidden',
  },
  // Session mode on the middle slot: the name/status block collapses away so
  // the timer capsule can sit centered with no leftover gap offsets. The
  // avatar stays mounted, keeping the header the same size as before.
  headerMiddleSession: {
    gap: 0,
  },
  headerName: { fontSize: wp(3.8), color: '#fff', fontWeight: '700' },
  headerStatus: { fontSize: wp(2.8), color: '#22C55E' },
  headerStatusOffline: { color: '#6B7280' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginRight: wp(2),
  },
  headerActionBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: wp(5), paddingHorizontal: wp(3), paddingVertical: hp(0.5),
    gap: wp(1), borderWidth: wp(0.25), borderColor: '#333',
  },
  coinEmoji: { fontSize: wp(3.5) },
  coinCount: { fontSize: wp(3.5), color: '#fff', fontWeight: '700' },

  // In-chat call buttons
  headerCallBtns: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5) },
  headerCallBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    borderWidth: wp(0.25),
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCallBtnDisabled: { opacity: 0.3 },

  // Messages
  messagesScroll: { flex: 1 },
  messagesContent: { paddingHorizontal: wp(3.5), paddingTop: hp(2), flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: hp(25) },
  emptyChatText: { color: '#4B5563', fontSize: wp(3.6), marginTop: hp(1.5) },
  dateLabel: { fontSize: wp(2.8), color: '#9CA3AF', textAlign: 'center', marginVertical: hp(1.5) },

  // Bubbles
  bubbleRow: { marginBottom: hp(0.7) },
  bubbleRowSent: { alignItems: 'flex-end' },
  bubbleRowReceived: { alignItems: 'flex-start' },
  bubble: { maxWidth: wp(72), borderRadius: wp(4.5), paddingHorizontal: wp(3.5), paddingVertical: hp(1.2) },
  bubbleSent: { backgroundColor: '#7C3AED', borderBottomRightRadius: wp(1) },
  bubbleReceived: { backgroundColor: '#1F2937', borderBottomLeftRadius: wp(1) },
  mediaBubble: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
  bubbleText: { fontSize: wp(3.6), color: '#fff', lineHeight: wp(5.2) },
  timeStamp: { fontSize: wp(2.3), color: 'rgba(255,255,255,0.65)', textAlign: 'right', marginTop: hp(0.5) },

  // System message
  systemBubbleRow: { alignItems: 'center', marginVertical: hp(1) },
  systemBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: wp(5), paddingHorizontal: wp(4), paddingVertical: hp(1.2),
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', maxWidth: wp(85),
  },
  systemBubbleText: { fontSize: wp(3.2), color: '#F59E0B', fontWeight: '600', flex: 1 },

  // Admin Support message bubble
  adminBubbleRow: { alignItems: 'center', marginVertical: hp(1), width: '100%' },
  adminBubble: {
    width: wp(85),
    borderRadius: wp(4),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.4)', // subtle gold border
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.6),
  },
  adminBadgeText: {
    fontSize: wp(2.6),
    fontFamily: 'Inter_900Black',
    color: '#FBBF24', // Gold text
    letterSpacing: 0.8,
  },
  adminBubbleText: {
    fontSize: wp(3.5),
    color: '#FFF',
    lineHeight: wp(5.2),
    fontFamily: 'Inter_500Medium',
  },
  adminTimeStamp: {
    fontSize: wp(2.2),
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
    marginTop: hp(0.5),
  },

  // Blocked banner
  blockedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)', paddingVertical: hp(1),
    paddingHorizontal: wp(4), gap: wp(2),
    borderTopWidth: 1, borderTopColor: 'rgba(245,158,11,0.2)',
  },
  blockedBannerText: { fontSize: wp(3.2), color: '#F59E0B', fontWeight: '600' },
  blockedBannerDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderTopColor: 'rgba(239, 68, 68, 0.25)',
  },

  // Safety reminder banner (top of message list)
  safetyNoticeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: wp(2),
    backgroundColor: 'rgba(127, 29, 29, 0.25)',
    borderWidth: wp(0.25), borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: wp(3.5), paddingHorizontal: wp(3), paddingVertical: hp(1),
    marginBottom: hp(1.5),
  },
  safetyNoticeIconWrap: {
    width: wp(7), height: wp(7), borderRadius: wp(3.5),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  safetyNoticeText: {
    flex: 1, fontSize: wp(3), color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_500Medium', lineHeight: wp(4.4),
  },
  safetyNoticeClose: { padding: wp(0.5) },

  // Permanent phone-ban banner (above input)
  // Live warning chip while a number is being typed
  phoneWarningChip: {
    flexDirection: 'row', alignItems: 'center', gap: wp(1.5),
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: wp(4), paddingVertical: hp(0.7),
  },
  phoneWarningText: { fontSize: wp(2.9), color: '#F87171', fontWeight: '600' },

  // Input danger state
  inputBarDanger: { borderTopColor: 'rgba(239, 68, 68, 0.6)' },
  textInputDanger: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.07)' },

  // Contact-info masked badge inside bubbles
  contactMaskBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: wp(2.5), paddingHorizontal: wp(1.8), paddingVertical: hp(0.3),
    marginBottom: hp(0.5),
  },
  contactMaskBadgeText: {
    fontSize: wp(2.1), color: '#F87171', fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.6,
  },

  // Emoji
  emojiPanel: { backgroundColor: '#111', height: hp(22), borderTopWidth: 1, borderTopColor: '#222' },
  emojiContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: wp(2.5), justifyContent: 'center' },
  emojiButton: { padding: wp(2), margin: wp(1) },
  emojiText: { fontSize: wp(6) },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: wp(3),
    paddingTop: hp(1), borderTopWidth: 1, borderTopColor: '#1A1A1A', backgroundColor: '#000',
  },
  // Ended-session (read-only history) panel
  endedPanel: {
    borderTopWidth: 1, borderTopColor: '#1A1A1A', backgroundColor: '#000',
    paddingHorizontal: wp(4), paddingTop: hp(1.5),
  },
  endedPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(2),
    marginBottom: hp(1.2),
  },
  endedPanelTitle: {
    color: '#22C55E', fontSize: wp(3.8), fontWeight: '700', fontFamily: 'Inter_700Bold',
  },
  endedPanelMetaRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: wp(3),
    marginBottom: hp(1.4),
  },
  endedMetaItem: {
    flexDirection: 'row', alignItems: 'center', gap: wp(1),
    backgroundColor: '#0B0B0F', borderRadius: wp(4), borderWidth: 1, borderColor: '#1F2937',
    paddingHorizontal: wp(2.5), paddingVertical: hp(0.6),
  },
  endedMetaText: {
    color: '#D1D5DB', fontSize: wp(3), fontFamily: 'Inter_500Medium',
  },
  newSessionBtnWrap: {
    borderRadius: wp(8), overflow: 'hidden', height: hp(5.5), marginBottom: hp(0.8),
  },
  newSessionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(2),
  },
  newSessionBtnText: {
    color: '#fff', fontSize: wp(3.8), fontWeight: '700', fontFamily: 'Inter_700Bold',
  },
  textInput: {
    flex: 1, fontSize: wp(3.6), color: '#fff', paddingVertical: hp(1), maxHeight: hp(12),
    backgroundColor: '#0B0B0F', borderRadius: wp(4), borderWidth: 1, borderColor: '#1F2937',
    paddingHorizontal: wp(3), marginVertical: hp(0.5),
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), paddingBottom: hp(0.7) },
  inputAction: { width: wp(9), height: wp(9), alignItems: 'center', justifyContent: 'center' },

  // Timed chat session styles
  sessionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginRight: wp(1),
    // Insurance: the timer pill + End button can never exceed the avatar's
    // height, so the fixed header height holds even with large font scaling.
    maxHeight: wp(10),
    overflow: 'hidden',
  },
  // For the USER the capsule takes the whole freed middle slot and centers its
  // content, so the header reads: [<]  ⏱ 0:04  End  [📞][🎥][130]
  sessionHeaderCenter: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 0,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(4),
    borderWidth: wp(0.25),
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  timerText: {
    fontSize: wp(3),
    color: '#fff',
    fontWeight: '700',
  },
  endSessionBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: wp(3.5),
  },
  endSessionText: {
    fontSize: wp(3),
    color: '#fff',
    fontWeight: '700',
  },

  // Received gift overlay styles
  giftNotification: {
    position: 'absolute',
    top: hp(20),
    left: wp(10),
    right: wp(10),
    zIndex: 9999,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  giftNotificationContent: {
    padding: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftNotificationText: {
    color: '#fff',
    fontSize: wp(3.8),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  giftNotificationIcon: {
    fontSize: wp(15),
    marginVertical: hp(1),
  },
  giftNotificationName: {
    color: '#fff',
    fontSize: wp(4.5),
    fontWeight: '800',
    marginTop: hp(1),
  },
  // Premium Gift Message Bubble Styles
  giftBubbleContainer: {
    width: wp(65),
    borderRadius: wp(5),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginVertical: hp(0.5),
  },
  giftBubbleSent: {
    borderBottomRightRadius: wp(1),
  },
  giftBubbleReceived: {
    borderBottomLeftRadius: wp(1),
  },
  giftBubbleGradient: {
    padding: wp(1.5),
    borderRadius: wp(4.2),
  },
  giftBubbleInner: {
    borderWidth: 1.5,
    borderRadius: wp(3.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.5),
    minHeight: hp(8),
  },
  giftIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: wp(12),
    height: wp(12),
  },
  giftIconGlow: {
    position: 'absolute',
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    opacity: 0.15,
  },
  giftBubbleIcon: {
    fontSize: wp(8),
  },
  giftIconStack: {
    width: wp(12),
    height: wp(12),
    position: 'relative',
  },
  giftIconStacked: {
    position: 'absolute',
  },
  multiplierBadge: {
    position: 'absolute',
    bottom: -hp(0.8),
    right: -wp(1.5),
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.1),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0F0F1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  multiplierBadgeText: {
    color: '#000000',
    fontSize: wp(2.3),
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
  },
  giftDetails: {
    flex: 1,
    gap: hp(0.3),
  },
  giftBubbleTitle: {
    fontSize: wp(2.8),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },
  giftBubbleName: {
    fontSize: wp(4.0),
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
  },
  giftValueText: {
    fontSize: wp(3.0),
    fontFamily: 'Inter_600SemiBold',
    marginTop: hp(0.1),
    opacity: 0.9,
  },
  giftBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(3),
    marginTop: hp(0.3),
  },
  giftBadgeText: {
    fontSize: wp(2.2),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  giftTimeStamp: {
    fontSize: wp(2.2),
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
    marginTop: hp(0.4),
    marginRight: wp(3),
    marginBottom: hp(0.6),
  },

  // Cost Popup Styles
  costPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  costPopupCard: {
    backgroundColor: '#141414',
    borderRadius: wp(5),
    padding: wp(6),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    width: '100%',
    maxWidth: wp(85),
  },
  costPopupIconWrap: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  costPopupTitle: {
    fontSize: wp(5),
    color: '#fff',
    fontWeight: '800',
    marginBottom: hp(1),
  },
  costPopupDesc: {
    fontSize: wp(3.5),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: wp(5.5),
    marginBottom: hp(1),
  },
  costPopupBalance: {
    fontSize: wp(3.5),
    color: 'rgba(255,255,255,0.6)',
    marginBottom: hp(2),
  },
  costPopupBtn: {
    backgroundColor: '#22C55E',
    borderRadius: wp(3),
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.2),
  },
  costPopupBtnText: {
    color: '#fff',
    fontSize: wp(3.5),
    fontWeight: '700',
  },
});
