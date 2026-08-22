import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms, s, vs } from '../../utils/responsive';

/**
 * Real-time Network Strength Indicator component for Audio and Video Call screens.
 * 
 * Supports 4 status states matching the UI design specs:
 * 1. Strong Connection (Green - Excellent quality)
 * 2. Medium Connection (Yellow - Some fluctuations)
 * 3. Poor Connection (Red - Lag or drops likely)
 * 4. Reconnecting / Network Unstable (Pink/Red - Trying to reconnect)
 */

export const NETWORK_STATUS_CONFIG = {
  strong: {
    key: 'strong',
    label: 'Strong Connection',
    shortLabel: 'Strong',
    subtext: 'Excellent quality',
    color: '#4ADE80',
    bgColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: 'rgba(74, 222, 128, 0.4)',
    activeBars: 4,
    icon: 'cellular',
  },
  medium: {
    key: 'medium',
    label: 'Medium Connection',
    shortLabel: 'Medium',
    subtext: 'Some fluctuations',
    color: '#FBBF24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    activeBars: 2,
    icon: 'cellular',
  },
  poor: {
    key: 'poor',
    label: 'Poor Connection',
    shortLabel: 'Poor',
    subtext: 'Lag or drops likely',
    color: '#F87171',
    bgColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
    activeBars: 1,
    icon: 'cellular',
  },
  reconnecting: {
    key: 'reconnecting',
    label: 'Reconnecting / Network Unstable',
    shortLabel: 'Unstable',
    subtext: 'Trying to reconnect...',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.2)',
    borderColor: 'rgba(236, 72, 153, 0.5)',
    activeBars: 0,
    icon: 'warning',
  },
};

const SignalBars = ({ activeBars = 4, color = '#4ADE80', isReconnecting = false }) => {
  const heights = [vs(5), vs(8), vs(11), vs(14)];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReconnecting) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isReconnecting, pulseAnim]);

  if (isReconnecting) {
    return (
      <Animated.View style={[styles.signalContainer, { opacity: pulseAnim }]}>
        <Ionicons name="cloud-offline" size={s(15)} color={color} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.signalBarsRow}>
      {heights.map((h, idx) => {
        const isActive = idx < activeBars;
        return (
          <View
            key={idx}
            style={[
              styles.bar,
              {
                height: h,
                backgroundColor: isActive ? color : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
          />
        );
      })}
    </View>
  );
};

export default function NetworkQualityIndicator({
  quality = 'strong',
  compact = false,
  style,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [displayQuality, setDisplayQuality] = useState(quality);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (quality === displayQuality) return;

    // Smooth two-phase cross-fade: fade out current state -> switch data -> fade in new state smoothly
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.15,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayQuality(quality);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [quality, displayQuality, fadeAnim, scaleAnim]);

  const config = NETWORK_STATUS_CONFIG[displayQuality] || NETWORK_STATUS_CONFIG.strong;
  const isReconnecting = displayQuality === 'reconnecting';

  return (
    <>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.pillContainer,
            {
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
            },
            style,
          ]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel={`Network Quality: ${config.label}`}
        >
          <SignalBars
            activeBars={config.activeBars}
            color={config.color}
            isReconnecting={isReconnecting}
          />
          {!compact && (
            <Text style={[styles.pillText, { color: config.color }]}>
              {config.shortLabel}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Network Quality Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation?.()}>
            <View style={[styles.iconCircle, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
              <Ionicons
                name={isReconnecting ? 'cloud-offline' : 'cellular'}
                size={s(28)}
                color={config.color}
              />
            </View>

            <Text style={styles.modalTitle}>{config.label}</Text>
            <Text style={styles.modalSubtext}>{config.subtext}</Text>

            {/* Quality Guide List */}
            <View style={styles.guideContainer}>
              {Object.values(NETWORK_STATUS_CONFIG).map((item) => {
                const isSelected = item.key === quality;
                return (
                  <View
                    key={item.key}
                    style={[
                      styles.guideItem,
                      isSelected && {
                        backgroundColor: item.bgColor,
                        borderColor: item.borderColor,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.guideLeft}>
                      <View style={[styles.guideDot, { backgroundColor: item.color }]} />
                      <View style={styles.guideTextWrap}>
                        <Text style={[styles.guideTitle, isSelected && { color: '#FFFFFF', fontWeight: '700' }]}>
                          {item.label}
                        </Text>
                        <Text style={styles.guideSub}>{item.subtext}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={s(18)} color={item.color} />
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Got It</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: s(14),
    borderWidth: 1,
    gap: s(5),
  },
  signalBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: s(2),
    height: vs(14),
  },
  signalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: {
    width: s(3),
    borderRadius: s(1.5),
  },
  pillText: {
    fontSize: ms(10.5, 0.3),
    fontFamily: 'Inter_600SemiBold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(20),
  },
  modalContent: {
    width: '90%',
    maxWidth: s(360),
    backgroundColor: '#18181B',
    borderRadius: s(24),
    padding: s(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(12),
  },
  modalTitle: {
    fontSize: ms(16, 0.3),
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: vs(4),
  },
  modalSubtext: {
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: vs(16),
  },
  guideContainer: {
    width: '100%',
    gap: vs(8),
    marginBottom: vs(16),
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: vs(8),
    paddingHorizontal: s(12),
    borderRadius: s(12),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  guideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flex: 1,
  },
  guideDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
  },
  guideTextWrap: {
    flex: 1,
  },
  guideTitle: {
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_600SemiBold',
    color: '#D1D5DB',
  },
  guideSub: {
    fontSize: ms(10, 0.3),
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
  },
  closeButton: {
    width: '100%',
    paddingVertical: vs(12),
    borderRadius: s(14),
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
