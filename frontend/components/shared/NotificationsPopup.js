import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationAPI } from '../../utils/api';

const { width: SW, height: SH } = Dimensions.get('window');

export default function NotificationsPopup({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
      loadNotifications();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SH, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getNotifications();
      if (res?.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (e) {
      console.log('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.log('Failed to mark as read:', e);
    }
  };

  if (!visible) return null;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
      activeOpacity={0.7}
      onPress={() => {
        if (!item.isRead) markAsRead(item._id);
      }}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={item.type === 'payment' ? 'cash' : item.type === 'call' ? 'call' : 'notifications'}
          size={SW * 0.05}
          color="#A855F7"
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}>{item.title}</Text>
        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#1F1F1F', '#111', '#000']}
          style={styles.popup}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="notifications" size={SW * 0.06} color="#A855F7" />
              <Text style={styles.title}>Notifications</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
              <Ionicons name="close" size={SW * 0.06} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#A855F7" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={SW * 0.12} color="#374151" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>You're all caught up! We'll notify you when something important happens.</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderItem}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  popup: {
    borderTopLeftRadius: SW * 0.08,
    borderTopRightRadius: SW * 0.08,
    maxHeight: SH * 0.8,
    borderWidth: 1,
    borderColor: '#333',
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SW * 0.06,
    paddingTop: SH * 0.03,
    paddingBottom: SH * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW * 0.02,
  },
  title: {
    fontSize: SW * 0.05,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
  },
  closeBtn: {
    width: SW * 0.08,
    height: SW * 0.08,
    borderRadius: SW * 0.04,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH * 0.06,
    paddingHorizontal: SW * 0.1,
  },
  emptyIconWrap: {
    width: SW * 0.2,
    height: SW * 0.2,
    borderRadius: SW * 0.1,
    backgroundColor: 'rgba(55, 65, 81, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SH * 0.02,
  },
  emptyTitle: {
    fontSize: SW * 0.045,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: SH * 0.01,
  },
  emptySubtext: {
    fontSize: SW * 0.032,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: SW * 0.05,
  },
  listContent: {
    padding: SW * 0.04,
    paddingBottom: SH * 0.1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: SW * 0.04,
    borderRadius: SW * 0.04,
    marginBottom: SH * 0.015,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  notificationCardUnread: {
    backgroundColor: '#1A1525',
    borderColor: '#3B1A65',
  },
  iconWrap: {
    width: SW * 0.12,
    height: SW * 0.12,
    borderRadius: SW * 0.06,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SW * 0.03,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: SW * 0.038,
    color: '#E5E7EB',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  cardTitleUnread: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  cardBody: {
    fontSize: SW * 0.032,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: SW * 0.045,
  },
  cardTime: {
    fontSize: SW * 0.028,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  unreadDot: {
    width: SW * 0.02,
    height: SW * 0.02,
    borderRadius: SW * 0.01,
    backgroundColor: '#A855F7',
    marginLeft: SW * 0.02,
  },
});
