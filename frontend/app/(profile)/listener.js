import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  BackHandler,
  Platform,
  Vibration,
} from 'react-native';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, SCREEN_WIDTH, SCREEN_HEIGHT, hp, wp } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingCoin from '../../components/shared/FloatingCoin';
import { userAPI, authAPI } from '../../utils/api';
import LogoutPopup from '../../components/shared/LogoutPopup';
import ToastNotification from '../../components/shared/ToastNotification';
import ConfirmSwitchRolePopup from '../../components/shared/ConfirmSwitchRolePopup';
import { socketService } from '../../utils/socket';
import { restartApp } from '../../utils/restartApp';

const languageSamples = [
  { language: 'Hindi', text: 'नमस्ते, मिंगो में आपका स्वागत है। मैं आपकी बात धैर्य से सुनने और आपसे सम्मान के साथ बात करने के लिए यहाँ हूँ। आप मुझसे आराम से बात कर सकते हैं।' },
  { language: 'English', text: 'Hello, welcome to Mingo. I am here to listen to you patiently and speak with you respectfully. You can talk to me freely.' },
  { language: 'Telugu', text: 'నమస్తే, మింగోకు స్వాగతం. నేను మీ మాటలను ఓపికగా వినడానికి మరియు మీతో గౌరవంగా మాట్లాడడానికి ఇక్కడ ఉన్నాను. మీరు నాతో స్వేచ్ఛగా మాట్లాడవచ్చు.' },
  { language: 'Malayalam', text: 'നമസ്കാരം, മിംഗോയിലേക്ക് സ്വാഗതം. നിങ്ങളുടെ കാര്യങ്ങൾ ക്ഷമയോടെ കേൾക്കാനും നിങ്ങളോട് ബഹുമാനത്തോടെ സംസാരിക്കാനും ഞാൻ ഇവിടെ ഉണ്ട്. നിങ്ങൾക്ക് എന്നോട് സ്വതന്ത്രമായി സംസാരിക്കാം.' },
  { language: 'Kannada', text: 'ನಮಸ್ಕಾರ, ಮಿಂಗೋಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಮಾತನ್ನು ಸಹನೆಯಿಂದ ಕೇಳಲು ಮತ್ತು ನಿಮ್ಮೊಂದಿಗೆ ಗೌರವದಿಂದ ಮಾತನಾಡಲು ನಾನು ಇಲ್ಲಿ ಇದ್ದೇನೆ. ನೀವು ನನ್ನೊಂದಿಗೆ ಮುಕ್ತವಾಗಿ ಮಾತನಾಡಬಹುದು.' },
  { language: 'Tamil', text: 'வணக்கம், மிங்கோவிற்கு வரவேற்கிறோம். உங்கள் பேச்சை பொறுமையாகக் கேட்கவும், உங்களுடன் மரியாதையுடன் பேசவும் நான் இங்கே இருக்கிறேன். நீங்கள் என்னுடன் சுதந்திரமாகப் பேசலாம்.' },
  { language: 'Marathi', text: 'नमस्कार, मिंगोमध्ये तुमचे स्वागत आहे. तुमचे बोलणे शांतपणे ऐकण्यासाठी आणि तुमच्याशी आदराने बोलण्यासाठी मी येथे आहे. तुम्ही माझ्याशी मोकळेपणाने बोलू शकता.' },
  { language: 'Punjabi', text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮਿੰਗੋ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਮੈਂ ਤੁਹਾਡੀ ਗੱਲ ਧੀਰਜ ਨਾਲ ਸੁਣਨ ਅਤੇ ਤੁਹਾਡੇ ਨਾਲ ਆਦਰ ਨਾਲ ਗੱਲ ਕਰਨ ਲਈ ਇੱਥੇ ਹਾਂ। ਤੁਸੀਂ ਮੇਰੇ ਨਾਲ ਖੁੱਲ੍ਹ ਕੇ ਗੱਲ ਕਰ ਸਕਦੇ ਹੋ।' },
  { language: 'Bengali', text: 'নমস্কার, মিঙ্গোতে আপনাকে স্বাগতম। আমি ধৈর্য ধরে আপনার কথা শুনতে এবং সম্মানের সঙ্গে আপনার সঙ্গে কথা বলতে এখানে আছি। আপনি আমার সঙ্গে স্বচ্ছন্দে কথা বলতে পারেন।' },
  { language: 'Odia', text: 'ନମସ୍କାର, ମିଙ୍ଗୋକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ମୁଁ ଆପଣଙ୍କ କଥା ଧୈର୍ଯ୍ୟର ସହିତ ଶୁଣିବାକୁ ଏବଂ ଆପଣଙ୍କ ସହିତ ସମ୍ମାନର ସହିତ କଥା ହେବାକୁ ଏଠାରେ ଅଛି। ଆପଣ ମୋ ସହିତ ନିର୍ଭୟରେ କଥା ହୋଇପାରିବେ।' },
  { language: 'Assamese', text: 'নমস্কাৰ, মিংগোলৈ আপোনাক স্বাগতম। মই আপোনাৰ কথা ধৈৰ্যৰে শুনিবলৈ আৰু আপোনাৰ সৈতে সন্মানসহকাৰে কথা পাতিবলৈ ইয়াত আছোঁ। আপুনি মোৰ সৈতে স্বাচ্ছন্দ্যে কথা পাতিব পাৰে।' },
  { language: 'Gujarati', text: 'નમસ્તે, મિંગોમાં તમારું સ્વાગત છે. હું તમારી વાત ધીરજથી સાંભળવા અને તમારી સાથે સન્માનપૂર્વક વાત કરવા અહીં છું. તમે મારી સાથે નિર્ભયતાથી વાત કરી શકો છો.' },
];

const BAR_COUNT = 30;

const COIN_POSITIONS = [
  { top: SCREEN_HEIGHT * 0.03, left: s(80), size: s(30) },
  { top: SCREEN_HEIGHT * 0.01, right: s(40), size: s(26) },
  { top: SCREEN_HEIGHT * 0.08, left: s(130), size: s(32) },
  { top: SCREEN_HEIGHT * 0.11, left: s(5), size: s(28) },
  { top: SCREEN_HEIGHT * 0.10, right: s(15), size: s(26) },
];

const SuccessModal = ({ visible, onClose }) => (
  <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
    <View style={styles.modalOverlay}>
      <LinearGradient colors={['#1F2937', '#0F172A']} style={styles.successModalContent}>
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark-circle" size={hp(5)} color="#22C55E" />
        </View>
        <Text style={styles.successTitle}>Application Submitted!</Text>
        <Text style={styles.successSub}>Your application is under review. It takes about 12-24 hours.</Text>
        <TouchableOpacity style={styles.successBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.successBtnText}>Got it</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  </Modal>
);

function MiniWaveform({ isActive, barCount = 25 }) {
  const [bars, setBars] = useState(() => Array.from({ length: barCount }, () => Math.random() * 0.7 + 0.2));

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setBars(Array.from({ length: barCount }, () => Math.random() * 0.8 + 0.1)), 120);
    return () => clearInterval(id);
  }, [isActive, barCount]);

  useEffect(() => {
    if (!isActive) setBars(Array.from({ length: barCount }, () => Math.random() * 0.3 + 0.1));
  }, [isActive, barCount]);

  return (
    <View style={styles.miniWaveform}>
      {bars.map((h, i) => (
        <View key={i} style={{ width: 2, height: `${h * 100}%`, borderRadius: 1, backgroundColor: isActive ? '#EF4444' : '#6B7280', opacity: isActive ? 0.9 : 0.5 }} />
      ))}
    </View>
  );
}

export default function ListenerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [listenerStatus, setListenerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showSwitchRolePopup, setShowSwitchRolePopup] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundInstance, setSoundInstance] = useState(null);
  const [recordingState, setRecordingState] = useState('idle');

  const timerRef = useRef(null);
  const autoStopTimerRef = useRef(null);
  const durationRef = useRef(0);

  const activeSample = languageSamples.find((l) => l.language === selectedLanguage);
  const sentence = activeSample ? activeSample.text : languageSamples[0].text;

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });

  const formatTime = (ms) => {
    const secs = Math.floor(ms / 1000);
    return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('userLanguage');
        if (savedLang) setSelectedLanguage(savedLang);
        else setSelectedLanguage('Hindi');
      } catch (e) { setSelectedLanguage('Hindi'); }
    };
    loadLanguage();
    return () => {
      if (recordingInstance) recordingInstance.stopAndUnloadAsync().catch(() => {});
      if (soundInstance) soundInstance.unloadAsync().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setDropdownOpen(false);
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { showToast('Microphone permission is required.', 'error'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecordingInstance(rec);
      setIsRecording(true);
      setRecordingState('recording');
      durationRef.current = 0;
      setRecordingDuration(0);
      if (Platform.OS !== 'web') Vibration.vibrate(50);
      timerRef.current = setInterval(() => { durationRef.current += 100; setRecordingDuration(durationRef.current); }, 100);
      autoStopTimerRef.current = setTimeout(() => { handleStopRecording(); }, 20000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Check microphone permissions.');
    }
  }, [handleStopRecording]);

  const stopRecording = useCallback(async () => {
    if (!recordingInstance) return;
    try {
      await recordingInstance.stopAndUnloadAsync();
      setRecordingUri(recordingInstance.getURI());
      setIsRecording(false);
      setRecordingInstance(null);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
      if (Platform.OS !== 'web') Vibration.vibrate(30);
    } catch (err) {}
  }, [recordingInstance]);

  const handleStopRecording = useCallback(() => {
    stopRecording().then(() => setRecordingState('review'));
  }, [stopRecording]);

  const playRecording = useCallback(async () => {
    if (!recordingUri) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (soundInstance) await soundInstance.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri }, { shouldPlay: true });
      setSoundInstance(sound);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setIsPlaying(false); });
    } catch (err) {}
  }, [recordingUri, soundInstance]);

  const stopPlayback = useCallback(async () => {
    if (soundInstance) { await soundInstance.stopAsync(); setIsPlaying(false); }
  }, [soundInstance]);

  const deleteRecording = useCallback(() => {
    if (soundInstance) { soundInstance.unloadAsync(); setSoundInstance(null); }
    setIsPlaying(false);
    setRecordingUri(null);
    setRecordingDuration(0);
    setRecordingState('idle');
  }, [soundInstance]);

  const handleUploadAndApply = useCallback(async () => {
    setUploading(true);
    try {
      if (!recordingUri) { showToast('Please record a voice sample first.', 'error'); setUploading(false); return; }
      const response = await fetch(recordingUri);
      const blob = await response.blob();
      const res = await userAPI.getUploadUrl('audio/mp4', 'm4a');
      const { uploadUrl, fileUrl } = res.data;
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'audio/mp4' } });
      if (!uploadRes.ok) throw new Error('Failed to upload audio');
      await userAPI.applyAsListener({ introAudioUrl: fileUrl });
      await AsyncStorage.setItem('listenerStatus', 'pending');
      setListenerStatus('pending');
      if (soundInstance) { await soundInstance.unloadAsync(); setSoundInstance(null); }
      setShowSuccess(true);
    } catch (e) {
      showToast(e?.message || 'Failed to submit application.', 'error');
    } finally { setUploading(false); }
  }, [recordingUri, soundInstance]);

  const confirmSwitchRole = async () => {
    setIsSwitching(true);
    try {
      try { socketService.disconnect(); } catch (e) {}
      const res = await userAPI.switchRole();
      if (res?.data) { await AsyncStorage.setItem('user', JSON.stringify(res.data)); await AsyncStorage.setItem('listenerStatus', 'approved'); }
      setShowSwitchRolePopup(false);
      setTimeout(async () => { await restartApp(); }, 300);
    } catch (err) { showToast(err.message || 'Failed to switch role.', 'error'); }
    finally { setIsSwitching(false); }
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('listenerStatus');
        setListenerStatus(status);
        const userStr = await AsyncStorage.getItem('user');
        let role = 'USER';
        if (userStr) { try { const userObj = JSON.parse(userStr); role = userObj.role || 'USER'; } catch (e) {} }
        if (status === 'approved' && role === 'LISTENER') { router.replace('/(listener)'); return; }
        else if (status === 'rejected') {
          let userId = null;
          if (userStr) { try { const user = JSON.parse(userStr); userId = user._id || user.id; } catch (e) {} }
          const dismissed = await AsyncStorage.getItem('hasDismissedRejection');
          const userDismissed = userId ? await AsyncStorage.getItem(`hasDismissedRejection_${userId}`) : null;
          if (dismissed !== 'true' && userDismissed !== 'true') { router.replace('/(auth)/verification-failed'); return; }
        }
      } catch (e) {}
      setLoading(false);
    };
    checkStatus();
  }, []);

  const handleRefresh = async () => {
    try {
      const res = await authAPI.me();
      if (res?.data) {
        const userObj = res.data;
        if (userObj.role === 'LISTENER') { await AsyncStorage.setItem('listenerStatus', 'approved'); await AsyncStorage.setItem('user', JSON.stringify(userObj)); router.replace('/(listener)'); }
        else { if (userObj.listener?.status) { await AsyncStorage.setItem('listenerStatus', userObj.listener.status); setListenerStatus(userObj.listener.status); } showToast('Application still under review.', 'warning'); }
      }
    } catch (err) { showToast('Failed to refresh.', 'error'); }
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await AsyncStorage.multiRemove(['userToken', 'token', 'user', 'listenerStatus', 'isAdmin', 'userGender', 'userAvatarIndex', 'userName']);
      try { await authAPI.logout(); } catch (apiErr) {}
      setShowLogoutPopup(false);
      setTimeout(() => router.replace('/welcome'), 300);
    } catch (err) { showToast('Failed to logout.', 'error'); setShowLogoutPopup(false); }
    finally { setLoggingOut(false); }
  };

  useEffect(() => {
    const backAction = () => { if (listenerStatus === 'pending') { setShowLogoutPopup(true); return true; } router.replace('/(auth)/role-selection'); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [listenerStatus]);

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><StatusBar style="light" /></View>;

  const showVoiceSection = !listenerStatus || listenerStatus === 'rejected';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SuccessModal visible={showSuccess} onClose={() => setShowSuccess(false)} />
      <LinearGradient colors={['transparent', '#1A0000', '#3D0000']} locations={[0, 0.6, 1]} style={styles.bottomGradient} />
      {COIN_POSITIONS.map((pos, i) => (<FloatingCoin key={i} style={pos} delay={i * 300} />))}

      {/* Header */}
      <View style={[styles.headerContainer, { top: insets.top + vs(6) }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.backBtn, listenerStatus === 'pending' && styles.logoutBtnPending]}
          onPress={listenerStatus === 'pending' ? () => setShowLogoutPopup(true) : () => router.replace('/(auth)/role-selection')}
          activeOpacity={0.7}
        >
          {listenerStatus === 'pending' ? (
            <><Ionicons name="log-out-outline" size={14} color="#EF4444" /><Text style={[styles.backText, { color: '#EF4444' }]}>Logout</Text></>
          ) : (
            <><Ionicons name="chevron-back" size={18} color="#fff" /><Text style={styles.backText}>Back</Text></>
          )}
        </TouchableOpacity>

      </View>

      {/* Top Content - scrollable area */}
      <View style={[styles.topContent, { paddingTop: insets.top + vs(32) }]}>

        {listenerStatus !== 'pending' && (
          <>
            <View style={styles.centeredHeader}>
              <Text style={styles.tagline}>Talk. Connect. Earn</Text>
              <Text style={styles.heading}>Earn While You Listen!</Text>
            </View>

            <View style={styles.illustrationRow}>
              <Image source={require('../../images/person_laptop.png')} style={styles.illustration} resizeMode="contain" />
              <View style={styles.badgesContainer}>
                <View style={styles.badge}>
                  <Ionicons name="people" size={12} color="#9CA3AF" />
                  <View><Text style={styles.badgeTitle}>1 Lakhs+ Listeners</Text><Text style={styles.badgeSub}>and Growing</Text></View>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="location" size={12} color="#9CA3AF" />
                  <View><Text style={styles.badgeTitle}>Work from</Text><Text style={styles.badgeSub}>anywhere</Text></View>
                </View>
              </View>
            </View>
          </>
        )}

        {showVoiceSection && (
          <View style={styles.voiceSection}>
            <Text style={styles.sectionTitle}>Voice Identification</Text>
            <Text style={styles.sectionDesc}>Select language and read the sentence to verify your voice.</Text>

            {/* Dropdown */}
            <View style={styles.dropdownWrapper}>
              <TouchableOpacity style={styles.dropdownCard} activeOpacity={0.8} onPress={() => setDropdownOpen(!dropdownOpen)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownLabel}>Select Language</Text>
                  <Text style={styles.dropdownSelected}>{selectedLanguage}</Text>
                </View>
                <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={wp(4)} color="#9CA3AF" />
              </TouchableOpacity>
              {dropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <View style={styles.languageGrid}>
                    {languageSamples.map((item) => {
                      const isActive = item.language === selectedLanguage;
                      return (
                        <TouchableOpacity
                          key={item.language}
                          style={[styles.languageGridItem, isActive && styles.languageGridItemActive]}
                          onPress={() => { setSelectedLanguage(item.language); setDropdownOpen(false); }}
                        >
                          <Text style={[styles.languageGridText, isActive && styles.languageGridTextActive]}>{item.language}</Text>
                          {isActive && <Ionicons name="checkmark" size={wp(3.5)} color="#FFD700" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Sentence Card */}
            <View style={styles.sentenceCard}>
              <View style={styles.sentenceHeader}>
                <View style={styles.sentenceIconWrap}><Ionicons name="mic" size={wp(3.5)} color="#EF4444" /></View>
                <Text style={styles.sentenceLabel}>Sentence to Read</Text>
              </View>
              <Text style={styles.sentenceText}>{sentence}</Text>
              <View style={styles.sentenceDivider} />
              <View style={styles.sentenceFooter}>
                <Ionicons name="information-circle-outline" size={wp(3.5)} color="#6B7280" />
                <Text style={styles.sentenceHint}>Record a clear voice sample in your selected language.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recording indicator */}
        {showVoiceSection && recordingState === 'recording' && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recDot} />
            <Text style={styles.recIndicatorText}>Recording... {formatTime(recordingDuration)}</Text>
          </View>
        )}

        {showVoiceSection && recordingState === 'review' && (
          <View style={styles.reviewUI}>
            <Text style={styles.reviewTitle}>Your Recording</Text>
            <View style={styles.reviewBar}>
              <TouchableOpacity style={styles.playBtn} onPress={isPlaying ? stopPlayback : playRecording}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={wp(5)} color="#fff" />
              </TouchableOpacity>
              <View style={styles.reviewWaveSection}>
                <MiniWaveform isActive={false} barCount={25} />
                <Text style={styles.reviewDuration}>{formatTime(recordingDuration)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Button - always at bottom */}
      {showVoiceSection && (
        <View style={[styles.bottomBtnContainer, { paddingBottom: insets.bottom + vs(12) }]}>
          {recordingState === 'idle' && (
            <TouchableOpacity style={styles.startRecordBtn} activeOpacity={0.85} onPress={startRecording}>
              <Ionicons name="mic" size={18} color="#fff" />
              <Text style={styles.startRecordBtnText}>Start Recording</Text>
            </TouchableOpacity>
          )}
          {recordingState === 'recording' && (
            <TouchableOpacity style={styles.stopRecordBtn} activeOpacity={0.85} onPress={handleStopRecording}>
              <View style={styles.stopBtnSquare} />
              <Text style={styles.stopRecordBtnText}>Stop Recording</Text>
            </TouchableOpacity>
          )}
          {recordingState === 'review' && (
            <View style={styles.reviewActionsRow}>
              <TouchableOpacity style={styles.reRecordBtn} onPress={deleteRecording}>
                <Ionicons name="refresh" size={14} color="#D1D5DB" />
                <Text style={styles.reRecordText}>Re-record</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleUploadAndApply} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.submitBtnText}>Submit & Apply</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Pending State */}
      {listenerStatus === 'pending' && (
        <View style={styles.pendingContainer}>
          <View style={styles.pendingCenterContent}>
            <Text style={styles.pendingTitle}>Application Pending</Text>
            <Text style={styles.pendingSubtext}>Your application is under review.</Text>
            <Text style={styles.pendingSubtext}>It takes about 12-24 hours.</Text>
            <Image source={require('../../images/person_laptop.png')} style={styles.pendingImage} resizeMode="contain" />
          </View>
          <View style={[styles.bottomBtnContainer, { paddingBottom: insets.bottom + vs(16) }]}>
            <TouchableOpacity style={styles.refreshBtnLarge} onPress={handleRefresh} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.refreshBtnText}>Refresh Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Approved State */}
      {listenerStatus === 'approved' && (
        <View style={[styles.bottomBtnContainer, { paddingBottom: insets.bottom + vs(12) }]}>
          <TouchableOpacity style={styles.approvedBtn} onPress={() => setShowSwitchRolePopup(true)}>
            <Text style={styles.approvedBtnText}>Switch to Listener Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      <LogoutPopup visible={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onConfirm={confirmLogout} loading={loggingOut} />
      <ToastNotification visible={toast.visible} message={toast.message} type={toast.type} onDismiss={() => setToast(prev => ({ ...prev, visible: false }))} />
      <ConfirmSwitchRolePopup visible={showSwitchRolePopup} targetRole="LISTENER" onConfirm={confirmSwitchRole} onCancel={() => setShowSwitchRolePopup(false)} loading={isSwitching} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.35 },
  headerContainer: { position: 'absolute', left: 0, right: 0, height: vs(36), zIndex: 9999, paddingHorizontal: s(16) },
  backBtn: { position: 'absolute', left: s(16), zIndex: 10000, flexDirection: 'row', alignItems: 'center', gap: 3 },
  backText: { fontSize: ms(12), color: '#fff', fontFamily: 'Inter_500Medium' },
  refreshBtn: { position: 'absolute', right: s(16), zIndex: 10000, flexDirection: 'row', alignItems: 'center', gap: 3 },
  logoutBtnPending: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)', borderRadius: 20, paddingHorizontal: s(12), paddingVertical: vs(8), gap: 4 },

  topContent: { flex: 1, paddingHorizontal: s(16), zIndex: 10, overflow: 'visible' },
  centeredHeader: { alignItems: 'center', marginBottom: vs(4) },
  tagline: { fontSize: ms(12), color: '#FFFFFF', fontFamily: 'Inter_500Medium', letterSpacing: 1, marginBottom: vs(2), textAlign: 'center' },
  heading: { fontSize: ms(17), fontWeight: '900', color: '#fff', fontFamily: 'Inter_900Black', textAlign: 'center', marginBottom: vs(4) },

  illustrationRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: SCREEN_HEIGHT * 0.22, marginBottom: vs(6) },
  illustration: { width: '55%', height: '100%' },
  badgesContainer: { flex: 1, gap: vs(5), paddingLeft: s(6) },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: s(6), paddingVertical: vs(4), gap: 5, borderWidth: 1, borderColor: '#2A2A2A' },
  badgeTitle: { fontSize: ms(9), color: '#E5E7EB', fontFamily: 'Inter_700Bold' },
  badgeSub: { fontSize: ms(8), color: '#9CA3AF', fontFamily: 'Inter_400Regular' },

  voiceSection: { width: '100%' },
  sectionTitle: { fontSize: ms(18), fontFamily: 'Inter_700Bold', fontWeight: '700', color: '#fff', marginBottom: vs(6) },
  sectionDesc: { fontSize: ms(13), color: '#9CA3AF', fontFamily: 'Inter_400Regular', marginBottom: vs(10), lineHeight: ms(17) },

  dropdownWrapper: { width: '100%', marginBottom: vs(6), zIndex: 100 },
  dropdownCard: { width: '100%', height: vs(52), backgroundColor: '#141414', borderRadius: 10, borderWidth: 1, borderColor: '#2B2B2B', flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(14) },
  dropdownLabel: { fontSize: ms(11), color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 2 },
  dropdownSelected: { fontSize: ms(14), color: '#fff', fontFamily: 'Inter_700Bold', fontWeight: '700' },
  dropdownMenu: { position: 'absolute', top: vs(46), left: 0, right: 0, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#333', padding: s(8), maxHeight: vs(320), zIndex: 200, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  languageGridItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(12), paddingHorizontal: s(12), backgroundColor: '#252525', borderRadius: 8, borderWidth: 1, borderColor: '#333', flexBasis: '48%' },
  languageGridItemActive: { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: '#FFD700' },
  languageGridText: { fontSize: ms(13), color: '#D1D5DB', fontFamily: 'Inter_500Medium', flex: 1 },
  languageGridTextActive: { color: '#FFD700', fontFamily: 'Inter_700Bold' },

  sentenceCard: { width: '100%', backgroundColor: '#151515', borderRadius: 10, borderWidth: 0.5, borderColor: '#2A2A2A', padding: s(14), marginBottom: vs(10) },
  sentenceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(6) },
  sentenceIconWrap: { width: s(26), height: s(26), borderRadius: 13, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: s(8) },
  sentenceLabel: { fontSize: ms(13), color: '#fff', fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  sentenceText: { fontSize: ms(14), color: '#E5E7EB', fontFamily: 'Inter_400Regular', lineHeight: ms(19), marginBottom: vs(8) },
  sentenceDivider: { height: 0.5, backgroundColor: '#2A2A2A', marginBottom: vs(6) },
  sentenceFooter: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  sentenceHint: { flex: 1, fontSize: ms(11), color: '#6B7280', fontFamily: 'Inter_400Regular' },

  recordingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: s(8), marginBottom: vs(4), gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  recIndicatorText: { flex: 1, fontSize: ms(11), color: '#EF4444', fontFamily: 'Inter_600SemiBold' },

  reviewUI: { width: '100%', marginTop: vs(4) },
  reviewTitle: { fontSize: ms(10), color: '#fff', fontFamily: 'Inter_600SemiBold', marginBottom: vs(4) },
  reviewBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 10, padding: s(8), borderWidth: 1, borderColor: '#2A2A2A' },
  playBtn: { width: s(34), height: s(34), borderRadius: 17, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  reviewWaveSection: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: s(8) },
  reviewDuration: { fontSize: ms(10), fontFamily: 'Inter_600SemiBold', color: '#9CA3AF', marginLeft: s(6) },
  miniWaveform: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: vs(16), gap: 1 },

  bottomBtnContainer: { paddingHorizontal: s(16), zIndex: 10, paddingTop: vs(8) },
  startRecordBtn: { width: '100%', height: vs(48), borderRadius: 24, backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startRecordBtnText: { fontSize: ms(14), color: '#fff', fontFamily: 'Inter_700Bold', fontWeight: '700' },
  stopRecordBtn: { width: '100%', height: vs(48), borderRadius: 24, backgroundColor: '#374151', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stopRecordBtnText: { fontSize: ms(14), color: '#fff', fontFamily: 'Inter_700Bold', fontWeight: '700' },
  stopBtnSquare: { width: 14, height: 14, borderRadius: 3, backgroundColor: '#EF4444' },
  reviewActionsRow: { flexDirection: 'row', gap: s(10) },
  reRecordBtn: { flex: 0.35, height: vs(48), borderRadius: 24, borderWidth: 1, borderColor: '#3A3A3A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  reRecordText: { fontSize: ms(11), color: '#D1D5DB', fontFamily: 'Inter_600SemiBold' },
  submitBtn: { flex: 0.65, height: vs(48), borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: ms(13), color: '#000', fontFamily: 'Inter_700Bold', fontWeight: '700' },

  pendingContainer: { flex: 1, justifyContent: 'space-between' },
  pendingCenterContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(24) },
  pendingImage: { width: SCREEN_WIDTH * 0.75, height: SCREEN_HEIGHT * 0.35, marginBottom: vs(20) },
  pendingTitle: { fontSize: ms(22), color: '#F59E0B', fontFamily: 'Inter_700Bold', marginBottom: vs(8), textAlign: 'center' },
  pendingSubtext: { fontSize: ms(15), color: '#D1D5DB', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: ms(22), marginTop: vs(4) },
  refreshBtnLarge: { width: '100%', height: vs(52), borderRadius: 26, backgroundColor: '#374151', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshBtnText: { fontSize: ms(15), color: '#fff', fontFamily: 'Inter_700Bold', fontWeight: '700' },
  approvedBtn: { backgroundColor: '#7C3AED', borderRadius: 24, paddingVertical: vs(12), alignItems: 'center' },
  approvedBtnText: { fontSize: ms(13), color: '#fff', fontFamily: 'Inter_700Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(6) },
  successModalContent: { width: wp(88), borderRadius: 20, padding: wp(6), alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  successIconCircle: { width: hp(8), height: hp(8), borderRadius: 40, backgroundColor: 'rgba(34, 197, 94, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: hp(2) },
  successTitle: { fontSize: hp(2.4), fontWeight: '900', color: '#fff', marginBottom: hp(1), textAlign: 'center', fontFamily: 'Inter_900Black' },
  successSub: { fontSize: hp(1.5), color: '#9CA3AF', textAlign: 'center', lineHeight: hp(2.2), marginBottom: hp(3), fontFamily: 'Inter_400Regular' },
  successBtn: { backgroundColor: '#22C55E', width: '100%', paddingVertical: hp(1.5), borderRadius: wp(3), alignItems: 'center' },
  successBtnText: { color: '#fff', fontSize: hp(1.8), fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
});
