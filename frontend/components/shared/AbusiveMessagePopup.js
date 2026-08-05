import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms, s, vs } from '../../utils/responsive';

/**
 * AbusiveMessagePopup
 * Shown when the sender's outgoing message contains abusive or
 * offensive language. Asks them to edit the message before sending;
 * repeat violations escalate to chat restrictions.
 */
export default function AbusiveMessagePopup({
  visible,
  onEdit,
  onCancel,
  matchedWord = null,
  severity = 'severe',
}) {
  const isSevere = severity === 'severe';
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
      </Animated.View>

      <Animated.View style={[st.modalWrap, { opacity: overlayAnim, transform: [{ scale: scaleAnim }] }]} pointerEvents="box-none">
        <View style={st.card}>
          {/* Warning icon */}
          <View style={st.iconCircle}>
            <Ionicons name="warning" size={30} color="#EF4444" />
          </View>

          <Text style={st.title}>Respectful Conversations Only</Text>
          <Text style={st.description}>
            {isSevere
              ? 'This message may contain abusive or offensive language. Please edit it before sending. Repeated violations may lead to chat restrictions.'
              : 'This message contains language that could be disrespectful. Please rephrase it before sending.'}
          </Text>

          {matchedWord ? (
            <View style={st.wordChip}>
              <Text style={st.wordChipLabel}>
                {isSevere ? 'SEVERE • DETECTED' : 'FLAGGED'}
              </Text>
              <Text style={st.wordChipValue}>“{matchedWord}”</Text>
            </View>
          ) : null}

          <View style={st.buttonRow}>
            <TouchableOpacity style={st.cancelBtn} activeOpacity={0.7} onPress={onCancel}>
              <Text style={st.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={st.editBtn} activeOpacity={0.85} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: s(6) }} />
              <Text style={st.editText}>Edit Message</Text>
            </TouchableOpacity>
          </View>

          <View style={st.footer}>
            <Ionicons name="shield-checkmark" size={14} color="#F87171" />
            <Text style={st.footerText}>Keep conversations safe and respectful.</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 1000,
  },
  modalWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    paddingHorizontal: s(28),
  },
  card: {
    width: '100%',
    maxWidth: s(340),
    backgroundColor: '#121212',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: s(22),
    paddingTop: vs(26),
    paddingBottom: vs(20),
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: s(60),
    height: s(60),
    borderRadius: s(30),
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(14),
  },
  title: {
    fontSize: ms(20, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: vs(10),
  },
  description: {
    fontSize: ms(14, 0.3),
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(21),
    marginBottom: vs(16),
  },
  wordChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: s(16),
    paddingVertical: vs(6),
    alignItems: 'center',
    marginBottom: vs(18),
  },
  wordChipLabel: {
    fontSize: ms(9, 0.3),
    color: '#F87171',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.2,
    marginBottom: vs(2),
  },
  wordChipValue: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: s(12),
    width: '100%',
    marginBottom: vs(14),
  },
  cancelBtn: {
    flex: 1,
    height: vs(50),
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelText: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  editBtn: {
    flex: 1.5,
    height: vs(50),
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  editText: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  footerText: {
    fontSize: ms(11.5, 0.3),
    color: '#F87171',
    fontFamily: 'Inter_500Medium',
  },
});
