import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, hp, wp } from '../../utils/responsive';

/**
 * End-call confirmation popup.
 *
 * All box-model measurements use hp()/wp() — percentages of screen height
 * and width — so the popup stays proportional on every device size, matching
 * the pattern used across the app's other popups.
 */
export default function EndCallPopup({ visible, onEndCall, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(hp(50))).current;
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
        Animated.timing(slideAnim, { toValue: hp(50), duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onDismiss}
        />
      </Animated.View>

      <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#450A0A', '#7F1D1D', '#000']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.popup}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={onDismiss}
          >
            <Ionicons name="close" size={ms(22)} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={ms(34)} color="#EF4444" />
          </View>

          <Text style={styles.title}>End Call Session</Text>
          <Text style={styles.description}>
            Are you sure you want to end your session? You won't be charged further once ended.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={onDismiss}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endBtn}
              activeOpacity={0.85}
              onPress={onEndCall}
            >
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                style={styles.endGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.endText}>End Call</Text>
              </LinearGradient>
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
    zIndex: 99999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  popup: {
    borderTopLeftRadius: wp(7),
    borderTopRightRadius: wp(7),
    paddingHorizontal: wp(6),
    paddingTop: hp(4),
    paddingBottom: hp(5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  closeBtn: {
    position: 'absolute',
    top: hp(2),
    right: wp(6),
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: hp(1),
  },
  description: {
    fontSize: ms(14, 0.3),
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: hp(3.5),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: wp(3),
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: hp(6.5),
    borderRadius: wp(4),
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
  endBtn: {
    flex: 1,
    height: hp(6.5),
    borderRadius: wp(4),
    overflow: 'hidden',
  },
  endGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
