const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a presigned upload URL for a given folder path.
 * @param {string} fileType   - MIME type (e.g. 'image/jpeg', 'video/mp4')
 * @param {string} extension  - File extension (e.g. 'jpg', 'mp4')
 * @param {string} folder     - S3 folder key prefix (default: 'listener_intros')
 * @returns {{ uploadUrl: string, fileUrl: string, key: string }}
 */
const generateUploadUrl = async (fileType, extension, folder = 'listener_intros') => {
  const key = `${folder}/${uuidv4()}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const fileUrl = `${process.env.AWS_CLOUDFRONT_URL}/${key}`;

  return { uploadUrl, fileUrl, key };
};

/**
 * Generate multiple presigned upload URLs at once.
 * @param {Array<{fileType: string, extension: string, folder?: string}>} files
 * @returns {Promise<Array<{uploadUrl: string, fileUrl: string, key: string}>>}
 */
const generateMultipleUploadUrls = async (files) => {
  const results = await Promise.all(
    files.map(({ fileType, extension, folder }) =>
      generateUploadUrl(fileType, extension, folder || 'listener_galleries')
    )
  );
  return results;
};

/**
 * Delete an object from S3 by its key.
 * @param {string} key - The S3 object key to delete
 */
const deleteObject = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
};

/**
 * Extract the S3 key from a CloudFront or S3 URL.
 * @param {string} url - Full URL from CloudFront
 * @returns {string|null} The S3 key
 */
const extractKeyFromUrl = (url) => {
  if (!url) return null;
  const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;
  if (url.startsWith(cloudFrontUrl)) {
    return url.replace(`${cloudFrontUrl}/`, '');
  }
  // Fallback: try to get path after bucket name
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.slice(1); // remove leading /
  } catch {
    return null;
  }
};

module.exports = {
  s3Client,
  generateUploadUrl,
  generateMultipleUploadUrls,
  deleteObject,
  extractKeyFromUrl,
};
