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
          <ShimmerBlock style={styles.logo} opacity={opacity} />
          <ShimmerBlock style={styles.timerCapsule} opacity={opacity} />
        </View>
        <View style={styles.headerRight}>
          <ShimmerBlock style={styles.coinBadge} opacity={opacity} />
          <ShimmerBlock style={styles.notificationBtn} opacity={opacity} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Ad Slider ── */}
        <View style={styles.adSliderWrap}>
          <ShimmerBlock style={styles.adSlider} opacity={opacity} />
        </View>

        {/* ── Mingo Mates title ── */}
        <View style={styles.sectionHeaderRow}>
          <ShimmerBlock style={styles.sectionTitle} opacity={opacity} />
        </View>

        {/* ── Mingo Mates carousel (Horizontal Cards) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.peopleCardWrapper}>
              <View style={styles.peopleCard}>
                <View style={styles.peopleImageContainer}>
                  <ShimmerBlock style={styles.fullSize} opacity={opacity} />

                  {/* Badge */}
                  <View style={styles.badgeWrapper}>
                    <View style={styles.liveBadgeShape}>
                      <ShimmerBlock style={styles.liveBadgeDot} opacity={pulseOpacity} />
                      <ShimmerBlock style={styles.liveBadgeText} opacity={pulseOpacity} />
                    </View>
                  </View>

                  {/* Name */}
                  <View style={styles.peopleNameRow}>
                    <ShimmerBlock style={styles.peopleNameText} opacity={opacity} />
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
        </ScrollView>

        {/* ── People Section (1-Column Vertical List) ── */}
        <View style={styles.sectionHeaderRow}>
          <ShimmerBlock style={[styles.sectionTitle, { width: wp(28) }]} opacity={opacity} />
        </View>

        <View style={styles.peopleListContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.peopleListItemCard}>
              {/* Top Row: Avatar + Name + Status */}
              <View style={styles.peopleListTopRow}>
                <ShimmerBlock style={styles.peopleListAvatar} opacity={opacity} />
                <View style={styles.peopleListMeta}>
                  <ShimmerBlock style={styles.peopleListNameText} opacity={opacity} />
                  <ShimmerBlock style={styles.peopleListStatusText} opacity={pulseOpacity} />
                </View>
              </View>

              {/* Actions Row: 3 Pill Buttons */}
              <View style={styles.peopleListActionsRow}>
                <ShimmerBlock style={styles.peopleListActionBtn} opacity={opacity} />
                <ShimmerBlock style={styles.peopleListActionBtn} opacity={opacity} />
                <ShimmerBlock style={styles.peopleListActionBtn} opacity={opacity} />
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: hp(12) }} />
      </ScrollView>

      {/* ── Floating Find Me bar ── */}
      <View style={styles.findMeWrapper}>
        <ShimmerBlock style={styles.findMeBar} opacity={opacity} />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  logo: {
    width: wp(38),
    height: hp(5),
    borderRadius: 4,
    marginLeft: -wp(6),
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

  /* ═══ Ad Slider ═══ */
  adSliderWrap: {
    paddingHorizontal: wp(5),
    paddingTop: hp(0.5),
    marginBottom: hp(1),
  },
  adSlider: {
    width: '100%',
    height: hp(11),
    borderRadius: wp(3.5),
  },

  /* ═══ Section title ═══ */
  sectionHeaderRow: {
    paddingHorizontal: wp(4),
    marginTop: hp(0.8),
    marginBottom: hp(0.8),
  },
  sectionTitle: {
    width: wp(35),
    height: hp(2.6),
    borderRadius: 6,
  },

  /* ═══ Mingo Mates carousel ═══ */
  carouselContainer: {
    paddingHorizontal: wp(4),
    gap: wp(3),
    paddingBottom: hp(0.8),
  },
  peopleCardWrapper: {
    width: wp(42),
  },
  peopleCard: {
    borderRadius: wp(4.5),
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  peopleImageContainer: {
    width: '100%',
    height: hp(20),
    position: 'relative',
  },

  /* badge */
  badgeWrapper: {
    position: 'absolute',
    top: hp(1.2),
    left: wp(2.5),
  },
  liveBadgeShape: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: wp(2),
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.2),
    gap: wp(1),
  },
  liveBadgeDot: {
    width: wp(1.2),
    height: wp(1.2),
    borderRadius: wp(0.6),
  },
  liveBadgeText: {
    width: wp(8),
    height: hp(1.4),
    borderRadius: 3,
  },

  /* name row */
  peopleNameRow: {
    position: 'absolute',
    bottom: hp(1),
    left: wp(2.5),
    right: wp(2.5),
  },
  peopleNameText: {
    width: wp(22),
    height: hp(1.8),
    borderRadius: 4,
  },
  peopleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    backgroundColor: '#111',
  },
  peopleActionBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
  },

  /* ═══ People Vertical List ═══ */
  peopleListContainer: {
    paddingHorizontal: wp(4),
    gap: hp(1.5),
  },
  peopleListItemCard: {
    backgroundColor: '#111116',
    borderRadius: wp(4.5),
    padding: wp(3.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  peopleListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
    gap: wp(3),
  },
  peopleListAvatar: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
  },
  peopleListMeta: {
    flex: 1,
    justifyContent: 'center',
    gap: hp(0.5),
  },
  peopleListNameText: {
    width: wp(30),
    height: hp(2),
    borderRadius: 4,
  },
  peopleListStatusText: {
    width: wp(16),
    height: hp(1.4),
    borderRadius: 3,
  },
  peopleListActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  peopleListActionBtn: {
    flex: 1,
    height: hp(4),
    borderRadius: wp(3.5),
  },

  /* ═══ Find Me bar ═══ */
  findMeWrapper: {
    position: 'absolute',
    left: wp(4),
    right: wp(4),
    bottom: hp(2),
    zIndex: 50,
  },
  findMeBar: {
    width: '100%',
    height: hp(5.2),
    borderRadius: wp(7),
  },
});
