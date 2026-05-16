import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp, hp } from '../../utils/responsive';

const { height: SH } = Dimensions.get('window');

const StatusPopup = ({
  visible,
  type = 'success', // 'success', 'error', 'info', 'confirm'
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'Continue',
  cancelText = 'Cancel',
}) => {
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

  const getConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: 'close-circle',
          color: '#EF4444',
          bg: ['#1A0505', '#0A0000'],
          btnColors: ['#EF4444', '#B91C1C'],
        };
      case 'info':
        return {
          icon: 'information-circle',
          color: '#3B82F6',
          bg: ['#050A1A', '#000000'],
          btnColors: ['#3B82F6', '#1D4ED8'],
        };
      case 'confirm':
        return {
          icon: 'help-circle',
          color: '#8B5CF6',
          bg: ['#0A051A', '#000000'],
          btnColors: ['#8B5CF6', '#6D28D9'],
        };
      case 'success':
      default:
        return {
          icon: 'checkmark-circle',
          color: '#10B981',
          bg: ['#051A10', '#000000'],
          btnColors: ['#10B981', '#059669'],
        };
    }
  };

  const config = getConfig();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container, 
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={config.bg}
            style={styles.content}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
              <Ionicons name={config.icon} size={ms(40)} color={config.color} />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.actions}>
              {type === 'confirm' ? (
                <>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelText}>{cancelText}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
                    <LinearGradient
                      colors={config.btnColors}
                      style={styles.gradientBtn}
                    >
                      <Text style={styles.confirmText}>{confirmText}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.singleBtn} onPress={onClose}>
                  <LinearGradient
                    colors={config.btnColors}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.confirmText}>Okay</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
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
  },
  content: {
    borderRadius: ms(28),
    padding: wp(7),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    overflow: 'hidden',
  },
  iconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
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
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: s(12),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: hp(1.8),
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
  },
  confirmBtn: {
    flex: 1.5,
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  singleBtn: {
    width: '100%',
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  gradientBtn: {
    paddingVertical: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
});

export default StatusPopup;
