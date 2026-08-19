const cloudinary = require('cloudinary').v2;

// Cloudinary 설정은 환경변수에서만 읽는다. 일부 값이 없으면 uploader를
// 호출하지 않고 fail-closed 하여 로컬/E2E에서 외부 네트워크를 만들지 않는다.
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const isConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

const assertConfigured = () => {
  if (!isConfigured) {
    throw new Error('Cloudinary가 설정되지 않았습니다.');
  }
};

// 파일 업로드 함수
const uploadFile = async (filePath, options = {}) => {
  try {
    assertConfigured();
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      ...options
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary 업로드 실패: ${error.message}`);
  }
};

// 파일 삭제 함수
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    assertConfigured();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType // 'image', 'raw' (PDF 등), 'video' 등
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary 삭제 실패: ${error.message}`);
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  cloudinary,
  isConfigured,
  assertConfigured,
};
