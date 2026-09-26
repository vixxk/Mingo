// Mirrors frontend/utils/avatars.js — avatar images are served from the same
// CloudFront distribution using gender + avatarIndex. Kept in sync manually;
// the native incoming-call card needs the resolved URL because it cannot run
// the frontend's getAvatarUrl().
const getBaseUrl = () => {
  if (process.env.AWS_CLOUDFRONT_URL) {
    return process.env.AWS_CLOUDFRONT_URL.replace(/\/+$/, '');
  }
  const bucket = process.env.AWS_S3_BUCKET_NAME || 'starpix-media-production';
  const region = process.env.AWS_REGION || 'ap-south-1';
  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

const AVATAR_COUNT = 50;

const getAvatarUrl = (gender, index) => {
  const i = Math.min(Math.max(parseInt(index, 10) || 0, 0), AVATAR_COUNT - 1);
  const g = String(gender).toLowerCase() === 'male' ? 'male' : 'female';
  return `${getBaseUrl()}/avatars/${g}_${i + 1}.png`;
};

module.exports = {
  getAvatarUrl,
  getBaseUrl,
  get CLOUDFRONT_URL() {
    return getBaseUrl();
  },
  AVATAR_COUNT,
};
