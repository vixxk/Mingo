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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ratingAPI, walletAPI, userAPI } from '../../utils/api';
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

export default function CallFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { name = 'Priya Sharma', sessionId, listenerId, callType = 'audio' } = useLocalSearchParams();
  const [rating, setRating] = useState(4);
  const [selectedTags, setSelectedTags] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewState, setViewState] = useState('form'); // 'form' | 'returning'
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [popup, setPopup] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    onClose: null,
  });
  const allowNavigationRef = useRef(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const favBusyRef = useRef(false);
  const favoriteScale = useRef(new Animated.Value(1)).current;

  const tier = getTier(rating);
  const tierInfo = TIERS[tier];
  const tagsAnim = useRef(new Animated.Value(1)).current;
  const prevTierRef = useRef(tier);

  useEffect(() => {
    if (!listenerId) return;

    let isMounted = true;
    const checkFavoriteStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData && isMounted) {
          const user = JSON.parse(userData);
          const favs = (user.favouriteListeners || []).map((f) => String(f._id || f));
          if (favs.includes(String(listenerId))) {
            setIsFavorite(true);
          }
        }

        const favRes = await userAPI.getFavourites();
        if (favRes?.data && isMounted) {
          const favIds = (favRes.data || []).map((f) => String(f._id || f.userId?._id || f));
          setIsFavorite(favIds.includes(String(listenerId)));
        }
      } catch (err) {
        console.log('Error checking favourite status:', err);
      }
    };

    checkFavoriteStatus();

    return () => {
      isMounted = false;
    };
  }, [listenerId]);

  const handleToggleFavorite = async () => {
    if (!listenerId || favBusyRef.current) return;

    favBusyRef.current = true;

    Animated.sequence([
      Animated.spring(favoriteScale, { toValue: 1.3, friction: 3, tension: 200, useNativeDriver: true }),
      Animated.spring(favoriteScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();

    const previousState = isFavorite;
    const nextState = !previousState;
    setIsFavorite(nextState);

    try {
      const res = await userAPI.toggleFavourite(listenerId);

      const isNowFav = res?.data?.isFavourite;
      if (typeof isNowFav === 'boolean') {
        setIsFavorite(isNowFav);
      }

      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          let favs = (user.favouriteListeners || []).map((f) => String(f._id || f));
          const targetIdStr = String(listenerId);
          const shouldBeFav = typeof isNowFav === 'boolean' ? isNowFav : nextState;

          if (shouldBeFav) {
            if (!favs.includes(targetIdStr)) favs.push(listenerId);
          } else {
            favs = favs.filter((id) => id !== targetIdStr);
          }
          user.favouriteListeners = favs;
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }
      } catch (e) {
        console.log('Failed to update local user fav cache:', e);
      }
    } catch (err) {
      console.error('Toggle favorite failed:', err);
      setIsFavorite(previousState);
      setPopup({
        visible: true,
        type: 'error',
        title: 'Action Failed',
        message: 'Could not update favorites. Please try again.',
      });
    } finally {
      favBusyRef.current = false;
    }
  };

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

  // Transition animation on returning to dashboard
  useEffect(() => {
    if (viewState === 'returning') {
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
      setViewState('returning');
    } catch (e) {
      console.log('Error submitting feedback:', e);
      // Even if network fails, gracefully transition to returning screen
      setViewState('returning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Step 2: Returning to your dashboard...
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
          <Image 
            source={require('../../images/Mingo Splash Text.png')} 
            style={styles.headerLogoImage} 
            resizeMode="contain" 
          />

          <Text style={styles.thanksText}>Thanks for your feedback!</Text>

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
            style={[
              styles.favoriteBtn,
              isFavorite && styles.favoriteBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={handleToggleFavorite}
          >
            <Animated.View style={{ transform: [{ scale: favoriteScale }], flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={ms(18, 0.3)}
                color={isFavorite ? '#EF4444' : '#E5E7EB'}
              />
              <Text style={[styles.favoriteText, isFavorite && styles.favoriteTextActive]}>
                {isFavorite ? 'Added to Favorites' : 'Add to Favorites'}
              </Text>
            </Animated.View>
          </TouchableOpacity>

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

  favoriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    paddingHorizontal: s(22),
    paddingVertical: vs(9),
    marginBottom: vs(16),
  },
  favoriteBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  favoriteText: {
    fontSize: ms(13, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_600SemiBold',
  },
  favoriteTextActive: {
    color: '#F87171',
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
  headerLogoImage: {
    width: s(160),
    height: vs(55),
    marginBottom: vs(12),
  },

  thanksText: {
    fontSize: ms(18, 0.3),
    fontWeight: '700',
    color: '#34D399',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: vs(28),
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
