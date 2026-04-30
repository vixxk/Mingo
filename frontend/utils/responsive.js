import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const s = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

const vs = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

const ms = (size, factor = 0.5) => {
  const scaledSize = size + (s(size) - size) * factor;
  
  if (SCREEN_WIDTH > 600) return size * 1.2; 
  return scaledSize;
};

const hp = (percentage) => (SCREEN_HEIGHT * percentage) / 100;

const wp = (percentage) => (SCREEN_WIDTH * percentage) / 100;

const isTablet = SCREEN_WIDTH > 600;

const isSmallPhone = SCREEN_WIDTH < 375;

export { 
  s, vs, ms, hp, wp, 
  SCREEN_WIDTH, SCREEN_HEIGHT, 
  isTablet, isSmallPhone 
};
