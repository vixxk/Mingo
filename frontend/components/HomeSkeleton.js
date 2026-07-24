import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { wp, hp, ss, vss, vs } from '../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = wp(85);
const CARD_GAP = wp(4);

export default function HomeSkeleton() {
  const insets = useSafeAreaInsets();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
          easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        })
      ])
    ).start();
  }, []);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.55]
  });

  const pulseOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.5, 0.15]
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      {/* Header Skeleton */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ShimmerBlock style={styles.headerAvatar} opacity={opacity} />
          <ShimmerBlock style={styles.headerCoinBadge} opacity={opacity} />
          <ShimmerBlock style={styles.headerTimer} opacity={opacity} />
        </View>
        <ShimmerBlock style={styles.headerNotification} opacity={opacity} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Best Choice Section Title */}
        <ShimmerBlock style={styles.sectionTitle} opacity={opacity} />

        {/* Best Choice Carousel Skeleton - with gradient border effect */}
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
                  
                  {/* Simulated Live Badge (top left) */}
                  <View style={styles.bestChoiceLiveBadgeWrapper}>
                    <ShimmerBlock style={styles.liveBadge} opacity={pulseOpacity} />
                  </View>

                  {/* Simulated Action Stack (right) - 3 icons */}
                  <View style={styles.bestChoiceActionStack}>
                    <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                    <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                    <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                  </View>

                  {/* Simulated Name Row (bottom left) */}
                  <View style={styles.bestChoiceNameRow}>
                    <ShimmerBlock style={styles.cardNameText} opacity={opacity} />
                    <ShimmerBlock style={styles.verifiedBadgeSkeleton} opacity={opacity} />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Pagination Dots Skeleton */}
        <View style={styles.pagination}>
          {[1, 2, 3].map((i) => (
            <ShimmerBlock key={i} style={styles.paginationDot} opacity={opacity} />
          ))}
        </View>

        {/* People Section Title */}
        <ShimmerBlock style={[styles.sectionTitle, styles.sectionTitleSecondary]} opacity={opacity} />

        {/* People Grid Skeleton - 4 cards (2x2) */}
        <View style={styles.peopleGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.peopleCardWrapper}>
              <View style={styles.peopleCard}>
                {/* Image Container Area */}
                <View style={styles.peopleImageContainer}>
                  <ShimmerBlock style={styles.fullSize} opacity={opacity} />
                  
                  {/* Gradient overlay at bottom */}
                  <View style={styles.peopleNameGradient} />
                  
                  {/* Simulated Live Badge (top left) */}
                  <View style={styles.peopleLiveBadgeWrapper}>
                    <ShimmerBlock style={styles.liveBadge} opacity={pulseOpacity} />
                  </View>

                  {/* Simulated Name (bottom left) */}
                  <View style={styles.peopleNameRow}>
                    <ShimmerBlock style={styles.peopleNameText} opacity={opacity} />
                    <ShimmerBlock style={styles.verifiedBadgeSkeleton} opacity={opacity} />
                  </View>
                </View>

                {/* Actions row at the bottom (3 buttons) */}
                <View style={styles.peopleActions}>
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Random Button Skeleton */}
        <View style={styles.floatingRandomWrapper}>
          <ShimmerBlock style={styles.randomBtnSkeleton} opacity={opacity} />
        </View>

        <View style={{ height: vs(20) }} />
      </ScrollView>
    </View>
  );
}

const ShimmerBlock = ({ style, opacity }) => {
  return (
    <Animated.View
      style={[
        styles.shimmerDefault,
        style,
        { opacity }
      ]}
    />
  );
};

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ss(4),
    paddingVertical: vss(1.5),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ss(2),
  },
  headerAvatar: {
    width: ss(10),
    height: ss(10),
    borderRadius: ss(5),
  },
  headerCoinBadge: {
    width: ss(16),
    height: vss(3.2),
    borderRadius: ss(5),
  },
  headerTimer: {
    width: ss(20),
    height: vss(3.2),
    borderRadius: ss(5),
  },
  headerNotification: {
    width: ss(10),
    height: ss(10),
    borderRadius: ss(5),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vss(10),
  },
  sectionTitle: {
    width: ss(35),
    height: vss(3),
    borderRadius: 8,
    marginHorizontal: ss(4),
    marginTop: vss(2.5),
    marginBottom: vss(1.5),
  },
  sectionTitleSecondary: {
    width: ss(55),
    marginTop: vss(3),
  },
  carouselContainer: {
    paddingHorizontal: ss(4),
    gap: ss(4),
  },
  bestChoiceCardOuter: {
    width: CARD_WIDTH,
  },
  bestChoiceGradientBorder: {
    borderRadius: wp(5),
    padding: 2.5,
    backgroundColor: 'transparent',
  },
  bestChoiceCardInner: {
    borderRadius: wp(4.5),
    overflow: 'hidden',
    backgroundColor: '#111',
    height: hp(25),
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
  bestChoiceLiveBadgeWrapper: {
    position: 'absolute',
    top: hp(1.2),
    left: wp(2.5),
  },
  liveBadge: {
    width: wp(12),
    height: hp(2.5),
    borderRadius: wp(3),
  },
  bestChoiceActionStack: {
    position: 'absolute',
    top: '30%',
    right: wp(1.5),
    borderRadius: wp(5),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(1.2),
    gap: hp(1.5),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionCircle: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
  },
  bestChoiceNameRow: {
    position: 'absolute',
    bottom: hp(1.2),
    left: wp(2.5),
    right: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  cardNameText: {
    width: wp(30),
    height: hp(2.2),
    borderRadius: 4,
  },
  verifiedBadgeSkeleton: {
    width: wp(4),
    height: wp(4),
    borderRadius: wp(2),
  },
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
  peopleNameGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: hp(8),
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  peopleLiveBadgeWrapper: {
    position: 'absolute',
    top: hp(1.2),
    left: wp(2.5),
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vss(1.2),
    paddingHorizontal: ss(3),
    backgroundColor: '#111',
  },
  peopleActionBtn: {
    width: ss(9),
    height: ss(9),
    borderRadius: ss(4.5),
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
  floatingRandomWrapper: {
    position: 'absolute',
    bottom: hp(18),
    right: wp(5),
    zIndex: 50,
  },
  randomBtnSkeleton: {
    width: wp(28),
    height: hp(5),
    borderRadius: wp(6),
  },
});