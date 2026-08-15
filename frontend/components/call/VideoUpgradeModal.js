import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

/**
 * Handles both sending a video upgrade request (Sender) and receiving a video upgrade request (Receiver).
 * Mode: 'request' | 'incoming' | 'pending'
 */
export default function VideoUpgradeModal({
  visible,
  mode = 'request', // 'request' | 'incoming' | 'pending'
  name = 'User',
  onSend,
  onAccept,
  onDecline,
  onCancel,
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
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
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel || onDecline} />
      </Animated.View>
      <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#1E1B4B', '#312E81', '#0F172A']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.popup}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={onCancel || onDecline}
          >
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="videocam" size={32} color="#818CF8" />
          </View>

          {mode === 'request' && (
            <>
              <Text style={styles.title}>Switch to Video Call?</Text>
              <Text style={styles.subtitle}>
                Send a request to {name} to switch this audio call to a video call (4 💎 / min).
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={onCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={onSend}>
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    style={styles.gradientBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionText}>Send Request</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'pending' && (
            <>
              <Text style={styles.title}>Request Sent</Text>
              <Text style={styles.subtitle}>
                Waiting for {name} to accept video call upgrade...
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={onCancel}>
                  <Text style={styles.cancelText}>Cancel Request</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'incoming' && (
            <>
              <Text style={styles.title}>Video Call Upgrade Request</Text>
              <Text style={styles.subtitle}>
                {name} wants to switch this call to a Video Call. Would you like to turn on your camera?
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.declineBtn} activeOpacity={0.8} onPress={onDecline}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={onAccept}>
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    style={styles.gradientBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="videocam" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionText}>Accept & Switch</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 600,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  popup: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: s(24),
    paddingTop: vs(24),
    paddingBottom: vs(32),
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  closeBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(20),
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
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(129, 140, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(14),
  },
  title: {
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_800Bold',
    textAlign: 'center',
    marginBottom: vs(8),
  },
  subtitle: {
    fontSize: ms(13, 0.3),
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    marginBottom: vs(24),
    textAlign: 'center',
    lineHeight: ms(19),
    paddingHorizontal: s(8),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: s(12),
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 26,
    paddingVertical: vs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: ms(13.5, 0.3),
    color: '#E0E7FF',
    fontFamily: 'Inter_600SemiBold',
  },
  declineBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 26,
    paddingVertical: vs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: ms(13.5, 0.3),
    color: '#F87171',
    fontFamily: 'Inter_600SemiBold',
  },
  actionBtn: {
    flex: 1.2,
    borderRadius: 26,
    overflow: 'hidden',
  },
  gradientBtn: {
    flexDirection: 'row',
    paddingVertical: vs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: ms(13.5, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
