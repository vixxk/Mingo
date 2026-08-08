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
 *
 * `flat` (used by the video-call screen) renders the buttons WITHOUT the
 * circular backgrounds and drops the dock pill. The end-call button then
 * becomes a red icon with an "End Call" label underneath, exactly matching
 * the Mute / Camera buttons.
 */
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const CallControls = ({ buttons = [], onEndCall, onSafety, flat = false }) => (
  <View style={styles.wrap}>
    {onSafety && (
      <TouchableOpacity
        style={styles.safetyBtn}
        onPress={(e) => { e.stopPropagation?.(); onSafety(); }}
        activeOpacity={0.8}
        accessibilityLabel="Open safety guidance"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="shield-checkmark" size={s(20)} color="#4ADE80" />
      </TouchableOpacity>
    )}

    <View style={[styles.dock, flat && styles.dockFlat]}>
      {buttons.map((btn) => (
        <TouchableOpacity
          key={btn.id}
          style={styles.control}
          onPress={(e) => { e.stopPropagation?.(); btn.onPress(); }}
          activeOpacity={0.7}
          hitSlop={flat ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
        >
          <View
            style={[
              styles.controlIconWrap,
              !flat && styles.controlCircle,
              !flat && btn.active && styles.controlCircleActive,
              !flat && btn.active && btn.activeColor && {
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
              flat && styles.controlLabelFlat,
              btn.active && { color: btn.activeColor || '#EF4444' },
            ]}
          >
            {btn.active && btn.labelActive ? btn.labelActive : btn.label}
          </Text>
        </TouchableOpacity>
      ))}

      {onEndCall && (
        <TouchableOpacity
          style={styles.control}
          onPress={(e) => { e.stopPropagation?.(); onEndCall(); }}
          activeOpacity={0.7}
          accessibilityLabel="End call"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {flat ? (
            <>
              {/* Flat mode — red hang-up icon + label, no background, matching
                  the Mute / Camera buttons. */}
              <View style={styles.controlIconWrap}>
                <Ionicons
                  name="call"
                  size={s(22)}
                  color="#EF4444"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </View>
              <Text style={[styles.controlLabel, styles.controlLabelFlat, styles.endCallLabel]}>
                End Call
              </Text>
            </>
          ) : (
            <View style={styles.endBtn}>
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
            </View>
          )}
        </TouchableOpacity>
      )}
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
  dockFlat: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: s(14),
  },
  control: {
    alignItems: 'center',
    gap: vs(4),
  },
  // Shared icon wrapper — in flat mode it adds a little padding so the
  // icon's touch target stays comfortable without any visible background.
  controlIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(6),
    paddingVertical: vs(4),
  },
  controlCircle: {
    width: wp(12.5),
    height: wp(12.5),
    borderRadius: wp(6.25),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 0,
    paddingVertical: 0,
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
  controlLabelFlat: {
    fontSize: ms(10.5, 0.3),
    color: '#E5E7EB',
  },
  endCallLabel: {
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
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
