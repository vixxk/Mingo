import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

const { height: SH } = Dimensions.get('window');

export default function LogoutPopup({ visible, onConfirm, onCancel }) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
      </Animated.View>
      <Animated.View style={[st.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#450A0A', '#7F1D1D', '#000']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={st.popup}
        >
          {}
          <TouchableOpacity 
            style={st.closeBtn} 
            activeOpacity={0.7} 
            onPress={onCancel}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {}
          <View style={st.iconCircle}>
            <Ionicons name="log-out" size={32} color="#EF4444" />
          </View>

          <Text style={st.title}>Confirm Logout</Text>
          <Text style={st.description}>
            Are you sure you want to log out? You will need to login again to access your account.
          </Text>

          <View style={st.buttonRow}>
            <TouchableOpacity 
              style={st.cancelBtn} 
              activeOpacity={0.7} 
              onPress={onCancel}
            >
              <Text style={st.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={st.logoutBtn} 
              activeOpacity={0.85} 
              onPress={onConfirm}
            >
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                style={st.logoutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={st.logoutText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  popup: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: s(24),
    paddingTop: vs(32),
    paddingBottom: vs(40),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  closeBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(24),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(8),
  },
  description: {
    fontSize: ms(15, 0.3),
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: vs(28),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: s(12),
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: vs(54),
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  logoutBtn: {
    flex: 1,
    height: vs(54),
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
