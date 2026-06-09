import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { wp, hp } from '../utils/responsive';

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
        })
      ])
    ).start();
  }, []);

  // Shared synchronized opacity value for all shimmer elements
  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.6]
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      {/* Header Skeleton */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Avatar */}
          <ShimmerBlock style={styles.headerAvatar} opacity={opacity} />
          {/* Coin Badge */}
          <ShimmerBlock style={styles.headerCoinBadge} opacity={opacity} />
          {/* Timer capsule */}
          <ShimmerBlock style={styles.headerTimer} opacity={opacity} />
        </View>
        {/* Notification Button */}
        <ShimmerBlock style={styles.headerNotification} opacity={opacity} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1 Title: Best Choice */}
        <ShimmerBlock style={styles.sectionTitle} opacity={opacity} />

        {/* Best Choice Carousel Skeleton - Matching actual CARD_WIDTH wp(85) */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.carouselContainer}
        >
          {[1, 2].map((i) => (
            <View key={i} style={styles.bestChoiceCardOuter}>
              <View style={styles.bestChoiceCardInner}>
                {/* Main Card Shimmer */}
                <ShimmerBlock style={styles.fullSize} opacity={opacity} />
                
                {/* Simulated Live Badge (top left) */}
                <View style={styles.bestChoiceLiveBadgeWrapper}>
                  <ShimmerBlock style={styles.liveBadge} opacity={opacity} />
                </View>

                {/* Simulated Action Stack (right) */}
                <View style={styles.bestChoiceActionStack}>
                  <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                  <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                  <ShimmerBlock style={styles.actionCircle} opacity={opacity} />
                </View>

                {/* Simulated Name Row (bottom left) */}
                <View style={styles.bestChoiceNameRow}>
                  <ShimmerBlock style={styles.cardNameText} opacity={opacity} />
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

        {/* Section 2 Title: People You Can Talk */}
        <ShimmerBlock style={[styles.sectionTitle, styles.sectionTitleSecondary]} opacity={opacity} />

        {/* People Grid Skeleton - Matching actual grid with 2 cards per row */}
        <View style={styles.peopleGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.peopleCardWrapper}>
              <View style={styles.peopleCard}>
                {/* Image Container Area */}
                <View style={styles.peopleImageContainer}>
                  <ShimmerBlock style={styles.fullSize} opacity={opacity} />
                  
                  {/* Simulated Live Badge (top left) */}
                  <View style={styles.peopleLiveBadgeWrapper}>
                    <ShimmerBlock style={styles.liveBadge} opacity={opacity} />
                  </View>

                  {/* Simulated Name (bottom left) */}
                  <View style={styles.peopleNameRow}>
                    <ShimmerBlock style={styles.peopleNameText} opacity={opacity} />
                  </View>
                </View>

                {/* Actions row at the bottom (3 buttons matching actual peopleCard actions) */}
                <View style={styles.peopleActions}>
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                  <ShimmerBlock style={styles.peopleActionBtn} opacity={opacity} />
                </View>
              </View>
            </View>
          ))}
        </View>
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
  fullSize: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
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
  headerAvatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
  },
  headerCoinBadge: {
    width: wp(16),
    height: hp(3.2),
    borderRadius: wp(5),
  },
  headerTimer: {
    width: wp(20),
    height: hp(3.2),
    borderRadius: wp(5),
  },
  headerNotification: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(10),
  },
  sectionTitle: {
    width: wp(35),
    height: hp(3),
    borderRadius: 8,
    marginHorizontal: wp(4),
    marginTop: hp(2.5),
    marginBottom: hp(1.5),
  },
  sectionTitleSecondary: {
    width: wp(55),
    marginTop: hp(3),
  },
  carouselContainer: {
    paddingHorizontal: wp(4),
    gap: wp(4),
  },
  bestChoiceCardOuter: {
    width: wp(85),
  },
  bestChoiceCardInner: {
    borderRadius: wp(5),
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
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
  },
  bestChoiceNameRow: {
    position: 'absolute',
    bottom: hp(1.2),
    left: wp(2.5),
    right: wp(2.5),
  },
  cardNameText: {
    width: wp(35),
    height: hp(2),
    borderRadius: 4,
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
  },
  peopleNameText: {
    width: wp(25),
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
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
});
