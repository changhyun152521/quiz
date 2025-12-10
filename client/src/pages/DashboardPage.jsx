import { useState, useEffect } from 'react';
import { get, put, del, patch } from '../utils/api';
import MyInfoModal from '../components/MyInfoModal';
import StudyReportModal from '../components/StudyReportModal';
import AssignmentDetailPage from './AssignmentDetailPage';
import '../components/Dashboard.css';

function DashboardPage({ user, onLogout, onGoToMainPage, selectedCourse }) {
  const [activeTab, setActiveTab] = useState('all');
  const [showMyInfoModal, setShowMyInfoModal] = useState(false);
  const [showStudyReportModal, setShowStudyReportModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  
  // 강좌 및 과제 데이터
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
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

  // 선택된 강좌가 있으면 해당 강좌로 설정
  useEffect(() => {
    if (selectedCourse && selectedCourse._id) {
      setSelectedCourseId(selectedCourse._id);
    }
  }, [selectedCourse]);

  // 탭이나 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedCourseId]);

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
        const coursesList = data.data || [];
        setCourses(coursesList);
        // 강좌가 있고 selectedCourseId가 없고 selectedCourse도 없으면 첫 번째 강좌를 선택
        if (coursesList.length > 0 && !selectedCourseId && !selectedCourse) {
          setSelectedCourseId(coursesList[0]._id);
        }
      } else {
        console.error('강좌 목록 조회 실패:', data.message);
      }
    } catch (error) {
      console.error('강좌 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 강좌의 최근 한 달 과제 필터링
  useEffect(() => {
    const filteredAssignments = [];
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    courses.forEach(course => {
      // 선택된 강좌 필터링
      if (course._id !== selectedCourseId) {
        return;
      }

      // 강좌의 과제들 필터링
      if (course.assignments && Array.isArray(course.assignments)) {
        course.assignments.forEach(assignment => {
          if (!assignment || !assignment.startDate) return;

          const assignmentDate = new Date(assignment.startDate);

          // 최근 한 달 동안 부여된 과제만 추가
          if (assignmentDate >= oneMonthAgo && assignmentDate <= now) {
            filteredAssignments.push({
              ...assignment,
              courseName: course.courseName,
              courseId: course._id
            });
          }
        });
      }
    });

    // 과제 시작일 기준 정렬 (최신 것이 상단)
    filteredAssignments.sort((a, b) => {
      const dateA = new Date(a.startDate || 0);
      const dateB = new Date(b.startDate || 0);
      return dateB - dateA; // 최신 것이 먼저 오도록 내림차순 정렬
    });

    setAssignments(filteredAssignments);
  }, [courses, selectedCourseId]);

  // 탭별 필터링된 과제
  const getFilteredAssignments = () => {
    if (activeTab === 'all') return assignments;
    if (activeTab === 'quiz') return assignments.filter(a => a.assignmentType === 'QUIZ');
    if (activeTab === 'test') return assignments.filter(a => a.assignmentType === '클리닉');
    return assignments;
  };

  // 통계 계산 - 제출 상태 기반
  const calculateStats = () => {
    const filtered = getFilteredAssignments();
    
    // 제출 상태 확인 함수
    const isSubmitted = (assignment) => {
      const submission = assignment.submissions?.find(
        sub => {
          const subStudentId = sub.studentId?._id || sub.studentId;
          const userId = user._id;
          return subStudentId && userId && String(subStudentId) === String(userId);
        }
      );
      return !!submission;
    };
    
    // 진행중인 과제: 제출전인 과제의 개수
    const inProgress = filtered.filter(a => !isSubmitted(a)).length;

    // 완료된 과제: 제출완료된 과제의 개수
    const completed = filtered.filter(a => isSubmitted(a)).length;

    return {
      inProgress,
      total: filtered.length,
      completed
    };
  };

  const currentData = calculateStats();
  const filteredAssignments = getFilteredAssignments();
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);
  
  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

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
              onClick={() => setShowStudyReportModal(true)}
            >
              학습현황
            </button>
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
                {courses.length === 0 ? (
                  <option value="">등록된 반이 없습니다</option>
                ) : (
                  courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.courseName}
                  </option>
                  ))
                )}
              </select>
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
              {user?.name || '학생'}학생의 과제현황
            </h1>
            <p className="dashboard-date-range">
              {(() => {
                const now = new Date();
                const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                const formatDate = (date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${year}.${month}.${day}`;
                };
                return `${formatDate(oneMonthAgo)} ~ ${formatDate(now)}`;
              })()}
            </p>
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
              클리닉
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
              <>
              <div className="assignments-grid">
                  {paginatedAssignments.map(assignment => {
                  // 제출 상태 확인
                  const submission = assignment.submissions?.find(
                    sub => {
                      const subStudentId = sub.studentId?._id || sub.studentId;
                      const userId = user._id;
                      return subStudentId && userId && String(subStudentId) === String(userId);
                    }
                  );
                  const isSubmitted = !!submission;
                  
                  // 제출 기간 확인
                  const now = new Date();
                  const dueDate = new Date(assignment.dueDate);
                  const isExpired = now > dueDate;
                  
                  // 뱃지 상태 결정
                  let statusBadge = null;
                  if (isExpired) {
                    // 제출 기간이 지난 경우
                    if (isSubmitted) {
                      statusBadge = <span className="status-badge status-late-submitted">제출 후 마감</span>;
                    } else {
                      statusBadge = <span className="status-badge status-expired">기간 만료</span>;
                    }
                  } else {
                    // 제출 기간 내
                    if (isSubmitted) {
                      statusBadge = <span className="status-badge status-submitted">제출완료</span>;
                    } else {
                      statusBadge = <span className="status-badge status-pending">제출전</span>;
                    }
                  }
                  
                  return (
                    <div
                      key={assignment._id}
                      className="assignment-card"
                      onClick={async (e) => {
                        // 버튼이나 링크 클릭이 아닌 경우에만 카드 클릭 처리
                        const clickedButton = e.target.closest('button');
                        const clickedLink = e.target.closest('a');
                        
                        if (clickedButton || clickedLink) {
                          console.log('버튼/링크 클릭, 카드 클릭 무시');
                          return;
                        }
                        
                        console.log('과제 카드 클릭:', assignment._id, assignment.assignmentName);
                        console.log('과제 카드의 해설지 파일:', {
                          hasSolutionFileUrl: !!assignment.solutionFileUrl,
                          solutionFileUrlCount: assignment.solutionFileUrl?.length || 0,
                          solutionFileUrl: assignment.solutionFileUrl
                        });
                        
                        // 이미지가 없어도 빈 캔버스로 필기할 수 있도록 상세 페이지로 이동
                        // assignment의 전체 정보(answers 포함)를 API에서 가져오기
                        try {
                          console.log('과제 정보 API 호출 시작:', assignment._id);
                          const response = await get(`/api/assignments/${assignment._id}`);
                          const data = await response.json();
                          console.log('과제 정보 API 응답:', data);
                          console.log('API 응답의 해설지 파일:', {
                            hasSolutionFileUrl: !!data.data?.solutionFileUrl,
                            solutionFileUrlCount: data.data?.solutionFileUrl?.length || 0,
                            solutionFileUrl: data.data?.solutionFileUrl
                          });
                          
                          if (data.success && data.data) {
                            console.log('과제 상세 페이지로 이동:', data.data._id);
                            setSelectedAssignment(data.data);
                          } else {
                            console.warn('API 응답 실패, 기존 assignment 사용:', data);
                            // API 호출 실패 시 기존 assignment 사용
                            setSelectedAssignment(assignment);
                          }
                        } catch (error) {
                          console.error('과제 정보 가져오기 오류:', error);
                          // 에러 발생 시 기존 assignment 사용
                          setSelectedAssignment(assignment);
                        }
                      }}
                    >
                      <div className="assignment-card-header">
                        <div className="assignment-type-badge">
                          {assignment.assignmentType === 'QUIZ' ? 'QUIZ' : '클리닉'}
                        </div>
                        <div className="assignment-status-badge">
                          {statusBadge}
                        </div>
                        <div className="assignment-course-name">{assignment.courseName}</div>
                      </div>
                      <div className="assignment-card-body">
                        <h3 className="assignment-name">{assignment.assignmentName}</h3>
                        <div className="assignment-details">
                          {(assignment.subject || assignment.mainUnit) && (
                            <div className="assignment-detail-item">
                              <span className="detail-label">단원: </span>
                              <span className="detail-value">
                                {[assignment.subject, assignment.mainUnit]
                                  .filter(Boolean)
                                  .join(' / ')}
                              </span>
                            </div>
                          )}
                          {assignment.subUnit && (
                            <div className="assignment-detail-item">
                              <span className="detail-label">소단원: </span>
                              <span className="detail-value">{assignment.subUnit}</span>
                            </div>
                          )}
                          <div className="assignment-detail-item">
                            <span className="detail-label">문항 수: </span>
                            <span className="detail-value">{assignment.questionCount}개</span>
                          </div>
                          <div className="assignment-detail-item">
                            <span className="detail-label">기간: </span>
                            <span className="detail-value">
                              {formatDate(assignment.startDate)} ~ {formatDate(assignment.dueDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                        <div className="assignment-card-footer">
                        {!isSubmitted ? (
                          <button 
                            className="assignment-submit-btn"
                            onClick={async (e) => {
                              e.stopPropagation();
                              // 이미지가 없어도 빈 캔버스로 필기할 수 있도록 상세 페이지로 이동
                              // assignment의 전체 정보(answers 포함)를 API에서 가져오기
                              try {
                                const response = await get(`/api/assignments/${assignment._id}`);
                                const data = await response.json();
                                if (data.success && data.data) {
                                  setSelectedAssignment(data.data);
                                } else {
                                  // API 호출 실패 시 기존 assignment 사용
                                  setSelectedAssignment(assignment);
                                }
                              } catch (error) {
                                console.error('과제 정보 가져오기 오류:', error);
                                // 에러 발생 시 기존 assignment 사용
                                setSelectedAssignment(assignment);
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
                
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="dashboard-pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      이전
                    </button>
                    <div className="pagination-pages">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
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

      <StudyReportModal
        showModal={showStudyReportModal}
        onClose={() => setShowStudyReportModal(false)}
        user={user}
        selectedCourseId={selectedCourseId}
      />

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

