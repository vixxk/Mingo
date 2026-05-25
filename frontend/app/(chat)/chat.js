import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
  Animated, Modal, Pressable, AppState, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { hp, wp, ms } from '../../utils/responsive';
import { chatAPI, walletAPI, giftsAPI, listenersAPI, listenerAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import GiftPopup from '../../components/shared/GiftPopup';
import GiftAnimationOverlay from '../../components/call/GiftAnimationOverlay';

const getAvatarImage = (gender, index) => {
  const parsedIndex = parseInt(index, 10) || 0;
  if (gender === 'Male') {
    const m = [
      require('../../images/male_avatar_1_1776972918440.png'),
      require('../../images/male_avatar_2_1776972933241.png'),
      require('../../images/male_avatar_3_1776972950218.png'),
      require('../../images/male_avatar_4_1776972963577.png'),
      require('../../images/male_avatar_5_1776972978900.png'),
      require('../../images/male_avatar_6_1776972993180.png'),
      require('../../images/male_avatar_7_1776973008143.png'),
      require('../../images/male_avatar_8_1776973021635.png'),
    ];
    return m[parsedIndex] || m[0];
  }
  const f = [
    require('../../images/female_avatar_1_1776973035859.png'),
    require('../../images/female_avatar_2_1776973050039.png'),
    require('../../images/female_avatar_3_1776973063471.png'),
    require('../../images/female_avatar_4_1776973077539.png'),
    require('../../images/female_avatar_5_1776973090730.png'),
    require('../../images/female_avatar_6_1776973108100.png'),
    require('../../images/female_avatar_7_1776973124018.png'),
    require('../../images/female_avatar_8_1776973138772.png'),
  ];
  return f[parsedIndex] || f[0];
};

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

  const isMedia = item.type === 'image' || item.type === 'sticker';
  const bubbleStyle = isMedia
    ? styles.mediaBubble
    : item.sent ? styles.bubbleSent : styles.bubbleReceived;

  return (
    <View style={[styles.bubbleRow, item.sent ? styles.bubbleRowSent : styles.bubbleRowReceived]}>
      <View style={[styles.bubble, bubbleStyle]}>
        {(!item.type || item.type === 'text') && (
          <Text style={styles.bubbleText}>{item.text}</Text>
        )}
        {item.type === 'sticker' && (
          <Image source={{ uri: item.mediaUrl }} style={{ width: wp(26), height: wp(26) }} resizeMode="contain" />
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

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/1043/1043292.png',
  'https://cdn-icons-png.flaticon.com/512/1043/1043306.png',
  'https://cdn-icons-png.flaticon.com/512/1043/1043301.png',
  'https://cdn-icons-png.flaticon.com/512/1043/1043288.png',
];

const EMOJIS = [
  '😀','😂','🥺','😍','🙏','👍','😭','🔥','🥰','😊','✨','❤️','🙌','😎','🤔','😘',
  '🙄','😔','😏','💕','👏','😁','😌','😅','😜','💖','✌️','😉','🎉','🌟','💯','🔥',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    name: paramName = 'User', id: conversationId, avatarIndex: paramAvatarIndex = '0', gender: paramGender = 'Female',
    listenerId: paramListenerId,
    sessionId,
    sessionStatus,
    isAdmin: paramIsAdmin
  } = useLocalSearchParams();

  // Other user display info (will be resolved after loading)
  const [otherName, setOtherName] = useState(paramName);
  const [otherAvatarIndex, setOtherAvatarIndex] = useState(paramAvatarIndex);
  const [otherGender, setOtherGender] = useState(paramGender);

  const avatarSource = getAvatarImage(otherGender, otherAvatarIndex);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleEndSession = () => {
    if (realConversationIdRef.current) {
      socketService.emit('end_chat_session', { conversationId: realConversationIdRef.current });
    }
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
  const [showStickers, setShowStickers] = useState(false);
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
  const [isListenerOnline, setIsListenerOnline] = useState(true);
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [receivedGift, setReceivedGift] = useState(null);
  const [showCostPopup, setShowCostPopup] = useState(false);

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

  const giftAnim = useRef(new Animated.Value(0)).current;
  const sessionTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);
  const realConversationIdRef = useRef(conversationId);

  useEffect(() => {
    realConversationIdRef.current = realConversationId;
  }, [realConversationId]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (realConversationIdRef.current) {
        if (nextAppState === 'active') {
          console.log('[Chat] App returned to foreground, rejoining room:', realConversationIdRef.current);
          socketService.joinRoom(realConversationIdRef.current);
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
              
              // Fetch the other user's profile for display (name, avatar, gender)
              try {
                if (myRole === 'USER') {
                  // I'm user, other is listener → get listener's public profile
                  const profileRes = await listenersAPI.getPublicProfile(other.toString());
                  if (profileRes?.data) {
                    setOtherName(profileRes.data.name || paramName);
                    setOtherAvatarIndex(String(profileRes.data.avatarIndex ?? paramAvatarIndex));
                    setOtherGender(profileRes.data.gender || paramGender);
                  }
                } else {
                  // I'm listener, other is user → use response data or params
                  if (response.data.otherUser) {
                    setOtherName(response.data.otherUser.name || paramName);
                    setOtherAvatarIndex(String(response.data.otherUser.avatarIndex ?? paramAvatarIndex));
                    setOtherGender(response.data.otherUser.gender || paramGender);
                  }
                }
              } catch (profileErr) {
                console.log('Could not fetch other user profile:', profileErr);
              }
            } else {
              setOtherUserId(conversationId);
            }

            console.log('[Chat] Joining room:', actualConvId);
            socketService.joinRoom(actualConvId);

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

            const session = response.data.chatSession;
            let blockedBySession = false;
            if (session && session.active) {
              setSessionActive(true);
              setActiveSessionId(session.sessionId);
              startElapsedTimer(session.startTime);
              blockedBySession = false;
            } else {
              setSessionActive(false);
              if (myRole === 'LISTENER') {
                const apiMessages = response.data.messages || [];
                const nonSystemMessages = apiMessages.filter(m => m.senderModel !== 'System' && m.type !== 'system');
                const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
                if (!lastMessage || lastMessage.senderModel !== 'User') {
                  blockedBySession = true;
                } else {
                  blockedBySession = false;
                }
              } else {
                blockedBySession = false;
              }
            }

            setChatBlocked(blockedBySession || (myRole === 'LISTENER' && !isOnline));

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
  }, [conversationId]);

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

      if (userRole === 'LISTENER' && !isSent && !isSystem && msg.senderModel === 'User') {
        setChatBlocked(false);
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
    };
    const handleInsufficientBalance = () => {
      setChatBlocked(true);
    };

    const handleSessionStarted = (data) => {
      console.log('[Chat] Session started:', data);
      setSessionActive(true);
      const session = data.chatSession;
      if (session?.sessionId) setActiveSessionId(session.sessionId);
      startElapsedTimer(session.startTime);
      setChatBlocked(false);
    };

    const handleSessionRenewed = (data) => {
      console.log('[Chat] Session renewed:', data);
      setSessionActive(true);
      const session = data.chatSession;
      if (session?.sessionId) setActiveSessionId(session.sessionId);
      startElapsedTimer(session.startTime);
      setChatBlocked(false);
    };

    const handleSessionEnded = () => {
      console.log('[Chat] Session ended');
      setSessionActive(false);
      setSessionRemaining(0);
      setActiveSessionId(null);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (userRole === 'LISTENER') {
        setChatBlocked(true);
      }
    };

    const handleGiftReceived = (data) => {
      console.log('[Chat] Gift received in chat:', data);
      triggerGiftAnimation(data);
    };

    const handleChatUserOffline = (data) => {
      console.log('[Chat] Other user went offline:', data);
      // Show system message that user is offline
      const offlineMsg = {
        id: `offline_${Date.now()}`,
        text: data.message || 'User went offline.',
        sent: false,
        type: 'system',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, offlineMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleMessageError = (data) => {
      if (data.type === 'session_ended') {
        // Session ended — disable input for listener
        setChatBlocked(true);
        const errorMsg = {
          id: `error_${Date.now()}`,
          text: data.error || 'Session has ended.',
          sent: false,
          type: 'system',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else if (data.type === 'listener_offline') {
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

    const handleListenerStatusChanged = (data) => {
      console.log('[Chat] Listener status changed:', data);
      const { userId, isOnline } = data;
      if (currentUserId && userId.toString() === currentUserId.toString()) {
        setIsListenerOnline(isOnline);
        if (!isOnline) {
          setChatBlocked(true);
        } else {
          setMessages(prev => {
            const nonSystemMessages = prev.filter(m => m.type !== 'system' && m.type !== 'date');
            const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
            const isBlockedBySession = !sessionActive && (!lastMessage || !lastMessage.sent);
            setChatBlocked(isBlockedBySession);
            return prev;
          });
        }
      }
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

  const handleSend = () => {
    if (message.trim() && realConversationId && currentUserId) {
      if (chatBlocked) {
        if (userRole === 'USER') router.push('/balance');
        return;
      }
      
      const tempId = `temp_${Date.now()}`;
      const msgContent = message.trim();

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
    }
  };

  const handleTextChange = (text) => {
    setMessage(text);
    if (realConversationId && currentUserId) {
      socketService.emit('typing', { conversationId: realConversationId, userId: currentUserId });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketService.emit('stop_typing', { conversationId: realConversationId, userId: currentUserId });
      }, 2000);
    }
  };

  const handleEmojiPress = (emoji) => setMessage((prev) => prev + emoji);

  const handleSendSticker = (stickerUrl) => {
    if (realConversationId && currentUserId) {
      if (chatBlocked) {
        if (userRole === 'USER') router.push('/balance');
        return;
      }
      
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        text: '',
        sent: true,
        type: 'sticker',
        mediaUrl: stickerUrl,
        senderId: currentUserId,
        senderModel: userRole === 'LISTENER' ? 'Listener' : 'User',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      socketService.emit('send_message', {
        conversationId: realConversationId, 
        senderId: currentUserId, 
        senderModel: userRole === 'LISTENER' ? 'Listener' : 'User',
        content: '', 
        type: 'sticker', 
        mediaUrl: stickerUrl,
      });
      setShowStickers(false);
    }
  };

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
              <View style={{ width: wp(25), height: hp(1.8), borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: hp(0.5) }} />
              <View style={{ width: wp(15), height: hp(1.2), borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }} />
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
        
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={userRole !== 'USER'}
          onPress={() => {
            if (userRole === 'USER' && otherUserId) {
              router.push({
                pathname: '/listener-profile/[id]',
                params: { id: otherUserId }
              });
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: wp(2) }}
        >
          <Image source={avatarSource} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
            <Text style={styles.headerStatus}>{isTyping ? 'Typing...' : 'Online'}</Text>
          </View>
        </TouchableOpacity>

        {/* Timed Session Capsule */}
        {sessionActive && (
          <View style={styles.sessionHeaderWrap}>
            <TouchableOpacity
              style={styles.timerBadge}
              activeOpacity={0.7}
              onPress={() => { if (userRole === 'USER') setShowCostPopup(true); }}
            >
              <Ionicons name="time" size={wp(3.5)} color="#22C55E" style={{ marginRight: wp(1) }} />
              <Text style={[styles.timerText, { color: '#22C55E' }]}>{formatDuration(sessionRemaining)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.endSessionBtn}
              activeOpacity={0.7}
              onPress={handleEndSession}
            >
              <Text style={styles.endSessionText}>End</Text>
            </TouchableOpacity>
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
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={wp(12)} color="#333" />
            <Text style={styles.emptyChatText}>Say hello! Your first message is free.</Text>
          </View>
        ) : (
          messages.map((item) => <MessageBubble key={item.id} item={item} />)
        )}
        <View style={{ height: hp(1) }} />
      </ScrollView>

      {/* Sticker panel */}
      {showStickers && (
        <View style={styles.stickerPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STICKERS.map((stickerUrl, idx) => (
              <TouchableOpacity key={idx} onPress={() => handleSendSticker(stickerUrl)}>
                <Image source={{ uri: stickerUrl }} style={styles.stickerThumb} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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

      {/* Chat blocked banner */}
      {chatBlocked && userRole === 'USER' && (
        <TouchableOpacity style={styles.blockedBanner} activeOpacity={0.85} onPress={() => router.push('/balance')}>
          <Ionicons name="wallet-outline" size={wp(4.5)} color="#F59E0B" />
          <Text style={styles.blockedBannerText}>Insufficient balance. Tap to recharge.</Text>
          <Ionicons name="chevron-forward" size={wp(4)} color="#F59E0B" />
        </TouchableOpacity>
      )}

      {/* Input bar */}
      {isAdminChat ? (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, hp(1.2)), justifyContent: 'center', alignItems: 'center', minHeight: hp(6) }]}>
          <Text style={{ color: '#9CA3AF', fontSize: wp(3.5), fontFamily: 'Inter_500Medium', fontStyle: 'italic' }}>
            Replying to admin messages is disabled.
          </Text>
        </View>
      ) : sessionStatus === 'completed' ? (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, hp(1.2)), justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#9CA3AF', fontSize: wp(3.5), fontFamily: 'Inter_500Medium', fontStyle: 'italic' }}>
            This chat session has ended.
          </Text>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, hp(1.2)) }]}>
          <TextInput
            style={styles.textInput}
            placeholder={
              chatBlocked 
                ? (userRole === 'LISTENER' 
                    ? (!isListenerOnline 
                        ? 'Please go online to send messages.' 
                        : 'Waiting for user to send a message...') 
                    : 'Recharge to continue...') 
                : 'Enter your message...'
            }
            placeholderTextColor="#6B7280"
            value={message}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            multiline
            editable={!chatBlocked}
          />
          <View style={styles.inputActions}>
            {userRole === 'USER' && (
              <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={() => setShowGiftPopup(true)}>
                <Ionicons name="gift-outline" size={wp(5.5)} color="#A855F7" />
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={handleSend}>
              <Ionicons name="send" size={wp(5.5)} color={chatBlocked ? '#4B5563' : '#EC4899'} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.inputAction}
              onPress={() => { setShowEmojis(!showEmojis); setShowStickers(false); }}>
              <Ionicons name="happy-outline" size={wp(5.5)} color={showEmojis ? '#EC4899' : '#9CA3AF'} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.inputAction}
              onPress={() => { setShowStickers(!showStickers); setShowEmojis(false); }}>
              <Ionicons name="star-outline" size={wp(5.5)} color={showStickers ? '#EC4899' : '#9CA3AF'} />
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
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: wp(2),
  },
  headerAvatar: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    borderWidth: 2, borderColor: '#EC4899',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: wp(3.8), color: '#fff', fontWeight: '700' },
  headerStatus: { fontSize: wp(2.8), color: '#22C55E' },
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
    gap: wp(1), borderWidth: 1, borderColor: '#333',
  },
  coinEmoji: { fontSize: wp(3.5) },
  coinCount: { fontSize: wp(3.5), color: '#fff', fontWeight: '700' },

  // Messages
  messagesScroll: { flex: 1 },
  messagesContent: { paddingHorizontal: wp(3.5), paddingTop: hp(2), flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: hp(25) },
  emptyChatText: { color: '#4B5563', fontSize: wp(3.6), marginTop: hp(1.5) },
  dateLabel: { fontSize: wp(2.8), color: '#6B7280', textAlign: 'center', marginVertical: hp(1.5) },

  // Bubbles
  bubbleRow: { marginBottom: hp(0.7) },
  bubbleRowSent: { alignItems: 'flex-end' },
  bubbleRowReceived: { alignItems: 'flex-start' },
  bubble: { maxWidth: wp(72), borderRadius: wp(4.5), paddingHorizontal: wp(3.5), paddingVertical: hp(1.2) },
  bubbleSent: { backgroundColor: '#7C3AED', borderBottomRightRadius: wp(1) },
  bubbleReceived: { backgroundColor: '#1F2937', borderBottomLeftRadius: wp(1) },
  mediaBubble: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
  bubbleText: { fontSize: wp(3.6), color: '#fff', lineHeight: wp(5.2) },
  timeStamp: { fontSize: wp(2.3), color: 'rgba(255,255,255,0.45)', textAlign: 'right', marginTop: hp(0.5) },

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

  // Sticker & Emoji
  stickerPanel: {
    backgroundColor: '#111', paddingVertical: hp(1.5), paddingHorizontal: wp(3),
    borderTopWidth: 1, borderTopColor: '#222', height: hp(10),
  },
  stickerThumb: { width: wp(15), height: wp(15), marginRight: wp(3) },
  emojiPanel: { backgroundColor: '#111', height: hp(22), borderTopWidth: 1, borderTopColor: '#222' },
  emojiContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: wp(2.5), justifyContent: 'center' },
  emojiButton: { padding: wp(2), margin: wp(1) },
  emojiText: { fontSize: wp(6) },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: wp(3),
    paddingTop: hp(1), borderTopWidth: 1, borderTopColor: '#1A1A1A', backgroundColor: '#000',
  },
  textInput: { flex: 1, fontSize: wp(3.6), color: '#fff', paddingVertical: hp(1), maxHeight: hp(12) },
  inputActions: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), paddingBottom: hp(0.7) },
  inputAction: { width: wp(9), height: wp(9), alignItems: 'center', justifyContent: 'center' },

  // Timed chat session styles
  sessionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginRight: wp(1),
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  timerText: {
    fontSize: wp(3),
    color: '#EF4444',
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
