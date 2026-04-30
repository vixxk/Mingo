import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';


const IMAGE_MAP = {
  priya: require('../../images/user_priya.png'),
  shruti: require('../../images/user_shruti.png'),
  ananya: require('../../images/user_ananya.png'),
  neha: require('../../images/user_neha.png'),
  riya: require('../../images/user_riya.png'),
};
const DEFAULT_AVATAR = require('../../images/user_priya.png');

const DEMO_MESSAGES = [
  { id: '1', text: 'This is the main chat template', sent: true },
  { id: '2', text: 'This is the main chat template', sent: true },
  { id: 'date', type: 'date', text: 'Nov 30, 2023, 9:41 AM' },
  { id: '3', text: 'Oh?', sent: false },
  { id: '4', text: 'How does it work?', sent: false },
  { id: '5', text: 'Simple', sent: true },
  {
    id: '6',
    text: "You just edit any text to type in the conversation you want to show, and delete any bubbles you don't want to use",
    sent: false,
  },
  { id: '7', text: 'Boom', sent: true },
  { id: '8', text: 'Hmmm', sent: false },
  { id: '9', text: 'I think I get it', sent: false },
  { id: '10', text: 'I think I get it', sent: false },
];

const MessageBubble = ({ item }) => {
  if (item.type === 'date') {
    return <Text style={styles.dateLabel}>{item.text}</Text>;
  }

  
  const isMedia = item.type === 'image' || item.type === 'sticker';
  const bubbleStyle = isMedia ? styles.mediaBubble : (item.sent ? styles.bubbleSent : styles.bubbleReceived);

  return (
    <View
      style={[
        styles.bubbleRow,
        item.sent ? styles.bubbleRowSent : styles.bubbleRowReceived,
      ]}
    >
      <View style={[styles.bubble, bubbleStyle]}>
        {(!item.type || item.type === 'text') && <Text style={styles.bubbleText}>{item.text}</Text>}
        {item.type === 'sticker' && (
           <Image source={{ uri: item.mediaUrl }} style={{ width: s(100), height: s(100) }} resizeMode="contain" />
        )}
        {item.type === 'image' && (
           <Image source={{ uri: item.mediaUrl }} style={{ width: s(200), height: vs(200), borderRadius: 10 }} resizeMode="cover" />
        )}
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
  '🙄', '😔', '😏', '💕', '👏', '😁', '😌', '😅', '😜', '💖', '✌️', '😉', '🎉', '🌟', '💯', '🔥'
];

const DEMO_CONVERSATION_ID = 'demo-room-1';
const MY_USER_ID = 'user-' + Math.random().toString(36).substr(2, 9);

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = 'Priya Sharma', imageKey = 'priya' } = useLocalSearchParams();
  const avatarSource = IMAGE_MAP[imageKey] || DEFAULT_AVATAR;
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [socket, setSocket] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const backendUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    const newSocket = io(backendUrl);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('join_conversation', DEMO_CONVERSATION_ID);
    });

    newSocket.on('receive_message', (msg) => {
      const isSent = msg.sender === MY_USER_ID;
      setMessages((prev) => [...prev, {
        id: msg._id || Math.random().toString(),
        text: msg.content,
        sent: isSent,
        type: msg.type || 'text',
        mediaUrl: msg.mediaUrl
      }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const handleSend = () => {
    if (message.trim() && socket) {
      const msgData = {
        conversationId: DEMO_CONVERSATION_ID,
        senderId: MY_USER_ID,
        senderModel: 'User',
        content: message.trim(),
        type: 'text'
      };
      socket.emit('send_message', msgData);
      setMessage('');
      setShowEmojis(false);
    }
  };

  const handleEmojiPress = (emoji) => {
    setMessage((prev) => prev + emoji);
  };

  const handleSendSticker = (stickerUrl) => {
    if (socket) {
      const msgData = {
        conversationId: DEMO_CONVERSATION_ID,
        senderId: MY_USER_ID,
        senderModel: 'User',
        content: '',
        type: 'sticker',
        mediaUrl: stickerUrl
      };
      socket.emit('send_message', msgData);
      setShowStickers(false);
    }
  };

  const handleSendImage = () => {
    if (socket) {
      const msgData = {
        conversationId: DEMO_CONVERSATION_ID,
        senderId: MY_USER_ID,
        senderModel: 'User',
        content: '',
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/600' 
      };
      socket.emit('send_message', msgData);
    }
  };

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

        <Image
          source={avatarSource}
          style={styles.headerAvatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{name}</Text>
          <Text style={styles.headerStatus}>Active 20m ago</Text>
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
      >
        {messages.map((item) => (
          <MessageBubble key={item.id} item={item} />
        ))}
        <View style={{ height: vs(8) }} />
      </ScrollView>

      {}
      {showStickers && (
        <View style={styles.stickerPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STICKERS.map((s, idx) => (
              <TouchableOpacity key={idx} onPress={() => handleSendSticker(s)}>
                <Image source={{ uri: s }} style={styles.stickerThumb} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {}
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

      {}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, vs(10)) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your message..."
          placeholderTextColor="#6B7280"
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          multiline
        />
        <View style={styles.inputActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={handleSend}>
            <Ionicons name="send" size={22} color="#EC4899" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={() => { setShowEmojis(!showEmojis); setShowStickers(false); }}>
            <Ionicons name="happy-outline" size={22} color={showEmojis ? "#EC4899" : "#9CA3AF"} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.inputAction} onPress={() => { setShowStickers(!showStickers); setShowEmojis(false); }}>
            <Ionicons name="star-outline" size={22} color={showStickers ? "#EC4899" : "#9CA3AF"} />
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
