import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, wp, hp } from '../../utils/responsive';

const { width } = Dimensions.get('window');

export default function ToastNotification({
  visible,
  message,
  type = 'success',
  onDismiss,
  duration = 2500
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible && message) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: insets.top > 0 ? insets.top + 10 : 20,
          useNativeDriver: true,
          tension: 70,
          friction: 8
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();

      timerRef.current = setTimeout(() => {
        dismissToast();
      }, duration);
    } else {
      dismissToast();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible && opacityAnim._value === 0) return null;

  const getStyleConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: 'close-circle',
          iconColor: '#EF4444',
          borderColor: 'rgba(239,68,68,0.3)',
          bgColor: '#1A0B0B'
        };
      case 'info':
        return {
          icon: 'information-circle',
          iconColor: '#3B82F6',
          borderColor: 'rgba(59,130,246,0.3)',
          bgColor: '#0B132B'
        };
      case 'success':
      default:
        return {
          icon: 'checkmark-circle',
          iconColor: '#10B981',
          borderColor: 'rgba(16,185,129,0.3)',
          bgColor: '#05120B'
        };
    }
  };

  const config = getStyleConfig();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          borderColor: config.borderColor,
          backgroundColor: config.bgColor,
        }
      ]}
    >
      <Ionicons name={config.icon} size={ms(20)} color={config.iconColor} />
      <Text style={styles.toastText} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: wp(5),
    right: wp(5),
    zIndex: 999999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 16,
    borderWidth: 1,
    gap: wp(3),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastText: {
    color: '#FFF',
    fontSize: ms(13.5),
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
});
