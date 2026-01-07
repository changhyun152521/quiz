import { useState, useEffect } from 'react';
import { get, post } from '../utils/api';
import './CourseSelectionModal.css';

function CourseSelectionModal({ showModal, onClose, user, onCourseSelected }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 강좌 목록 가져오기 - showModal이 true이고 user가 있을 때만 실행
  useEffect(() => {
    // 모달이 false면 아무것도 하지 않음
    if (!showModal) {
      // 모달이 닫히면 상태 초기화
      setCourses([]);
      setSelectedCourseId('');
      setIsLoading(false);
      return;
    }

    // 모달이 true이고 user가 있을 때만 강좌 목록 가져오기
    // user가 없으면 실행하지 않음
    if (showModal && user && user._id) {
      fetchCourses();
    }
    // showModal과 user가 변경될 때만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, user?._id]);

  const fetchCourses = async () => {
    // 모달이 표시되지 않았거나 user가 없으면 실행하지 않음
    // 이중 체크로 안전성 확보
    if (!showModal || !user || !user._id) {
      console.log('fetchCourses: 실행 취소', { showModal, hasUser: !!user, userId: user?._id });
      return;
    }
    
    console.log('fetchCourses: 실행 시작', { showModal, userId: user._id });

    setIsLoading(true);
    try {
      // 학생이 등록된 강좌 목록만 가져오기
      const response = await get(`/api/courses?limit=100&studentId=${user._id}`);
      
      // 응답 상태 확인
      if (!response.ok) {
        const errorText = await response.text();
        console.error('강좌 목록 조회 실패:', response.status, errorText);
        // 모달이 여전히 표시되고 있을 때만 alert 표시
        if (showModal) {
          alert('강좌 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCourses(data.data || []);
      } else {
        console.error('강좌 목록 조회 실패:', data.message || '알 수 없는 오류');
        // 모달이 여전히 표시되고 있을 때만 alert 표시
        if (showModal) {
          alert(data.message || '강좌 목록을 불러오는데 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('강좌 목록 조회 오류:', error);
      // 모달이 여전히 표시되고 있을 때만 alert 표시
      if (showModal) {
        // 네트워크 오류인지 확인
        if (error.message && error.message.includes('fetch')) {
          alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
        } else {
          alert('강좌 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 강좌 선택 처리
  const handleCourseSelection = async () => {
    if (!selectedCourseId) {
      alert('강좌를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 학생이 이미 해당 강좌에 등록되어 있는지 확인
      const studentCoursesResponse = await get(`/api/courses/student/${user._id}`);
      const studentCoursesData = await studentCoursesResponse.json();
      
      if (studentCoursesData.success) {
        const isAlreadyEnrolled = studentCoursesData.data?.some(
          course => String(course._id) === String(selectedCourseId)
        );

        if (!isAlreadyEnrolled) {
          // 학생을 강좌에 등록
          const enrollResponse = await post(`/api/courses/${selectedCourseId}/students`, {
            studentId: user._id
          });

          const enrollData = await enrollResponse.json();

          if (!enrollResponse.ok || !enrollData.success) {
            alert(enrollData.message || '강좌 등록에 실패했습니다.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // 선택한 강좌 정보 가져오기
      const selectedCourse = courses.find(c => String(c._id) === String(selectedCourseId));
      
      // 강좌 선택 완료 콜백 호출
      if (onCourseSelected) {
        onCourseSelected(selectedCourse);
      }
      
      onClose();
    } catch (error) {
      console.error('강좌 등록 오류:', error);
      alert('강좌 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // showModal이 false면 아예 렌더링하지 않음
  // showModal이 false면 아예 렌더링하지 않음
  // 이 체크를 가장 먼저 수행하여 불필요한 렌더링 방지
  if (!showModal || showModal === false) {
    return null;
  }
  
  // user가 없거나 user._id가 없으면 렌더링하지 않음
  if (!user || !user._id) {
    return null;
  }

  return (
    <div className="course-selection-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isLoading && !isSubmitting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="course-selection-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="course-selection-wrapper">
          <button 
            className="course-selection-close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
          
          <h1 className="course-selection-title">강좌 선택</h1>
          <p className="course-selection-subtitle">강좌를 선택해주세요</p>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>강좌 목록을 불러오는 중...</p>
            </div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>등록 가능한 강좌가 없습니다.</p>
            </div>
          ) : (
            <div className="course-selection-form">
              <div className="form-group">
                <label className="form-label">강좌 선택</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="course-select"
                >
                  <option value="">강좌를 선택하세요</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseName} {course.teacher?.name ? `(${course.teacher.name} 선생님)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="course-selection-submit-btn"
                onClick={handleCourseSelection}
                disabled={!selectedCourseId || isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '선택 완료'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseSelectionModal;

