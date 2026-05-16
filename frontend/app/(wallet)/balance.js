import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { hp, wp } from '../../utils/responsive';
import { useRef, useEffect, useState, useCallback } from 'react';
import { walletAPI } from '../../utils/api';

const DEFAULT_PACKAGES = [
  { id: '1', coins: 40,   originalPrice: 38,  price: 19,  discount: 50, tag: 'Starter Offer' },
  { id: '2', coins: 100,  originalPrice: 98,  price: 49,  discount: 50, tag: 'Flat 50% Off' },
  { id: '3', coins: 220,  originalPrice: 198, price: 99,  discount: 50, tag: 'Most Popular' },
  { id: '4', coins: 350,  originalPrice: 373, price: 149, discount: 60, tag: 'Flat 60% Off' },
  { id: '5', coins: 850,  originalPrice: 873, price: 349, discount: 60, tag: 'Best Value' },
  { id: '6', coins: 1500, originalPrice: 1198, price: 599, discount: 50, tag: 'Super Saver' },
  { id: '7', coins: 3000, originalPrice: 2497, price: 999, discount: 60, tag: 'Limited Offer' },
];

const CoinCard = ({ item, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, friction: 8, tension: 100, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
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
          {item.tag ? (
            <Text style={styles.badgeText}>✨ {item.tag}</Text>
          ) : null}
          
          <View style={styles.coinIconWrap}>
            <Image
              source={require('../../images/insufficient balance/twemoji_coin.png')}
              style={styles.coinIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.coinAmount}>{item.coins}</Text>
          
          <View style={styles.priceRow}>
            {item.originalPrice > 0 && (
              <Text style={styles.priceOld}>₹{item.originalPrice}</Text>
            )}
            <Text style={styles.priceNew}>₹{item.price}</Text>
          </View>

          {item.discount > 0 && (
            <Text style={styles.discountLabel}>Flat {item.discount}% off</Text>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function BalanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [balance, setBalance] = useState(0);
  const [diamonds, setDiamonds] = useState(0);

  const handleBuyCoins = async (item) => {
    try {
      await walletAPI.purchaseCoins({ packageId: item.id || item._id, amount: item.price });
      const balRes = await walletAPI.getBalance();
      if (balRes?.data) {
        setBalance(balRes.data.coins);
        setDiamonds(balRes.data.diamonds || Math.floor(balRes.data.coins / 10));
      }
    } catch (e) {
      console.log('Purchase error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const balRes = await walletAPI.getBalance();
          if (balRes?.data) {
            setBalance(balRes.data.coins);
            setDiamonds(balRes.data.diamonds || Math.floor(balRes.data.coins / 10));
          }
          const pkgRes = await walletAPI.getPackages();
          if (pkgRes?.data?.packages && pkgRes.data.packages.length > 0) {
             // For consistency with specific design we might not override default data in this mode
             // setPackages(pkgRes.data.packages); 
          }
        } catch (e) {
          console.log('Wallet fetch error:', e);
        }
      };
      loadData();
    }, [])
  );

  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={wp(6)} color="#fff" />
          <Text style={styles.headerTitle}>Wallet</Text>
        </TouchableOpacity>
        
        <View style={styles.headerBadges}>
          <View style={styles.headerCoinBadge}>
            <Image
              source={require('../../images/insufficient balance/twemoji_coin.png')}
              style={styles.headerCoinIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerCoinCount}>{balance}</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentSlide }] }}>
          
          {/* Grid */}
          <View style={styles.grid}>
            {packages.map((item, index) => (
              <CoinCard key={item.id || item._id || index} item={item} onPress={handleBuyCoins} />
            ))}
          </View>

          {/* Footer Info */}
          <View style={styles.footerInfo}>
            <Text style={styles.footerRate}>
              10 <Image source={require('../../images/insufficient balance/twemoji_coin.png')} style={{width: wp(4.5), height: wp(4.5), transform: [{ translateY: 2.5 }]}} /> = 1 💎
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.footerLink}>Learn more about Diamonds</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
        <View style={{ height: hp(5) }} />
      </ScrollView>
    </View>
  );
}

const CARD_GAP = wp(3);
const CARD_W = (wp(100) - wp(8) - (CARD_GAP * 2)) / 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingVertical: hp(2),
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  headerTitle: { fontSize: wp(5.5), color: '#fff', fontWeight: '600' },
  headerBadges: { flexDirection: 'row', gap: wp(2) },
  headerCoinBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: wp(5), paddingHorizontal: wp(3), paddingVertical: hp(0.6),
    gap: wp(1.5), borderWidth: 1, borderColor: '#333',
  },
  headerCoinIcon: { width: wp(4), height: wp(4), transform: [{ translateY: 1 }] },
  headerCoinCount: { fontSize: wp(4), color: '#fff', fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: wp(4), paddingTop: hp(2) },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, justifyContent: 'flex-start' },

  cardWrapper: { width: CARD_W, marginBottom: hp(1.5) },
  card: { 
    borderRadius: wp(3), 
    paddingTop: hp(2.5), paddingBottom: hp(1.5), alignItems: 'center',
    height: hp(19), justifyContent: 'space-between'
  },
  badgeText: {
    position: 'absolute', top: hp(0.5), 
    color: '#D8B4FE', fontSize: wp(2.2), fontWeight: '700',
  },
  coinIconWrap: { width: wp(12), height: wp(12), alignItems: 'center', justifyContent: 'center' },
  coinIcon: { width: '100%', height: '100%' },
  coinAmount: { fontSize: wp(4.5), color: '#fff', fontWeight: '600', marginTop: hp(0.5) },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1), marginTop: hp(1) },
  priceOld: { fontSize: wp(3), color: '#9CA3AF', textDecorationLine: 'line-through' },
  priceNew: { fontSize: wp(4), color: '#fff', fontWeight: '500' },
  
  discountLabel: { fontSize: wp(2.5), color: '#D8B4FE', fontWeight: '600', marginTop: hp(0.5) },

  footerInfo: { marginTop: hp(4), alignItems: 'center', gap: hp(1.5) },
  footerRate: { fontSize: wp(4), color: '#fff', fontWeight: '600', textAlign: 'center' },
  footerLink: { fontSize: wp(3.5), color: '#9CA3AF', textDecorationLine: 'underline' }
});
