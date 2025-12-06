import { useState, useEffect } from 'react';
import { get, put, del, patch } from '../utils/api';
import MyInfoModal from '../components/MyInfoModal';
import AssignmentDetailPage from './AssignmentDetailPage';
import '../components/Dashboard.css';

function DashboardPage({ user, onLogout, onGoToMainPage }) {
  const [activeTab, setActiveTab] = useState('all');
  const [showMyInfoModal, setShowMyInfoModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  
  // 강좌 및 과제 데이터
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 페이지 마운트 시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [])

  // 과제 상세 페이지로 이동 시 상단으로 스크롤
  useEffect(() => {
    if (selectedAssignment) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
  }, [selectedAssignment])

  // 현재 월을 기본값으로 설정
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  }, []);

  // 학생이 등록된 강좌 목록 가져오기
  useEffect(() => {
    if (user?._id) {
      fetchCourses();
    }
  }, [user]);

  // 강좌 목록 가져오기
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await get(`/api/courses/student/${user._id}`);

      const data = await response.json();
      if (data.success) {
        setCourses(data.data || []);
      } else {
        console.error('강좌 목록 조회 실패:', data.message);
      }
    } catch (error) {
      console.error('강좌 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 강좌와 월에 해당하는 과제 필터링
  useEffect(() => {
    if (!selectedMonth) return;

    const filteredAssignments = [];
    const [year, month] = selectedMonth.split('-').map(Number);

    courses.forEach(course => {
      // 선택된 강좌 필터링
      if (selectedCourseId !== 'all' && course._id !== selectedCourseId) {
        return;
      }

      // 강좌의 과제들 필터링
      if (course.assignments && Array.isArray(course.assignments)) {
        course.assignments.forEach(assignment => {
          if (!assignment || !assignment.startDate) return;

          const assignmentDate = new Date(assignment.startDate);
          const assignmentYear = assignmentDate.getFullYear();
          const assignmentMonth = assignmentDate.getMonth() + 1;

          // 선택된 월에 해당하는 과제만 추가
          if (assignmentYear === year && assignmentMonth === month) {
            filteredAssignments.push({
              ...assignment,
              courseName: course.courseName,
              courseId: course._id
            });
          }
        });
      }
    });

    // 생성일 기준 정렬 (최신 것이 상단)
    filteredAssignments.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate);
      const dateB = new Date(b.createdAt || b.startDate);
      return dateB - dateA; // 최신 것이 먼저 오도록 내림차순 정렬
    });

    setAssignments(filteredAssignments);
  }, [courses, selectedCourseId, selectedMonth]);

  // 탭별 필터링된 과제
  const getFilteredAssignments = () => {
    if (activeTab === 'all') return assignments;
    if (activeTab === 'quiz') return assignments.filter(a => a.assignmentType === 'QUIZ');
    if (activeTab === 'test') return assignments.filter(a => a.assignmentType === '실전TEST');
    return assignments;
  };

  // 통계 계산
  const calculateStats = () => {
    const filtered = getFilteredAssignments();
    const now = new Date();
    
    const inProgress = filtered.filter(a => {
      const startDate = new Date(a.startDate);
      const dueDate = new Date(a.dueDate);
      return startDate <= now && now <= dueDate;
    }).length;

    const completed = filtered.filter(a => {
      const dueDate = new Date(a.dueDate);
      return now > dueDate;
    }).length;

    return {
      inProgress,
      total: filtered.length,
      completed
    };
  };

  const currentData = calculateStats();
  const filteredAssignments = getFilteredAssignments();

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // 과제 상세 페이지 표시
  if (selectedAssignment) {
    return (
      <AssignmentDetailPage
        assignment={selectedAssignment}
        user={user}
        onBack={async () => {
          // 제출 상태 업데이트를 위해 강좌 목록 다시 가져오기
          await fetchCourses();
          setSelectedAssignment(null);
        }}
        onAssignmentUpdate={async (updatedAssignment) => {
          // 제출 완료 후 assignment 업데이트
          if (updatedAssignment && updatedAssignment._id === selectedAssignment._id) {
            setSelectedAssignment(updatedAssignment);
          }
        }}
      />
    );
  }

  return (
    <div className="dashboard">
      {/* 헤더 */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div 
            className="dashboard-logo"
            onClick={() => {
              if (onGoToMainPage) {
                onGoToMainPage();
              } else {
                onLogout();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="dashboard-logo-text">QUIZ LAB</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="dashboard-logout-btn" 
              onClick={() => setShowMyInfoModal(true)}
            >
              내정보
            </button>
            <button 
              className="dashboard-logout-btn" 
              onClick={() => {
                if (window.confirm('정말 로그아웃 하시겠습니까?')) {
                  onLogout();
                }
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 필터 섹션 */}
      <div className="dashboard-filters-wrapper">
        <div className="dashboard-container">
          <div className="dashboard-filters">
            <div className="filter-group">
              <label className="filter-label">반 선택</label>
              <select
                className="filter-select"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="all">전체</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.courseName}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">월 선택</label>
              <input
                type="month"
                className="filter-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* 제목 */}
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">
              {user?.name || '학생'}학생의 TEST 현황
            </h1>
          </div>

          {/* 탭 */}
          <div className="dashboard-tabs">
            <button
              className={`dashboard-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              전체보기
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              QUIZ
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'test' ? 'active' : ''}`}
              onClick={() => setActiveTab('test')}
            >
              실전TEST
            </button>
          </div>

          {/* 통계 카드 */}
          <div className="dashboard-stats">
            <div className="stat-card stat-card-progress">
              <div className="stat-card-header">
                <span className="stat-card-icon">📝</span>
                <span className="stat-card-label">진행중인 과제</span>
              </div>
              <div className="stat-card-content">
                <span className="stat-card-number">{currentData.inProgress}</span>
                <span className="stat-card-total">/ {currentData.total}</span>
              </div>
            </div>

            <div className="stat-card stat-card-completed">
              <div className="stat-card-header">
                <span className="stat-card-icon">✓</span>
                <span className="stat-card-label">완료된 과제</span>
              </div>
              <div className="stat-card-content">
                <span className="stat-card-number">{currentData.completed}</span>
                <span className="stat-card-total">/ {currentData.total}</span>
              </div>
            </div>
          </div>

          {/* 과제 목록 영역 */}
          <div className="dashboard-content">
            {loading ? (
              <div className="dashboard-loading">
                <p>로딩 중...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="dashboard-empty">
                <p>선택한 조건에 해당하는 과제가 없습니다.</p>
              </div>
            ) : (
              <div className="assignments-grid">
                {filteredAssignments.map(assignment => {
                  // 제출 상태 확인
                  const submission = assignment.submissions?.find(
                    sub => {
                      const subStudentId = sub.studentId?._id || sub.studentId;
                      const userId = user._id;
                      return subStudentId && userId && String(subStudentId) === String(userId);
                    }
                  );
                  const isSubmitted = !!submission;
                  
                  return (
                    <div
                      key={assignment._id}
                      className="assignment-card"
                      onClick={() => {
                        // 이미지 파일이 있는 경우에만 상세 페이지로 이동
                        const hasImages = assignment.fileUrl && 
                          Array.isArray(assignment.fileUrl) && 
                          assignment.fileUrl.length > 0 &&
                          assignment.fileType && 
                          Array.isArray(assignment.fileType) &&
                          assignment.fileType.some(type => type === 'image');
                        
                        if (hasImages) {
                          setSelectedAssignment(assignment);
                        } else {
                          alert('이 과제에는 이미지 파일이 없습니다.');
                        }
                      }}
                    >
                      <div className="assignment-card-header">
                        <div className="assignment-type-badge">
                          {assignment.assignmentType === 'QUIZ' ? 'QUIZ' : '실전TEST'}
                        </div>
                        <div className="assignment-status-badge">
                          {isSubmitted ? (
                            <span className="status-badge status-submitted">제출완료</span>
                          ) : (
                            <span className="status-badge status-pending">제출전</span>
                          )}
                        </div>
                        <div className="assignment-course-name">{assignment.courseName}</div>
                      </div>
                      <div className="assignment-card-body">
                        <h3 className="assignment-name">{assignment.assignmentName}</h3>
                        <div className="assignment-details">
                          <div className="assignment-detail-item">
                            <span className="detail-label">과목:</span>
                            <span className="detail-value">{assignment.subject}</span>
                          </div>
                          <div className="assignment-detail-item">
                            <span className="detail-label">문항 수:</span>
                            <span className="detail-value">{assignment.questionCount}개</span>
                          </div>
                          <div className="assignment-detail-item">
                            <span className="detail-label">시작일:</span>
                            <span className="detail-value">{formatDate(assignment.startDate)}</span>
                          </div>
                          <div className="assignment-detail-item">
                            <span className="detail-label">제출일:</span>
                            <span className="detail-value">{formatDate(assignment.dueDate)}</span>
                          </div>
                        </div>
                      </div>
                        <div className="assignment-card-footer">
                        {!isSubmitted ? (
                          <button 
                            className="assignment-submit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              // 이미지 파일이 있는 경우에만 상세 페이지로 이동
                              const hasImages = assignment.fileUrl && 
                                Array.isArray(assignment.fileUrl) && 
                                assignment.fileUrl.length > 0 &&
                                assignment.fileType && 
                                Array.isArray(assignment.fileType) &&
                                assignment.fileType.some(type => type === 'image');
                              
                              if (hasImages) {
                                setSelectedAssignment(assignment);
                              } else {
                                alert('이 과제에는 이미지 파일이 없습니다.');
                              }
                            }}
                          >
                            답안 제출하기
                          </button>
                        ) : (
                          <div className="assignment-submitted-info">
                            {submission && (
                              <>
                            <span className="submitted-icon">✓</span>
                                <span className="submitted-text">
                                  {assignment.questionCount}개 중 {submission.correctCount}개 맞음
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-copyright">
            <p>© 이창현수학. All rights reserved.</p>
          </div>
          <div className="footer-contact">
            <span>연락처 | 010-9903-7949</span>
          </div>
        </div>
      </footer>

      <MyInfoModal
        showModal={showMyInfoModal}
        onClose={() => setShowMyInfoModal(false)}
        user={user}
        onUpdateUser={async (formData) => {
          const token = localStorage.getItem('token');
          const response = await put(`/api/users/${user._id}`, formData);

          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || '정보 수정에 실패했습니다.');
          }

          // 사용자 정보 업데이트
          const updatedUser = { ...user, ...formData };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.location.reload(); // 페이지 새로고침하여 업데이트된 정보 반영
        }}
        onUpdatePassword={async (passwordData) => {
          const response = await patch(`/api/users/${user._id}/password`, passwordData);

          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || '비밀번호 변경에 실패했습니다.');
          }
        }}
        onDeleteUser={async () => {
          const response = await del(`/api/users/${user._id}`);

          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || '회원탈퇴에 실패했습니다.');
          }

          // 로그아웃 처리
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('rememberMe');
          onLogout();
        }}
      />
    </div>
  );
}

export default DashboardPage;

