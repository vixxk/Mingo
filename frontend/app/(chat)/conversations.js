import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';

const CONVERSATIONS = [
  {
    id: '1',
    name: 'Priya Sharma',
    preview: 'Lorem ipsum dolor sit amet, consecte...',
    time: 'New',
    unread: 3,
    image: require('../../images/user_priya.png'),
  },
  {
    id: '2',
    name: 'Khushi',
    preview: 'Lorem ipsum dolor sit amet, consect...',
    time: '5 Min',
    unread: 0,
    image: require('../../images/user_shruti.png'),
  },
  {
    id: '3',
    name: 'Angelina',
    preview: 'Lorem ipsum dolor sit amet, consect...',
    time: '5 Min',
    unread: 0,
    image: require('../../images/user_deepika.png'),
  },
  {
    id: '4',
    name: 'Sonam',
    preview: 'Lorem ipsum dolor sit amet, consect...',
    time: '5 Min',
    unread: 0,
    image: require('../../images/user_ananya.png'),
  },
  {
    id: '5',
    name: 'Shanvi',
    preview: 'Lorem ipsum dolor sit amet, consect...',
    time: '5 Min',
    unread: 0,
    image: require('../../images/user_neha.png'),
  },
  {
    id: '6',
    name: 'Roshni Kumari',
    preview: 'Lorem ipsum dolor sit amet, consect...',
    time: '5 Min',
    unread: 0,
    image: require('../../images/user_priyanka.png'),
  },
  {
    id: '7',
    name: 'Riya Singh',
    preview: 'Lorem ipsum dolor sit amet, consect...',
    time: '5 Min',
    unread: 0,
    image: require('../../images/user_riya.png'),
  },
  {
    id: '8',
    name: 'Sweta Singh',
    preview: 'Lorem ipsum dolor sit amet, consect...',
    time: '5 Min',
    unread: 0,
    image: require('../../images/user_priya.png'),
  },
];

const ConversationItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.convItem}
    activeOpacity={0.6}
    onPress={() => onPress(item)}
  >
    <Image source={item.image} style={styles.convAvatar} />
    <View style={styles.convInfo}>
      <Text style={styles.convName}>{item.name}</Text>
      <Text style={styles.convPreview} numberOfLines={1}>{item.preview}</Text>
    </View>
    <View style={styles.convRight}>
      <Text style={[styles.convTime, item.unread > 0 && styles.convTimeNew]}>
        {item.time}
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

  const filtered = search
    ? CONVERSATIONS.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : CONVERSATIONS;

  const handleOpenChat = (item) => {
    router.push({
      pathname: '/chat',
      params: { name: item.name, id: item.id },
    });
  };

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
      >
        {filtered.map((item) => (
          <ConversationItem key={item.id} item={item} onPress={handleOpenChat} />
        ))}
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
    backgroundColor: '#6B7280',
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
