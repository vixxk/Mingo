const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const AVATARS_DIR = path.resolve(__dirname, '../Avatars');
const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL;

if (!BUCKET || !REGION || !CLOUDFRONT_URL) {
  console.error('Missing AWS env vars. Check backend/.env');
  process.exit(1);
}

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(filePath, key) {
  const fileContent = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: 'image/png',
  });
  await s3Client.send(command);
  return `${CLOUDFRONT_URL}/${key}`;
}

async function main() {
  const files = fs.readdirSync(AVATARS_DIR).filter(f => f.endsWith('.png'));

  if (files.length === 0) {
    console.log('No PNG files found in Avatars/');
    return;
  }

  console.log(`Found ${files.length} avatar images\n`);

  const results = [];

  for (const file of files) {
    const lower = file.toLowerCase();
    let gender, num;

    if (lower.includes('female')) {
      gender = 'female';
    } else if (lower.includes('male')) {
      gender = 'male';
    } else {
      console.warn(`Skipping ${file} — could not determine gender`);
      continue;
    }

    const match = file.match(/(\d+)/);
    if (!match) {
      console.warn(`Skipping ${file} — could not extract number`);
      continue;
    }
    num = parseInt(match[1], 10);
    if (num < 1 || num > 50) {
      console.warn(`Skipping ${file} — number ${num} out of range`);
      continue;
    }

    const key = `avatars/${gender}_${num}.png`;
    const filePath = path.join(AVATARS_DIR, file);

    try {
      const url = await uploadFile(filePath, key);
      results.push({ file, key, url });
      console.log(`  ✓ ${file} → ${key}`);
    } catch (err) {
      console.error(`  ✗ ${file} — ${err.message}`);
    }
  }

  console.log(`\n--- Upload complete: ${results.length}/${files.length} ---`);
  console.log('\nCloudFront URLs:');
  results.forEach(r => console.log(`  ${r.url}`));

  const avatarCount = results.filter(r => r.key.startsWith('avatars/male_')).length;
  console.log(`\nMale avatars uploaded: ${avatarCount}`);
  console.log(`Female avatars uploaded: ${results.length - avatarCount}`);
}

main().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
