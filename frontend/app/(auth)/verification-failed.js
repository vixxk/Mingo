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

export default function VerificationFailedScreen() {
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + vs(80) }]}
        showsVerticalScrollIndicator={false}
      >
        {}
        <Text style={styles.heading}>Verification Failed!</Text>
        <Text style={styles.subtitle}>
          Unable to verify as per policy.{'\n'}You can try again after 15 days.
        </Text>

        {}
        <View style={styles.illustrationWrap}>
          {}
          <View style={styles.docCard}>
            <Image
              source={require('../../images/doc.png')}
              style={styles.docImage}
              resizeMode="contain"
            />
          </View>

          {}
          <View style={styles.errorBadge}>
            <Ionicons name="alert-circle" size={28} color="#fff" />
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
    marginBottom: vs(14),
  },
  subtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(21),
    marginBottom: vs(32),
  },

  
  illustrationWrap: {
    position: 'relative',
    marginBottom: vs(40),
    alignItems: 'center',
  },
  docCard: {
    width: SCREEN_WIDTH * 0.6,
    height: vs(180),
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  docImage: {
    width: '70%',
    height: '80%',
  },
  errorBadge: {
    position: 'absolute',
    top: -vs(6),
    right: -s(6),
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
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
