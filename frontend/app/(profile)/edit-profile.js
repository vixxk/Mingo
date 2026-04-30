import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';

const MALE_AVATARS = [
  require('../../images/male_avatar_1_1776972918440.png'),
  require('../../images/male_avatar_2_1776972933241.png'),
  require('../../images/male_avatar_3_1776972950218.png'),
  require('../../images/male_avatar_4_1776972963577.png'),
  require('../../images/male_avatar_5_1776972978900.png'),
  require('../../images/male_avatar_6_1776972993180.png'),
  require('../../images/male_avatar_7_1776973008143.png'),
  require('../../images/male_avatar_8_1776973021635.png'),
];

const FEMALE_AVATARS = [
  require('../../images/female_avatar_1_1776973035859.png'),
  require('../../images/female_avatar_2_1776973050039.png'),
  require('../../images/female_avatar_3_1776973063471.png'),
  require('../../images/female_avatar_4_1776973077539.png'),
  require('../../images/female_avatar_5_1776973090730.png'),
  require('../../images/female_avatar_6_1776973108100.png'),
  require('../../images/female_avatar_7_1776973124018.png'),
  require('../../images/female_avatar_8_1776973138772.png'),
];

const INTERESTS = [
  { id: '1', label: 'Culture & Regional', icon: 'diamond-outline' },
  { id: '2', label: 'Career', icon: 'briefcase-outline' },
  { id: '3', label: 'Emotional & Supportive Talk', icon: 'heart-outline' },
  { id: '4', label: 'Films and Music', icon: 'musical-notes-outline' },
  { id: '5', label: 'Growth & Ideas', icon: 'bulb-outline' },
  { id: '6', label: 'Childhood and Memories', icon: 'heart-outline' },
  { id: '7', label: 'Family & Relationships', icon: 'heart-outline' },
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState('0');
  const [username, setUsername] = useState('Userid1234');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [gender, setGender] = useState('Male');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedGender = await AsyncStorage.getItem('userGender');
        const storedAvatar = await AsyncStorage.getItem('userAvatarIndex');
        const storedUsername = await AsyncStorage.getItem('userName');
        
        if (storedGender) setGender(storedGender);
        if (storedAvatar) setSelectedAvatar(storedAvatar);
        if (storedUsername) setUsername(storedUsername);
      } catch (e) {}
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem('userGender', gender);
      await AsyncStorage.setItem('userAvatarIndex', selectedAvatar);
      await AsyncStorage.setItem('userName', username);
      router.back();
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const currentAvatars = gender === 'Male' ? MALE_AVATARS : FEMALE_AVATARS;

  const toggleInterest = (id) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const AVATAR_SIZE = SCREEN_WIDTH * 0.38;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {}
        <Text style={styles.sectionLabel}>Your Avatar</Text>
        <View style={styles.chosenAvatarContainer}>
          <Image 
            source={currentAvatars[parseInt(selectedAvatar)] || currentAvatars[0]} 
            style={styles.chosenAvatar} 
          />
        </View>
        <FlatList
          data={currentAvatars}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.avatarList}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedAvatar(index.toString())}
              style={[
                styles.avatarCard,
                { width: AVATAR_SIZE, height: AVATAR_SIZE * 1.15 },
                selectedAvatar === index.toString() && styles.avatarCardSelected,
              ]}
            >
              <Image
                source={item}
                style={[styles.avatarImage, { width: AVATAR_SIZE - 8, height: AVATAR_SIZE * 1.15 - 8 }]}
                resizeMode="cover"
              />
              {selectedAvatar === index.toString() && (
                <View style={styles.avatarCheck}>
                  <Ionicons name="add-circle" size={24} color="#A855F7" />
                </View>
              )}
            </TouchableOpacity>
          )}
        />

        {}
        <Text style={styles.fieldLabel}>Username</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor="#6B7280"
            maxLength={10}
          />
        </View>
        <Text style={styles.fieldHint}>Username must be 4-10 charaters.</Text>

        {}
        <Text style={styles.fieldLabel}>Select Your Interests</Text>
        <View style={styles.chipsWrap}>
          {INTERESTS.map((item) => {
            const selected = selectedInterests.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, selected && styles.chipSelected]}
                activeOpacity={0.7}
                onPress={() => toggleInterest(item.id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={selected ? '#fff' : '#9CA3AF'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fieldHint}>Select a maximum of 4.</Text>

        {}
        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={[styles.genderRow, { opacity: 0.6 }]}>
          <View style={[styles.genderBtn, gender === 'Male' && styles.genderBtnActive]}>
            <Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>
              Male
            </Text>
          </View>
          <View style={[styles.genderBtn, gender === 'Female' && styles.genderBtnActive]}>
            <Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>
              Female
            </Text>
          </View>
        </View>
        <Text style={styles.fieldHint}>Gender cannot be changed after registration.</Text>

        <View style={{ height: vs(40) }} />
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
    paddingHorizontal: s(4),
  },
  
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: vs(10),
    gap: 4,
  },
  backText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_500Medium',
  },
  saveBtn: {
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
  },
  saveText: {
    fontSize: ms(16, 0.3),
    color: '#A855F7',
    fontFamily: 'Inter_700Bold',
  },

  
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vs(40),
  },

  
  sectionLabel: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: vs(10),
  },
  chosenAvatarContainer: {
    alignItems: 'center',
    marginBottom: vs(20),
  },
  chosenAvatar: {
    width: s(100),
    height: s(100),
    borderRadius: s(50),
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  avatarList: {
    paddingHorizontal: s(12),
    gap: s(10),
    marginBottom: vs(20),
  },
  avatarCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: '#111',
  },
  avatarCardSelected: {
    borderColor: '#F59E0B',
  },
  avatarImage: {
    borderRadius: 15,
  },
  avatarCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  
  fieldLabel: {
    fontSize: ms(16, 0.3),
    color: '#E5E7EB',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: s(20),
    marginTop: vs(16),
    marginBottom: vs(8),
  },
  fieldHint: {
    fontSize: ms(11, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: s(20),
    marginTop: vs(4),
  },
  inputWrapper: {
    marginHorizontal: s(20),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
  },
  input: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  inputReadonly: {
    fontSize: ms(15, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },

  
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: s(20),
    gap: s(8),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    gap: 6,
    backgroundColor: '#0A0A0A',
  },
  chipSelected: {
    backgroundColor: '#1F2937',
    borderColor: '#4B5563',
  },
  chipText: {
    fontSize: ms(12, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
  },
  chipTextSelected: {
    color: '#fff',
  },

  
  genderRow: {
    flexDirection: 'row',
    marginHorizontal: s(20),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  genderBtn: {
    flex: 1,
    paddingVertical: vs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#1F2937',
  },
  genderText: {
    fontSize: ms(14, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
  genderTextActive: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
