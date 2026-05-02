import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT, SCREEN_WIDTH, isSmallPhone } from '../../utils/responsive';
import { authAPI } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_PHONE = '1234567890';
const ADMIN_OTP = '0000';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [userName, setUserName] = useState('');
  const [countdown, setCountdown] = useState(60);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-login check
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const userStr = await AsyncStorage.getItem('user');
      const isAdmin = await AsyncStorage.getItem('isAdmin');

      if (isAdmin === 'true') {
        router.replace('/(admin)');
        return;
      }

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          const role = user.role || 'USER';
          if (role === 'ADMIN') {
            router.replace('/(admin)');
          } else if (role === 'LISTENER') {
            router.replace('/(listener)');
          } else {
            router.replace('/(tabs)');
          }
        } catch (e) {
          console.error('Auto-auth error:', e);
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    let interval;
    if (showOtpStep && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpStep, countdown]);

  // Validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.trim().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    const isAdmin = phone.trim() === ADMIN_PHONE;
    const requiredOtpLength = isAdmin ? 4 : 6;

    if (showOtpStep && !otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (showOtpStep && otp.trim().length !== requiredOtpLength) {
      newErrors.otp = `OTP must be ${requiredOtpLength} digits`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  
  const handleSendOtp = async () => {
    if (!validateForm()) return;

    
    if (phone.trim() === ADMIN_PHONE) {
      setShowOtpStep(true);
      setCountdown(60);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await authAPI.loginSendOtp(phone.trim());
      setShowOtpStep(true);
      setCountdown(60);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (error) {
      setErrors({ general: error.message || 'Failed to send OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleLogin = async () => {
    if (!validateForm()) return;

    
    if (phone.trim() === ADMIN_PHONE && otp.trim() === ADMIN_OTP) {
      await AsyncStorage.setItem('isAdmin', 'true');
      router.replace('/(admin)');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await authAPI.login({ phone: phone.trim(), otp: otp.trim() });
      
      
      await AsyncStorage.setItem('userToken', result.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(result.data.user));
      
      setUserName(result.data.user.name);
      setShowWelcomePopup(true);
    } catch (error) {
      if (error.status === 404) {
        setErrors({ general: 'User not found. Please sign up.' });
      } else if (error.status === 400) {
        setErrors({ general: 'Invalid or expired OTP' });
      } else if (error.errors) {
        const backendErrors = {};
        error.errors.forEach((err) => {
          backendErrors[err.path || 'general'] = err.msg;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: error.message || 'Something went wrong. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {}
      <Modal visible={showSuccessPopup} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="checkmark" size={32} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>OTP Sent!</Text>
            <Text style={styles.modalText}>Please check your messages for the 6-digit code.</Text>
          </Animated.View>
        </View>
      </Modal>

      {}
      <Modal visible={showWelcomePopup} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Text style={{fontSize: 32}}>👋</Text>
            </View>
            <Text style={styles.modalTitle}>Welcome Back!</Text>
            <Text style={styles.modalText}>Hey {userName}, great to see you again!</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={async () => {
                setShowWelcomePopup(false);
                
                
                const userStr = await AsyncStorage.getItem('user');
                let role = 'USER';
                if (userStr) {
                  try {
                    const user = JSON.parse(userStr);
                    if (user.role) role = user.role;
                  } catch(e) {}
                }
                
                if (role === 'ADMIN') {
                  router.replace('/(admin)');
                } else if (role === 'LISTENER') {
                  router.replace('/(listener)');
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={{ width: '100%', marginTop: vs(20) }}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.modalButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
      
      {}
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {}
          <View style={styles.topSection}>
            <Image 
              source={require('../../images/people on map.png')} 
              style={styles.mapImage}
              resizeMode="cover"
            />
            
            {}
            <View style={[styles.floatingAvatar, { top: '15%', left: '15%' }]}>
              <Image source={require('../../images/user_shruti.png')} style={styles.avatarImage} />
              <View style={styles.onlineDot} />
            </View>
            <View style={[styles.floatingAvatar, { top: '35%', left: '40%' }]}>
              <Image source={require('../../images/user_riya.png')} style={styles.avatarImage} />
              <View style={styles.onlineDot} />
            </View>
            <View style={[styles.floatingAvatar, { top: '15%', left: '80%' }]}>
              <Image source={require('../../images/user_priyanka.png')} style={styles.avatarImage} />
              <View style={styles.onlineDot} />
            </View>
            <View style={[styles.floatingAvatar, { top: '45%', left: '5%' }]}>
              <Image source={require('../../images/user_ananya.png')} style={styles.avatarImage} />
              <View style={styles.onlineDot} />
            </View>
            <View style={[styles.floatingAvatar, { top: '50%', left: '65%' }]}>
              <Image source={require('../../images/user_priya.png')} style={styles.avatarImage} />
              <View style={styles.onlineDot} />
            </View>
            <View style={[styles.floatingAvatar, { top: '75%', left: '30%' }]}>
              <Image source={require('../../images/user_neha.png')} style={styles.avatarImage} />
              <View style={styles.onlineDot} />
            </View>
          </View>

          {}
          <View style={styles.bottomCard}>
            <Animated.View 
              style={[
                styles.cardContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.tabRow}>
                <View style={styles.activeTab}>
                  <Text style={styles.activeTabText}>Login</Text>
                </View>
                <Text style={styles.tabSeparator}> / </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/gender')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.inactiveTabText}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.header}>Welcome Back!</Text>
              <Text style={styles.description}>
                Enter your phone number to receive a verification code.
              </Text>

              {}
              {errors.general && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              )}

              {}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                  <Ionicons name="call-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="9876543210"
                    placeholderTextColor="#4b5563"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(text) => { setPhone(text); clearFieldError('phone'); }}
                    editable={!isLoading && !showOtpStep}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              {}
              {showOtpStep && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code (OTP)</Text>
                  <View style={[styles.inputWrapper, errors.otp && styles.inputError]}>
                    <Ionicons name="keypad-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder={phone.trim() === ADMIN_PHONE ? "0000" : "123456"}
                      placeholderTextColor="#4b5563"
                      keyboardType="number-pad"
                      maxLength={phone.trim() === ADMIN_PHONE ? 4 : 6}
                      value={otp}
                      onChangeText={(text) => { setOtp(text); clearFieldError('otp'); }}
                      editable={!isLoading}
                    />
                  </View>
                  {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 }}>
                    <TouchableOpacity 
                      onPress={countdown === 0 ? handleSendOtp : null} 
                      disabled={countdown > 0 || isLoading}
                    >
                      <Text style={{ color: countdown > 0 ? '#6B7280' : '#3B82F6', fontSize: ms(12) }}>
                        {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { setShowOtpStep(false); setOtp(''); setCountdown(60); }} 
                    >
                      <Text style={{ color: '#3B82F6', fontSize: ms(12) }}>Change phone number</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.loginButtonContainer, isLoading && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={showOtpStep ? handleLogin : handleSendOtp}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#3B82F6', '#EC4899', '#F59E0B']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.loginButton}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      {showOtpStep ? 'Verify & Login' : 'Send Verification Code'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/gender')}>
                  <Text style={styles.signupLink}>Create New Account</Text>
                </TouchableOpacity>
              </View>


              {}
              <View style={styles.footer}>
                <Text style={styles.footerText}>By clicking, I Accept the </Text>
                <TouchableOpacity activeOpacity={0.7}><Text style={styles.footerLink}>Terms & Conditions</Text></TouchableOpacity>
                <Text style={styles.footerText}> & </Text>
                <TouchableOpacity activeOpacity={0.7}><Text style={styles.footerLink}>Privacy Policy</Text></TouchableOpacity>
              </View>

              {}
              <View style={{ height: insets.bottom + 40 }} />
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    height: isSmallPhone ? SCREEN_HEIGHT * 0.2 : SCREEN_HEIGHT * 0.28,
    width: '100%',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  floatingAvatar: {
    position: 'absolute',
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: s(25),
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#84CC16',
    borderWidth: 2,
    borderColor: '#000',
  },
  bottomCard: {
    flex: 1,
    backgroundColor: '#000',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    marginTop: -vs(80), 
    zIndex: 10,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: s(28),
    paddingTop: vs(30),
    paddingBottom: vs(20),
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  activeTab: {
    
  },
  activeTabText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: '#D8B4FE',
    fontFamily: 'Inter_500Medium',
  },
  tabSeparator: {
    fontSize: ms(13),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  inactiveTabText: {
    fontSize: ms(13),
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
  header: {
    fontSize: ms(32, 0.3),
    fontWeight: '900',
    color: '#fff',
    marginBottom: vs(8),
    fontFamily: 'Inter_900Black',
    lineHeight: ms(38),
  },
  description: {
    fontSize: ms(13),
    color: '#9CA3AF',
    lineHeight: ms(18),
    marginBottom: vs(15),
    fontFamily: 'Inter_400Regular',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: vs(15),
    gap: 8,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: ms(13),
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  inputGroup: {
    marginBottom: vs(15),
  },
  inputLabel: {
    fontSize: ms(14),
    color: '#fff',
    fontWeight: '700',
    marginBottom: vs(8),
    marginLeft: 4,
    fontFamily: 'Inter_700Bold',
  },
  inputWrapper: {
    backgroundColor: '#000',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#1F2937',
    minHeight: vs(52),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    color: '#fff',
    fontSize: ms(16),
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: ms(11),
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
    marginLeft: 20,
  },
  loginButtonContainer: {
    width: '100%',
    height: Math.max(vs(56), 48),
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: vs(10),
  },
  loginButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: vs(24),
    marginBottom: vs(30),
  },
  signupText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_400Regular',
  },
  signupLink: {
    color: '#3B82F6',
    fontSize: ms(14),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: vs(15),
    gap: s(15),
  },
  socialIcon: {
    width: s(60),
    height: s(60),
    borderRadius: 18,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  socialImg: {
    width: 24,
    height: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: ms(10),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  footerLink: {
    fontSize: ms(10),
    color: '#3B82F6',
    fontFamily: 'Inter_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(20),
  },
  modalContent: {
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: s(24),
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  modalIconContainer: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  modalTitle: {
    fontSize: ms(20),
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  modalText: {
    fontSize: ms(14),
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(20),
  },
  modalButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: vs(14),
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
  },
  modalButtonText: {
    color: '#fff',
    fontSize: ms(15),
    fontFamily: 'Inter_700Bold',
  },
});
