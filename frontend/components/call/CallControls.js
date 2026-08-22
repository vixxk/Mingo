import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

/**
 * Shared call-control dock used by both audio and video call screens so the
 * button design and touch targets stay in sync everywhere.
 *
 * `buttons` is a list of control configs:
 *   { id, icon, iconActive, label, labelActive, active, activeColor, onPress }
 *
 * `onEndCall` / `onSafety` render the end-call and safety buttons.
 */
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const AnimatedControlButton = ({ onPress, style, children, activeOpacity = 0.7, accessibilityLabel, hitSlop }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.86,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 80,
    }).start();
  };

  return (
    <TouchableOpacity
      style={style}
      onPress={(e) => { e.stopPropagation?.(); onPress?.(); }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const CallControls = ({ buttons = [], onEndCall, onSafety, flat = false }) => (
  <View style={[styles.wrap, flat && styles.wrapFlat]}>
    {onSafety && (
      <AnimatedControlButton
        style={styles.safetyBtn}
        onPress={onSafety}
        activeOpacity={0.8}
        accessibilityLabel="Open safety guidance"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="shield-checkmark" size={s(26)} color="#4ADE80" />
      </AnimatedControlButton>
    )}

    <View style={[styles.dock, flat && styles.dockFlat]}>
      {buttons.map((btn) => (
        <AnimatedControlButton
          key={btn.id}
          style={styles.control}
          onPress={btn.onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <View
            style={[
              styles.controlIconWrap,
              !flat && styles.controlCircle,
              flat && btn.active && styles.controlIconWrapActive,
              !flat && btn.active && styles.controlCircleActive,
              btn.active && btn.activeColor && {
                borderColor: btn.activeColor,
                backgroundColor: hexToRgba(btn.activeColor, 0.22),
              },
            ]}
          >
            <Ionicons
              name={btn.active && btn.iconActive ? btn.iconActive : btn.icon}
              size={s(26)}
              color={btn.active ? (btn.activeColor || '#EF4444') : '#FFFFFF'}
            />
          </View>
          <Text
            style={[
              styles.controlLabel,
              flat && styles.controlLabelFlat,
              btn.active && { color: btn.activeColor || '#EF4444' },
            ]}
            numberOfLines={1}
          >
            {btn.active && btn.labelActive ? btn.labelActive : btn.label}
          </Text>
        </AnimatedControlButton>
      ))}

      {onEndCall && (
        <AnimatedControlButton
          style={styles.control}
          onPress={onEndCall}
          activeOpacity={0.7}
          accessibilityLabel="End call"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {flat ? (
            <>
              <View style={[styles.controlIconWrap, styles.endCallIconWrap]}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.endBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="call"
                    size={s(26)}
                    color="#fff"
                    style={{ transform: [{ rotate: '135deg' }] }}
                  />
                </LinearGradient>
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
                  size={s(26)}
                  color="#fff"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </LinearGradient>
            </View>
          )}
        </AnimatedControlButton>
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
    width: '100%',
  },
  wrapFlat: {
    width: '100%',
    paddingHorizontal: s(6),
  },
  safetyBtn: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: 'rgba(16, 16, 18, 0.85)',
    borderRadius: 44,
    paddingVertical: vs(10),
    paddingHorizontal: s(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dockFlat: {
    width: '100%',
    maxWidth: s(380),
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: s(2),
    justifyContent: 'space-around',
    gap: 0,
  },
  control: {
    alignItems: 'center',
    gap: vs(6),
    minWidth: s(52),
  },
  controlIconWrap: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    backgroundColor: 'rgba(24, 24, 27, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  controlIconWrapActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: 'rgba(239, 68, 68, 0.7)',
  },
  controlCircle: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlCircleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: 'rgba(239, 68, 68, 0.7)',
  },
  endCallIconWrap: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  controlLabel: {
    fontSize: ms(11, 0.3),
    color: '#F3F4F6',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  controlLabelFlat: {
    fontSize: ms(11.5, 0.3),
    color: '#F3F4F6',
    fontFamily: 'Inter_600SemiBold',
  },
  endCallLabel: {
    color: '#EF4444',
    fontFamily: 'Inter_700Bold',
  },
  endBtn: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  endBtnGradient: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallControls;
