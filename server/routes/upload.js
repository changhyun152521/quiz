const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { uploadBase64Image, useR2, r2 } = require('../utils/fileService');

/**
 * GET /api/upload/config
 * 현재 스토리지 설정 정보 반환
 * - useServerUpload: true → R2 presigned URL로 클라이언트 직접 업로드
 * - useServerUpload: false → Cloudinary 위젯으로 직접 업로드
 */
router.get('/config', (req, res) => {
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
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned';

      if (!cloudName) {
        return res.status(500).json({
          success: false,
          message: 'Cloudinary가 설정되지 않았습니다.'
        });
      }

      res.json({
        success: true,
        data: {
          storageType: 'cloudinary',
          cloudName,
          uploadPreset,
          apiKey: process.env.CLOUDINARY_API_KEY,
          useServerUpload: false
        }
      });
    }
  } catch (error) {
    console.error('업로드 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '설정 조회 실패',
      error: error.message
    });
  }
});

/**
 * POST /api/upload/signature
 * Cloudinary 서명 생성 (Cloudinary 사용 시에만)
 */
router.post('/signature', (req, res) => {
  try {
    if (useR2) {
      return res.status(400).json({
        success: false,
        message: 'R2 스토리지에서는 서명이 필요하지 않습니다. presigned URL을 사용하세요.'
      });
    }

    const paramsToSign = req.body;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiSecret) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary API Secret이 설정되지 않았습니다.'
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
    res.status(500).json({
      success: false,
      message: '서명 생성 실패',
      error: error.message
    });
  }
});

/**
 * GET /api/upload/presigned-url
 * R2 업로드용 presigned URL 생성
 * 클라이언트가 직접 R2에 업로드할 수 있도록 함
 */
router.get('/presigned-url', async (req, res) => {
  try {
    if (!useR2) {
      return res.status(400).json({
        success: false,
        message: 'R2가 설정되지 않았습니다. Cloudinary 위젯을 사용하세요.'
      });
    }

    const { filename, contentType, folder = 'uploads' } = req.query;

    if (!filename || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'filename과 contentType이 필요합니다.'
      });
    }

    // 안전한 파일명 생성
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const key = `${folder}/${timestamp}_${safeFilename}`;

    const { uploadUrl, publicUrl } = await r2.getPresignedUploadUrl(key, contentType, 3600);

    res.json({
      success: true,
      data: {
        uploadUrl,
        publicUrl,
        key
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
router.post('/base64', async (req, res) => {
  try {
    const { base64Data, folder = 'uploads', filename } = req.body;

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        message: 'base64Data가 없습니다.'
      });
    }

    const timestamp = Date.now();
    const key = `${folder}/${filename || `image_${timestamp}.png`}`;

    const url = await uploadBase64Image(key, base64Data);

    res.json({
      success: true,
      data: { url }
    });
  } catch (error) {
    console.error('Base64 업로드 오류:', error);
    res.status(500).json({
      success: false,
      message: '업로드 실패',
      error: error.message
    });
  }
});

module.exports = router;
