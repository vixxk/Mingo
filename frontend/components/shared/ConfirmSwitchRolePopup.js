import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

const { height: SH } = Dimensions.get('window');

export default function ConfirmSwitchRolePopup({ visible, targetRole, onConfirm, onCancel, loading = false }) {
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

  const isSwitchingToUser = targetRole === 'USER';

  // UI styling based on target role
  const bgColors = isSwitchingToUser 
    ? ['#172554', '#1E3A8A', '#000']  // Dark blue gradient
    : ['#451A03', '#78350F', '#000']; // Dark amber/orange gradient

  const buttonColors = isSwitchingToUser 
    ? ['#3B82F6', '#2563EB'] 
    : ['#F59E0B', '#EF4444'];

  const iconName = isSwitchingToUser ? 'people-outline' : 'headset-outline';
  const iconColor = isSwitchingToUser ? '#3B82F6' : '#F59E0B';
  const iconBg = isSwitchingToUser ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)';
  const borderCol = isSwitchingToUser ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)';

  const title = isSwitchingToUser ? 'Become a User' : 'Become a Listener';
  const description = isSwitchingToUser 
    ? 'Are you sure you want to switch to a User profile? You will not receive incoming listener calls or earn money in this mode.'
    : 'Are you sure you want to switch back to your Listener profile? You will be able to go online, receive calls, and earn money.';

  const actionText = isSwitchingToUser ? 'Switch to User' : 'Switch to Listener';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
      </Animated.View>
      <Animated.View style={[st.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={bgColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[st.popup, { borderColor: borderCol }]}
        >
          <TouchableOpacity 
            style={st.closeBtn} 
            activeOpacity={0.7} 
            onPress={onCancel}
            disabled={loading}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={[st.iconCircle, { backgroundColor: iconBg, borderColor: borderCol }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          <Text style={st.title}>{title}</Text>
          <Text style={st.description}>{description}</Text>

          <View style={st.buttonRow}>
            <TouchableOpacity 
              style={st.cancelBtn} 
              activeOpacity={0.7} 
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={st.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={st.actionBtn} 
              activeOpacity={0.85} 
              onPress={onConfirm}
              disabled={loading}
            >
              <LinearGradient
                colors={buttonColors}
                style={st.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={st.actionText}>{actionText}</Text>
                )}
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
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
    borderWidth: 1,
  },
  title: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(8),
  },
  description: {
    fontSize: ms(14, 0.3),
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(20),
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
  actionBtn: {
    flex: 1.3,
    height: vs(54),
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
