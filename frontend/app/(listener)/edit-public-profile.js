import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');

export default function EditPublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [hookline, setHookline] = useState('');
  const [about, setAbout] = useState('');
  const [tags, setTags] = useState('');
  const [mediaUrls, setMediaUrls] = useState('');

  const handleSubmit = () => {
    if (!hookline || !about) {
      Alert.alert('Incomplete', 'Please fill in the required fields.');
      return;
    }
    Alert.alert(
      'Profile Submitted',
      'Your profile details have been sent to the admin for approval. Once approved, they will appear on your public profile!',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Public Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.infoText}>
          Complete your public profile to attract more users. Your changes will be reviewed by our admin team before going live.
        </Text>

        {}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hookline *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Here to listen and help you find peace."
            placeholderTextColor="#6B7280"
            value={hookline}
            onChangeText={setHookline}
            maxLength={100}
          />
          <Text style={styles.hint}>A short catchy sentence to describe yourself.</Text>
        </View>

        {}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>About Me *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell users about your expertise, experience, and what makes you a great listener..."
            placeholderTextColor="#6B7280"
            value={about}
            onChangeText={setAbout}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expertise Tags (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Anxiety, Relationship, Career"
            placeholderTextColor="#6B7280"
            value={tags}
            onChangeText={setTags}
          />
        </View>

        {}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gallery Media URLs (comma separated)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="https://example.com/image1.jpg, https://example.com/video1.mp4"
            placeholderTextColor="#6B7280"
            value={mediaUrls}
            onChangeText={setMediaUrls}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>In the future, you will be able to upload files directly.</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.submitBtnContainer} onPress={handleSubmit}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.submitBtn}
          >
            <Text style={styles.submitBtnText}>Submit for Approval</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '4%',
    paddingVertical: '3%',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: SW * 0.045,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  scrollContent: {
    padding: '5%',
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: SW * 0.035,
    marginBottom: '8%',
    lineHeight: SW * 0.05,
    fontFamily: 'Inter_400Regular',
  },
  inputGroup: {
    marginBottom: '6%',
  },
  label: {
    color: '#E5E7EB',
    fontSize: SW * 0.038,
    fontFamily: 'Inter_500Medium',
    marginBottom: '2%',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: '4%',
    paddingVertical: '3.5%',
    fontSize: SW * 0.038,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    minHeight: SH * 0.15,
  },
  hint: {
    color: '#6B7280',
    fontSize: SW * 0.03,
    marginTop: '1.5%',
    fontFamily: 'Inter_400Regular',
  },
  submitBtnContainer: {
    marginTop: '8%',
    borderRadius: 25,
    overflow: 'hidden',
  },
  submitBtn: {
    paddingVertical: '4%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: SW * 0.04,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
