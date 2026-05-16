import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hp, wp, ms } from '../../utils/responsive';
import { chatAPI, walletAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';

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
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setCurrentUserId(user._id || user.id);
          setUserRole(user.role || 'USER');
        }

        // Fetch balance
        try {
          const balRes = await walletAPI.getBalance();
          if (balRes?.data) setCoinBalance(balRes.data.coins || 0);
        } catch (e) { console.log('Balance fetch error:', e); }

        await socketService.connect();

        if (conversationId) {
          console.log('[Chat] Joining room:', conversationId);
          socketService.joinRoom(conversationId);
          const response = await chatAPI.getMessages(conversationId);
          const apiMessages = response.data || response || [];

          const formatted = insertDateLabels(
            apiMessages.map((msg) => ({
              id: msg._id,
              text: msg.content,
              sent: false,
              type: msg.type || 'text',
              mediaUrl: msg.mediaUrl,
              senderId: msg.sender?._id || msg.sender,
              senderModel: msg.senderModel,
              createdAt: msg.createdAt,
            }))
          );
          setMessages(formatted);
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
      }
    };
    init();
    return () => { if (conversationId) socketService.leaveRoom(conversationId); };
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
      const isSystem = msg.senderModel === 'System' || msg.type === 'system';
      
      const msgSenderId = (msg.sender?._id || msg.sender || '').toString();
      const myId = (currentUserId || '').toString();
      
      const isSent = !isSystem && msgSenderId === myId;
      
      setMessages((prev) => {
        const messageId = msg._id || Math.random().toString();
        if (prev.some(m => m.id === messageId)) return prev;
        
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

    socketService.on('receive_message', handleNewMessage);
    socketService.on('user_typing', handleTyping);
    socketService.on('user_stop_typing', handleStopTyping);
    socketService.on('balance_updated', handleBalanceUpdate);
    socketService.on('insufficient_balance', handleInsufficientBalance);

    return () => {
      socketService.off('receive_message', handleNewMessage);
      socketService.off('user_typing', handleTyping);
      socketService.off('user_stop_typing', handleStopTyping);
      socketService.off('balance_updated', handleBalanceUpdate);
      socketService.off('insufficient_balance', handleInsufficientBalance);
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
    if (message.trim() && conversationId && currentUserId) {
      if (chatBlocked && userRole === 'USER') {
        router.push('/balance');
        return;
      }
      const msgData = {
        conversationId, 
        senderId: currentUserId, 
        senderModel: userRole === 'LISTENER' ? 'Listener' : 'User',
        content: message.trim(), 
        type: 'text',
      };
      console.log('[Chat] Sending message:', msgData);
      socketService.emit('send_message', msgData);
      socketService.emit('stop_typing', { conversationId, userId: currentUserId });
      setMessage('');
      setShowEmojis(false);
    }
  };

  const handleTextChange = (text) => {
    setMessage(text);
    if (conversationId && currentUserId) {
      socketService.emit('typing', { conversationId, userId: currentUserId });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketService.emit('stop_typing', { conversationId, userId: currentUserId });
      }, 2000);
    }
  };

  const handleEmojiPress = (emoji) => setMessage((prev) => prev + emoji);

  const handleSendSticker = (stickerUrl) => {
    if (conversationId && currentUserId) {
      if (chatBlocked) { router.push('/balance'); return; }
      socketService.emit('send_message', {
        conversationId, senderId: currentUserId, senderModel: 'User',
        content: '', type: 'sticker', mediaUrl: stickerUrl,
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
        <Image source={avatarSource} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{name}</Text>
          <Text style={styles.headerStatus}>{isTyping ? 'Typing...' : 'Online'}</Text>
        </View>
        {/* Call actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionBtn} 
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: '/(call)/connecting',
              params: {
                name: name,
                callType: 'audio',
                callId: `call_${Date.now()}`,
                roomId: `room_${Date.now()}`,
                listenerId: userRole === 'USER' ? conversationId : currentUserId,
                userId: userRole === 'LISTENER' ? conversationId : currentUserId,
                avatarIndex: avatarIndex,
                gender: gender,
                role: userRole
              }
            })}
          >
            <Ionicons name="call" size={wp(5)} color="#22C55E" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerActionBtn} 
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: '/(call)/connecting',
              params: {
                name: name,
                callType: 'video',
                callId: `call_${Date.now()}`,
                roomId: `room_${Date.now()}`,
                listenerId: userRole === 'USER' ? conversationId : currentUserId,
                userId: userRole === 'LISTENER' ? conversationId : currentUserId,
                avatarIndex: avatarIndex,
                gender: gender,
                role: userRole
              }
            })}
          >
            <Ionicons name="videocam" size={wp(5)} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Coin badge */}
        <TouchableOpacity style={styles.coinBadge} activeOpacity={0.7} onPress={() => router.push('/balance')}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinCount}>{coinBalance}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
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
});
