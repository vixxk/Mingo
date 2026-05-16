import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  BackHandler,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, hp, wp } from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('user'); // 'user' or 'listener'
  
  const userScale = useRef(new Animated.Value(1)).current;
  const listenerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const animateSelection = (role) => {
    setSelectedRole(role);
    Animated.parallel([
      Animated.spring(userScale, {
        toValue: role === 'user' ? 1.02 : 1,
        useNativeDriver: true,
      }),
      Animated.spring(listenerScale, {
        toValue: role === 'listener' ? 1.02 : 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = () => {
    if (selectedRole === 'listener') {
      router.push('/(profile)/listener');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Journey</Text>
            <Text style={styles.subtitle}>Tell us how you'd like to experience Mingo.</Text>
          </View>

          <View style={styles.cardsContainer}>
            {}
            <Animated.View style={{ transform: [{ scale: userScale }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => animateSelection('user')}
                style={[
                  styles.card,
                  selectedRole === 'user' && styles.selectedCard
                ]}
              >
                <LinearGradient
                  colors={selectedRole === 'user' ? ['#2563EB33', '#7C3AED11'] : ['#111', '#0A0A0A']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardIconBox}>
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB']}
                      style={styles.iconCircle}
                    >
                      <Ionicons name="people" size={ms(28)} color="#fff" />
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Make New Friends</Text>
                    <Text style={styles.cardDesc}>Have meaningful conversations with amazing people.</Text>
                  </View>

                  <View style={[styles.radio, selectedRole === 'user' && styles.radioActive]}>
                    {selectedRole === 'user' && <View style={styles.radioInner} />}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {}
            <Animated.View style={{ transform: [{ scale: listenerScale }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => animateSelection('listener')}
                style={[
                  styles.card,
                  selectedRole === 'listener' && styles.selectedCard
                ]}
              >
                <LinearGradient
                  colors={selectedRole === 'listener' ? ['#D9770633', '#DC262611'] : ['#111', '#0A0A0A']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardIconBox}>
                    <LinearGradient
                      colors={['#F59E0B', '#EF4444']}
                      style={styles.iconCircle}
                    >
                      <MaterialCommunityIcons name="currency-inr" size={ms(28)} color="#fff" />
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Earn Money</Text>
                    <Text style={styles.cardDesc}>Help others by listening and get paid for your time.</Text>
                  </View>

                  <View style={[styles.radio, selectedRole === 'listener' && styles.radioActive]}>
                    {selectedRole === 'listener' && <View style={styles.radioInner} />}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleContinue}
              style={styles.continueBtnContainer}
            >
              <LinearGradient
                colors={['#3B82F6', '#EC4899', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                <Text style={styles.continueText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.footerHint}>You cannot switch your role later.</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgCircle1: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: '#3B82F6',
    top: -SCREEN_WIDTH * 0.2,
    right: -SCREEN_WIDTH * 0.2,
    opacity: 0.1,
  },
  bgCircle2: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    backgroundColor: '#A855F7',
    bottom: -SCREEN_WIDTH * 0.1,
    left: -SCREEN_WIDTH * 0.1,
    opacity: 0.1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(6),
  },
  header: {
    marginTop: hp(6),
    marginBottom: hp(5),
  },
  title: {
    fontSize: ms(34),
    fontFamily: 'Inter_900Black',
    color: '#fff',
    lineHeight: ms(42),
    marginBottom: hp(1.5),
  },
  subtitle: {
    fontSize: ms(16),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    lineHeight: ms(24),
  },
  cardsContainer: {
    gap: hp(2.5),
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  selectedCard: {
    borderColor: '#3B82F6',
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(5),
    paddingVertical: hp(3),
  },
  cardIconBox: {
    marginRight: wp(4),
  },
  iconCircle: {
    width: ms(60),
    height: ms(60),
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: ms(20),
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    lineHeight: ms(18),
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp(2),
  },
  radioActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  footer: {
    marginTop: 'auto',
    marginBottom: hp(4),
    alignItems: 'center',
  },
  continueBtnContainer: {
    width: '100%',
    height: hp(7.5),
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: hp(2),
  },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: ms(18),
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  footerHint: {
    fontSize: ms(12),
    fontFamily: 'Inter_400Regular',
    color: '#4B5563',
  },
});
