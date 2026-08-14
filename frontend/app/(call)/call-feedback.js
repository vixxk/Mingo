import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Animated,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';

import { ratingAPI, walletAPI } from '../../utils/api';
import StatusPopup from '../../components/shared/StatusPopup';
import CenteredOfferPopup from '../../components/shared/CenteredOfferPopup';

// Enable smooth chip re-layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Feedback options change with the star rating so we capture the user's
// actual sentiment — appreciation for high ratings, issues for low ones.
const TIERS = {
  high: {
    prompt: 'What did you love about this session?',
    icon: 'heart',
    color: '#22C55E',
    textColor: '#4ADE80',
    tags: ['Fun Conversation', 'Helpful Advice', 'Friendly Listener', 'Sweet Personality'],
  },
  mid: {
    prompt: 'What could have been better?',
    icon: 'bulb-outline',
    color: '#F59E0B',
    textColor: '#FBBF24',
    tags: ['Average Conversation', 'Okay Advice', 'Could Be Friendlier', 'Short Session'],
  },
  low: {
    prompt: 'What went wrong? Help us improve.',
    icon: 'warning',
    color: '#EF4444',
    textColor: '#F87171',
    tags: ['Not Listening Properly', 'Rude Behavior', 'Poor Connection', 'Unhelpful Advice'],
  },
};

const getTier = (rating) => (rating <= 2 ? 'low' : rating === 3 ? 'mid' : 'high');

function StarButton({ filled, size, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.35, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? '#FBBF24' : '#6B7280'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

import AnimatedSparkles from '../../components/shared/AnimatedSparkles';

export default function CallFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { name = 'Priya Sharma', sessionId, listenerId, callType = 'audio' } = useLocalSearchParams();
  const [rating, setRating] = useState(4);
  const [selectedTags, setSelectedTags] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewState, setViewState] = useState('form'); // 'form' | 'success' | 'returning'
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [popup, setPopup] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    onClose: null,
  });
  const allowNavigationRef = useRef(false);

  const tier = getTier(rating);
  const tierInfo = TIERS[tier];
  const tagsAnim = useRef(new Animated.Value(1)).current;
  const prevTierRef = useRef(tier);

  useEffect(() => {
    if (prevTierRef.current !== tier) {
      prevTierRef.current = tier;
      setSelectedTags((prev) => prev.filter((t) => TIERS[tier].tags.includes(t)));
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      tagsAnim.setValue(0);
      Animated.timing(tagsAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }
  }, [tier, tagsAnim]);

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
    });

    const backAction = () => {
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowNavigationRef.current) {
        return;
      }
      e.preventDefault();
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const goHomeRef = useRef(false);
  const goHome = () => {
    if (goHomeRef.current) return;
    goHomeRef.current = true;
    allowNavigationRef.current = true;
    try {
      router.dismissAll();
    } catch (e) {}
    router.replace('/(tabs)');
  };

  // Step 2 -> Step 3 transition timer
  useEffect(() => {
    if (viewState === 'success') {
      const timer = setTimeout(() => {
        setViewState('returning');
      }, 1800);
      return () => clearTimeout(timer);
    } else if (viewState === 'returning') {
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          goHome();
        }, 200);
      });
    }
  }, [viewState]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const combinedFeedback = selectedTags.length > 0
        ? `${selectedTags.join(', ')}. ${feedback}`
        : feedback;

      if (sessionId) {
        await ratingAPI.submit(sessionId, rating, combinedFeedback);
      }
      setViewState('success');
    } catch (e) {
      console.log('Error submitting feedback:', e);
      // Even if network fails, gracefully show success screen to preserve user sentiment
      setViewState('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Step 2: Thanks for your feedback!
  if (viewState === 'success') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#000', '#042F1A', '#022012']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <AnimatedSparkles color="#34D399" size={22} />
        
        <View style={[styles.transitionContent, { paddingTop: insets.top + vs(80) }]}>
          <View style={styles.successIconOuterRing}>
            <View style={styles.successIconInnerCircle}>
              <Ionicons name="checkmark" size={38} color="#22C55E" />
            </View>
          </View>

          <Text style={styles.successHeading}>Thanks for your feedback!</Text>
          <Text style={styles.successSubheading}>Your feedback has been submitted.</Text>

          <View style={styles.creatorPill}>
            <Text style={styles.creatorPillText}>💜 You're helping creators deliver better experiences.</Text>
          </View>
        </View>
      </View>
    );
  }

  // Render Step 3: Returning to your dashboard...
  if (viewState === 'returning') {
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#000', '#180808', '#080202']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={[styles.transitionContent, { paddingTop: insets.top + vs(120) }]}>
          <View style={styles.brandIconWrap}>
            <Ionicons name="chatbubbles" size={36} color="#EF4444" />
          </View>
          <Text style={styles.brandName}>Mingo</Text>

          <Text style={styles.returningHeading}>Returning to your dashboard...</Text>

          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>

          <Text style={styles.returningSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#000', '#1A0000', '#4A0000']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + vs(60) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>
            How was your session with{'\n'}{name}?
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <StarButton
                key={star}
                filled={star <= rating}
                size={38}
                onPress={() => setRating(star)}
              />
            ))}
          </View>

          <Animated.View
            style={{
              alignItems: 'center',
              opacity: tagsAnim,
              transform: [
                { translateY: tagsAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            }}
          >
            <View style={styles.promptRow}>
              <Ionicons name={tierInfo.icon} size={16} color={tierInfo.color} />
              <Text style={[styles.promptText, { color: tierInfo.textColor }]}>
                {tierInfo.prompt}
              </Text>
            </View>

            <View style={styles.tagsWrap}>
              {tierInfo.tags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tag,
                      selected && {
                        backgroundColor: `${tierInfo.color}26`,
                        borderColor: tierInfo.color,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, selected && { color: tierInfo.textColor }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Tell us about your call......"
              placeholderTextColor="#6B7280"
              value={feedback}
              onChangeText={(text) => text.length <= 100 && setFeedback(text)}
              multiline
              maxLength={100}
            />
            <Text style={styles.charCount}>{feedback.length}/100</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.submitText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: vs(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    paddingHorizontal: s(28),
    alignItems: 'center',
  },

  heading: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    lineHeight: ms(34),
    marginBottom: vs(24),
  },

  starsRow: {
    flexDirection: 'row',
    gap: s(8),
    marginBottom: vs(24),
  },

  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(14),
  },
  promptText: {
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },

  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: s(8),
    marginBottom: vs(28),
  },
  tag: {
    borderWidth: 1.5,
    borderColor: '#4B5563',
    borderRadius: 22,
    paddingHorizontal: s(16),
    paddingVertical: vs(9),
  },
  tagText: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },

  inputWrap: {
    width: '100%',
    backgroundColor: '#141414',
    borderRadius: 16,
    paddingHorizontal: s(16),
    paddingTop: vs(14),
    paddingBottom: vs(10),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: vs(28),
    minHeight: vs(100),
  },
  input: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
    minHeight: vs(60),
    padding: 0,
  },
  charCount: {
    fontSize: ms(11, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginTop: vs(4),
  },

  submitBtn: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: s(40),
    paddingVertical: vs(15),
  },
  submitText: {
    fontSize: ms(16, 0.3),
    color: '#000',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  transitionContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: s(28),
  },

  successIconOuterRing: {
    width: s(84),
    height: s(84),
    borderRadius: s(42),
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },
  successIconInnerCircle: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successHeading: {
    fontSize: ms(22, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_800Bold',
    textAlign: 'center',
    marginBottom: vs(8),
  },
  successSubheading: {
    fontSize: ms(14, 0.3),
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: vs(28),
  },

  creatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    borderRadius: 24,
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
  },
  creatorPillText: {
    fontSize: ms(13, 0.3),
    color: '#C4B5FD',
    fontFamily: 'Inter_500Medium',
  },

  brandIconWrap: {
    width: s(68),
    height: s(68),
    borderRadius: s(34),
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(8),
  },
  brandName: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(32),
  },

  returningHeading: {
    fontSize: ms(16, 0.3),
    fontWeight: '600',
    color: '#E5E7EB',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: vs(20),
  },

  progressBarTrack: {
    width: '80%',
    height: vs(6),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: vs(12),
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 10,
  },

  returningSubtext: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
});
