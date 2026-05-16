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

/**
 * InCallRechargePopup — Bottom sheet that lets users purchase coins
 * directly during an active call WITHOUT navigating away.
 * Shows coin packages, processes purchase inline, and calls onRechargeSuccess.
 */
export default function InCallRechargePopup({ visible, onClose, onRechargeSuccess, lowBalanceMessage }) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null); // packageId being purchased
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
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
      setPurchaseSuccess(false);
    }
  }, [visible]);

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await walletAPI.getPackages();
      setPackages(res.data?.packages || []);
    } catch (e) {
      console.log('Failed to load packages:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePurchase = useCallback(async (packageId) => {
    try {
      setPurchasing(packageId);
      await walletAPI.purchaseCoins(packageId);
      setPurchaseSuccess(true);
      // Notify parent that recharge was successful
      setTimeout(() => {
        if (onRechargeSuccess) onRechargeSuccess();
      }, 1200);
    } catch (e) {
      console.log('Purchase failed:', e);
      setPurchasing(null);
    }
  }, [onRechargeSuccess]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#1A0520', '#0A0A0A', '#111']}
          locations={[0, 0.5, 1]}
          style={styles.popup}
        >
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

          <Text style={styles.title}>
            <Ionicons name="flash" size={20} color="#F59E0B" /> Quick Recharge
          </Text>
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
                  <ActivityIndicator size="small" color="#A855F7" />
                  <Text style={styles.loadingText}>Loading packages...</Text>
                </View>
              ) : (
                packages.slice(0, 4).map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.packageCard, purchasing === pkg.id && styles.packageCardActive]}
                    activeOpacity={0.75}
                    onPress={() => handlePurchase(pkg.id)}
                    disabled={purchasing !== null}
                  >
                    <View style={styles.packageLeft}>
                      <View style={styles.coinsRow}>
                        <Ionicons name="flash" size={16} color="#F59E0B" />
                        <Text style={styles.packageCoins}>{pkg.coins}</Text>
                        <Text style={styles.packageCoinsLabel}>coins</Text>
                      </View>
                      {pkg.tag && (
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagText}>{pkg.tag}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.packageRight}>
                      {purchasing === pkg.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.originalPrice}>₹{pkg.originalPrice}</Text>
                          <View style={styles.priceBtn}>
                            <Text style={styles.priceText}>₹{pkg.price}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: '#2A1540',
    borderBottomWidth: 0,
  },

  header: {
    alignItems: 'center',
    paddingBottom: vs(8),
  },
  handleBar: {
    width: s(40),
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
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
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  packageCardActive: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: 8,
  },
  tagText: {
    fontSize: ms(10, 0.3),
    color: '#A855F7',
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
    backgroundColor: '#A855F7',
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
