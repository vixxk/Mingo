import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ms, s, vs, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/responsive';

import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const languages = [
  { name: 'Hindi', symbol: 'अ' },
  { name: 'English', symbol: 'En' },
  { name: 'Telugu', symbol: '' },
  { name: 'Malayalam', symbol: '' },
  { name: 'Kannada', symbol: '' },
  { name: 'Tamil', symbol: '' },
  { name: 'Marathi', symbol: '' },
  { name: 'Punjabi', symbol: '' },
  { name: 'Bengali', symbol: '' },
  { name: 'Odia', symbol: '' },
  { name: 'Assamese', symbol: '' },
  { name: 'Gujarati', symbol: '' },
];

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const fromSettings = params.fromSettings === 'true';
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('userLanguage');
        if (saved) setSelectedLanguage(saved);
      } catch (e) {}
    };
    loadSavedLanguage();
  }, []);

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem('userLanguage', selectedLanguage);
      if (fromSettings) {
        router.back();
      } else {
        router.replace('/signup');
      }
    } catch (e) {
      console.error('Error saving language:', e);
      if (fromSettings) {
        router.back();
      } else {
        router.replace('/signup');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Select Your Language</Text>
        <Text style={styles.description}>
          Pick your regional language in which you want to speak with others.
        </Text>
      </View>

      {}
      <ScrollView 
        contentContainerStyle={styles.listContainer} 
        showsVerticalScrollIndicator={false}
      >
        {languages.map((lang) => (
          <TouchableOpacity 
            key={lang.name}
            style={[styles.langItem, selectedLanguage === lang.name && styles.activeLangItem]}
            onPress={() => setSelectedLanguage(lang.name)}
          >
            <Text style={[styles.langName, selectedLanguage === lang.name && styles.activeLangName]}>{lang.name}</Text>
            {lang.symbol ? (
              <Text style={[styles.langSymbol, selectedLanguage === lang.name && styles.activeLangSymbol]}>{lang.symbol}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {}
      <View style={[styles.footer, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
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
            <Text style={styles.continueButtonText}>{fromSettings ? 'Save' : 'Continue'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: s(24),
    paddingTop: 20,
    marginBottom: vs(20),
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
    fontSize: ms(34, 0.4),
    fontWeight: '900',
    color: '#fff',
    marginBottom: vs(12),
    fontFamily: 'Inter_900Black',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: ms(14),
    color: '#9CA3AF',
    lineHeight: ms(20),
    fontFamily: 'Inter_400Regular',
  },
  listContainer: {
    paddingHorizontal: s(24),
    paddingBottom: vs(20),
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 25,
    paddingVertical: vs(14),
    paddingHorizontal: s(24),
    marginBottom: vs(12),
  },
  activeLangItem: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  langName: {
    fontSize: ms(16),
    color: '#D1D5DB',
    fontWeight: '600',
    fontFamily: 'Inter_700Bold',
  },
  activeLangName: {
    color: '#000',
  },
  langSymbol: {
    fontSize: ms(18),
    color: '#fff',
    fontFamily: 'Inter_400Regular',
  },
  activeLangSymbol: {
    color: '#000',
  },
  footer: {
    paddingHorizontal: s(24),
    paddingTop: vs(20),
    backgroundColor: '#000',
  },
  continueButtonContainer: {
    width: '100%',
    height: vs(56),
    borderRadius: 28,
    overflow: 'hidden',
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
});

