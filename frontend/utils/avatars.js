const CDN_URL = process.env.EXPO_PUBLIC_CDN_URL || 'https://starpix-media-production.s3.ap-south-1.amazonaws.com';

export const AVATAR_COUNT = 50;

export const getAvatarUrl = (gender, index) => {
  const i = Math.min(Math.max(parseInt(index, 10) || 0, 0), AVATAR_COUNT - 1);
  const g = String(gender).toLowerCase() === 'male' ? 'male' : 'female';
  return `${CDN_URL}/avatars/${g}_${i + 1}.png`;
};
