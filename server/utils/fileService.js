/**
 * 파일 스토리지 서비스 (R2 + Cloudinary 통합)
 *
 * R2 환경변수가 설정되어 있으면 R2 사용, 없으면 Cloudinary로 폴백
 */

const r2 = require('./r2');
const cloudinary = require('./cloudinary');

// 사용할 스토리지 결정
const useR2 = r2.isConfigured;
const storageType = useR2 ? 'R2' : 'Cloudinary';

console.log(`[파일서비스] ${storageType} 스토리지 사용`);

/**
 * URL이 R2 URL인지 확인
 */
const isR2Url = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('.r2.dev/') || (r2.PUBLIC_URL && url.startsWith(r2.PUBLIC_URL));
};

/**
 * URL이 Cloudinary URL인지 확인
 */
const isCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('res.cloudinary.com');
};

/**
 * Cloudinary URL에서 public_id 추출
 */
const extractCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    const pattern = /\/res\.cloudinary\.com\/[^\/]+\/([^\/]+)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?(?:\?.*)?$/;
    const match = url.match(pattern);

    if (match && match[1] && match[2]) {
      const resourceType = match[1];
      let publicId = decodeURIComponent(match[2]);
      publicId = publicId.split('?')[0];

      return {
        publicId,
        resourceType: resourceType === 'raw' ? 'raw' : 'image'
      };
    }

    return null;
  } catch (error) {
    console.error('Cloudinary public_id 추출 오류:', error);
    return null;
  }
};

/**
 * Base64 이미지 업로드
 * @param {string} key - 저장할 파일 경로/키
 * @param {string} base64Data - Base64 인코딩된 이미지
 * @returns {Promise<string>} - 공개 URL
 */
const uploadBase64Image = async (key, base64Data) => {
  if (useR2) {
    return await r2.uploadBase64Image(key, base64Data);
  } else {
    // Cloudinary 업로드
    const result = await cloudinary.cloudinary.uploader.upload(base64Data, {
      folder: key.split('/').slice(0, -1).join('/'),
      public_id: key.split('/').pop().replace(/\.[^.]+$/, ''),
      resource_type: 'image',
    });
    return result.secure_url;
  }
};

/**
 * 파일 업로드 (Buffer)
 * @param {string} key - 저장할 파일 경로
 * @param {Buffer} body - 파일 내용
 * @param {string} contentType - MIME 타입
 * @returns {Promise<string>} - 공개 URL
 */
const uploadFile = async (key, body, contentType) => {
  if (useR2) {
    return await r2.uploadFile(key, body, contentType);
  } else {
    // Cloudinary 업로드 (Buffer를 base64로 변환)
    const base64Data = `data:${contentType};base64,${body.toString('base64')}`;
    const result = await cloudinary.cloudinary.uploader.upload(base64Data, {
      folder: key.split('/').slice(0, -1).join('/'),
      resource_type: contentType.startsWith('image/') ? 'image' : 'raw',
    });
    return result.secure_url;
  }
};

/**
 * URL로 파일 삭제 (R2/Cloudinary 자동 감지)
 * @param {string} url - 삭제할 파일의 URL
 */
const deleteFileByUrl = async (url) => {
  if (!url) return;

  try {
    if (isR2Url(url)) {
      const r2Key = r2.extractKeyFromUrl(url);
      if (r2Key) {
        await r2.deleteFile(r2Key);
        console.log(`R2 파일 삭제 완료: ${r2Key}`);
      }
    } else if (isCloudinaryUrl(url)) {
      const publicIdInfo = extractCloudinaryPublicId(url);
      if (publicIdInfo && publicIdInfo.publicId) {
        await cloudinary.deleteFile(publicIdInfo.publicId, publicIdInfo.resourceType);
        console.log(`Cloudinary 파일 삭제 완료: ${publicIdInfo.publicId}`);
      }
    } else {
      console.warn(`알 수 없는 URL 형식: ${url}`);
    }
  } catch (error) {
    console.error(`파일 삭제 실패 (${url}):`, error.message);
    throw error;
  }
};

/**
 * 여러 URL의 파일들을 삭제
 * @param {string[]} urls - 삭제할 파일 URL 배열
 */
const deleteFilesByUrls = async (urls) => {
  if (!urls || !Array.isArray(urls)) return;

  const results = await Promise.allSettled(
    urls.map(url => deleteFileByUrl(url))
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`${failed.length}/${urls.length}개 파일 삭제 실패`);
  }

  return results;
};

module.exports = {
  // 설정 정보
  useR2,
  storageType,

  // URL 유틸리티
  isR2Url,
  isCloudinaryUrl,
  extractCloudinaryPublicId,

  // 업로드 함수
  uploadBase64Image,
  uploadFile,

  // 삭제 함수
  deleteFileByUrl,
  deleteFilesByUrls,

  // 개별 모듈 접근 (필요시)
  r2,
  cloudinary,
};
