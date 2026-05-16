import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export const Skeleton = ({ width, height, borderRadius = 8, style, color = '#1F1F1F' }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const AdminPageSkeleton = ({ type = 'list' }) => {
  if (type === 'dashboard') {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          <Skeleton width="48%" height={100} borderRadius={20} />
          <Skeleton width="48%" height={100} borderRadius={20} />
        </View>
        <Skeleton width="100%" height={120} borderRadius={24} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          <Skeleton width="48%" height={100} borderRadius={20} />
          <Skeleton width="48%" height={100} borderRadius={20} />
        </View>
        <Skeleton width="100%" height={200} borderRadius={24} style={{ marginBottom: 20 }} />
      </View>
    );
  }

  if (type === 'analytics') {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          <Skeleton width="48%" height={100} borderRadius={20} />
          <Skeleton width="48%" height={100} borderRadius={20} />
        </View>
        <Skeleton width="100%" height={220} borderRadius={24} style={{ marginBottom: 20 }} />
        <Skeleton width="100%" height={220} borderRadius={24} style={{ marginBottom: 20 }} />
      </View>
    );
  }

  if (type === 'wallet') {
    return (
      <View style={styles.container}>
        <Skeleton width={150} height={20} style={{ marginBottom: 15 }} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={120} borderRadius={20} style={{ marginBottom: 15 }} />
        ))}
        <Skeleton width="100%" height={50} borderRadius={16} style={{ marginBottom: 30 }} />
        
        <Skeleton width={150} height={20} style={{ marginBottom: 15 }} />
        <Skeleton width="100%" height={250} borderRadius={20} />
      </View>
    );
  }

  // Default List
  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={80} height={35} borderRadius={20} />
        ))}
      </View>
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 15 }} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#000',
  },
});
