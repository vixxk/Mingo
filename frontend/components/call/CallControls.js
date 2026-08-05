import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp } from '../../utils/responsive';

/**
 * Shared call-control dock used by both audio and video call screens so the
 * button design and touch targets stay in sync everywhere.
 *
 * `buttons` is a list of control configs:
 *   { id, icon, iconActive, label, labelActive, active, activeColor, onPress }
 *
 * `onEndCall` / `onSafety` render the end-call and safety buttons.
 * No high z-index / elevation is baked in here — the screen positions the
 * dock, and in-call popups (recharge/gift) are layered above it.
 */
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const CallControls = ({ buttons = [], onEndCall, onSafety }) => (
  <View style={styles.wrap}>
    {onSafety && (
      <TouchableOpacity
        style={styles.safetyBtn}
        onPress={onSafety}
        activeOpacity={0.8}
        accessibilityLabel="Open safety guidance"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="shield-checkmark" size={s(20)} color="#4ADE80" />
      </TouchableOpacity>
    )}

    <View style={styles.dock}>
      {buttons.map((btn) => (
        <TouchableOpacity
          key={btn.id}
          style={styles.control}
          onPress={btn.onPress}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.controlCircle,
              btn.active && styles.controlCircleActive,
              btn.active && btn.activeColor && {
                borderColor: btn.activeColor,
                backgroundColor: hexToRgba(btn.activeColor, 0.16),
              },
            ]}
          >
            <Ionicons
              name={btn.active && btn.iconActive ? btn.iconActive : btn.icon}
              size={s(21)}
              color={btn.active ? (btn.activeColor || '#EF4444') : '#FFFFFF'}
            />
          </View>
          <Text
            style={[
              styles.controlLabel,
              btn.active && { color: btn.activeColor || '#EF4444' },
            ]}
          >
            {btn.active && btn.labelActive ? btn.labelActive : btn.label}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.endBtn}
        onPress={onEndCall}
        activeOpacity={0.85}
        accessibilityLabel="End call"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <LinearGradient
          colors={['#EF4444', '#B91C1C']}
          style={styles.endBtnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name="call"
            size={s(24)}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(12),
  },
  safetyBtn: {
    width: wp(12.5),
    height: wp(12.5),
    borderRadius: wp(6.25),
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: 'rgba(16, 16, 18, 0.78)',
    borderRadius: 44,
    paddingVertical: vs(9),
    paddingHorizontal: s(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  control: {
    alignItems: 'center',
    gap: vs(4),
  },
  controlCircle: {
    width: wp(12.5),
    height: wp(12.5),
    borderRadius: wp(6.25),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(239, 68, 68, 0.55)',
  },
  controlLabel: {
    fontSize: ms(9, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  endBtn: {
    width: wp(14.5),
    height: wp(14.5),
    borderRadius: wp(7.25),
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  endBtnGradient: {
    flex: 1,
    borderRadius: wp(7.25),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallControls;
