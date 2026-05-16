import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, hp, wp } from '../../utils/responsive';
import { giftsAPI, walletAPI } from '../../utils/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GiftPopup = ({ visible, onClose, receiverId, onGiftSent }) => {
  const [gifts, setGifts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [selectedGift, setSelectedGift] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadData();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [giftsRes, balanceRes] = await Promise.all([
        giftsAPI.getAll(),
        walletAPI.getBalance()
      ]);
      setGifts(giftsRes.data);
      setBalance(balanceRes.data.coins);
      if (giftsRes.data.length > 0) setSelectedGift(giftsRes.data[0]);
    } catch (error) {
      console.error('Error loading gifts/balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedGift || sending) return;
    
    const totalCost = selectedGift.price * multiplier;
    if (balance < totalCost) {
      alert('Insufficient coins. Please recharge.');
      return;
    }

    try {
      setSending(true);
      const res = await giftsAPI.send({
        receiverId,
        giftId: selectedGift._id,
        count: multiplier
      });
      
      if (res.success) {
        setBalance(res.remainingCoins);
        if (onGiftSent) onGiftSent(res.gift);
        onClose();
      }
    } catch (error) {
      alert(error.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  const renderGiftItem = ({ item }) => {
    const isSelected = selectedGift?._id === item._id;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedGift(item)}
        style={[styles.giftCard, isSelected && styles.selectedGiftCard]}
      >
        <Text style={styles.giftIcon}>{item.icon}</Text>
        <View style={styles.priceContainer}>
          <View style={styles.coinIconSmall}>
            <Text style={{fontSize: 10}}>🪙</Text>
          </View>
          <Text style={styles.giftPrice}>{item.price}</Text>
          {item.originalPrice && (
            <Text style={styles.originalPrice}>{item.originalPrice}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View 
          style={[
            styles.sheet, 
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Send Gifts</Text>
            <View style={styles.balanceContainer}>
              <Text style={{fontSize: 14}}>🪙</Text>
              <Text style={styles.balanceText}>{balance}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator color="#A855F7" size="large" />
            </View>
          ) : (
            <>
              <FlatList
                data={gifts}
                renderItem={renderGiftItem}
                keyExtractor={(item) => item._id}
                numColumns={3}
                contentContainerStyle={styles.giftList}
                showsVerticalScrollIndicator={false}
              />

              <View style={styles.footer}>
                <TouchableOpacity 
                  style={styles.multiplierPicker}
                  onPress={() => {
                    const next = multiplier === 1 ? 2 : multiplier === 2 ? 5 : multiplier === 5 ? 10 : 1;
                    setMultiplier(next);
                  }}
                >
                  <Text style={styles.multiplierText}>{multiplier}X</Text>
                  <Ionicons name="chevron-down" size={14} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={handleSend}
                  disabled={sending || !selectedGift}
                  style={styles.sendBtnContainer}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#EC4899', '#F59E0B']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.sendBtn}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={20} color="#fff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: vs(20),
    paddingHorizontal: wp(6),
    height: hp(65),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  title: {
    fontSize: ms(20),
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  balanceText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
  },
  giftList: {
    paddingBottom: vs(20),
  },
  giftCard: {
    flex: 1,
    aspectRatio: 0.9,
    margin: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedGiftCard: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  giftIcon: {
    fontSize: ms(40),
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinIconSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftPrice: {
    color: '#fff',
    fontSize: ms(12),
    fontFamily: 'Inter_700Bold',
  },
  originalPrice: {
    color: '#6B7280',
    fontSize: ms(10),
    textDecorationLine: 'line-through',
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vs(15),
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
  },
  multiplierPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    gap: 8,
  },
  multiplierText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
  sendBtnContainer: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    overflow: 'hidden',
  },
  sendBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GiftPopup;
