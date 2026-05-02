import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';
import { chatAPI } from '../../utils/api';

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

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ConversationItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.convItem}
    activeOpacity={0.6}
    onPress={() => onPress(item)}
  >
    <Image source={getAvatarImage(item.gender, item.avatarIndex)} style={styles.convAvatar} />
    <View style={styles.convInfo}>
      <Text style={styles.convName}>{item.name}</Text>
      <Text style={styles.convPreview} numberOfLines={1}>
        {item.lastMessage || 'Started a conversation'}
      </Text>
    </View>
    <View style={styles.convRight}>
      <Text style={[styles.convTime, item.unread > 0 && styles.convTimeNew]}>
        {formatTime(item.time)}
      </Text>
      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      const data = response.data || response || [];
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const filtered = search
    ? conversations.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const handleOpenChat = (item) => {
    router.push({
      pathname: '/chat',
      params: {
        name: item.name,
        id: item.id,
        avatarIndex: item.avatarIndex?.toString() || '0',
        gender: item.gender || 'Female',
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Conversations</Text>
        <View style={{ width: 22 }} />
      </View>

      {}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
        />
        <Ionicons name="search" size={18} color="#6B7280" />
      </View>

      {}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EC4899"
            colors={['#EC4899']}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>
              {search ? 'No conversations match your search' : 'No conversations yet'}
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <ConversationItem key={item.id} item={item} onPress={handleOpenChat} />
          ))
        )}
        <View style={{ height: vs(20) }} />
      </ScrollView>
    </View>
  );
}

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
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    gap: s(8),
  },
  headerTitle: {
    flex: 1,
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter_700Bold',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    marginHorizontal: s(16),
    marginBottom: vs(8),
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  searchInput: {
    flex: 1,
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(16),
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SH * 0.2,
  },
  emptyText: {
    color: '#4B5563',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    marginTop: vs(12),
  },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  convAvatar: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    marginRight: s(12),
  },
  convInfo: {
    flex: 1,
    marginRight: s(8),
  },
  convName: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  convPreview: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  convRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  convTime: {
    fontSize: ms(11, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  convTimeNew: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  unreadBadge: {
    backgroundColor: '#EC4899',
    borderRadius: s(10),
    width: s(20),
    height: s(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: ms(10, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
