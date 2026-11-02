import { 
  View, 
  StyleSheet, 
  Pressable,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vs, s, SCREEN_WIDTH, SCREEN_HEIGHT } from '../../utils/responsive';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Image 
        source={require('../../images/TalkMingo Welcome Screen.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Interactive touch area for "Get Started →" button */}
      <Pressable 
        style={({ pressed }) => [
          styles.getStartedButton,
          {
            bottom: Math.max(vs(66), insets.bottom + vs(48)),
            backgroundColor: pressed ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
          }
        ]} 
        onPress={() => router.push('/onboarding')}
        accessibilityRole="button"
        accessibilityLabel="Get Started"
      />

      {/* Interactive touch area for "Already have an account? Log In" */}
      <Pressable 
        style={({ pressed }) => [
          styles.loginButton,
          {
            bottom: Math.max(vs(20), insets.bottom + vs(10)),
            backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
          }
        ]} 
        onPress={() => router.push('/login')}
        accessibilityRole="button"
        accessibilityLabel="Log In"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#613EF4',
  },
  backgroundImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  getStartedButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: '82%',
    maxWidth: 380,
    height: vs(54),
    borderRadius: 999,
  },
  loginButton: {
    position: 'absolute',
    alignSelf: 'center',
    paddingVertical: vs(8),
    paddingHorizontal: s(24),
    borderRadius: 20,
  },
});
