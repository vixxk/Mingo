import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  FlatList,
  Image,
  ScrollView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, s, vs, SCREEN_HEIGHT, SCREEN_WIDTH } from '../../utils/responsive';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const slides = [
  {
    id: '1',
    subtitle: 'PRIVACY FIRST',
    titleLine1: 'Stay Completely',
    titleLine2Part1: '',
    titleLine2Part2: 'Anonymous ',
    description: 'No names. No identity.\nYour conversations are yours — always private.',
    image: require('../../images/Network.png'),
  },
  {
    id: '2',
    subtitle: 'EFFORTLESS EXPERIENCE',
    titleLine1: 'Start Talking',
    titleLine2Part1: 'In ',
    titleLine2Part2: 'Seconds ',
    description: 'Pick someone or get matched instantly.\nSmooth, simple, and distraction-free.',
    image: require('../../images/People.png'),
  },
  {
    id: '3',
    subtitle: 'SAFE & COMFORTABLE',
    titleLine1: 'A Space That',
    titleLine2Part1: 'Feels ',
    titleLine2Part2: 'Safe ',
    description: 'Kind people. Respectful chats.\nTalk freely without fear or judgment.',
    image: require('../../images/cartoon people.png'),
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentIndex < slides.length - 1) {
        flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      } else {
        clearInterval(timer);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.replace('/gender');
    }
  };

  const renderItem = useCallback(({ item, index }) => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <View style={styles.topSection}>
          <Animated.Image 
            source={item.image}
            style={[
              item.id === '3' ? { width: SCREEN_WIDTH * 1.1, height: SCREEN_HEIGHT * 0.5 } : styles.image,
              { transform: [{ scale }] }
            ]}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.bottomCard, { paddingBottom: Math.max(30, insets.bottom + 10) }]}>
          <ScrollView 
            style={{ width: '100%' }}
            contentContainerStyle={styles.cardScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View style={[{ opacity }, { transform: [{ translateY }], alignItems: 'center' }]}>
              <Text style={styles.subHeader}>{item.subtitle}</Text>
              
              <View style={styles.titleContainer}>
                <Text style={styles.titleLine1}>{item.titleLine1}</Text>
                <View style={styles.titleLine2Wrapper}>
                  {item.titleLine2Part1 ? <Text style={styles.titleLine2Part1}>{item.titleLine2Part1}</Text> : null}
                  <Text style={styles.titleLine2Part2}>{item.titleLine2Part2}</Text>
                </View>
              </View>
              
              <Text style={styles.description}>
                {item.description}
              </Text>
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.pagination}>
              {slides.map((_, i) => {
                const dotInputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
                const dotWidth = scrollX.interpolate({
                  inputRange: dotInputRange,
                  outputRange: [8, 32, 8],
                  extrapolate: 'clamp',
                });
                
                const dotOpacity = scrollX.interpolate({
                  inputRange: dotInputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                return (
                  <View key={i} style={styles.dotContainer}>
                    {i === currentIndex ? (
                      <AnimatedLinearGradient
                        colors={['#3B82F6', '#EC4899', '#F59E0B']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[styles.activeDot, { width: dotWidth }]}
                      />
                    ) : (
                      <Animated.View style={[styles.inactiveDot, { opacity: dotOpacity }]} />
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity 
              style={styles.nextButtonContainer} 
              activeOpacity={0.8}
              onPress={handleNext}
            >
              <LinearGradient
                colors={['#3B82F6', '#EC4899', '#F59E0B']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [currentIndex, scrollX, insets]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={slides}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        ref={flatListRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topSection: {
    height: SCREEN_HEIGHT * 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: vs(20),
  },
  image: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.45,
  },
  bottomCard: {
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#000',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingHorizontal: s(24),
    paddingTop: vs(30),
    alignItems: 'center',
  },
  cardScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: vs(20),
  },
  subHeader: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#D8B4FE',
    letterSpacing: 2,
    marginBottom: vs(10),
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily: 'Inter_500Medium',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: vs(15),
  },
  titleLine1: {
    fontSize: ms(36, 0.4),
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Inter_900Black',
    lineHeight: ms(44),
  },
  titleLine2Wrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  titleLine2Part1: {
    fontSize: ms(36, 0.4),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    lineHeight: ms(44),
  },
  titleLine2Part2: {
    fontSize: ms(36, 0.4),
    fontWeight: '400',
    color: '#fff',
    fontFamily: 'Merriweather-Italic',
    fontStyle: 'italic',
    lineHeight: ms(44),
    paddingRight: 10,
  },
  description: {
    fontSize: ms(14),
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: ms(22),
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: s(10),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingBottom: vs(10),
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    marginHorizontal: 4,
    width: 32, 
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  activeDot: {
    height: 8,
    borderRadius: 4,
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  nextButtonContainer: {
    width: SCREEN_WIDTH * 0.38,
  },
  nextButton: {
    paddingVertical: vs(18),
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});

