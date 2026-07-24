import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, ss, vs, vss } from '../utils/responsive';

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
    paddingHorizontal: ss(16),
  },
  profileCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingTop: vss(24),
    paddingBottom: vss(20),
    paddingHorizontal: ss(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: vss(16),
  },
  avatarRing: {
    width: ss(72),
    height: ss(72),
    borderRadius: ss(36),
    backgroundColor: '#1F2937',
    marginBottom: vss(12),
  },
  username: {
    width: ss(120),
    height: vss(18),
    borderRadius: 9,
    backgroundColor: '#1F2937',
    marginBottom: vss(8),
  },
  profileDate: {
    width: ss(160),
    height: vss(12),
    borderRadius: 6,
    backgroundColor: '#1F2937',
  },
  menuCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vss(6),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: vss(16),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vss(15),
    paddingHorizontal: ss(18),
  },
  menuIcon: {
    width: ss(22),
    height: ss(22),
    borderRadius: ss(6),
    backgroundColor: '#1F2937',
    marginRight: ss(14),
  },
  menuLabel: {
    flex: 1,
    height: vss(16),
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  chevron: {
    width: ss(12),
    height: vss(16),
    borderRadius: 4,
    backgroundColor: '#1F2937',
    marginLeft: ss(14),
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginHorizontal: ss(18),
  },
  logoutCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vss(2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
});
