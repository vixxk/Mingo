import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';
import { chatAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';

const { height: SH } = Dimensions.get('window');

const getAvatarImage = (gender, index) => {
  const parsedIndex = parseInt(index, 10) || 0;
  if (gender === 'Male') {
    const maleAvatars = [
      require('../../images/male_avatar_1_1776972918440.png'),
      require('../../images/male_avatar_2_1776972933241.png'),
      require('../../images/male_avatar_3_1776972950218.png'),
      require('../../images/male_avatar_4_1776972963577.png'),
      require('../../images/male_avatar_5_1776972978900.png'),
      require('../../images/male_avatar_6_1776972993180.png'),
      require('../../images/male_avatar_7_1776973008143.png'),
      require('../../images/male_avatar_8_1776973021635.png'),
    ];
    return maleAvatars[parsedIndex] || maleAvatars[0];
  } else {
    const femaleAvatars = [
      require('../../images/female_avatar_1_1776973035859.png'),
      require('../../images/female_avatar_2_1776973050039.png'),
      require('../../images/female_avatar_3_1776973063471.png'),
      require('../../images/female_avatar_4_1776973077539.png'),
      require('../../images/female_avatar_5_1776973090730.png'),
      require('../../images/female_avatar_6_1776973108100.png'),
      require('../../images/female_avatar_7_1776973124018.png'),
      require('../../images/female_avatar_8_1776973138772.png'),
    ];
    return femaleAvatars[parsedIndex] || femaleAvatars[0];
  }
};

const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const MessageBubble = ({ item }) => {
  if (item.type === 'date') {
    return <Text style={styles.dateLabel}>{item.text}</Text>;
  }

  const isMedia = item.type === 'image' || item.type === 'sticker';
  const bubbleStyle = isMedia
    ? styles.mediaBubble
    : item.sent
    ? styles.bubbleSent
    : styles.bubbleReceived;

  return (
    <View
      style={[
        styles.bubbleRow,
        item.sent ? styles.bubbleRowSent : styles.bubbleRowReceived,
      ]}
    >
      <View style={[styles.bubble, bubbleStyle]}>
        {(!item.type || item.type === 'text') && (
          <Text style={styles.bubbleText}>{item.text}</Text>
        )}
        {item.type === 'sticker' && (
          <Image
            source={{ uri: item.mediaUrl }}
            style={{ width: s(100), height: s(100) }}
            resizeMode="contain"
          />
        )}
        {item.type === 'image' && (
          <Image
            source={{ uri: item.mediaUrl }}
            style={{ width: s(200), height: vs(200), borderRadius: 10 }}
            resizeMode="cover"
          />
        )}
        <Text style={styles.timeStamp}>
          {item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
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
  '😀', '😂', '🥺', '😍', '🙏', '👍', '😭', '🔥', '🥰', '😊', '✨', '❤️', '🙌', '😎', '🤔', '😘',
  '🙄', '😔', '😏', '💕', '👏', '😁', '😌', '😅', '😜', '💖', '✌️', '😉', '🎉', '🌟', '💯', '🔥',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    name = 'User',
    id: conversationId,
    avatarIndex = '0',
    gender = 'Female',
  } = useLocalSearchParams();

  const avatarSource = getAvatarImage(gender, avatarIndex);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStickers, setShowStickers] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setCurrentUserId(user._id || user.id);
        }

        await socketService.connect();

        if (conversationId) {
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

    return () => {
      if (conversationId) {
        socketService.leaveRoom(conversationId);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    if (!currentUserId) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.type === 'date') return msg;
        return { ...msg, sent: msg.senderId === currentUserId };
      })
    );
  }, [currentUserId]);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      const isSent = msg.sender === currentUserId || msg.sender?._id === currentUserId;
      setMessages((prev) => [
        ...prev,
        {
          id: msg._id || Math.random().toString(),
          text: msg.content,
          sent: isSent,
          type: msg.type || 'text',
          mediaUrl: msg.mediaUrl,
          senderId: msg.sender?._id || msg.sender,
          createdAt: msg.createdAt,
        },
      ]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socketService.on('receive_message', handleNewMessage);
    socketService.on('user_typing', handleTyping);
    socketService.on('user_stop_typing', handleStopTyping);

    return () => {
      socketService.off('receive_message', handleNewMessage);
      socketService.off('user_typing', handleTyping);
      socketService.off('user_stop_typing', handleStopTyping);
    };
  }, [currentUserId]);

  const insertDateLabels = (msgs) => {
    const result = [];
    let lastDate = '';
    msgs.forEach((msg) => {
      const d = msg.createdAt ? new Date(msg.createdAt).toDateString() : '';
      if (d && d !== lastDate) {
        lastDate = d;
        result.push({
          id: `date-${d}`,
          type: 'date',
          text: formatDateLabel(msg.createdAt),
        });
      }
      result.push(msg);
    });
    return result;
  };

  const handleSend = () => {
    if (message.trim() && conversationId && currentUserId) {
      const msgData = {
        conversationId,
        senderId: currentUserId,
        senderModel: 'User',
        content: message.trim(),
        type: 'text',
      };
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

  const handleEmojiPress = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  const handleSendSticker = (stickerUrl) => {
    if (conversationId && currentUserId) {
      const msgData = {
        conversationId,
        senderId: currentUserId,
        senderModel: 'User',
        content: '',
        type: 'sticker',
        mediaUrl: stickerUrl,
      };
      socketService.emit('send_message', msgData);
      setShowStickers(false);
    }
  };

  const handleSendImage = () => {
    if (conversationId && currentUserId) {
      const msgData = {
        conversationId,
        senderId: currentUserId,
        senderModel: 'User',
        content: '',
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/600',
      };
      socketService.emit('send_message', msgData);
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

      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Image source={avatarSource} style={styles.headerAvatar} />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{name}</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? 'Typing...' : 'Online'}
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={48} color="#333" />
            <Text style={styles.emptyChatText}>
              Say hello! Start your conversation.
            </Text>
          </View>
        ) : (
          messages.map((item) => <MessageBubble key={item.id} item={item} />)
        )}
        <View style={{ height: vs(8) }} />
      </ScrollView>

      {}
      {showStickers && (
        <View style={styles.stickerPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STICKERS.map((stickerUrl, idx) => (
              <TouchableOpacity key={idx} onPress={() => handleSendSticker(stickerUrl)}>
                <Image
                  source={{ uri: stickerUrl }}
                  style={styles.stickerThumb}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {}
      {showEmojis && (
        <View style={styles.emojiPanel}>
          <ScrollView
            contentContainerStyle={styles.emojiContainer}
            showsVerticalScrollIndicator={false}
          >
            {EMOJIS.map((e, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleEmojiPress(e)}
                style={styles.emojiButton}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, vs(10)) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your message..."
          placeholderTextColor="#6B7280"
          value={message}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          multiline
        />
        <View style={styles.inputActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={handleSend}>
            <Ionicons name="send" size={22} color="#EC4899" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.inputAction}
            onPress={() => {
              setShowEmojis(!showEmojis);
              setShowStickers(false);
            }}
          >
            <Ionicons
              name="happy-outline"
              size={22}
              color={showEmojis ? '#EC4899' : '#9CA3AF'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.inputAction}
            onPress={() => {
              setShowStickers(!showStickers);
              setShowEmojis(false);
            }}
          >
            <Ionicons
              name="star-outline"
              size={22}
              color={showStickers ? '#EC4899' : '#9CA3AF'}
            />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={handleSendImage}>
            <Ionicons name="image-outline" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const MAX_BUBBLE = SCREEN_WIDTH * 0.72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    marginTop: vs(12),
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: vs(10),
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    gap: s(8),
  },
  headerAvatar: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    borderWidth: 2,
    borderColor: '#EC4899',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  headerStatus: {
    fontSize: ms(11, 0.3),
    color: '#22C55E',
    fontFamily: 'Inter_400Regular',
  },

  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: s(14),
    paddingTop: vs(16),
    flexGrow: 1,
  },

  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SH * 0.25,
  },
  emptyChatText: {
    color: '#4B5563',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    marginTop: vs(12),
  },

  dateLabel: {
    fontSize: ms(11, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginVertical: vs(12),
  },

  bubbleRow: {
    marginBottom: vs(6),
  },
  bubbleRowSent: {
    alignItems: 'flex-end',
  },
  bubbleRowReceived: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: MAX_BUBBLE,
    borderRadius: 18,
    paddingHorizontal: s(14),
    paddingVertical: vs(10),
  },
  bubbleSent: {
    backgroundColor: '#2A2A2A',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#DC2626',
    borderBottomLeftRadius: 4,
  },
  mediaBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bubbleText: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(20),
  },
  timeStamp: {
    fontSize: ms(9, 0.3),
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginTop: vs(4),
  },

  stickerPanel: {
    backgroundColor: '#111',
    paddingVertical: vs(12),
    paddingHorizontal: s(12),
    borderTopWidth: 1,
    borderTopColor: '#222',
    height: vs(80),
  },
  stickerThumb: {
    width: s(60),
    height: s(60),
    marginRight: s(12),
  },

  emojiPanel: {
    backgroundColor: '#111',
    height: vs(180),
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  emojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: s(10),
    justifyContent: 'center',
  },
  emojiButton: {
    padding: s(8),
    margin: s(4),
  },
  emojiText: {
    fontSize: ms(24, 0.3),
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: s(12),
    paddingTop: vs(8),
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    backgroundColor: '#000',
  },
  textInput: {
    flex: 1,
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    paddingVertical: vs(8),
    maxHeight: vs(100),
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingBottom: vs(6),
  },
  inputAction: {
    width: s(36),
    height: s(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
