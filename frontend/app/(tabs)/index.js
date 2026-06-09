import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  BackHandler,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, wp, hp, SCREEN_WIDTH } from '../../utils/responsive';
import { walletAPI, listenersAPI, authAPI, callAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import WelcomePopup from '../../components/shared/WelcomePopup';
import CoinsOfferPopup from '../../components/shared/CoinsOfferPopup';
import InsufficientBalancePopup from '../../components/shared/InsufficientBalancePopup';
import NotificationsPopup from '../../components/shared/NotificationsPopup';
import { useStatusSSE } from '../../utils/useStatusSSE';
import HomeSkeleton from '../../components/HomeSkeleton';



const CARD_WIDTH = wp(85);
const CARD_GAP = wp(4);


const LiveBadge = () => (
  <View style={styles.liveBadge}>
    <View style={styles.liveDot} />
    <Text style={styles.liveText}>Live</Text>
  </View>
);

const BusyBadge = () => (
  <View style={[styles.liveBadge, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}>
    <View style={[styles.liveDot, { backgroundColor: '#fff' }]} />
    <Text style={styles.liveText}>Busy</Text>
  </View>
);


const VerifiedBadge = () => (
  <View style={styles.verifiedBadge}>
    <View style={styles.verifiedBadgeBg} />
    <MaterialIcons name="verified" size={ms(16, 0.3)} color="#38BDF8" />
  </View>
);


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

const BestChoiceCard = ({ item, onCallPress, onProfilePress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onProfilePress}
      style={styles.bestChoiceCardOuter}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={item.gradientColors || ['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bestChoiceGradientBorder}
        >
          <View style={styles.bestChoiceCardInner}>
            <Image
              source={item.image || getAvatarImage(item.gender, item.avatarIndex)}
              style={styles.bestChoiceImage}
              resizeMode="cover"
            />
            {}
            <View style={styles.bestChoiceLiveBadgeWrapper}>
              {item.isBusy ? <BusyBadge /> : item.isLive ? <LiveBadge /> : null}
            </View>
            {}
            <View style={styles.bestChoiceActionStack}>
              {item.audioEnabled && (
                <TouchableOpacity 
                  style={[styles.bestChoiceActionBtn, item.isBusy && { opacity: 0.5 }]} 
                  activeOpacity={0.7} 
                  onPress={onProfilePress}
                >
                  <Ionicons name="call-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              {item.videoEnabled && (
                <TouchableOpacity 
                  style={[styles.bestChoiceActionBtn, item.isBusy && { opacity: 0.5 }]} 
                  activeOpacity={0.7} 
                  onPress={onProfilePress}
                >
                  <Ionicons name="videocam-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              {item.chatEnabled && (
                <TouchableOpacity 
                  style={[styles.bestChoiceActionBtn, item.isBusy && { opacity: 0.5 }]} 
                  activeOpacity={0.7}
                  onPress={onProfilePress}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            {}
            <View style={styles.bestChoiceNameRow}>
              <Text style={styles.bestChoiceName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isVerified && <VerifiedBadge />}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};


const PeopleCard = ({ item, onCallPress, onChatPress, onProfilePress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onProfilePress}
      style={styles.peopleCardWrapper}
    >
      <Animated.View style={[styles.peopleCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.peopleImageContainer}>
          <Image
            source={item.image || getAvatarImage(item.gender, item.avatarIndex)}
            style={styles.peopleImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.8)']}
            style={styles.peopleNameGradient}
          />
          <View style={styles.peopleLiveBadgeWrapper}>
            {item.isBusy ? <BusyBadge /> : item.isLive ? <LiveBadge /> : null}
          </View>
          <View style={styles.peopleNameRow}>
            <Text style={styles.peopleName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isVerified && <VerifiedBadge />}
          </View>
        </View>
        <View style={styles.peopleActions}>
          {item.audioEnabled && (
            <TouchableOpacity 
              style={[styles.peopleActionBtn, item.isBusy && { opacity: 0.5 }]} 
              activeOpacity={0.7} 
              onPress={() => onCallPress('audio')}
              disabled={item.isBusy}
            >
              <Ionicons name="call-outline" size={18} color="#22C55E" />
            </TouchableOpacity>
          )}
          {item.chatEnabled && (
            <TouchableOpacity 
              style={[styles.peopleActionBtn, item.isBusy && { opacity: 0.5 }]} 
              activeOpacity={0.7}
              onPress={onChatPress}
              disabled={item.isBusy}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {item.videoEnabled && (
            <TouchableOpacity 
              style={[styles.peopleActionBtn, item.isBusy && { opacity: 0.5 }]} 
              activeOpacity={0.7} 
              onPress={() => onCallPress('video')}
              disabled={item.isBusy}
            >
              <Ionicons name="videocam-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    const parentNav = navigation.getParent() || navigation;
    parentNav.setOptions({
      gestureEnabled: false,
    });

    const backAction = () => {
      const state = parentNav.getState();
      const routes = state?.routes || [];
      if (routes.length >= 2) {
        const prevRoute = routes[routes.length - 2];
        const prevName = prevRoute?.name?.toLowerCase() || '';
        if (
          prevName.includes('auth') ||
          prevName.includes('login') ||
          prevName.includes('signup') ||
          prevName.includes('welcome') ||
          prevName === 'index'
        ) {
          return true;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    const unsubscribe = parentNav.addListener('beforeRemove', (e) => {
      const actionType = e.data.action.type;
      if (actionType === 'GO_BACK' || actionType === 'POP') {
        const state = parentNav.getState();
        const routes = state?.routes || [];
        if (routes.length >= 2) {
          const prevRoute = routes[routes.length - 2];
          const prevName = prevRoute?.name?.toLowerCase() || '';
          if (
            prevName.includes('auth') ||
            prevName.includes('login') ||
            prevName.includes('signup') ||
            prevName.includes('welcome') ||
            prevName === 'index'
          ) {
            e.preventDefault();
          }
        }
      }
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation]);

  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [userAvatar, setUserAvatar] = useState(require('../../images/user_avatar.png'));
  const [coinBalance, setCoinBalance] = useState(0);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [discountTimeLeft, setDiscountTimeLeft] = useState(0);
  const [isFirstPurchaseEligible, setIsFirstPurchaseEligible] = useState(false);
  const [topOffer, setTopOffer] = useState(null);
  const [bestChoiceData, setBestChoiceData] = useState([]);
  const [peopleData, setPeopleData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showWelcome, setShowWelcome] = useState(false);
  const [showCoinsOffer, setShowCoinsOffer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [signupTimestamp, setSignupTimestamp] = useState(Date.now());

  const loadRealData = useCallback(async () => {
    try {
      let gender = await AsyncStorage.getItem('userGender');
      let avatarIndex = await AsyncStorage.getItem('userAvatarIndex');
      
      if (!gender || avatarIndex === null || avatarIndex === undefined) {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          gender = gender || user.gender || 'Female';
          avatarIndex = avatarIndex !== null && avatarIndex !== undefined ? avatarIndex : (user.avatarIndex !== undefined ? user.avatarIndex.toString() : '0');
          
          await AsyncStorage.setItem('userGender', gender);
          await AsyncStorage.setItem('userAvatarIndex', avatarIndex);
        }
      }

      if (gender && avatarIndex !== null && avatarIndex !== undefined) {
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
        const avatars = gender === 'Male' ? maleAvatars : femaleAvatars;
        setUserAvatar(avatars[parseInt(avatarIndex, 10)] || avatars[0]);
      }
    } catch (e) {
      console.error('Error loading avatar:', e);
    }

    try {
      const balRes = await walletAPI.getBalance();
      if (balRes?.data) {
        setCoinBalance(balRes.data.coins || 0);
        setDiamondBalance(balRes.data.diamonds || Math.floor((balRes.data.coins || 0) / 10));
        setIsFirstPurchaseEligible(!!balRes.data.isFirstPurchaseEligible);
        if (balRes.data.isFirstPurchaseEligible && balRes.data.signupTimestamp) {
          const actualSignupTime = new Date(balRes.data.signupTimestamp).getTime();
          const expiry = actualSignupTime + 6 * 3600 * 1000;
          setDiscountTimeLeft(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
          setSignupTimestamp(actualSignupTime);

          const pkgRes = await walletAPI.getPackages();
          if (pkgRes?.data?.packages) {
            const bestPkg = pkgRes.data.packages[0]; 
            if (bestPkg) {
              setTopOffer({
                title: `${bestPkg.discount}% Off`,
                coins: bestPkg.coins,
                originalPrice: bestPkg.originalPrice,
                newPrice: bestPkg.price,
              });
            }
          }
        }
      }
    } catch (e) {
      console.log('Wallet fetch fallback:', e.message);
    }

    try {
      const listenersRes = await listenersAPI.getRecommended(20);
      if (listenersRes?.data) {
        const mappedListeners = listenersRes.data.map(l => ({
          id: l.id,
          name: l.name,
          isLive: l.isOnline,
          isBusy: l.isBusy,
          isVerified: l.isVerified,
          bestChoice: l.bestChoice,
          audioEnabled: l.audioEnabled !== false, // default true
          videoEnabled: l.videoEnabled === true,  // default false
          chatEnabled: l.chatEnabled !== false,   // default true
          gradientColors: l.gradientColors || ['#3B82F6', '#8B5CF6'],
          gender: l.gender,
          avatarIndex: l.avatarIndex || 0,
        }));

        const bestChoice = mappedListeners.filter(l => l.bestChoice);
        const people = mappedListeners;

        setBestChoiceData(bestChoice);
        setPeopleData(people);
      } else {
        setBestChoiceData([]);
        setPeopleData([]);
      }
    } catch (e) {
      console.log('Listeners fetch fallback:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleStatusChanged = (data) => {
      console.log('[Home] Listener status changed:', data);
      const { userId, isOnline, isBusy } = data;
      
      const updateStatus = (list) => 
        list.map(item => {
          if (item.id === userId) {
            return {
              ...item,
              isLive: isOnline,
              isBusy: isBusy
            };
          }
          return item;
        });

      setBestChoiceData(prev => updateStatus(prev));
      setPeopleData(prev => updateStatus(prev));
    };

    socketService.on('listener_status_changed', handleStatusChanged);
    return () => {
      socketService.off('listener_status_changed', handleStatusChanged);
    };
  }, []);

  useStatusSSE(
    useCallback((data) => {
      console.log('[Home] SSE Listener status changed:', data);
      const { userId, isOnline, isBusy } = data;
      const updateStatus = (list) => 
        list.map(item => {
          if (item.id === userId) {
            return {
              ...item,
              isLive: isOnline,
              isBusy: isBusy
            };
          }
          return item;
        });

      setBestChoiceData(prev => updateStatus(prev));
      setPeopleData(prev => updateStatus(prev));
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      loadRealData();
    }, [loadRealData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRealData();
    setRefreshing(false);
  }, [loadRealData]);

  useEffect(() => {
    if (discountTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setDiscountTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [discountTimeLeft > 0]);

  
  
  
  useEffect(() => {
    const checkFirstSignup = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcomePopup');
        if (!hasSeenWelcome) {
          setShowWelcome(true);
        } else {
          const hasSeenCoins = await AsyncStorage.getItem('hasSeenCoinsPopup');
          if (!hasSeenCoins && isFirstPurchaseEligible) {
            setShowCoinsOffer(true);
          }
        }
      } catch (e) {
        console.log(e);
      }
    };
    
    if (isFirstPurchaseEligible !== null) {
      checkFirstSignup();
    }
  }, [isFirstPurchaseEligible]);

  
  useEffect(() => {
    const handleAppOpenCount = async () => {
      try {
        const countStr = await AsyncStorage.getItem('appOpenCount');
        let count = countStr ? parseInt(countStr, 10) : 0;
        count += 1;
        await AsyncStorage.setItem('appOpenCount', count.toString());
      } catch (e) {}
    };
    handleAppOpenCount();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Home] App came to foreground, refreshing data...');
        loadRealData();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [loadRealData]);

  const handleWelcomeAgree = async () => {
    setShowWelcome(false);
    await AsyncStorage.setItem('hasSeenWelcomePopup', 'true');
    
    setTimeout(() => setShowCoinsOffer(true), 400);
  };

  const handleCoinsClose = async () => {
    setShowCoinsOffer(false);
    await AsyncStorage.setItem('hasSeenCoinsPopup', 'true');
  };

  const handleAddCoins = async () => {
    setShowCoinsOffer(false);
    await AsyncStorage.setItem('hasSeenCoinsPopup', 'true');
    router.push('/balance');
  };

  
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const handleCallPress = (listener, callType = 'audio') => {
    // Minimum: audio=10 coins/min, video=40 coins/min
    const minCoins = callType === 'video' ? 40 : 10;
    
    if (coinBalance < minCoins) {
      setShowInsufficientBalance(true);
      return;
    }

    if (listener) {
      // Direct call
      router.push({
        pathname: '/(call)/connecting',
        params: {
          name: listener.name,
          callType,
          callId: `call_${Date.now()}`,
          roomId: `room_${Date.now()}`,
          listenerId: listener.id,
          avatarIndex: listener.avatarIndex,
          gender: listener.gender
        }
      });
    } else {
      // Random call
      router.push({
        pathname: '/(call)/connecting',
        params: {
          name: 'Random User',
          callType,
          callId: `call_${Date.now()}`,
          roomId: `room_${Date.now()}`,
          isRandom: 'true',
          role: 'USER'
        }
      });
    }
  };

  
  const cardsPerPage = 2;
  const totalPages = Math.ceil(bestChoiceData.length / cardsPerPage);

  const onCarouselScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const middleItem = viewableItems[Math.floor(viewableItems.length / 2)];
      if (middleItem) {
        setActiveSlide(Math.floor(middleItem.index / cardsPerPage));
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  
  const [showFab, setShowFab] = useState(false);

  const handleRandomClick = () => {
    setShowFab(true);
    // Hide the random button
    Animated.timing(randomAnim, { toValue: 120, duration: 200, useNativeDriver: true }).start();
  };

  const handleCloseFab = () => {
    setShowFab(false);
    // Bring random button back if scrolled
    if (showRandom) {
      Animated.spring(randomAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    }
  };

  
  const [showRandom, setShowRandom] = useState(false);
  const randomAnim = useRef(new Animated.Value(120)).current; 

  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    const y = contentOffset.y;
    const isScrolledDown = y > 100;

    if (isScrolledDown && !showRandom) {
      setShowRandom(true);
      Animated.spring(randomAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    } else if (!isScrolledDown && showRandom) {
      setShowRandom(false);
      Animated.timing(randomAnim, { toValue: 120, duration: 200, useNativeDriver: true }).start();
    }
  };

  const handleProfilePress = (id) => {
    router.push({ pathname: '/listener-profile/[id]', params: { id } });
  };

  const renderBestChoiceItem = useCallback(({ item }) => (
    <BestChoiceCard 
      item={item} 
      onCallPress={(type) => handleCallPress(item, type)} 
      onProfilePress={() => handleProfilePress(item.id)} 
    />
  ), []);

  // Skeleton loading UI
  if (loading && bestChoiceData.length === 0 && peopleData.length === 0) {
    return <HomeSkeleton />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => router.push('/profile')}
          >
            <Image
              source={userAvatar}
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

          {discountTimeLeft > 0 && (
            <TouchableOpacity
              style={styles.timerCapsule}
              activeOpacity={0.7}
              onPress={() => setShowCoinsOffer(true)}
            >
              <Ionicons name="timer-outline" size={14} color="#F59E0B" />
              <Text style={styles.timerCapsuleText}>
                {`${String(Math.floor(discountTimeLeft / 3600)).padStart(2,'0')}:${String(Math.floor((discountTimeLeft % 3600) / 60)).padStart(2,'0')}:${String(discountTimeLeft % 60).padStart(2,'0')}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.notificationBtn} 
          activeOpacity={0.7}
          onPress={() => setShowNotifications(true)}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6', '#8B5CF6']}
          />
        }
      >
        {}
        <Text style={styles.sectionTitle}>Best Choice</Text>

        {}
        {bestChoiceData.length === 0 ? (
          <View style={styles.emptyCardContainer}>
            <Text style={styles.emptyCardText}>No listeners available at the moment.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={bestChoiceData}
            renderItem={renderBestChoiceItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContainer}
            onScroll={onCarouselScroll}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            scrollEventThrottle={16}
          />
        )}

        {}
        <View style={styles.pagination}>
          {Array.from({ length: Math.max(1, totalPages) }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeSlide === index && styles.paginationDotActive,
                totalPages === 0 && { opacity: 0.2 }
              ]}
            />
          ))}
        </View>

        {}
        <Text style={styles.sectionTitle}>People You Can Talk</Text>

        {}
        <View style={styles.peopleGridContainer}>
          <View style={styles.peopleGrid}>
            {peopleData.length === 0 ? (
              <View style={styles.emptyPeopleContainer}>
                <Ionicons name="people-outline" size={40} color="#374151" />
                <Text style={styles.emptyPeopleText}>No listeners found.</Text>
              </View>
            ) : (
              peopleData.map((item) => (
                <PeopleCard 
                  key={item.id} 
                  item={item} 
                  onCallPress={(type) => handleCallPress(item, type)} 
                  onChatPress={() => {
                    router.push({
                      pathname: '/(chat)/chat',
                      params: {
                        name: item.name,
                        id: item.id,
                        avatarIndex: item.avatarIndex || '0',
                        gender: item.gender || 'Female'
                      }
                    });
                  }}
                  onProfilePress={() => handleProfilePress(item.id)} 
                />
              ))
            )}
          </View>
        </View>

        {}
        <View style={{ height: vs(20) }} />
      </ScrollView>

      {}
      {!showFab && (
        <Animated.View
          style={[
            styles.floatingRandomWrapper,
            { bottom: hp(18), right: wp(5), transform: [{ translateX: randomAnim }] },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.randomBtn}
            activeOpacity={0.85}
            onPress={handleRandomClick}
          >
            <Text style={styles.randomBtnText}>Random </Text>
            <Ionicons name="shuffle" size={ms(18)} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FAB Menu Modal */}
      <Modal
        transparent
        visible={showFab}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseFab}
      >
        <Pressable style={styles.fabOverlay} onPress={handleCloseFab}>
          <View style={styles.fabMenu}>
            {/* Video Call — top, right-aligned */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                handleCloseFab();
                handleCallPress(null, 'video');
              }}
              style={styles.fabVideoRow}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.fabCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="videocam" size={hp(3)} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom row: Audio (left) + Close (right) */}
            <View style={styles.fabBottomRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  handleCloseFab();
                  handleCallPress(null, 'audio');
                }}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.fabCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="call" size={hp(3)} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCloseFab}
              >
                <LinearGradient
                  colors={['#3B82F6', '#EC4899', '#F59E0B']}
                  style={styles.fabCloseCircle}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                >
                  <Ionicons name="close" size={hp(3.5)} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {}
      <WelcomePopup visible={showWelcome} onAgree={handleWelcomeAgree} />


      <CoinsOfferPopup
        visible={showCoinsOffer}
        onClose={handleCoinsClose}
        onAddCoins={handleAddCoins}
        timeLeft={discountTimeLeft}
        offerData={topOffer}
      />
      <NotificationsPopup
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      <InsufficientBalancePopup
        visible={showInsufficientBalance}
        onClose={() => setShowInsufficientBalance(false)}
        onBuyCoins={() => {
          setShowInsufficientBalance(false);
          router.push('/balance');
        }}
        balance={coinBalance}
      />
      <NotificationsPopup
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  avatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    borderWidth: 2,
    borderColor: '#EC4899',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: wp(5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    gap: wp(1),
    borderWidth: 1,
    borderColor: '#333',
  },
  coinEmoji: {
    fontSize: wp(3.5),
  },
  coinCount: {
    fontSize: wp(3.2),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  timerCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: wp(5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    gap: wp(1),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  timerCapsuleText: {
    fontSize: wp(2.8),
    color: '#F59E0B',
    fontFamily: 'Inter_700Bold',
  },
  notificationBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(10),
  },
  sectionTitle: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    paddingHorizontal: wp(4),
    marginTop: hp(1.5),
    marginBottom: hp(1.5),
  },
  carouselContainer: {
    paddingHorizontal: wp(4),
    gap: wp(4),
  },
  bestChoiceCardOuter: {
    width: wp(85),
  },
  bestChoiceGradientBorder: {
    borderRadius: wp(5),
    padding: 2.5,
  },
  bestChoiceCardInner: {
    borderRadius: wp(4.5),
    overflow: 'hidden',
    backgroundColor: '#111',
    height: hp(25),
  },
  bestChoiceImage: {
    width: '100%',
    height: '100%',
  },
  bestChoiceLiveBadgeWrapper: {
    position: 'absolute',
    top: hp(1.2),
    left: wp(2.5),
  },
  bestChoiceActionStack: {
    position: 'absolute',
    top: '30%',
    right: wp(1.5),
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: wp(5),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(1),
    gap: hp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  bestChoiceActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestChoiceNameRow: {
    position: 'absolute',
    bottom: hp(1.2),
    left: wp(2.5),
    right: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestChoiceName: {
    fontSize: wp(3.5),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: wp(3),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    gap: wp(1),
  },
  liveDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
    backgroundColor: '#22C55E',
  },
  liveText: {
    fontSize: wp(2.5),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  verifiedBadge: {
    marginLeft: wp(1),
    justifyContent: 'center',
    alignItems: 'center',
    width: wp(4),
    height: wp(4),
  },
  verifiedBadgeBg: {
    position: 'absolute',
    width: wp(2),
    height: wp(2),
    backgroundColor: '#fff',
    borderRadius: wp(1),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(1.8),
    marginBottom: hp(1),
    gap: wp(1.5),
  },
  paginationDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#333',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
  },
  peopleGridContainer: {
    position: 'relative',
  },
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(3),
    gap: wp(2),
  },
  emptyCardContainer: {
    height: hp(30),
    width: wp(90),
    marginHorizontal: wp(5),
    backgroundColor: '#0A0A0A',
    borderRadius: wp(6),
    borderWidth: 1,
    borderColor: '#1F2937',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.2),
  },
  emptyCardText: {
    color: '#6B7280',
    fontSize: wp(3.5),
    fontFamily: 'Inter_500Medium',
  },
  emptyPeopleContainer: {
    width: '100%',
    paddingVertical: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: wp(6),
    borderWidth: 1,
    borderColor: '#1F2937',
    borderStyle: 'dashed',
  },
  emptyPeopleText: {
    color: '#6B7280',
    fontSize: wp(3.5),
    fontFamily: 'Inter_500Medium',
    marginTop: hp(1),
  },
  floatingRandomWrapper: {
    position: 'absolute',
    zIndex: 50,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    borderRadius: wp(6),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  randomBtnText: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  peopleCardWrapper: {
    width: wp(45),
  },
  peopleCard: {
    borderRadius: wp(5),
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
  peopleImageContainer: {
    width: '100%',
    height: hp(22),
    position: 'relative',
    overflow: 'hidden',
  },
  peopleImage: {
    width: '100%',
    height: '100%',
  },
  peopleNameGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: hp(8),
  },
  peopleLiveBadgeWrapper: {
    position: 'absolute',
    top: hp(1.2),
    left: wp(2.5),
  },
  peopleNameRow: {
    position: 'absolute',
    bottom: hp(1),
    left: wp(2.5),
    right: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  peopleName: {
    fontSize: wp(3.5),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    flexShrink: 1,
  },
  peopleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    backgroundColor: '#111',
  },
  peopleActionBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },

  
  fabOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  fabMenu: {
    marginBottom: hp(10),
    marginRight: wp(5),
    alignItems: 'flex-end',
    gap: hp(2),
  },
  fabVideoRow: {
    alignSelf: 'flex-end',
  },
  fabBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
  },
  fabCircle: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  fabCloseCircle: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },

  

});
