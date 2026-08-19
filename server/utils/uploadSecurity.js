const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PRESIGNED_URL_TTL_SECONDS = 5 * 60;

const IMAGE_TYPES = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
});
const UPLOAD_TYPES = Object.freeze({
  ...IMAGE_TYPES,
  'application/pdf': 'pdf',
});

const isAllowedImageMimeType = (contentType) => (
  typeof contentType === 'string' && Object.prototype.hasOwnProperty.call(
    IMAGE_TYPES,
    contentType.trim().toLowerCase()
  )
);

const getImageExtension = (contentType) => {
  const normalized = typeof contentType === 'string' ? contentType.trim().toLowerCase() : '';
  return IMAGE_TYPES[normalized] || null;
};

const isAllowedUploadMimeType = (contentType) => (
  typeof contentType === 'string' && Object.prototype.hasOwnProperty.call(
    UPLOAD_TYPES,
    contentType.trim().toLowerCase()
  )
);

const getUploadExtension = (contentType) => {
  const normalized = typeof contentType === 'string' ? contentType.trim().toLowerCase() : '';
  return UPLOAD_TYPES[normalized] || null;
};

const hasExpectedImageSignature = (buffer, mimeType) => {
  if (!Buffer.isBuffer(buffer)) return false;

  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (mimeType === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
};

const parseAndValidateImageDataUrl = (dataUrl) => {
  if (typeof dataUrl !== 'string') {
    throw new Error('이미지 데이터가 문자열이 아닙니다.');
  }

  // SVG, HTML, 임의의 MIME 타입과 공백이 섞인 Base64를 허용하지 않는다.
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
  if (!match) {
    throw new Error('지원하지 않는 이미지 형식입니다. JPEG, PNG, GIF, WebP만 업로드할 수 있습니다.');
  }

  const mimeType = match[1].toLowerCase();
  const encoded = match[2];
  if (encoded.length % 4 !== 0 || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
    throw new Error('이미지 크기가 제한을 초과했습니다.');
  }

  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('이미지 크기가 제한을 초과했습니다.');
  }
  if (buffer.toString('base64') !== encoded || !hasExpectedImageSignature(buffer, mimeType)) {
    throw new Error('이미지 내용과 MIME 타입이 일치하지 않습니다.');
  }

  return {
    mimeType,
    extension: getImageExtension(mimeType),
    buffer,
    dataUrl: `data:${mimeType};base64,${encoded}`,
  };
};

const createServerGeneratedObjectKey = (scope, mimeType) => {
  const extension = getUploadExtension(mimeType);
  const prefixes = {
    base64: 'uploads/base64',
    presigned: 'uploads/presigned',
  };
  if (!extension || !Object.prototype.hasOwnProperty.call(prefixes, scope)) {
    throw new Error('업로드 경로 또는 이미지 형식이 유효하지 않습니다.');
  }

  const date = new Date().toISOString().slice(0, 10);
  return `${prefixes[scope]}/${date}/${crypto.randomUUID()}.${extension}`;
};

// 메모리 저장소를 쓰므로 외부 서비스 없이도 로컬/E2E에서 동일하게 동작한다.
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: '업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },
});

module.exports = {
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_BYTES,
  PRESIGNED_URL_TTL_SECONDS,
  getImageExtension,
  getUploadExtension,
  isAllowedImageMimeType,
  isAllowedUploadMimeType,
  parseAndValidateImageDataUrl,
  createServerGeneratedObjectKey,
  uploadRateLimiter,
};
