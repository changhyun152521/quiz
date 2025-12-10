import { useState, useEffect, useRef } from 'react';
import { get, post } from '../utils/api';
import './AssignmentModal.css';

// 과목별 대단원/소단원 데이터
const subjectUnits = {
  '중1-1': [
    { mainUnit: '수와 연산', subUnits: ['소인수분해', '최대공약수와 최소공배수'] },
    { mainUnit: '정수와 유리수', subUnits: ['정수와 유리수', '정수와 유리수의 계산'] },
    { mainUnit: '문자와 식', subUnits: ['문자의 사용과 식의 계산', '일차방정식', '일차방정식의 활용'] },
    { mainUnit: '좌표평면과 그래프', subUnits: ['좌표평면과 그래프', '정비례와 반비례'] }
  ],
  '중1-2': [
    { mainUnit: '기본 도형과 작도', subUnits: ['기본 도형', '위치 관계', '작도와 합동'] },
    { mainUnit: '평면도형의 성질', subUnits: ['다각형', '원과 부채꼴'] },
    { mainUnit: '입체도형의 성질', subUnits: ['다면체와 회전체', '입체도형의 겉넓이와 부피'] },
    { mainUnit: '자료의 정리와 해석', subUnits: ['자료의 정리와 해석'] }
  ],
  '중2-1': [
    { mainUnit: '수와 식', subUnits: ['유리수와 순환소수', '식의 계산'] },
    { mainUnit: '부등식', subUnits: ['일차부등식', '일차부등식의 활용'] },
    { mainUnit: '방정식', subUnits: ['연립일차방정식', '연립방정식의 풀이', '연립방정식의 활용'] },
    { mainUnit: '함수', subUnits: ['일차함수와 그래프(1)', '일차함수와 그래프(2)', '일차함수와 일차방정식의 관계'] }
  ],
  '중2-2': [
    { mainUnit: '도형의 성질', subUnits: ['삼각형의 성질', '사각형의 성질'] },
    { mainUnit: '도형의 닮음', subUnits: ['도형의 닮음', '닮은 도형의 성질', '피타고라스 정리'] },
    { mainUnit: '확률', subUnits: ['경우의 수와 확률'] }
  ],
  '중3-1': [
    { mainUnit: '실수와 그 계산', subUnits: ['제곱근과 실수', '근호를 포함한 식의 계산'] },
    { mainUnit: '다항식의 곱셈과 인수분해', subUnits: ['다항식의 곱셈', '다항식의 인수분해'] },
    { mainUnit: '이차방정식', subUnits: ['이차방정식의 풀이', '이차방정식의 활용'] },
    { mainUnit: '이차함수', subUnits: ['이차함수의 그래프', '이차함수의 활용'] }
  ],
  '중3-2': [
    { mainUnit: '삼각비', subUnits: ['삼각비', '삼각비의 활용'] },
    { mainUnit: '원의 성질', subUnits: ['원과 직선', '원주각', '원주각의 활용'] },
    { mainUnit: '통계', subUnits: ['대푯값과 산포도', '상관관계'] }
  ],
  '공통수학1': [
    { mainUnit: '다항식', subUnits: ['다항식의 연산', '나머지정리', '인수분해'] },
    { mainUnit: '방정식과 부등식', subUnits: ['복소수와 이차방정식', '이차방정식과 이차함수', '여러 가지 방정식과 부등식'] },
    { mainUnit: '경우의 수', subUnits: ['합의 법칙과 곱의 법칙', '순열과 조합'] },
    { mainUnit: '행렬', subUnits: ['행렬과 그 연산'] }
  ],
  '공통수학2': [
    { mainUnit: '도형의 방정식', subUnits: ['평면좌표', '직선의 방정식', '원의 방정식', '도형의 이동'] },
    { mainUnit: '집합과 명제', subUnits: ['집합', '명제'] },
    { mainUnit: '함수와 그래프', subUnits: ['함수', '유무리함수'] }
  ],
  '대수': [
    { mainUnit: '지수함수와 로그함수', subUnits: ['지수와 로그', '지수함수와 로그함수'] },
    { mainUnit: '삼각함수', subUnits: ['삼각함수', '사인법칙과 코사인법칙'] },
    { mainUnit: '수열', subUnits: ['등차수열과 등비수열', '수열의 합', '수학적 귀납법'] }
  ],
  '미적분1': [
    { mainUnit: '함수의 극한과 연속', subUnits: ['함수의 극한', '함수의 연속'] },
    { mainUnit: '미분', subUnits: ['미분계수와 도함수', '도함수의 활용'] },
    { mainUnit: '적분', subUnits: ['부정적분과 정적분', '정적분의 활용'] }
  ],
  '미적분2': [
    { mainUnit: '수열의 극한', subUnits: ['수열의 극한', '급수'] },
    { mainUnit: '미분법', subUnits: ['지수함수와 로그함수의 미분', '삼각함수의 미분', '여러가지 미분법', '도함수의 활용'] },
    { mainUnit: '적분법', subUnits: ['여러가지 함수의 적분', '치환적분과 부분적분법', '정적분의 활용'] }
  ],
  '확률과통계': [
    { mainUnit: '순열과 조합', subUnits: ['순열', '조합'] },
    { mainUnit: '확률', subUnits: ['확률의 뜻과 활용', '조건부확률'] },
    { mainUnit: '통계', subUnits: ['확률분포', '통계적추정'] }
  ],
  '기하': [
    { mainUnit: '이차곡선', subUnits: ['포물선, 타원, 쌍곡선', '이차곡선의 접선'] },
    { mainUnit: '공간도형과 공간좌표', subUnits: ['직선과 평면의 위치관계', '삼수선 정리', '정사영', '좌표공간의 거리 및 내분점', '구의 방정식'] },
    { mainUnit: '벡터', subUnits: ['벡터의 덧셈, 뺄셈, 실수배', '내적 계산', '평면의 방정식'] }
  ]
};

const subjects = Object.keys(subjectUnits);

function AssignmentModal({ showModal, onClose, assignment, onSave, mode }) {
  // 여러 과제 추가를 위한 폼 배열 (생성 모드일 때만 사용)
  const [assignmentForms, setAssignmentForms] = useState([{
    assignmentName: '',
    subject: '',
    mainUnit: '',
    subUnit: '',
    questionCount: '',
    assignmentType: 'QUIZ',
    startDate: '',
    dueDate: '',
    fileUrl: [],
    fileType: [],
    answers: []
  }]);
  
  // 단일 과제 폼 (수정 모드 또는 기존 방식)
  const [formData, setFormData] = useState({
    assignmentName: '',
    subject: '',
    mainUnit: '',
    subUnit: '',
    questionCount: '',
    assignmentType: 'QUIZ',
    startDate: '',
    dueDate: '',
    fileUrl: [], // 여러 파일 지원을 위해 배열로 변경 (하위 호환성 유지)
    fileType: [], // 여러 파일 지원을 위해 배열로 변경 (하위 호환성 유지)
    questionFileUrl: [], // 문제지 파일 URL 배열
    questionFileType: [], // 문제지 파일 타입 배열
    solutionFileUrl: [], // 해설지 파일 URL 배열
    solutionFileType: [], // 해설지 파일 타입 배열
    answers: [] // 정답 배열 추가
  });
  const [availableMainUnits, setAvailableMainUnits] = useState([]);
  const [availableSubUnits, setAvailableSubUnits] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]); // 여러 파일 미리보기를 위한 배열 (하위 호환성 유지)
  const [previewQuestionFiles, setPreviewQuestionFiles] = useState([]); // 문제지 파일 미리보기 배열
  const [previewSolutionFiles, setPreviewSolutionFiles] = useState([]); // 해설지 파일 미리보기 배열
  const [cloudinaryWidget, setCloudinaryWidget] = useState(null);
  const [currentUploadType, setCurrentUploadType] = useState(null); // 'question' 또는 'solution'
  const currentUploadTypeRef = useRef(null); // 위젯 콜백에서 참조할 수 있는 ref
  const currentFormIdRef = useRef(null); // 현재 파일 업로드 중인 폼 ID
  
  // 각 폼별 대단원/소단원 목록
  const [formMainUnits, setFormMainUnits] = useState([[]]);
  const [formSubUnits, setFormSubUnits] = useState([[]]);
  
  // 여러 과제 추가를 위한 상태 (생성 모드일 때만 사용)
  const [multipleForms, setMultipleForms] = useState([{
    id: 0,
    assignmentName: '',
    subject: '',
    mainUnit: '',
    subUnit: '',
    questionCount: '',
    assignmentType: 'QUIZ',
    startDate: '',
    dueDate: '',
    fileUrl: [],
    fileType: [],
    questionFileUrl: [],
    questionFileType: [],
    solutionFileUrl: [],
    solutionFileType: [],
    answers: [],
    previewFiles: [],
    previewQuestionFiles: [],
    previewSolutionFiles: [],
    availableMainUnits: [],
    availableSubUnits: []
  }]);
  const [nextFormId, setNextFormId] = useState(1);

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
        const configResponse = await get('/api/cloudinary/config');
        
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
                const response = await post('/api/cloudinary/signature', paramsToSign);
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
                  
                  // currentUploadTypeRef를 통해 현재 업로드 타입 확인 (위젯 콜백에서 클로저로 접근)
                  const uploadType = currentUploadTypeRef.current;
                  const formId = currentFormIdRef.current; // 현재 업로드 중인 폼 ID
                  console.log('파일 업로드 처리:', { uploadType, formId, fileUrl, fileType, originalFilename });
                  
                  // 여러 폼 추가 모드인 경우 (formId가 있으면)
                  if (formId !== null && formId !== undefined) {
                    if (uploadType === 'question') {
                      console.log('여러 폼 모드 - 문제지 파일로 저장:', formId);
                      setMultipleForms(prev => prev.map(form => {
                        if (form.id === formId) {
                          return {
                            ...form,
                            questionFileUrl: [...(form.questionFileUrl || []), fileUrl],
                            questionFileType: [...(form.questionFileType || []), fileType],
                            previewQuestionFiles: [
                              ...(form.previewQuestionFiles || []),
                              {
                                url: fileUrl,
                                type: fileType,
                                name: originalFilename || '파일',
                                order: uploadTime
                              }
                            ].sort((a, b) => (a.order || 0) - (b.order || 0))
                          };
                        }
                        return form;
                      }));
                    } else if (uploadType === 'solution') {
                      console.log('여러 폼 모드 - 해설지 파일로 저장:', formId);
                      setMultipleForms(prev => prev.map(form => {
                        if (form.id === formId) {
                          return {
                            ...form,
                            solutionFileUrl: [...(form.solutionFileUrl || []), fileUrl],
                            solutionFileType: [...(form.solutionFileType || []), fileType],
                            previewSolutionFiles: [
                              ...(form.previewSolutionFiles || []),
                              {
                                url: fileUrl,
                                type: fileType,
                                name: originalFilename || '파일',
                                order: uploadTime
                              }
                            ].sort((a, b) => (a.order || 0) - (b.order || 0))
                          };
                        }
                        return form;
                      }));
                    }
                  } else if (uploadType === 'question') {
                    // 단일 폼 모드 - 문제지 파일로 저장
                    console.log('단일 폼 모드 - 문제지 파일로 저장');
                    setFormData(prev => ({
                      ...prev,
                      questionFileUrl: [...(prev.questionFileUrl || []), fileUrl],
                      questionFileType: [...(prev.questionFileType || []), fileType]
                    }));
                    
                    // 문제지 미리보기 파일 목록에 추가
                    setPreviewQuestionFiles(prev => {
                      const newFiles = [...prev, {
                        url: fileUrl,
                        type: fileType,
                        name: originalFilename || '파일',
                        order: uploadTime
                      }];
                      console.log('문제지 미리보기 파일 목록 업데이트:', newFiles);
                      return newFiles.sort((a, b) => (a.order || 0) - (b.order || 0));
                    });
                  } else if (uploadType === 'solution') {
                    // 단일 폼 모드 - 해설지 파일로 저장
                    console.log('단일 폼 모드 - 해설지 파일로 저장');
                    setFormData(prev => ({
                      ...prev,
                      solutionFileUrl: [...(prev.solutionFileUrl || []), fileUrl],
                      solutionFileType: [...(prev.solutionFileType || []), fileType]
                    }));
                    
                    // 해설지 미리보기 파일 목록에 추가
                    setPreviewSolutionFiles(prev => {
                      const newFiles = [...prev, {
                        url: fileUrl,
                        type: fileType,
                        name: originalFilename || '파일',
                        order: uploadTime
                      }];
                      console.log('해설지 미리보기 파일 목록 업데이트:', newFiles);
                      return newFiles.sort((a, b) => (a.order || 0) - (b.order || 0));
                    });
                  } else {
                    // 하위 호환성을 위해 기존 방식도 유지
                    setFormData(prev => ({
                      ...prev,
                      fileUrl: [...(prev.fileUrl || []), fileUrl],
                      fileType: [...(prev.fileType || []), fileType]
                    }));
                    
                    setPreviewFiles(prev => {
                      const newFiles = [...prev, {
                        url: fileUrl,
                        type: fileType,
                        name: originalFilename || '파일',
                        order: uploadTime
                      }];
                      return newFiles.sort((a, b) => (a.order || 0) - (b.order || 0));
                    });
                  }
                  
                  // 업로드 완료 후 currentUploadType은 유지 (여러 파일 업로드 시 필요)
                  // 위젯이 닫힐 때만 초기화
                } else if (result.event === 'batch-cancelled') {
                  // 배치 업로드 취소
                  console.log('파일 업로드가 취소되었습니다.');
                  currentUploadTypeRef.current = null;
                  setCurrentUploadType(null);
                } else if (result.event === 'close') {
                  // 사용자가 업로드 위젯을 닫은 경우
                  console.log('업로드 위젯이 닫혔습니다.');
                  currentUploadTypeRef.current = null;
                  setCurrentUploadType(null);
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

  // questionCount가 변경될 때 answers 배열 동적 생성
  useEffect(() => {
    if (formData.questionCount && parseInt(formData.questionCount) > 0) {
      const questionCount = parseInt(formData.questionCount);
      const currentAnswers = formData.answers || [];
      
      // 기존 정답이 있으면 유지, 없으면 새로 생성
      const newAnswers = [];
      for (let i = 1; i <= questionCount; i++) {
        const existing = currentAnswers.find(ans => ans.questionNumber === i);
        newAnswers.push({
          questionNumber: i,
          answer: existing?.answer || '',
          score: existing?.score || 1
        });
      }
      
      // questionCount가 줄어든 경우에만 answers 업데이트
      if (newAnswers.length !== currentAnswers.length || mode === 'create') {
        setFormData(prev => ({
          ...prev,
          answers: newAnswers
        }));
      }
    } else {
      // questionCount가 0이거나 비어있으면 answers 초기화
      setFormData(prev => ({
        ...prev,
        answers: []
      }));
    }
  }, [formData.questionCount, mode]);

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

        // 문제지 파일 (새로운 필드 우선, 없으면 기존 fileUrl 사용)
        const questionFileUrls = Array.isArray(assignment.questionFileUrl) && assignment.questionFileUrl.length > 0
          ? assignment.questionFileUrl
          : fileUrls; // 하위 호환성: 기존 fileUrl 사용
        const questionFileTypes = Array.isArray(assignment.questionFileType) && assignment.questionFileType.length > 0
          ? assignment.questionFileType
          : fileTypes; // 하위 호환성: 기존 fileType 사용

        // 해설지 파일
        const solutionFileUrls = Array.isArray(assignment.solutionFileUrl) 
          ? assignment.solutionFileUrl 
          : [];
        const solutionFileTypes = Array.isArray(assignment.solutionFileType) 
          ? assignment.solutionFileType 
          : [];

        // 정답 배열 초기화
        const questionCount = assignment.questionCount || 0;
        const existingAnswers = assignment.answers || [];
        const initialAnswers = [];
        for (let i = 1; i <= questionCount; i++) {
          const existing = existingAnswers.find(ans => ans.questionNumber === i);
          initialAnswers.push({
            questionNumber: i,
            answer: existing?.answer || '',
            score: existing?.score || 1
          });
        }

        const subject = assignment.subject || '';
        const mainUnit = assignment.mainUnit || '';
        const subUnit = assignment.subUnit || '';
        
        const assignmentType = assignment.assignmentType || 'QUIZ';
        
        // 과목에 따른 대단원/소단원 목록 설정 (QUIZ 타입일 때만)
        if (assignmentType === 'QUIZ' && subject && subjectUnits[subject]) {
          setAvailableMainUnits(subjectUnits[subject]);
          if (mainUnit) {
            const selectedMainUnit = subjectUnits[subject].find(unit => unit.mainUnit === mainUnit);
            if (selectedMainUnit) {
              setAvailableSubUnits(selectedMainUnit.subUnits);
            } else {
              setAvailableSubUnits([]);
            }
          } else {
            setAvailableSubUnits([]);
          }
        } else {
          setAvailableMainUnits([]);
          setAvailableSubUnits([]);
        }
        
        setFormData({
          assignmentName: assignment.assignmentName || '',
          subject: subject,
          mainUnit: assignmentType === '클리닉' ? '' : mainUnit, // 클리닉이면 대단원 초기화
          subUnit: assignmentType === '클리닉' ? '' : subUnit, // 클리닉이면 소단원 초기화
          questionCount: assignment.questionCount || '',
          assignmentType: assignmentType,
          startDate: formatDate(assignment.startDate),
          dueDate: formatDate(assignment.dueDate),
          fileUrl: fileUrls, // 하위 호환성 유지
          fileType: fileTypes, // 하위 호환성 유지
          questionFileUrl: questionFileUrls,
          questionFileType: questionFileTypes,
          solutionFileUrl: solutionFileUrls,
          solutionFileType: solutionFileTypes,
          answers: initialAnswers
        });
        
        // 문제지 미리보기 파일 목록 설정
        const previewQuestionFilesList = questionFileUrls.map((url, index) => ({
          url: url,
          type: questionFileTypes[index] || 'image',
          name: `문제지 파일 ${index + 1}`,
          order: index
        }));
        previewQuestionFilesList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPreviewQuestionFiles(previewQuestionFilesList);
        
        // 해설지 미리보기 파일 목록 설정 (문제지 파일과 동일한 형식)
        const previewSolutionFilesList = solutionFileUrls.map((url, index) => ({
          url: url,
          type: solutionFileTypes[index] || 'image',
          name: `해설지 파일 ${index + 1}`,
          order: index
        }));
        previewSolutionFilesList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPreviewSolutionFiles(previewSolutionFilesList);
        
        // 하위 호환성을 위한 기존 미리보기 파일 목록 설정
        const previewFilesList = fileUrls.map((url, index) => ({
          url: url,
          type: fileTypes[index] || 'image',
          name: `파일 ${index + 1}`,
          order: index
        }));
        previewFilesList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPreviewFiles(previewFilesList);
      } else {
        setFormData({
          assignmentName: '',
          subject: '',
          mainUnit: '',
          subUnit: '',
          questionCount: '',
          assignmentType: 'QUIZ',
          startDate: '',
          dueDate: '',
          fileUrl: [],
          fileType: [],
          questionFileUrl: [],
          questionFileType: [],
          solutionFileUrl: [],
          solutionFileType: [],
          answers: []
        });
        setPreviewFiles([]);
        setPreviewQuestionFiles([]);
        setPreviewSolutionFiles([]);
        setAvailableMainUnits([]);
        setAvailableSubUnits([]);
      }
      setErrors({});
    }
  }, [showModal, assignment, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'assignmentType') {
      // 과제 타입 변경 시 처리
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        
        // 클리닉으로 변경 시 대단원과 소단원 초기화
        if (value === '클리닉') {
          newData.mainUnit = '';
          newData.subUnit = '';
          setAvailableMainUnits([]);
          setAvailableSubUnits([]);
        } else if (value === 'QUIZ' && prev.subject) {
          // QUIZ로 변경하고 과목이 있으면 대단원 목록 설정
          if (subjectUnits[prev.subject]) {
            setAvailableMainUnits(subjectUnits[prev.subject]);
            setAvailableSubUnits([]);
          }
        }
        
        return newData;
      });
    } else if (name === 'subject') {
      // 과목 변경 시 대단원과 소단원 초기화
      setFormData(prev => ({
        ...prev,
        subject: value,
        mainUnit: '',
        subUnit: ''
      }));
      
      // QUIZ 타입일 때만 대단원 목록 설정
      if (value && formData.assignmentType === 'QUIZ' && subjectUnits[value]) {
        setAvailableMainUnits(subjectUnits[value]);
        setAvailableSubUnits([]);
      } else {
        setAvailableMainUnits([]);
        setAvailableSubUnits([]);
      }
    } else if (name === 'mainUnit') {
      // 대단원 변경 시 소단원 초기화
      setFormData(prev => ({
        ...prev,
        mainUnit: value,
        subUnit: ''
      }));
      
      // 선택된 대단원의 소단원 목록 설정
      if (value && formData.subject && subjectUnits[formData.subject]) {
        const selectedMainUnit = subjectUnits[formData.subject].find(unit => unit.mainUnit === value);
        if (selectedMainUnit) {
          setAvailableSubUnits(selectedMainUnit.subUnits);
        } else {
          setAvailableSubUnits([]);
        }
      } else {
        setAvailableSubUnits([]);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // 정답 입력 핸들러
  const handleAnswerChange = (index, field, value) => {
    setFormData(prev => {
      const newAnswers = [...(prev.answers || [])];
      if (newAnswers[index]) {
        newAnswers[index] = {
          ...newAnswers[index],
          [field]: field === 'score' ? (parseFloat(value) || 0) : value
        };
      }
      return {
        ...prev,
        answers: newAnswers
      };
    });

    // 에러 제거
    if (errors[`answer_${index + 1}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`answer_${index + 1}`];
        return newErrors;
      });
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
      newErrors.subject = '과목을 선택해주세요';
    }
    
    // QUIZ 타입일 때만 대단원과 소단원 필수
    if (formData.assignmentType === 'QUIZ') {
      if (!formData.mainUnit) {
        newErrors.mainUnit = '대단원을 선택해주세요';
      }
      
      if (!formData.subUnit) {
        newErrors.subUnit = '소단원을 선택해주세요';
      }
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

    // 생성 모드일 때 정답 필수 검증
    if (mode === 'create') {
      const answers = formData.answers || [];
      if (answers.length === 0) {
        newErrors.answers = '문항 수를 입력하면 정답을 입력할 수 있습니다';
      } else {
        answers.forEach((ans, index) => {
          if (!ans.answer || ans.answer.trim() === '') {
            newErrors[`answer_${index + 1}`] = `${index + 1}번 문항의 정답을 입력해주세요`;
          } else if (ans.answer.length > 50) {
            newErrors[`answer_${index + 1}`] = '정답은 최대 50자까지 가능합니다';
          }
          if (ans.score < 0) {
            newErrors[`score_${index + 1}`] = '배점은 0 이상이어야 합니다';
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 리셋 함수
  const resetForm = () => {
    setFormData({
      assignmentName: '',
      subject: '',
      mainUnit: '',
      subUnit: '',
      questionCount: '',
      assignmentType: 'QUIZ',
      startDate: '',
      dueDate: '',
      fileUrl: [],
      fileType: [],
      questionFileUrl: [],
      questionFileType: [],
      solutionFileUrl: [],
      solutionFileType: [],
      answers: []
    });
    setPreviewFiles([]);
    setPreviewQuestionFiles([]);
    setPreviewSolutionFiles([]);
    setAvailableMainUnits([]);
    setAvailableSubUnits([]);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 이미지가 없을 때 확인 메시지 표시
    const hasFiles = formData.questionFileUrl && formData.questionFileUrl.length > 0;
    if (!hasFiles) {
      const confirmMessage = mode === 'edit' 
        ? '문제지 파일이 업로드되어 있지 않습니다. 문제지 파일 없이 과제를 수정하시겠습니까?'
        : '문제지 파일이 업로드되어 있지 않습니다. 문제지 파일 없이 과제를 등록하시겠습니까?';
      
      const userConfirmed = window.confirm(confirmMessage);
      if (!userConfirmed) {
        return; // 사용자가 취소하면 등록 중단
      }
    }

    // 전송할 데이터 확인 (디버깅)
    console.log('[AssignmentModal] 제출할 formData:', {
      questionFileUrl: formData.questionFileUrl,
      questionFileType: formData.questionFileType,
      solutionFileUrl: formData.solutionFileUrl,
      solutionFileType: formData.solutionFileType,
      mode: mode,
      assignmentId: mode === 'edit' ? assignment._id : null
    });

    setIsSubmitting(true);

    try {
      await onSave(formData, mode === 'edit' ? assignment._id : null);
      setIsSubmitting(false);
      
      if (mode === 'create') {
        // 생성 모드일 때는 폼 리셋하고 모달은 열어둠
        resetForm();
      } else {
        // 수정 모드일 때는 모달 닫기
        onClose();
      }
    } catch (error) {
      console.error('저장 오류:', error);
      setIsSubmitting(false);
      // 에러 발생 시 모달은 열어둠
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="assignment-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isSubmitting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="assignment-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="assignment-modal-header">
          <h2 className="assignment-modal-title">
            {mode === 'edit' ? '과제 정보 수정' : '과제 추가'}
          </h2>
          <button className="assignment-modal-close" onClick={onClose}>×</button>
        </div>

        {mode === 'create' ? (
          <MultipleAssignmentForm
            forms={multipleForms}
            setForms={setMultipleForms}
            nextFormId={nextFormId}
            setNextFormId={setNextFormId}
            onSave={onSave}
            onClose={onClose}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            subjectUnits={subjectUnits}
            subjects={subjects}
            cloudinaryWidget={cloudinaryWidget}
            currentUploadTypeRef={currentUploadTypeRef}
            currentFormIdRef={currentFormIdRef}
            setCurrentUploadType={setCurrentUploadType}
            setMultipleForms={setMultipleForms}
          />
        ) : (
          <form onSubmit={handleSubmit} className="assignment-modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>과제 타입 *</label>
              <select
                name="assignmentType"
                value={formData.assignmentType}
                onChange={handleChange}
                className={errors.assignmentType ? 'error' : ''}
              >
                <option value="QUIZ">QUIZ</option>
                <option value="클리닉">클리닉</option>
              </select>
              {errors.assignmentType && <span className="error-message">{errors.assignmentType}</span>}
            </div>

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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>과목 *</label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={errors.subject ? 'error' : ''}
              >
                <option value="">과목 선택</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              {errors.subject && <span className="error-message">{errors.subject}</span>}
            </div>

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
          </div>

          {formData.assignmentType === 'QUIZ' && (
            <div className="form-row">
              <div className="form-group">
                <label>대단원 *</label>
                <select
                  name="mainUnit"
                  value={formData.mainUnit}
                  onChange={handleChange}
                  disabled={!formData.subject}
                  className={errors.mainUnit ? 'error' : ''}
                >
                  <option value="">대단원 선택</option>
                  {availableMainUnits.map(unit => (
                    <option key={unit.mainUnit} value={unit.mainUnit}>{unit.mainUnit}</option>
                  ))}
                </select>
                {errors.mainUnit && <span className="error-message">{errors.mainUnit}</span>}
              </div>

              <div className="form-group">
                <label>소단원 *</label>
                <select
                  name="subUnit"
                  value={formData.subUnit}
                  onChange={handleChange}
                  disabled={!formData.mainUnit}
                  className={errors.subUnit ? 'error' : ''}
                >
                  <option value="">소단원 선택</option>
                  {availableSubUnits.map(subUnit => (
                    <option key={subUnit} value={subUnit}>{subUnit}</option>
                  ))}
                </select>
                {errors.subUnit && <span className="error-message">{errors.subUnit}</span>}
              </div>
            </div>
          )}

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

          {/* 문제지 파일 업로드 */}
          <div className="form-group file-upload-group">
            <label>문제지 파일 업로드 (이미지 또는 PDF)</label>
            <div className="file-upload-section">
              <button
                type="button"
                className="upload-btn"
                onClick={() => {
                  if (cloudinaryWidget) {
                    console.log('문제지 파일 선택 버튼 클릭');
                    currentUploadTypeRef.current = 'question';
                    setCurrentUploadType('question');
                    cloudinaryWidget.open();
                  } else {
                    alert('Cloudinary 위젯이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
                  }
                }}
              >
                문제지 파일 선택
              </button>
              {previewQuestionFiles.length > 0 && (
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      questionFileUrl: [],
                      questionFileType: []
                    }));
                    setPreviewQuestionFiles([]);
                  }}
                >
                  모든 문제지 파일 제거
                </button>
              )}
            </div>
            {previewQuestionFiles.length > 0 && (
              <div className="files-preview-container">
                {previewQuestionFiles
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
                            
                            const sortedFiles = [...previewQuestionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
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
                            
                            // formData의 questionFileUrl과 questionFileType도 순서 변경
                            const currentUrlIndex = formData.questionFileUrl.findIndex(url => url === currentFile.url);
                            const prevUrlIndex = formData.questionFileUrl.findIndex(url => url === prevFile.url);
                            
                            const newFileUrls = [...formData.questionFileUrl];
                            const newFileTypes = [...formData.questionFileType];
                            
                            // 배열에서 위치 교환
                            [newFileUrls[currentUrlIndex], newFileUrls[prevUrlIndex]] = 
                              [newFileUrls[prevUrlIndex], newFileUrls[currentUrlIndex]];
                            [newFileTypes[currentUrlIndex], newFileTypes[prevUrlIndex]] = 
                              [newFileTypes[prevUrlIndex], newFileTypes[currentUrlIndex]];
                            
                            setFormData(prev => ({
                              ...prev,
                              questionFileUrl: newFileUrls,
                              questionFileType: newFileTypes
                            }));
                            setPreviewQuestionFiles(newPreviewFiles);
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
                            const sortedFiles = [...previewQuestionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
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
                            
                            // formData의 questionFileUrl과 questionFileType도 순서 변경
                            const currentUrlIndex = formData.questionFileUrl.findIndex(url => url === currentFile.url);
                            const nextUrlIndex = formData.questionFileUrl.findIndex(url => url === nextFile.url);
                            
                            const newFileUrls = [...formData.questionFileUrl];
                            const newFileTypes = [...formData.questionFileType];
                            
                            // 배열에서 위치 교환
                            [newFileUrls[currentUrlIndex], newFileUrls[nextUrlIndex]] = 
                              [newFileUrls[nextUrlIndex], newFileUrls[currentUrlIndex]];
                            [newFileTypes[currentUrlIndex], newFileTypes[nextUrlIndex]] = 
                              [newFileTypes[nextUrlIndex], newFileTypes[currentUrlIndex]];
                            
                            setFormData(prev => ({
                              ...prev,
                              questionFileUrl: newFileUrls,
                              questionFileType: newFileTypes
                            }));
                            setPreviewQuestionFiles(newPreviewFiles);
                          }}
                          disabled={index === previewQuestionFiles.length - 1}
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
                            const sortedFiles = [...previewQuestionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                            const fileToRemove = sortedFiles[index];
                            
                            // questionFileUrl과 questionFileType에서 해당 파일 제거
                            const fileUrlIndex = formData.questionFileUrl.findIndex(url => url === fileToRemove.url);
                            const newFileUrls = formData.questionFileUrl.filter((_, i) => i !== fileUrlIndex);
                            const newFileTypes = formData.questionFileType.filter((_, i) => i !== fileUrlIndex);
                            
                            // 미리보기 파일 목록에서 제거하고 순서 재정렬
                            const newPreviewFiles = previewQuestionFiles
                              .filter(file => file.url !== fileToRemove.url)
                              .map((file, idx) => ({ ...file, order: idx })) // 순서 재설정
                              .sort((a, b) => (a.order || 0) - (b.order || 0));
                            
                            setFormData(prev => ({
                              ...prev,
                              questionFileUrl: newFileUrls,
                              questionFileType: newFileTypes
                            }));
                            setPreviewQuestionFiles(newPreviewFiles);
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

          {/* 해설지 파일 업로드 */}
          <div className="form-group file-upload-group">
            <label>해설지 파일 업로드 (이미지 또는 PDF)</label>
            <div className="file-upload-section">
              <button
                type="button"
                className="upload-btn"
                onClick={() => {
                  if (cloudinaryWidget) {
                    console.log('해설지 파일 선택 버튼 클릭');
                    currentUploadTypeRef.current = 'solution';
                    setCurrentUploadType('solution');
                    cloudinaryWidget.open();
                  } else {
                    alert('Cloudinary 위젯이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
                  }
                }}
              >
                해설지 파일 선택
              </button>
              {previewSolutionFiles.length > 0 && (
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      solutionFileUrl: [],
                      solutionFileType: []
                    }));
                    setPreviewSolutionFiles([]);
                  }}
                >
                  모든 해설지 파일 제거
                </button>
              )}
            </div>
            {previewSolutionFiles.length > 0 && (
              <div className="files-preview-container">
                {previewSolutionFiles
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
                            
                            const sortedFiles = [...previewSolutionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
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
                            
                            // formData의 solutionFileUrl과 solutionFileType도 순서 변경
                            const currentUrlIndex = formData.solutionFileUrl.findIndex(url => url === currentFile.url);
                            const prevUrlIndex = formData.solutionFileUrl.findIndex(url => url === prevFile.url);
                            
                            const newFileUrls = [...formData.solutionFileUrl];
                            const newFileTypes = [...formData.solutionFileType];
                            
                            // 배열에서 위치 교환
                            [newFileUrls[currentUrlIndex], newFileUrls[prevUrlIndex]] = 
                              [newFileUrls[prevUrlIndex], newFileUrls[currentUrlIndex]];
                            [newFileTypes[currentUrlIndex], newFileTypes[prevUrlIndex]] = 
                              [newFileTypes[prevUrlIndex], newFileTypes[currentUrlIndex]];
                            
                            setFormData(prev => ({
                              ...prev,
                              solutionFileUrl: newFileUrls,
                              solutionFileType: newFileTypes
                            }));
                            setPreviewSolutionFiles(newPreviewFiles);
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
                            const sortedFiles = [...previewSolutionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
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
                            
                            // formData의 solutionFileUrl과 solutionFileType도 순서 변경
                            const currentUrlIndex = formData.solutionFileUrl.findIndex(url => url === currentFile.url);
                            const nextUrlIndex = formData.solutionFileUrl.findIndex(url => url === nextFile.url);
                            
                            const newFileUrls = [...formData.solutionFileUrl];
                            const newFileTypes = [...formData.solutionFileType];
                            
                            // 배열에서 위치 교환
                            [newFileUrls[currentUrlIndex], newFileUrls[nextUrlIndex]] = 
                              [newFileUrls[nextUrlIndex], newFileUrls[currentUrlIndex]];
                            [newFileTypes[currentUrlIndex], newFileTypes[nextUrlIndex]] = 
                              [newFileTypes[nextUrlIndex], newFileTypes[currentUrlIndex]];
                            
                            setFormData(prev => ({
                              ...prev,
                              solutionFileUrl: newFileUrls,
                              solutionFileType: newFileTypes
                            }));
                            setPreviewSolutionFiles(newPreviewFiles);
                          }}
                          disabled={index === previewSolutionFiles.length - 1}
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
                            const sortedFiles = [...previewSolutionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                            const fileToRemove = sortedFiles[index];
                            
                            // solutionFileUrl과 solutionFileType에서 해당 파일 제거
                            const fileUrlIndex = formData.solutionFileUrl.findIndex(url => url === fileToRemove.url);
                            const newFileUrls = formData.solutionFileUrl.filter((_, i) => i !== fileUrlIndex);
                            const newFileTypes = formData.solutionFileType.filter((_, i) => i !== fileUrlIndex);
                            
                            // 미리보기 파일 목록에서 제거하고 순서 재정렬
                            const newPreviewFiles = previewSolutionFiles
                              .filter(file => file.url !== fileToRemove.url)
                              .map((file, idx) => ({ ...file, order: idx })) // 순서 재설정
                              .sort((a, b) => (a.order || 0) - (b.order || 0));
                            
                            setFormData(prev => ({
                              ...prev,
                              solutionFileUrl: newFileUrls,
                              solutionFileType: newFileTypes
                            }));
                            setPreviewSolutionFiles(newPreviewFiles);
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

          {/* 정답 입력 섹션 */}
          {formData.questionCount && parseInt(formData.questionCount) > 0 && (
            <div className="form-group answers-section">
              <label className="answers-section-label">정답 입력 {mode === 'create' && <span className="required-mark">*</span>}</label>
              {errors.answers && (
                <span className="error-message" style={{ display: 'block', marginBottom: '12px' }}>{errors.answers}</span>
              )}
              <div className="answers-list">
                {(formData.answers || []).map((ans, index) => (
                  <div key={index} className="answer-item">
                    <div className="question-header">
                      <span className="question-number">{index + 1}번</span>
                      {errors[`answer_${index + 1}`] && (
                        <span className="error-message">{errors[`answer_${index + 1}`]}</span>
                      )}
                    </div>
                    <div className="answer-inputs">
                      <div className="answer-input-group">
                        <label>정답 {mode === 'create' && <span className="required-mark">*</span>}</label>
                        <input
                          type="text"
                          value={ans.answer || ''}
                          onChange={(e) => handleAnswerChange(index, 'answer', e.target.value)}
                          placeholder={`${index + 1}번 문항 정답`}
                          className={errors[`answer_${index + 1}`] ? 'error' : ''}
                          maxLength={50}
                        />
                      </div>
                      <div className="points-input-group">
                        <label>배점</label>
                        <input
                          type="number"
                          value={ans.score || 1}
                          onChange={(e) => handleAnswerChange(index, 'score', e.target.value)}
                          placeholder="배점"
                          min="0"
                          step="0.5"
                          className={errors[`score_${index + 1}`] ? 'error' : ''}
                        />
                      </div>
                    </div>
                    {errors[`score_${index + 1}`] && (
                      <span className="error-message">{errors[`score_${index + 1}`]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="assignment-modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : mode === 'edit' ? '수정' : '추가'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

// 여러 과제 추가를 위한 컴포넌트
function MultipleAssignmentForm({ 
  forms, 
  setForms, 
  nextFormId, 
  setNextFormId, 
  onSave, 
  onClose, 
  isSubmitting, 
  setIsSubmitting,
  subjectUnits,
  subjects,
  cloudinaryWidget,
  currentUploadTypeRef,
  currentFormIdRef,
  setCurrentUploadType,
  setMultipleForms
}) {
  const [errors, setErrors] = useState({});

  // 새 과제 폼 추가
  const handleAddForm = () => {
    setForms(prev => [...prev, {
      id: nextFormId,
      assignmentName: '',
      subject: '',
      mainUnit: '',
      subUnit: '',
      questionCount: '',
      assignmentType: 'QUIZ',
      startDate: '',
      dueDate: '',
      fileUrl: [],
      fileType: [],
      questionFileUrl: [],
      questionFileType: [],
      solutionFileUrl: [],
      solutionFileType: [],
      answers: [],
      previewFiles: [],
      previewQuestionFiles: [],
      previewSolutionFiles: [],
      availableMainUnits: [],
      availableSubUnits: []
    }]);
    setNextFormId(prev => prev + 1);
  };

  // 폼 제거
  const handleRemoveForm = (formId) => {
    if (forms.length === 1) {
      alert('최소 하나의 과제 폼은 필요합니다.');
      return;
    }
    setForms(prev => prev.filter(form => form.id !== formId));
  };

  // 폼 데이터 변경
  const handleFormChange = (formId, field, value) => {
    setForms(prev => prev.map(form => {
      if (form.id === formId) {
        const updatedForm = { ...form, [field]: value };
        
        // 과제 타입 변경 시 처리
        if (field === 'assignmentType') {
          if (value === '클리닉') {
            updatedForm.mainUnit = '';
            updatedForm.subUnit = '';
            updatedForm.availableMainUnits = [];
            updatedForm.availableSubUnits = [];
          } else if (value === 'QUIZ' && form.subject) {
            if (subjectUnits[form.subject]) {
              updatedForm.availableMainUnits = subjectUnits[form.subject];
              updatedForm.availableSubUnits = [];
            }
          }
        }
        
        // 과목 변경 시 처리
        if (field === 'subject') {
          updatedForm.mainUnit = '';
          updatedForm.subUnit = '';
          if (value && form.assignmentType === 'QUIZ' && subjectUnits[value]) {
            updatedForm.availableMainUnits = subjectUnits[value];
            updatedForm.availableSubUnits = [];
          } else {
            updatedForm.availableMainUnits = [];
            updatedForm.availableSubUnits = [];
          }
        }
        
        // 대단원 변경 시 처리
        if (field === 'mainUnit') {
          updatedForm.subUnit = '';
          if (value && form.subject && subjectUnits[form.subject]) {
            const selectedMainUnit = subjectUnits[form.subject].find(unit => unit.mainUnit === value);
            if (selectedMainUnit) {
              updatedForm.availableSubUnits = selectedMainUnit.subUnits;
            } else {
              updatedForm.availableSubUnits = [];
            }
          } else {
            updatedForm.availableSubUnits = [];
          }
        }
        
        // 문항 수 변경 시 정답 배열 업데이트
        if (field === 'questionCount') {
          const questionCount = parseInt(value) || 0;
          if (questionCount > 0) {
            const newAnswers = [];
            for (let i = 1; i <= questionCount; i++) {
              const existing = form.answers?.find(ans => ans.questionNumber === i);
              newAnswers.push({
                questionNumber: i,
                answer: existing?.answer || '',
                score: existing?.score || 1
              });
            }
            updatedForm.answers = newAnswers;
          } else {
            updatedForm.answers = [];
          }
        }
        
        return updatedForm;
      }
      return form;
    }));
  };

  // 정답 변경
  const handleAnswerChange = (formId, answerIndex, field, value) => {
    setForms(prev => prev.map(form => {
      if (form.id === formId) {
        const newAnswers = [...(form.answers || [])];
        if (newAnswers[answerIndex]) {
          newAnswers[answerIndex] = {
            ...newAnswers[answerIndex],
            [field]: field === 'score' ? (parseFloat(value) || 0) : value
          };
        }
        return { ...form, answers: newAnswers };
      }
      return form;
    }));
  };

  // 폼 검증
  const validateForm = (form) => {
    const formErrors = {};
    
    if (!form.assignmentName) {
      formErrors.assignmentName = '과제명을 입력해주세요';
    }
    if (!form.subject) {
      formErrors.subject = '과목을 선택해주세요';
    }
    if (form.assignmentType === 'QUIZ') {
      if (!form.mainUnit) {
        formErrors.mainUnit = '대단원을 선택해주세요';
      }
      if (!form.subUnit) {
        formErrors.subUnit = '소단원을 선택해주세요';
      }
    }
    if (!form.questionCount || parseInt(form.questionCount) < 1) {
      formErrors.questionCount = '문항 수를 입력해주세요';
    }
    if (!form.startDate) {
      formErrors.startDate = '과제 시작일을 선택해주세요';
    }
    if (!form.dueDate) {
      formErrors.dueDate = '과제 제출일을 선택해주세요';
    } else if (form.startDate && form.dueDate) {
      const start = new Date(form.startDate);
      const due = new Date(form.dueDate);
      if (due < start) {
        formErrors.dueDate = '과제 제출일은 시작일 이후여야 합니다';
      }
    }
    
    // 정답 검증
    if (form.answers && form.answers.length > 0) {
      form.answers.forEach((ans, index) => {
        if (!ans.answer || ans.answer.trim() === '') {
          formErrors[`answer_${index + 1}`] = `${index + 1}번 문항의 정답을 입력해주세요`;
        }
      });
    }
    
    return formErrors;
  };

  // 모든 폼 검증
  const validateAllForms = () => {
    const allErrors = {};
    forms.forEach((form) => {
      const formErrors = validateForm(form);
      if (Object.keys(formErrors).length > 0) {
        allErrors[form.id] = formErrors;
      }
    });
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  // 모든 과제 저장
  const handleSubmitAll = async (e) => {
    e.preventDefault();
    
    if (!validateAllForms()) {
      alert('입력한 정보를 확인해주세요.');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const form of forms) {
        try {
          const formData = {
            assignmentName: form.assignmentName,
            subject: form.subject,
            mainUnit: form.assignmentType === '클리닉' ? '' : form.mainUnit,
            subUnit: form.assignmentType === '클리닉' ? '' : form.subUnit,
            questionCount: parseInt(form.questionCount),
            assignmentType: form.assignmentType,
            startDate: form.startDate,
            dueDate: form.dueDate,
            fileUrl: form.fileUrl || [],
            fileType: form.fileType || [],
            questionFileUrl: form.questionFileUrl || [],
            questionFileType: form.questionFileType || [],
            solutionFileUrl: form.solutionFileUrl || [],
            solutionFileType: form.solutionFileType || [],
            answers: form.answers || []
          };
          
          await onSave(formData, null);
          successCount++;
        } catch (error) {
          console.error(`과제 "${form.assignmentName}" 저장 실패:`, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        alert(`${successCount}개의 과제가 추가되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`);
        // 성공 시 폼 리셋하고 모달은 열어둠
        setForms([{
          id: 0,
          assignmentName: '',
          subject: '',
          mainUnit: '',
          subUnit: '',
          questionCount: '',
          assignmentType: 'QUIZ',
          startDate: '',
          dueDate: '',
          fileUrl: [],
          fileType: [],
          questionFileUrl: [],
          questionFileType: [],
          solutionFileUrl: [],
          solutionFileType: [],
          answers: [],
          previewFiles: [],
          previewQuestionFiles: [],
          previewSolutionFiles: [],
          availableMainUnits: [],
          availableSubUnits: []
        }]);
        setNextFormId(1);
        setErrors({});
      } else {
        alert('과제 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('과제 저장 오류:', error);
      alert('과제 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmitAll} className="assignment-modal-form">
      <div className="multiple-forms-container" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {forms.map((form, index) => (
          <div key={form.id} className="assignment-form-item" style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div className="form-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="form-item-title" style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>과제 {index + 1}</h3>
              {forms.length > 1 && (
                <button
                  type="button"
                  className="remove-form-btn"
                  onClick={() => handleRemoveForm(form.id)}
                  style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  삭제
                </button>
              )}
            </div>
            
            <SingleAssignmentForm
              form={form}
              formIndex={index}
              onChange={handleFormChange}
              onAnswerChange={handleAnswerChange}
              errors={errors[form.id] || {}}
              subjectUnits={subjectUnits}
              subjects={subjects}
              cloudinaryWidget={cloudinaryWidget}
              currentUploadTypeRef={currentUploadTypeRef}
              currentFormIdRef={currentFormIdRef}
              setCurrentUploadType={setCurrentUploadType}
              setForms={setMultipleForms}
            />
          </div>
        ))}
      </div>

      <div className="multiple-forms-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
        <button
          type="button"
          className="btn-add-form"
          onClick={handleAddForm}
          disabled={isSubmitting}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + 과제 추가
        </button>
        <div className="form-actions-right" style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
            취소
          </button>
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : `모두 저장 (${forms.length}개)`}
          </button>
        </div>
      </div>
    </form>
  );
}

// 단일 과제 폼 컴포넌트
function SingleAssignmentForm({ 
  form, 
  formIndex, 
  onChange, 
  onAnswerChange, 
  errors, 
  subjectUnits, 
  subjects,
  cloudinaryWidget,
  currentUploadTypeRef,
  currentFormIdRef,
  setCurrentUploadType,
  setForms
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(form.id, name, value);
  };

  return (
    <div className="single-assignment-form">
      <div className="form-row">
        <div className="form-group">
          <label>과제 타입 *</label>
          <select
            name="assignmentType"
            value={form.assignmentType}
            onChange={handleChange}
            className={errors.assignmentType ? 'error' : ''}
          >
            <option value="QUIZ">QUIZ</option>
            <option value="클리닉">클리닉</option>
          </select>
          {errors.assignmentType && <span className="error-message">{errors.assignmentType}</span>}
        </div>

        <div className="form-group">
          <label>과제명 *</label>
          <input
            type="text"
            name="assignmentName"
            value={form.assignmentName}
            onChange={handleChange}
            placeholder="과제명"
            className={errors.assignmentName ? 'error' : ''}
          />
          {errors.assignmentName && <span className="error-message">{errors.assignmentName}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>과목 *</label>
          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
            className={errors.subject ? 'error' : ''}
          >
            <option value="">과목 선택</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          {errors.subject && <span className="error-message">{errors.subject}</span>}
        </div>

        <div className="form-group">
          <label>문항 수 *</label>
          <input
            type="number"
            name="questionCount"
            value={form.questionCount}
            onChange={handleChange}
            placeholder="문항 수"
            min="1"
            className={errors.questionCount ? 'error' : ''}
          />
          {errors.questionCount && <span className="error-message">{errors.questionCount}</span>}
        </div>
      </div>

      {form.assignmentType === 'QUIZ' && (
        <div className="form-row">
          <div className="form-group">
            <label>대단원 *</label>
            <select
              name="mainUnit"
              value={form.mainUnit}
              onChange={handleChange}
              disabled={!form.subject}
              className={errors.mainUnit ? 'error' : ''}
            >
              <option value="">대단원 선택</option>
              {form.availableMainUnits.map(unit => (
                <option key={unit.mainUnit} value={unit.mainUnit}>{unit.mainUnit}</option>
              ))}
            </select>
            {errors.mainUnit && <span className="error-message">{errors.mainUnit}</span>}
          </div>

          <div className="form-group">
            <label>소단원 *</label>
            <select
              name="subUnit"
              value={form.subUnit}
              onChange={handleChange}
              disabled={!form.mainUnit}
              className={errors.subUnit ? 'error' : ''}
            >
              <option value="">소단원 선택</option>
              {form.availableSubUnits.map(subUnit => (
                <option key={subUnit} value={subUnit}>{subUnit}</option>
              ))}
            </select>
            {errors.subUnit && <span className="error-message">{errors.subUnit}</span>}
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>과제 시작일 *</label>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
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
            value={form.dueDate}
            onChange={handleChange}
            className={errors.dueDate ? 'error' : ''}
          />
          {errors.dueDate && <span className="error-message">{errors.dueDate}</span>}
        </div>
      </div>

      {/* 문제지 파일 업로드 */}
      <div className="form-group file-upload-group">
        <label>문제지 파일 업로드 (이미지 또는 PDF)</label>
        <div className="file-upload-section">
          <button
            type="button"
            className="upload-btn"
            onClick={() => {
              if (cloudinaryWidget) {
                console.log('문제지 파일 선택 버튼 클릭 (여러 폼 모드):', form.id);
                currentUploadTypeRef.current = 'question';
                currentFormIdRef.current = form.id;
                setCurrentUploadType('question');
                cloudinaryWidget.open();
              } else {
                alert('Cloudinary 위젯이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
              }
            }}
          >
            문제지 파일 선택
          </button>
          {(form.previewQuestionFiles || []).length > 0 && (
            <button
              type="button"
              className="remove-file-btn"
              onClick={() => {
                setForms(prev => prev.map(f => 
                  f.id === form.id 
                    ? { ...f, questionFileUrl: [], questionFileType: [], previewQuestionFiles: [] }
                    : f
                ));
              }}
            >
              모든 문제지 파일 제거
            </button>
          )}
        </div>
        {(form.previewQuestionFiles || []).length > 0 && (
          <div className="files-preview-container">
            {form.previewQuestionFiles
              .sort((a, b) => (a.order || 0) - (b.order || 0))
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
                          if (index === 0) return;
                          const sortedFiles = [...form.previewQuestionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                          const currentFile = sortedFiles[index];
                          const prevFile = sortedFiles[index - 1];
                          const newPreviewFiles = sortedFiles.map(f => {
                            if (f.url === currentFile.url) return { ...f, order: prevFile.order };
                            if (f.url === prevFile.url) return { ...f, order: currentFile.order };
                            return f;
                          }).sort((a, b) => (a.order || 0) - (b.order || 0));
                          const currentUrlIndex = form.questionFileUrl.findIndex(url => url === currentFile.url);
                          const prevUrlIndex = form.questionFileUrl.findIndex(url => url === prevFile.url);
                          const newFileUrls = [...form.questionFileUrl];
                          const newFileTypes = [...form.questionFileType];
                          [newFileUrls[currentUrlIndex], newFileUrls[prevUrlIndex]] = [newFileUrls[prevUrlIndex], newFileUrls[currentUrlIndex]];
                          [newFileTypes[currentUrlIndex], newFileTypes[prevUrlIndex]] = [newFileTypes[prevUrlIndex], newFileTypes[currentUrlIndex]];
                          setForms(prev => prev.map(f => 
                            f.id === form.id 
                              ? { ...f, questionFileUrl: newFileUrls, questionFileType: newFileTypes, previewQuestionFiles: newPreviewFiles }
                              : f
                          ));
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
                          const sortedFiles = [...form.previewQuestionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                          if (index === sortedFiles.length - 1) return;
                          const currentFile = sortedFiles[index];
                          const nextFile = sortedFiles[index + 1];
                          const newPreviewFiles = sortedFiles.map(f => {
                            if (f.url === currentFile.url) return { ...f, order: nextFile.order };
                            if (f.url === nextFile.url) return { ...f, order: currentFile.order };
                            return f;
                          }).sort((a, b) => (a.order || 0) - (b.order || 0));
                          const currentUrlIndex = form.questionFileUrl.findIndex(url => url === currentFile.url);
                          const nextUrlIndex = form.questionFileUrl.findIndex(url => url === nextFile.url);
                          const newFileUrls = [...form.questionFileUrl];
                          const newFileTypes = [...form.questionFileType];
                          [newFileUrls[currentUrlIndex], newFileUrls[nextUrlIndex]] = [newFileUrls[nextUrlIndex], newFileUrls[currentUrlIndex]];
                          [newFileTypes[currentUrlIndex], newFileTypes[nextUrlIndex]] = [newFileTypes[nextUrlIndex], newFileTypes[currentUrlIndex]];
                          setForms(prev => prev.map(f => 
                            f.id === form.id 
                              ? { ...f, questionFileUrl: newFileUrls, questionFileType: newFileTypes, previewQuestionFiles: newPreviewFiles }
                              : f
                          ));
                        }}
                        disabled={index === (form.previewQuestionFiles || []).length - 1}
                        title="아래로 이동"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="remove-single-file-btn"
                        onClick={() => {
                          const sortedFiles = [...form.previewQuestionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                          const fileToRemove = sortedFiles[index];
                          const fileUrlIndex = form.questionFileUrl.findIndex(url => url === fileToRemove.url);
                          const newFileUrls = form.questionFileUrl.filter((_, i) => i !== fileUrlIndex);
                          const newFileTypes = form.questionFileType.filter((_, i) => i !== fileUrlIndex);
                          const newPreviewFiles = form.previewQuestionFiles
                            .filter(file => file.url !== fileToRemove.url)
                            .map((file, idx) => ({ ...file, order: idx }))
                            .sort((a, b) => (a.order || 0) - (b.order || 0));
                          setForms(prev => prev.map(f => 
                            f.id === form.id 
                              ? { ...f, questionFileUrl: newFileUrls, questionFileType: newFileTypes, previewQuestionFiles: newPreviewFiles }
                              : f
                          ));
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
                        />
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="pdf-link">새 창에서 PDF 열기</a>
                          <a href={file.url} download className="pdf-link" style={{ background: '#666' }}>PDF 다운로드</a>
                        </div>
                      </div>
                    ) : (
                      <div className="preview-unknown">
                        <p style={{ marginBottom: '12px', color: '#666' }}>파일이 업로드되었습니다.</p>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="pdf-link">파일 열기</a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 해설지 파일 업로드 */}
      <div className="form-group file-upload-group">
        <label>해설지 파일 업로드 (이미지 또는 PDF)</label>
        <div className="file-upload-section">
          <button
            type="button"
            className="upload-btn"
            onClick={() => {
              if (cloudinaryWidget) {
                console.log('해설지 파일 선택 버튼 클릭 (여러 폼 모드):', form.id);
                currentUploadTypeRef.current = 'solution';
                currentFormIdRef.current = form.id;
                setCurrentUploadType('solution');
                cloudinaryWidget.open();
              } else {
                alert('Cloudinary 위젯이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
              }
            }}
          >
            해설지 파일 선택
          </button>
          {(form.previewSolutionFiles || []).length > 0 && (
            <button
              type="button"
              className="remove-file-btn"
              onClick={() => {
                setForms(prev => prev.map(f => 
                  f.id === form.id 
                    ? { ...f, solutionFileUrl: [], solutionFileType: [], previewSolutionFiles: [] }
                    : f
                ));
              }}
            >
              모든 해설지 파일 제거
            </button>
          )}
        </div>
        {(form.previewSolutionFiles || []).length > 0 && (
          <div className="files-preview-container">
            {form.previewSolutionFiles
              .sort((a, b) => (a.order || 0) - (b.order || 0))
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
                          if (index === 0) return;
                          const sortedFiles = [...form.previewSolutionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                          const currentFile = sortedFiles[index];
                          const prevFile = sortedFiles[index - 1];
                          const newPreviewFiles = sortedFiles.map(f => {
                            if (f.url === currentFile.url) return { ...f, order: prevFile.order };
                            if (f.url === prevFile.url) return { ...f, order: currentFile.order };
                            return f;
                          }).sort((a, b) => (a.order || 0) - (b.order || 0));
                          const currentUrlIndex = form.solutionFileUrl.findIndex(url => url === currentFile.url);
                          const prevUrlIndex = form.solutionFileUrl.findIndex(url => url === prevFile.url);
                          const newFileUrls = [...form.solutionFileUrl];
                          const newFileTypes = [...form.solutionFileType];
                          [newFileUrls[currentUrlIndex], newFileUrls[prevUrlIndex]] = [newFileUrls[prevUrlIndex], newFileUrls[currentUrlIndex]];
                          [newFileTypes[currentUrlIndex], newFileTypes[prevUrlIndex]] = [newFileTypes[prevUrlIndex], newFileTypes[currentUrlIndex]];
                          setForms(prev => prev.map(f => 
                            f.id === form.id 
                              ? { ...f, solutionFileUrl: newFileUrls, solutionFileType: newFileTypes, previewSolutionFiles: newPreviewFiles }
                              : f
                          ));
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
                          const sortedFiles = [...form.previewSolutionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                          if (index === sortedFiles.length - 1) return;
                          const currentFile = sortedFiles[index];
                          const nextFile = sortedFiles[index + 1];
                          const newPreviewFiles = sortedFiles.map(f => {
                            if (f.url === currentFile.url) return { ...f, order: nextFile.order };
                            if (f.url === nextFile.url) return { ...f, order: currentFile.order };
                            return f;
                          }).sort((a, b) => (a.order || 0) - (b.order || 0));
                          const currentUrlIndex = form.solutionFileUrl.findIndex(url => url === currentFile.url);
                          const nextUrlIndex = form.solutionFileUrl.findIndex(url => url === nextFile.url);
                          const newFileUrls = [...form.solutionFileUrl];
                          const newFileTypes = [...form.solutionFileType];
                          [newFileUrls[currentUrlIndex], newFileUrls[nextUrlIndex]] = [newFileUrls[nextUrlIndex], newFileUrls[currentUrlIndex]];
                          [newFileTypes[currentUrlIndex], newFileTypes[nextUrlIndex]] = [newFileTypes[nextUrlIndex], newFileTypes[currentUrlIndex]];
                          setForms(prev => prev.map(f => 
                            f.id === form.id 
                              ? { ...f, solutionFileUrl: newFileUrls, solutionFileType: newFileTypes, previewSolutionFiles: newPreviewFiles }
                              : f
                          ));
                        }}
                        disabled={index === (form.previewSolutionFiles || []).length - 1}
                        title="아래로 이동"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="remove-single-file-btn"
                        onClick={() => {
                          const sortedFiles = [...form.previewSolutionFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
                          const fileToRemove = sortedFiles[index];
                          const fileUrlIndex = form.solutionFileUrl.findIndex(url => url === fileToRemove.url);
                          const newFileUrls = form.solutionFileUrl.filter((_, i) => i !== fileUrlIndex);
                          const newFileTypes = form.solutionFileType.filter((_, i) => i !== fileUrlIndex);
                          const newPreviewFiles = form.previewSolutionFiles
                            .filter(file => file.url !== fileToRemove.url)
                            .map((file, idx) => ({ ...file, order: idx }))
                            .sort((a, b) => (a.order || 0) - (b.order || 0));
                          setForms(prev => prev.map(f => 
                            f.id === form.id 
                              ? { ...f, solutionFileUrl: newFileUrls, solutionFileType: newFileTypes, previewSolutionFiles: newPreviewFiles }
                              : f
                          ));
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
                        />
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="pdf-link">새 창에서 PDF 열기</a>
                          <a href={file.url} download className="pdf-link" style={{ background: '#666' }}>PDF 다운로드</a>
                        </div>
                      </div>
                    ) : (
                      <div className="preview-unknown">
                        <p style={{ marginBottom: '12px', color: '#666' }}>파일이 업로드되었습니다.</p>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="pdf-link">파일 열기</a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 정답 입력 섹션 */}
      {form.questionCount && parseInt(form.questionCount) > 0 && (
        <div className="form-group answers-section">
          <label className="answers-section-label">정답 입력 *</label>
          <div className="answers-list">
            {(form.answers || []).map((ans, index) => (
              <div key={index} className="answer-item">
                <div className="question-header">
                  <span className="question-number">{index + 1}번</span>
                  {errors[`answer_${index + 1}`] && (
                    <span className="error-message">{errors[`answer_${index + 1}`]}</span>
                  )}
                </div>
                <div className="answer-inputs">
                  <div className="answer-input-group">
                    <label>정답 *</label>
                    <input
                      type="text"
                      value={ans.answer || ''}
                      onChange={(e) => onAnswerChange(form.id, index, 'answer', e.target.value)}
                      placeholder={`${index + 1}번 문항 정답`}
                      className={errors[`answer_${index + 1}`] ? 'error' : ''}
                      maxLength={50}
                    />
                  </div>
                  <div className="points-input-group">
                    <label>배점</label>
                    <input
                      type="number"
                      value={ans.score || 1}
                      onChange={(e) => onAnswerChange(form.id, index, 'score', e.target.value)}
                      placeholder="배점"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentModal;

