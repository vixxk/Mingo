import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH, SCREEN_HEIGHT } from '../../utils/responsive';

export default function DiamondToTalksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.65, 1]}
        style={styles.bgGradient}
      />

      {}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + vs(8) }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + vs(60) }]}
        showsVerticalScrollIndicator={false}
      >
        {}
        <Text style={styles.heading}>Diamond to Talks</Text>
        <Text style={styles.subtitle}>
          You coins converts to diamonds when you{'\n'}start a call.
        </Text>

        {}
        <View style={styles.illustrationWrap}>
          <Image
            source={require('../../images/phone.png')}
            style={styles.phoneImage}
            resizeMode="contain"
          />
        </View>

        {}
        <View style={styles.ratesContainer}>
          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>1</Text>
            <Image
              source={require('../../images/coin for balance.png')}
              style={styles.rateCoin}
            />
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>1 Minute Voice Call</Text>
            <Ionicons name="call" size={16} color="#fff" />
          </View>

          <View style={styles.rateRow}>
            <Text style={styles.rateNumber}>6</Text>
            <Image
              source={require('../../images/coin for balance.png')}
              style={styles.rateCoin}
            />
            <Text style={styles.rateEquals}>=</Text>
            <Text style={styles.rateText}>1 Minute Video Call</Text>
            <Ionicons name="videocam" size={16} color="#fff" />
          </View>
        </View>

        {}
        <TouchableOpacity
          style={styles.listenerBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/listener')}
        >
          <Text style={styles.listenerBtnText}>Become a Listener</Text>
        </TouchableOpacity>

        {}
        <Text style={styles.supportText}>
          For any queries please contact{' '}
          <Text style={styles.supportEmail}>customer@support.com</Text>
        </Text>

        <View style={{ height: vs(30) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
  },

  
  backBtn: {
    position: 'absolute',
    left: s(16),
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },

  
  content: {
    paddingHorizontal: s(24),
    alignItems: 'center',
  },
  heading: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: vs(12),
  },
  subtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(21),
    marginBottom: vs(24),
  },

  
  illustrationWrap: {
    width: SCREEN_WIDTH * 0.7,
    height: vs(260),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },
  phoneImage: {
    width: '100%',
    height: '100%',
  },

  
  ratesContainer: {
    width: '100%',
    gap: vs(12),
    marginBottom: vs(32),
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
  },
  rateNumber: {
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#F59E0B',
    fontFamily: 'Inter_900Black',
  },
  rateCoin: {
    width: s(22),
    height: s(22),
  },
  rateEquals: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },
  rateText: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },

  
  listenerBtn: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: s(44),
    paddingVertical: vs(15),
    marginBottom: vs(16),
  },
  listenerBtnText: {
    fontSize: ms(16, 0.3),
    color: '#000',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },

  
  supportText: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  supportEmail: {
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});
