import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { wp, hp } from '../utils/responsive';

const ShimmerBlock = ({ style, opacity }) => (
  <Animated.View style={[styles.shimmerDefault, style, { opacity }]} />
);

const PaymentsSkeletonCard = ({ opacity }) => (
  <View style={styles.paymentCard}>
    <ShimmerBlock style={styles.pDate} opacity={opacity} />
    <View style={styles.pBody}>
      <View style={styles.pInfo}>
        <ShimmerBlock style={styles.pTitle} opacity={opacity} />
        <ShimmerBlock style={styles.pSubtitle} opacity={opacity} />
      </View>
      <ShimmerBlock style={styles.pAmount} opacity={opacity} />
    </View>
    <View style={styles.pFooter}>
      <ShimmerBlock style={styles.pTxn} opacity={opacity} />
      <ShimmerBlock style={styles.pCopy} opacity={opacity} />
    </View>
  </View>
);

const SessionsSkeletonCard = ({ opacity }) => (
  <View style={styles.sessionCard}>
    <ShimmerBlock style={styles.sAvatar} opacity={opacity} />
    <View style={styles.sInfo}>
      <ShimmerBlock style={styles.sName} opacity={opacity} />
      <ShimmerBlock style={styles.sMeta} opacity={opacity} />
    </View>
    <ShimmerBlock style={styles.sDiamonds} opacity={opacity} />
  </View>
);

export default function SkeletonRecentList({ variant = 'sessions' }) {
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ShimmerBlock style={styles.sectionTitle} opacity={opacity} />
        {[1, 2, 3, 4, 5].map((i) =>
          variant === 'payments' ? (
            <PaymentsSkeletonCard key={i} opacity={opacity} />
          ) : (
            <SessionsSkeletonCard key={i} opacity={opacity} />
          )
        )}
        <View style={{ height: hp(2) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shimmerDefault: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },

  /* ═══ Section title ═══ */
  sectionTitle: {
    width: wp(35),
    height: hp(2),
    borderRadius: 6,
    marginBottom: hp(1.5),
  },

  /* ═══ Payment card skeleton ═══ */
  paymentCard: {
    backgroundColor: '#141414',
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
    marginBottom: hp(0.8),
  },
  pDate: {
    width: wp(28),
    height: hp(1.5),
    borderRadius: 4,
    marginBottom: hp(0.6),
  },
  pBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pInfo: {
    flex: 1,
    marginRight: wp(3),
  },
  pTitle: {
    width: wp(48),
    height: hp(2),
    borderRadius: 4,
    marginBottom: hp(0.5),
  },
  pSubtitle: {
    width: wp(58),
    height: hp(1.6),
    borderRadius: 4,
  },
  pAmount: {
    width: wp(11),
    height: hp(2),
    borderRadius: 4,
  },
  pFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(0.8),
    paddingTop: hp(0.8),
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
  },
  pTxn: {
    flex: 1,
    height: hp(1.5),
    borderRadius: 4,
  },
  pCopy: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
  },

  /* ═══ Session card skeleton ═══ */
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: wp(4),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  sAvatar: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(6.5),
    marginRight: wp(3),
  },
  sInfo: {
    flex: 1,
  },
  sName: {
    width: wp(42),
    height: hp(2.2),
    borderRadius: 4,
    marginBottom: hp(0.5),
  },
  sMeta: {
    width: wp(55),
    height: hp(1.7),
    borderRadius: 4,
  },
  sDiamonds: {
    width: wp(13),
    height: hp(2),
    borderRadius: 4,
  },
});
