import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';
import { useRef, useEffect } from 'react';

const COIN_PACKAGES = [
  { id: '1', coins: 100, original: 100, price: 50, discount: 50 },
  { id: '2', coins: 250, original: 100, price: 50, discount: 50 },
  { id: '3', coins: 500, original: 100, price: 50, discount: 50 },
  { id: '4', coins: 1000, original: 100, price: 50, discount: 50 },
  { id: '5', coins: 1250, original: 100, price: 50, discount: 50 },
  { id: '6', coins: 1500, original: 100, price: 50, discount: 50 },
];

const CoinCard = ({ item, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(item)}
      style={styles.cardWrapper}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={['#964B00', '#2B1100', '#000000']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.card}
        >
          {}
          <View style={styles.coinIconWrap}>
            <Image
              source={require('../../images/insufficient balance/twemoji_coin.png')}
              style={styles.coinIcon}
              resizeMode="contain"
            />
          </View>

          {}
          <Text style={styles.coinAmount}>{item.coins} Coins</Text>

          {}
          <View style={styles.priceRow}>
            <Text style={styles.priceOld}>{item.original}₹</Text>
            <Text style={styles.priceNew}>{item.price}₹</Text>
          </View>

          {}
          <Text style={styles.discountLabel}>Flat {item.discount}% Off</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function BalanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBuyCoins = (item) => {
    
    console.log('Buy coins:', item.coins);
  };

  
  const headerAnim = useRef(new Animated.Value(0)).current;
  const gridAnim = useRef(new Animated.Value(0)).current;
  const gridSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(gridAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(gridSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCoinBadge}>
          <Text style={styles.headerCoinEmoji}>🪙</Text>
          <Text style={styles.headerCoinCount}>0</Text>
        </View>
      </Animated.View>

      {}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {}
        <Animated.View style={[styles.grid, { opacity: gridAnim, transform: [{ translateY: gridSlide }] }]}>
          {COIN_PACKAGES.map((item) => (
            <CoinCard key={item.id} item={item} onPress={handleBuyCoins} />
          ))}
        </Animated.View>

        {}
        <View style={styles.infoSection}>
          <LinearGradient
            colors={['#8B3A00', '#5C2200', '#2D1400']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.infoRow}
          >
            <Text style={styles.infoNum}>1</Text>
            <Image
              source={require('../../images/insufficient balance/twemoji_coin.png')}
              style={styles.infoIcon}
              resizeMode="contain"
            />
            <Text style={styles.infoText}> = 1 Minute Voice Call </Text>
            <Ionicons name="call-outline" size={16} color="#fff" />
          </LinearGradient>
          <LinearGradient
            colors={['#8B3A00', '#5C2200', '#2D1400']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.infoRow}
          >
            <Text style={styles.infoNum}>6</Text>
            <Image
              source={require('../../images/insufficient balance/twemoji_coin.png')}
              style={styles.infoIcon}
              resizeMode="contain"
            />
            <Text style={styles.infoText}> = 1 Minute Video Call </Text>
            <Ionicons name="videocam-outline" size={16} color="#fff" />
          </LinearGradient>
        </View>

        <View style={{ height: vs(40) }} />
      </ScrollView>
    </View>
  );
}

const CARD_W = (SCREEN_WIDTH - s(48) - s(16)) / 2;

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
    paddingVertical: vs(12),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },
  headerCoinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: s(12),
    paddingVertical: vs(5),
    gap: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  headerCoinEmoji: {
    fontSize: ms(14, 0.3),
  },
  headerCoinCount: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },

  
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(24),
    paddingTop: vs(16),
  },

  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(16),
    justifyContent: 'center',
  },

  
  cardWrapper: {
    width: CARD_W,
  },
  card: {
    borderRadius: 18,
    paddingVertical: vs(20),
    alignItems: 'center',
  },
  coinIconWrap: {
    width: s(48),
    height: s(48),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(8),
  },
  coinIcon: {
    width: s(44),
    height: s(44),
  },
  coinAmount: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    marginBottom: vs(8),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(8),
    gap: s(6),
  },
  priceOld: {
    fontSize: ms(20, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: ms(20, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  discountLabel: {
    fontSize: ms(11, 0.3),
    color: '#FCD34D',
    fontFamily: 'Inter_500Medium',
  },

  
  infoSection: {
    marginTop: vs(32),
    gap: vs(12),
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: vs(12),
    paddingHorizontal: s(24),
  },
  infoNum: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
    marginRight: 4,
  },
  infoIcon: {
    width: s(20),
    height: s(20),
  },
  infoText: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },
});
