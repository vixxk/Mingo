import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Animated, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hp, wp } from '../../utils/responsive';
import { useState, useEffect, useRef } from 'react';

export default function DiamondToTalksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isFemale, setIsFemale] = useState(false);

  // Animations
  const waveAnim = useRef(new Animated.Value(0)).current;
  const coinsAnim = useRef(new Animated.Value(0)).current;
  const diamondAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('userGender').then((g) => {
      if (g && g.toLowerCase() === 'female') setIsFemale(true);
    });

    // Loop animations
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(coinsAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(coinsAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(diamondAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(diamondAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-wp(45), wp(85)],
  });

  const coinsTranslateY = coinsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -hp(1.5)],
  });

  const diamondTranslateY = diamondAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -hp(1.8)],
  });

  const diamondScale = diamondAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['transparent', '#120E05', '#241B08']}
        locations={[0, 0.65, 1]}
        style={styles.bgGradient}
      />

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + hp(1.5) }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + hp(8) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Diamonds To Talk</Text>
        <Text style={styles.subtitle}>
          Your coins convert to diamonds when you{'\n'}start a call or chat.
        </Text>

        {/* 3D Phone + Beam Animation Container */}
        <View style={styles.illustrationWrap}>
          {/* Background beam running horizontally */}
          <View style={styles.beamContainer}>
            <LinearGradient
              colors={['#1E1B10', '#D97706', '#1E1B10']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* White wave scanning left to right */}
            <Animated.View
              style={[
                styles.whiteWave,
                {
                  transform: [{ translateX }],
                },
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>

          {/* Floating Gold Coins on the left entering the beam */}
          <Animated.View style={[styles.coinsContainer, { transform: [{ translateY: coinsTranslateY }] }]}>
            <Image 
              source={require('../../images/insufficient balance/twemoji_coin.png')} 
              style={styles.miniCoin} 
              resizeMode="contain" 
            />
            <Image 
              source={require('../../images/insufficient balance/twemoji_coin.png')} 
              style={[styles.miniCoin, { transform: [{ scale: 0.8 }, { translateX: -wp(2) }] }]} 
              resizeMode="contain" 
            />
          </Animated.View>

          {/* 3D Mobile Phone Component in the Center */}
          <View style={styles.phoneComponent}>
            <View style={styles.phoneInnerScreen}>
              <View style={styles.phoneNotch} />
              <Ionicons 
                name="heart" 
                size={wp(8)} 
                color="#FBBF24" 
                style={styles.phoneCenterIcon} 
              />
            </View>

            {/* Answer/Reject call buttons */}
            <View style={styles.phoneButtonsRow}>
              <View style={[styles.phoneCallBtn, { backgroundColor: '#10B981' }]}>
                <Ionicons name="call" size={wp(3.5)} color="#fff" />
              </View>
              <View style={[styles.phoneCallBtn, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="close" size={wp(3.5)} color="#fff" />
              </View>
            </View>
          </View>

          {/* Floating Diamond on the right emerging from the beam */}
          <Animated.View 
            style={[
              styles.diamondContainer, 
              { transform: [{ translateY: diamondTranslateY }, { scale: diamondScale }] }
            ]}
          >
            <Text style={styles.miniDiamond}>💎</Text>
          </Animated.View>
        </View>

        {/* Exchange rate Card */}
        <View style={styles.exchangeCard}>
          <Text style={styles.exchangeText}>10 🪙 = 1 💎</Text>
        </View>

        {/* Rates breakdown with golden colors */}
        <View style={styles.ratesContainer}>
          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>1</Text>
            <Text style={styles.rateEmoji}>💎</Text>
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>5 Min Chat</Text>
            <Ionicons name="chatbubble" size={wp(4.2)} color="#FBBF24" />
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>1</Text>
            <Text style={styles.rateEmoji}>💎</Text>
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>1 Min Voice Call</Text>
            <Ionicons name="call" size={wp(4.2)} color="#FBBF24" />
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>4</Text>
            <Text style={styles.rateEmoji}>💎</Text>
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>1 Min Video Call</Text>
            <Ionicons name="videocam" size={wp(4.2)} color="#FBBF24" />
          </View>
        </View>

        <TouchableOpacity style={styles.listenerBtn} activeOpacity={0.85} onPress={() => router.push('/listener')}>
          <Text style={styles.listenerBtnText}>Become a Listener</Text>
        </TouchableOpacity>

        <Text style={styles.supportText}>
          For any queries please contact{' '}
          <Text style={styles.supportEmail} onPress={() => Linking.openURL('mailto:support@talkmingo.com')}>support@talkmingo.com</Text>
        </Text>

        <View style={styles.linksContainer}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://www.talkmingo.com/terms')}>
            <Text style={styles.policyLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.policyDivider}>|</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://www.talkmingo.com/privacy-policy')}>
            <Text style={styles.policyLink}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.policyDivider}>|</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://www.talkmingo.com/community-guidelines')}>
            <Text style={styles.policyLink}>Guidelines</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: hp(4) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: hp(45) },

  backBtn: {
    position: 'absolute', left: wp(4), zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: wp(1),
  },
  backText: { fontSize: wp(4), color: '#fff', fontWeight: '500' },

  content: { paddingHorizontal: wp(6), alignItems: 'center' },
  heading: { 
    fontSize: wp(7.5), 
    fontWeight: '900', 
    color: '#fff', 
    textAlign: 'center', 
    marginBottom: hp(1.5),
    fontFamily: 'Inter_900Black',
  },
  subtitle: { 
    fontSize: wp(3.8), 
    color: '#9CA3AF', 
    textAlign: 'center', 
    lineHeight: wp(5.5), 
    marginBottom: hp(3),
    fontFamily: 'Inter_500Medium',
  },

  illustrationWrap: { 
    width: wp(90), 
    height: hp(28), 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: hp(4),
    position: 'relative',
  },
  beamContainer: {
    position: 'absolute',
    width: wp(86),
    height: hp(5.5),
    borderRadius: wp(6),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D97706',
    justifyContent: 'center',
  },
  whiteWave: {
    position: 'absolute',
    width: wp(40),
    height: '100%',
  },
  phoneComponent: {
    width: wp(28),
    height: hp(21),
    borderRadius: wp(3),
    borderWidth: 3.5,
    borderColor: '#F59E0B',
    backgroundColor: '#0F0F0B',
    position: 'absolute',
    zIndex: 10,
    transform: [
      { perspective: 1000 },
      { rotateY: '-28deg' },
      { rotateX: '15deg' },
    ],
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.5),
  },
  phoneInnerScreen: {
    width: '100%',
    alignItems: 'center',
    gap: hp(0.5),
  },
  phoneNotch: {
    width: wp(10),
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
  },
  phoneCenterIcon: {
    marginTop: hp(2),
  },
  phoneButtonsRow: {
    flexDirection: 'row',
    gap: wp(3),
    justifyContent: 'center',
    width: '100%',
  },
  phoneCallBtn: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinsContainer: {
    position: 'absolute',
    left: wp(5),
    zIndex: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: -wp(3),
  },
  miniCoin: {
    width: wp(9),
    height: wp(9),
  },
  diamondContainer: {
    position: 'absolute',
    right: wp(8),
    zIndex: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDiamond: {
    fontSize: wp(9),
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },

  exchangeCard: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)', 
    borderRadius: wp(6),
    paddingVertical: hp(1.5), 
    paddingHorizontal: wp(8), 
    gap: wp(2), 
    marginBottom: hp(3),
    borderWidth: 1.5, 
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  exchangeText: { 
    fontSize: wp(5), 
    fontWeight: '800', 
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
  },

  ratesContainer: { 
    width: '100%', 
    gap: hp(2), 
    marginBottom: hp(4),
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: wp(4),
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(4),
  },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(2) },
  rateNumber: { 
    fontSize: wp(4.5), 
    fontWeight: '800', 
    color: '#FBBF24',
    fontFamily: 'Inter_800ExtraBold',
  },
  rateEmoji: { fontSize: wp(4.5) },
  rateEquals: { fontSize: wp(4), color: '#fff', fontWeight: '500' },
  rateText: { 
    fontSize: wp(3.8), 
    color: '#fff', 
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },

  listenerBtn: {
    backgroundColor: '#FBBF24', 
    borderRadius: wp(7.5),
    paddingHorizontal: wp(11), 
    paddingVertical: hp(1.8), 
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#D97706',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  listenerBtnText: { 
    fontSize: wp(4), 
    color: '#000', 
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },

  supportText: { 
    fontSize: wp(3), 
    color: '#6B7280', 
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  supportEmail: { color: '#3B82F6', textDecorationLine: 'underline' },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
    gap: wp(3),
  },
  policyLink: {
    fontSize: wp(3.2),
    color: '#9CA3AF',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_400Regular',
  },
  policyDivider: {
    fontSize: wp(3.2),
    color: '#374151',
  },
});
