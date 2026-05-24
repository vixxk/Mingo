import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, wp, hp, SCREEN_WIDTH } from '../../utils/responsive';
import { callAPI, walletAPI } from '../../utils/api';

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

const formatCallTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dateOptions = { day: '2-digit', month: 'short' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  return `${d.toLocaleDateString('en-US', dateOptions)}, ${d.toLocaleTimeString('en-US', timeOptions)}`;
};

const CallItem = ({ item }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, friction: 8, tension: 100, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' };
      case 'missed':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
      case 'cancelled':
        return { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF' };
      default:
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
    }
  };

  const statusStyle = getStatusStyle(item.status);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LinearGradient 
        colors={item.gradientColors || ['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.callItem}
      >
        <View style={styles.callMainRow}>
          <Image source={getAvatarImage(item.gender, item.avatarIndex)} style={styles.callAvatar} />
          <View style={styles.callInfo}>
            <View style={styles.nameTimeRow}>
              <Text style={styles.callName} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.callTimeText, { color: 'rgba(255,255,255,0.8)' }]}>{formatCallTime(item.time)}</Text>
            </View>
            <View style={styles.typeDurationRow}>
              <Ionicons 
                name={item.type === 'video' ? 'videocam' : item.type === 'chat' ? 'chatbubble' : 'call'} 
                size={s(12)} 
                color="rgba(255,255,255,0.8)" 
                style={{ marginRight: wp(1) }} 
              />
              <Text style={[styles.callDuration, { color: 'rgba(255,255,255,0.8)' }]}>{item.duration} • {item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)) : ''}</Text>
            </View>
          </View>
        </View>

        {/* Extra Session Information Section */}
        <View style={[styles.sessionMetaSection, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
          <View style={styles.metaRow}>
            {/* Earnings Badge */}
            <View style={[styles.metaBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.metaBadgeText, { color: '#fff' }]}>+ ₹{(item.earnings || 0).toFixed(2)}</Text>
            </View>

            {/* Status Badge */}
            <View style={[styles.metaBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.metaBadgeText, { color: '#fff' }]}>
                {(item.status || 'active').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Rating and Feedback */}
          {item.rating && (
            <View style={styles.ratingSection}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={s(12)} color="#FBBF24" style={{ marginRight: wp(1) }} />
                <Text style={[styles.ratingText, { color: '#fff' }]}>{item.rating}.0 / 5.0</Text>
              </View>
              {item.feedback && (
                <Text style={[styles.feedbackText, { color: 'rgba(255,255,255,0.9)' }]}>
                  "{item.feedback}"
                </Text>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const EmptyState = () => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: '#1F2937' }]}>
          <Ionicons name="call-outline" size={s(40)} color="#9CA3AF" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No Recent Calls!</Text>
      <Text style={styles.emptySubtitle}>
        When you receive calls from users,{'\n'}they will appear here for quick access.
      </Text>
    </View>
  );
};

export default function RecentCallsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [recentCalls, setRecentCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [earnings, setEarnings] = useState(0);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Pulse shimmer animation loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const loadData = async (showLoadingState = false) => {
    if (showLoadingState) setIsLoading(true);
    try {
      const res = await callAPI.getHistory(20, 0);

      const GRADIENTS = [
        ['#5C21B6', '#121212'],
        ['#451A03', '#121212'],
        ['#0F766E', '#121212'],
        ['#15803D', '#121212'],
      ];

      if (res?.data) {
        const filtered = res.data.filter(call => (call.callType || call.type) !== 'chat');
        setRecentCalls(filtered.map((call, index) => ({
          id: call._id,
          userId: call.userId?._id || call.userId,
          name: call.userId?.name || 'Unknown User',
          gender: call.userId?.gender || 'Female',
          avatarIndex: call.userId?.avatarIndex || '0',
          duration: `${call.duration || 0} mins`,
          type: call.callType || 'audio',
          time: call.createdAt,
          earnings: call.listenerEarnings || 0,
          coinsDeducted: call.coinsDeducted || 0,
          rating: call.rating,
          feedback: call.feedback,
          status: call.status,
          gradientColors: GRADIENTS[index % GRADIENTS.length],
        })));
      }
      
      const balRes = await walletAPI.getBalance();
      if (balRes?.data) setEarnings(balRes.data.coins || 0);

    } catch (e) {
      console.error('Failed to load recent calls:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    await loadData(true);
  };

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [])
  );

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderSkeletonItem = () => (
    <View style={styles.skeletonItem}>
      <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerAnim }]} />
      <View style={styles.skeletonDetails}>
        <Animated.View style={[styles.skeletonName, { opacity: shimmerAnim }]} />
        <Animated.View style={[styles.skeletonDuration, { opacity: shimmerAnim }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={styles.headerTitle}>Recent Calls</Text>
        <TouchableOpacity 
          onPress={handleRefresh}
          activeOpacity={0.7}
          style={styles.refreshBtn}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="refresh" size={22} color="#9CA3AF" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{ flex: 1, opacity: contentAnim }}>
        {isLoading ? (
          <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={item => item.toString()}
            renderItem={renderSkeletonItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : recentCalls.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={recentCalls}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <CallItem item={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  refreshBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    gap: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  coinEmoji: {
    fontSize: wp(3.5),
  },
  earningsText: {
    fontSize: wp(3.5),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
    gap: hp(1.5),
  },
  callItem: {
    flexDirection: 'column',
    padding: wp(3.5),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  callMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    borderWidth: 2,
    borderColor: '#333',
  },
  callInfo: {
    flex: 1,
    marginLeft: wp(3.5),
  },
  nameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  callTimeText: {
    fontSize: wp(3.0),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  typeDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  callName: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  callDuration: {
    fontSize: wp(3.2),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  sessionMetaSection: {
    marginTop: hp(1.2),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    gap: hp(1.2),
  },
  metaRow: {
    flexDirection: 'row',
    gap: wp(2),
    flexWrap: 'wrap',
  },
  metaBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBadgeText: {
    fontSize: wp(2.8),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  ratingSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: wp(2.5),
    borderRadius: 8,
    gap: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: wp(3.2),
    color: '#FBBF24',
    fontFamily: 'Inter_700Bold',
  },
  feedbackText: {
    fontSize: wp(3.2),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginTop: 2,
  },
  callActions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  callActionBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  emptyIconContainer: {
    marginBottom: hp(3),
  },
  emptyIconCircle: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: wp(6),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: wp(3.8),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: wp(5.5),
  },

  // Skeleton Styles
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: wp(3.5),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  skeletonAvatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: '#1F1F1F',
  },
  skeletonDetails: {
    flex: 1,
    marginLeft: wp(3.5),
    gap: 6,
  },
  skeletonName: {
    width: '50%',
    height: hp(1.8),
    borderRadius: 4,
    backgroundColor: '#1F1F1F',
  },
  skeletonDuration: {
    width: '30%',
    height: hp(1.4),
    borderRadius: 4,
    backgroundColor: '#1F1F1F',
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  skeletonActionBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: '#1F1F1F',
  },
});
