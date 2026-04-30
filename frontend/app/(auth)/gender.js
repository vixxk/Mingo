import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/responsive';

export default function GenderSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedGender, setSelectedGender] = useState('Male');
  const [selectedAvatar, setSelectedAvatar] = useState(0);

  const maleAvatars = [
    require('../../images/male_avatar_1_1776972918440.png'),
    require('../../images/male_avatar_2_1776972933241.png'),
    require('../../images/male_avatar_3_1776972950218.png'),
    require('../../images/male_avatar_4_1776972963577.png'),
    require('../../images/male_avatar_5_1776972978900.png'),
    require('../../images/male_avatar_6_1776972993180.png'),
    require('../../images/male_avatar_7_1776973008143.png'),
    require('../../images/male_avatar_8_1776973021635.png'),
  ];

  const femaleAvatars = [
    require('../../images/female_avatar_1_1776973035859.png'),
    require('../../images/female_avatar_2_1776973050039.png'),
    require('../../images/female_avatar_3_1776973063471.png'),
    require('../../images/female_avatar_4_1776973077539.png'),
    require('../../images/female_avatar_5_1776973090730.png'),
    require('../../images/female_avatar_6_1776973108100.png'),
    require('../../images/female_avatar_7_1776973124018.png'),
    require('../../images/female_avatar_8_1776973138772.png'),
  ];

  const avatars = selectedGender === 'Male' ? maleAvatars : femaleAvatars;

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem('userGender', selectedGender);
      await AsyncStorage.setItem('userAvatarIndex', selectedAvatar.toString());
      router.push('/language');
    } catch (e) {
      console.error('Error saving gender/avatar:', e);
      router.push('/language');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Select Your Gender</Text>
          <Text style={styles.description}>
            Pick your gender and profile to make your profile unique.
          </Text>
        </View>

        {}
        <View style={styles.avatarSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.avatarScrollContent}
          >
            {avatars.map((avatar, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => setSelectedAvatar(index)}
                style={[
                  styles.avatarWrapper,
                  selectedAvatar === index && styles.activeAvatarWrapper
                ]}
              >
                <Image 
                  source={avatar} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
                {selectedAvatar === index && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {}
        <View style={styles.selectionContainer}>
          <View style={styles.genderToggle}>
            <TouchableOpacity 
              style={[styles.genderBtn, selectedGender === 'Male' && styles.activeGenderBtn]}
              onPress={() => {
                setSelectedGender('Male');
                setSelectedAvatar(0); 
              }}
            >
              <Text style={[styles.genderBtnText, selectedGender === 'Male' && styles.activeGenderBtnText]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.genderBtn, selectedGender === 'Female' && styles.activeGenderBtn]}
              onPress={() => {
                setSelectedGender('Female');
                setSelectedAvatar(0); 
              }}
            >
              <Text style={[styles.genderBtnText, selectedGender === 'Female' && styles.activeGenderBtnText]}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>

        {}
        <View style={{ flex: 1 }} />

        {}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.continueButtonContainer}
            activeOpacity={0.8}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={['#3B82F6', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.footerNote}>Gender can't be changed later!</Text>
        </View>
      </ScrollView>
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
  header: {
    paddingHorizontal: s(24),
    paddingTop: 20,
    marginBottom: vs(40),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(30),
    marginLeft: -4,
  },
  backText: {
    color: '#fff',
    fontSize: ms(16),
    marginLeft: 4,
    fontFamily: 'Inter_400Regular',
  },
  title: {
    fontSize: ms(32, 0.4),
    fontWeight: '800',
    color: '#fff',
    marginBottom: vs(12),
    fontFamily: 'Inter_900Black',
  },
  description: {
    fontSize: ms(14),
    color: '#9CA3AF',
    lineHeight: ms(20),
    fontFamily: 'Inter_400Regular',
  },
  avatarSection: {
    height: SCREEN_HEIGHT * 0.25,
    marginBottom: vs(40),
  },
  avatarScrollContent: {
    paddingHorizontal: s(24),
    alignItems: 'center',
    gap: s(20),
  },
  avatarWrapper: {
    width: s(130),
    height: s(130),
    borderRadius: s(65),
    borderWidth: 4,
    borderColor: 'transparent',
    overflow: 'visible',
    backgroundColor: '#1f2937',
  },
  activeAvatarWrapper: {
    borderColor: '#D8B4FE',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: s(65),
  },
  checkmarkContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#D8B4FE',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  selectionContainer: {
    paddingHorizontal: s(24),
    marginBottom: vs(40),
  },
  genderToggle: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 30,
    padding: 6,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  genderBtn: {
    flex: 1,
    paddingVertical: vs(14),
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGenderBtn: {
    backgroundColor: '#fff',
  },
  genderBtnText: {
    fontSize: ms(16),
    color: '#64748b',
    fontWeight: '600',
    fontFamily: 'Inter_700Bold',
  },
  activeGenderBtnText: {
    color: '#000',
  },
  footer: {
    paddingHorizontal: s(24),
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueButtonContainer: {
    width: '100%',
    height: vs(56),
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: vs(16),
  },
  continueButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  footerNote: {
    fontSize: ms(13),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
});

