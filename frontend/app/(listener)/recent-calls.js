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

const CallItem = ({ item }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, friction: 8, tension: 100, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  };

  const handleAudioCall = () => {
    router.push({
      pathname: '/(call)/connecting',
      params: {
        name: item.name,
        callType: 'audio',
        callId: `call_${Date.now()}`,
        roomId: `room_${Date.now()}`,
        userId: item.userId,
        avatarIndex: item.avatarIndex || '0',
        gender: item.gender || 'Female'
      }
    });
  };

  const handleVideoCall = () => {
    router.push({
      pathname: '/(call)/connecting',
      params: {
        name: item.name,
        callType: 'video',
        callId: `call_${Date.now()}`,
        roomId: `room_${Date.now()}`,
        userId: item.userId,
        avatarIndex: item.avatarIndex || '0',
        gender: item.gender || 'Female'
      }
    });
  };

  const handleChat = () => {
    router.push({
      pathname: '/(chat)/chat',
      params: {
        name: item.name,
        id: item.userId,
        avatarIndex: item.avatarIndex || '0',
        gender: item.gender || 'Female'
      }
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.callItem}
      >
        <Image source={getAvatarImage(item.gender, item.avatarIndex)} style={styles.callAvatar} />
        <View style={styles.callInfo}>
          <Text style={styles.callName}>{item.name}</Text>
          <Text style={styles.callDuration}>{item.duration} • {item.type}</Text>
        </View>
        <View style={styles.callActions}>
          <TouchableOpacity style={styles.callActionBtn} activeOpacity={0.7} onPress={handleAudioCall}>
            <Ionicons name="call" size={18} color="#22C55E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callActionBtn} activeOpacity={0.7} onPress={handleVideoCall}>
            <Ionicons name="videocam" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callActionBtn} activeOpacity={0.7} onPress={handleChat}>
            <Ionicons name="chatbubble" size={18} color="#EC4899" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          setIsLoading(true);
          const res = await callAPI.getHistory(20, 0);
          if (res?.data) {
            setRecentCalls(res.data.map(call => ({
              id: call._id,
              userId: call.userId?._id || call.userId,
              name: call.userId?.name || 'Unknown User',
              gender: call.userId?.gender || 'Female',
              avatarIndex: call.userId?.avatarIndex || '0',
              duration: `${call.duration || 0} mins`,
              type: call.type || 'audio',
              time: call.createdAt
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
      loadData();
    }, [])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={styles.headerTitle}>Recent Calls</Text>
        <View style={styles.earningsBadge}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.earningsText}>₹{earnings}</Text>
        </View>
      </Animated.View>

      <Animated.View style={{ flex: 1, opacity: contentAnim }}>
        {recentCalls.length === 0 ? (
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
    paddingVertical: hp(2),
  },
  headerTitle: {
    fontSize: wp(7),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: wp(3.5),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
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
});
