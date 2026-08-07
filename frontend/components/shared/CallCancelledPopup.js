import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, hp, wp } from '../../utils/responsive';

const CallCancelledPopup = ({ visible, message, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(hp(4))).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 10, tension: 30, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateAnim, { toValue: hp(4), duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && opacityAnim._value === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: translateAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#0A0000', '#1A0000', '#0A0000']}
            locations={[0, 0.5, 1]}
            style={styles.content}
          >
            <View style={styles.topSection}>
              <View style={styles.glowContainer}>
                <View style={styles.glowOuter} />
                <View style={styles.glowInner} />
                <View style={styles.iconWrapper}>
                  <Ionicons name="call-outline" size={wp(14)} color="#EF4444" />
                </View>
              </View>
              <Text style={styles.title}>Call Unavailable</Text>
              <Text style={styles.subtitle}>Unable to Connect</Text>
            </View>

            <Text style={styles.message}>
              {message || 'The call could not be connected. Please check your connection and try again.'}
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
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  container: {
    width: '100%',
    maxWidth: wp(90),
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  content: {
    borderRadius: wp(6),
    paddingHorizontal: wp(7),
    paddingVertical: hp(4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    overflow: 'hidden',
  },
  topSection: {
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  glowContainer: {
    position: 'relative',
    width: wp(28),
    height: wp(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  glowOuter: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: wp(14),
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  glowInner: {
    position: 'absolute',
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  iconWrapper: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    zIndex: 1,
  },
  title: {
    color: '#fff',
    fontSize: ms(20, 0.3),
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: hp(0.3),
  },
  subtitle: {
    color: '#EF4444',
    fontSize: ms(13, 0.3),
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    color: '#9CA3AF',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(21),
    marginBottom: hp(3),
    paddingHorizontal: wp(2),
  },
  btn: {
    width: '100%',
    borderRadius: wp(4),
    overflow: 'hidden',
    marginTop: hp(0.5),
  },
  btnGradient: {
    paddingVertical: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: ms(15, 0.3),
    fontFamily: 'Inter_700Bold',
  },
});

export default CallCancelledPopup;