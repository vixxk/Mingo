const CLOUDFRONT_URL = 'https://d3arutsevouzgm.cloudfront.net';

export const AVATAR_COUNT = 50;

export const getAvatarUrl = (gender, index) => {
  const i = Math.min(Math.max(parseInt(index, 10) || 0, 0), AVATAR_COUNT - 1);
  const g = gender === 'Male' ? 'male' : 'female';
  return `${CLOUDFRONT_URL}/avatars/${g}_${i + 1}.png`;
};
