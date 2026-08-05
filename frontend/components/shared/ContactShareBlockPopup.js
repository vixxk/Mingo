import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

/**
 * ContactShareBlockPopup
 * Shown when a user/listener tries to send a message that contains
 * a phone number. Offers "Send without number" (strips the number
 * and keeps the rest of the message) or "Edit message".
 */
export default function ContactShareBlockPopup({
  visible,
  onCancel,
  onSendWithoutNumber,
  maskedNumber = null,
  hasContactIntent = false,
}) {
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
          {/* Close Button */}
          <TouchableOpacity style={st.closeBtn} activeOpacity={0.7} onPress={onCancel}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {/* Shield Alert Icon */}
          <View style={st.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color="#F87171" />
          </View>

          <Text style={st.title}>Phone Numbers Can't Be Shared</Text>
          <Text style={st.description}>
            For your safety, phone numbers and other contact details can't be sent in chat.{' '}
            {hasContactIntent
              ? 'Please keep all conversations on Mingo.'
              : 'Please keep the conversation on Mingo.'}
          </Text>

          {/* Masked number preview */}
          {maskedNumber ? (
            <View style={st.numberPreview}>
              <Text style={st.numberPreviewLabel}>BLOCKED NUMBER</Text>
              <Text style={st.numberPreviewValue}>{maskedNumber}</Text>
            </View>
          ) : null}

          <View style={st.buttonRow}>
            <TouchableOpacity style={st.cancelBtn} activeOpacity={0.7} onPress={onCancel}>
              <Text style={st.cancelText}>Edit Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={st.stripBtn} activeOpacity={0.85} onPress={onSendWithoutNumber}>
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                style={st.stripGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="scan-outline" size={18} color="#fff" style={{ marginRight: s(6) }} />
                <Text style={st.stripText}>Send Without Number</Text>
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
    borderColor: 'rgba(239, 68, 68, 0.35)',
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
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  title: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(10),
    textAlign: 'center',
  },
  description: {
    fontSize: ms(14, 0.3),
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(21),
    marginBottom: vs(22),
  },
  numberPreview: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 14,
    paddingHorizontal: s(20),
    paddingVertical: vs(10),
    alignItems: 'center',
    marginBottom: vs(24),
    width: '100%',
  },
  numberPreviewLabel: {
    fontSize: ms(10, 0.3),
    color: '#F87171',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.5,
    marginBottom: vs(4),
  },
  numberPreviewValue: {
    fontSize: ms(18, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
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
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  stripBtn: {
    flex: 1.4,
    height: vs(54),
    borderRadius: 16,
    overflow: 'hidden',
  },
  stripGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  stripText: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
