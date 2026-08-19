const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { uploadBase64Image, useR2, r2, cloudinary } = require('../utils/fileService');
const { authenticate } = require('../middleware/auth');
const {
  MAX_UPLOAD_BYTES,
  PRESIGNED_URL_TTL_SECONDS,
  isAllowedUploadMimeType,
  parseAndValidateImageDataUrl,
  createServerGeneratedObjectKey,
  uploadRateLimiter,
} = require('../utils/uploadSecurity');

router.use(uploadRateLimiter);

/**
 * GET /api/upload/config
 * 현재 스토리지 설정 정보 반환
 * - useServerUpload: true → R2 presigned URL로 클라이언트 직접 업로드
 * - useServerUpload: false → Cloudinary 위젯으로 직접 업로드
 */
router.get('/config', authenticate, (req, res) => {
  try {
    if (useR2) {
      // R2 사용 중 - presigned URL로 클라이언트 직접 업로드
      res.json({
        success: true,
        data: {
          storageType: 'r2',
          cloudName: null,
          uploadPreset: null,
          useServerUpload: true
        }
      });
    } else {
      // Cloudinary 설정
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset || !cloudinary.isConfigured) {
        return res.status(503).json({
          success: false,
          message: '업로드 저장소가 설정되지 않았습니다.'
        });
      }

      res.json({
        success: true,
        data: {
          storageType: 'cloudinary',
          cloudName,
          uploadPreset,
          useServerUpload: false
        }
      });
    }
  } catch (error) {
    console.error('업로드 설정 조회 오류:', error);
    res.status(503).json({
      success: false,
      message: '업로드 설정을 사용할 수 없습니다.'
    });
  }
});

/**
 * POST /api/upload/signature
 * Cloudinary 서명 생성 (Cloudinary 사용 시에만)
 */
router.post('/signature', authenticate, (req, res) => {
  try {
    if (useR2) {
      return res.status(400).json({
        success: false,
        message: 'R2 스토리지에서는 서명이 필요하지 않습니다. presigned URL을 사용하세요.'
      });
    }

    const paramsToSign = req.body;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiSecret || !cloudinary.isConfigured) {
      return res.status(503).json({
        success: false,
        message: '업로드 서명 서비스를 사용할 수 없습니다.'
      });
    }

    // 서명에 포함할 파라미터만 필터링
    const paramsToSignFiltered = { ...paramsToSign };
    delete paramsToSignFiltered.file;
    delete paramsToSignFiltered.cloud_name;
    delete paramsToSignFiltered.api_key;

    const paramsString = Object.keys(paramsToSignFiltered)
      .sort()
      .map(key => {
        const value = paramsToSignFiltered[key];
        if (Array.isArray(value)) {
          return value.map((v, i) => `${key}[${i}]=${v}`).join('&');
        }
        if (value === null || value === undefined) {
          return '';
        }
        return `${key}=${value}`;
      })
      .filter(str => str !== '')
      .join('&');

    const stringToSign = paramsString + apiSecret;
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    res.json({ signature });
  } catch (error) {
    console.error('서명 생성 오류:', error);
    res.status(503).json({
      success: false,
      message: '업로드 서명을 생성할 수 없습니다.'
    });
  }
});

/**
 * GET /api/upload/presigned-url
 * R2 업로드용 presigned URL 생성
 * 클라이언트가 직접 R2에 업로드할 수 있도록 함
 */
router.get('/presigned-url', authenticate, async (req, res) => {
  try {
    const { contentType, size } = req.query;

    if (!contentType || !isAllowedUploadMimeType(contentType)) {
      return res.status(400).json({
        success: false,
        message: '지원하지 않는 업로드 MIME 타입입니다.'
      });
    }

    const contentLength = Number(size);
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        success: false,
        message: `파일 크기는 1바이트 이상 ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB 이하여야 합니다.`
      });
    }

    if (!useR2) {
      return res.status(400).json({
        success: false,
        message: 'R2가 설정되지 않았습니다. Cloudinary 위젯을 사용하세요.'
      });
    }

    const normalizedContentType = contentType.trim().toLowerCase();
    // filename/folder는 클라이언트 입력으로 사용하지 않는다.
    const key = createServerGeneratedObjectKey('presigned', normalizedContentType);

    const { uploadUrl, publicUrl } = await r2.getPresignedUploadUrl(
      key,
      normalizedContentType,
      PRESIGNED_URL_TTL_SECONDS,
      contentLength
    );

    res.json({
      success: true,
      data: {
        uploadUrl,
        publicUrl,
        key,
        contentType: normalizedContentType,
        expiresIn: PRESIGNED_URL_TTL_SECONDS,
      }
    });
  } catch (error) {
    console.error('Presigned URL 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: 'Presigned URL 생성 실패',
      error: error.message
    });
  }
});

/**
 * POST /api/upload/base64
 * Base64 이미지 업로드 (서버에서 직접 R2/Cloudinary로 업로드)
 * 주로 Canvas 이미지 등 클라이언트에서 생성된 이미지용
 */
router.post('/base64', authenticate, async (req, res) => {
  try {
    const { base64Data } = req.body;

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        message: 'base64Data가 없습니다.'
      });
    }

    let image;
    try {
      image = parseAndValidateImageDataUrl(base64Data);
    } catch (validationError) {
      const status = validationError.message.includes('크기') ? 413 : 400;
      return res.status(status).json({
        success: false,
        message: validationError.message,
      });
    }

    const key = createServerGeneratedObjectKey('base64', image.mimeType);

    const url = await uploadBase64Image(key, image.dataUrl);

    res.json({
      success: true,
      data: { url }
    });
  } catch (error) {
    console.error('Base64 업로드 오류:', error);
    res.status(503).json({
      success: false,
      message: '업로드 저장소를 사용할 수 없습니다.'
    });
  }
});

module.exports = router;
