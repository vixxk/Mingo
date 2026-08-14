import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { hp, wp, ms, vs } from '../../utils/responsive';
import { useRef, useEffect, useState, useCallback } from 'react';
import { walletAPI } from '../../utils/api';
import StatusPopup from '../../components/shared/StatusPopup';
import PaymentStateOverlay from '../../components/shared/PaymentStateOverlay';

const CDN_URL = 'https://d3arutsevouzgm.cloudfront.net';

const DEFAULT_PACKAGES = [
  { id: '1',  coins: 80,    originalPrice: 62,    price: 62,    discount: 0,  tag: 'Starter Offer', subTag: '',               iconUrl: `${CDN_URL}/coin_packages/v3/pack_80.png` },
  { id: '2',  coins: 300,   originalPrice: 149,   price: 149,   discount: 0,  tag: '',              subTag: '',               iconUrl: `${CDN_URL}/coin_packages/v3/pack_300.png` },
  { id: '3',  coins: 450,   originalPrice: 251,   price: 251,   discount: 0,  tag: 'Most Popular',  subTag: '',               iconUrl: `${CDN_URL}/coin_packages/v3/pack_450.png` },
  { id: '4',  coins: 1100,  originalPrice: 550,   price: 550,   discount: 0,  tag: 'Hot',           subTag: '',               iconUrl: `${CDN_URL}/coin_packages/v3/pack_1100.png` },
  { id: '5',  coins: 1800,  originalPrice: 1055,  price: 1055,  discount: 0,  tag: 'Hot',           subTag: '',               iconUrl: `${CDN_URL}/coin_packages/v3/pack_1800.png` },
  { id: '6',  coins: 3500,  originalPrice: 1549,  price: 1049,  discount: 32, tag: 'Best Value',   subTag: 'Flat ₹500 off',  iconUrl: `${CDN_URL}/coin_packages/v3/pack_3500.png` },
  { id: '7',  coins: 5000,  originalPrice: 1999,  price: 1999,  discount: 0,  tag: 'Super Saver',  subTag: '',               iconUrl: `${CDN_URL}/coin_packages/v3/pack_5000.png` },
  { id: '8',  coins: 9000,  originalPrice: 3251,  price: 2651,  discount: 18, tag: 'Limited Offer', subTag: 'Flat ₹600 off',  iconUrl: `${CDN_URL}/coin_packages/v3/pack_9000.png` },
  { id: '9',  coins: 15000, originalPrice: 6000,  price: 3600,  discount: 40, tag: 'Value Pack',    subTag: 'Flat ₹2400 off', iconUrl: `${CDN_URL}/coin_packages/v3/pack_15000.png` },
  { id: '10', coins: 20000, originalPrice: 8000,  price: 5000,  discount: 38, tag: 'Premium Pack',  subTag: 'Flat ₹3000 off', iconUrl: `${CDN_URL}/coin_packages/v3/pack_20000.png` },
  { id: '11', coins: 30000, originalPrice: 12000, price: 7500,  discount: 38, tag: 'Mega Pack',     subTag: 'Flat ₹4500 off', iconUrl: `${CDN_URL}/coin_packages/v3/pack_30000.png` },
  { id: '12', coins: 50000, originalPrice: 18000, price: 11000, discount: 39, tag: 'Ultimate Pack', subTag: 'Flat ₹7000 off', iconUrl: `${CDN_URL}/coin_packages/v3/pack_50000.png` },
];

const getCardGradient = (tag, isSelected) => {
  if (isSelected) return ['#581C87', '#3B0764', '#180E29'];
  if (!tag) return ['#1A1A24', '#12121A', '#0B0B10'];
  if (tag.includes('Starter')) return ['#4A1D1A', '#1A1420', '#0B0B10'];
  if (tag.includes('Popular')) return ['#4C1D41', '#1C1420', '#0B0B10'];
  if (tag.includes('Hot')) return ['#4D1C24', '#1C1420', '#0B0B10'];
  if (tag.includes('Best')) return ['#4D321A', '#1C1620', '#0B0B10'];
  if (tag.includes('Saver')) return ['#311C4D', '#1A1420', '#0B0B10'];
  if (tag.includes('Limited')) return ['#4D321A', '#1C1620', '#0B0B10'];
  if (tag.includes('Value')) return ['#3B1C4D', '#1A1420', '#0B0B10'];
  if (tag.includes('Premium')) return ['#1C2D4D', '#141820', '#0B0B10'];
  if (tag.includes('Mega')) return ['#1C4D43', '#14201D', '#0B0B10'];
  if (tag.includes('Ultimate')) return ['#4D1C33', '#20141A', '#0B0B10'];
  return ['#1A1A24', '#12121A', '#0B0B10'];
};

const getTagBadgeStyle = (tag) => {
  if (!tag) return { bg: 'transparent', color: '#FCA5A5' };
  if (tag.includes('Popular')) return { bg: 'rgba(236, 72, 153, 0.25)', color: '#F472B6' };
  if (tag.includes('Hot')) return { bg: 'rgba(239, 68, 68, 0.25)', color: '#F87171' };
  if (tag.includes('Best') || tag.includes('Starter') || tag.includes('Limited')) return { bg: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24' };
  if (tag.includes('Saver') || tag.includes('Value')) return { bg: 'rgba(168, 85, 247, 0.25)', color: '#C084FC' };
  if (tag.includes('Premium')) return { bg: 'rgba(59, 130, 246, 0.25)', color: '#60A5FA' };
  if (tag.includes('Mega')) return { bg: 'rgba(20, 184, 166, 0.25)', color: '#2DD4BF' };
  if (tag.includes('Ultimate')) return { bg: 'rgba(244, 63, 94, 0.25)', color: '#FB7185' };
  return { bg: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24' };
};

const CoinCard = ({ item, isSelected, onSelect, onDoubleTap, isPurchasing }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef(0);

  const handlePress = () => {
    const now = Date.now();
    onSelect(item);
    if (now - lastTapRef.current < 400) {
      onDoubleTap(item);
    }
    lastTapRef.current = now;
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, friction: 8, tension: 100, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  };

  const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price);
  const tagLabel = item.tag ? (
    item.tag.includes('Hot') ? `🔥 ${item.tag}` :
    item.tag.includes('Starter') ? `✨ ${item.tag}` :
    item.tag.includes('Popular') ? `✨ ${item.tag}` :
    item.tag.includes('Best') ? `✨ ${item.tag}` :
    item.tag.includes('Saver') ? `✨ ${item.tag}` :
    item.tag.includes('Limited') ? `✨ ${item.tag}` :
    item.tag.includes('Pack') ? `💎 ${item.tag}` : `✨ ${item.tag}`
  ) : null;

  const badgeStyle = getTagBadgeStyle(item.tag);
  const rawUrl = item.iconUrl || `${CDN_URL}/coin_packages/v3/pack_${item.coins}.png`;
  const iconUri = rawUrl.includes('/coin_packages/v3/') ? rawUrl : rawUrl.replace('/coin_packages/', '/coin_packages/v3/');

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={isPurchasing}
      style={styles.cardWrapper}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={getCardGradient(item.tag, isSelected)}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.card,
            isSelected && styles.selectedCard,
          ]}
        >
          {/* Top Badge Slot */}
          <View style={styles.badgeSlot}>
            {tagLabel ? (
              <View style={[styles.badgeContainer, { backgroundColor: badgeStyle.bg }]}>
                <Text style={[styles.badgeText, { color: badgeStyle.color }]} numberOfLines={1}>{tagLabel}</Text>
              </View>
            ) : null}
          </View>
          
          {/* Large Icon Slot */}
          <View style={styles.coinIconWrap}>
            <Image
              source={{ uri: iconUri }}
              style={styles.coinIcon}
              resizeMode="contain"
            />
          </View>

          {/* Coin Amount Slot */}
          <View style={styles.coinAmountSlot}>
            <Text style={styles.coinAmount}>{item.coins}</Text>
          </View>

          {/* Discount Pill Slot */}
          <View style={styles.discountSlot}>
            {item.subTag ? (
              <View style={styles.discountPill}>
                <Text style={styles.discountLabel}>{item.subTag}</Text>
              </View>
            ) : item.discount > 0 ? (
              <View style={styles.discountPill}>
                <Text style={styles.discountLabel}>Flat {item.discount}% off</Text>
              </View>
            ) : null}
          </View>

          {/* Price Row Slot */}
          <View style={styles.priceRow}>
            {hasDiscount ? (
              <Text style={styles.priceOld}>₹{item.originalPrice}</Text>
            ) : null}
            <Text style={styles.priceNew}>₹{item.price}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function BalanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState(DEFAULT_PACKAGES[0]);
  const [balance, setBalance] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const purchasingRef = useRef(false);

  const [popup, setPopup] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: null,
  });

  const [paymentOverlay, setPaymentOverlay] = useState({
    visible: false,
    state: 'processing',
    coins: 0,
    newBalance: 0,
    errorMessage: '',
  });

  const handleBuyCoins = async (targetPackage) => {
    const pkgToBuy = targetPackage || selectedPackage;
    if (!pkgToBuy || purchasingRef.current) return;

    purchasingRef.current = true;
    setIsPurchasing(true);

    const productId = pkgToBuy.id || pkgToBuy._id;
    const previousBalance = balance;

    // Show Payment Processing Screen
    setPaymentOverlay({
      visible: true,
      state: 'processing',
      coins: pkgToBuy.coins,
      newBalance: balance + pkgToBuy.coins,
      errorMessage: '',
    });

    try {
      await walletAPI.purchaseCoins(productId);
      const balRes = await walletAPI.getBalance();
      let updatedBal = balance + pkgToBuy.coins;
      if (balRes?.data) {
        updatedBal = balRes.data.coins;
        setBalance(balRes.data.coins);
        setDiamonds(balRes.data.diamonds || Math.floor(balRes.data.coins / 10));
      } else {
        setBalance(updatedBal);
      }

      // Show Payment Success Screen
      setPaymentOverlay({
        visible: true,
        state: 'success',
        coins: pkgToBuy.coins,
        newBalance: updatedBal,
        errorMessage: '',
      });
    } catch (e) {
      setBalance(previousBalance);
      console.log('Purchase error:', e);
      // Show Payment Failure Screen
      setPaymentOverlay({
        visible: true,
        state: 'failed',
        coins: pkgToBuy.coins,
        newBalance: previousBalance,
        errorMessage: e?.response?.data?.message || 'Incase any amount was deducted, please contact support@talkmingo.com',
      });
    } finally {
      purchasingRef.current = false;
      setIsPurchasing(false);
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
            setPackages(pkgRes.data.packages);
            setSelectedPackage((prev) => {
              const found = pkgRes.data.packages.find(p => (p.id || p._id) === (prev?.id || prev?._id));
              return found || pkgRes.data.packages[0];
            });
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

  const activeCoins = selectedPackage?.coins || 80;
  const activePrice = selectedPackage?.price || 62;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
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
            {packages.map((item, index) => {
              const itemKey = item.id || item._id || String(index);
              const selectedKey = selectedPackage?.id || selectedPackage?._id;
              const isSelected = itemKey === selectedKey;
              return (
                <CoinCard
                  key={itemKey}
                  item={item}
                  isSelected={isSelected}
                  onSelect={(pkg) => setSelectedPackage(pkg)}
                  onDoubleTap={(pkg) => handleBuyCoins(pkg)}
                  isPurchasing={isPurchasing}
                />
              );
            })}
          </View>

          {/* Footer Info */}
          <View style={styles.footerInfo}>
            <Text style={styles.footerRate}>
              10 <Image source={require('../../images/insufficient balance/twemoji_coin.png')} style={{width: wp(4.5), height: wp(4.5), transform: [{ translateY: 2.5 }]}} /> = 1 💎
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(wallet)/diamond-talks')}>
              <Text style={styles.footerLink}>Learn more about Diamonds</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://www.talkmingo.com/refund-policy')}>
              <Text style={styles.refundLink}>Refund Policy</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
        <View style={{ height: hp(12) }} />
      </ScrollView>

      {/* Sticky Dynamic Purchase Footer CTA */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom + hp(1), hp(2.5)) }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleBuyCoins(selectedPackage)}
          disabled={isPurchasing}
          style={styles.stickyCtaWrap}
        >
          <LinearGradient
            colors={['#DC2626', '#B91C1C', '#7F1D1D']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.stickyCtaGradient}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.ctaContentRow}>
                <Text style={styles.ctaText}>Add {activeCoins} coins</Text>
                <Ionicons name="chevron-forward" size={wp(5)} color="#fff" style={styles.ctaIcon} />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <StatusPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={popup.onClose}
      />

      <PaymentStateOverlay
        visible={paymentOverlay.visible}
        state={paymentOverlay.state}
        coins={paymentOverlay.coins}
        newBalance={paymentOverlay.newBalance}
        errorMessage={paymentOverlay.errorMessage}
        onViewWallet={() => setPaymentOverlay((prev) => ({ ...prev, visible: false }))}
        onBackToHome={() => {
          setPaymentOverlay((prev) => ({ ...prev, visible: false }));
          router.replace('/(tabs)');
        }}
        onTryAgain={() => {
          setPaymentOverlay((prev) => ({ ...prev, visible: false }));
          handleBuyCoins(selectedPackage);
        }}
        onClose={() => setPaymentOverlay((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const CARD_GAP = wp(1.2);
const PADDING_H = wp(2.5);
const CARD_W = (wp(100) - (PADDING_H * 2) - (CARD_GAP * 3)) / 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingVertical: hp(1.5),
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  headerTitle: { fontSize: wp(5.5), color: '#fff', fontWeight: '600' },
  headerBadges: { flexDirection: 'row', gap: wp(2) },
  headerCoinBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: wp(5), paddingHorizontal: wp(3.5), paddingVertical: hp(0.6),
    gap: wp(1.5), borderWidth: 1, borderColor: '#333',
  },
  headerCoinIcon: { width: wp(4), height: wp(4), transform: [{ translateY: 1 }] },
  headerCoinCount: { fontSize: wp(4), color: '#fff', fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: PADDING_H, paddingTop: hp(1), paddingBottom: hp(10) },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, justifyContent: 'flex-start' },

  cardWrapper: { width: CARD_W, marginBottom: hp(1) },
  card: { 
    borderRadius: wp(3.5), 
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(1),
    alignItems: 'center',
    height: hp(18.5),
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  selectedCard: {
    borderColor: '#EF4444',
    borderWidth: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeSlot: {
    height: hp(2.2),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  badgeContainer: {
    paddingHorizontal: wp(1.2),
    paddingVertical: hp(0.1),
    borderRadius: wp(1.2),
    maxWidth: CARD_W - wp(1.5),
  },
  badgeText: {
    fontSize: wp(1.9),
    fontWeight: '700',
  },
  coinIconWrap: {
    height: hp(6.2),
    width: CARD_W - wp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIcon: {
    width: wp(12.5),
    height: wp(12.5),
  },
  coinAmountSlot: {
    height: hp(2.2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinAmount: {
    fontSize: wp(3.8),
    color: '#fff',
    fontWeight: '800',
  },
  discountSlot: {
    height: hp(2.2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountPill: {
    backgroundColor: '#6B21A8',
    paddingHorizontal: wp(1.2),
    paddingVertical: hp(0.12),
    borderRadius: wp(1.5),
  },
  discountLabel: {
    fontSize: wp(1.8),
    color: '#F3E8FF',
    fontWeight: '700',
  },
  priceRow: {
    height: hp(2.2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(0.6),
  },
  priceOld: {
    fontSize: wp(2.0),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: wp(3.1),
    color: '#fff',
    fontWeight: '700',
  },

  footerInfo: { marginTop: hp(3), alignItems: 'center', gap: hp(1.5) },
  footerRate: { fontSize: wp(4), color: '#fff', fontWeight: '600', textAlign: 'center' },
  footerLink: { fontSize: wp(3.6), color: '#FBBF24', textDecorationLine: 'underline', fontWeight: '600' },
  refundLink: { fontSize: wp(3.2), color: '#9CA3AF', textDecorationLine: 'underline', fontWeight: '500', marginTop: hp(0.5) },

  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    paddingHorizontal: wp(5),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  stickyCtaWrap: {
    height: hp(6.2),
    borderRadius: wp(7.5),
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  stickyCtaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  ctaText: {
    color: '#fff',
    fontSize: wp(4.5),
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
  },
  ctaIcon: {
    marginTop: 1,
  },
});
