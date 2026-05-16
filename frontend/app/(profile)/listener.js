import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  BackHandler,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH, SCREEN_HEIGHT, hp, wp } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingCoin from '../../components/shared/FloatingCoin';
import { userAPI } from '../../utils/api';


const COIN_POSITIONS = [
  { top: SCREEN_HEIGHT * 0.08, left: s(90), size: s(38) },
  { top: SCREEN_HEIGHT * 0.06, right: s(60), size: s(34) },
  { top: SCREEN_HEIGHT * 0.16, left: s(150), size: s(40) },
  { top: SCREEN_HEIGHT * 0.19, left: s(10), size: s(36) },
  { top: SCREEN_HEIGHT * 0.18, right: s(30), size: s(34) },
];
 
const SuccessModal = ({ visible, onClose }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#1F2937', '#0F172A']}
          style={styles.successModalContent}
        >
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={hp(6)} color="#22C55E" />
          </View>
          <Text style={styles.successTitle}>Video Submitted!</Text>
          <Text style={styles.successSub}>
            Your application is now under review. We'll notify you once it's approved!
          </Text>
          <TouchableOpacity style={styles.successBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.successBtnText}>Got it</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

export default function ListenerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [listenerStatus, setListenerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('listenerStatus');
        setListenerStatus(status);
        if (status === 'approved') {
          router.replace('/(listener)');
          return;
        }
      } catch (e) {}
      setLoading(false);
    };
    checkStatus();
  }, []);

  useEffect(() => {
    const backAction = () => {
      router.replace('/(auth)/role-selection');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleApply = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const selectedVideo = result.assets[0];
        
        const fileType = 'video/mp4';
        const extension = 'mp4';
        
        const res = await userAPI.getUploadUrl(fileType, extension);
        const { uploadUrl, fileUrl } = res.data;

        const response = await fetch(selectedVideo.uri);
        const blob = await response.blob();

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': fileType,
          },
        });
        
        if (!uploadRes.ok) {
           throw new Error('Failed to upload video to S3');
        }

        await userAPI.applyAsListener({ introVideoUrl: fileUrl });
        await AsyncStorage.setItem('listenerStatus', 'pending');
        setListenerStatus('pending');
        setShowSuccess(true);
      }
    } catch (e) {
      console.log('Error applying as listener:', e);
      Alert.alert('Error', e?.message || 'Failed to submit application.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><StatusBar style="light" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
 
      <SuccessModal 
        visible={showSuccess} 
        onClose={() => setShowSuccess(false)} 
      />

      {}
      <LinearGradient
        colors={['transparent', '#1A0000', '#3D0000']}
        locations={[0, 0.6, 1]}
        style={styles.bottomGradient}
      />

      {}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + vs(8) }]}
        onPress={() => router.replace('/(auth)/role-selection')}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {}
      {COIN_POSITIONS.map((pos, i) => (
        <FloatingCoin key={i} style={pos} delay={i * 300} />
      ))}

      {}
      <View style={[styles.content, { paddingTop: insets.top + SCREEN_HEIGHT * 0.12 }]}>
        {}
        <Text style={styles.tagline}>Talk. Connect. Earn</Text>
        <Text style={styles.heading}>Earn While You Listen!</Text>

        {}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../images/person_laptop.png')}
            style={styles.illustration}
            resizeMode="contain"
          />

          {}
          <View style={styles.badge1}>
            <Ionicons name="people" size={16} color="#9CA3AF" />
            <View style={styles.badgeTextWrap}>
              <Text style={styles.badgeTitle}>1 Lakhs+ Listeners</Text>
              <Text style={styles.badgeSub}>and Growing</Text>
            </View>
          </View>

          <View style={styles.badge2}>
            <Ionicons name="location" size={16} color="#9CA3AF" />
            <View style={styles.badgeTextWrap}>
              <Text style={styles.badgeTitle}>Work from</Text>
              <Text style={styles.badgeSub}>anywhere</Text>
            </View>
          </View>
        </View>
      </View>

      {}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + vs(20) }]}>
        {listenerStatus === 'pending' ? (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={22} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pendingTitle}>Application Pending</Text>
              <Text style={styles.pendingSubtext}>Your request is being reviewed by admin</Text>
            </View>
          </View>
        ) : listenerStatus === 'rejected' ? (
          <>
            <View style={[styles.pendingBanner, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }]}>
              <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.pendingTitle, { color: '#EF4444' }]}>Application Rejected</Text>
                <Text style={styles.pendingSubtext}>Contact support for details</Text>
              </View>
            </View>
            <View style={{ width: '100%', marginTop: vs(12) }}>
              <TouchableOpacity style={styles.becomeBtn} activeOpacity={0.85} onPress={handleApply}>
                <Text style={styles.becomeBtnText}>Re-apply</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={{ width: '100%' }}>
              <TouchableOpacity style={styles.becomeBtn} activeOpacity={0.85} onPress={handleApply} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.becomeBtnText}>Upload Intro Video & Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
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
    flex: 1,
    alignItems: 'center',
    zIndex: 10,
  },
  tagline: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    marginBottom: vs(6),
    letterSpacing: 1,
  },
  heading: {
    fontSize: ms(28, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: vs(16),
  },

  
  illustrationContainer: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  illustration: {
    width: '80%',
    height: '100%',
  },
  badge1: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.025,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: s(10),
    paddingVertical: vs(8),
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  badge2: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.11,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: s(10),
    paddingVertical: vs(8),
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  badgeTextWrap: {
    marginLeft: 2,
  },
  badgeTitle: {
    fontSize: ms(11, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_700Bold',
  },
  badgeSub: {
    fontSize: ms(10, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },

  
  bottomSection: {
    paddingHorizontal: s(24),
    alignItems: 'center',
    zIndex: 10,
  },
  becomeBtn: {
    backgroundColor: '#F5F5F5',
    borderRadius: 30,
    paddingVertical: vs(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  becomeBtnText: {
    fontSize: ms(17, 0.3),
    color: '#000',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  privacyText: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: vs(12),
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 18,
    paddingVertical: vs(16),
    paddingHorizontal: s(16),
    width: '100%',
  },
  pendingTitle: {
    fontSize: ms(15, 0.3),
    color: '#F59E0B',
    fontFamily: 'Inter_700Bold',
  },
  pendingSubtext: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  successModalContent: {
    width: wp(88),
    borderRadius: wp(8),
    padding: wp(8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  successIconCircle: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  successTitle: {
    fontSize: hp(2.8),
    fontWeight: '900',
    color: '#fff',
    marginBottom: hp(1.5),
    textAlign: 'center',
    fontFamily: 'Inter_900Black',
  },
  successSub: {
    fontSize: hp(1.7),
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: hp(2.4),
    marginBottom: hp(3.5),
    fontFamily: 'Inter_400Regular',
  },
  successBtn: {
    backgroundColor: '#22C55E',
    width: '100%',
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    alignItems: 'center',
  },
  successBtnText: {
    color: '#fff',
    fontSize: hp(2),
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },
});
