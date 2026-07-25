import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { wp, hp, ss, vss } from '../utils/responsive';

const CARD_WIDTH = wp(85);
const CARD_GAP = wp(4);

const ShimmerBlock = ({ style, opacity }) => (
  <Animated.View style={[styles.shimmerDefault, style, { opacity }]} />
);

export default function HomeSkeleton() {
  const insets = useSafeAreaInsets();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.5],
  });

  const pulseOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.08, 0.45, 0.08],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ShimmerBlock style={styles.avatar} opacity={opacity} />
          <ShimmerBlock style={styles.coinBadge} opacity={opacity} />
          <ShimmerBlock style={styles.timerCapsule} opacity={opacity} />
        </View>
        <ShimmerBlock style={styles.notificationBtn} opacity={opacity} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Best Choice title ── */}
        <ShimmerBlock style={styles.sectionTitle} opacity={opacity} />

        {/* ── Best Choice carousel ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {[1, 2].map((i) => (
            <View key={i} style={styles.bestChoiceCardOuter}>
              <View style={styles.bestChoiceGradientBorder}>
                <View style={styles.bestChoiceCardInner}>
                  <ShimmerBlock style={styles.fullSize} opacity={opacity} />

                  {/* Live / Busy badge */}
                  <View style={styles.badgeWrapper}>
                    <View style={styles.liveBadgeShape}>
                      <ShimmerBlock style={styles.liveBadgeDot} opacity={pulseOpacity} />
                      <ShimmerBlock style={styles.liveBadgeText} opacity={pulseOpacity} />
                    </View>
                  </View>

                  {/* Action stack (3 buttons) */}
                  <View style={styles.actionStack}>
                    <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                    <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                    <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                  </View>

                  {/* Name row */}
                  <View style={styles.nameRow}>
                    <ShimmerBlock style={styles.nameText} opacity={opacity} />
                    <ShimmerBlock style={styles.verifiedBadge} opacity={opacity} />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ── Pagination dots ── */}
        <View style={styles.pagination}>
          <ShimmerBlock style={styles.paginationDotActive} opacity={opacity} />
          <ShimmerBlock style={styles.paginationDot} opacity={opacity} />
          <ShimmerBlock style={styles.paginationDot} opacity={opacity} />
        </View>

        {/* ── People title ── */}
        <ShimmerBlock style={[styles.sectionTitle, { width: wp(30) }]} opacity={opacity} />

        {/* ── People grid (2×2) ── */}
        <View style={styles.peopleGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.peopleCardWrapper}>
              <View style={styles.peopleCard}>
                <View style={styles.peopleImageContainer}>
                  <ShimmerBlock style={styles.fullSize} opacity={opacity} />
                  <View style={styles.peopleGradientOverlay} />

                  {/* Badge */}
                  <View style={styles.badgeWrapper}>
                    <View style={[styles.liveBadgeShape, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                      <ShimmerBlock style={styles.liveBadgeDot} opacity={pulseOpacity} />
                      <ShimmerBlock style={styles.liveBadgeText} opacity={pulseOpacity} />
                    </View>
                  </View>

                  {/* Name */}
                  <View style={styles.peopleNameRow}>
                    <ShimmerBlock style={styles.peopleNameText} opacity={opacity} />
                    <ShimmerBlock style={styles.verifiedBadge} opacity={opacity} />
                  </View>
                </View>

                {/* Action buttons */}
                <View style={styles.peopleActions}>
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: hp(22) }} />
      </ScrollView>

      {/* ── Floating Random button ── */}
      <View style={[styles.floatingRandomWrapper, { bottom: hp(18), right: wp(5) }]}>
        <ShimmerBlock style={styles.randomBtn} opacity={opacity} />
      </View>
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
  fullSize: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },

  /* ═══ Header ═══ */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  avatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
  },
  coinBadge: {
    width: wp(18),
    height: hp(3.2),
    borderRadius: wp(5),
  },
  timerCapsule: {
    width: wp(22),
    height: hp(3.2),
    borderRadius: wp(5),
  },
  notificationBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
  },

  /* ═══ Scroll area ═══ */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vss(10),
  },

  /* ═══ Section title ═══ */
  sectionTitle: {
    width: wp(40),
    height: hp(3.2),
    borderRadius: 6,
    marginHorizontal: wp(4),
    marginTop: hp(2.5),
    marginBottom: hp(1.5),
  },

  /* ═══ Best Choice carousel ═══ */
  carouselContainer: {
    paddingHorizontal: wp(4),
    gap: wp(4),
  },
  bestChoiceCardOuter: {
    width: CARD_WIDTH,
  },
  bestChoiceGradientBorder: {
    borderRadius: wp(5),
    padding: 2.5,
    backgroundColor: '#1C1C1C',
  },
  bestChoiceCardInner: {
    borderRadius: wp(4.5),
    overflow: 'hidden',
    backgroundColor: '#111',
    height: hp(25),
    position: 'relative',
  },

  /* badge — top-left capsule with dot + text */
  badgeWrapper: {
    position: 'absolute',
    top: hp(1.2),
    left: wp(2.5),
  },
  liveBadgeShape: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: wp(3),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
    gap: wp(1),
  },
  liveBadgeDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
  },
  liveBadgeText: {
    width: wp(8),
    height: hp(1.6),
    borderRadius: 3,
  },

  /* action stack — right side vertical buttons */
  actionStack: {
    position: 'absolute',
    top: '30%',
    right: wp(1.5),
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: wp(5),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(1),
    gap: hp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionCircle: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
  },

  /* name row — bottom-left */
  nameRow: {
    position: 'absolute',
    bottom: hp(1.2),
    left: wp(2.5),
    right: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  nameText: {
    width: wp(30),
    height: hp(2),
    borderRadius: 4,
  },
  verifiedBadge: {
    width: wp(4),
    height: wp(4),
    borderRadius: wp(2),
  },

  /* ═══ Pagination dots ═══ */
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(1.8),
    marginBottom: hp(1),
    gap: wp(1.5),
  },
  paginationDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
  },
  paginationDotActive: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
  },

  /* ═══ People grid ═══ */
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(3),
    gap: wp(2),
  },
  peopleCardWrapper: {
    width: wp(45),
  },
  peopleCard: {
    borderRadius: wp(5),
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
  peopleImageContainer: {
    width: '100%',
    height: hp(22),
    position: 'relative',
    overflow: 'hidden',
  },
  peopleGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: hp(8),
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  peopleNameRow: {
    position: 'absolute',
    bottom: hp(1),
    left: wp(2.5),
    right: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  peopleNameText: {
    width: wp(25),
    height: vss(1.8),
    borderRadius: 4,
  },
  peopleActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: vss(1.2),
    paddingHorizontal: ss(1),
    backgroundColor: '#111',
  },
  peopleActionBtn: {
    width: ss(9),
    height: ss(9),
    borderRadius: ss(4.5),
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },

  /* ═══ Floating Random button ═══ */
  floatingRandomWrapper: {
    position: 'absolute',
    zIndex: 50,
  },
  randomBtn: {
    width: wp(28),
    height: hp(5.5),
    borderRadius: wp(6),
  },
});
