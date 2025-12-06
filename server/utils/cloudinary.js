const cloudinary = require('cloudinary').v2;

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dummy',
  api_key: process.env.CLOUDINARY_API_KEY || '585725812617853',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'L7obmbN92Io__LuP13Es7I2bZpw'
});

// 파일 업로드 함수
const uploadFile = async (filePath, options = {}) => {
  try {
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
  cloudinary
};

