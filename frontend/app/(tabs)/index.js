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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, wp, hp, SCREEN_WIDTH } from '../../utils/responsive';
import WelcomePopup from '../../components/shared/WelcomePopup';
import CoinsOfferPopup from '../../components/shared/CoinsOfferPopup';
import CertifiedListenerPopup from '../../components/shared/CertifiedListenerPopup';
import InsufficientBalancePopup from '../../components/shared/InsufficientBalancePopup';
import NotificationsPopup from '../../components/shared/NotificationsPopup';


const BEST_CHOICE_DATA = [
  {
    id: '1',
    name: 'Shruti Jaiswal',
    image: require('../../images/user_shruti.png'),
    isLive: true,
    isVerified: true,
    gradientColors: ['#3B82F6', '#8B5CF6'],
  },
  {
    id: '2',
    name: 'Priya Sharma',
    image: require('../../images/user_priya.png'),
    isLive: true,
    isVerified: true,
    gradientColors: ['#EC4899', '#F43F5E'],
  },
  {
    id: '3',
    name: 'Riya',
    image: require('../../images/user_riya.png'),
    isLive: true,
    isVerified: false,
    gradientColors: ['#8B5CF6', '#6366F1'],
  },
  {
    id: '4',
    name: 'Ananya',
    image: require('../../images/user_ananya.png'),
    isLive: true,
    isVerified: true,
    gradientColors: ['#F59E0B', '#EF4444'],
  },
  {
    id: '5',
    name: 'Neha',
    image: require('../../images/user_neha.png'),
    isLive: true,
    isVerified: true,
    gradientColors: ['#10B981', '#3B82F6'],
  },
];


const PEOPLE_DATA = [
  {
    id: '1',
    name: 'Priyanka',
    image: require('../../images/user_priyanka.png'),
    isLive: true,
    isVerified: true,
  },
  {
    id: '2',
    name: 'Deepika',
    image: require('../../images/user_deepika.png'),
    isLive: true,
    isVerified: true,
  },
  {
    id: '3',
    name: 'Ananya',
    image: require('../../images/user_ananya.png'),
    isLive: true,
    isVerified: false,
  },
  {
    id: '4',
    name: 'Neha',
    image: require('../../images/user_neha.png'),
    isLive: true,
    isVerified: false,
  },
  {
    id: '5',
    name: 'Shruti',
    image: require('../../images/user_shruti.png'),
    isLive: true,
    isVerified: true,
  },
  {
    id: '6',
    name: 'Priya',
    image: require('../../images/user_priya.png'),
    isLive: true,
    isVerified: true,
  },
];

const CARD_WIDTH = wp(42);
const CARD_GAP = s(10);


const LiveBadge = () => (
  <View style={styles.liveBadge}>
    <View style={styles.liveDot} />
    <Text style={styles.liveText}>Live</Text>
  </View>
);


const VerifiedBadge = () => (
  <View style={styles.verifiedBadge}>
    <View style={styles.verifiedBadgeBg} />
    <MaterialIcons name="verified" size={ms(16, 0.3)} color="#38BDF8" />
  </View>
);


const BestChoiceCard = ({ item, onCallPress, onProfilePress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
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
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bestChoiceGradientBorder}
        >
          <View style={styles.bestChoiceCardInner}>
            <Image
              source={item.image}
              style={styles.bestChoiceImage}
              resizeMode="cover"
            />
            {}
            {item.isLive && (
              <View style={styles.bestChoiceLiveBadgeWrapper}>
                <LiveBadge />
              </View>
            )}
            {}
            <View style={styles.bestChoiceActionStack}>
              <TouchableOpacity style={styles.bestChoiceActionBtn} activeOpacity={0.7} onPress={onCallPress}>
                <Ionicons name="call-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bestChoiceActionBtn} activeOpacity={0.7} onPress={onCallPress}>
                <Ionicons name="videocam-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bestChoiceActionBtn} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              </TouchableOpacity>
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


const PeopleCard = ({ item, onCallPress, onProfilePress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
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
        <Image
          source={item.image}
          style={styles.peopleImage}
          resizeMode="cover"
        />
        {}
        {item.isLive && (
          <View style={styles.peopleLiveBadgeWrapper}>
            <LiveBadge />
          </View>
        )}
        {}
        <View style={styles.peopleNameRow}>
          <Text style={styles.peopleName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isVerified && <VerifiedBadge />}
        </View>
        {}
        <View style={styles.peopleActions}>
          <TouchableOpacity style={styles.peopleActionBtn} activeOpacity={0.7} onPress={onCallPress}>
            <Ionicons name="call-outline" size={18} color="#22C55E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.peopleActionBtn} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.peopleActionBtn} activeOpacity={0.7} onPress={onCallPress}>
            <Ionicons name="videocam-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [userAvatar, setUserAvatar] = useState(require('../../images/user_avatar.png'));

  useFocusEffect(
    useCallback(() => {
      const loadUserAvatar = async () => {
        try {
          const gender = await AsyncStorage.getItem('userGender');
          const avatarIndex = await AsyncStorage.getItem('userAvatarIndex');

          if (gender && avatarIndex) {
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
      };
      loadUserAvatar();
    }, [])
  );

  
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCoinsOffer, setShowCoinsOffer] = useState(false);
  const [showCertified, setShowCertified] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [signupTimestamp, setSignupTimestamp] = useState(Date.now());

  
  useEffect(() => {
    const checkFirstSignup = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcomePopup');
        if (!hasSeenWelcome) {
          
          const ts = Date.now();
          await AsyncStorage.setItem('signupTimestamp', String(ts));
          setSignupTimestamp(ts);
          setShowWelcome(true);
        } else {
          
          const hasSeenCoins = await AsyncStorage.getItem('hasSeenCoinsPopup');
          const storedTs = await AsyncStorage.getItem('signupTimestamp');
          if (!hasSeenCoins && storedTs) {
            const elapsed = Date.now() - Number(storedTs);
            if (elapsed < 6 * 3600 * 1000) {
              setSignupTimestamp(Number(storedTs));
              setShowCoinsOffer(true);
            }
          }
        }
      } catch (e) {
        
      }
    };
    checkFirstSignup();
  }, []);

  
  useEffect(() => {
    const handleAppOpenCount = async () => {
      try {
        const countStr = await AsyncStorage.getItem('appOpenCount');
        let count = countStr ? parseInt(countStr, 10) : 0;
        count += 1;
        await AsyncStorage.setItem('appOpenCount', count.toString());

        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcomePopup');
        if (hasSeenWelcome && count > 0 && count % 10 === 0) {
          setTimeout(() => setShowCertified(true), 1500);
        }
      } catch (e) {}
    };
    handleAppOpenCount();
  }, []);

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
  };

  
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const handleCallPress = () => setShowInsufficientBalance(true);

  
  const cardsPerPage = 2;
  const totalPages = Math.ceil(BEST_CHOICE_DATA.length / cardsPerPage);

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
  const fabScale = useRef(new Animated.Value(0)).current;

  const handleRandomClick = () => {
    setShowFab(true);
    
    Animated.parallel([
      Animated.spring(fabScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(randomAnim, { toValue: 120, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleCloseFab = () => {
    
    const animations = [
      Animated.timing(fabScale, { toValue: 0, duration: 200, useNativeDriver: true }),
    ];
    Animated.parallel(animations).start(() => {
      setShowFab(false);
      if (showRandom) {
        Animated.spring(randomAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
      }
    });
  };

  
  const [showNewListeners, setShowNewListeners] = useState(false);
  const bannerAnim = useRef(new Animated.Value(-200)).current; 

  
  const [showRandom, setShowRandom] = useState(false);
  const randomAnim = useRef(new Animated.Value(120)).current; 

  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const y = contentOffset.y;
    const isScrolledDown = y > 100;
    const isNearBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 60;

    
    if (isScrolledDown && !showRandom) {
      setShowRandom(true);
      Animated.spring(randomAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    } else if (!isScrolledDown && showRandom) {
      setShowRandom(false);
      Animated.timing(randomAnim, { toValue: 120, duration: 200, useNativeDriver: true }).start();
    }

    
    if (isNearBottom && !showNewListeners) {
      setShowNewListeners(true);
      Animated.spring(bannerAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    } else if (!isNearBottom && showNewListeners) {
      setShowNewListeners(false);
      Animated.timing(bannerAnim, { toValue: -200, duration: 200, useNativeDriver: true }).start();
    }
  };

  const handleBannerPress = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleProfilePress = (id) => {
    router.push({ pathname: '/listener-profile/[id]', params: { id } });
  };

  const renderBestChoiceItem = useCallback(({ item }) => (
    <BestChoiceCard item={item} onCallPress={handleCallPress} onProfilePress={() => handleProfilePress(item.id)} />
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={userAvatar}
            style={styles.avatar}
          />
          <TouchableOpacity
            style={styles.coinBadge}
            activeOpacity={0.7}
            onPress={() => router.push('/balance')}
          >
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinCount}>0</Text>
          </TouchableOpacity>
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
      >
        {}
        <Text style={styles.sectionTitle}>Best Choice</Text>

        {}
        <FlatList
          ref={flatListRef}
          data={BEST_CHOICE_DATA}
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

        {}
        <View style={styles.pagination}>
          {Array.from({ length: totalPages }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeSlide === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        {}
        <Text style={styles.sectionTitle}>People You Can Talk</Text>

        {}
        <View style={styles.peopleGridContainer}>
          <View style={styles.peopleGrid}>
            {PEOPLE_DATA.map((item) => (
              <PeopleCard key={item.id} item={item} onCallPress={handleCallPress} onProfilePress={() => handleProfilePress(item.id)} />
            ))}
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
            { bottom: vs(160), right: s(20), transform: [{ translateX: randomAnim }] },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.randomBtn}
            activeOpacity={0.85}
            onPress={handleRandomClick}
          >
            <Text style={styles.randomBtnText}>Random </Text>
            <Ionicons name="shuffle" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {}
      {!showWelcome && showFab && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              bottom: 4,
              right: 4,
              transform: [{ scale: fabScale }],
            },
          ]}
          pointerEvents="box-none"
        >
          {}
          <TouchableOpacity style={styles.fabOptionBtn1} activeOpacity={0.8} onPress={handleCallPress}>
            <View style={styles.fabOptionInner}>
              <Ionicons name="call-outline" size={wp(13)} color="#000" />
            </View>
          </TouchableOpacity>

          {}
          <TouchableOpacity style={styles.fabOptionBtn2} activeOpacity={0.8} onPress={handleCallPress}>
            <View style={styles.fabOptionInner}>
              <Ionicons name="videocam-outline" size={wp(13)} color="#000" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={handleCloseFab}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#F59E0B']}
              style={styles.fab}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="close" size={wp(17)} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {}
      <WelcomePopup visible={showWelcome} onAgree={handleWelcomeAgree} />

      {}
      <Animated.View
        style={[
          styles.newListenersBanner,
          { top: insets.top + vs(56), transform: [{ translateY: bannerAnim }] },
        ]}
        pointerEvents={showNewListeners ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.newListenersInner}
          activeOpacity={0.85}
          onPress={handleBannerPress}
        >
          <View style={styles.newListenersAvatars}>
            <Image source={require('../../images/avatar_1.png')} style={[styles.nlAvatar, { zIndex: 3 }]} />
            <Image source={require('../../images/avatar_2.png')} style={[styles.nlAvatar, { marginLeft: -s(10), zIndex: 2 }]} />
            <Image source={require('../../images/avatar_3.png')} style={[styles.nlAvatar, { marginLeft: -s(10), zIndex: 1 }]} />
          </View>
          <Text style={styles.newListenersText}>New Listeners</Text>
          <Ionicons name="chevron-up" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </Animated.View>
      <CoinsOfferPopup
        visible={showCoinsOffer}
        onClose={handleCoinsClose}
        onAddCoins={handleAddCoins}
        signupTimestamp={signupTimestamp}
      />
      <CertifiedListenerPopup
        visible={showCertified}
        onExplore={() => {
          setShowCertified(false);
          console.log('Explore certified listeners');
        }}
        onDismiss={() => setShowCertified(false)}
      />
      <InsufficientBalancePopup
        visible={showInsufficientBalance}
        onClose={() => setShowInsufficientBalance(false)}
        onBuyCoins={() => {
          setShowInsufficientBalance(false);
          router.push('/balance');
        }}
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

  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vs(80),
  },

  
  sectionTitle: {
    fontSize: ms(22, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    paddingHorizontal: s(16),
    marginTop: vs(12),
    marginBottom: vs(12),
  },

  
  carouselContainer: {
    paddingHorizontal: s(16),
    gap: CARD_GAP,
  },
  bestChoiceCardOuter: {
    width: CARD_WIDTH,
  },
  bestChoiceGradientBorder: {
    borderRadius: 20,
    padding: 2.5,
  },
  bestChoiceCardInner: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
    height: vs(200),
  },
  bestChoiceImage: {
    width: '100%',
    height: '100%',
  },
  bestChoiceLiveBadgeWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  bestChoiceActionStack: {
    position: 'absolute',
    top: '30%',
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  bestChoiceActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestChoiceNameRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestChoiceName: {
    fontSize: ms(12, 0.3),
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
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  liveText: {
    fontSize: ms(10, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },

  
  verifiedBadge: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    width: ms(16, 0.3),
    height: ms(16, 0.3),
  },
  verifiedBadgeBg: {
    position: 'absolute',
    width: ms(8, 0.3),
    height: ms(8, 0.3),
    backgroundColor: '#fff',
    borderRadius: ms(4, 0.3),
  },

  
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: vs(14),
    marginBottom: vs(8),
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  peopleGridContainer: {
    position: 'relative',
  },
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: s(12),
    gap: s(8),
  },
  floatingRandomWrapper: {
    position: 'absolute',
    zIndex: 50,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    borderRadius: 24,
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
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
    width: '48%',
  },
  peopleCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  peopleImage: {
    width: '100%',
    height: vs(210),
  },
  peopleLiveBadgeWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  peopleNameRow: {
    position: 'absolute',
    bottom: vs(40),
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  peopleName: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  
  peopleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
    backgroundColor: '#111',
  },
  peopleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },

  
  fabContainer: {
    position: 'absolute',
    zIndex: 100,
  },
  fab: {
    width: wp(34),
    height: wp(34),
    borderRadius: wp(17),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabOptionBtn1: {
    position: 'absolute',
    top: wp(3),
    left: -wp(36),
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabOptionBtn2: {
    position: 'absolute',
    top: -wp(36),
    left: wp(3),
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabOptionInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  
  newListenersBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
    overflow: 'hidden',
  },
  newListenersInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 28,
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    gap: s(8),
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  newListenersAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nlAvatar: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  newListenersText: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
