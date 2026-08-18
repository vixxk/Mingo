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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, SCREEN_WIDTH } from '../../utils/responsive';
import { userAPI, authAPI } from '../../utils/api';
import { getAvatarUrl, AVATAR_COUNT } from '../../utils/avatars';
import StatusPopup from '../../components/shared/StatusPopup';



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
  const params = useLocalSearchParams();
  const [userRole, setUserRole] = useState('USER');
  const [selectedAvatar, setSelectedAvatar] = useState('0');
  const [username, setUsername] = useState('Userid1234');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [gender, setGender] = useState('Male');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const [focusedDobField, setFocusedDobField] = useState(null);

  const isListener = userRole === 'LISTENER' || params?.from === 'listener';

  const calculateAge = () => {
    if (!dobDay || !dobMonth || !dobYear) return null;
    const d = parseInt(dobDay.trim(), 10);
    const m = parseInt(dobMonth.trim(), 10);
    const y = parseInt(dobYear.trim(), 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return null;
    const birthDate = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  const calculatedAge = calculateAge();

  const handleDayChange = (text) => {
    if (isListener) return;
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) {
      setDobDay('');
      return;
    }
    let num = parseInt(cleaned, 10);
    if (num > 31) num = 31;

    let val = String(num);
    if (cleaned.length === 1 && num > 3) {
      val = `0${num}`;
      setDobDay(val);
      monthRef.current?.focus();
      return;
    }
    setDobDay(val);
    if (cleaned.length === 2) {
      monthRef.current?.focus();
    }
  };

  const handleDayBlur = () => {
    if (isListener) return;
    setFocusedDobField(null);
    if (!dobDay) return;
    let num = parseInt(dobDay, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 31) num = 31;
    if (dobMonth) {
      const m = parseInt(dobMonth, 10);
      const y = parseInt(dobYear, 10) || 2000;
      const maxDays = new Date(y, m, 0).getDate();
      if (num > maxDays) num = maxDays;
    }
    setDobDay(String(num).padStart(2, '0'));
  };

  const handleMonthChange = (text) => {
    if (isListener) return;
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) {
      setDobMonth('');
      return;
    }
    let num = parseInt(cleaned, 10);
    if (num > 12) num = 12;

    let val = String(num);
    if (cleaned.length === 1 && num > 1) {
      val = `0${num}`;
      setDobMonth(val);
      yearRef.current?.focus();
      return;
    }
    setDobMonth(val);
    if (cleaned.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleMonthBlur = () => {
    if (isListener) return;
    setFocusedDobField(null);
    if (!dobMonth) return;
    let num = parseInt(dobMonth, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 12) num = 12;
    setDobMonth(String(num).padStart(2, '0'));

    if (dobDay) {
      const d = parseInt(dobDay, 10);
      const y = parseInt(dobYear, 10) || 2000;
      const maxDays = new Date(y, num, 0).getDate();
      if (d > maxDays) {
        setDobDay(String(maxDays).padStart(2, '0'));
      }
    }
  };

  const handleYearChange = (text) => {
    if (isListener) return;
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) {
      setDobYear('');
      return;
    }
    const currentYear = new Date().getFullYear();
    let num = parseInt(cleaned, 10);
    if (cleaned.length === 4 && num > currentYear) {
      setDobYear(String(currentYear));
      return;
    }
    setDobYear(cleaned);
  };

  const handleYearBlur = () => {
    if (isListener) return;
    setFocusedDobField(null);
    if (!dobYear) return;
    const currentYear = new Date().getFullYear();
    let num = parseInt(dobYear, 10);
    if (isNaN(num)) return;
    if (num > currentYear) num = currentYear;
    if (num < 1900 && String(num).length === 4) num = 1900;
    setDobYear(String(num));

    if (dobDay && dobMonth) {
      const d = parseInt(dobDay, 10);
      const m = parseInt(dobMonth, 10);
      const maxDays = new Date(num, m, 0).getDate();
      if (d > maxDays) {
        setDobDay(String(maxDays).padStart(2, '0'));
      }
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [popup, setPopup] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: null,
  });

  const getFormattedDob = () => {
    if (!dobDay && !dobMonth && !dobYear) return null;
    const d = parseInt(dobDay.trim(), 10);
    const m = parseInt(dobMonth.trim(), 10);
    const y = parseInt(dobYear.trim(), 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        // 1. Load from local storage FIRST for instant UI
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj.role) setUserRole(userObj.role);
          if (userObj.gender) {
            const normalizedGender = userObj.gender.charAt(0).toUpperCase() + userObj.gender.slice(1).toLowerCase();
            setGender(normalizedGender);
          }
          if (userObj.avatarIndex !== undefined && userObj.avatarIndex !== null) {
            setSelectedAvatar(userObj.avatarIndex.toString());
          }
          if (userObj.name) setUsername(userObj.name);
          if (userObj.interests) setSelectedInterests(userObj.interests);
          if (userObj.dob) {
            const d = new Date(userObj.dob);
            if (!isNaN(d.getTime())) {
              setDobDay(String(d.getDate()).padStart(2, '0'));
              setDobMonth(String(d.getMonth() + 1).padStart(2, '0'));
              setDobYear(String(d.getFullYear()));
            }
          }
        }

        // 2. Fetch real data from API
        const res = await authAPI.me();
        if (res?.data) {
          const userObj = res.data;
          if (userObj.role) setUserRole(userObj.role);
          
          // Normalize gender, properly falling back to AsyncStorage if backend is missing it
          const localGender = await AsyncStorage.getItem('userGender');
          const rawGender = userObj.gender || localGender;
          if (rawGender) {
            const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
            setGender(normalizedGender);
            await AsyncStorage.setItem('userGender', normalizedGender);
          }
          
          const localAvatar = await AsyncStorage.getItem('userAvatarIndex');
          const avatarIndex = userObj.avatarIndex !== undefined && userObj.avatarIndex !== null 
            ? userObj.avatarIndex.toString() 
            : localAvatar;
          
          if (avatarIndex !== null) {
            setSelectedAvatar(avatarIndex);
            await AsyncStorage.setItem('userAvatarIndex', avatarIndex);
          }

          const localName = await AsyncStorage.getItem('userName');
          const nameToSet = userObj.name || localName;
          if (nameToSet) {
            setUsername(nameToSet);
            await AsyncStorage.setItem('userName', nameToSet);
          }
          
          if (userObj.interests) setSelectedInterests(userObj.interests);
          if (userObj.dob) {
            const d = new Date(userObj.dob);
            if (!isNaN(d.getTime())) {
              setDobDay(String(d.getDate()).padStart(2, '0'));
              setDobMonth(String(d.getMonth() + 1).padStart(2, '0'));
              setDobYear(String(d.getFullYear()));
            }
          }
          
          // Sync with local storage
          await AsyncStorage.setItem('user', JSON.stringify({ ...userObj, gender: rawGender || gender, avatarIndex: parseInt(avatarIndex || selectedAvatar, 10), name: nameToSet || username }));
        }
      } catch (e) {
        console.error('Error fetching live profile:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (username.length < 4) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Username must be at least 4 characters.',
        onClose: () => setPopup((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    const dobStr = getFormattedDob();
    if (!isListener && dobStr) {
      const birthDate = new Date(dobStr);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        setPopup({
          visible: true,
          type: 'error',
          title: 'Error',
          message: 'You must be at least 18 years old to use Mingo.',
          onClose: () => setPopup((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
    }

    try {
      setIsSaving(true);
      // 1. Save to Database FIRST
      const res = await userAPI.updateProfile({
        name: username,
        username: username.toLowerCase().replace(/\s/g, ''), // Ensure unique-ish username
        gender,
        dob: dobStr,
        avatarIndex: parseInt(selectedAvatar, 10),
        interests: selectedInterests,
      });

      if (res) {
        // 2. Only if DB save succeeds, update local storage
        const userStr = await AsyncStorage.getItem('user');
        let updatedUser = {};
        if (userStr) {
          updatedUser = JSON.parse(userStr);
          updatedUser.name = username;
          updatedUser.username = username.toLowerCase().replace(/\s/g, '');
          updatedUser.gender = gender;
          updatedUser.avatarIndex = parseInt(selectedAvatar, 10);
          updatedUser.interests = selectedInterests;
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }

        await AsyncStorage.setItem('userGender', gender);
        await AsyncStorage.setItem('userAvatarIndex', selectedAvatar);
        await AsyncStorage.setItem('userName', username);
        
        setPopup({
          visible: true,
          type: 'success',
          title: 'Profile Updated',
          message: 'Profile updated successfully!',
          onClose: () => {
            setPopup((prev) => ({ ...prev, visible: false }));
            router.back();
          },
        });
      }
    } catch (e) {
      console.error('Save error:', e);
      setPopup({
        visible: true,
        type: 'error',
        title: 'Error',
        message: e.message || 'Failed to save profile to database. Please check your connection.',
        onClose: () => setPopup((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const avatarCount = AVATAR_COUNT;

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
            source={{ uri: getAvatarUrl(gender, selectedAvatar) }}
            style={styles.chosenAvatar} 
          />
        </View>
        <FlatList
          data={Array.from({ length: avatarCount }, (_, i) => i)}
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
                source={{ uri: getAvatarUrl(gender, index) }}
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

        {/* Username */}
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

        {/* Date of Birth */}
        <View style={styles.dobHeaderRow}>
          <View style={styles.dobHeaderLeft}>
            <Ionicons name="calendar" size={ms(18)} color="#A855F7" />
            <Text style={styles.dobFieldLabel}>Date of Birth</Text>
          </View>
          {calculatedAge !== null ? (
            calculatedAge >= 18 ? (
              <View style={styles.ageBadgeValid}>
                <Ionicons name="checkmark-circle" size={ms(13)} color="#34D399" />
                <Text style={styles.ageBadgeValidText}>{calculatedAge} yrs old (18+)</Text>
              </View>
            ) : (
              <View style={styles.ageBadgeInvalid}>
                <Ionicons name="alert-circle" size={ms(13)} color="#EF4444" />
                <Text style={styles.ageBadgeInvalidText}>Under 18 ({calculatedAge} yrs)</Text>
              </View>
            )
          ) : (
            <View style={styles.ageBadgeReq}>
              <Text style={styles.ageBadgeReqText}>🔞 18+ Required</Text>
            </View>
          )}
        </View>

        <View style={[styles.dobContainer, isListener && { opacity: 0.6 }]}>
          {/* Day Segment */}
          <View style={styles.dobSegment}>
            <Text style={styles.dobSubLabel}>DAY</Text>
            <View
              style={[
                styles.dobInputCard,
                focusedDobField === 'day' && styles.dobInputCardFocused,
              ]}
            >
              <TextInput
                style={styles.dobInputText}
                placeholder="DD"
                placeholderTextColor="#4B5563"
                keyboardType="number-pad"
                maxLength={2}
                value={dobDay}
                editable={!isListener}
                onFocus={() => !isListener && setFocusedDobField('day')}
                onBlur={handleDayBlur}
                onChangeText={handleDayChange}
              />
            </View>
          </View>

          <Text style={styles.dobSeparator}>/</Text>

          {/* Month Segment */}
          <View style={styles.dobSegment}>
            <Text style={styles.dobSubLabel}>MONTH</Text>
            <View
              style={[
                styles.dobInputCard,
                focusedDobField === 'month' && styles.dobInputCardFocused,
              ]}
            >
              <TextInput
                ref={monthRef}
                style={styles.dobInputText}
                placeholder="MM"
                placeholderTextColor="#4B5563"
                keyboardType="number-pad"
                maxLength={2}
                value={dobMonth}
                editable={!isListener}
                onFocus={() => !isListener && setFocusedDobField('month')}
                onBlur={handleMonthBlur}
                onChangeText={handleMonthChange}
              />
            </View>
          </View>

          <Text style={styles.dobSeparator}>/</Text>

          {/* Year Segment */}
          <View style={[styles.dobSegment, { flex: 1.4 }]}>
            <Text style={styles.dobSubLabel}>YEAR</Text>
            <View
              style={[
                styles.dobInputCard,
                focusedDobField === 'year' && styles.dobInputCardFocused,
              ]}
            >
              <TextInput
                ref={yearRef}
                style={styles.dobInputText}
                placeholder="YYYY"
                placeholderTextColor="#4B5563"
                keyboardType="number-pad"
                maxLength={4}
                value={dobYear}
                editable={!isListener}
                onFocus={() => !isListener && setFocusedDobField('year')}
                onBlur={handleYearBlur}
                onChangeText={handleYearChange}
              />
            </View>
          </View>
        </View>
        <Text style={styles.fieldHint}>
          {isListener ? 'Date of Birth cannot be changed after registration.' : 'Must be 18 years or older to update profile.'}
        </Text>

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

      <StatusPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={popup.onClose}
      />
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

  dobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(20),
    marginTop: vs(16),
    marginBottom: vs(8),
  },
  dobHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  dobFieldLabel: {
    fontSize: ms(16, 0.3),
    color: '#E5E7EB',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  ageBadgeReq: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    paddingHorizontal: s(10),
    paddingVertical: vs(3),
    borderRadius: 20,
  },
  ageBadgeReqText: {
    color: '#F87171',
    fontSize: ms(11, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },
  ageBadgeValid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: s(10),
    paddingVertical: vs(3),
    borderRadius: 20,
  },
  ageBadgeValidText: {
    color: '#34D399',
    fontSize: ms(11, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },
  ageBadgeInvalid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    paddingHorizontal: s(10),
    paddingVertical: vs(3),
    borderRadius: 20,
  },
  ageBadgeInvalidText: {
    color: '#EF4444',
    fontSize: ms(11, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },
  dobContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: s(20),
    gap: s(6),
  },
  dobSegment: {
    flex: 1,
  },
  dobSubLabel: {
    fontSize: ms(10, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: vs(4),
    textAlign: 'center',
  },
  dobInputCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: vs(12),
    paddingHorizontal: s(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dobInputCardFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  dobInputText: {
    color: '#FFF',
    fontSize: ms(16, 0.3),
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    padding: 0,
    width: '100%',
  },
  dobSeparator: {
    color: '#4B5563',
    fontSize: ms(18, 0.3),
    fontWeight: '700',
    marginTop: vs(14),
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
