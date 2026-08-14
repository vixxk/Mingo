import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Dimensions, Linking } from 'react-native';
import Animated, { useAnimatedRef, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { wp, hp } from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.9;
const ITEM_SPACING = wp(2);

export default function AdSlider({ ads, intervalSec = 4 }) {
  const flatListRef = useAnimatedRef();
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance interval in ms, clamped to a sane minimum of 2s (> 1s)
  const intervalMs = Math.max(2, Number(intervalSec) || 4) * 1000;

  useEffect(() => {
    if (!ads || ads.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % ads.length;
        flatListRef.current?.scrollToOffset({ offset: next * (ITEM_WIDTH + ITEM_SPACING), animated: true });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [ads, flatListRef, intervalMs]);

  const handlePress = (url) => {
    if (!url || url === '#') {
      console.warn('No link provided for this ad');
      return;
    }
    Linking.openURL(url).catch(err => console.warn("Couldn't open URL:", err));
  };

  if (!ads || ads.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={ads}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2 }}
        keyExtractor={(item) => item._id}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_SPACING));
          setCurrentIndex(index);
        }}
        onScrollEndDrag={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_SPACING));
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handlePress(item.link)}
            style={styles.itemContainer}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.arrowContainer}>
              <View style={styles.arrowCircle}>
                <Ionicons name="chevron-forward" size={wp(5)} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      {/* Pagination Dots */}
      {ads.length > 1 && (
        <View style={styles.pagination}>
          {ads.map((_, index) => {
            const isActive = currentIndex === index;
            return (
              <View
                key={`dot-${index}`}
                style={[
                  styles.dot,
                  isActive && styles.activeDot,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: hp(1),
    marginTop: hp(0.5),
    position: 'relative',
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: hp(11),
    borderRadius: wp(3.5),
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  arrowContainer: {
    position: 'absolute',
    right: wp(2),
    top: '50%',
    marginTop: -wp(2.5),
  },
  arrowCircle: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: hp(1),
    alignSelf: 'center',
    gap: wp(1.5),
  },
  dot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
    backgroundColor: '#333',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: wp(3),
  },
});
