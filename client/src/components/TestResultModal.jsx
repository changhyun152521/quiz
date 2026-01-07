import { useState, useEffect, useRef } from 'react';
import { get } from '../utils/api';
import './TestResultModal.css';

function TestResultModal({ showModal, onClose, course, allAssignments = [] }) {
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedStudentForSolution, setSelectedStudentForSolution] = useState(null);
  const [studentSolutionImages, setStudentSolutionImages] = useState([]);
  const [currentSolutionImageIndex, setCurrentSolutionImageIndex] = useState(0);
  const [solutionImageLoaded, setSolutionImageLoaded] = useState(false);
  const solutionCanvasRef = useRef(null);
  const solutionDrawingCanvasRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const solutionViewerRef = useRef(null);
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [touchStartZoom, setTouchStartZoom] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  
  // 과제 목록 준비 - allAssignments에서 실제 과제 정보 가져오기
  const assignmentsWithDetails = course?.assignments ? course.assignments.map(assignment => {
    const assignmentId = assignment._id || assignment;
    // allAssignments에서 실제 과제 정보 찾기
    const fullAssignment = allAssignments.find(a => a._id === assignmentId) || assignment;
    return fullAssignment;
  }).sort((a, b) => {
    // 최신순으로 정렬
    const dateA = new Date(a.createdAt || a.startDate || 0);
    const dateB = new Date(b.createdAt || b.startDate || 0);
    return dateB - dateA;
  }) : [];

  // 검색어로 필터링된 과제 목록
  const filteredAssignments = assignmentsWithDetails.filter(assignment => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      assignment.assignmentName?.toLowerCase().includes(term) ||
      assignment.subject?.toLowerCase().includes(term) ||
      assignment.assignmentType?.toLowerCase().includes(term) ||
      formatDate(assignment.createdAt)?.toLowerCase().includes(term) ||
      formatDate(assignment.startDate)?.toLowerCase().includes(term) ||
      formatDate(assignment.dueDate)?.toLowerCase().includes(term)
    );
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

  // 모달이 열릴 때 선택 초기화
  useEffect(() => {
    if (showModal) {
      setSelectedAssignment(null);
      setStudentResults([]);
      setSearchTerm('');
      setCurrentPage(1);
      setSelectedStudentForSolution(null);
      setStudentSolutionImages([]);
      setCurrentSolutionImageIndex(0);
    }
  }, [showModal]);

  // 학생 풀이 보기
  const handleViewStudentSolution = async (studentId, studentName) => {
    if (!selectedAssignment) return;
    
    const assignmentId = selectedAssignment._id || selectedAssignment;
    
    // 전체 과제 정보 가져오기 (fileUrl, fileType 등 포함)
    let assignment = selectedAssignment;
    try {
      const response = await get(`/api/assignments/${assignmentId}`);
      const data = await response.json();
      if (data.success && data.data) {
        assignment = data.data;
      }
    } catch (error) {
      console.error('과제 정보 가져오기 오류:', error);
      // 에러가 나도 selectedAssignment 사용
    }
    
    const solutionData = [];
    
    // 원본 과제 이미지 가져오기 (questionFileUrl 우선, 없으면 fileUrl 사용 - 하위 호환성)
    const originalImages = [];
    
    // questionFileUrl 우선 확인 (새로운 필드)
    let fileUrls = [];
    let fileTypes = [];
    
    if (assignment.questionFileUrl && assignment.questionFileType) {
      fileUrls = Array.isArray(assignment.questionFileUrl) ? assignment.questionFileUrl : [];
      fileTypes = Array.isArray(assignment.questionFileType) ? assignment.questionFileType : [];
    } else if (assignment.fileUrl && assignment.fileType) {
      // 하위 호환성: 기존 fileUrl 사용
      fileUrls = Array.isArray(assignment.fileUrl) ? assignment.fileUrl : [];
      fileTypes = Array.isArray(assignment.fileType) ? assignment.fileType : [];
    }
    
    console.log('[TestResultModal] 원본 이미지 확인:', {
      hasQuestionFileUrl: !!assignment.questionFileUrl,
      questionFileUrls: assignment.questionFileUrl,
      questionFileTypes: assignment.questionFileType,
      hasFileUrl: !!assignment.fileUrl,
      fileUrls: fileUrls,
      fileTypes: fileTypes,
      fileUrlsLength: fileUrls.length,
      fileTypesLength: fileTypes.length
    });
    
    for (let i = 0; i < fileUrls.length; i++) {
      if (fileTypes[i] === 'image' && fileUrls[i]) {
        // URL이 유효한지 확인
        const url = fileUrls[i];
        if (url && typeof url === 'string' && url.trim() !== '') {
          originalImages.push({ index: i, url: url });
        }
      }
    }
    
    console.log('[TestResultModal] 원본 이미지 배열:', {
      originalImagesCount: originalImages.length,
      originalImages: originalImages,
      questionFileUrl: assignment.questionFileUrl,
      questionFileType: assignment.questionFileType,
      fileUrl: assignment.fileUrl,
      fileType: assignment.fileType
    });
    
    // assignment의 submissions에서 해당 학생의 solutionImages 가져오기
    const submission = assignment.submissions?.find(sub => {
      const subStudentId = sub.studentId?._id || sub.studentId;
      return subStudentId && String(subStudentId) === String(studentId);
    });
    
    const solutionImageUrls = Array.isArray(submission?.solutionImages) 
      ? submission.solutionImages 
      : [];
    
    console.log('[TestResultModal] 학생 풀이 이미지:', {
      studentId: studentId,
      studentName: studentName,
      hasSubmission: !!submission,
      solutionImageUrlsCount: solutionImageUrls.length,
      solutionImageUrls: solutionImageUrls
    });
    
    // Cloudinary에서 가져온 풀이 이미지와 원본 이미지 매칭
    // 원본 이미지가 있으면 무조건 모든 원본 이미지를 표시 (풀이가 없어도)
    if (originalImages.length > 0) {
      // 모든 원본 이미지를 solutionData에 추가
      // 원본 이미지 개수만큼 반복하여 모든 페이지 표시
      for (let i = 0; i < originalImages.length; i++) {
        solutionData.push({
          index: i,
          originalImage: originalImages[i].url,
          drawing: (i < solutionImageUrls.length && solutionImageUrls[i]) ? solutionImageUrls[i] : null // 풀이가 있으면 추가, 없으면 null
        });
      }
      console.log('[TestResultModal] 원본 이미지 기반 solutionData 생성:', {
        solutionDataCount: solutionData.length,
        originalImagesCount: originalImages.length,
        solutionImageUrlsCount: solutionImageUrls.length,
        solutionData: solutionData.map(s => ({
          index: s.index,
          hasOriginal: !!s.originalImage,
          originalImageUrl: s.originalImage,
          hasDrawing: !!s.drawing,
          drawingUrl: s.drawing
        }))
      });
    } else if (solutionImageUrls.length > 0) {
      // 원본 이미지가 없지만 풀이가 있는 경우 (빈 캔버스)
      solutionData.push({
        index: -1,
        originalImage: null,
        drawing: solutionImageUrls[0] || null
      });
    }
    
    // 원본 이미지도 없고 풀이도 없으면 알림
    // 원본 이미지가 있으면 풀이가 없어도 표시되므로 solutionData.length > 0이면 통과
    if (solutionData.length === 0) {
      alert(`${studentName} 학생의 풀이가 저장되어 있지 않습니다.`);
      return;
    }
    
    // 원본 이미지가 있는 경우, 풀이가 없는 페이지도 포함하여 모든 페이지 표시
    // 이미 solutionData에 원본 이미지와 풀이가 매칭되어 있으므로 그대로 사용
    console.log('[TestResultModal] 최종 solutionData:', {
      studentId: studentId,
      studentName: studentName,
      solutionDataCount: solutionData.length,
      solutionData: solutionData
    });
    
    if (solutionData.length === 0) {
      alert(`${studentName} 학생의 풀이가 저장되어 있지 않습니다.`);
      return;
    }
    
    setSelectedStudentForSolution({ studentId, studentName });
    setStudentSolutionImages(solutionData);
    setCurrentSolutionImageIndex(0);
  };

  // 학생 풀이 이미지 로드 및 표시 (원본 이미지 + 필기)
  useEffect(() => {
    if (!selectedStudentForSolution || studentSolutionImages.length === 0) {
      setSolutionImageLoaded(false);
      return;
    }
    
    const currentSolution = studentSolutionImages[currentSolutionImageIndex];
    if (!currentSolution) {
      setSolutionImageLoaded(true);
      return;
    }
    
    const loadImage = () => {
      const canvas = solutionCanvasRef.current;
      const drawingCanvas = solutionDrawingCanvasRef.current;
      if (!canvas || !drawingCanvas) {
        // 캔버스가 아직 준비되지 않았으면 다음 프레임에 재시도
        requestAnimationFrame(loadImage);
        return;
      }
      
      setSolutionImageLoaded(false);
      
      const ctx = canvas.getContext('2d');
      const drawingCtx = drawingCanvas.getContext('2d');
      
      // 원본 이미지가 있는 경우
      if (currentSolution.originalImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // 뷰어 컨테이너 높이 가져오기 (이미지 로드 후 다시 확인)
            const viewerContainer = canvas.closest('.student-solution-viewer');
            const contentContainer = canvas.parentElement;
            if (!viewerContainer || !contentContainer) {
              console.error('컨테이너를 찾을 수 없습니다');
              setSolutionImageLoaded(true);
              return;
            }
            
            const viewerHeight = viewerContainer.clientHeight;
            const viewerWidth = viewerContainer.clientWidth;
            
            // 높이를 기준으로 비율 계산 (원본 비율 유지)
            const scale = viewerHeight / img.height;
            const displayWidth = img.width * scale;
            const displayHeight = viewerHeight;
            
            // 캔버스 크기 설정 (원본 해상도 유지)
            canvas.width = img.width;
            canvas.height = img.height;
            drawingCanvas.width = img.width;
            drawingCanvas.height = img.height;
            
            // 기본 크기를 데이터 속성에 저장
            contentContainer.dataset.baseWidth = displayWidth;
            contentContainer.dataset.baseHeight = displayHeight;
            
            // content 컨테이너 크기 설정
            contentContainer.style.width = `${displayWidth}px`;
            contentContainer.style.height = `${displayHeight}px`;
            contentContainer.style.transform = `translate(${panPosition.x}px, ${panPosition.y}px)`;
            
            // 표시 크기 설정 (뷰어 높이에 맞춤, 너비는 비율 유지)
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            drawingCanvas.style.width = `${displayWidth}px`;
            drawingCanvas.style.height = `${displayHeight}px`;
            
            // 원본 이미지 그리기
            // 캔버스를 투명하게 지우고 원본 이미지 그리기
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            // 필기 데이터가 있으면 오버레이
            if (currentSolution.drawing) {
              const drawingImg = new Image();
              drawingImg.onload = () => {
                // drawingCanvas를 투명하게 지우기
                drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                // 풀이 이미지를 그릴 때, 투명한 부분은 원본 이미지가 보이도록 설정
                drawingCtx.globalCompositeOperation = 'source-over';
                drawingCtx.drawImage(drawingImg, 0, 0);
                setSolutionImageLoaded(true);
              };
              drawingImg.onerror = () => {
                // 에러가 나도 drawingCanvas는 투명하게 유지
                drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                setSolutionImageLoaded(true);
              };
              drawingImg.src = currentSolution.drawing;
            } else {
              // 풀이가 없으면 drawingCanvas를 투명하게 유지
              drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
              setSolutionImageLoaded(true);
            }
          } catch (error) {
            console.error('이미지 그리기 오류:', error);
            setSolutionImageLoaded(true);
          }
        };
        
        img.onerror = () => {
          console.error('원본 이미지 로드 실패:', currentSolution.originalImage);
          setSolutionImageLoaded(true);
        };
        
        img.src = currentSolution.originalImage;
      } else {
        // 빈 캔버스에 필기한 경우
        try {
          // 뷰어 컨테이너 높이 가져오기
          const viewerContainer = canvas.closest('.student-solution-viewer');
          const contentContainer = canvas.parentElement;
          if (!viewerContainer || !contentContainer) {
            console.error('컨테이너를 찾을 수 없습니다');
            setSolutionImageLoaded(true);
            return;
          }
          
          const viewerHeight = viewerContainer.clientHeight;
          
          // A4 비율 유지 (210:297)
          const a4Aspect = 210 / 297;
          const containerHeight = viewerHeight;
          const containerWidth = containerHeight * a4Aspect;
          
          canvas.width = containerWidth;
          canvas.height = containerHeight;
          drawingCanvas.width = containerWidth;
          drawingCanvas.height = containerHeight;
          
          // 기본 크기를 데이터 속성에 저장
          contentContainer.dataset.baseWidth = containerWidth;
          contentContainer.dataset.baseHeight = containerHeight;
          
          // content 컨테이너 크기 설정
          contentContainer.style.width = `${containerWidth}px`;
          contentContainer.style.height = `${containerHeight}px`;
          contentContainer.style.transform = `translate(${panPosition.x}px, ${panPosition.y}px)`;
          
          canvas.style.width = `${containerWidth}px`;
          canvas.style.height = `${containerHeight}px`;
          drawingCanvas.style.width = `${containerWidth}px`;
          drawingCanvas.style.height = `${containerHeight}px`;
          
          // 흰색 배경
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // 필기 데이터 표시
          if (currentSolution.drawing) {
            const drawingImg = new Image();
            drawingImg.onload = () => {
              drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
              drawingCtx.drawImage(drawingImg, 0, 0, drawingCanvas.width, drawingCanvas.height);
              setSolutionImageLoaded(true);
            };
            drawingImg.onerror = () => {
              drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
              setSolutionImageLoaded(true);
            };
            drawingImg.src = currentSolution.drawing;
          } else {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            setSolutionImageLoaded(true);
          }
        } catch (error) {
          console.error('빈 캔버스 처리 오류:', error);
          setSolutionImageLoaded(true);
        }
      }
    };
    
    // 다음 프레임에 실행
    requestAnimationFrame(loadImage);
  }, [selectedStudentForSolution, studentSolutionImages, currentSolutionImageIndex]);

  // 줌 레벨 변경 시 이미지 크기 업데이트
  useEffect(() => {
    if (!solutionImageLoaded || !solutionCanvasRef.current || !solutionDrawingCanvasRef.current) return;
    
    const canvas = solutionCanvasRef.current;
    const drawingCanvas = solutionDrawingCanvasRef.current;
    const contentContainer = canvas.parentElement;
    
    if (!contentContainer) return;
    
    const baseWidth = parseFloat(contentContainer.dataset.baseWidth || '0');
    const baseHeight = parseFloat(contentContainer.dataset.baseHeight || '0');
    
    if (baseWidth > 0 && baseHeight > 0) {
      const newWidth = baseWidth * zoomLevel;
      const newHeight = baseHeight * zoomLevel;
      
      contentContainer.style.width = `${newWidth}px`;
      contentContainer.style.height = `${newHeight}px`;
      contentContainer.style.transform = `translate(${panPosition.x}px, ${panPosition.y}px)`;
      
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      drawingCanvas.style.width = `${newWidth}px`;
      drawingCanvas.style.height = `${newHeight}px`;
    }
  }, [zoomLevel, panPosition, solutionImageLoaded]);

  // 줌 초기화 (이미지 변경 시)
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [currentSolutionImageIndex, selectedStudentForSolution]);

  // 마우스 휠로 줌 인/아웃
  const handleWheel = (e) => {
    if (!solutionViewerRef.current) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  // 마우스 드래그로 이동
  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 줌 인/아웃 버튼 핸들러
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(5, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.25));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // 두 터치 포인트 간의 거리 계산
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 터치 시작 (핀치 줌)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setTouchStartDistance(distance);
      setTouchStartZoom(zoomLevel);
      setIsPinching(true);
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      // 단일 터치로 드래그
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panPosition.x, y: touch.clientY - panPosition.y });
    }
  };

  // 터치 이동 (핀치 줌)
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = distance / touchStartDistance;
      const newZoom = Math.max(0.5, Math.min(5, touchStartZoom * scale));
      setZoomLevel(newZoom);
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setPanPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  // 터치 종료
  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  // 검색어 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 과제 선택 시 학생별 결과 조회
  useEffect(() => {
    if (selectedAssignment && course) {
      fetchStudentResults();
    } else {
      setStudentResults([]);
    }
  }, [selectedAssignment, course]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  const fetchStudentResults = async () => {
    if (!selectedAssignment || !course) return;

    setLoading(true);
    try {
      // 과제 ID 추출
      const assignmentId = selectedAssignment._id || selectedAssignment;

      const response = await get(`/api/assignments/${assignmentId}`);

      const data = await response.json();
      if (data.success && data.data) {
        const assignment = data.data;
        const results = [];

        // 강좌의 모든 학생에 대해 결과 확인 (백엔드에서 학생 정보가 join되어 옴)
        const students = course.students || [];

        // 강좌에 등록된 학생 ID Set (중복 체크용)
        const courseStudentIds = new Set(
          students.map(student => String(student._id || student))
        );

        // 1. 강좌에 등록된 학생들 처리
        students.forEach((student) => {
          const studentId = student._id || student;
          const studentName = student.name || '알 수 없음';

          // 해당 학생의 제출 정보 찾기
          const submission = assignment.submissions?.find(sub => {
            const subStudentId = sub.studentId?._id || sub.studentId;
            return subStudentId && String(subStudentId) === String(studentId);
          });

          results.push({
            studentId: studentId,
            studentName: studentName,
            isSubmitted: !!submission,
            correctCount: submission?.correctCount || 0,
            wrongCount: submission?.wrongCount || 0,
            totalCount: assignment.questionCount || 0,
            submittedAt: submission?.submittedAt || null,
            isInCourse: true
          });
        });

        // 2. 강좌에 등록되지 않았지만 제출한 학생들 처리
        if (assignment.submissions && assignment.submissions.length > 0) {
          assignment.submissions.forEach(submission => {
            const subStudentId = submission.studentId?._id || submission.studentId;

            // 이미 강좌에 등록된 학생이면 스킵
            if (courseStudentIds.has(String(subStudentId))) {
              return;
            }

            // populate된 경우 studentId.name 사용, 아니면 userId 사용
            const studentName = submission.studentId?.name ||
                               submission.studentId?.userId ||
                               '알 수 없음';

            results.push({
              studentId: subStudentId,
              studentName: studentName,
              isSubmitted: true,
              correctCount: submission.correctCount || 0,
              wrongCount: submission.wrongCount || 0,
              totalCount: assignment.questionCount || 0,
              submittedAt: submission.submittedAt || null,
              isInCourse: false // 강좌 미등록 표시
            });
          });
        }

        setStudentResults(results);
      }
    } catch (error) {
      console.error('학생 결과 조회 오류:', error);
      alert('학생 결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="test-result-modal-overlay" onClick={(e) => {
      // 로딩 중이 아닐 때만 overlay 클릭으로 닫기
      if (!loading && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="test-result-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="test-result-modal-header">
          <h2 className="test-result-modal-title">과제 조회</h2>
          <button className="test-result-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="test-result-modal-body">
          {/* 강좌 정보 */}
          <div className="test-result-course-info">
            <h3>{course?.courseName || '강좌명'}</h3>
            <p>수강생: {course?.students?.length || 0}명</p>
          </div>

          {/* 과제 선택 리스트 */}
          <div className="test-result-assignment-select">
            <label className="test-result-label">과제 선택</label>
            {assignmentsWithDetails.length === 0 ? (
              <div className="test-result-no-assignments">
                <p>등록된 과제가 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 검색 입력 */}
                <div className="test-result-search-container">
                  <input
                    type="text"
                    className="test-result-search-input"
                    placeholder="과제명, 과목, 타입, 날짜로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="test-result-assignment-list">
                  {paginatedAssignments.length > 0 ? (
                    paginatedAssignments.map((assignment) => {
                      const assignmentId = assignment._id || assignment;
                      const isSelected = selectedAssignment && (
                        (selectedAssignment._id || selectedAssignment) === assignmentId
                      );
                      
                      return (
                        <div
                          key={assignmentId}
                          className={`test-result-assignment-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedAssignment(assignment._id ? assignment : { _id: assignmentId, ...assignment });
                          }}
                        >
                          <div className="assignment-item-header">
                            <div className="assignment-item-title">
                              <span className="assignment-name">
                                {assignment.assignmentName || '과제명 없음'}
                              </span>
                              {assignment.subject && (
                                <span className="assignment-subject">({assignment.subject})</span>
                              )}
                              {assignment.assignmentType && (
                                <span className="assignment-type-badge">{assignment.assignmentType === '실전TEST' ? '클리닉' : assignment.assignmentType}</span>
                              )}
                            </div>
                          </div>
                          <div className="assignment-item-dates">
                            <div className="assignment-date-row">
                              <span className="date-label">생성일:</span>
                              <span className="date-value">{formatDate(assignment.createdAt)}</span>
                            </div>
                            <div className="assignment-date-row">
                              <span className="date-label">시작일:</span>
                              <span className="date-value">{formatDate(assignment.startDate)}</span>
                            </div>
                            <div className="assignment-date-row">
                              <span className="date-label">마감일:</span>
                              <span className="date-value">{formatDate(assignment.dueDate)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="test-result-no-assignments">
                      <p>검색 결과가 없습니다.</p>
                    </div>
                  )}
                </div>
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="test-result-pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      이전
                    </button>
                    <div className="pagination-pages">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 학생별 결과 테이블 */}
          {selectedAssignment && (
            <div className="test-result-table-container">
              {loading ? (
                <div className="test-result-loading">
                  <p>로딩 중...</p>
                </div>
              ) : (
                <table className="test-result-table">
                  <thead>
                    <tr>
                      <th>학생명</th>
                      <th>제출 상태</th>
                      <th>결과</th>
                      <th>풀이</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="test-result-empty">
                          수강생이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      studentResults.map((result) => (
                        <tr key={result.studentId}>
                          <td>
                            {result.studentName}
                            {!result.isInCourse && (
                              <span style={{
                                marginLeft: '6px',
                                fontSize: '11px',
                                color: '#f59e0b',
                                backgroundColor: '#fef3c7',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                미등록
                              </span>
                            )}
                          </td>
                          <td>
                            {result.isSubmitted && result.submittedAt ? (
                              <span className="test-result-submitted-date">
                                {new Date(result.submittedAt).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            ) : (
                              <span className={`test-result-status not-submitted`}>
                                미제출
                            </span>
                            )}
                          </td>
                          <td>
                            {result.isSubmitted ? (
                              <span className="test-result-score">
                                {result.totalCount}개 중 {result.correctCount}개 맞음
                              </span>
                            ) : (
                              <span className="test-result-no-score">-</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="view-solution-btn"
                              onClick={() => handleViewStudentSolution(result.studentId, result.studentName)}
                              disabled={!result.isSubmitted}
                            >
                              풀이 보기
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* 학생 풀이 보기 모달 */}
        {selectedStudentForSolution && studentSolutionImages.length > 0 && (
          <div className="student-solution-modal-overlay" onClick={(e) => {
            // overlay 클릭 시에만 닫기
            if (e.target === e.currentTarget) {
              setSelectedStudentForSolution(null);
              setStudentSolutionImages([]);
              setCurrentSolutionImageIndex(0);
            }
          }}>
            <div className="student-solution-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="student-solution-modal-header">
                <h3 className="student-solution-modal-title">
                  {selectedStudentForSolution.studentName} 학생 풀이
                </h3>
                <button 
                  className="student-solution-modal-close"
                  onClick={() => {
                    setSelectedStudentForSolution(null);
                    setStudentSolutionImages([]);
                    setCurrentSolutionImageIndex(0);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="student-solution-zoom-controls">
                <button onClick={handleZoomOut} className="zoom-btn" title="축소">−</button>
                <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={handleZoomIn} className="zoom-btn" title="확대">+</button>
                <button onClick={handleZoomReset} className="zoom-reset-btn" title="초기화">⟲</button>
              </div>
              <div className="student-solution-modal-body">
                <div className="student-solution-image-container">
                  <div 
                    className="student-solution-viewer"
                    ref={solutionViewerRef}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
                  >
                    <div className="student-solution-content">
                      {/* 원본 이미지 캔버스 */}
                      <canvas
                        ref={solutionCanvasRef}
                        className="student-solution-canvas"
                        style={{ pointerEvents: 'none', display: solutionImageLoaded ? 'block' : 'none' }}
                      />
                      {/* 필기 캔버스 (오버레이) */}
                      <canvas
                        ref={solutionDrawingCanvasRef}
                        className="student-solution-drawing-canvas"
                        style={{ pointerEvents: 'none', display: solutionImageLoaded ? 'block' : 'none' }}
                      />
                      {!solutionImageLoaded && (
                        <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
                      )}
                    </div>
                  </div>
                </div>
                {studentSolutionImages.length > 1 && (
                  <div className="student-solution-navigation">
                    <button
                      className="solution-nav-btn"
                      onClick={() => {
                        setCurrentSolutionImageIndex(prev => Math.max(0, prev - 1));
                        setSolutionImageLoaded(false);
                      }}
                      disabled={currentSolutionImageIndex === 0}
                    >
                      ← 이전
                    </button>
                    <span className="solution-image-counter">
                      {currentSolutionImageIndex + 1} / {studentSolutionImages.length}
                    </span>
                    <button
                      className="solution-nav-btn"
                      onClick={() => {
                        setCurrentSolutionImageIndex(prev => Math.min(studentSolutionImages.length - 1, prev + 1));
                        setSolutionImageLoaded(false);
                      }}
                      disabled={currentSolutionImageIndex === studentSolutionImages.length - 1}
                    >
                      다음 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestResultModal;

