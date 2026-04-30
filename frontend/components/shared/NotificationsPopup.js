import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Welcome to Mingo! 🎉',
    message: 'Complete your profile to get more visibility and start connecting with listeners.',
    time: '2 hours ago',
    type: 'system',
    read: false,
  },
  {
    id: '2',
    title: 'Issue Resolved',
    message: 'The issue you reported has been resolved by our support team. Let us know if you need anything else.',
    time: '1 day ago',
    type: 'support',
    read: true,
  },
  {
    id: '3',
    title: 'Flash Sale! 🪙',
    message: 'Get Flat 80% Off on your next coin recharge. Limited time offer!',
    time: '2 days ago',
    type: 'offer',
    read: true,
  },
];

const getNotificationIcon = (type) => {
  switch (type) {
    case 'system':
      return { name: 'planet', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
    case 'support':
      return { name: 'headset', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' };
    case 'offer':
      return { name: 'gift', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    default:
      return { name: 'notifications', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' };
  }
};

export default function NotificationsPopup({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SH, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

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
          {}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="notifications" size={SW * 0.06} color="#A855F7" />
              <Text style={styles.title}>Notifications</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
              <Ionicons name="close" size={SW * 0.06} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {}
          <ScrollView 
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {MOCK_NOTIFICATIONS.map((notif) => {
              const iconStyle = getNotificationIcon(notif.type);
              return (
                <View 
                  key={notif.id} 
                  style={[
                    styles.notificationItem, 
                    !notif.read && styles.unreadItem
                  ]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: iconStyle.bg }]}>
                    <Ionicons name={iconStyle.name} size={SW * 0.055} color={iconStyle.color} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <Text style={styles.notifTime}>{notif.time}</Text>
                  </View>
                  {!notif.read && <View style={styles.unreadDot} />}
                </View>
              );
            })}
          </ScrollView>
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
  scrollArea: {
    maxHeight: SH * 0.65,
  },
  scrollContent: {
    paddingHorizontal: SW * 0.05,
    paddingTop: SH * 0.02,
    paddingBottom: SH * 0.04,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: SW * 0.04,
    backgroundColor: '#111',
    borderRadius: SW * 0.04,
    marginBottom: SH * 0.015,
    borderWidth: 1,
    borderColor: '#222',
  },
  unreadItem: {
    backgroundColor: '#1A1A1A',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  iconContainer: {
    width: SW * 0.12,
    height: SW * 0.12,
    borderRadius: SW * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SW * 0.03,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: SW * 0.04,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: SH * 0.005,
  },
  notifMessage: {
    fontSize: SW * 0.032,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: SW * 0.045,
    marginBottom: SH * 0.01,
  },
  notifTime: {
    fontSize: SW * 0.028,
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
  unreadDot: {
    width: SW * 0.025,
    height: SW * 0.025,
    borderRadius: SW * 0.0125,
    backgroundColor: '#A855F7',
    position: 'absolute',
    top: SW * 0.04,
    right: SW * 0.04,
  },
});
