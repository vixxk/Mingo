import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { hp, wp, ms } from '../../utils/responsive';
import { chatAPI, walletAPI, giftsAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import GiftPopup from '../../components/shared/GiftPopup';

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
    name = 'User', id: conversationId, avatarIndex = '0', gender = 'Female',
  } = useLocalSearchParams();

  const avatarSource = getAvatarImage(gender, avatarIndex);

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

  const startLocalCountdown = (startedAtTime, durationMs = 300000) => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    
    const calculateRemaining = () => {
      const elapsed = Date.now() - new Date(startedAtTime).getTime();
      const remainingSecs = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
      setSessionRemaining(remainingSecs);
      
      if (remainingSecs <= 0) {
        clearInterval(sessionTimerRef.current);
      }
    };
    
    calculateRemaining();
    sessionTimerRef.current = setInterval(calculateRemaining, 1000);
  };

  const [messages, setMessages] = useState([]);
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
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [receivedGift, setReceivedGift] = useState(null);

  const giftAnim = useRef(new Animated.Value(0)).current;
  const sessionTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);
  const realConversationIdRef = useRef(conversationId);

  useEffect(() => {
    realConversationIdRef.current = realConversationId;
  }, [realConversationId]);

  useEffect(() => {
    const init = async () => {
      try {
        let myId = null;
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          myId = user._id || user.id;
          setCurrentUserId(myId);
          setUserRole(user.role || 'USER');
        }

        // Fetch balance
        try {
          const balRes = await walletAPI.getBalance();
          if (balRes?.data) setCoinBalance(balRes.data.coins || 0);
        } catch (e) { console.log('Balance fetch error:', e); }

        await socketService.connect();

        if (conversationId) {
          console.log('[Chat] Initiating conversation for ID:', conversationId);
          const response = await chatAPI.getOrCreateConversation(conversationId);
          
          if (response?.data) {
            const actualConvId = response.data.conversationId;
            setRealConversationId(actualConvId);
            
            const parts = response.data.participants || [];
            const other = parts.find(p => p.toString() !== myId?.toString());
            if (other) {
              setOtherUserId(other.toString());
            } else {
              setOtherUserId(conversationId);
            }

            console.log('[Chat] Joining room:', actualConvId);
            socketService.joinRoom(actualConvId);

            // Handle chat session from response
            const session = response.data.chatSession;
            if (session && session.active) {
              setSessionActive(true);
              startLocalCountdown(session.lastDeductionTime || session.startTime);
            }

            const apiMessages = response.data.messages || [];
            const formatted = insertDateLabels(
              apiMessages.map((msg) => ({
                id: msg._id,
                text: msg.content,
                sent: myId && String(msg.sender?._id || msg.sender) === String(myId),
                type: msg.type || 'text',
                mediaUrl: msg.mediaUrl,
                senderId: msg.sender?._id || msg.sender,
                senderModel: msg.senderModel,
                createdAt: msg.createdAt,
              }))
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
      
      setMessages((prev) => {
        const messageId = (msg._id || Math.random()).toString();
        if (prev.some(m => m.id?.toString() === messageId)) return prev;
        
        // If it's a message we sent, look for a matching optimistic message (temp_*) to replace
        if (isSent) {
          const optimisticIndex = prev.findIndex(m => 
            String(m.id).startsWith('temp_') && 
            m.text === msg.content && 
            m.senderId === msgSenderId
          );
          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = {
              id: messageId,
              text: msg.content,
              sent: true,
              type: msg.type || 'text',
              mediaUrl: msg.mediaUrl,
              senderId: msgSenderId,
              senderModel: msg.senderModel,
              createdAt: msg.createdAt,
            };
            return updated;
          }
        }
        
        return [
          ...prev,
          {
            id: messageId,
            text: msg.content,
            sent: isSent,
            type: msg.type || 'text',
            mediaUrl: msg.mediaUrl,
            senderId: msgSenderId,
            senderModel: msg.senderModel,
            createdAt: msg.createdAt,
          },
        ];
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
      startLocalCountdown(session.lastDeductionTime || session.startTime);
    };

    const handleSessionRenewed = (data) => {
      console.log('[Chat] Session renewed:', data);
      setSessionActive(true);
      const session = data.chatSession;
      startLocalCountdown(session.lastDeductionTime || session.startTime);
    };

    const handleSessionEnded = () => {
      console.log('[Chat] Session ended');
      setSessionActive(false);
      setSessionRemaining(0);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };

    const handleGiftReceived = (data) => {
      console.log('[Chat] Gift received in chat:', data);
      setReceivedGift(data);
      giftAnim.setValue(0);
      Animated.sequence([
        Animated.timing(giftAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(giftAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => setReceivedGift(null));
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
    };
  }, [currentUserId]);

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
      if (chatBlocked && userRole === 'USER') {
        router.push('/balance');
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
      if (chatBlocked && userRole === 'USER') { router.push('/balance'); return; }
      
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
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading chat...</Text>
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
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={userRole !== 'USER'}
          onPress={() => {
            if (userRole === 'USER') {
              router.push({
                pathname: '/(listener)/listener-profile',
                params: { id: otherUserId || conversationId }
              });
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: wp(2) }}
        >
          <Image source={avatarSource} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
            <Text style={styles.headerStatus}>{isTyping ? 'Typing...' : 'Online'}</Text>
          </View>
        </TouchableOpacity>

        {/* Timed Session Capsule */}
        {sessionActive && (
          <View style={styles.sessionHeaderWrap}>
            <View style={styles.timerBadge}>
              <Ionicons name="time" size={wp(3.5)} color="#EF4444" style={{ marginRight: wp(1) }} />
              <Text style={styles.timerText}>{formatDuration(sessionRemaining)}</Text>
            </View>
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
      {chatBlocked && (
        <TouchableOpacity style={styles.blockedBanner} activeOpacity={0.85} onPress={() => router.push('/balance')}>
          <Ionicons name="wallet-outline" size={wp(4.5)} color="#F59E0B" />
          <Text style={styles.blockedBannerText}>Insufficient balance. Tap to recharge.</Text>
          <Ionicons name="chevron-forward" size={wp(4)} color="#F59E0B" />
        </TouchableOpacity>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, hp(1.2)) }]}>
        <TextInput
          style={styles.textInput}
          placeholder={chatBlocked ? 'Recharge to continue...' : 'Enter your message...'}
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
      {/* Gift Popup for sending gifts */}
      <GiftPopup
        visible={showGiftPopup}
        onClose={() => setShowGiftPopup(false)}
        receiverId={otherUserId || conversationId}
        onGiftSent={(gift) => {
          if (realConversationId && currentUserId) {
            socketService.emit('send_message', {
              conversationId: realConversationId,
              senderId: currentUserId,
              senderModel: 'User',
              content: `Sent a gift: ${gift.name} ${gift.icon}`,
              type: 'text',
            });
          }
        }}
      />

      {/* Received Gift Animation/Overlay (especially for listeners) */}
      {receivedGift && (
        <Animated.View style={[styles.giftNotification, { opacity: giftAnim }]}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.95)', 'rgba(236, 72, 153, 0.95)', 'rgba(245, 158, 11, 0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.giftNotificationContent}
          >
            <Text style={styles.giftNotificationText}>
              {receivedGift.senderName || 'Someone'} sent you a gift!
            </Text>
            <Text style={styles.giftNotificationIcon}>
              {receivedGift.gift?.icon || '🎁'}
            </Text>
            <Text style={styles.giftNotificationName}>
              {receivedGift.gift?.name || 'Gift'} x{receivedGift.gift?.count || 1}
            </Text>
          </LinearGradient>
        </Animated.View>
      )}
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
});
