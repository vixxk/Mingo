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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, SCREEN_HEIGHT, SCREEN_WIDTH, isSmallPhone } from '../../utils/responsive';
import { authAPI } from '../../utils/api';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
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
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      newErrors.username = 'Only letters, numbers, and underscores';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.trim().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (showOtpStep && !otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (showOtpStep && otp.trim().length !== 6) {
      newErrors.otp = 'OTP must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  
  const handleSendOtp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await authAPI.sendOtp(phone.trim());
      setShowOtpStep(true);
      setCountdown(60);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (error) {
      if (error.status === 409) {
        setErrors({ general: 'Email, username, or phone already exists' });
      } else {
        setErrors({ general: error.message || 'Failed to send OTP. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await authAPI.signup({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        otp: otp.trim(),
      });
      
      
      await AsyncStorage.setItem('userToken', result.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(result.data.user));
      
      setUserName(result.data.user.name);
      setShowWelcomePopup(true);
    } catch (error) {
      if (error.status === 409) {
        setErrors({ general: 'Email, username, or phone already exists' });
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
              <Text style={{fontSize: 32}}>🎉</Text>
            </View>
            <Text style={styles.modalTitle}>Account Created!</Text>
            <Text style={styles.modalText}>Welcome to Mingo, {userName}!</Text>
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
                <Text style={styles.modalButtonText}>Let's Go</Text>
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
              {}
              <View style={styles.tabRow}>
                <TouchableOpacity 
                  onPress={() => router.replace('/login')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.inactiveTabText}>Login</Text>
                </TouchableOpacity>
                <Text style={styles.tabSeparator}> / </Text>
                <View style={styles.activeTab}>
                  <Text style={styles.activeTabText}>Sign Up</Text>
                </View>
              </View>

              <Text style={styles.header}>Create Account</Text>
              <Text style={styles.description}>
                Join Mingo and connect with listeners anytime, anywhere.
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
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                  <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor="#4b5563"
                    autoCapitalize="words"
                    value={name}
                    onChangeText={(text) => { setName(text); clearFieldError('name'); }}
                    editable={!isLoading}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
                  <Ionicons name="at-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="johndoe_123"
                    placeholderTextColor="#4b5563"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={(text) => { setUsername(text); clearFieldError('username'); }}
                    editable={!isLoading}
                  />
                </View>
                {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
              </View>

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
                      placeholder="123456"
                      placeholderTextColor="#4b5563"
                      keyboardType="number-pad"
                      maxLength={6}
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


              {}
              <TouchableOpacity 
                style={[styles.signupButtonContainer, isLoading && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={showOtpStep ? handleSignup : handleSendOtp}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#3B82F6', '#EC4899', '#F59E0B']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.signupButton}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.signupButtonText}>
                      {showOtpStep ? 'Verify & Create Account' : 'Send Verification Code'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                  <Text style={styles.loginLink}>Login</Text>
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
              <View style={{ height: insets.bottom + 60 }} />
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
    height: isSmallPhone ? SCREEN_HEIGHT * 0.15 : SCREEN_HEIGHT * 0.22,
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
    marginTop: -vs(60), 
    zIndex: 10,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: s(28),
    paddingTop: vs(28),
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
    marginBottom: vs(10),
  },
  activeTab: {},
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
    marginBottom: vs(6),
    fontFamily: 'Inter_900Black',
    lineHeight: ms(38),
  },
  description: {
    fontSize: ms(13),
    color: '#9CA3AF',
    lineHeight: ms(18),
    marginBottom: vs(12),
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
    marginBottom: vs(12),
    gap: 8,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: ms(13),
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  inputGroup: {
    marginBottom: vs(12),
  },
  inputLabel: {
    fontSize: ms(14),
    color: '#fff',
    fontWeight: '700',
    marginBottom: vs(6),
    marginLeft: 4,
    fontFamily: 'Inter_700Bold',
  },
  inputWrapper: {
    backgroundColor: '#000',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#1F2937',
    minHeight: vs(48),
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
    fontSize: ms(15),
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
  roleContainer: {
    flexDirection: 'row',
    gap: s(10),
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1F2937',
    paddingVertical: vs(14),
    paddingHorizontal: s(10),
  },
  roleOptionActive: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  roleText: {
    color: '#6B7280',
    fontSize: ms(12),
    fontFamily: 'Inter_500Medium',
  },
  roleTextActive: {
    color: '#D8B4FE',
  },
  signupButtonContainer: {
    width: '100%',
    height: Math.max(vs(52), 46),
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: vs(6),
  },
  signupButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: vs(20),
    marginBottom: vs(24),
  },
  loginText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_400Regular',
  },
  loginLink: {
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
    paddingBottom: 10,
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
