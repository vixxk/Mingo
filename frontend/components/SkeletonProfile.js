import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function SkeletonProfile() {
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

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7]
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.cover, { opacity }]} />
      <View style={styles.avatarContainer}>
        <Animated.View style={[styles.avatar, { opacity }]} />
      </View>
      <View style={styles.content}>
        <Animated.View style={[styles.title, { opacity }]} />
        <Animated.View style={[styles.subtitle, { opacity }]} />
        <View style={styles.statsRow}>
          <Animated.View style={[styles.statBox, { opacity }]} />
          <Animated.View style={[styles.statBox, { opacity }]} />
          <Animated.View style={[styles.statBox, { opacity }]} />
        </View>
        <Animated.View style={[styles.bioLine, { opacity, marginTop: 40 }]} />
        <Animated.View style={[styles.bioLine, { opacity, width: '80%' }]} />
        <Animated.View style={[styles.bioLine, { opacity, width: '60%' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cover: {
    height: 200,
    backgroundColor: '#333',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#444',
    borderWidth: 4,
    borderColor: '#000',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    width: 150,
    height: 24,
    backgroundColor: '#333',
    borderRadius: 12,
    marginBottom: 10,
  },
  subtitle: {
    width: 100,
    height: 16,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    width: width * 0.25,
    height: 70,
    backgroundColor: '#222',
    borderRadius: 12,
  },
  bioLine: {
    width: '100%',
    height: 14,
    backgroundColor: '#222',
    borderRadius: 7,
    marginBottom: 10,
  }
});
