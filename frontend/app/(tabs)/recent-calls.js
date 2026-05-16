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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';
import { callAPI, userAPI, walletAPI } from '../../utils/api';
import FavouriteListenerPopup from '../../components/shared/FavouriteListenerPopup';
import NotificationsPopup from '../../components/shared/NotificationsPopup';
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
        listenerId: item.listenerId || item.id, // item.id is fallback for favourites
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
        listenerId: item.listenerId || item.id, // item.id is fallback for favourites
        avatarIndex: item.avatarIndex || '0',
        gender: item.gender || 'Female'
      }
    });
  };

  const handleProfilePress = () => {
    const targetId = item.listenerId || item.id;
    if (targetId) {
      router.push(`/listener-profile/${targetId}`);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleProfilePress}
      >
        <LinearGradient
          colors={item.gradientColors || ['#4B5563', '#6B7280']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.callItem}
        >
          <Image source={item.image || getAvatarImage(item.gender, item.avatarIndex)} style={styles.callAvatar} />
          <View style={styles.callInfo}>
            <Text style={styles.callName}>{item.name}</Text>
            <Text style={styles.callDuration}>{item.duration}</Text>
          </View>
          <View style={styles.callActions}>
            <TouchableOpacity style={styles.callActionBtn} activeOpacity={0.7} onPress={handleAudioCall}>
              <Ionicons name="call" size={18} color="#22C55E" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callActionBtn} activeOpacity={0.7} onPress={handleVideoCall}>
              <Ionicons name="videocam" size={18} color="#22C55E" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const EmptyState = ({ tab }) => {
  const router = useRouter();
  return (
    <View style={styles.emptyContainer}>
      {tab === 'favourite' ? (
        <>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['#7F1D1D', '#991B1B']}
              style={styles.emptyIconCircle}
            >
              <Ionicons name="heart" size={s(40)} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Favourites!</Text>
          <Text style={styles.emptySubtitle}>
            Mark listeners as favourites to quickly{'\n'}find them here later.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreBtnText}>Explore Listeners</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.emptyIconContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#1F2937' }]}>
              <Ionicons name="call-outline" size={s(40)} color="#9CA3AF" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No Past Sessions!</Text>
          <Text style={styles.emptySubtitle}>
            Start call now and a good{'\n'}conversation with strangers.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreBtnText}>Find Listeners</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default function RecentCallsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('recent'); 
  const [showFavPopup, setShowFavPopup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(15)).current;

  const [recentCalls, setRecentCalls] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          setIsLoading(true);
          const [callsRes, favsRes, balRes] = await Promise.all([
            callAPI.getHistory(20, 0),
            userAPI.getFavourites(),
            walletAPI.getBalance()
          ]);

          if (callsRes?.data) {
            setRecentCalls(callsRes.data.map(call => ({
              id: call._id,
              listenerId: call.listenerId?._id || call.listenerId,
              name: call.listenerId?.name || 'Unknown',
              gender: call.listenerId?.gender,
              avatarIndex: call.listenerId?.avatarIndex,
              duration: `${call.duration || 0} mins call`,
            })));
          }

          if (favsRes?.data) {
            setFavourites(favsRes.data.map(fav => ({
              id: fav._id,
              name: fav.name,
              gender: fav.gender,
              avatarIndex: fav.avatarIndex,
              duration: 'Favourite Listener',
            })));
          }

          if (balRes?.data) {
            setCoinBalance(balRes.data.coins || 0);
          }
        } catch (e) {
          console.error('Failed to load recent calls:', e);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }, [])
  );

  const handleTabSwitch = async (tab) => {
    setActiveTab(tab);
    if (tab === 'favourite') {
      try {
        const seen = await AsyncStorage.getItem('hasSeenFavouritePopup');
        if (!seen) {
          setTimeout(() => setShowFavPopup(true), 300);
        }
      } catch (e) {}
    }
  };

  const handleFavGotIt = async () => {
    setShowFavPopup(false);
    await AsyncStorage.setItem('hasSeenFavouritePopup', 'true');
  };

  const data = activeTab === 'recent' ? recentCalls : favourites;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => router.push('/profile')}
          >
            <Image
              source={require('../../images/user_avatar.png')}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.coinBadge}
            activeOpacity={0.7}
            onPress={() => router.push('/balance')}
          >
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinCount}>{coinBalance}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.notificationBtn} 
          activeOpacity={0.7}
          onPress={() => setShowNotifications(true)}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {}
      <Animated.View style={[styles.tabSwitcher, { opacity: headerAnim }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.tabActive]}
          onPress={() => handleTabSwitch('recent')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>
            Recent
          </Text>
          <Ionicons
            name="call"
            size={16}
            color={activeTab === 'recent' ? '#fff' : '#6B7280'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favourite' && styles.tabActive]}
          onPress={() => handleTabSwitch('favourite')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'favourite' && styles.tabTextActive]}>
            Favourite
          </Text>
          <Ionicons
            name="heart-outline"
            size={16}
            color={activeTab === 'favourite' ? '#fff' : '#6B7280'}
          />
        </TouchableOpacity>
      </Animated.View>

      {}
      <Animated.View style={{ flex: 1, opacity: contentAnim, transform: [{ translateY: contentSlide }] }}>
      {data.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {data.map((item) => (
            <CallItem key={item.id} item={item} />
          ))}
        </ScrollView>
      )}
      </Animated.View>

      {}
      <FavouriteListenerPopup visible={showFavPopup} onGotIt={handleFavGotIt} />
      <NotificationsPopup visible={showNotifications} onClose={() => setShowNotifications(false)} />
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
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  avatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    borderWidth: 2,
    borderColor: '#333',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    gap: 4,
  },
  coinEmoji: {
    fontSize: ms(14, 0.3),
  },
  coinCount: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  notificationBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
  },

  
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: s(16),
    marginTop: vs(8),
    marginBottom: vs(12),
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(12),
    gap: 6,
    borderRadius: 28,
  },
  tabActive: {
    backgroundColor: '#1F2937',
  },
  tabText: {
    fontSize: ms(14, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
  tabTextActive: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },

  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: vs(4),
    paddingBottom: vs(40),
    gap: vs(10),
  },

  
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: vs(12),
    borderRadius: 16,
  },
  callAvatar: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callInfo: {
    flex: 1,
    marginLeft: s(12),
  },
  callName: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  callDuration: {
    fontSize: ms(12, 0.3),
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  callActions: {
    flexDirection: 'row',
    gap: s(10),
  },
  callActionBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(40),
  },
  emptyTitle: {
    fontSize: ms(24, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(12),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(20),
  },
  emptyIconContainer: {
    marginBottom: vs(24),
  },
  emptyIconCircle: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  exploreBtn: {
    marginTop: vs(24),
    backgroundColor: '#1F2937',
    paddingHorizontal: s(32),
    paddingVertical: vs(12),
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#374151',
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
});
