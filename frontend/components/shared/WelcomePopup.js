import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';

const GuidelineItem = ({ icon, title, description }) => (
  <View style={styles.guidelineItem}>
    <View style={styles.guidelineIcon}>
      <Ionicons name={icon} size={20} color="#EC4899" />
    </View>
    <View style={styles.guidelineTextWrap}>
      <Text style={styles.guidelineTitle}>{title}</Text>
      <Text style={styles.guidelineDesc}>{description}</Text>
    </View>
  </View>
);

export default function WelcomePopup({ visible, onAgree, onClose }) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.popup}>
          {}
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onClose || onAgree}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={styles.welcomeTitle}>Welcome to Mingo</Text>
          <Text style={styles.welcomeSubtitle}>Let's keep this space safe.</Text>

          <GuidelineItem
            icon="heart-outline"
            title="Be respectful"
            description="Treat others the way you'd like to be treated"
          />
          <GuidelineItem
            icon="alert-circle-outline"
            title="No abuse or harassment"
            description="Share only what feels comfortable & right for you"
          />
          <GuidelineItem
            icon="shield-checkmark-outline"
            title="Help keep our space safe"
            description="Report anything that violates these guidelines"
          />

          <Text style={styles.termsText}>
            By Using Mingo, you're agreeing to adhere to our values as well as our{' '}
            <Text style={styles.termsLink}>Guidelines</Text> and{' '}
            <Text style={styles.termsLink}>Terms</Text>
          </Text>

          <TouchableOpacity activeOpacity={0.8} onPress={onAgree} style={styles.agreeButtonWrap}>
            <LinearGradient
              colors={['#3B82F6', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.agreeButton}
            >
              <Text style={styles.agreeButtonText}>I Agree</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  popup: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: s(24),
    paddingTop: vs(28),
    paddingBottom: vs(24),
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderBottomWidth: 0,
  },
  closeBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(24),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  welcomeTitle: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(4),
  },
  welcomeSubtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginBottom: vs(20),
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: vs(16),
    gap: s(12),
  },
  guidelineIcon: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(236,72,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guidelineTextWrap: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: ms(15, 0.3),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  guidelineDesc: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(17),
  },
  termsText: {
    fontSize: ms(11, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(16),
    marginTop: vs(8),
    marginBottom: vs(18),
  },
  termsLink: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_500Medium',
  },
  agreeButtonWrap: {
    borderRadius: 30,
    overflow: 'hidden',
    height: vs(52),
  },
  agreeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: ms(18, 0.3),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
