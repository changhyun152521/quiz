import { useState, useEffect } from 'react';
import './AssignmentModal.css';

function AssignmentModal({ showModal, onClose, assignment, onSave, mode }) {
  const [formData, setFormData] = useState({
    assignmentName: '',
    subject: '',
    questionCount: '',
    assignmentType: 'QUIZ',
    startDate: '',
    dueDate: '',
    fileUrl: [], // 여러 파일 지원을 위해 배열로 변경
    fileType: [] // 여러 파일 지원을 위해 배열로 변경
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]); // 여러 파일 미리보기를 위한 배열
  const [cloudinaryWidget, setCloudinaryWidget] = useState(null);

  // Cloudinary 위젯 초기화
  useEffect(() => {
    let widgetInstance = null;

    // Cloudinary 위젯 스크립트 로드
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

    // 서버에서 Cloudinary 설정 가져오기
    const initializeCloudinary = async () => {
      try {
        // Cloudinary 스크립트 로드
        await loadCloudinaryScript();

        // 서버에서 Cloudinary 설정 가져오기
        const configResponse = await fetch('http://localhost:5000/api/cloudinary/config');
        
        if (!configResponse.ok) {
          const errorData = await configResponse.json().catch(() => ({ message: '서버 오류가 발생했습니다' }));
          throw new Error(errorData.message || `서버 오류 (${configResponse.status}): Cloudinary 설정을 가져올 수 없습니다.`);
        }
        
        const configData = await configResponse.json();

        if (!configData.success || !configData.data) {
          throw new Error(configData.message || 'Cloudinary 설정을 가져올 수 없습니다. 서버의 .env 파일을 확인하세요.');
        }

        const { cloudName, uploadPreset, apiKey } = configData.data;

        if (!cloudName || cloudName === 'dummy') {
          throw new Error('Cloudinary cloud name이 설정되지 않았습니다. 서버의 .env 파일에 CLOUDINARY_CLOUD_NAME을 설정하세요.');
        }

        // Cloudinary 위젯 생성
        if (window.cloudinary) {
          // uploadPreset이 'signed'인 경우 서명이 필요하므로 uploadSignature 사용
          // 'unsigned'인 경우 서명이 필요 없음
          const widgetConfig = {
            cloudName: cloudName,
            sources: ['local', 'camera'],
            multiple: true, // 여러 파일 업로드 지원
            maxFileSize: 10000000, // 10MB
            clientAllowedFormats: ['image', 'pdf']
            // resourceType은 위젯이 자동으로 감지하지만, 
            // PDF는 raw 타입으로 업로드되도록 처리
          };

          // unsigned preset인 경우
          if (!uploadPreset || uploadPreset === 'unsigned') {
            widgetConfig.uploadPreset = 'unsigned';
          } else {
            // signed preset인 경우 api_key와 서명 필요
            widgetConfig.uploadPreset = uploadPreset;
            widgetConfig.apiKey = apiKey; // Signed preset 사용 시 api_key 필수
            
            widgetConfig.uploadSignature = async (callback, paramsToSign) => {
              try {
                const response = await fetch('http://localhost:5000/api/cloudinary/signature', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(paramsToSign)
                });
                const data = await response.json();
                if (data.signature) {
                  callback(data.signature);
                } else {
                  console.error('서명 생성 실패:', data);
                  callback(null);
                }
              } catch (error) {
                console.error('서명 생성 실패:', error);
                callback(null);
              }
            };
          }

          const widget = window.cloudinary.createUploadWidget(
            widgetConfig,
            (error, result) => {
              if (!error && result) {
                // 여러 파일 업로드 처리
                if (result.event === 'success') {
                  // 원본 URL 사용 (변환하지 않음)
                  const fileUrl = result.info.secure_url;
                  const resourceType = result.info.resource_type; // 'image' or 'raw' (PDF)
                  const format = result.info.format; // 'jpg', 'png', 'pdf' 등
                  const originalFilename = result.info.original_filename || '';
                  const publicId = result.info.public_id || '';
                  
                  // 파일 타입 판단: 여러 방법으로 확인
                  let fileType = null;
                  
                  // 1. format 필드 확인
                  const formatLower = format?.toLowerCase() || '';
                  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(formatLower)) {
                    fileType = 'image';
                  } else if (formatLower === 'pdf') {
                    fileType = 'pdf';
                  }
                  
                  // 2. resource_type 확인
                  if (!fileType) {
                    if (resourceType === 'image') {
                      fileType = 'image';
                    } else if (resourceType === 'raw') {
                      fileType = 'pdf'; // raw는 보통 PDF
                    }
                  }
                  
                  // 3. 파일명 확장자 확인 (최후의 수단)
                  if (!fileType && originalFilename) {
                    const ext = originalFilename.split('.').pop()?.toLowerCase();
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
                      fileType = 'image';
                    } else if (ext === 'pdf') {
                      fileType = 'pdf';
                    }
                  }
                  
                  // 4. URL에서 확장자 확인
                  if (!fileType && fileUrl) {
                    const urlExt = fileUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(urlExt)) {
                      fileType = 'image';
                    } else if (urlExt === 'pdf') {
                      fileType = 'pdf';
                    }
                  }
                  
                  // fileType이 null이면 기본값으로 'pdf' 설정 (raw 타입인 경우)
                  if (!fileType && resourceType === 'raw') {
                    fileType = 'pdf';
                  }
                  
                  console.log('파일 업로드 성공:', { 
                    fileUrl, 
                    resourceType, 
                    format, 
                    fileType,
                    fileName: originalFilename,
                    publicId: publicId
                  });
                  
                  // 업로드 순서를 보장하기 위해 타임스탬프 추가
                  const uploadTime = Date.now();
                  
                  // 기존 파일 배열에 새 파일 추가 (순서 보장)
                  setFormData(prev => ({
                    ...prev,
                    fileUrl: [...(prev.fileUrl || []), fileUrl],
                    fileType: [...(prev.fileType || []), fileType]
                  }));
                  
                  // 미리보기 파일 목록에 추가 (순서 정보 포함)
                  setPreviewFiles(prev => {
                    const newFiles = [...prev, {
                      url: fileUrl,
                      type: fileType,
                      name: originalFilename || '파일',
                      order: uploadTime // 업로드 순서를 타임스탬프로 저장
                    }];
                    // 업로드 순서대로 정렬
                    return newFiles.sort((a, b) => (a.order || 0) - (b.order || 0));
                  });
                } else if (result.event === 'batch-cancelled') {
                  // 배치 업로드 취소
                  console.log('파일 업로드가 취소되었습니다.');
                } else if (result.event === 'close') {
                  // 사용자가 업로드 위젯을 닫은 경우
                  console.log('업로드 위젯이 닫혔습니다.');
                }
              } else if (error) {
                console.error('Cloudinary 업로드 오류:', error);
                const errorMessage = error.statusText || error.message || '알 수 없는 오류';
                alert(`파일 업로드 중 오류가 발생했습니다: ${errorMessage}`);
              }
            }
          );
          widgetInstance = widget;
          setCloudinaryWidget(widget);
        }
      } catch (error) {
        console.error('Cloudinary 초기화 오류:', error);
        alert('Cloudinary 설정 오류: ' + error.message);
      }
    };

    initializeCloudinary();

    return () => {
      if (widgetInstance) {
        widgetInstance.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (showModal) {
      if (mode === 'edit' && assignment) {
        // 날짜를 YYYY-MM-DD 형식으로 변환
        const formatDate = (date) => {
          if (!date) return '';
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // 여러 파일 지원: 배열로 변환 (기존 단일 파일도 호환)
        const fileUrls = Array.isArray(assignment.fileUrl) 
          ? assignment.fileUrl 
          : (assignment.fileUrl ? [assignment.fileUrl] : []);
        const fileTypes = Array.isArray(assignment.fileType) 
          ? assignment.fileType 
          : (assignment.fileType ? [assignment.fileType] : []);

        setFormData({
          assignmentName: assignment.assignmentName || '',
          subject: assignment.subject || '',
          questionCount: assignment.questionCount || '',
          assignmentType: assignment.assignmentType || 'QUIZ',
          startDate: formatDate(assignment.startDate),
          dueDate: formatDate(assignment.dueDate),
          fileUrl: fileUrls,
          fileType: fileTypes
        });
        
        // 미리보기 파일 목록 설정 (업로드 순서 유지)
        const previewFilesList = fileUrls.map((url, index) => ({
          url: url,
          type: fileTypes[index] || 'image',
          name: `파일 ${index + 1}`,
          order: index // 배열 인덱스를 순서로 사용
        }));
        // 순서대로 정렬 (이미 정렬되어 있지만 확실히 하기 위해)
        previewFilesList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPreviewFiles(previewFilesList);
      } else {
        setFormData({
          assignmentName: '',
          subject: '',
          questionCount: '',
          assignmentType: 'QUIZ',
          startDate: '',
          dueDate: '',
          fileUrl: [],
          fileType: []
        });
        setPreviewFiles([]);
      }
      setErrors({});
    }
  }, [showModal, assignment, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.assignmentName) {
      newErrors.assignmentName = '과제명을 입력해주세요';
    } else if (formData.assignmentName.length > 100) {
      newErrors.assignmentName = '과제명은 최대 100자까지 가능합니다';
    }

    if (!formData.subject) {
      newErrors.subject = '과목을 입력해주세요';
    } else if (formData.subject.length > 50) {
      newErrors.subject = '과목은 최대 50자까지 가능합니다';
    }

    if (!formData.questionCount) {
      newErrors.questionCount = '문항 수를 입력해주세요';
    } else if (isNaN(formData.questionCount) || parseInt(formData.questionCount) < 1) {
      newErrors.questionCount = '문항 수는 1개 이상이어야 합니다';
    }

    if (!formData.assignmentType) {
      newErrors.assignmentType = '과제 타입을 선택해주세요';
    }

    if (!formData.startDate) {
      newErrors.startDate = '과제 시작일을 선택해주세요';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = '과제 제출일을 선택해주세요';
    } else if (formData.startDate && formData.dueDate) {
      const start = new Date(formData.startDate);
      const due = new Date(formData.dueDate);
      if (due < start) {
        newErrors.dueDate = '과제 제출일은 시작일 이후여야 합니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(formData, mode === 'edit' ? assignment._id : null);
      onClose();
    } catch (error) {
      console.error('저장 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="assignment-modal-overlay" onClick={onClose}>
      <div className="assignment-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="assignment-modal-header">
          <h2 className="assignment-modal-title">
            {mode === 'edit' ? '과제 정보 수정' : '과제 추가'}
          </h2>
          <button className="assignment-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="assignment-modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>과제명 *</label>
              <input
                type="text"
                name="assignmentName"
                value={formData.assignmentName}
                onChange={handleChange}
                placeholder="과제명"
                className={errors.assignmentName ? 'error' : ''}
              />
              {errors.assignmentName && <span className="error-message">{errors.assignmentName}</span>}
            </div>

            <div className="form-group">
              <label>과목 *</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="과목"
                className={errors.subject ? 'error' : ''}
              />
              {errors.subject && <span className="error-message">{errors.subject}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>문항 수 *</label>
              <input
                type="number"
                name="questionCount"
                value={formData.questionCount}
                onChange={handleChange}
                placeholder="문항 수"
                min="1"
                className={errors.questionCount ? 'error' : ''}
              />
              {errors.questionCount && <span className="error-message">{errors.questionCount}</span>}
            </div>

            <div className="form-group">
              <label>과제 타입 *</label>
              <select
                name="assignmentType"
                value={formData.assignmentType}
                onChange={handleChange}
                className={errors.assignmentType ? 'error' : ''}
              >
                <option value="QUIZ">QUIZ</option>
                <option value="실전TEST">실전TEST</option>
              </select>
              {errors.assignmentType && <span className="error-message">{errors.assignmentType}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>과제 시작일 *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={errors.startDate ? 'error' : ''}
              />
              {errors.startDate && <span className="error-message">{errors.startDate}</span>}
            </div>

            <div className="form-group">
              <label>과제 제출일 *</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className={errors.dueDate ? 'error' : ''}
              />
              {errors.dueDate && <span className="error-message">{errors.dueDate}</span>}
            </div>
          </div>

          <div className="form-group file-upload-group">
            <label>파일 업로드 (이미지 또는 PDF)</label>
            <div className="file-upload-section">
              <button
                type="button"
                className="upload-btn"
                onClick={() => {
                  if (cloudinaryWidget) {
                    cloudinaryWidget.open();
                  } else {
                    alert('Cloudinary 위젯이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
                  }
                }}
              >
                파일 선택
              </button>
              {previewFiles.length > 0 && (
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      fileUrl: [],
                      fileType: []
                    }));
                    setPreviewFiles([]);
                  }}
                >
                  모든 파일 제거
                </button>
              )}
            </div>
            {previewFiles.length > 0 && (
              <div className="files-preview-container">
                {previewFiles
                  .sort((a, b) => (a.order || 0) - (b.order || 0)) // 업로드 순서대로 정렬
                  .map((file, index) => (
                  <div key={index} className="file-preview-item">
                    <div className="file-preview-header">
                      <div className="file-header-left">
                        <span className="file-order-number">{index + 1}</span>
                        <span className="file-name">{file.name}</span>
                      </div>
                      <div className="file-header-actions">
                        <button
                          type="button"
                          className="move-file-btn move-up-btn"
                          onClick={() => {
                            // 위로 이동
                            if (index === 0) return; // 첫 번째 파일은 위로 이동 불가
                            
                            const sortedFiles = [...previewFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                            const currentFile = sortedFiles[index];
                            const prevFile = sortedFiles[index - 1];
                            
                            // 순서 교환
                            const newPreviewFiles = sortedFiles.map(f => {
                              if (f.url === currentFile.url) {
                                return { ...f, order: prevFile.order };
                              } else if (f.url === prevFile.url) {
                                return { ...f, order: currentFile.order };
                              }
                              return f;
                            }).sort((a, b) => (a.order || 0) - (b.order || 0));
                            
                            // formData의 fileUrl과 fileType도 순서 변경
                            const currentUrlIndex = formData.fileUrl.findIndex(url => url === currentFile.url);
                            const prevUrlIndex = formData.fileUrl.findIndex(url => url === prevFile.url);
                            
                            const newFileUrls = [...formData.fileUrl];
                            const newFileTypes = [...formData.fileType];
                            
                            // 배열에서 위치 교환
                            [newFileUrls[currentUrlIndex], newFileUrls[prevUrlIndex]] = 
                              [newFileUrls[prevUrlIndex], newFileUrls[currentUrlIndex]];
                            [newFileTypes[currentUrlIndex], newFileTypes[prevUrlIndex]] = 
                              [newFileTypes[prevUrlIndex], newFileTypes[currentUrlIndex]];
                            
                            setFormData(prev => ({
                              ...prev,
                              fileUrl: newFileUrls,
                              fileType: newFileTypes
                            }));
                            setPreviewFiles(newPreviewFiles);
                          }}
                          disabled={index === 0}
                          title="위로 이동"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="move-file-btn move-down-btn"
                          onClick={() => {
                            // 아래로 이동
                            const sortedFiles = [...previewFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                            if (index === sortedFiles.length - 1) return; // 마지막 파일은 아래로 이동 불가
                            
                            const currentFile = sortedFiles[index];
                            const nextFile = sortedFiles[index + 1];
                            
                            // 순서 교환
                            const newPreviewFiles = sortedFiles.map(f => {
                              if (f.url === currentFile.url) {
                                return { ...f, order: nextFile.order };
                              } else if (f.url === nextFile.url) {
                                return { ...f, order: currentFile.order };
                              }
                              return f;
                            }).sort((a, b) => (a.order || 0) - (b.order || 0));
                            
                            // formData의 fileUrl과 fileType도 순서 변경
                            const currentUrlIndex = formData.fileUrl.findIndex(url => url === currentFile.url);
                            const nextUrlIndex = formData.fileUrl.findIndex(url => url === nextFile.url);
                            
                            const newFileUrls = [...formData.fileUrl];
                            const newFileTypes = [...formData.fileType];
                            
                            // 배열에서 위치 교환
                            [newFileUrls[currentUrlIndex], newFileUrls[nextUrlIndex]] = 
                              [newFileUrls[nextUrlIndex], newFileUrls[currentUrlIndex]];
                            [newFileTypes[currentUrlIndex], newFileTypes[nextUrlIndex]] = 
                              [newFileTypes[nextUrlIndex], newFileTypes[currentUrlIndex]];
                            
                            setFormData(prev => ({
                              ...prev,
                              fileUrl: newFileUrls,
                              fileType: newFileTypes
                            }));
                            setPreviewFiles(newPreviewFiles);
                          }}
                          disabled={index === previewFiles.length - 1}
                          title="아래로 이동"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="remove-single-file-btn"
                          onClick={() => {
                            // 특정 파일 제거
                            // 정렬된 파일 목록에서 인덱스 찾기
                            const sortedFiles = [...previewFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                            const fileToRemove = sortedFiles[index];
                            
                            // fileUrl과 fileType에서 해당 파일 제거
                            const fileUrlIndex = formData.fileUrl.findIndex(url => url === fileToRemove.url);
                            const newFileUrls = formData.fileUrl.filter((_, i) => i !== fileUrlIndex);
                            const newFileTypes = formData.fileType.filter((_, i) => i !== fileUrlIndex);
                            
                            // 미리보기 파일 목록에서 제거하고 순서 재정렬
                            const newPreviewFiles = previewFiles
                              .filter(file => file.url !== fileToRemove.url)
                              .map((file, idx) => ({ ...file, order: idx })) // 순서 재설정
                              .sort((a, b) => (a.order || 0) - (b.order || 0));
                            
                            setFormData(prev => ({
                              ...prev,
                              fileUrl: newFileUrls,
                              fileType: newFileTypes
                            }));
                            setPreviewFiles(newPreviewFiles);
                          }}
                          title="파일 제거"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="file-preview">
                      {file.type === 'image' ? (
                        <img src={file.url} alt={`미리보기 ${index + 1}`} className="preview-image" />
                      ) : file.type === 'pdf' ? (
                        <div className="preview-pdf">
                          <iframe
                            src={file.url}
                            title={`PDF 미리보기 ${index + 1}`}
                            className="preview-iframe"
                            type="application/pdf"
                            onError={(e) => {
                              console.error('PDF iframe 로드 오류:', e);
                            }}
                            onLoad={() => {
                              console.log(`PDF 미리보기 ${index + 1} 로드 완료`);
                            }}
                          />
                          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pdf-link"
                            >
                              새 창에서 PDF 열기
                            </a>
                            <a
                              href={file.url}
                              download
                              className="pdf-link"
                              style={{ background: '#666' }}
                            >
                              PDF 다운로드
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="preview-unknown">
                          <p style={{ marginBottom: '12px', color: '#666' }}>파일이 업로드되었습니다.</p>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pdf-link"
                          >
                            파일 열기
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="assignment-modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : mode === 'edit' ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssignmentModal;

