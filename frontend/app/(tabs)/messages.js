import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';


import { chatAPI } from '../../utils/api';
import { useFocusEffect } from 'expo-router';

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

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);

  const filteredMessages = conversations.filter(msg => 
    msg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const listSlide = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(listAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(listSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const loadConversations = async () => {
        try {
          const res = await chatAPI.getConversations();
          if (res?.data) {
            setConversations(res.data);
          }
        } catch (e) {
          console.error('Error fetching conversations:', e);
        }
      };
      loadConversations();
    }, [])
  );

  const renderMessageItem = ({ item }) => {
    let timeStr = item.time;
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const d = new Date(timeStr);
      timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    return (
      <TouchableOpacity 
        style={styles.messageItem} 
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/chat', params: { id: item.id, name: item.name } })}
      >
        <View style={styles.avatarContainer}>
          <Image source={item.image || getAvatarImage(item.gender, item.avatarIndex)} style={styles.avatar} />
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.messageDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.timeText, item.unread > 0 && styles.timeTextUnread]}>{timeStr}</Text>
          </View>
          <View style={styles.messageRow}>
            <Text 
              style={[styles.messageText, item.unread > 0 && styles.messageTextUnread]} 
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {item.unread > 0 && (
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                style={styles.unreadBadge}
              >
                <Text style={styles.unreadText}>{item.unread}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={styles.headerTitle}>Messages</Text>
      </Animated.View>

      {}
      <Animated.View style={[styles.searchContainer, { opacity: headerAnim }]}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      {}
      <Animated.View style={{ flex: 1, opacity: listAnim, transform: [{ translateY: listSlide }] }}>
      <FlatList
        data={filteredMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color="#374151" />
            <Text style={styles.emptyText}>No messages found.</Text>
          </View>
        )}
      />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    paddingVertical: vs(12),
  },
  headerTitle: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    marginHorizontal: s(20),
    marginBottom: vs(16),
    borderRadius: 16,
    paddingHorizontal: s(16),
    height: vs(48),
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  searchIcon: {
    marginRight: s(10),
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: ms(15),
    fontFamily: 'Inter_400Regular',
  },
  listContainer: {
    paddingHorizontal: s(20),
    paddingBottom: vs(100),
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: s(16),
  },
  avatar: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    backgroundColor: '#1F2937',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#000',
  },
  messageDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(4),
  },
  nameText: {
    fontSize: ms(16),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    flex: 1,
    marginRight: s(10),
  },
  timeText: {
    fontSize: ms(12),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
  timeTextUnread: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    fontSize: ms(14),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    flex: 1,
    marginRight: s(10),
  },
  messageTextUnread: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  unreadBadge: {
    minWidth: s(20),
    height: s(20),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(6),
  },
  unreadText: {
    color: '#fff',
    fontSize: ms(11),
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: vs(60),
  },
  emptyText: {
    color: '#6B7280',
    fontSize: ms(15),
    fontFamily: 'Inter_500Medium',
    marginTop: vs(12),
  },
});
