import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking, Image, BackHandler, Platform } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

export default function WelcomePopup({ visible, onAgree, onClose }) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsChecked(false);
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

  const handleCancel = () => {
    if (onClose) onClose();
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  };

  const handleConfirm = () => {
    if (!isChecked) {
      setIsChecked(true);
    }
    if (onAgree) onAgree();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.popup}>
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

          {/* Main Agree Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleConfirm}
            style={styles.agreeButtonWrap}
          >
            <LinearGradient
              colors={['#4F46E5', '#9333EA', '#F97316']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.agreeButton}
            >
              <Text style={styles.agreeButtonText}>I Agree & Confirm 18+</Text>
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
    paddingBottom: vs(24),
  },
  popup: {
    backgroundColor: '#12121A',
    borderRadius: 28,
    paddingHorizontal: s(24),
    paddingTop: vs(28),
    paddingBottom: vs(24),
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    alignItems: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeContainer: {
    width: s(84),
    height: s(84),
    marginBottom: vs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  welcomeTitle: {
    fontSize: ms(22, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: vs(6),
  },
  welcomeSubtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: vs(16),
  },
  termsText: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(18),
    textAlign: 'center',
    marginBottom: vs(20),
    paddingHorizontal: s(8),
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
    paddingVertical: vs(12),
    width: '100%',
    marginBottom: vs(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkbox: {
    width: s(22),
    height: s(22),
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(12),
  },
  checkboxActive: {
    backgroundColor: '#9333EA',
    borderColor: '#9333EA',
  },
  checkboxLabel: {
    fontSize: ms(13, 0.3),
    color: '#F3F4F6',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  agreeButtonWrap: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    height: vs(52),
    marginBottom: vs(12),
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
    paddingVertical: vs(8),
    paddingHorizontal: s(16),
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_500Medium',
  },
});
