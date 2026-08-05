import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Animated,
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
import { getAvatarUrl } from '../../utils/avatars';
import { walletAPI, listenersAPI, authAPI, callAPI, notificationAPI, adsAPI } from '../../utils/api';
import { socketService } from '../../utils/socket';
import WelcomePopup from '../../components/shared/WelcomePopup';
import CoinsOfferPopup from '../../components/shared/CoinsOfferPopup';
import CenteredOfferPopup from '../../components/shared/CenteredOfferPopup';
import InsufficientBalancePopup from '../../components/shared/InsufficientBalancePopup';
import NotificationsPopup from '../../components/shared/NotificationsPopup';
import AdSlider from '../../components/shared/AdSlider';
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

const BusyBadge = ({ busySince }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!busySince) return;
    
    const updateElapsed = () => {
      const now = new Date();
      const busyTime = new Date(busySince);
      const diffMs = now - busyTime;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setElapsed('1 min');
      } else {
        setElapsed(`${diffMins} min`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [busySince]);

  return (
    <View style={[styles.liveBadge, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}>
      <View style={[styles.liveDot, { backgroundColor: '#fff' }]} />
      <Text style={styles.liveText}>Busy{elapsed ? ` ${elapsed}` : ''}</Text>
    </View>
  );
};

const InactiveBadge = () => (
  <View style={[styles.liveBadge, { backgroundColor: 'rgba(107, 114, 128, 0.9)' }]}>
    <View style={[styles.liveDot, { backgroundColor: '#9CA3AF' }]} />
    <Text style={styles.liveText}>Inactive</Text>
  </View>
);


const VerifiedBadge = () => (
  <View style={styles.verifiedBadge}>
    <View style={styles.verifiedBadgeBg} />
    <MaterialIcons name="verified" size={ms(16, 0.3)} color="#38BDF8" />
  </View>
);




const BestChoiceCard = ({ item, onCallPress, onChatPress, onProfilePress }) => {
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

  const isInactive = !item.isLive || item.isBusy;
  const canUseAudio = isInactive || item.audioEnabled !== false;
  const canUseVideo = isInactive || item.videoEnabled === true;
  const canUseChat = isInactive || item.chatEnabled !== false;

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
              source={{ uri: item.image || getAvatarUrl(item.gender, item.avatarIndex) }}
              style={[styles.bestChoiceImage, isInactive && { opacity: 0.5 }]}
              resizeMode="cover"
            />
            {}
            <View style={styles.bestChoiceLiveBadgeWrapper}>
              {item.isBusy ? <BusyBadge busySince={item.busySince} /> : item.isLive ? <LiveBadge /> : <InactiveBadge />}
            </View>
            {}
            <View style={styles.bestChoiceActionStack}>
              {canUseAudio && (
                <TouchableOpacity
                  style={[styles.bestChoiceActionBtn, isInactive && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                  onPress={() => onCallPress('audio')}
                  disabled={isInactive}
                >
                  <Ionicons name="call-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              {canUseVideo && (
                <TouchableOpacity
                  style={[styles.bestChoiceActionBtn, isInactive && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                  onPress={() => onCallPress('video')}
                  disabled={isInactive}
                >
                  <Ionicons name="videocam-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              {canUseChat && (
                <TouchableOpacity
                  style={[styles.bestChoiceActionBtn, isInactive && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                  onPress={onChatPress}
                  disabled={isInactive}
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

  const isInactive = !item.isLive || item.isBusy;
  const canUseAudio = isInactive || item.audioEnabled !== false;
  const canUseVideo = isInactive || item.videoEnabled === true;
  const canUseChat = isInactive || item.chatEnabled !== false;

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
            source={{ uri: item.image || getAvatarUrl(item.gender, item.avatarIndex) }}
            style={[styles.peopleImage, !item.isLive && { opacity: 0.5 }]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.8)']}
            style={styles.peopleNameGradient}
          />
          <View style={styles.peopleLiveBadgeWrapper}>
            {item.isBusy ? <BusyBadge busySince={item.busySince} /> : item.isLive ? <LiveBadge /> : <InactiveBadge />}
          </View>
          <View style={styles.peopleNameRow}>
            <Text style={styles.peopleName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isVerified && <VerifiedBadge />}
          </View>
        </View>
        <View style={styles.peopleActions}>
          {canUseAudio && (
            <TouchableOpacity
              style={[styles.peopleActionBtn, isInactive && { opacity: 0.5 }]}
              activeOpacity={0.7}
              onPress={() => onCallPress('audio')}
              disabled={isInactive}
            >
              <Ionicons name="call-outline" size={18} color="#22C55E" />
            </TouchableOpacity>
          )}
          {canUseChat && (
            <TouchableOpacity
              style={[styles.peopleActionBtn, isInactive && { opacity: 0.5 }]}
              activeOpacity={0.7}
              onPress={onChatPress}
              disabled={isInactive}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {canUseVideo && (
            <TouchableOpacity
              style={[styles.peopleActionBtn, isInactive && { opacity: 0.5 }]}
              activeOpacity={0.7}
              onPress={() => onCallPress('video')}
              disabled={isInactive}
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

  const [ads, setAds] = useState([]);
  const [sliderInterval, setSliderInterval] = useState(4);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCenteredOffer, setShowCenteredOffer] = useState(false);
  const [showCoinsOffer, setShowCoinsOffer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
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
        setUserAvatar(getAvatarUrl(gender, avatarIndex));
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
          busySince: l.busySince,
          isVerified: l.isVerified,
          bestChoice: l.bestChoice,
          audioEnabled: l.audioEnabled !== false, // default true
          videoEnabled: l.videoEnabled === true,  // default false
          chatEnabled: l.chatEnabled !== false,   // default true
          gradientColors: l.gradientColors || ['#3B82F6', '#8B5CF6'],
          gender: l.gender,
          avatarIndex: l.avatarIndex || 0,
        }));

        // Sort: Active listeners first, then Inactive
        mappedListeners.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          if (a.isBusy && !b.isBusy) return -1;
          if (!a.isBusy && b.isBusy) return 1;
          return 0;
        });

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

    try {
      const adsRes = await adsAPI.getActiveAds();
      if (adsRes?.data) {
        // Backend may still return a bare array while the new shape is rolling out
        const adsData = Array.isArray(adsRes.data) ? adsRes.data : (adsRes.data.ads || []);
        setAds(adsData);
        if (adsRes.data.sliderInterval) setSliderInterval(adsRes.data.sliderInterval);
      }
    } catch (e) {
      console.log('Ads fetch fallback:', e.message);
    }
  }, []);

  useEffect(() => {
    const handleStatusChanged = (data) => {
      console.log('[Home] Listener status changed:', data);
      const { userId, isOnline, isBusy, busySince } = data;
      
      const updateStatus = (list) => 
        list.map(item => {
          if (item.id === userId) {
            return {
              ...item,
              isLive: isOnline,
              isBusy: isBusy,
              busySince: isBusy ? busySince : null
            };
          }
          return item;
        });

      // Re-sort after update
      setBestChoiceData(prev => {
        const updated = updateStatus(prev);
        updated.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          if (a.isBusy && !b.isBusy) return -1;
          if (!a.isBusy && b.isBusy) return 1;
          return 0;
        });
        return updated;
      });
      setPeopleData(prev => {
        const updated = updateStatus(prev);
        updated.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          if (a.isBusy && !b.isBusy) return -1;
          if (!a.isBusy && b.isBusy) return 1;
          return 0;
        });
        return updated;
      });
    };

    socketService.on('listener_status_changed', handleStatusChanged);
    return () => {
      socketService.off('listener_status_changed', handleStatusChanged);
    };
  }, []);

  useStatusSSE(
    useCallback((data) => {
      console.log('[Home] SSE Listener status changed:', data);
      const { userId, isOnline, isBusy, busySince } = data;
      const updateStatus = (list) => 
        list.map(item => {
          if (item.id === userId) {
            return {
              ...item,
              isLive: isOnline,
              isBusy: isBusy,
              busySince: isBusy ? busySince : null
            };
          }
          return item;
        });

      // Re-sort after update
      setBestChoiceData(prev => {
        const updated = updateStatus(prev);
        updated.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          if (a.isBusy && !b.isBusy) return -1;
          if (!a.isBusy && b.isBusy) return 1;
          return 0;
        });
        return updated;
      });
      setPeopleData(prev => {
        const updated = updateStatus(prev);
        updated.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          if (a.isBusy && !b.isBusy) return -1;
          if (!a.isBusy && b.isBusy) return 1;
          return 0;
        });
        return updated;
      });
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

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getNotifications(1, 20);
      const list = res?.data?.notifications || [];
      setHasUnreadNotifications(list.some(n => !n.isRead));
    } catch (e) {
      console.log('Failed to fetch unread notifications:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadNotifications();
    }, [fetchUnreadNotifications])
  );

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
        const hasSeenCoins = await AsyncStorage.getItem('hasSeenCoinsPopup');
        const showLoginOffers = await AsyncStorage.getItem('showLoginOffers');
        
        let balance = coinBalance;
        if (showLoginOffers === 'true' || !hasSeenWelcome || !hasSeenCoins) {
          try {
            const balRes = await walletAPI.getBalance();
            if (balRes?.data?.coins !== undefined) {
              balance = balRes.data.coins;
            }
          } catch (e) {}
        }

        if (showLoginOffers === 'true' && balance === 0) {
          // Show both popups on login only for users with 0 coins
          setShowCenteredOffer(true);
          await AsyncStorage.removeItem('showLoginOffers');
        } else if (showLoginOffers === 'true') {
          await AsyncStorage.removeItem('showLoginOffers');
        } else if (!hasSeenWelcome) {
          // Only show welcome popup on login, not every app open
          setShowWelcome(true);
          await AsyncStorage.setItem('hasSeenWelcomePopup', 'true');
        } else {
          if (!hasSeenCoins && isFirstPurchaseEligible && balance === 0) {
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

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      console.log('[Home] App came to foreground, refreshing data...');
      loadRealData();
      
      // Check if this is the first time the app has been opened (not login)
      const checkAppOpenCount = async () => {
        try {
          const countStr = await AsyncStorage.getItem('appOpenCount');
          const count = countStr ? parseInt(countStr, 10) : 0;
          
          // Only run welcome check if app has been opened once (on first open after login)
          if (count > 0) {
            const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcomePopup');
            if (!hasSeenWelcome && !showWelcome && !showCenteredOffer && !showCoinsOffer) {
              setShowWelcome(true);
            }
          }
        } catch (e) {
          console.log('Error checking app open count:', e);
        }
      };
      
      checkAppOpenCount();
    }
  };
  
  useEffect(() => {
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

  const handleCenteredOfferClose = async () => {
    setShowCenteredOffer(false);
    // Show the second popup after the first one is closed
    setTimeout(() => setShowCoinsOffer(true), 400);
  };

  const handleCenteredOfferAddCoins = async () => {
    setShowCenteredOffer(false);
    await AsyncStorage.setItem('hasSeenCoinsPopup', 'true');
    router.push('/balance');
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
      // Random call — show the dedicated matching screen first
      router.push({
        pathname: '/(call)/finding-listener',
        params: {
          callType,
          isRandom: 'true'
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
  }).current;  const [showBottomBar, setShowBottomBar] = useState(true);
  const bottomBarAnim = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    const y = contentOffset.y;
    const isScrolledDown = y > 50;

    if (isScrolledDown && showBottomBar) {
      setShowBottomBar(false);
      Animated.timing(bottomBarAnim, { toValue: 100, duration: 200, useNativeDriver: true }).start();
    } else if (!isScrolledDown && !showBottomBar) {
      setShowBottomBar(true);
      Animated.spring(bottomBarAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    }
  };

  const handleProfilePress = (id) => {
    router.push({ pathname: '/listener-profile/[id]', params: { id } });
  };

  const renderBestChoiceItem = useCallback(({ item }) => (
    <BestChoiceCard 
      item={item} 
      onCallPress={(type) => handleCallPress(item, type)} 
      onChatPress={() => {
        router.push({
          pathname: '/(chat)/chat',
          params: {
            name: item.name,
            id: item.id,
            avatarIndex: item.avatarIndex || '0',
            gender: item.gender || 'Female',
          },
        });
      }}
      onProfilePress={() => handleProfilePress(item.id)} 
    />
  ), [router]);

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
          <Image
            source={require('../../images/Mingo Splash Text.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
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
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.coinBadge}
            activeOpacity={0.7}
            onPress={() => router.push('/balance')}
          >
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinCount}>{coinBalance}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationBtn} 
            activeOpacity={0.7}
            onPress={() => {
              setHasUnreadNotifications(false);
              setShowNotifications(true);
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {hasUnreadNotifications && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
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
        <AdSlider ads={ads} intervalSec={sliderInterval} />
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
        <Text style={styles.sectionTitle}>People</Text>

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
      {/* Fixed Bottom Find Me Button */}
      {!(showCenteredOffer || showCoinsOffer) && (
        <Animated.View
          style={[
            styles.findMeContainer,
            { bottom: insets.bottom + hp(2), transform: [{ translateY: bottomBarAnim }] },
          ]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={['#DC2626', '#991B1B', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.findMeButton}
          >
            <View style={styles.findMeContent}>
              <View style={styles.findMeLeft}>
                <Ionicons name="sparkles" size={wp(4.5)} color="#fff" />
                <Text style={styles.findMeText}>Find me the right one</Text>
              </View>
              <View style={styles.findMeActions}>
                <TouchableOpacity
                  style={styles.findMeCallBtn}
                  activeOpacity={0.8}
                  onPress={() => handleCallPress(null, 'audio')}
                >
                  <Ionicons name="call" size={wp(5)} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.findMeCallBtn}
                  activeOpacity={0.8}
                  onPress={() => handleCallPress(null, 'video')}
                >
                  <Ionicons name="videocam" size={wp(5)} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {}
      <WelcomePopup visible={showWelcome} onAgree={handleWelcomeAgree} />


      <CenteredOfferPopup
        visible={showCenteredOffer}
        onClose={handleCenteredOfferClose}
        onAddCoins={handleCenteredOfferAddCoins}
        offerData={topOffer}
      />
      <CoinsOfferPopup
        visible={showCoinsOffer}
        onClose={handleCoinsClose}
        onAddCoins={handleAddCoins}
        timeLeft={discountTimeLeft}
        offerData={topOffer}
      />
      <NotificationsPopup
        visible={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadNotifications();
        }}
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
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadNotifications();
        }}
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
  headerRight: {
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
  logoImage: {
    width: wp(38),
    height: hp(5),
    marginLeft: -wp(6),
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
  notifDot: {
    position: 'absolute',
    top: wp(1.2),
    right: wp(1.2),
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#000',
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
  findMeContainer: {
    position: 'absolute',
    left: wp(4),
    right: wp(4),
    zIndex: 50,
  },
  findMeButton: {
    borderRadius: wp(8),
    overflow: 'hidden',
  },
  findMeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
  },
  findMeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    flex: 1,
  },
  findMeText: {
    fontSize: wp(4),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  findMeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  findMeCallBtn: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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

  
});
