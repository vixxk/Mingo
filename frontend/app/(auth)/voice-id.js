import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  Vibration,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { ms, s, vs, hp, wp, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/responsive';

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

const COIN_POSITIONS = [
  { left: '2%', top: '0%', size: wp(7.5), delay: 0, duration: 10000 },
  { left: '24%', top: '-5%', size: wp(5.5), delay: 1500, duration: 9000 },
  { left: '46%', top: '-7%', size: wp(8), delay: 800, duration: 11000 },
  { left: '70%', top: '-4%', size: wp(6.5), delay: 2500, duration: 8500 },
  { left: '88%', top: '-2%', size: wp(6), delay: 1200, duration: 9500 },
];

const COIN_COLORS = ['#FFD700', '#FFC107', '#FFDF00', '#FFD700', '#FFC107'];
const BAR_COUNT = 40;

function FloatingCoin({ position, color }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: position.duration, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: position.duration, useNativeDriver: true }),
      ])
    );
    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: position.duration * 0.7, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: position.duration * 0.7, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { float.start(); rotate.start(); }, position.delay);
    return () => { clearTimeout(t); float.stop(); rotate.stop(); };
  }, []);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -hp(2)] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: position.left, top: position.top,
        width: position.size, height: position.size,
        borderRadius: position.size / 2, backgroundColor: color,
        transform: [{ translateY }, { rotate }],
        shadowColor: color, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7, shadowRadius: position.size * 0.3, elevation: 8, zIndex: 5,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Ionicons name="business" size={position.size * 0.45} color="rgba(255,255,255,0.9)" />
    </Animated.View>
  );
}

function FeatureCard({ icon, title, subtitle, style: cardStyle }) {
  return (
    <View style={[styles.featureCard, cardStyle]}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={wp(3.5)} color="#9CA3AF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function LanguageDropdown({ languages, selected, onSelect, open, onToggle }) {
  return (
    <View>
      <TouchableOpacity style={styles.dropdownCard} activeOpacity={0.8} onPress={onToggle}>
        <View style={styles.dropdownInner}>
          <Text style={styles.dropdownLabel}>Select Language</Text>
          <Text style={styles.dropdownSelected}>{selected}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={wp(5)} color="#9CA3AF" />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {languages.map((item) => {
            const active = item.language === selected;
            return (
              <TouchableOpacity
                key={item.language}
                style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                onPress={() => onSelect(item.language)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                  {item.language}
                </Text>
                {active && <Ionicons name="checkmark" size={wp(4.5)} color="#FFD700" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SentenceCard({ sentence }) {
  return (
    <View style={styles.sentenceCard}>
      <LinearGradient
        colors={['transparent', 'rgba(239,68,68,0.06)']}
        locations={[0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.sentenceHeader}>
        <View style={styles.sentenceIconWrap}>
          <Ionicons name="mic" size={wp(4.2)} color="#EF4444" />
        </View>
        <Text style={styles.sentenceLabel}>Sentence to Read</Text>
      </View>
      <Text style={styles.sentenceText}>{sentence}</Text>
      <View style={styles.sentenceDivider} />
      <View style={styles.sentenceFooter}>
        <Ionicons name="information-circle-outline" size={wp(3.8)} color="#6B7280" />
        <Text style={styles.sentenceHint}>
          Please read this clearly and record a 15-20 second voice sample.
        </Text>
      </View>
    </View>
  );
}

function Waveform({ isActive, durationMs }) {
  const heights = useRef(Array.from({ length: BAR_COUNT }, () => Math.random() * 0.6 + 0.2)).current;
  const [bars, setBars] = useState(heights);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setBars((p) => p.map(() => Math.random() * 0.8 + 0.1)), 100);
    return () => clearInterval(id);
  }, [isActive]);

  useEffect(() => {
    if (!isActive && durationMs > 0) setBars(Array.from({ length: BAR_COUNT }, () => Math.random() * 0.3 + 0.05));
  }, [isActive, durationMs]);

  return (
    <View style={styles.waveformContainer}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={{
            width: wp(0.55), height: `${h * 100}%`, maxHeight: '100%',
            borderRadius: wp(0.3),
            backgroundColor: isActive ? '#EF4444' : '#8B8B8B',
            opacity: isActive ? 0.9 : 0.5,
          }}
        />
      ))}
    </View>
  );
}

export default function VoiceVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showRecordingPanel, setShowRecordingPanel] = useState(false);
  const [showPlaybackPanel, setShowPlaybackPanel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundInstance, setSoundInstance] = useState(null);
  const [showShortWarning, setShowShortWarning] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const panelSlideAnim = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const durationRef = useRef(0);

  const activeSample = languageSamples.find((l) => l.language === selectedLanguage);
  const sentence = activeSample ? activeSample.text : languageSamples[0].text;

  useEffect(() => {
    return () => {
      if (recordingInstance) recordingInstance.stopAndUnloadAsync();
      if (soundInstance) soundInstance.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecordingInstance(rec);
      setIsRecording(true);
      durationRef.current = 0;
      setRecordingDuration(0);
      setShowShortWarning(false);
      if (Platform.OS !== 'web') Vibration.vibrate(50);
      timerRef.current = setInterval(() => { durationRef.current += 100; setRecordingDuration(durationRef.current); }, 100);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Could not start recording. Please check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingInstance) return;
    try {
      await recordingInstance.stopAndUnloadAsync();
      setRecordingUri(recordingInstance.getURI());
      setIsRecording(false);
      setRecordingInstance(null);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (Platform.OS !== 'web') Vibration.vibrate(30);
    } catch (err) { console.error('Failed to stop recording:', err); }
  }, [recordingInstance]);

  const transitionToPlayback = useCallback(() => {
    Animated.parallel([
      Animated.timing(panelSlideAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setShowRecordingPanel(false);
      Animated.timing(panelSlideAnim, { toValue: 0, duration: 0, useNativeDriver: true }).start(() => {
        setShowPlaybackPanel(true);
        Animated.parallel([
          Animated.timing(panelSlideAnim, { toValue: 0.78, duration: 300, useNativeDriver: true }),
          Animated.timing(overlayOpacity, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    });
  }, [panelSlideAnim, overlayOpacity]);

  const handleStopPress = useCallback(() => {
    if (durationRef.current / 1000 < 15) { setShowShortWarning(true); }
    else { setShowShortWarning(false); stopRecording().then(transitionToPlayback); }
  }, [stopRecording, transitionToPlayback]);

  const handleContinueShort = useCallback(() => {
    setShowShortWarning(false);
    stopRecording().then(transitionToPlayback);
  }, [stopRecording, transitionToPlayback]);

  const dismissWarning = useCallback(() => setShowShortWarning(false), []);

  const playRecording = useCallback(async () => {
    if (!recordingUri) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (soundInstance) await soundInstance.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri }, { shouldPlay: true });
      setSoundInstance(sound);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) setIsPlaying(false); });
    } catch (err) { console.error('Playback failed:', err); }
  }, [recordingUri, soundInstance]);

  const stopPlayback = useCallback(async () => {
    if (soundInstance) { await soundInstance.stopAsync(); setIsPlaying(false); }
  }, [soundInstance]);

  const deleteRecording = useCallback(() => {
    if (soundInstance) { soundInstance.unloadAsync(); setSoundInstance(null); }
    setIsPlaying(false);
    setRecordingUri(null);
    setRecordingDuration(0);
    Animated.parallel([
      Animated.timing(panelSlideAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => { setShowPlaybackPanel(false); setShowRecordingPanel(false); });
  }, [soundInstance, panelSlideAnim, overlayOpacity]);

  const openRecordingPanel = useCallback(() => {
    setShowRecordingPanel(true);
    Animated.parallel([
      Animated.timing(panelSlideAnim, { toValue: 0.78, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0.2, duration: 300, useNativeDriver: true }),
    ]).start(() => { startRecording(); });
  }, [panelSlideAnim, overlayOpacity, startRecording]);

  const handleSubmit = useCallback(async () => {
    setHasSubmitted(true);
    if (soundInstance) { await soundInstance.unloadAsync(); setSoundInstance(null); }
    Animated.parallel([
      Animated.timing(panelSlideAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => { setShowPlaybackPanel(false); router.replace('/(auth)/gender'); });
  }, [soundInstance, panelSlideAnim, overlayOpacity, router]);

  // ─── Render ───

  const panelTranslateY = panelSlideAnim.interpolate({ inputRange: [0.78, 1], outputRange: [0, hp(25)] });
  const playbackTranslateY = panelSlideAnim.interpolate({ inputRange: [0.78, 1], outputRange: [0, hp(28)] });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', 'rgba(110,0,0,0.25)']}
        locations={[0.6, 1]}
        style={styles.bottomGlow}
        pointerEvents="none"
      />

      {/* ─── Back ─── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + hp(0.8) }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={wp(5)} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* ─── Scroll Content ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + hp(4), paddingBottom: insets.bottom + hp(10) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Coins ─── */}
        <View style={styles.coinsArea}>
          {COIN_POSITIONS.map((pos, i) => (
            <FloatingCoin key={i} position={pos} color={COIN_COLORS[i]} />
          ))}
        </View>

        {/* ─── Tagline ─── */}
        <Text style={styles.tagline}>Talk. Connect. Earn</Text>

        {/* ─── Heading ─── */}
        <Text style={styles.mainHeading}>Earn While You Listen!</Text>

        {/* ─── Illustration + Feature Cards ─── */}
        <View style={styles.illustrationRow}>
          <View style={styles.illustrationWrap}>
            <Image 
              source={require('../../images/person_laptop.png')}
              style={styles.illoImage}
              resizeMode="contain"
            />
          </View>

          <FeatureCard
            icon="people"
            title="1 Lakhs+"
            subtitle="Listeners and Growing"
            style={styles.featureCardTop}
          />
          <FeatureCard
            icon="location"
            title="Work from"
            subtitle="anywhere"
            style={styles.featureCardBottom}
          />
        </View>

        {/* ─── Voice Verification ─── */}
        <Text style={styles.verificationTitle}>Voice Identification</Text>
        <Text style={styles.verificationDesc}>
          Select your language and read the sentence below to verify your voice clarity,
          pronunciation, and speaking confidence.
        </Text>

        {/* ─── Language Dropdown ─── */}
        <LanguageDropdown
          languages={languageSamples}
          selected={selectedLanguage}
          onSelect={(lang) => { setSelectedLanguage(lang); setDropdownOpen(false); }}
          open={dropdownOpen}
          onToggle={() => setDropdownOpen(!dropdownOpen)}
        />

        {/* ─── Sentence Card ─── */}
        <SentenceCard sentence={sentence} />

        {/* ─── CTA ─── */}
        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85} onPress={openRecordingPanel}>
          <Text style={styles.ctaText}>Record Voice Sample & Apply</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Overlay ─── */}
      <Animated.View
        pointerEvents={showRecordingPanel || showPlaybackPanel ? 'auto' : 'none'}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      />

      {/* ─── Recording Panel ─── */}
      {showRecordingPanel && (
        <Animated.View style={[styles.recordingPanel, { transform: [{ translateY: panelTranslateY }], paddingBottom: insets.bottom + hp(1) }]}>
          {showShortWarning && (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle" size={wp(3.5)} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningText}>Your recording is shorter than the recommended 15 seconds.</Text>
                <View style={styles.warningActions}>
                  <TouchableOpacity onPress={dismissWarning} activeOpacity={0.7}>
                    <Text style={styles.warningActionText}>Continue recording</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#6B7280', fontSize: ms(10, 0.3) }}> / </Text>
                  <TouchableOpacity onPress={handleContinueShort} activeOpacity={0.7}>
                    <Text style={[styles.warningActionText, { color: '#F59E0B' }]}>Submit anyway</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          <View style={styles.recordingBar}>
            <View style={styles.recMicWrap}>
              <View style={styles.recMicPulse}>
                <Ionicons name="mic" size={wp(5)} color="#fff" />
              </View>
            </View>
            <View style={styles.waveformSection}>
              <View style={styles.waveformOuter}>
                <Waveform isActive durationMs={recordingDuration} />
              </View>
              <Text style={styles.recTimer}>{formatTime(recordingDuration)}</Text>
            </View>
            <TouchableOpacity style={styles.stopBtn} onPress={handleStopPress} activeOpacity={0.8}>
              <View style={styles.stopInner} />
            </TouchableOpacity>
          </View>
          <Text style={styles.recHelper}>Recording... Read the sentence clearly in your selected language.</Text>
        </Animated.View>
      )}

      {/* ─── Playback Panel ─── */}
      {showPlaybackPanel && (
        <Animated.View style={[styles.playbackPanel, { transform: [{ translateY: playbackTranslateY }], paddingBottom: insets.bottom + hp(1) }]}>
          <View style={styles.playbackBar}>
            <TouchableOpacity style={styles.playPauseBtn} onPress={isPlaying ? stopPlayback : playRecording} activeOpacity={0.8}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={wp(5.5)} color="#fff" />
            </TouchableOpacity>
            <View style={styles.playbackWaveSection}>
              <View style={styles.playbackWaveform}>
                <Waveform isActive={false} durationMs={recordingDuration} />
              </View>
              <Text style={styles.playbackDuration}>{formatTime(recordingDuration)}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteRecording} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={wp(5)} color="#EF4444" />
            </TouchableOpacity>
          </View>
          <View style={styles.playbackActions}>
            <TouchableOpacity style={styles.reRecordBtn} onPress={deleteRecording} activeOpacity={0.8}>
              <Ionicons name="refresh" size={wp(4.5)} color="#D1D5DB" />
              <Text style={styles.reRecordText}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>{hasSubmitted ? 'Submitting...' : 'Submit & Apply'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bottomGlow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: hp(15), zIndex: 0 },
  backBtn: { position: 'absolute', left: wp(4), zIndex: 20, flexDirection: 'row', alignItems: 'center', width: wp(12) },
  backText: { fontSize: ms(14, 0.3), color: '#fff', fontFamily: 'Inter_500Medium', marginLeft: 2 },
  scroll: { flex: 1, zIndex: 1 },
  scrollContent: { paddingHorizontal: wp(5) },

  // ─── Coins ───
  coinsArea: { height: hp(8), position: 'relative', marginBottom: hp(0.3) },

  // ─── Tagline ───
  tagline: {
    textAlign: 'center', color: '#D1D5DB', fontSize: ms(18, 0.3),
    letterSpacing: wp(0.8), fontFamily: 'Inter_500Medium', opacity: 0.85,
    marginBottom: hp(0.8),
  },

  // ─── Heading ───
  mainHeading: {
    textAlign: 'center', fontSize: wp(10), fontFamily: 'Inter_700Bold',
    fontWeight: '700', color: '#fff', lineHeight: wp(11),
    marginBottom: hp(1.2),
  },

  // ─── Illustration Row ───
  illustrationRow: {
    flexDirection: 'row', alignItems: 'center', position: 'relative',
    height: hp(15), marginBottom: hp(1),
  },
  illustrationWrap: {
    width: wp(36), height: hp(15), justifyContent: 'center', alignItems: 'center', zIndex: 2,
  },
  illoImage: {
    width: '100%',
    height: '100%',
  },

  // ─── Feature Cards ───
  featureCard: {
    position: 'absolute', right: 0, width: wp(42),
    backgroundColor: '#1A1A1A', borderRadius: wp(3), borderWidth: 0.5, borderColor: '#2A2A2A',
    paddingHorizontal: wp(3), paddingVertical: hp(1),
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  featureCardTop: { top: hp(1), zIndex: 3 },
  featureCardBottom: { top: hp(8.5), zIndex: 3 },
  featureIconWrap: {
    width: wp(7), height: wp(7), borderRadius: wp(3.5),
    backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center',
    marginRight: wp(2.5),
  },
  featureTitle: { fontSize: ms(13, 0.3), fontFamily: 'Inter_600SemiBold', fontWeight: '600', color: '#fff', lineHeight: ms(16, 0.3) },
  featureSubtitle: { fontSize: ms(11, 0.3), color: '#9CA3AF', fontFamily: 'Inter_400Regular', marginTop: 2 },

  // ─── Verification ───
  verificationTitle: {
    fontSize: ms(32, 0.3), fontFamily: 'Inter_700Bold', fontWeight: '700',
    color: '#fff', marginBottom: hp(0.6),
  },
  verificationDesc: {
    fontSize: ms(16, 0.3), color: '#9CA3AF', fontFamily: 'Inter_400Regular',
    lineHeight: ms(22, 0.3), marginBottom: hp(1.5),
  },

  // ─── Dropdown ───
  dropdownCard: {
    width: '100%', height: hp(7.5), backgroundColor: '#141414', borderRadius: wp(4.5),
    borderWidth: 1, borderColor: '#2B2B2B', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: wp(4), marginBottom: hp(1.2),
  },
  dropdownInner: { flex: 1 },
  dropdownLabel: { fontSize: ms(11, 0.3), color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 2 },
  dropdownSelected: { fontSize: ms(16, 0.3), color: '#fff', fontFamily: 'Inter_700Bold', fontWeight: '700' },
  dropdownMenu: {
    backgroundColor: '#1A1A1A', borderRadius: wp(4.5), borderWidth: 1, borderColor: '#2B2B2B',
    marginBottom: hp(1.2), paddingVertical: hp(0.5),
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: hp(1.2), paddingHorizontal: wp(4),
  },
  dropdownItemActive: { backgroundColor: 'rgba(255,215,0,0.06)' },
  dropdownItemText: { fontSize: ms(14, 0.3), color: '#D1D5DB', fontFamily: 'Inter_400Regular' },
  dropdownItemTextActive: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontWeight: '700' },

  // ─── Sentence Card ───
  sentenceCard: {
    width: '100%', backgroundColor: '#151515', borderRadius: wp(4.5),
    borderWidth: 0.5, borderColor: '#2A2A2A', padding: wp(5),
    marginBottom: hp(2), overflow: 'hidden',
  },
  sentenceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.8) },
  sentenceIconWrap: {
    width: wp(7), height: wp(7), borderRadius: wp(3.5),
    backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center',
    marginRight: wp(2.5),
  },
  sentenceLabel: { fontSize: ms(14, 0.3), color: '#fff', fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  sentenceText: {
    fontSize: ms(18, 0.3), color: '#E5E7EB', fontFamily: 'Inter_400Regular',
    lineHeight: ms(26, 0.3), marginBottom: hp(1),
  },
  sentenceDivider: { height: 0.5, backgroundColor: '#2A2A2A', marginBottom: hp(0.8) },
  sentenceFooter: { flexDirection: 'row', alignItems: 'flex-start', gap: wp(1.5) },
  sentenceHint: {
    flex: 1, fontSize: ms(14, 0.3), color: '#6B7280', fontFamily: 'Inter_400Regular',
    lineHeight: ms(18, 0.3),
  },

  // ─── CTA ───
  ctaBtn: {
    width: '100%', height: hp(6.5), borderRadius: 9999, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 4, marginBottom: hp(2),
  },
  ctaText: {
    fontSize: ms(15, 0.3), color: '#000', fontFamily: 'Inter_700Bold', fontWeight: '700',
  },

  // ─── Overlay ───
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 30 },

  // ─── Recording Panel ───
  recordingPanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#141414',
    borderTopLeftRadius: wp(6), borderTopRightRadius: wp(6),
    paddingHorizontal: wp(5), paddingTop: hp(2), zIndex: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 20,
  },
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: wp(2), padding: wp(3), marginBottom: hp(1.5), gap: wp(2),
  },
  warningText: {
    fontSize: ms(10, 0.3), color: '#F59E0B', fontFamily: 'Inter_400Regular',
    lineHeight: ms(14, 0.3), marginBottom: hp(0.5),
  },
  warningActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  warningActionText: {
    fontSize: ms(10, 0.3), color: '#D1D5DB', fontFamily: 'Inter_600SemiBold',
    fontWeight: '600', textDecorationLine: 'underline',
  },
  recordingBar: { flexDirection: 'row', alignItems: 'center', height: hp(7) },
  recMicWrap: {
    width: hp(6), height: hp(6), borderRadius: hp(3),
    backgroundColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: wp(3),
  },
  recMicPulse: {
    width: hp(4.5), height: hp(4.5), borderRadius: hp(2.25), backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
  },
  waveformSection: { flex: 1, flexDirection: 'row', alignItems: 'center', height: '100%' },
  waveformOuter: { flex: 1, height: '60%', justifyContent: 'center', marginRight: wp(2) },
  waveformContainer: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: '100%', gap: wp(0.3),
  },
  recTimer: {
    fontSize: ms(14, 0.3), fontFamily: 'Inter_600SemiBold', fontWeight: '600',
    color: '#D1D5DB', minWidth: wp(10), textAlign: 'right',
  },
  stopBtn: {
    width: hp(4.5), height: hp(4.5), borderRadius: hp(2.25),
    backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: wp(2),
  },
  stopInner: { width: hp(2), height: hp(2), borderRadius: 4, backgroundColor: '#EF4444' },
  recHelper: {
    textAlign: 'center', fontSize: ms(10, 0.3), color: '#6B7280',
    fontFamily: 'Inter_400Regular', marginTop: hp(1), marginBottom: hp(1),
  },

  // ─── Playback Panel ───
  playbackPanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#141414',
    borderTopLeftRadius: wp(6), borderTopRightRadius: wp(6),
    paddingHorizontal: wp(5), paddingTop: hp(2), zIndex: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 20,
  },
  playbackBar: { flexDirection: 'row', alignItems: 'center', height: hp(7) },
  playPauseBtn: {
    width: hp(5), height: hp(5), borderRadius: hp(2.5), backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center', marginRight: wp(3),
  },
  playbackWaveSection: { flex: 1, flexDirection: 'row', alignItems: 'center', height: '100%' },
  playbackWaveform: { flex: 1, height: '50%', justifyContent: 'center', marginRight: wp(2), opacity: 0.6 },
  playbackDuration: {
    fontSize: ms(14, 0.3), fontFamily: 'Inter_600SemiBold', fontWeight: '600',
    color: '#9CA3AF', minWidth: wp(10), textAlign: 'right',
  },
  deleteBtn: {
    width: hp(4.5), height: hp(4.5), borderRadius: hp(2.25),
    backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: wp(2),
  },
  playbackActions: { flexDirection: 'row', alignItems: 'center', marginTop: hp(1.5), marginBottom: hp(1), gap: wp(3) },
  reRecordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: hp(1.2), paddingHorizontal: wp(4), borderRadius: 9999,
    borderWidth: 1, borderColor: '#3A3A3A', gap: wp(1.5),
  },
  reRecordText: { fontSize: ms(12, 0.3), color: '#D1D5DB', fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  submitBtn: { flex: 1, height: hp(5), borderRadius: 9999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: ms(13, 0.3), color: '#000', fontFamily: 'Inter_700Bold', fontWeight: '700' },
});
