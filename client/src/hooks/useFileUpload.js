/**
 * 파일 업로드 훅 (R2/Cloudinary 통합)
 *
 * 서버 설정에 따라 R2 또는 Cloudinary로 파일을 업로드합니다.
 * - useServerUpload: true → R2 presigned URL로 클라이언트 직접 업로드
 * - useServerUpload: false → Cloudinary 위젯으로 직접 업로드
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { get, post } from '../utils/api';

export const useFileUpload = (onUploadSuccess) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cloudinaryWidget, setCloudinaryWidget] = useState(null);

  const fileInputRef = useRef(null);
  const currentUploadTypeRef = useRef(null);
  const currentFormIdRef = useRef(null);
  const onUploadSuccessRef = useRef(onUploadSuccess);

  // onUploadSuccess가 변경되면 ref 업데이트
  useEffect(() => {
    onUploadSuccessRef.current = onUploadSuccess;
  }, [onUploadSuccess]);

  // 설정 로드
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const response = await get('/api/upload/config');

        if (!response.ok) {
          throw new Error('업로드 설정을 가져올 수 없습니다.');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || '업로드 설정 오류');
        }

        setConfig(data.data);
        setError(null);

        // Cloudinary 사용 시 위젯 초기화
        if (!data.data.useServerUpload) {
          await initializeCloudinaryWidget(data.data);
        }
      } catch (err) {
        console.error('업로드 설정 로드 실패:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Cloudinary 스크립트 로드
  const loadCloudinaryScript = () => {
    return new Promise((resolve, reject) => {
      if (window.cloudinary) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Cloudinary 스크립트 로드 실패'));
      document.head.appendChild(script);
    });
  };

  // Cloudinary 위젯 초기화
  const initializeCloudinaryWidget = async (configData) => {
    try {
      await loadCloudinaryScript();

      const { cloudName, uploadPreset, apiKey } = configData;

      if (!cloudName) {
        throw new Error('Cloudinary가 설정되지 않았습니다.');
      }

      if (!window.cloudinary) {
        throw new Error('Cloudinary 스크립트가 로드되지 않았습니다.');
      }

      const widgetConfig = {
        cloudName,
        sources: ['local', 'camera'],
        multiple: true,
        maxFileSize: 10000000, // 10MB
        clientAllowedFormats: ['image', 'pdf']
      };

      if (!uploadPreset || uploadPreset === 'unsigned') {
        widgetConfig.uploadPreset = 'unsigned';
      } else {
        widgetConfig.uploadPreset = uploadPreset;
        widgetConfig.apiKey = apiKey;
        widgetConfig.uploadSignature = async (callback, paramsToSign) => {
          try {
            const response = await post('/api/upload/signature', paramsToSign);
            const data = await response.json();
            if (data.signature) {
              callback(data.signature);
            } else {
              callback(null);
            }
          } catch (err) {
            console.error('서명 생성 실패:', err);
            callback(null);
          }
        };
      }

      const widget = window.cloudinary.createUploadWidget(
        widgetConfig,
        (error, result) => {
          if (!error && result && result.event === 'success') {
            const fileInfo = extractFileInfo(result.info);
            if (onUploadSuccessRef.current) {
              onUploadSuccessRef.current(
                fileInfo,
                currentUploadTypeRef.current,
                currentFormIdRef.current
              );
            }
          }
        }
      );

      setCloudinaryWidget(widget);
    } catch (err) {
      console.error('Cloudinary 위젯 초기화 실패:', err);
      setError(err.message);
    }
  };

  // 파일 정보 추출 (Cloudinary 결과에서)
  const extractFileInfo = (info) => {
    const fileUrl = info.secure_url;
    const resourceType = info.resource_type;
    const format = info.format;
    const originalFilename = info.original_filename || '';

    let fileType = null;
    const formatLower = format?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(formatLower)) {
      fileType = 'image';
    } else if (formatLower === 'pdf') {
      fileType = 'pdf';
    }

    if (!fileType) {
      if (resourceType === 'image') {
        fileType = 'image';
      } else if (resourceType === 'raw') {
        fileType = 'pdf';
      }
    }

    if (!fileType && originalFilename) {
      const ext = originalFilename.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
        fileType = 'image';
      } else if (ext === 'pdf') {
        fileType = 'pdf';
      }
    }

    return {
      url: fileUrl,
      type: fileType || 'pdf',
      name: originalFilename || '파일',
      order: Date.now()
    };
  };

  // Presigned URL로 R2에 직접 업로드
  const uploadToR2 = async (file, folder = 'assignments') => {
    // 1. 서버에서 presigned URL 받기
    const params = new URLSearchParams({
      filename: file.name,
      contentType: file.type,
      folder
    });

    const presignedResponse = await get(`/api/upload/presigned-url?${params}`);

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Presigned URL 생성 실패');
    }

    const presignedData = await presignedResponse.json();
    if (!presignedData.success) {
      throw new Error(presignedData.message || 'Presigned URL 생성 실패');
    }

    const { uploadUrl, publicUrl } = presignedData.data;

    // 2. Presigned URL로 R2에 직접 업로드
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error('R2 업로드 실패');
    }

    return {
      url: publicUrl,
      originalName: file.name,
      size: file.size,
      mimeType: file.type
    };
  };

  // 파일 타입 판단
  const getFileType = (file) => {
    const mimeType = file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return 'image';
    }
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return 'pdf';
    }
    return 'pdf'; // 기본값
  };

  // 파일 선택/업로드 핸들러
  const openUploader = useCallback((uploadType, formId = null) => {
    currentUploadTypeRef.current = uploadType;
    currentFormIdRef.current = formId;

    if (config?.useServerUpload) {
      // 서버 업로드 모드 - 파일 input 열기
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      // Cloudinary 모드 - 위젯 열기
      if (cloudinaryWidget) {
        cloudinaryWidget.open();
      } else {
        alert('파일 업로드가 준비되지 않았습니다. 페이지를 새로고침해주세요.');
      }
    }
  }, [config, cloudinaryWidget]);

  // 파일 input onChange 핸들러 (서버 업로드)
  const handleFileInputChange = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        // 파일 유효성 검사
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          alert(`지원하지 않는 파일 형식입니다: ${file.name}`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          alert(`파일 크기가 너무 큽니다 (최대 50MB): ${file.name}`);
          continue;
        }

        const result = await uploadToR2(file, 'assignments');

        const fileInfo = {
          url: result.url,
          type: getFileType(file),
          name: file.name,
          order: Date.now()
        };

        if (onUploadSuccessRef.current) {
          onUploadSuccessRef.current(
            fileInfo,
            currentUploadTypeRef.current,
            currentFormIdRef.current
          );
        }
      }
    } catch (err) {
      console.error('파일 업로드 오류:', err);
      alert(`파일 업로드 실패: ${err.message}`);
    } finally {
      setIsUploading(false);
      // input 초기화 (같은 파일 다시 선택 가능하도록)
      if (event.target) {
        event.target.value = '';
      }
    }
  }, []);

  // 숨겨진 파일 input 렌더링용 props
  const fileInputProps = {
    ref: fileInputRef,
    type: 'file',
    accept: 'image/*,.pdf',
    multiple: true,
    style: { display: 'none' },
    onChange: handleFileInputChange
  };

  return {
    config,
    isLoading,
    error,
    isUploading,
    useServerUpload: config?.useServerUpload || false,
    cloudinaryWidget,
    openUploader,
    fileInputProps
  };
};

export default useFileUpload;
