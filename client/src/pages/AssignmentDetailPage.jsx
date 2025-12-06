import { useState, useEffect, useRef } from 'react';
import { post } from '../utils/api';
import '../components/AssignmentDetail.css';

function AssignmentDetailPage({ assignment, user, onBack, onAssignmentUpdate }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'select'
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
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
      // 첫 이미지의 변경사항 여부 확인
      if (assignment && assignment._id) {
        const savedData = localStorage.getItem(`assignment_${assignment._id}_image_0`);
        setHasChanges(!!savedData);
      } else {
        setHasChanges(false);
      }
    } else {
      setImages([]);
      setCurrentImageIndex(0);
      setHasChanges(false);
    }
  }, [assignment]);

  // 제출 상태 확인
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
    if (images.length === 0 || currentImageIndex >= images.length) return;

    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || !drawingCanvas) return;

    const ctx = canvas.getContext('2d');
    const drawingCtx = drawingCanvas.getContext('2d');
    setImageLoaded(false);

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

        // 저장된 그리기 복원
        const savedData = localStorage.getItem(`assignment_${assignment._id}_image_${currentImageIndex}`);
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
      // 다음 이미지의 변경사항 여부 확인
      const savedData = localStorage.getItem(`assignment_${assignment._id}_image_${currentImageIndex - 1}`);
      setHasChanges(!!savedData);
    }
  };

  // 다음 이미지로 이동
  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      saveDrawing();
      setCurrentImageIndex(currentImageIndex + 1);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      // 다음 이미지의 변경사항 여부 확인
      const savedData = localStorage.getItem(`assignment_${assignment._id}_image_${currentImageIndex + 1}`);
      setHasChanges(!!savedData);
    }
  };

  // 그리기 저장
  const saveDrawing = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      const dataURL = drawingCanvas.toDataURL();
      localStorage.setItem(`assignment_${assignment._id}_image_${currentImageIndex}`, dataURL);
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
    if (drawingCanvas) {
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      // 저장된 그리기 데이터 삭제
      localStorage.removeItem(`assignment_${assignment._id}_image_${currentImageIndex}`);
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

  // 터치 이벤트 처리
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    // 이미지 영역 내에서만 작동
    if (!isPointInImageBounds(touch.clientX, touch.clientY)) {
      return;
    }
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    handleMouseDown(mouseEvent);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    handleMouseMove(mouseEvent);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    handleMouseUp();
  };

  // 전체 지우기
  const handleClear = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      const ctx = drawingCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      localStorage.removeItem(`assignment_${assignment._id}_image_${currentImageIndex}`);
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
        
        const newSubmission = {
          studentId: user._id,
          studentAnswers: studentAnswers,
          correctCount: correctCount,
          wrongCount: wrongCount,
          submittedAt: new Date()
        };
        
        if (submissionIndex >= 0) {
          updatedAssignment.submissions[submissionIndex] = newSubmission;
        } else {
          updatedAssignment.submissions.push(newSubmission);
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

  if (images.length === 0) {
    return (
      <div className="assignment-detail-empty">
        <p>이 과제에는 이미지 파일이 없습니다.</p>
        <button onClick={onBack} className="btn-back">돌아가기</button>
      </div>
    );
  }

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
              <img
                ref={imageRef}
                src={images[currentImageIndex]}
                alt={`과제 이미지 ${currentImageIndex + 1}`}
                className="assignment-image"
                style={{ display: 'none' }}
              />
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
