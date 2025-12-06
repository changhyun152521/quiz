import { useState, useEffect, useRef } from 'react';
import { post } from '../utils/api';
import '../components/AssignmentDetail.css';

function AssignmentDetailPage({ assignment, user, onBack, onAssignmentUpdate }) {
  // 학생 ID 가져오기
  const studentId = user?._id || user?.id || null;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'select'
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // 핀치 줌 관련 상태
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStartDistance, setPinchStartDistance] = useState(0);
  const [pinchStartZoom, setPinchStartZoom] = useState(1);
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });
  const lastTouchesRef = useRef([]);
  
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const originalImageRef = useRef(null);
  const [images, setImages] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [baseDisplaySize, setBaseDisplaySize] = useState({ width: 0, height: 0 });
  const [showAnswerPanel, setShowAnswerPanel] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // 펜/지우개 사용 여부 추적
  const [submissionResult, setSubmissionResult] = useState(null); // 제출 결과 저장
  const [isSubmitted, setIsSubmitted] = useState(false); // 제출 상태

  // 페이지 마운트 시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [])

  // 펜 색상 옵션 (5가지)
  const penColors = [
    { name: '검정', value: '#000000' },
    { name: '빨강', value: '#FF0000' },
    { name: '파랑', value: '#0000FF' },
    { name: '초록', value: '#00AA00' },
    { name: '보라', value: '#800080' }
  ];

  // 이미지 파일만 필터링
  useEffect(() => {
    if (assignment && assignment.fileUrl && assignment.fileType) {
      const imageFiles = [];
      const fileUrls = Array.isArray(assignment.fileUrl) ? assignment.fileUrl : [];
      const fileTypes = Array.isArray(assignment.fileType) ? assignment.fileType : [];
      
      for (let i = 0; i < fileUrls.length; i++) {
        if (fileTypes[i] === 'image') {
          imageFiles.push(fileUrls[i]);
        }
      }
      setImages(imageFiles);
      setCurrentImageIndex(0);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      // 첫 이미지의 변경사항 여부 확인 (24시간 이내인 경우만)
      if (assignment && assignment._id && studentId) {
        const submittedAtKey = `assignment_${assignment._id}_student_${studentId}_submittedAt`;
        const submittedAtStr = localStorage.getItem(submittedAtKey);
        
        let shouldCheckData = true;
        if (submittedAtStr) {
          try {
            const submittedAt = new Date(submittedAtStr);
            const now = new Date();
            const hoursSinceSubmission = (now - submittedAt) / (1000 * 60 * 60);
            
            if (hoursSinceSubmission >= 24) {
              shouldCheckData = false;
              // 만료된 데이터 삭제
              for (let i = 0; i < 100; i++) {
                localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${i}`);
              }
              localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_empty`);
              localStorage.removeItem(submittedAtKey);
            }
          } catch (error) {
            console.error('제출 시간 확인 중 오류:', error);
          }
        }
        
        if (shouldCheckData && studentId) {
          const savedData = localStorage.getItem(`assignment_${assignment._id}_student_${studentId}_image_0`) ||
                           localStorage.getItem(`assignment_${assignment._id}_student_${studentId}_image_empty`);
          setHasChanges(!!savedData);
        } else {
          setHasChanges(false);
        }
      } else {
        setHasChanges(false);
      }
    } else {
      setImages([]);
      setCurrentImageIndex(0);
      setHasChanges(false);
    }
  }, [assignment]);

  // 만료된 캔버스 데이터 삭제 함수 (24시간 경과)
  const cleanupExpiredCanvasData = (assignmentId) => {
    if (!assignmentId || !studentId) return;
    
    const submittedAtKey = `assignment_${assignmentId}_student_${studentId}_submittedAt`;
    const submittedAtStr = localStorage.getItem(submittedAtKey);
    
    if (!submittedAtStr) return; // 제출 기록이 없으면 삭제하지 않음
    
    try {
      const submittedAt = new Date(submittedAtStr);
      const now = new Date();
      const hoursSinceSubmission = (now - submittedAt) / (1000 * 60 * 60); // 시간 단위
      
      // 24시간이 지났으면 모든 캔버스 데이터 삭제
      if (hoursSinceSubmission >= 24) {
        // 모든 이미지 인덱스에 대한 캔버스 데이터 삭제
        for (let i = 0; i < 100; i++) { // 최대 100개 이미지까지 체크
          localStorage.removeItem(`assignment_${assignmentId}_student_${studentId}_image_${i}`);
        }
        // 빈 캔버스 데이터도 삭제
        localStorage.removeItem(`assignment_${assignmentId}_student_${studentId}_image_empty`);
        // 제출 시간 기록도 삭제
        localStorage.removeItem(submittedAtKey);
        console.log(`과제 ${assignmentId}의 만료된 캔버스 데이터가 삭제되었습니다.`);
      }
    } catch (error) {
      console.error('만료된 캔버스 데이터 삭제 중 오류:', error);
    }
  };

  // 제출 상태 확인 및 만료된 데이터 정리
  useEffect(() => {
    if (assignment && user && assignment.submissions) {
      const submission = assignment.submissions.find(
        sub => {
          const subStudentId = sub.studentId?._id || sub.studentId;
          const userId = user._id;
          return subStudentId && userId && String(subStudentId) === String(userId);
        }
      );
      
      if (submission) {
        setIsSubmitted(true);
        setSubmissionResult({
          correctCount: submission.correctCount || 0,
          wrongCount: submission.wrongCount || 0,
          totalCount: assignment.questionCount || 0
        });
        
        // 제출 시간을 localStorage에 저장 (없는 경우에만)
        if (studentId) {
          const submittedAtKey = `assignment_${assignment._id}_student_${studentId}_submittedAt`;
          if (!localStorage.getItem(submittedAtKey) && submission.submittedAt) {
            localStorage.setItem(submittedAtKey, new Date(submission.submittedAt).toISOString());
          }
        }
        
        // 만료된 캔버스 데이터 정리
        cleanupExpiredCanvasData(assignment._id);
        
        // 제출된 답안으로 answers 초기화
        if (submission.studentAnswers && Array.isArray(submission.studentAnswers)) {
          const questionCount = Number(assignment.questionCount) || submission.studentAnswers.length;
          const submittedAnswers = [];
          
          // 문항 번호 순서대로 정렬
          const sortedAnswers = [...submission.studentAnswers].sort((a, b) => {
            const numA = Number(a.questionNumber) || 0;
            const numB = Number(b.questionNumber) || 0;
            return numA - numB;
          });
          
          // 모든 문항에 대해 답안 설정 (없는 문항은 빈 문자열)
          for (let i = 1; i <= questionCount; i++) {
            const submittedAnswer = sortedAnswers.find(sa => 
              Number(sa.questionNumber) === i || String(sa.questionNumber) === String(i)
            );
            submittedAnswers.push({
              questionNumber: i,
              answer: submittedAnswer?.answer || '',
              score: 1
            });
          }
          
          setAnswers(submittedAnswers);
        }
      } else {
        setIsSubmitted(false);
        setSubmissionResult(null);
      }
    } else if (assignment && !user) {
      // user가 없으면 제출 상태 초기화
      setIsSubmitted(false);
      setSubmissionResult(null);
    }
    
    // 컴포넌트 마운트 시에도 만료된 데이터 정리
    if (assignment && assignment._id) {
      cleanupExpiredCanvasData(assignment._id);
    }
  }, [assignment, user]);

  // 정답 초기화 - 문항수만큼 필드 생성 (제출되지 않은 경우만)
  useEffect(() => {
    if (!isSubmitted && assignment && assignment.questionCount) {
      const questionCount = Number(assignment.questionCount);
      if (questionCount > 0) {
        const initialAnswers = [];
        for (let i = 1; i <= questionCount; i++) {
          // 학생인 경우 정답을 보여주지 않음 (빈 문자열로 초기화)
          // 관리자나 강사인 경우에만 기존 정답 사용
          const isStudent = user && (user.role === 'student' || !user.role);
          const existingAnswer = !isStudent && assignment.answers?.find(a => 
            a.questionNumber === i || a.questionNumber === String(i)
          );
          initialAnswers.push({
            questionNumber: i,
            answer: existingAnswer?.answer || '',
            score: existingAnswer?.score || 1
          });
        }
        console.log('정답 필드 초기화:', { questionCount, initialAnswers });
        setAnswers(initialAnswers);
      } else {
        setAnswers([]);
      }
    }
  }, [assignment, isSubmitted, user]);

  // 캔버스 초기화 및 이미지 로드
  useEffect(() => {
    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || !drawingCanvas) return;

    const ctx = canvas.getContext('2d');
    const drawingCtx = drawingCanvas.getContext('2d');
    setImageLoaded(false);

    // 이미지가 없는 경우 빈 캔버스 초기화
    if (images.length === 0) {
      setTimeout(() => {
        const viewerContainer = document.querySelector('.image-viewer');
        if (!viewerContainer) {
          console.error('뷰어 컨테이너를 찾을 수 없습니다');
          setImageLoaded(false);
          return;
        }
        
        // 컨테이너 크기 가져오기
        const containerWidth = viewerContainer.clientWidth;
        const containerHeight = viewerContainer.clientHeight;

        // 빈 캔버스 기본 크기 설정 (A4 비율: 210:297, 약 0.707)
        const defaultAspect = 210 / 297; // A4 비율
        let displayWidth, displayHeight;
        const containerAspect = containerWidth / containerHeight;

        if (defaultAspect > containerAspect) {
          // 기본 비율이 더 넓음 - 너비 기준
          displayWidth = containerWidth * 0.9; // 여백을 위해 90% 사용
          displayHeight = displayWidth / defaultAspect;
        } else {
          // 기본 비율이 더 높음 - 높이 기준
          displayHeight = containerHeight * 0.9; // 여백을 위해 90% 사용
          displayWidth = displayHeight * defaultAspect;
        }

        // 최소 크기 보장
        displayWidth = Math.max(displayWidth, 600);
        displayHeight = Math.max(displayHeight, 800);

        setBaseDisplaySize({ width: displayWidth, height: displayHeight });

        // image-viewer-content 크기 설정
        const contentDiv = canvas.parentElement;
        if (contentDiv) {
          contentDiv.style.width = `${displayWidth}px`;
          contentDiv.style.height = `${displayHeight}px`;
          contentDiv.style.minWidth = `${displayWidth}px`;
          contentDiv.style.minHeight = `${displayHeight}px`;
          contentDiv.style.maxWidth = `${displayWidth}px`;
          contentDiv.style.maxHeight = `${displayHeight}px`;
          contentDiv.style.margin = '0 auto'; // 좌우 중앙 정렬
          contentDiv.style.backgroundColor = '#ffffff'; // 흰색 배경
        }

        // 원본 이미지 캔버스 설정 (빈 캔버스)
        const canvasWidth = 2100; // 고해상도를 위한 실제 크기 (A4 300dpi 기준)
        const canvasHeight = 2970;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.display = 'block';
        canvas.style.margin = '0';
        canvas.style.padding = '0';
        canvas.style.backgroundColor = '#ffffff'; // 흰색 배경

        // 흰색 배경 그리기
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 그리기 캔버스 설정
        drawingCanvas.width = canvasWidth;
        drawingCanvas.height = canvasHeight;
        drawingCanvas.style.width = `${displayWidth}px`;
        drawingCanvas.style.height = `${displayHeight}px`;
        drawingCanvas.style.position = 'absolute';
        drawingCanvas.style.top = '0';
        drawingCanvas.style.left = '0';
        drawingCanvas.style.zIndex = '2';
        drawingCanvas.style.display = 'block';
        drawingCanvas.style.margin = '0';
        drawingCanvas.style.padding = '0';

        // 저장된 그리기 데이터 복원 (24시간 이내인 경우만)
        if (assignment && assignment._id && studentId) {
          const submittedAtKey = `assignment_${assignment._id}_student_${studentId}_submittedAt`;
          const submittedAtStr = localStorage.getItem(submittedAtKey);
          
          let shouldLoadData = true;
          if (submittedAtStr) {
            try {
              const submittedAt = new Date(submittedAtStr);
              const now = new Date();
              const hoursSinceSubmission = (now - submittedAt) / (1000 * 60 * 60);
              
              // 24시간이 지났으면 데이터를 로드하지 않고 삭제
              if (hoursSinceSubmission >= 24) {
                shouldLoadData = false;
                localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_empty`);
                localStorage.removeItem(submittedAtKey);
                console.log(`과제 ${assignment._id}의 만료된 캔버스 데이터가 삭제되었습니다.`);
              }
            } catch (error) {
              console.error('제출 시간 확인 중 오류:', error);
            }
          }
          
          if (shouldLoadData) {
            const savedData = localStorage.getItem(`assignment_${assignment._id}_student_${studentId}_image_empty`);
            if (savedData) {
              try {
                const image = new Image();
                image.onload = () => {
                  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                  drawingCtx.drawImage(image, 0, 0);
                  setHasChanges(true);
                };
                image.src = savedData;
              } catch (error) {
                console.error('저장된 그리기 데이터 복원 실패:', error);
              }
            }
          }
        }

        setImageLoaded(true);
      }, 100);
      return;
    }

    // 이미지가 있는 경우 기존 로직
    if (currentImageIndex >= images.length) return;

    // 이미지 객체 새로 생성
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      originalImageRef.current = img;

      // 뷰어 컨테이너 크기 가져오기 (약간의 지연을 두어 DOM이 완전히 렌더링된 후)
      setTimeout(() => {
        const viewerContainer = document.querySelector('.image-viewer');
        if (!viewerContainer) {
          console.error('뷰어 컨테이너를 찾을 수 없습니다');
          setImageLoaded(false);
          return;
        }
        
        // 컨테이너 크기 가져오기 (패딩 없음)
        const containerWidth = viewerContainer.clientWidth;
        const containerHeight = viewerContainer.clientHeight;

        // 이미지 비율 계산
        const imageAspect = img.width / img.height;
        const containerAspect = containerWidth / containerHeight;

        // 뷰어를 항상 채우도록 (너비와 높이 중 더 큰 비율로 맞춤)
        let displayWidth, displayHeight;
        if (imageAspect > containerAspect) {
          // 이미지가 더 넓음 - 너비 기준
          displayWidth = containerWidth;
          displayHeight = displayWidth / imageAspect;
        } else {
          // 이미지가 더 높음 - 높이 기준
          displayHeight = containerHeight;
          displayWidth = displayHeight * imageAspect;
        }

        setBaseDisplaySize({ width: displayWidth, height: displayHeight });

        // image-viewer-content 크기 설정 (뷰어를 항상 채우도록, 좌우 중앙 정렬)
        const contentDiv = canvas.parentElement;
        if (contentDiv) {
          contentDiv.style.width = `${displayWidth}px`;
          contentDiv.style.height = `${displayHeight}px`;
          contentDiv.style.minWidth = `${displayWidth}px`;
          contentDiv.style.minHeight = `${displayHeight}px`;
          contentDiv.style.maxWidth = `${displayWidth}px`;
          contentDiv.style.maxHeight = `${displayHeight}px`;
          contentDiv.style.margin = '0 auto'; // 좌우 중앙 정렬
        }

        // 원본 이미지 캔버스 설정
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.display = 'block';
        canvas.style.margin = '0';
        canvas.style.padding = '0';

        // 그리기 캔버스 설정
        drawingCanvas.width = img.width;
        drawingCanvas.height = img.height;
        drawingCanvas.style.width = `${displayWidth}px`;
        drawingCanvas.style.height = `${displayHeight}px`;
        drawingCanvas.style.position = 'absolute';
        drawingCanvas.style.top = '0';
        drawingCanvas.style.left = '0';
        drawingCanvas.style.zIndex = '2';
        drawingCanvas.style.display = 'block';
        drawingCanvas.style.margin = '0';
        drawingCanvas.style.padding = '0';

        // 원본 이미지 그리기
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        console.log('이미지 로드 완료:', {
          imageSize: { width: img.width, height: img.height },
          displaySize: { width: displayWidth, height: displayHeight },
          canvasSize: { width: canvas.width, height: canvas.height },
          canvasStyle: { width: canvas.style.width, height: canvas.style.height }
        });

        // 그리기 캔버스 초기화
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

        // 저장된 그리기 복원 (24시간 이내인 경우만)
        if (studentId) {
          const submittedAtKey = `assignment_${assignment._id}_student_${studentId}_submittedAt`;
          const submittedAtStr = localStorage.getItem(submittedAtKey);
          
          let shouldLoadData = true;
          if (submittedAtStr) {
            try {
              const submittedAt = new Date(submittedAtStr);
              const now = new Date();
              const hoursSinceSubmission = (now - submittedAt) / (1000 * 60 * 60);
              
              // 24시간이 지났으면 데이터를 로드하지 않고 삭제
              if (hoursSinceSubmission >= 24) {
                shouldLoadData = false;
                // 모든 이미지 인덱스에 대한 캔버스 데이터 삭제
                for (let i = 0; i < 100; i++) {
                  localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${i}`);
                }
                localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_empty`);
                localStorage.removeItem(submittedAtKey);
                console.log(`과제 ${assignment._id}의 만료된 캔버스 데이터가 삭제되었습니다.`);
              }
            } catch (error) {
              console.error('제출 시간 확인 중 오류:', error);
            }
          }
          
          if (shouldLoadData) {
            const savedData = localStorage.getItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex}`);
            if (savedData) {
              const savedImg = new Image();
              savedImg.onload = () => {
                drawingCtx.drawImage(savedImg, 0, 0, drawingCanvas.width, drawingCanvas.height);
                setImageLoaded(true);
                setHasChanges(true); // 저장된 그리기가 있으면 변경사항 있음
              };
              savedImg.onerror = () => {
                console.error('저장된 그리기 로드 실패');
                setImageLoaded(true);
                setHasChanges(false);
              };
              savedImg.src = savedData;
            } else {
              setImageLoaded(true);
              setHasChanges(false); // 저장된 그리기가 없으면 변경사항 없음
            }
          } else {
            setImageLoaded(true);
            setHasChanges(false); // 만료되어 삭제된 경우
          }
        }
      }, 100);
    };

    img.onerror = (error) => {
      console.error('이미지 로드 실패:', images[currentImageIndex], error);
      setImageLoaded(false);
    };

    const imageUrl = images[currentImageIndex];
    if (!imageUrl) {
      console.error('이미지 URL이 없습니다');
      setImageLoaded(false);
      return;
    }

    img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
  }, [currentImageIndex, images, assignment, zoom]);

  // 줌 변경 시 캔버스 크기 업데이트
  useEffect(() => {
    if (!imageLoaded || baseDisplaySize.width === 0) return;

    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const contentDiv = canvas?.parentElement;
    if (!canvas || !drawingCanvas || !contentDiv) return;

    const scaledWidth = baseDisplaySize.width * zoom;
    const scaledHeight = baseDisplaySize.height * zoom;

    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;
    drawingCanvas.style.width = `${scaledWidth}px`;
    drawingCanvas.style.height = `${scaledHeight}px`;
    
    // contentDiv 크기도 업데이트
    contentDiv.style.width = `${scaledWidth}px`;
    contentDiv.style.height = `${scaledHeight}px`;
  }, [zoom, imageLoaded, baseDisplaySize]);

  // 이전 이미지로 이동
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      saveDrawing();
      setCurrentImageIndex(currentImageIndex - 1);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      // 다음 이미지의 변경사항 여부 확인 (24시간 이내인 경우만)
      if (studentId) {
        const submittedAtKey = `assignment_${assignment._id}_student_${studentId}_submittedAt`;
        const submittedAtStr = localStorage.getItem(submittedAtKey);
        
        let shouldCheckData = true;
        if (submittedAtStr) {
          try {
            const submittedAt = new Date(submittedAtStr);
            const now = new Date();
            const hoursSinceSubmission = (now - submittedAt) / (1000 * 60 * 60);
            
            if (hoursSinceSubmission >= 24) {
              shouldCheckData = false;
              // 만료된 데이터 삭제
              for (let i = 0; i < 100; i++) {
                localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${i}`);
              }
              localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_empty`);
              localStorage.removeItem(submittedAtKey);
            }
          } catch (error) {
            console.error('제출 시간 확인 중 오류:', error);
          }
        }
        
        if (shouldCheckData) {
          const savedData = localStorage.getItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex - 1}`);
          setHasChanges(!!savedData);
        } else {
          setHasChanges(false);
        }
      }
    }
  };

  // 다음 이미지로 이동
  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      saveDrawing();
      setCurrentImageIndex(currentImageIndex + 1);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      // 다음 이미지의 변경사항 여부 확인 (24시간 이내인 경우만)
      if (studentId) {
        const submittedAtKey = `assignment_${assignment._id}_student_${studentId}_submittedAt`;
        const submittedAtStr = localStorage.getItem(submittedAtKey);
        
        let shouldCheckData = true;
        if (submittedAtStr) {
          try {
            const submittedAt = new Date(submittedAtStr);
            const now = new Date();
            const hoursSinceSubmission = (now - submittedAt) / (1000 * 60 * 60);
            
            if (hoursSinceSubmission >= 24) {
              shouldCheckData = false;
              // 만료된 데이터 삭제
              for (let i = 0; i < 100; i++) {
                localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${i}`);
              }
              localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_empty`);
              localStorage.removeItem(submittedAtKey);
            }
          } catch (error) {
            console.error('제출 시간 확인 중 오류:', error);
          }
        }
        
        if (shouldCheckData) {
          const savedData = localStorage.getItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex + 1}`);
          setHasChanges(!!savedData);
        } else {
          setHasChanges(false);
        }
      }
    }
  };

  // 그리기 저장
  const saveDrawing = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas && studentId) {
      const dataURL = drawingCanvas.toDataURL();
      // 이미지가 없는 경우 빈 캔버스로 저장
      if (images.length === 0) {
        localStorage.setItem(`assignment_${assignment._id}_student_${studentId}_image_empty`, dataURL);
      } else {
        localStorage.setItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex}`, dataURL);
      }
    }
  };

  // 화면 좌표를 캔버스 좌표로 변환
  const getCanvasCoordinates = (clientX, clientY) => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return { x: 0, y: 0 };
    
    const rect = drawingCanvas.getBoundingClientRect();
    const scaleX = drawingCanvas.width / rect.width;
    const scaleY = drawingCanvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // 클릭/터치 위치가 이미지 영역 내에 있는지 확인
  const isPointInImageBounds = (clientX, clientY) => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return false;
    
    const rect = drawingCanvas.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  // 줌 인
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  // 줌 아웃
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  // 돌아가기 (그리기/지우기 취소)
  const handleUndo = () => {
    if (!hasChanges) return;
    
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas && studentId) {
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      // 저장된 그리기 데이터 삭제
      localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex}`);
      setHasChanges(false);
    }
  };

  // 마우스 다운
  const handleMouseDown = (e) => {
    if (!imageLoaded) return;
    
    // 이미지 영역 내에서만 작동
    if (!isPointInImageBounds(e.clientX, e.clientY)) {
      return;
    }
    
    if (tool === 'select') {
      // 선택 도구: 팬 시작 (이미지/그림 이동)
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (tool === 'pen' || tool === 'eraser') {
      // 펜 또는 지우개: 그리기 시작
      setIsDrawing(true);
      const drawingCanvas = drawingCanvasRef.current;
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      
      const ctx = drawingCanvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  // 마우스 이동
  const handleMouseMove = (e) => {
    if (!imageLoaded) return;
    
    if (tool === 'select' && isPanning) {
      // 선택 도구: 팬 이동 (이미지/그림 이동) - 이미지 영역 내에서만
      if (isPointInImageBounds(e.clientX, e.clientY)) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
      }
    } else if ((tool === 'pen' || tool === 'eraser') && isDrawing) {
      // 펜 또는 지우개: 그리기
      const drawingCanvas = drawingCanvasRef.current;
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      
      const ctx = drawingCanvas.getContext('2d');
      ctx.lineTo(coords.x, coords.y);
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = penSize;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      
      // 변경사항 있음 표시
      setHasChanges(true);
    }
  };

  // 마우스 업
  const handleMouseUp = () => {
    if (isDrawing) {
      // 그리기 완료
      saveDrawing();
      setIsDrawing(false);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // 두 터치 포인트 사이의 거리 계산
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 두 터치 포인트의 중심점 계산
  const getTouchCenter = (touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // 터치 이벤트 처리
  const handleTouchStart = (e) => {
    e.preventDefault();
    
    const touches = Array.from(e.touches);
    lastTouchesRef.current = touches;

    // 두 개의 터치 포인트가 있으면 핀치 줌 시작
    if (touches.length === 2) {
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      
      setIsPinching(true);
      setPinchStartDistance(distance);
      setPinchStartZoom(zoom);
      setPinchCenter(center);
      
      // 그리기 및 팬 중지
      setIsDrawing(false);
      setIsPanning(false);
      return;
    }

    // 한 개의 터치 포인트만 있으면 일반 터치 처리
    if (touches.length === 1) {
      const touch = touches[0];
      // 이미지 영역 내에서만 작동
      if (!isPointInImageBounds(touch.clientX, touch.clientY)) {
        return;
      }
      
      // 핀치 중이 아니면 일반 터치 처리
      if (!isPinching) {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        handleMouseDown(mouseEvent);
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    
    const touches = Array.from(e.touches);
    lastTouchesRef.current = touches;

    // 두 개의 터치 포인트가 있으면 핀치 줌 처리
    if (touches.length === 2 && isPinching) {
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      
      // 줌 비율 계산
      const scale = distance / pinchStartDistance;
      const newZoom = Math.max(0.5, Math.min(3, pinchStartZoom * scale));
      
      // 핀치 중심점 기준으로 팬 오프셋 조정
      const viewerContainer = document.querySelector('.image-viewer');
      const contentDiv = document.querySelector('.image-viewer-content');
      if (viewerContainer && contentDiv) {
        const viewerRect = viewerContainer.getBoundingClientRect();
        const contentRect = contentDiv.getBoundingClientRect();
        
        // 현재 핀치 중심점을 뷰어 좌표계로 변환
        const pinchX = center.x - viewerRect.left;
        const pinchY = center.y - viewerRect.top;
        
        // 시작 핀치 중심점을 뷰어 좌표계로 변환
        const startPinchX = pinchCenter.x - viewerRect.left;
        const startPinchY = pinchCenter.y - viewerRect.top;
        
        // 줌 변화에 따른 오프셋 조정
        // 핀치 중심점이 고정되도록 오프셋 계산
        const zoomDelta = newZoom - pinchStartZoom;
        const offsetX = startPinchX - (startPinchX - panOffset.x) * (newZoom / pinchStartZoom);
        const offsetY = startPinchY - (startPinchY - panOffset.y) * (newZoom / pinchStartZoom);
        
        // 핀치 중심점 이동에 따른 추가 오프셋
        const centerDeltaX = pinchX - startPinchX;
        const centerDeltaY = pinchY - startPinchY;
        
        setPanOffset({
          x: offsetX + centerDeltaX,
          y: offsetY + centerDeltaY
        });
        setPinchCenter(center);
      }
      
      setZoom(newZoom);
      return;
    }

    // 한 개의 터치 포인트만 있고 핀치 중이 아니면 일반 터치 처리
    if (touches.length === 1 && !isPinching) {
      const touch = touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      handleMouseMove(mouseEvent);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    
    const touches = Array.from(e.touches);
    lastTouchesRef.current = touches;

    // 핀치 줌 종료
    if (isPinching && touches.length < 2) {
      setIsPinching(false);
      setPinchStartDistance(0);
      setPinchStartZoom(1);
      setPinchCenter({ x: 0, y: 0 });
    }

    // 모든 터치가 끝나면 일반 터치 종료
    if (touches.length === 0) {
      handleMouseUp();
    }
  };

  // 전체 지우기
  const handleClear = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas && studentId) {
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex}`);
      setHasChanges(false);
    }
  };

  // 마우스 휠로 줌
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // 정답 입력 핸들러
  const handleAnswerChange = (questionNumber, value) => {
    setAnswers(prev => prev.map(a => 
      a.questionNumber === questionNumber 
        ? { ...a, answer: value }
        : a
    ));
  };

  // 정답 제출
  const handleSubmitAnswers = async () => {
    if (!assignment || !assignment._id) {
      alert('과제 정보를 불러올 수 없습니다.');
      return;
    }

    // 빈 답안 체크
    const emptyAnswers = answers.filter(a => !a.answer.trim());
    if (emptyAnswers.length > 0) {
      if (!window.confirm(`${emptyAnswers.length}개의 문항에 답안이 없습니다. 계속하시겠습니까?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      // 학생 답안 형식으로 변환
      const studentAnswers = answers.map(a => ({
        questionNumber: a.questionNumber,
        answer: a.answer.trim()
      }));

      const response = await post(`/api/assignments/${assignment._id}/submit`, {
        studentAnswers: studentAnswers
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const totalQuestions = assignment.questionCount || answers.length;
        const correctCount = data.data.correctCount || 0;
        const wrongCount = data.data.wrongCount || 0;
        
        // 제출 상태 업데이트
        setIsSubmitted(true);
        setSubmissionResult({
          correctCount: correctCount,
          wrongCount: wrongCount,
          totalCount: totalQuestions
        });
        
        // 제출된 답안을 answers에 저장 (읽기 전용으로 표시하기 위해)
        // answers는 이미 제출한 내용이므로 그대로 유지
        
        alert(`제출 완료!\n\n${totalQuestions}개 중 ${correctCount}개 맞았습니다.\n\n맞은 개수: ${correctCount}개\n틀린 개수: ${wrongCount}개`);
        setShowAnswerPanel(false);
        
        // 제출된 assignment 정보 업데이트
        const updatedAssignment = {
          ...assignment,
          submissions: assignment.submissions ? [...assignment.submissions] : []
        };
        
        // 현재 사용자의 제출 정보 추가/업데이트
        const submissionIndex = updatedAssignment.submissions.findIndex(
          sub => {
            const subStudentId = sub.studentId?._id || sub.studentId;
            const userId = user._id;
            return subStudentId && userId && String(subStudentId) === String(userId);
          }
        );
        
        const submittedAt = new Date();
        const newSubmission = {
          studentId: user._id,
          studentAnswers: studentAnswers,
          correctCount: correctCount,
          wrongCount: wrongCount,
          submittedAt: submittedAt
        };
        
        if (submissionIndex >= 0) {
          updatedAssignment.submissions[submissionIndex] = newSubmission;
        } else {
          updatedAssignment.submissions.push(newSubmission);
        }
        
        // 제출 시간을 localStorage에 저장 (24시간 후 자동 삭제를 위해)
        if (studentId) {
          const submittedAtKey = `assignment_${assignment._id}_student_${studentId}_submittedAt`;
          localStorage.setItem(submittedAtKey, submittedAt.toISOString());
        }
        
        // assignment 업데이트 콜백 호출
        if (onAssignmentUpdate) {
          onAssignmentUpdate(updatedAssignment);
        }
        
        // 대시보드로 돌아가서 제출 상태 업데이트
        // 서버에 저장이 완료되도록 약간의 지연 후 이동
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        throw new Error(data.message || '정답 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('정답 제출 오류:', error);
      alert('정답 제출에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!assignment) {
    return (
      <div className="assignment-detail-empty">
        <p>과제 정보를 불러올 수 없습니다.</p>
        <button onClick={onBack} className="btn-back">돌아가기</button>
      </div>
    );
  }

  // 이미지가 없어도 빈 캔버스로 필기할 수 있도록 렌더링 계속 진행

  return (
    <div className="assignment-detail">
      <header className="assignment-detail-header">
        <div className="assignment-detail-header-content">
          <button onClick={onBack} className="btn-back-header">
            ← 돌아가기
          </button>
          <h2 className="assignment-detail-title">{assignment.assignmentName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowAnswerPanel(!showAnswerPanel)}
            className="btn-answer"
          >
            정답
          </button>
            {isSubmitted && (
              <span className="status-badge status-submitted">제출완료</span>
            )}
          </div>
        </div>
      </header>

      <div className="tool-panel tool-panel-second">
        <div className="tool-section">
          <h3 className="tool-section-title">줌</h3>
          <div className="zoom-controls">
            <button onClick={handleZoomOut} className="zoom-btn" disabled={zoom <= 0.5}>
              −
            </button>
            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="zoom-btn" disabled={zoom >= 3}>
              +
            </button>
            <button 
              onClick={handleUndo} 
              className="zoom-reset-btn"
              disabled={!hasChanges}
            >
              돌아가기
            </button>
          <button onClick={handleClear} className="btn-clear">
            전체 지우기
          </button>
          </div>
        </div>
      </div>

      <main className="assignment-detail-main">
        <div className="image-viewer-container">
          <div 
            className="image-viewer"
            onWheel={handleWheel}
            style={{
              cursor: tool === 'select' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair'
            }}
          >
            <div
              className="image-viewer-content"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: 'top left'
              }}
            >
              {images.length > 0 && (
                <img
                  ref={imageRef}
                  src={images[currentImageIndex]}
                  alt={`과제 이미지 ${currentImageIndex + 1}`}
                  className="assignment-image"
                  style={{ display: 'none' }}
                />
              )}
              <canvas
                ref={canvasRef}
                className="assignment-canvas"
                style={{ pointerEvents: 'none' }}
              />
              <canvas
                ref={drawingCanvasRef}
                className="assignment-canvas assignment-drawing-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{ 
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              />
            </div>
          </div>

        </div>

        {images.length > 1 && (
          <div className="image-navigation">
            <button
              className="nav-btn nav-btn-prev"
              onClick={handlePrevImage}
              disabled={currentImageIndex === 0}
            >
              ← 이전
            </button>
            <span className="image-counter">
              {currentImageIndex + 1} / {images.length}
            </span>
            <button
              className="nav-btn nav-btn-next"
              onClick={handleNextImage}
              disabled={currentImageIndex === images.length - 1}
            >
              다음 →
            </button>
          </div>
        )}

        <div className="tool-panel">
          <div className="tool-section">
            <h3 className="tool-section-title">도구</h3>
            <div className="tool-buttons">
              <button
                className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
                onClick={() => setTool('select')}
              >
                선택
              </button>
              <button
                className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
                onClick={() => setTool('pen')}
              >
                펜
              </button>
              <button
                className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
              >
                지우개
              </button>
            </div>
          </div>

          <div className="tool-section">
            <h3 className="tool-section-title">펜 색상</h3>
            <div className="pen-colors">
              {penColors.map((color) => (
                <button
                  key={color.value}
                  className={`pen-color-btn ${penColor === color.value ? 'active' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setPenColor(color.value)}
                  title={color.name}
                  disabled={tool !== 'pen'}
                />
              ))}
            </div>
          </div>

          <div className="tool-section">
            <h3 className="tool-section-title">크기</h3>
            <div className="pen-size-control">
              <input
                type="range"
                min="1"
                max="10"
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                className="pen-size-slider"
              />
              <span className="pen-size-value">{penSize}px</span>
            </div>
          </div>

        </div>
      </main>

      {/* 정답 입력 패널 */}
      <div className={`answer-panel ${showAnswerPanel ? 'open' : ''}`}>
        <div className="answer-panel-header">
          <h3 className="answer-panel-title">정답 입력</h3>
          <button 
            className="answer-panel-close"
            onClick={() => setShowAnswerPanel(false)}
          >
            ×
          </button>
        </div>
        <div className="answer-panel-content">
          {isSubmitted && submissionResult && (
            <div className="submission-result-info">
              <div className="result-summary">
                <span className="result-text">
                  {submissionResult.totalCount}개 중 {submissionResult.correctCount}개 맞았습니다
                </span>
              </div>
              <div className="result-details">
                <span className="result-item">맞은 개수: {submissionResult.correctCount}개</span>
                <span className="result-item">틀린 개수: {submissionResult.wrongCount}개</span>
              </div>
            </div>
          )}
          <div className="answer-list">
            {answers.map((answer) => (
              <div key={answer.questionNumber} className="answer-item">
                <span className="answer-label">{answer.questionNumber}번</span>
                <input
                  type="text"
                  className="answer-input"
                  value={answer.answer}
                  onChange={(e) => handleAnswerChange(answer.questionNumber, e.target.value)}
                  placeholder="답"
                  readOnly={isSubmitted}
                  disabled={isSubmitted}
                />
              </div>
            ))}
          </div>
          {!isSubmitted && (
          <div className="answer-panel-footer">
            <button
              className="btn-submit-answer"
              onClick={handleSubmitAnswers}
              disabled={isSubmitting}
            >
              {isSubmitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
          )}
        </div>
      </div>
      {showAnswerPanel && (
        <div 
          className="answer-panel-overlay"
          onClick={() => setShowAnswerPanel(false)}
        />
      )}
    </div>
  );
}

export default AssignmentDetailPage;
