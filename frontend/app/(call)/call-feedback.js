import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ms, s, vs, SCREEN_HEIGHT } from '../../utils/responsive';

import { ratingAPI } from '../../utils/api';

const TAGS = [
  'Fun Conversation',
  'Helpful Advice',
  'Friendly Listener',
  'Sweet Personality',
];

export default function CallFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = 'Priya Sharma', sessionId } = useLocalSearchParams();
  const [rating, setRating] = useState(4);
  const [selectedTags, setSelectedTags] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      router.replace('/(tabs)');
      return;
    }

    try {
      setIsSubmitting(true);
      const combinedFeedback = selectedTags.length > 0 
        ? `${selectedTags.join(', ')}. ${feedback}`
        : feedback;
        
      await ratingAPI.submit(sessionId, rating, combinedFeedback);
    } catch (e) {
      console.log('Error submitting feedback:', e);
    } finally {
      setIsSubmitting(false);
      router.replace('/(tabs)');
    }
  };

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
          {}
          <Text style={styles.heading}>
            How was your session with{'\n'}{name}?
          </Text>

          {}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                activeOpacity={0.7}
                onPress={() => setRating(star)}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color="#fff"
                />
              </TouchableOpacity>
            ))}
          </View>

          {}
          <View style={styles.tagsWrap}>
            {TAGS.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, selected && styles.tagSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {}
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

          {}
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.85}
            onPress={handleSubmit}
          >
            <Text style={styles.submitText}>Submit Feedback</Text>
          </TouchableOpacity>

          <View style={{ height: vs(40) }} />
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
  tagSelected: {
    backgroundColor: '#1F2937',
    borderColor: '#9CA3AF',
  },
  tagText: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },
  tagTextSelected: {
    color: '#fff',
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
});
