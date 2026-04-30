import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

export default function VideoSwitchPopup({ visible, name = 'User', onSend, onCancel }) {
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
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
      </Animated.View>
      <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#7F1D1D', '#991B1B', '#450A0A']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.popup}
        >
          {}
          <TouchableOpacity 
            style={styles.closeBtn} 
            activeOpacity={0.7} 
            onPress={onCancel}
          >
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={styles.title}>
            Requesting {name} to Switch{'\n'}to video session...
          </Text>
          <Text style={styles.subtitle}>
            You have low balance. Recharge to switch.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} activeOpacity={0.85} onPress={onSend}>
              <Text style={styles.sendText}>Send Request</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    paddingTop: vs(28),
    paddingBottom: vs(32),
    alignItems: 'center',
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
  title: {
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    lineHeight: ms(26),
    marginBottom: vs(10),
  },
  subtitle: {
    fontSize: ms(13, 0.3),
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    marginBottom: vs(22),
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: s(12),
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 26,
    paddingVertical: vs(13),
    alignItems: 'center',
  },
  cancelText: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  sendBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 26,
    paddingVertical: vs(13),
    alignItems: 'center',
  },
  sendText: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
