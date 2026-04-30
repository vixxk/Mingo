import React, { useRef, useEffect } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { s } from '../../utils/responsive';

const FloatingCoin = ({ style, delay }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.floatingCoin,
        style,
        { transform: [{ translateY: floatAnim }] },
      ]}
    >
      <Image
        source={require('../../images/coin for balance.png')}
        style={{ width: style.size || s(36), height: style.size || s(36) }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingCoin: {
    position: 'absolute',
    zIndex: 5,
  },
});

export default FloatingCoin;
