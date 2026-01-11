/**
 * Cloudflare R2 스토리지 유틸리티
 * R2 전용 기능만 포함
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// R2 환경변수 확인
const isConfigured = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_PUBLIC_URL
);

// R2 클라이언트 설정
let s3Client = null;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (isConfigured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * 파일 업로드
 * @param {string} key - 저장할 파일 경로
 * @param {Buffer|string} body - 파일 내용
 * @param {string} contentType - MIME 타입
 * @returns {Promise<string>} - 공개 URL
 */
const uploadFile = async (key, body, contentType) => {
  if (!isConfigured) {
    throw new Error('R2가 설정되지 않았습니다.');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `${PUBLIC_URL}/${key}`;
};

/**
 * Base64 이미지를 R2에 업로드
 * @param {string} key - 저장할 파일 경로
 * @param {string} base64Data - Base64 인코딩된 이미지
 * @returns {Promise<string>} - 공개 URL
 */
const uploadBase64Image = async (key, base64Data) => {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('유효하지 않은 Base64 이미지 형식');
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  return await uploadFile(key, buffer, contentType);
};

/**
 * 파일 삭제
 * @param {string} key - 삭제할 파일 경로
 */
const deleteFile = async (key) => {
  if (!isConfigured) {
    throw new Error('R2가 설정되지 않았습니다.');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  return { success: true };
};

/**
 * Presigned URL 생성
 * @param {string} key - 업로드할 파일 경로
 * @param {string} contentType - MIME 타입
 * @param {number} expiresIn - URL 만료 시간 (초)
 * @returns {Promise<{uploadUrl: string, publicUrl: string}>}
 */
const getPresignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  if (!isConfigured) {
    throw new Error('R2가 설정되지 않았습니다.');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl };
};

/**
 * 파일 존재 여부 확인
 * @param {string} key - 파일 경로
 * @returns {Promise<boolean>}
 */
const fileExists = async (key) => {
  if (!isConfigured) {
    return false;
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * R2 URL에서 key 추출
 * @param {string} url - R2 공개 URL
 * @returns {string|null}
 */
const extractKeyFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    if (PUBLIC_URL && url.startsWith(PUBLIC_URL)) {
      return url.substring(PUBLIC_URL.length + 1);
    }

    const r2Pattern = /^https:\/\/pub-[a-z0-9]+\.r2\.dev\/(.+)$/;
    const match = url.match(r2Pattern);
    if (match) {
      return match[1];
    }

    return null;
  } catch (error) {
    console.error('R2 URL에서 key 추출 오류:', error);
    return null;
  }
};

/**
 * URL이 R2 URL인지 확인
 * @param {string} url - 확인할 URL
 * @returns {boolean}
 */
const isR2Url = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('.r2.dev/') || (PUBLIC_URL && url.startsWith(PUBLIC_URL));
};

module.exports = {
  isConfigured,
  s3Client,
  BUCKET_NAME,
  PUBLIC_URL,
  uploadFile,
  uploadBase64Image,
  deleteFile,
  getPresignedUploadUrl,
  fileExists,
  extractKeyFromUrl,
  isR2Url,
};
