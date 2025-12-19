import { useState, useEffect, useRef, useCallback } from 'react';
import { get, post } from '../utils/api';
import '../components/AssignmentDetail.css';

function AssignmentDetailPage({ assignment, user, onBack, onAssignmentUpdate }) {
  // 학생 ID 가져오기
  const studentId = user?._id || user?.id || null;
  const [currentAssignment, setCurrentAssignment] = useState(assignment); // assignment를 state로 관리
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
  const handleMouseDownRef = useRef(null);
  const handleMouseMoveRef = useRef(null);
  const handleMouseUpRef = useRef(null);
  const [images, setImages] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [baseDisplaySize, setBaseDisplaySize] = useState({ width: 0, height: 0 });
  const [showAnswerPanel, setShowAnswerPanel] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // 펜/지우개 사용 여부 추적
  const [submissionResult, setSubmissionResult] = useState(null); // 제출 결과 저장
  const [isSubmitted, setIsSubmitted] = useState(false); // 제출 상태
  const [drawingHistory, setDrawingHistory] = useState([]); // 그리기 히스토리 (각 stroke마다 저장)
  const [redoHistory, setRedoHistory] = useState([]); // 되돌리기 히스토리 (되돌린 항목들 저장)
  const isSavingHistoryRef = useRef(false); // 히스토리 저장 중복 방지
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(false); // assignment 로딩 상태
  const [showSolutionModal, setShowSolutionModal] = useState(false); // 해설지 모달 표시 여부
  const [solutionZoomLevel, setSolutionZoomLevel] = useState(1); // 해설지 줌 레벨
  const [solutionPanPosition, setSolutionPanPosition] = useState({ x: 0, y: 0 }); // 해설지 팬 위치
  const [isSolutionDragging, setIsSolutionDragging] = useState(false); // 해설지 드래그 중 여부
  const [solutionDragStart, setSolutionDragStart] = useState({ x: 0, y: 0 }); // 해설지 드래그 시작 위치
  const [currentSolutionImageIndex, setCurrentSolutionImageIndex] = useState(0); // 현재 해설지 이미지 인덱스
  const solutionViewerRef = useRef(null); // 해설지 뷰어 ref
  const [solutionImageLoaded, setSolutionImageLoaded] = useState(false); // 해설지 이미지 로드 여부
  const solutionCanvasRef = useRef(null); // 해설지 캔버스 ref
  const [solutionTouchStartDistance, setSolutionTouchStartDistance] = useState(0); // 해설지 터치 시작 거리
  const [solutionTouchStartZoom, setSolutionTouchStartZoom] = useState(1); // 해설지 터치 시작 줌 레벨
  const [isSolutionPinching, setIsSolutionPinching] = useState(false); // 해설지 핀치 줌 중 여부

  // 해설지 모달이 열릴 때 줌/팬 초기화
  useEffect(() => {
    if (showSolutionModal) {
      setSolutionZoomLevel(1);
      setSolutionPanPosition({ x: 0, y: 0 });
      setCurrentSolutionImageIndex(0);
      setIsSolutionDragging(false);
      setIsSolutionPinching(false);
      setSolutionImageLoaded(false);
    }
  }, [showSolutionModal]);

  // assignment prop이 변경될 때 currentAssignment 업데이트
  useEffect(() => {
    if (assignment) {
      console.log('[AssignmentDetailPage] assignment prop 변경:', {
        assignmentId: assignment._id,
        hasSolutionFileUrl: !!assignment.solutionFileUrl,
        solutionFileUrlCount: assignment.solutionFileUrl?.length || 0,
        solutionFileUrl: assignment.solutionFileUrl,
        hasSolutionFileType: !!assignment.solutionFileType,
        solutionFileType: assignment.solutionFileType,
        fullAssignment: assignment
      });
      // assignment prop을 즉시 currentAssignment에 반영
      setCurrentAssignment(assignment);
    } else {
      // assignment가 null이면 currentAssignment도 초기화
      setCurrentAssignment(null);
    }
  }, [assignment]);

  // currentAssignment가 업데이트되면 제출된 답안도 다시 설정
  useEffect(() => {
    const assignmentToCheck = currentAssignment || assignment;
    if (assignmentToCheck && user && assignmentToCheck.submissions && isSubmitted) {
      const submission = assignmentToCheck.submissions.find(
        sub => {
          const subStudentId = sub.studentId?._id || sub.studentId;
          const userId = user._id;
          return subStudentId && userId && String(subStudentId) === String(userId);
        }
      );
      
      if (submission && submission.studentAnswers && Array.isArray(submission.studentAnswers)) {
        const questionCount = Number(assignmentToCheck.questionCount) || submission.studentAnswers.length;
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
    }
  }, [currentAssignment, user, isSubmitted]);

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

  // 이미지 파일만 필터링 (문제지 파일 우선 사용)
  useEffect(() => {
    // currentAssignment 우선 사용, 없으면 assignment prop 사용
    const assignmentToCheck = currentAssignment || assignment;
    
    // 문제지 파일 우선 사용, 없으면 기존 fileUrl 사용 (하위 호환성)
    const questionFileUrls = Array.isArray(assignmentToCheck?.questionFileUrl) && assignmentToCheck.questionFileUrl.length > 0
      ? assignmentToCheck.questionFileUrl
      : (Array.isArray(assignmentToCheck?.fileUrl) ? assignmentToCheck.fileUrl : []);
    const questionFileTypes = Array.isArray(assignmentToCheck?.questionFileType) && assignmentToCheck.questionFileType.length > 0
      ? assignmentToCheck.questionFileType
      : (Array.isArray(assignmentToCheck?.fileType) ? assignmentToCheck.fileType : []);
    
    if (assignmentToCheck && questionFileUrls.length > 0) {
      const imageFiles = [];
      
      for (let i = 0; i < questionFileUrls.length; i++) {
        if (questionFileTypes[i] === 'image') {
          imageFiles.push(questionFileUrls[i]);
        }
      }
      setImages(imageFiles);
      setCurrentImageIndex(0);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setDrawingHistory([]); // 이미지 변경 시 히스토리 초기화
      setRedoHistory([]); // redo 히스토리도 초기화
        // 첫 이미지의 변경사항 여부 확인 (24시간 이내인 경우만)
        if (assignmentToCheck && assignmentToCheck._id && studentId) {
          const submittedAtKey = `assignment_${assignmentToCheck._id}_student_${studentId}_submittedAt`;
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
          const savedData = localStorage.getItem(`assignment_${assignmentToCheck._id}_student_${studentId}_image_0`) ||
                           localStorage.getItem(`assignment_${assignmentToCheck._id}_student_${studentId}_image_empty`);
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
  }, [assignment, currentAssignment]);

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
    const assignmentToCheck = currentAssignment || assignment;
    console.log('제출 상태 확인 - assignmentToCheck:', {
      hasAssignment: !!assignmentToCheck,
      hasSubmissions: !!assignmentToCheck?.submissions,
      submissionsCount: assignmentToCheck?.submissions?.length,
      submissions: assignmentToCheck?.submissions,
      hasUser: !!user,
      userId: user?._id,
      hasSolutionFileUrl: !!assignmentToCheck?.solutionFileUrl,
      solutionFileUrlCount: assignmentToCheck?.solutionFileUrl?.length || 0,
      solutionFileUrl: assignmentToCheck?.solutionFileUrl
    });
    
    if (assignmentToCheck && user && assignmentToCheck.submissions) {
      const submission = assignmentToCheck.submissions.find(
        sub => {
          const subStudentId = sub.studentId?._id || sub.studentId;
          const userId = user._id;
          const match = subStudentId && userId && String(subStudentId) === String(userId);
          console.log('제출 상태 확인 - submission 비교:', {
            subStudentId,
            userId,
            match,
            submission: sub
          });
          return match;
        }
      );
      
      console.log('제출 상태 확인 - 찾은 submission:', {
        hasSubmission: !!submission,
        submission: submission,
        hasStudentAnswers: !!submission?.studentAnswers,
        studentAnswers: submission?.studentAnswers
      });
      
      if (submission) {
        setIsSubmitted(true);
        setSubmissionResult({
          correctCount: submission.correctCount || 0,
          wrongCount: submission.wrongCount || 0,
          totalCount: assignmentToCheck.questionCount || 0
        });
        
        // 제출 시간을 localStorage에 저장 (없는 경우에만)
        if (studentId) {
          const submittedAtKey = `assignment_${assignmentToCheck._id}_student_${studentId}_submittedAt`;
          if (!localStorage.getItem(submittedAtKey) && submission.submittedAt) {
            localStorage.setItem(submittedAtKey, new Date(submission.submittedAt).toISOString());
          }
        }
        
        // 만료된 캔버스 데이터 정리
        cleanupExpiredCanvasData(assignmentToCheck._id);
        
        // 제출된 답안으로 answers 초기화
        if (submission.studentAnswers && Array.isArray(submission.studentAnswers)) {
          console.log('제출 상태 확인 - studentAnswers 처리 시작:', submission.studentAnswers);
          const questionCount = Number(assignmentToCheck.questionCount) || submission.studentAnswers.length;
          const submittedAnswers = [];
          
          // 문항 번호 순서대로 정렬
          const sortedAnswers = [...submission.studentAnswers].sort((a, b) => {
            const numA = Number(a.questionNumber) || 0;
            const numB = Number(b.questionNumber) || 0;
            return numA - numB;
          });
          
          console.log('제출 상태 확인 - 정렬된 답안:', sortedAnswers);
          
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
          
          console.log('제출 상태 확인 - 설정할 답안:', submittedAnswers);
          setAnswers(submittedAnswers);
        } else {
          console.warn('제출 상태 확인 - studentAnswers가 없거나 배열이 아님:', {
            hasStudentAnswers: !!submission.studentAnswers,
            studentAnswers: submission.studentAnswers,
            isArray: Array.isArray(submission.studentAnswers)
          });
        }
      } else {
        console.log('제출 상태 확인 - submission을 찾을 수 없음');
        setIsSubmitted(false);
        setSubmissionResult(null);
      }
    } else if (assignmentToCheck && !user) {
      // user가 없으면 제출 상태 초기화
      console.log('제출 상태 확인 - user가 없음');
      setIsSubmitted(false);
      setSubmissionResult(null);
    }
    
    // 컴포넌트 마운트 시에도 만료된 데이터 정리
    const assignmentToClean = currentAssignment || assignment;
    if (assignmentToClean && assignmentToClean._id) {
      cleanupExpiredCanvasData(assignmentToClean._id);
    }
  }, [currentAssignment, assignment, user]);

  // 정답 초기화 - 문항수만큼 필드 생성 (제출되지 않은 경우만)
  useEffect(() => {
    if (!isSubmitted && assignment && assignment.questionCount) {
      const questionCount = Number(assignment.questionCount);
      if (questionCount > 0) {
        const initialAnswers = [];
        for (let i = 1; i <= questionCount; i++) {
          // 학생인 경우 정답을 보여주지 않음 (빈 문자열로 초기화)
          // 관리자나 강사인 경우에만 기존 정답 사용
          const isStudent = user && (user.userType === '학생' || (!user.userType && !user.isAdmin));
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

  // 정답 패널이 열릴 때마다 assignment의 최신 정보 가져오기 (answers 포함)
  // 주의: 이 useEffect는 정답 버튼 클릭 시 이미 데이터를 가져오므로 중복 방지
  useEffect(() => {
    // 정답 패널이 열렸지만 아직 데이터가 로드되지 않은 경우에만 실행
    if (showAnswerPanel && assignment?._id && !currentAssignment?.answers && isSubmitted) {
      const fetchAssignment = async () => {
        setIsLoadingAssignment(true);
        try {
          const response = await get(`/api/assignments/${assignment._id}`);
          const data = await response.json();
          if (data.success && data.data) {
            setCurrentAssignment(data.data);
            if (onAssignmentUpdate) {
              onAssignmentUpdate(data.data);
            }
            
            // 제출된 답안 설정
            if (data.data.submissions && user) {
              const submission = data.data.submissions.find(
                sub => {
                  const subStudentId = sub.studentId?._id || sub.studentId;
                  const userId = user._id;
                  return subStudentId && userId && String(subStudentId) === String(userId);
                }
              );
              
              if (submission && submission.studentAnswers && Array.isArray(submission.studentAnswers)) {
                const questionCount = Number(data.data.questionCount) || submission.studentAnswers.length;
                const submittedAnswers = [];
                
                const sortedAnswers = [...submission.studentAnswers].sort((a, b) => {
                  const numA = Number(a.questionNumber) || 0;
                  const numB = Number(b.questionNumber) || 0;
                  return numA - numB;
                });
                
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
            }
          }
        } catch (error) {
          console.error('과제 정보 가져오기 오류:', error);
        } finally {
          setIsLoadingAssignment(false);
        }
      };
      fetchAssignment();
    }
  }, [showAnswerPanel, assignment?._id, user, isSubmitted, currentAssignment]);

  // 캔버스 초기화 및 이미지 로드
  useEffect(() => {
    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || !drawingCanvas) return;

    const ctx = canvas.getContext('2d');
    const drawingCtx = drawingCanvas.getContext('2d');
    setImageLoaded(false);
    setDrawingHistory([]); // 이미지 로드 시작 시 히스토리 초기화

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
            // 저장된 데이터를 로드한 후 히스토리 초기화 (새로운 작업부터 히스토리 시작)
            setDrawingHistory([]);
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
          setDrawingHistory([]); // 히스토리 초기화
            }
          } else {
            setImageLoaded(true);
            setHasChanges(false); // 만료되어 삭제된 경우
            setDrawingHistory([]); // 히스토리 초기화
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

  // 터치 이벤트 리스너 직접 등록 (passive: false로 설정하여 preventDefault 가능하게)
  useEffect(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;

    // 이벤트 핸들러를 useEffect 내부에서 직접 정의
    const handleTouchStartLocal = (e) => {
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
        // 이미지 영역 내에서만 작동 (직접 구현)
        const drawingCanvas = drawingCanvasRef.current;
        if (!drawingCanvas) return;
        const rect = drawingCanvas.getBoundingClientRect();
        const isInBounds = (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        );
        if (!isInBounds) {
          return;
        }
        
        // 핀치 중이 아니면 일반 터치 처리
        if (!isPinching) {
          // 직접 마우스 다운 로직 실행
          if (imageLoaded) {
            if (tool === 'select') {
              setIsPanning(true);
              setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
            } else if (tool === 'pen' || tool === 'eraser') {
              setIsDrawing(true);
              const drawingCanvas = drawingCanvasRef.current;
              if (drawingCanvas) {
                const rect = drawingCanvas.getBoundingClientRect();
                const scaleX = drawingCanvas.width / rect.width;
                const scaleY = drawingCanvas.height / rect.height;
                const coords = {
                  x: (touch.clientX - rect.left) * scaleX,
                  y: (touch.clientY - rect.top) * scaleY
                };
                const ctx = drawingCanvas.getContext('2d');
                ctx.beginPath();
                ctx.moveTo(coords.x, coords.y);
              }
            }
          }
        }
      }
    };

    const handleTouchMoveLocal = (e) => {
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
          
          // 현재 핀치 중심점을 뷰어 좌표계로 변환
          const pinchX = center.x - viewerRect.left;
          const pinchY = center.y - viewerRect.top;
          
          // 시작 핀치 중심점을 뷰어 좌표계로 변환
          const startPinchX = pinchCenter.x - viewerRect.left;
          const startPinchY = pinchCenter.y - viewerRect.top;
          
          // 줌 변화에 따른 오프셋 조정
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
        // 직접 마우스 이동 로직 실행
        if (imageLoaded) {
          if (tool === 'select' && isPanning) {
            if (isPointInImageBounds(touch.clientX, touch.clientY)) {
              setPanOffset({
                x: touch.clientX - panStart.x,
                y: touch.clientY - panStart.y
              });
            }
          } else if ((tool === 'pen' || tool === 'eraser') && isDrawing) {
            const drawingCanvas = drawingCanvasRef.current;
            if (drawingCanvas) {
              const rect = drawingCanvas.getBoundingClientRect();
              const scaleX = drawingCanvas.width / rect.width;
              const scaleY = drawingCanvas.height / rect.height;
              const coords = {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
              };
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
              setHasChanges(true);
            }
          }
        }
      }
    };

    const handleTouchEndLocal = (e) => {
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
        // 직접 마우스 업 로직 실행
        if (isDrawing) {
          // 중복 저장 방지
          if (!isSavingHistoryRef.current) {
            isSavingHistoryRef.current = true;
            const drawingCanvas = drawingCanvasRef.current;
            if (drawingCanvas) {
              // 지우개 작업 후 globalCompositeOperation 초기화
              const ctx = drawingCanvas.getContext('2d');
              ctx.globalCompositeOperation = 'source-over';
              
              const currentState = drawingCanvas.toDataURL('image/png');
              setDrawingHistory(prev => {
                // 중복 체크: 마지막 상태와 동일하면 저장하지 않음
                if (prev.length > 0 && prev[prev.length - 1] === currentState) {
                  isSavingHistoryRef.current = false;
                  return prev;
                }
                isSavingHistoryRef.current = false;
                // 새로운 작업을 하면 redo 히스토리 초기화
                setRedoHistory([]);
                return [...prev, currentState];
              });
            } else {
              isSavingHistoryRef.current = false;
            }
          }
          saveDrawing();
          setIsDrawing(false);
        }
        if (isPanning) {
          setIsPanning(false);
        }
      }
    };

    // passive: false로 이벤트 리스너 등록
    drawingCanvas.addEventListener('touchstart', handleTouchStartLocal, { passive: false });
    drawingCanvas.addEventListener('touchmove', handleTouchMoveLocal, { passive: false });
    drawingCanvas.addEventListener('touchend', handleTouchEndLocal, { passive: false });
    drawingCanvas.addEventListener('touchcancel', handleTouchEndLocal, { passive: false });

    // cleanup 함수
    return () => {
      drawingCanvas.removeEventListener('touchstart', handleTouchStartLocal);
      drawingCanvas.removeEventListener('touchmove', handleTouchMoveLocal);
      drawingCanvas.removeEventListener('touchend', handleTouchEndLocal);
      drawingCanvas.removeEventListener('touchcancel', handleTouchEndLocal);
    };
  }, [zoom, isPinching, pinchStartDistance, pinchStartZoom, pinchCenter, panOffset, imageLoaded, tool, penSize, penColor, isPanning, panStart, isDrawing]);

  // 이전 이미지로 이동
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      saveDrawing();
      setCurrentImageIndex(currentImageIndex - 1);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setDrawingHistory([]); // 이미지 변경 시 히스토리 초기화
      setRedoHistory([]); // redo 히스토리도 초기화
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
      setDrawingHistory([]); // 이미지 변경 시 히스토리 초기화
      setRedoHistory([]); // redo 히스토리도 초기화
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

  // 되돌리기 (마지막 그리기/지우기 작업만 취소)
  const handleUndo = () => {
    if (drawingHistory.length === 0) {
      return;
    }
    
    // 마지막 작업 하나만 제거하고 redo 히스토리에 추가
    const lastState = drawingHistory[drawingHistory.length - 1];
    const newHistory = drawingHistory.slice(0, -1); // 마지막 항목 제외한 새 배열
    setDrawingHistory(newHistory);
    setRedoHistory(prev => [...prev, lastState]); // 되돌린 항목을 redo 히스토리에 추가
    
    // 이전 상태로 복원
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      
      // 캔버스 컨텍스트 상태 초기화 (지우개 작업 후 복원 시 필요)
      ctx.globalCompositeOperation = 'source-over';
      
      // 마지막 상태로 복원
      if (newHistory.length > 0) {
        const prevState = newHistory[newHistory.length - 1];
        const img = new Image();
        img.onload = () => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(img, 0, 0);
          setHasChanges(true);
          // 복원 후 localStorage에도 저장
          saveDrawing();
        };
        img.onerror = () => {
          console.error('히스토리 이미지 로드 실패');
          setHasChanges(newHistory.length > 0);
        };
        img.src = prevState;
      } else {
        // 히스토리가 비어있으면 변경사항 없음
        setHasChanges(false);
        localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex}`);
      }
    }
  };

  // 다시 살리기 (되돌린 작업 복원)
  const handleRedo = () => {
    if (redoHistory.length === 0) {
      return;
    }
    
    // redo 히스토리의 마지막 항목을 drawing 히스토리에 다시 추가
    const lastRedoState = redoHistory[redoHistory.length - 1];
    const newRedoHistory = redoHistory.slice(0, -1);
    setRedoHistory(newRedoHistory);
    setDrawingHistory(prev => [...prev, lastRedoState]);
    
    // 복원된 상태로 캔버스 업데이트
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      
      // 캔버스 컨텍스트 상태 초기화 (지우개 작업 후 복원 시 필요)
      ctx.globalCompositeOperation = 'source-over';
      
      const img = new Image();
      img.onload = () => {
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0);
        setHasChanges(true);
        // 복원 후 localStorage에도 저장
        saveDrawing();
      };
      img.onerror = () => {
        console.error('Redo 이미지 로드 실패');
      };
      img.src = lastRedoState;
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
      // 캔버스 컨텍스트 상태 초기화
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
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
      // 그리기 완료 - 현재 상태를 히스토리에 저장 (stroke 완료 시점)
      // 중복 저장 방지
      if (!isSavingHistoryRef.current) {
        isSavingHistoryRef.current = true;
        const drawingCanvas = drawingCanvasRef.current;
        if (drawingCanvas) {
          // 지우개 작업 후 globalCompositeOperation 초기화
          const ctx = drawingCanvas.getContext('2d');
          ctx.globalCompositeOperation = 'source-over';
          
          const currentState = drawingCanvas.toDataURL('image/png');
          setDrawingHistory(prev => {
            // 중복 체크: 마지막 상태와 동일하면 저장하지 않음
            if (prev.length > 0 && prev[prev.length - 1] === currentState) {
              isSavingHistoryRef.current = false;
              return prev;
            }
            isSavingHistoryRef.current = false;
            // 새로운 작업을 하면 redo 히스토리 초기화
            setRedoHistory([]);
            return [...prev, currentState];
          });
        } else {
          isSavingHistoryRef.current = false;
        }
      }
      
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

  // 터치 이벤트 처리 (useCallback으로 감싸서 useEffect 의존성 문제 해결)
  const handleTouchStart = useCallback((e) => {
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
  }, [zoom, isPinching, handleMouseDown, isPointInImageBounds]);

  const handleTouchMove = useCallback((e) => {
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
  }, [isPinching, pinchStartDistance, pinchStartZoom, pinchCenter, panOffset, handleMouseMove]);

  const handleTouchEnd = useCallback((e) => {
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
  }, [isPinching, handleMouseUp]);

  // 전체 지우기
  const handleClear = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas && studentId) {
      // 지우기 전 현재 상태를 히스토리에 저장
      const currentState = drawingCanvas.toDataURL('image/png');
      
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      ctx.globalCompositeOperation = 'source-over'; // 컨텍스트 상태 초기화
      
      localStorage.removeItem(`assignment_${assignment._id}_student_${studentId}_image_${currentImageIndex}`);
      setHasChanges(false);
      
      // 현재 상태를 히스토리에 저장 (되돌리기로 복원 가능하도록)
      setDrawingHistory(prev => {
        // 중복 체크: 마지막 상태와 동일하면 저장하지 않음
        if (prev.length > 0 && prev[prev.length - 1] === currentState) {
          return prev;
        }
        return [...prev, currentState];
      });
      setRedoHistory([]); // redo 히스토리 초기화
    }
  };

  // 마우스 휠로 줌
  const handleWheel = (e) => {
    // passive 이벤트 리스너에서는 preventDefault를 호출할 수 없으므로
    // 이벤트가 기본 동작을 하지 않도록 처리
    if (e.cancelable) {
      e.preventDefault();
    }
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

      // 풀이 이미지들을 base64로 변환
      const solutionImages = [];
      const drawingCanvas = drawingCanvasRef.current;
      
      // 현재 이미지의 풀이를 먼저 저장
      if (drawingCanvas) {
        saveDrawing();
      }
      
      if (images.length > 0) {
        // 각 이미지에 대한 풀이를 localStorage에서 가져오기
        for (let i = 0; i < images.length; i++) {
          let drawingData = null;
          
          // 현재 이미지인 경우 drawingCanvas에서 직접 가져오기
          if (i === currentImageIndex && drawingCanvas) {
            drawingData = drawingCanvas.toDataURL('image/png');
          } else {
            // 다른 이미지의 풀이는 localStorage에서 가져오기
            const drawingKey = `assignment_${assignment._id}_student_${studentId}_image_${i}`;
            drawingData = localStorage.getItem(drawingKey);
          }
          
          if (drawingData && drawingData.startsWith('data:image')) {
            solutionImages.push(drawingData);
          } else {
            // 풀이가 없는 경우 빈 캔버스 생성
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 1000;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            solutionImages.push(canvas.toDataURL('image/png'));
          }
        }
      } else if (drawingCanvas) {
        // 이미지가 없는 경우 (빈 캔버스)
        const emptyKey = `assignment_${assignment._id}_student_${studentId}_image_empty`;
        const emptyData = localStorage.getItem(emptyKey);
        
        if (emptyData && emptyData.startsWith('data:image')) {
          solutionImages.push(emptyData);
        } else {
          // 현재 그리기 캔버스의 내용을 가져오기
          const dataURL = drawingCanvas.toDataURL('image/png');
          solutionImages.push(dataURL);
        }
      }

      // solutionImages 크기 확인 및 로깅
      const filteredSolutionImages = solutionImages.filter(img => img !== null);
      console.log(`제출할 풀이 이미지 개수: ${filteredSolutionImages.length}`);
      if (filteredSolutionImages.length > 0) {
        const totalSizeKB = filteredSolutionImages.reduce((sum, img) => sum + (img.length / 1024), 0);
        console.log(`총 풀이 이미지 크기: ${Math.round(totalSizeKB)}KB`);
      }

      let response;
      let data;
      
      try {
        response = await post(`/api/assignments/${assignment._id}/submit`, {
            studentAnswers: studentAnswers,
            solutionImages: filteredSolutionImages
        });

        data = await response.json();
      } catch (fetchError) {
        console.error('요청 전송 실패:', fetchError);
        throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      }

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
      console.error('에러 상세:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // 응답이 있는 경우 에러 메시지 추출
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = error.response.statusText || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`정답 제출에 실패했습니다: ${errorMessage}`);
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
          <button onClick={onBack} className="btn-back-header" title="돌아가기">
            ←
          </button>
          <h2 className="assignment-detail-title">{assignment.assignmentName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={async () => {
              // 정답 패널을 열 때 assignment의 최신 정보 가져오기 (answers 포함)
              if (!showAnswerPanel && assignment?._id) {
                setIsLoadingAssignment(true);
                try {
                  const response = await get(`/api/assignments/${assignment._id}`);
                  const data = await response.json();
                  if (data.success && data.data) {
                    console.log('정답 버튼 클릭 - 받은 데이터:', {
                      hasAnswers: !!data.data.answers,
                      answersCount: data.data.answers?.length,
                      answers: data.data.answers,
                      hasSubmissions: !!data.data.submissions,
                      submissionsCount: data.data.submissions?.length,
                      fullData: data.data
                    });
                    
                    // 정답이 없으면 경고 및 상세 정보 출력 (제출된 경우에만)
                    if (!data.data.answers || data.data.answers.length === 0) {
                      console.error('정답 버튼 클릭 - 정답이 없습니다!', {
                        assignmentId: assignment._id,
                        assignmentData: data.data,
                        user: user,
                        isSubmitted: isSubmitted,
                        hasSubmissions: !!data.data.submissions,
                        submissions: data.data.submissions
                      });
                      // 제출된 경우에만 경고 표시 (제출 전에는 정답이 없는 것이 정상)
                      if (isSubmitted) {
                        alert('경고: 정답 정보를 불러올 수 없습니다. 관리자에게 문의하세요.');
                      }
                    } else {
                      console.log('정답 버튼 클릭 - 정답 확인:', {
                        answersCount: data.data.answers.length,
                        answers: data.data.answers.map(a => ({
                          questionNumber: a.questionNumber,
                          answer: a.answer,
                          score: a.score
                        }))
                      });
                    }
                    
                    // currentAssignment 업데이트
                    setCurrentAssignment(data.data);
                    if (onAssignmentUpdate) {
                      onAssignmentUpdate(data.data);
                    }
                    
                    // 제출된 답안 즉시 설정
                    if (data.data.submissions && user) {
                      const submission = data.data.submissions.find(
                        sub => {
                          const subStudentId = sub.studentId?._id || sub.studentId;
                          const userId = user._id;
                          return subStudentId && userId && String(subStudentId) === String(userId);
                        }
                      );
                      
                      if (submission && submission.studentAnswers && Array.isArray(submission.studentAnswers)) {
                        const questionCount = Number(data.data.questionCount) || submission.studentAnswers.length;
                        const submittedAnswers = [];
                        
                        // 문항 번호 순서대로 정렬
                        const sortedAnswers = [...submission.studentAnswers].sort((a, b) => {
                          const numA = Number(a.questionNumber) || 0;
                          const numB = Number(b.questionNumber) || 0;
                          return numA - numB;
                        });
                        
                        // 모든 문항에 대해 답안 설정
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
                        
                        console.log('정답 버튼 클릭 - 설정할 답안:', submittedAnswers);
                        setAnswers(submittedAnswers);
                      }
                    }
                  }
                } catch (error) {
                  console.error('과제 정보 가져오기 오류:', error);
                  // 제출 전에는 에러 메시지를 표시하지 않음 (정답이 없는 것이 정상)
                  if (isSubmitted) {
                    alert('과제 정보를 불러올 수 없습니다. 관리자에게 문의하세요.');
                  }
                } finally {
                  setIsLoadingAssignment(false);
                }
              }
              setShowAnswerPanel(!showAnswerPanel);
            }}
            className="btn-answer"
          >
            정답
          </button>
            {isSubmitted && (() => {
              // 해설지 파일 확인 - 모든 가능한 소스에서 확인
              const assignmentToCheck = currentAssignment || assignment;
              
              // 해설지 파일 URL 배열 확인 (여러 소스에서 확인)
              let solutionFileUrls = [];
              let solutionFileTypes = [];
              
              // 1. currentAssignment에서 확인
              if (currentAssignment) {
                const currentUrls = Array.isArray(currentAssignment.solutionFileUrl) 
                  ? currentAssignment.solutionFileUrl 
                  : (currentAssignment.solutionFileUrl ? [currentAssignment.solutionFileUrl] : []);
                const currentTypes = Array.isArray(currentAssignment.solutionFileType) 
                  ? currentAssignment.solutionFileType 
                  : (currentAssignment.solutionFileType ? [currentAssignment.solutionFileType] : []);
                
                if (currentUrls.length > 0) {
                  solutionFileUrls = currentUrls;
                  solutionFileTypes = currentTypes;
                }
              }
              
              // 2. assignment prop에서 확인 (currentAssignment에 없으면)
              if (solutionFileUrls.length === 0 && assignment) {
                const assignmentUrls = Array.isArray(assignment.solutionFileUrl) 
                  ? assignment.solutionFileUrl 
                  : (assignment.solutionFileUrl ? [assignment.solutionFileUrl] : []);
                const assignmentTypes = Array.isArray(assignment.solutionFileType) 
                  ? assignment.solutionFileType 
                  : (assignment.solutionFileType ? [assignment.solutionFileType] : []);
                
                if (assignmentUrls.length > 0) {
                  solutionFileUrls = assignmentUrls;
                  solutionFileTypes = assignmentTypes;
                }
              }
              
              const hasSolutionFiles = solutionFileUrls.length > 0;
              
              console.log('[AssignmentDetailPage] 해설지 파일 확인 (렌더링 시점):', {
                isSubmitted: isSubmitted,
                hasCurrentAssignment: !!currentAssignment,
                hasAssignment: !!assignment,
                currentAssignmentId: currentAssignment?._id,
                assignmentId: assignment?._id,
                currentAssignmentSolutionFileUrl: currentAssignment?.solutionFileUrl,
                assignmentSolutionFileUrl: assignment?.solutionFileUrl,
                solutionFileUrls: solutionFileUrls,
                solutionFileUrlsLength: solutionFileUrls.length,
                solutionFileTypes: solutionFileTypes,
                hasSolutionFiles: hasSolutionFiles,
                assignmentToCheckId: assignmentToCheck?._id,
                assignmentToCheckSolutionFileUrl: assignmentToCheck?.solutionFileUrl
              });
              
              // 해설지 파일이 있으면 해설지 버튼 표시, 없으면 제출완료 뱃지 표시
              if (hasSolutionFiles) {
                console.log('[AssignmentDetailPage] ✅ 해설지 버튼 표시함 - 해설지 파일 개수:', solutionFileUrls.length);
                return (
                  <button
                    onClick={() => {
                      // 해설지 모달 열기
                      setShowSolutionModal(true);
                    }}
                    className="btn-solution"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    해설지
                  </button>
                );
              } else {
                console.log('[AssignmentDetailPage] ❌ 해설지 파일이 없어서 제출완료 뱃지 표시');
                return <span className="status-badge status-submitted">제출완료</span>;
              }
            })()}
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
              className="zoom-reset-btn undo-btn"
              disabled={drawingHistory.length === 0 && !hasChanges}
              title="마지막 작업 취소"
            >
              ↶
            </button>
            <button 
              onClick={handleRedo} 
              className="zoom-reset-btn redo-btn"
              disabled={redoHistory.length === 0}
              title="되돌린 작업 복원"
            >
              ↷
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
          {isLoadingAssignment ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              정답 정보를 불러오는 중...
            </div>
          ) : (
          <div className="answer-list">
            {answers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                답안이 없습니다.
              </div>
            ) : (
              answers.map((answer) => {
                // 정답 찾기 - currentAssignment 우선 사용
                let correctAnswer = null;
                const assignmentToUse = currentAssignment || assignment;
                
                console.log(`문제 ${answer.questionNumber} - 정답 찾기:`, {
                  hasCurrentAssignment: !!currentAssignment,
                  hasAssignment: !!assignment,
                  hasAnswers: !!assignmentToUse?.answers,
                  answersCount: assignmentToUse?.answers?.length,
                  answers: assignmentToUse?.answers
                });
                
                if (assignmentToUse?.answers && Array.isArray(assignmentToUse.answers)) {
                  // 여러 방법으로 정답 찾기 시도
                  correctAnswer = assignmentToUse.answers.find(
                    a => {
                      // 방법 1: 숫자로 직접 비교
                      const aNum = Number(a.questionNumber);
                      const answerNum = Number(answer.questionNumber);
                      if (aNum === answerNum) return true;
                      
                      // 방법 2: 문자열로 비교
                      if (String(a.questionNumber) === String(answer.questionNumber)) return true;
                      
                      // 방법 3: 공백 제거 후 비교
                      if (String(a.questionNumber).trim() === String(answer.questionNumber).trim()) return true;
                      
                      return false;
                    }
                  );
                  
                  // 정답을 찾지 못한 경우 상세 로그
                  if (!correctAnswer && isSubmitted) {
                    console.error(`문제 ${answer.questionNumber} - 정답을 찾을 수 없습니다!`, {
                      questionNumber: answer.questionNumber,
                      questionNumberType: typeof answer.questionNumber,
                      availableAnswers: assignmentToUse.answers.map(a => ({
                        questionNumber: a.questionNumber,
                        questionNumberType: typeof a.questionNumber,
                        answer: a.answer
                      })),
                      hasCurrentAssignment: !!currentAssignment,
                      hasAssignment: !!assignment
                    });
                  } else if (correctAnswer) {
                    console.log(`문제 ${answer.questionNumber} 정답 찾음:`, correctAnswer);
                  }
                } else if (isSubmitted) {
                  console.error(`문제 ${answer.questionNumber} - answers 배열이 없습니다!`, {
                    hasAssignmentToUse: !!assignmentToUse,
                    hasAnswers: !!assignmentToUse?.answers,
                    answersType: typeof assignmentToUse?.answers,
                    isArray: Array.isArray(assignmentToUse?.answers)
                  });
                }
                
                const correctAnswerText = correctAnswer?.answer ? String(correctAnswer.answer).trim() : '';
                const studentAnswerText = answer.answer ? String(answer.answer).trim() : '';
                
                console.log(`문제 ${answer.questionNumber} - 답안 비교:`, {
                  isSubmitted,
                  correctAnswerText,
                  studentAnswerText,
                  hasCorrectAnswer: !!correctAnswer
                });
                
                // 맞음/틀림 판단 (제출된 경우만)
                let isCorrect = false;
                let isWrong = false;
                
                if (isSubmitted && correctAnswerText) {
                  if (studentAnswerText) {
                    // 정답과 학생 답안을 공백 제거 후 소문자로 비교
                    const normalizedCorrect = correctAnswerText.toLowerCase();
                    const normalizedStudent = studentAnswerText.toLowerCase();
                    isCorrect = normalizedCorrect === normalizedStudent;
                    isWrong = !isCorrect;
                  } else {
                    // 정답은 있는데 학생이 답을 안 쓴 경우
                    isWrong = true;
                  }
                } else if (isSubmitted && !correctAnswerText) {
                  // 제출은 했지만 정답이 없는 경우 (정답이 설정되지 않은 문제)
                  console.warn(`문제 ${answer.questionNumber} - 정답이 없습니다`);
                }
                
                // 제출된 경우 정답 표시 (정답이 있는 경우만)
                const shouldShowAnswer = isSubmitted && correctAnswerText;
                
                console.log(`문제 ${answer.questionNumber} - 최종 결과:`, {
                  isCorrect,
                  isWrong,
                  shouldShowAnswer,
                  correctAnswerText,
                  studentAnswerText,
                  hasCorrectAnswer: !!correctAnswer,
                  assignmentAnswers: assignmentToUse?.answers,
                  assignmentToUseAnswersCount: assignmentToUse?.answers?.length
                });
                
                // 정답이 없는데 제출된 경우 경고
                if (isSubmitted && !correctAnswerText) {
                  console.error(`문제 ${answer.questionNumber} - 정답을 찾을 수 없습니다!`, {
                    hasCurrentAssignment: !!currentAssignment,
                    hasAssignment: !!assignment,
                    assignmentToUseAnswers: assignmentToUse?.answers,
                    questionNumber: answer.questionNumber
                  });
                }
                
                return (
                  <div key={answer.questionNumber} className={`answer-item ${isCorrect ? 'answer-correct' : isWrong ? 'answer-wrong' : ''}`}>
                    <div className="answer-item-header">
                      <span className="answer-label">{answer.questionNumber}번</span>
                      {shouldShowAnswer && (
                        <span className={`answer-status ${isCorrect ? 'status-correct' : 'status-wrong'}`}>
                          {isCorrect ? '✓ 정답' : '✗ 오답'}
                        </span>
                      )}
                    </div>
                    <div className="answer-input-container">
                      <input
                        type="text"
                        className="answer-input"
                        value={studentAnswerText}
                        onChange={(e) => handleAnswerChange(answer.questionNumber, e.target.value)}
                        placeholder="답"
                        readOnly={isSubmitted}
                        disabled={isSubmitted}
                      />
                      {shouldShowAnswer && (
                        <div className="correct-answer-display">
                          <span className="correct-answer-label">정답:</span>
                          <span className="correct-answer-text">{correctAnswerText}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          )}
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

      {/* 해설지 모달 */}
      {showSolutionModal && (() => {
        const solutionFileUrls = Array.isArray(currentAssignment?.solutionFileUrl) 
          ? currentAssignment.solutionFileUrl 
          : (Array.isArray(assignment?.solutionFileUrl) ? assignment.solutionFileUrl : []);
        const solutionFileTypes = Array.isArray(currentAssignment?.solutionFileType) 
          ? currentAssignment.solutionFileType 
          : (Array.isArray(assignment?.solutionFileType) ? assignment.solutionFileType : []);
        
        const solutionImages = [];
        for (let i = 0; i < solutionFileUrls.length; i++) {
          if (solutionFileTypes[i] === 'image') {
            solutionImages.push(solutionFileUrls[i]);
          }
        }
        
        return (
          <div 
            className="solution-modal-overlay"
            onClick={() => {
              setShowSolutionModal(false);
              setSolutionZoomLevel(1);
              setSolutionPanPosition({ x: 0, y: 0 });
              setCurrentSolutionImageIndex(0);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 10000,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <div 
              className="solution-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '95vw',
                maxHeight: '95vh',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>해설지</h2>
                <button
                  onClick={() => {
                    setShowSolutionModal(false);
                    setSolutionZoomLevel(1);
                    setSolutionPanPosition({ x: 0, y: 0 });
                    setCurrentSolutionImageIndex(0);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
              
              {solutionImages.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  해설지 파일이 없습니다.
                </div>
              ) : (
                <>
                  {/* 줌 컨트롤 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => setSolutionZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                      style={{
                        padding: '6px 12px',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '60px', textAlign: 'center', fontSize: '14px' }}>
                      {Math.round(solutionZoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setSolutionZoomLevel(prev => Math.min(5, prev + 0.25))}
                      style={{
                        padding: '6px 12px',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        setSolutionZoomLevel(1);
                        setSolutionPanPosition({ x: 0, y: 0 });
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginLeft: '8px'
                      }}
                    >
                      초기화
                    </button>
                  </div>
                  
                  {/* 해설지 이미지 뷰어 */}
                  <div
                    ref={solutionViewerRef}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.1 : 0.1;
                      const newZoom = Math.max(0.5, Math.min(5, solutionZoomLevel + delta));
                      setSolutionZoomLevel(newZoom);
                    }}
                    onMouseDown={(e) => {
                      if (solutionZoomLevel > 1) {
                        setIsSolutionDragging(true);
                        setSolutionDragStart({ x: e.clientX - solutionPanPosition.x, y: e.clientY - solutionPanPosition.y });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (isSolutionDragging && solutionZoomLevel > 1) {
                        setSolutionPanPosition({
                          x: e.clientX - solutionDragStart.x,
                          y: e.clientY - solutionDragStart.y
                        });
                      }
                    }}
                    onMouseUp={() => setIsSolutionDragging(false)}
                    onMouseLeave={() => setIsSolutionDragging(false)}
                    onTouchStart={(e) => {
                      if (e.touches.length === 2) {
                        e.preventDefault();
                        const distance = Math.sqrt(
                          Math.pow(e.touches[1].clientX - e.touches[0].clientX, 2) +
                          Math.pow(e.touches[1].clientY - e.touches[0].clientY, 2)
                        );
                        setSolutionTouchStartDistance(distance);
                        setSolutionTouchStartZoom(solutionZoomLevel);
                        setIsSolutionPinching(true);
                      } else if (e.touches.length === 1 && solutionZoomLevel > 1) {
                        const touch = e.touches[0];
                        setIsSolutionDragging(true);
                        setSolutionDragStart({ x: touch.clientX - solutionPanPosition.x, y: touch.clientY - solutionPanPosition.y });
                      }
                    }}
                    onTouchMove={(e) => {
                      if (e.touches.length === 2 && isSolutionPinching) {
                        e.preventDefault();
                        const distance = Math.sqrt(
                          Math.pow(e.touches[1].clientX - e.touches[0].clientX, 2) +
                          Math.pow(e.touches[1].clientY - e.touches[0].clientY, 2)
                        );
                        const scale = distance / solutionTouchStartDistance;
                        const newZoom = Math.max(0.5, Math.min(5, solutionTouchStartZoom * scale));
                        setSolutionZoomLevel(newZoom);
                      } else if (e.touches.length === 1 && isSolutionDragging && solutionZoomLevel > 1) {
                        e.preventDefault();
                        const touch = e.touches[0];
                        setSolutionPanPosition({
                          x: touch.clientX - solutionDragStart.x,
                          y: touch.clientY - solutionDragStart.y
                        });
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (e.touches.length < 2) {
                        setIsSolutionPinching(false);
                      }
                      if (e.touches.length === 0) {
                        setIsSolutionDragging(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: solutionZoomLevel > 1 ? (isSolutionDragging ? 'grabbing' : 'grab') : 'default',
                      touchAction: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f5f5f5'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        transform: `translate(${solutionPanPosition.x}px, ${solutionPanPosition.y}px)`,
                        transition: isSolutionDragging || isSolutionPinching ? 'none' : 'transform 0.1s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {solutionImages[currentSolutionImageIndex] && (
                        <img
                          ref={solutionCanvasRef}
                          src={solutionImages[currentSolutionImageIndex]}
                          alt={`해설지 ${currentSolutionImageIndex + 1}`}
                          crossOrigin="anonymous"
                          onLoad={() => {
                            setSolutionImageLoaded(true);
                          }}
                          onError={(e) => {
                            console.error('해설지 이미지 로드 실패:', solutionImages[currentSolutionImageIndex]);
                            e.target.style.display = 'none';
                          }}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            transform: `scale(${solutionZoomLevel})`,
                            transformOrigin: 'center center',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                            objectFit: 'contain'
                          }}
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* 페이지네이션 */}
                  {solutionImages.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '12px', flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          setCurrentSolutionImageIndex(prev => Math.max(0, prev - 1));
                          setSolutionZoomLevel(1);
                          setSolutionPanPosition({ x: 0, y: 0 });
                        }}
                        disabled={currentSolutionImageIndex === 0}
                        style={{
                          padding: '8px 16px',
                          background: currentSolutionImageIndex === 0 ? '#f0f0f0' : '#1a1a1a',
                          color: currentSolutionImageIndex === 0 ? '#999' : 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: currentSolutionImageIndex === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ← 이전
                      </button>
                      <span style={{ fontSize: '14px', minWidth: '80px', textAlign: 'center' }}>
                        {currentSolutionImageIndex + 1} / {solutionImages.length}
                      </span>
                      <button
                        onClick={() => {
                          setCurrentSolutionImageIndex(prev => Math.min(solutionImages.length - 1, prev + 1));
                          setSolutionZoomLevel(1);
                          setSolutionPanPosition({ x: 0, y: 0 });
                        }}
                        disabled={currentSolutionImageIndex === solutionImages.length - 1}
                        style={{
                          padding: '8px 16px',
                          background: currentSolutionImageIndex === solutionImages.length - 1 ? '#f0f0f0' : '#1a1a1a',
                          color: currentSolutionImageIndex === solutionImages.length - 1 ? '#999' : 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: currentSolutionImageIndex === solutionImages.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        다음 →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default AssignmentDetailPage;
