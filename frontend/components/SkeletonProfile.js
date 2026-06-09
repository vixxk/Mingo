import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs } from '../utils/responsive';

export default function SkeletonProfile() {
  const insets = useSafeAreaInsets();
  const animValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + vs(12) }]}>
      {/* Profile Card Skeleton */}
      <View style={styles.profileCard}>
        <Animated.View style={[styles.avatarRing, { opacity: animValue }]} />
        <Animated.View style={[styles.username, { opacity: animValue }]} />
        <Animated.View style={[styles.profileDate, { opacity: animValue }]} />
      </View>

      {/* Menu Card Skeleton */}
      <View style={styles.menuCard}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i}>
            <View style={styles.menuItem}>
              <Animated.View style={[styles.menuIcon, { opacity: animValue }]} />
              <Animated.View style={[styles.menuLabel, { opacity: animValue }]} />
              <Animated.View style={[styles.chevron, { opacity: animValue }]} />
            </View>
            {i < 6 && <View style={styles.menuDivider} />}
          </View>
        ))}
      </View>

      {/* Logout Card Skeleton */}
      <View style={styles.logoutCard}>
        <View style={styles.menuItem}>
          <Animated.View style={[styles.menuIcon, { opacity: animValue }]} />
          <Animated.View style={[styles.menuLabel, { opacity: animValue, width: '40%' }]} />
          <Animated.View style={[styles.chevron, { opacity: animValue }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: s(16),
  },
  profileCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingTop: vs(24),
    paddingBottom: vs(20),
    paddingHorizontal: s(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: vs(16),
  },
  avatarRing: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#1F2937',
    marginBottom: vs(12),
  },
  username: {
    width: s(120),
    height: vs(18),
    borderRadius: 9,
    backgroundColor: '#1F2937',
    marginBottom: vs(8),
  },
  profileDate: {
    width: s(160),
    height: vs(12),
    borderRadius: 6,
    backgroundColor: '#1F2937',
  },
  menuCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(6),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: vs(16),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(15),
    paddingHorizontal: s(18),
  },
  menuIcon: {
    width: s(22),
    height: s(22),
    borderRadius: s(6),
    backgroundColor: '#1F2937',
    marginRight: s(14),
  },
  menuLabel: {
    flex: 1,
    height: vs(16),
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  chevron: {
    width: s(12),
    height: vs(16),
    borderRadius: 4,
    backgroundColor: '#1F2937',
    marginLeft: s(14),
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginHorizontal: s(18),
  },
  logoutCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
});
