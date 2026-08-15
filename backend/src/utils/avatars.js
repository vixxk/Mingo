// Mirrors frontend/utils/avatars.js — avatar images are served from the same
// CloudFront distribution using gender + avatarIndex. Kept in sync manually;
// the native incoming-call card needs the resolved URL because it cannot run
// the frontend's getAvatarUrl().
const CLOUDFRONT_URL = 'https://d3arutsevouzgm.cloudfront.net';
const AVATAR_COUNT = 50;

const getAvatarUrl = (gender, index) => {
  const i = Math.min(Math.max(parseInt(index, 10) || 0, 0), AVATAR_COUNT - 1);
  const g = gender === 'Male' ? 'male' : 'female';
  return `${CLOUDFRONT_URL}/avatars/${g}_${i + 1}.png`;
};

module.exports = { getAvatarUrl, CLOUDFRONT_URL, AVATAR_COUNT };
