import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, ss, vs, vss } from '../utils/responsive';

const ShimmerBlock = ({ style, opacity }) => (
  <Animated.View style={[styles.shimmerDefault, style, { opacity }]} />
);

export default function SkeletonProfile() {
  const insets = useSafeAreaInsets();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.5],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Profile Card ═══ */}
        <View style={styles.profileCard}>
          {/* Edit button — top-right */}
          <View style={styles.editBtn}>
            <ShimmerBlock style={styles.editIcon} opacity={opacity} />
          </View>

          {/* Avatar ring with teal border */}
          <View style={styles.avatarRing}>
            <ShimmerBlock style={styles.avatar} opacity={opacity} />
          </View>

          {/* Username */}
          <ShimmerBlock style={styles.username} opacity={opacity} />

          {/* Profile date */}
          <ShimmerBlock style={styles.profileDate} opacity={opacity} />
        </View>

        {/* ═══ Menu Card — 11 items ═══ */}
        <View style={styles.menuCard}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <View key={i}>
              <View style={styles.menuItem}>
                <ShimmerBlock style={styles.menuIcon} opacity={opacity} />
                <ShimmerBlock style={styles.menuLabel} opacity={opacity} />
                <ShimmerBlock style={styles.chevron} opacity={opacity} />
              </View>
              {i < 11 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        {/* ═══ Logout Card ═══ */}
        <View style={styles.logoutCard}>
          <View style={styles.menuItem}>
            <ShimmerBlock style={styles.menuIcon} opacity={opacity} />
            <ShimmerBlock style={[styles.menuLabel, { width: '30%' }]} opacity={opacity} />
            <ShimmerBlock style={styles.chevron} opacity={opacity} />
          </View>
        </View>

        <View style={{ height: vs(30) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  shimmerDefault: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: vs(12),
  },

  /* ═══ Profile Card ═══ */
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
    position: 'relative',
  },
  editBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(16),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    width: s(18),
    height: s(18),
    borderRadius: 4,
  },
  avatarRing: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    borderWidth: 2.5,
    borderColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(12),
  },
  avatar: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
  },
  username: {
    width: s(140),
    height: vss(18),
    borderRadius: 9,
    marginBottom: vs(8),
  },
  profileDate: {
    width: s(180),
    height: vss(12),
    borderRadius: 6,
  },

  /* ═══ Menu Card ═══ */
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
    marginRight: s(14),
  },
  menuLabel: {
    flex: 1,
    height: vss(16),
    borderRadius: 8,
  },
  chevron: {
    width: s(12),
    height: vss(16),
    borderRadius: 4,
    marginLeft: s(14),
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginHorizontal: s(18),
  },

  /* ═══ Logout Card ═══ */
  logoutCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
});
