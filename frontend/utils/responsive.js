import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const s = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

const ss = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size * 0.8;

const sss = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size * 0.65;

const vs = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

const vss = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size * 0.8;

const vsss = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size * 0.65;

const ms = (size, factor = 0.5) => {
  const scaledSize = size + (s(size) - size) * factor;
  
  if (SCREEN_WIDTH > 600) return size * 1.2;
  if (SCREEN_WIDTH < 320) return size * 0.9;
  return scaledSize;
};

const ssms = (size, factor = 0.5) => {
  const scaledSize = size + (ss(size) - size) * factor;
  
  return scaledSize;
};

const sssms = (size, factor = 0.5) => {
  const scaledSize = size + (sss(size) - size) * factor;
  
  return scaledSize;
};

const ssssms = (size, factor = 0.5) => {
  const scaledSize = size + (sss(size) - size) * factor;
  
  return scaledSize;
};

const hp = (percentage) => (SCREEN_HEIGHT * percentage) / 100;

const wp = (percentage) => (SCREEN_WIDTH * percentage) / 100;

const isTablet = SCREEN_WIDTH > 600;

const isSmallPhone = SCREEN_WIDTH < 375;

const isSmallScreen = SCREEN_WIDTH < 320;

export { 
  s, ss, sss, ssssms, vs, vss, vsss, ms, ssms, sssms, hp, wp, 
  SCREEN_WIDTH, SCREEN_HEIGHT, 
  isTablet, isSmallPhone, isSmallScreen
};
