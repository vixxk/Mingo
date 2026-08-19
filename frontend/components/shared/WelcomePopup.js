import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking, Image, BackHandler, Platform, ScrollView } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

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
  const [step, setStep] = useState(1); // 1 = 18+ Age confirmation, 2 = Welcome to Mingo guidelines
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setIsChecked(false);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (Platform.OS === 'android') {
          BackHandler.exitApp();
        }
        return true;
      });
      return () => backHandler.remove();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleCancel = () => {
    if (onClose) onClose();
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  };

  const handleConfirmStep1 = () => {
    if (!isChecked) return;
    setStep(2);
  };

  const handleConfirmStep2 = () => {
    if (onAgree) onAgree();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.popup}>
          {step === 1 ? (
            /* STEP 1: 18+ Adult Age Confirmation */
            <>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContentCenter}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Badge Image */}
                <View style={styles.badgeContainer}>
                  <Image
                    source={require('../../assets/age-18-badge.png')}
                    style={styles.badgeImage}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.welcomeTitle}>Adult Age Confirmation</Text>
                <Text style={styles.welcomeSubtitle}>This platform is strictly for adults (18+).</Text>

                <Text style={styles.termsText}>
                  By continuing, you confirm that you are 18 years or older and agree to our{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.talkmingo.com/terms')}>
                    Terms & Conditions
                  </Text>{' '}
                  and{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.talkmingo.com/community-guidelines')}>
                    Community Guidelines
                  </Text>.
                </Text>

                {/* Checkbox Row */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsChecked(!isChecked)}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                    {isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>I confirm that I am 18 years or older.</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Pinned Action Buttons */}
              <View style={styles.bottomActionContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleConfirmStep1}
                  disabled={!isChecked}
                  style={[styles.agreeButtonWrap, !isChecked && { opacity: 0.5 }]}
                >
                  <LinearGradient
                    colors={isChecked ? ['#4F46E5', '#9333EA', '#F97316'] : ['#4B5563', '#374151', '#1F2937']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.agreeButton}
                  >
                    <Text style={[styles.agreeButtonText, !isChecked && { color: 'rgba(255,255,255,0.5)' }]}>
                      I Agree & Confirm 18+
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Cancel Text Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCancel}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* STEP 2: Welcome to Mingo Guidelines */
            <>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContentLeft}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Text style={styles.welcomeTitleStep2}>Welcome to Mingo</Text>
                <Text style={styles.welcomeSubtitleStep2}>Let's keep this space safe.</Text>

                <View style={styles.guidelinesContainer}>
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
                </View>

                <Text style={styles.termsTextStep2}>
                  By Using Mingo, you're agreeing to adhere to our values as well as our{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.talkmingo.com/terms')}>
                    Terms & Conditions
                  </Text>,{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.talkmingo.com/privacy-policy')}>
                    Privacy Policy
                  </Text>{' '}
                  and{' '}
                  <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.talkmingo.com/community-guidelines')}>
                    Community Guidelines
                  </Text>
                </Text>
              </ScrollView>

              {/* Pinned Action Button */}
              <View style={styles.bottomActionContainer}>
                <TouchableOpacity activeOpacity={0.8} onPress={handleConfirmStep2} style={styles.agreeButtonWrap}>
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
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 99999,
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100000,
    paddingHorizontal: s(16),
    paddingBottom: vs(16),
  },
  popup: {
    backgroundColor: '#12121A',
    borderRadius: 28,
    paddingHorizontal: s(20),
    paddingTop: vs(20),
    paddingBottom: vs(16),
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    maxHeight: SCREEN_HEIGHT * 0.85,
    width: '100%',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollArea: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContentCenter: {
    alignItems: 'center',
  },
  scrollContentLeft: {
    alignItems: 'flex-start',
  },
  bottomActionContainer: {
    width: '100%',
    marginTop: vs(10),
    alignItems: 'center',
  },
  badgeContainer: {
    width: s(72),
    height: s(72),
    marginBottom: vs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  welcomeTitle: {
    fontSize: ms(20, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: vs(4),
  },
  welcomeSubtitle: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: vs(12),
  },
  welcomeTitleStep2: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: vs(4),
  },
  welcomeSubtitleStep2: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: vs(12),
  },
  guidelinesContainer: {
    width: '100%',
    marginBottom: vs(4),
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: vs(10),
    gap: s(12),
  },
  guidelineIcon: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    backgroundColor: 'rgba(236,72,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guidelineTextWrap: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: ms(14, 0.3),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  guidelineDesc: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(16),
  },
  termsText: {
    fontSize: ms(11, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(16),
    textAlign: 'center',
    marginBottom: vs(12),
    paddingHorizontal: s(4),
  },
  termsTextStep2: {
    fontSize: ms(11, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(16),
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: vs(10),
  },
  termsLink: {
    color: '#C084FC',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_500Medium',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: s(14),
    paddingVertical: vs(10),
    width: '100%',
    marginBottom: vs(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkbox: {
    width: s(20),
    height: s(20),
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(10),
  },
  checkboxActive: {
    backgroundColor: '#9333EA',
    borderColor: '#9333EA',
  },
  checkboxLabel: {
    fontSize: ms(12, 0.3),
    color: '#F3F4F6',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  agreeButtonWrap: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    height: vs(48),
  },
  agreeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: ms(16, 0.3),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  cancelButton: {
    paddingVertical: vs(6),
    paddingHorizontal: s(16),
    marginTop: vs(4),
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: ms(13, 0.3),
    fontFamily: 'Inter_500Medium',
  },
});
