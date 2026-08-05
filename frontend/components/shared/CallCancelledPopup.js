import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp, hp } from '../../utils/responsive';

const CallCancelledPopup = ({ visible, message, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && opacityAnim._value === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <LinearGradient
            colors={['#1A0505', '#0A0000']}
            style={styles.content}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={ms(40)} color="#EF4444" />
            </View>

            <Text style={styles.title}>Call Cancelled</Text>
            <Text style={styles.message}>
              {message || 'This call has been cancelled by the other participant.'}
            </Text>

            <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>Okay</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(6),
  },
  container: {
    width: '100%',
    maxWidth: s(340),
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    borderRadius: ms(28),
    padding: wp(7),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    overflow: 'hidden',
  },
  iconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    color: '#fff',
    fontSize: ms(22),
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  message: {
    color: '#9CA3AF',
    fontSize: ms(14),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: hp(3),
  },
  btn: {
    width: '100%',
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
});

export default CallCancelledPopup;
