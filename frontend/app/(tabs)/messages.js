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
import { wp, hp } from '../../utils/responsive';


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

        <View style={styles.quickActions}>
          <TouchableOpacity 
            onPress={() => router.push({
              pathname: '/(call)/connecting',
              params: {
                name: item.name,
                callType: 'audio',
                callId: `call_${Date.now()}`,
                roomId: `room_${Date.now()}`,
                listenerId: item.id,
                avatarIndex: item.avatarIndex,
                gender: item.gender
              }
            })}
            style={styles.quickActionBtn}
          >
            <Ionicons name="call-outline" size={20} color="#22C55E" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push({
              pathname: '/(call)/connecting',
              params: {
                name: item.name,
                callType: 'video',
                callId: `call_${Date.now()}`,
                roomId: `room_${Date.now()}`,
                listenerId: item.id,
                avatarIndex: item.avatarIndex,
                gender: item.gender
              }
            })}
            style={styles.quickActionBtn}
          >
            <Ionicons name="videocam-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
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
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
  },
  headerTitle: {
    fontSize: wp(7.5),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    borderRadius: wp(4),
    paddingHorizontal: wp(4),
    height: hp(6),
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  searchIcon: {
    marginRight: wp(2.5),
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: wp(3.8),
    fontFamily: 'Inter_400Regular',
  },
  listContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: wp(4),
  },
  avatar: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    backgroundColor: '#1F2937',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: wp(0.5),
    right: wp(0.5),
    width: wp(3.5),
    height: wp(3.5),
    borderRadius: wp(1.75),
    backgroundColor: '#10B981',
    borderWidth: wp(0.5),
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
    marginBottom: hp(0.5),
  },
  nameText: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    flex: 1,
    marginRight: wp(2.5),
  },
  timeText: {
    fontSize: wp(3),
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
    fontSize: wp(3.5),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    flex: 1,
    marginRight: wp(2.5),
  },
  messageTextUnread: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: wp(2),
    marginLeft: wp(2),
  },
  quickActionBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  unreadBadge: {
    minWidth: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.5),
  },
  unreadText: {
    color: '#fff',
    fontSize: wp(2.8),
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(8),
  },
  emptyText: {
    color: '#6B7280',
    fontSize: wp(3.8),
    fontFamily: 'Inter_500Medium',
    marginTop: hp(1.5),
  },
});
