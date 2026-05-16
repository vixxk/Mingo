import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hp, wp } from '../../utils/responsive';
import { useState, useEffect } from 'react';

export default function DiamondToTalksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isFemale, setIsFemale] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userGender').then((g) => {
      if (g && g.toLowerCase() === 'female') setIsFemale(true);
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.65, 1]}
        style={styles.bgGradient}
      />

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + hp(1) }]}
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
        <Text style={styles.heading}>Diamond to Talks</Text>
        <Text style={styles.subtitle}>
          Your coins convert to diamonds when you{'\n'}start a call or chat.
        </Text>

        <View style={styles.illustrationWrap}>
          <Image source={require('../../images/phone.png')} style={styles.phoneImage} resizeMode="contain" />
        </View>

        {/* Exchange rate */}
        <View style={styles.exchangeCard}>
          <Text style={styles.exchangeNum}>10</Text>
          <Text style={styles.exchangeEmoji}>🪙</Text>
          <Text style={styles.exchangeEquals}>=</Text>
          <Text style={styles.exchangeNum}>1</Text>
          <Text style={styles.exchangeEmoji}>💎</Text>
        </View>

        {/* Rates */}
        <View style={styles.ratesContainer}>
          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>1</Text>
            <Text style={styles.rateEmoji}>💎</Text>
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>5 Min Chat</Text>
            <Ionicons name="chatbubble" size={wp(4)} color="#fff" />
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>1</Text>
            <Text style={styles.rateEmoji}>💎</Text>
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>1 Min Voice Call</Text>
            <Ionicons name="call" size={wp(4)} color="#fff" />
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>3</Text>
            <Text style={styles.rateEmoji}>💎</Text>
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>1 Min Video Call</Text>
            <Ionicons name="videocam" size={wp(4)} color="#fff" />
          </View>
        </View>

        {isFemale && (
          <TouchableOpacity style={styles.listenerBtn} activeOpacity={0.85} onPress={() => router.push('/listener')}>
            <Text style={styles.listenerBtnText}>Become a Listener</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.supportText}>
          For any queries please contact{' '}
          <Text style={styles.supportEmail}>customer@support.com</Text>
        </Text>
        <View style={{ height: hp(4) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: hp(40) },

  backBtn: {
    position: 'absolute', left: wp(4), zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: wp(1),
  },
  backText: { fontSize: wp(4), color: '#fff', fontWeight: '500' },

  content: { paddingHorizontal: wp(6), alignItems: 'center' },
  heading: { fontSize: wp(7), fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: hp(1.5) },
  subtitle: { fontSize: wp(3.5), color: '#9CA3AF', textAlign: 'center', lineHeight: wp(5.5), marginBottom: hp(3) },

  illustrationWrap: { width: wp(70), height: hp(32), alignItems: 'center', justifyContent: 'center', marginBottom: hp(3) },
  phoneImage: { width: '100%', height: '100%' },

  exchangeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: wp(6),
    paddingVertical: hp(1.5), paddingHorizontal: wp(8), gap: wp(2), marginBottom: hp(3),
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  exchangeNum: { fontSize: wp(5), fontWeight: '800', color: '#fff' },
  exchangeEmoji: { fontSize: wp(5) },
  exchangeEquals: { fontSize: wp(4), color: '#9CA3AF', fontWeight: '600' },

  ratesContainer: { width: '100%', gap: hp(1.5), marginBottom: hp(4) },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(1.5) },
  rateNumber: { fontSize: wp(4.5), fontWeight: '800', color: '#F59E0B' },
  rateEmoji: { fontSize: wp(4.5) },
  rateEquals: { fontSize: wp(4), color: '#fff', fontWeight: '500' },
  rateText: { fontSize: wp(3.8), color: '#fff', fontWeight: '500' },

  listenerBtn: {
    backgroundColor: '#fff', borderRadius: wp(7.5),
    paddingHorizontal: wp(11), paddingVertical: hp(1.8), marginBottom: hp(2),
  },
  listenerBtnText: { fontSize: wp(4), color: '#000', fontWeight: '700' },

  supportText: { fontSize: wp(3), color: '#6B7280', textAlign: 'center' },
  supportEmail: { color: '#9CA3AF', textDecorationLine: 'underline' },
});
