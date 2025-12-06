const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Cloudinary 설정 정보 제공 (클라이언트용)
router.get('/config', (req, res) => {
  try {
    // 환경 변수에서 Cloudinary 설정 가져오기
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned';
    
    console.log('Cloudinary Config 요청:', {
      cloudName: cloudName || 'undefined',
      uploadPreset: uploadPreset,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });
    
    if (!cloudName) {
      console.error('CLOUDINARY_CLOUD_NAME이 설정되지 않았습니다.');
      return res.status(500).json({
        success: false,
        message: 'Cloudinary cloud name이 설정되지 않았습니다. .env 파일을 확인하세요.',
        debug: {
          cloudName: cloudName,
          uploadPreset: uploadPreset,
          envKeys: Object.keys(process.env).filter(key => key.includes('CLOUDINARY'))
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        apiKey: process.env.CLOUDINARY_API_KEY // Signed preset 사용 시 필요
      }
    });
  } catch (error) {
    console.error('Cloudinary config 오류:', error);
    res.status(500).json({
      success: false,
      message: '설정 조회 실패',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Cloudinary 서명 생성
router.post('/signature', (req, res) => {
  try {
    const paramsToSign = req.body;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'L7obmbN92Io__LuP13Es7I2bZpw';
    
    console.log('서명 생성 요청:', {
      paramsCount: Object.keys(paramsToSign).length,
      hasTimestamp: !!paramsToSign.timestamp,
      hasUploadPreset: !!paramsToSign.upload_preset
    });
    
    // Cloudinary 서명 생성 (공식 방식)
    // 1. 모든 파라미터를 알파벳 순으로 정렬
    // 2. key=value 형식으로 연결 (배열은 특별 처리)
    // 3. API Secret을 추가
    // 4. SHA1 해시 생성
    
    // 서명에 포함할 파라미터만 필터링 (file, cloud_name, api_key 제외)
    const paramsToSignFiltered = { ...paramsToSign };
    delete paramsToSignFiltered.file;
    delete paramsToSignFiltered.cloud_name;
    delete paramsToSignFiltered.api_key;
    
    const paramsString = Object.keys(paramsToSignFiltered)
      .sort()
      .map(key => {
        const value = paramsToSignFiltered[key];
        // 배열인 경우 특별 처리
        if (Array.isArray(value)) {
          return value.map((v, i) => `${key}[${i}]=${v}`).join('&');
        }
        // null이나 undefined는 제외
        if (value === null || value === undefined) {
          return '';
        }
        return `${key}=${value}`;
      })
      .filter(str => str !== '') // 빈 문자열 제거
      .join('&');
    
    const stringToSign = paramsString + apiSecret;
    
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');
    
    console.log('서명 생성 완료:', {
      paramsString: paramsString.substring(0, 100) + '...',
      signatureLength: signature.length
    });
    
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

module.exports = router;

