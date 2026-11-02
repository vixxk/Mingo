import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, s, vs, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/responsive';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {}
        <View style={styles.topSection}>
          <Image 
            source={require('../../images/iMockup - iPhone 15 Pro Max.png')}
            style={styles.mockupImage}
            resizeMode="contain"
          />
        </View>

        {}
        <View style={[styles.bottomCard, { paddingBottom: Math.max(10, insets.bottom + 10) }]}>
          <Text style={styles.subHeader}>INSTANT CONNECTION</Text>
          
          <View style={styles.headerContainer}>
            <Text style={styles.headerLine1}>Talk To</Text>
            <View style={styles.headerLine2Wrapper}>
              <Text style={styles.headerLine2Part1}>Someone, </Text>
              <Text style={styles.headerLine2Part2}>Anytime  </Text>
            </View>
          </View>
          
          <Text style={styles.description}>
            No waiting. No pressure.{"\n"}Just real conversations when you need them.
          </Text>

          <TouchableOpacity 
            style={styles.primaryButtonContainer} 
            activeOpacity={0.8}
            onPress={() => router.push('/onboarding')}
          >
            <LinearGradient
              colors={['#3B82F6', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Let's Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            activeOpacity={0.8}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.secondaryButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    height: '50%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  mockupImage: {
    width: '100%',
    height: '110%',
    marginBottom: '-22%',
  },
  bottomCard: {
    height: '50%',
    backgroundColor: '#000',
    paddingHorizontal: '6%',
    paddingTop: '5%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    zIndex: 10,
  },
  subHeader: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#D8B4FE',
    letterSpacing: 3,
    marginBottom: vs(10),
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: vs(10),
  },
  headerLine1: {
    fontSize: ms(36, 0.4),
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Inter_900Black',
    lineHeight: ms(42),
  },
  headerLine2Wrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  headerLine2Part1: {
    fontSize: ms(36, 0.4),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    lineHeight: ms(42),
  },
  headerLine2Part2: {
    fontSize: ms(36, 0.4),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Merriweather-Italic',
    fontStyle: 'italic',
    lineHeight: ms(42),
    paddingRight: 5,
  },
  description: {
    fontSize: ms(14),
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: ms(20),
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: '3%',
  },
  primaryButtonContainer: {
    width: '100%',
    marginTop: '2%',
  },
  primaryButton: {
    paddingVertical: '4.5%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: ms(17),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: '4.5%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '1%',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: ms(17),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});

