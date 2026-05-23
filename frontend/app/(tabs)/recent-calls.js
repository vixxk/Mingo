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
import { ms, s, vs, wp, hp, SCREEN_WIDTH } from '../../utils/responsive';
import { callAPI, userAPI, walletAPI, listenersAPI } from '../../utils/api';
import FavouriteListenerPopup from '../../components/shared/FavouriteListenerPopup';
import NotificationsPopup from '../../components/shared/NotificationsPopup';
import StatusPopup from '../../components/shared/StatusPopup';
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

const formatCallTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const timeStr = date.toLocaleTimeString('en-US', timeOptions).toLowerCase();

  if (targetDate.getTime() === today.getTime()) {
    return `${timeStr} Today`;
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `${timeStr} Yesterday`;
  } else {
    const dateOptions = { day: 'numeric', month: 'short' };
    const dateStrFormatted = date.toLocaleDateString('en-US', dateOptions);
    return `${timeStr} ${dateStrFormatted}`;
  }
};

const CallItem = ({ item, onShowOfflinePopup }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const [calling, setCalling] = useState(false);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, friction: 8, tension: 100, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  };

  const handleCall = async (type) => {
    if (calling) return;
    setCalling(true);
    try {
      const targetId = item.listenerId || item.id;
      if (targetId) {
        const profileRes = await listenersAPI.getPublicProfile(targetId);
        if (profileRes?.data && !profileRes.data.isOnline) {
          onShowOfflinePopup(item.name);
          setCalling(false);
          return;
        }
      }
    } catch (e) {
      console.log('Error checking listener online status:', e);
    }
    setCalling(false);

    router.push({
      pathname: '/(call)/connecting',
      params: {
        name: item.name,
        callType: type,
        callId: `call_${Date.now()}`,
        roomId: `room_${Date.now()}`,
        listenerId: item.listenerId || item.id, // item.id is fallback for favourites
        avatarIndex: item.avatarIndex || '0',
        gender: item.gender || 'Female'
      }
    });
  };

  const handleAudioCall = () => handleCall('audio');
  const handleVideoCall = () => handleCall('video');

  const handleProfilePress = () => {
    if (calling) return;
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
        disabled={calling}
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
            {item.diamonds !== undefined ? (
              <>
                {/* Row 1: callTime */}
                <View style={styles.cardDetailRow}>
                  <Text style={styles.callTimeText}>{item.callTime}</Text>
                </View>

                {/* Row 2: Duration & Diamond Cost */}
                <View style={[styles.cardDetailRow, { marginTop: vs(3) }]}>
                  <Text style={styles.callDurationText}>{item.duration}</Text>
                  <View style={styles.bulletDot} />
                  <View style={styles.miniCostBadge}>
                    <Text style={styles.miniCostText}>{item.diamonds}</Text>
                    <Text style={{ fontSize: 10 }}>💎</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.callDuration}>{item.duration}</Text>
            )}
          </View>
          {item.diamonds !== undefined ? (
            <View style={styles.callTypeRightContainer}>
              <Ionicons 
                name={item.callType === 'video' ? "videocam" : "call"} 
                size={22} 
                color={item.callType === 'video' ? "#60A5FA" : "#4ADE80"} 
              />
            </View>
          ) : (
            <Ionicons name="heart" size={24} color="#EF4444" style={styles.favHeartIcon} />
          )}
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

const SkeletonItem = ({ opacity }) => (
  <View style={styles.skeletonItem}>
    <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
    <View style={styles.skeletonDetails}>
      <Animated.View style={[styles.skeletonName, { opacity }]} />
      <Animated.View style={[styles.skeletonDuration, { opacity }]} />
    </View>
    <View style={styles.skeletonActions}>
      <Animated.View style={[styles.skeletonActionBtn, { opacity }]} />
      <Animated.View style={[styles.skeletonActionBtn, { opacity }]} />
    </View>
  </View>
);

export default function RecentCallsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('recent'); 
  const [showFavPopup, setShowFavPopup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [statusPopupVisible, setStatusPopupVisible] = useState(false);
  const [statusPopupTitle, setStatusPopupTitle] = useState('');
  const [statusPopupMessage, setStatusPopupMessage] = useState('');
  const [statusPopupType, setStatusPopupType] = useState('info');

  
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(15)).current;
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const [recentCalls, setRecentCalls] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const loadData = async (showLoadingState = false) => {
    if (showLoadingState) setIsLoading(true);
    try {
      const [callsRes, favsRes, balRes] = await Promise.all([
        callAPI.getHistory(20, 0),
        userAPI.getFavourites(),
        walletAPI.getBalance()
      ]);

      const GRADIENTS = [
        ['#5C21B6', '#121212'],
        ['#451A03', '#121212'],
        ['#0F766E', '#121212'],
        ['#15803D', '#121212'],
      ];

      if (callsRes?.data) {
        setRecentCalls(callsRes.data.map((call, index) => {
          const coins = call.coinsDeducted || 0;
          const diamonds = Math.floor(coins / 10);
          return {
            id: call._id,
            listenerId: call.listenerId?._id || call.listenerId,
            name: call.listenerId?.name || 'Unknown',
            gender: call.listenerId?.gender,
            avatarIndex: call.listenerId?.avatarIndex,
            duration: `${call.duration || 0} mins`,
            callType: call.callType || 'audio',
            callTime: formatCallTime(call.startTime || call.createdAt),
            diamonds: diamonds,
            gradientColors: GRADIENTS[index % GRADIENTS.length],
          };
        }));
      }

      if (favsRes?.data) {
        setFavourites(favsRes.data.map((fav, index) => ({
          id: fav._id,
          name: fav.name,
          gender: fav.gender,
          avatarIndex: fav.avatarIndex,
          duration: 'Favourite Listener',
          gradientColors: GRADIENTS[index % GRADIENTS.length],
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
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
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
      {isLoading ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3, 4, 5].map((item) => (
            <SkeletonItem key={item} opacity={shimmerAnim} />
          ))}
        </ScrollView>
      ) : data.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {data.map((item) => (
            <CallItem 
              key={item.id} 
              item={item} 
              onShowOfflinePopup={(name) => {
                setStatusPopupTitle('Unavailable Right Now');
                setStatusPopupMessage(`${name} is currently offline. We will let you know when they are back!`);
                setStatusPopupType('info');
                setStatusPopupVisible(true);
              }}
            />
          ))}
        </ScrollView>
      )}
      </Animated.View>

      {}
      <FavouriteListenerPopup visible={showFavPopup} onGotIt={handleFavGotIt} />
      <NotificationsPopup visible={showNotifications} onClose={() => setShowNotifications(false)} />
      <StatusPopup
        visible={statusPopupVisible}
        type={statusPopupType}
        title={statusPopupTitle}
        message={statusPopupMessage}
        onClose={() => setStatusPopupVisible(false)}
      />
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
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  callTimeText: {
    fontSize: ms(11, 0.3),
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
  },
  callDurationText: {
    fontSize: ms(11, 0.3),
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter_400Regular',
  },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  miniCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: s(6),
    paddingVertical: vs(1.5),
    borderRadius: s(6),
    gap: s(2),
  },
  miniCostText: {
    color: '#fff',
    fontSize: ms(10, 0.3),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  favHeartIcon: {
    marginRight: s(4),
  },
  callTypeRightContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(8),
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

  
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: vs(12),
    borderRadius: 16,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  skeletonAvatar: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: '#1F1F1F',
  },
  skeletonDetails: {
    flex: 1,
    marginLeft: s(12),
    gap: 6,
  },
  skeletonName: {
    width: '50%',
    height: vs(16),
    borderRadius: 4,
    backgroundColor: '#1F1F1F',
  },
  skeletonDuration: {
    width: '30%',
    height: vs(12),
    borderRadius: 4,
    backgroundColor: '#1F1F1F',
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: s(10),
  },
  skeletonActionBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: '#1F1F1F',
  },
});
