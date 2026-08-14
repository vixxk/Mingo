import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';
import { walletAPI } from '../../utils/api';
import AnimatedSparkles from '../shared/AnimatedSparkles';

const DEFAULT_PACKAGES = [
  { id: '1',  coins: 80,    originalPrice: 62,    price: 62,    discount: 0,  tag: 'Starter Offer', subTag: '' },
  { id: '2',  coins: 300,   originalPrice: 149,   price: 149,   discount: 0,  tag: '',              subTag: '' },
  { id: '3',  coins: 450,   originalPrice: 251,   price: 251,   discount: 0,  tag: 'Most Popular',  subTag: '' },
  { id: '4',  coins: 1100,  originalPrice: 550,   price: 550,   discount: 0,  tag: 'Hot',           subTag: '' },
  { id: '5',  coins: 1800,  originalPrice: 1055,  price: 1055,  discount: 0,  tag: 'Hot',           subTag: '' },
  { id: '6',  coins: 3500,  originalPrice: 1549,  price: 1049,  discount: 32, tag: 'Best Value',   subTag: 'Flat ₹500 off' },
  { id: '7',  coins: 5000,  originalPrice: 1999,  price: 1999,  discount: 0,  tag: 'Super Saver',  subTag: '' },
  { id: '8',  coins: 9000,  originalPrice: 3251,  price: 2651,  discount: 18, tag: 'Limited Offer', subTag: 'Flat ₹600 off' },
  { id: '9',  coins: 15000, originalPrice: 6000,  price: 3600,  discount: 40, tag: 'Value Pack',    subTag: 'Flat ₹2400 off' },
  { id: '10', coins: 20000, originalPrice: 8000,  price: 5000,  discount: 38, tag: 'Premium Pack',  subTag: 'Flat ₹3000 off' },
  { id: '11', coins: 30000, originalPrice: 12000, price: 7500,  discount: 38, tag: 'Mega Pack',     subTag: 'Flat ₹4500 off' },
  { id: '12', coins: 50000, originalPrice: 18000, price: 11000, discount: 39, tag: 'Ultimate Pack', subTag: 'Flat ₹7000 off' },
];

const SUCCESS_DISPLAY_MS = 5000;

export default function InCallRechargePopup({ visible, onClose, onRechargeSuccess, lowBalanceMessage }) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(null); // packageId being purchased
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const purchasingRef = useRef(false);

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await walletAPI.getPackages();
      if (res?.data?.packages && res.data.packages.length > 0) {
        setPackages(res.data.packages);
      }
    } catch (e) {
      console.log('Failed to load packages in call popup:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setPurchaseSuccess(false);
      setPurchasing(null);
      purchasingRef.current = false;
      loadPackages();
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, loadPackages]);

  const handlePurchase = useCallback(async (packageId) => {
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    try {
      setPurchasing(packageId);
      await walletAPI.purchaseCoins(packageId);
      setPurchaseSuccess(true);
      // Notify parent that recharge was successful
      setTimeout(() => {
        if (onRechargeSuccess) onRechargeSuccess();
        setPurchasing(null);
        purchasingRef.current = false;
      }, SUCCESS_DISPLAY_MS);
    } catch (e) {
      console.log('Purchase failed:', e);
      setPurchasing(null);
      purchasingRef.current = false;
    }
  }, [onRechargeSuccess]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#000', '#1A0000', '#4A0000']}
          locations={[0, 0.55, 1]}
          style={styles.popup}
        >
          <AnimatedSparkles color="#F87171" size={18} />
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handleBar} />
            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Warning Message */}
          {lowBalanceMessage ? (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={18} color="#F59E0B" />
              <Text style={styles.warningText}>{lowBalanceMessage}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: vs(4) }}>
            <Text style={{ fontSize: 18, marginRight: 6 }}>🪙</Text>
            <Text style={styles.title}>Quick Recharge</Text>
          </View>
          <Text style={styles.subtitle}>
            Add coins instantly without leaving your call
          </Text>

          {/* Success state */}
          {purchaseSuccess && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
              <Text style={styles.successText}>Coins Added!</Text>
              <Text style={styles.successSubtext}>Your balance has been updated</Text>
            </View>
          )}

          {/* Packages */}
          {!purchaseSuccess && (
            <ScrollView
              style={styles.packageList}
              contentContainerStyle={styles.packageListContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color="#EF4444" />
                  <Text style={styles.loadingText}>Loading packages...</Text>
                </View>
              ) : (
                packages.map((pkg) => {
                  const targetId = pkg.id || pkg._id;
                  const isThisPurchasing = purchasing === targetId;
                  const hasDiscount = pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price);

                  return (
                    <TouchableOpacity
                      key={targetId}
                      style={[styles.packageCard, isThisPurchasing && styles.packageCardActive]}
                      activeOpacity={0.75}
                      onPress={() => handlePurchase(targetId)}
                      disabled={purchasing !== null}
                    >
                      <View style={styles.packageLeft}>
                        <View style={styles.coinsRow}>
                          <Image
                            source={{
                              uri: pkg.iconUrl
                                ? (pkg.iconUrl.includes('/coin_packages/v3/') ? pkg.iconUrl : pkg.iconUrl.replace('/coin_packages/', '/coin_packages/v3/'))
                                : `https://d3arutsevouzgm.cloudfront.net/coin_packages/v3/pack_${pkg.coins}.png`
                            }}
                            style={{ width: 24, height: 24, marginRight: 6 }}
                            resizeMode="contain"
                          />
                          <Text style={styles.packageCoins}>{pkg.coins}</Text>
                          <Text style={styles.packageCoinsLabel}>coins</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                          {pkg.tag ? (
                            <View style={styles.tagBadge}>
                              <Text style={styles.tagText}>{pkg.tag}</Text>
                            </View>
                          ) : null}
                          {pkg.subTag ? (
                            <View style={[styles.tagBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                              <Text style={[styles.tagText, { color: '#10B981' }]}>{pkg.subTag}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.packageRight}>
                        {hasDiscount ? (
                          <Text style={styles.originalPrice}>₹{pkg.originalPrice}</Text>
                        ) : null}
                        {isThisPurchasing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <View style={styles.priceBtn}>
                            <Text style={styles.priceText}>₹{pkg.price}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // This popup renders inline (not a native Modal), so it must layer above
    // every call-screen element — including the call control dock.
    zIndex: 1000,
    elevation: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '75%',
  },
  popup: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: s(20),
    paddingTop: vs(8),
    paddingBottom: vs(28),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },

  header: {
    alignItems: 'center',
    paddingBottom: vs(8),
  },
  handleBar: {
    width: s(40),
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: vs(4),
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 14,
    paddingHorizontal: s(14),
    paddingVertical: vs(10),
    gap: s(10),
    marginBottom: vs(12),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  warningText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: ms(13, 0.3),
    fontFamily: 'Inter_600SemiBold',
    lineHeight: ms(18),
  },

  title: {
    fontSize: ms(20, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: vs(4),
  },
  subtitle: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: vs(16),
  },

  successContainer: {
    alignItems: 'center',
    paddingVertical: vs(30),
  },
  successText: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#22C55E',
    fontFamily: 'Inter_900Black',
    marginTop: vs(12),
  },
  successSubtext: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: vs(4),
  },

  packageList: {
    maxHeight: vs(280),
  },
  packageListContent: {
    gap: vs(10),
    paddingBottom: vs(8),
  },

  loadingWrap: {
    alignItems: 'center',
    paddingVertical: vs(24),
    gap: vs(8),
  },
  loadingText: {
    color: '#6B7280',
    fontSize: ms(13, 0.3),
    fontFamily: 'Inter_400Regular',
  },

  packageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 18,
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  packageCardActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },

  packageLeft: {
    flex: 1,
    gap: vs(4),
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  packageCoins: {
    fontSize: ms(18, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  packageCoinsLabel: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: 8,
  },
  tagText: {
    fontSize: ms(10, 0.3),
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
  },

  packageRight: {
    alignItems: 'flex-end',
    gap: vs(2),
  },
  originalPrice: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    textDecorationLine: 'line-through',
    fontFamily: 'Inter_400Regular',
  },
  priceBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
    borderRadius: 14,
  },
  priceText: {
    color: '#fff',
    fontSize: ms(15, 0.3),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
