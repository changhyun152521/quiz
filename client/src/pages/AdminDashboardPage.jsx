import { useState, useEffect } from 'react';
import { get, post, put, del, patch } from '../utils/api';
import StudentModal from '../components/StudentModal';
import TeacherModal from '../components/TeacherModal';
import CourseModal from '../components/CourseModal';
import AssignmentModal from '../components/AssignmentModal';
import CourseAssignmentModal from '../components/CourseAssignmentModal';
import TestResultModal from '../components/TestResultModal';
import CourseReportModal from '../components/CourseReportModal';
import MyInfoModal from '../components/MyInfoModal';
import '../components/AdminDashboard.css';

function AdminDashboardPage({ user, onLogout, onGoToMainPage }) {
  const [activeSection, setActiveSection] = useState('students');
  
  // 페이지 마운트 시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [])
  
  // 학생 관리 상태
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentModalMode, setStudentModalMode] = useState('create');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [currentPageStudents, setCurrentPageStudents] = useState(1);

  // 강사 관리 상태
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherModalMode, setTeacherModalMode] = useState('create');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [currentPageTeachers, setCurrentPageTeachers] = useState(1);

  // 강좌 관리 상태
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseModalMode, setCourseModalMode] = useState('create');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [teacherList, setTeacherList] = useState([]);
  const [showCourseAssignmentModal, setShowCourseAssignmentModal] = useState(false);
  const [selectedCourseForAssignment, setSelectedCourseForAssignment] = useState(null);
  const [showTestResultModal, setShowTestResultModal] = useState(false);
  const [selectedCourseForTest, setSelectedCourseForTest] = useState(null);
  const [showCourseReportModal, setShowCourseReportModal] = useState(false);
  const [selectedCourseForReport, setSelectedCourseForReport] = useState(null);
  const [currentPageCourses, setCurrentPageCourses] = useState(1);

  // 과제 관리 상태
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentModalMode, setAssignmentModalMode] = useState('create');
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [allAssignments, setAllAssignments] = useState([]); // 강좌에 추가할 수 있는 모든 과제 목록
  const [showMyInfoModal, setShowMyInfoModal] = useState(false);
  const [currentPageAssignments, setCurrentPageAssignments] = useState(1);

  const itemsPerPage = 8;

  // 학생 목록 가져오기
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await get('/api/users?limit=100');

      const data = await response.json();
      if (data.success) {
        // role이 'student'인 사용자만 필터링
        const studentUsers = (data.data || []).filter(user => user.role === 'student');
        setStudents(studentUsers);
      } else {
        alert('학생 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('학생 목록 조회 오류:', error);
      alert('학생 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 강사 목록 가져오기 (강좌용)
  const fetchTeacherList = async () => {
    try {
      const response = await get('/api/courses/teachers');

      const data = await response.json();
      if (data.success) {
        setTeacherList(data.data || []);
      }
    } catch (error) {
      console.error('강사 목록 조회 오류:', error);
    }
  };

  // 강사 관리용 강사 목록 가져오기
  const fetchTeachers = async () => {
    setTeachersLoading(true);
    try {
      const response = await get('/api/users?limit=100');

      const data = await response.json();
      if (data.success) {
        // role이 'teacher'인 사용자만 필터링
        const teacherUsers = (data.data || []).filter(user => user.role === 'teacher');
        setTeachers(teacherUsers);
      } else {
        alert('강사 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('강사 목록 조회 오류:', error);
      alert('강사 목록을 불러오는데 실패했습니다.');
    } finally {
      setTeachersLoading(false);
    }
  };

  // 강좌 목록 가져오기
  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const response = await get('/api/courses?limit=100');

      const data = await response.json();
      if (data.success) {
        setCourses(data.data || []);
      } else {
        alert('강좌 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('강좌 목록 조회 오류:', error);
      alert('강좌 목록을 불러오는데 실패했습니다.');
    } finally {
      setCoursesLoading(false);
    }
  };

  // 과제 목록 가져오기
  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const response = await get('/api/assignments?limit=100');

      const data = await response.json();
      if (data.success) {
        setAssignments(data.data || []);
      } else {
        alert('과제 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('과제 목록 조회 오류:', error);
      alert('과제 목록을 불러오는데 실패했습니다.');
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // 모든 과제 목록 가져오기 (강좌에 추가할 때 사용)
  const fetchAllAssignments = async () => {
    try {
      const response = await get('/api/assignments?limit=100');

      const data = await response.json();
      if (data.success) {
        setAllAssignments(data.data || []);
      }
    } catch (error) {
      console.error('과제 목록 조회 오류:', error);
    }
  };

  // 페이지 최초 로드 시 한 번만 데이터 가져오기
  useEffect(() => {
      fetchStudents();
      fetchTeachers();
      fetchCourses();
      fetchTeacherList();
    fetchAllAssignments();
      fetchAssignments();
  }, []); // 빈 배열로 최초 한 번만 실행

  // 학생 저장 (생성 또는 수정)
  const handleSaveStudent = async (formData, studentId) => {
    try {
      const token = localStorage.getItem('token');
      let response;

      if (studentId) {
        // 수정
        response = await put(`/api/users/${studentId}`, formData);
      } else {
        // 생성
        response = await post('/api/users', formData);
      }

      const data = await response.json();
      if (response.ok && data.success) {
        alert(studentId ? '학생 정보가 수정되었습니다.' : '학생이 추가되었습니다.');
        // 상태 업데이트는 모달이 닫힌 후에 수행
        setTimeout(() => {
        fetchStudents();
        }, 100);
      } else {
        alert(data.message || '저장에 실패했습니다.');
        throw new Error(data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      throw error;
    }
  };

  // 학생 삭제
  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`정말 ${studentName} 학생을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await del(`/api/users/${studentId}`);

      const data = await response.json();
      if (response.ok) {
        alert('학생이 삭제되었습니다.');
        fetchStudents();
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 학생 추가 모달 열기
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setStudentModalMode('create');
    setShowStudentModal(true);
  };

  // 학생 수정 모달 열기
  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setStudentModalMode('edit');
    setShowStudentModal(true);
  };

  // 강좌 저장 (생성 또는 수정)
  const handleSaveCourse = async (formData, courseId) => {
    try {
      const token = localStorage.getItem('token');
      let response;

      if (courseId) {
        // 수정
        response = await put(`/api/courses/${courseId}`, formData);
      } else {
        // 생성
        response = await post('/api/courses', formData);
      }

      const data = await response.json();
      if (response.ok && data.success) {
        alert(courseId ? '강좌 정보가 수정되었습니다.' : '강좌가 추가되었습니다.');
        // 상태 업데이트는 모달이 닫힌 후에 수행
        setTimeout(() => {
        fetchCourses();
        }, 100);
      } else {
        alert(data.message || '저장에 실패했습니다.');
        throw new Error(data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      throw error;
    }
  };

  // 강좌 삭제
  const handleDeleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`정말 "${courseName}" 강좌를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await del(`/api/courses/${courseId}`);

      const data = await response.json();
      if (response.ok) {
        alert('강좌가 삭제되었습니다.');
        fetchCourses();
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 강좌 추가 모달 열기
  const handleAddCourse = () => {
    setSelectedCourse(null);
    setCourseModalMode('create');
    setShowCourseModal(true);
  };

  // 강좌 수정 모달 열기
  const handleEditCourse = (course) => {
    setSelectedCourse(course);
    setCourseModalMode('edit');
    setShowCourseModal(true);
  };

  // 강좌에 과제 추가
  const handleAddAssignmentToCourse = async (courseId, assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await post(`/api/courses/${courseId}/assignments`, { assignmentId });

      const data = await response.json();
      if (response.ok) {
        alert('과제가 강좌에 추가되었습니다.');
        // 강좌 목록 업데이트
        await fetchCourses();
        // 모달에 표시되는 강좌 정보도 업데이트
        if (selectedCourseForAssignment && selectedCourseForAssignment._id === courseId) {
          const updatedCourseResponse = await get(`/api/courses/${courseId}`);
          const updatedCourseData = await updatedCourseResponse.json();
          if (updatedCourseData.success) {
            setSelectedCourseForAssignment(updatedCourseData.data);
          }
        }
      } else {
        alert(data.message || '과제 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('과제 추가 오류:', error);
      alert('과제 추가 중 오류가 발생했습니다.');
    }
  };

  // 강좌에서 과제 제거
  const handleRemoveAssignmentFromCourse = async (courseId, assignmentId, assignmentName) => {
    if (!window.confirm(`정말 "${assignmentName}" 과제를 이 강좌에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await del(`/api/courses/${courseId}/assignments/${assignmentId}`);

      const data = await response.json();
      if (response.ok) {
        alert('과제가 강좌에서 제거되었습니다.');
        fetchCourses();
      } else {
        alert(data.message || '과제 제거에 실패했습니다.');
      }
    } catch (error) {
      console.error('과제 제거 오류:', error);
      alert('과제 제거 중 오류가 발생했습니다.');
    }
  };

  // 과제 저장 (생성 또는 수정)
  const handleSaveAssignment = async (formData, assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      let response;

      if (assignmentId) {
        // 수정
        response = await put(`/api/assignments/${assignmentId}`, formData);
      } else {
        // 생성
        response = await post('/api/assignments', formData);
      }

      const data = await response.json();
      if (response.ok) {
        alert(assignmentId ? '과제 정보가 수정되었습니다.' : '과제가 추가되었습니다.');
        fetchAssignments();
        fetchAllAssignments(); // allAssignments도 새로고침
        fetchCourses(); // 강좌 데이터도 새로고침 (학생 대시보드에 반영되도록)
      } else {
        alert(data.message || '저장에 실패했습니다.');
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('저장 오류:', error);
      throw error;
    }
  };

  // 과제 삭제
  const handleDeleteAssignment = async (assignmentId, assignmentName) => {
    if (!window.confirm(`정말 "${assignmentName}" 과제를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await del(`/api/assignments/${assignmentId}`);

      const data = await response.json();
      if (response.ok) {
        alert('과제가 삭제되었습니다.');
        fetchAssignments();
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 과제 추가 모달 열기
  const handleAddAssignment = () => {
    setSelectedAssignment(null);
    setAssignmentModalMode('create');
    setShowAssignmentModal(true);
  };

  // 과제 수정 모달 열기
  const handleEditAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setAssignmentModalMode('edit');
    setShowAssignmentModal(true);
  };


  // 강사 저장 (생성 또는 수정)
  const handleSaveTeacher = async (formData, teacherId) => {
    try {
      const token = localStorage.getItem('token');
      let response;

      // 강사 role 추가, 필수 필드만 포함
      const teacherData = {
        userId: formData.userId,
        name: formData.name,
        role: 'teacher',
        // 강사는 나머지 필드가 필요 없으므로 기본값 설정
        studentPhone: '00000000000',
        parentPhone: '00000000000',
        email: `${formData.userId}@teacher.com`, // 임시 이메일
        schoolName: '강사',
        grade: '초등', // 기본값
        privacyConsent: true,
        termsConsent: true
      };

      // 비밀번호는 있을 때만 포함
      if (formData.password) {
        teacherData.password = formData.password;
      }

      if (teacherId) {
        // 수정 - 비밀번호가 없으면 제외
        const updateData = {
          userId: teacherData.userId,
          name: teacherData.name
        };
        if (teacherData.password) {
          updateData.password = teacherData.password;
        }

        response = await put(`/api/users/${teacherId}`, updateData);
      } else {
        // 생성
        response = await post('/api/users', teacherData);
      }

      const data = await response.json();
      if (response.ok && data.success) {
        alert(teacherId ? '강사 정보가 수정되었습니다.' : '강사가 추가되었습니다.');
        // 상태 업데이트는 모달이 닫힌 후에 수행
        setTimeout(() => {
        fetchTeachers();
        fetchTeacherList(); // 강좌용 강사 목록도 업데이트
        }, 100);
      } else {
        alert(data.message || '저장에 실패했습니다.');
        throw new Error(data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      throw error;
    }
  };

  // 강사 삭제
  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`정말 ${teacherName} 강사를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await del(`/api/users/${teacherId}`);

      const data = await response.json();
      if (response.ok) {
        alert('강사가 삭제되었습니다.');
        fetchTeachers();
        fetchTeacherList(); // 강좌용 강사 목록도 업데이트
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 강사 추가 모달 열기
  const handleAddTeacher = () => {
    setSelectedTeacher(null);
    setTeacherModalMode('create');
    setShowTeacherModal(true);
  };

  // 강사 수정 모달 열기
  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setTeacherModalMode('edit');
    setShowTeacherModal(true);
  };

  // 검색 필터링
  const filteredStudents = students.filter(student => {
    if (!studentSearchTerm) return true;
    const term = studentSearchTerm.toLowerCase();
    return (
      student.name?.toLowerCase().includes(term) ||
      student.userId?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.schoolName?.toLowerCase().includes(term)
    );
  });

  const filteredCourses = courses.filter(course => {
    if (!courseSearchTerm) return true;
    const term = courseSearchTerm.toLowerCase();
    return (
      course.courseName?.toLowerCase().includes(term) ||
      course.teacherName?.toLowerCase().includes(term) ||
      (course.teacher?.name && course.teacher.name.toLowerCase().includes(term))
    );
  });

  const filteredTeachers = teachers.filter(teacher => {
    if (!teacherSearchTerm) return true;
    const term = teacherSearchTerm.toLowerCase();
    return (
      teacher.name?.toLowerCase().includes(term) ||
      teacher.userId?.toLowerCase().includes(term) ||
      teacher.email?.toLowerCase().includes(term) ||
      teacher.schoolName?.toLowerCase().includes(term)
    );
  });

  const filteredAssignments = assignments.filter(assignment => {
    if (!assignmentSearchTerm) return true;
    const term = assignmentSearchTerm.toLowerCase();
    return (
      assignment.assignmentName?.toLowerCase().includes(term) ||
      assignment.subject?.toLowerCase().includes(term) ||
      assignment.assignmentType?.toLowerCase().includes(term)
    );
  });

  // 페이지네이션 계산
  const getPaginatedItems = (items, currentPage) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = (items) => {
    return Math.ceil(items.length / itemsPerPage);
  };

  // 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPageStudents(1);
  }, [studentSearchTerm]);

  useEffect(() => {
    setCurrentPageTeachers(1);
  }, [teacherSearchTerm]);

  useEffect(() => {
    setCurrentPageCourses(1);
  }, [courseSearchTerm]);

  useEffect(() => {
    setCurrentPageAssignments(1);
  }, [assignmentSearchTerm]);

  return (
    <div className="admin-dashboard">
      {/* 헤더 */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div 
            className="admin-logo"
            onClick={() => {
              if (onGoToMainPage) {
                onGoToMainPage(); // 메인 화면으로 이동 (로그인 상태 유지)
              } else {
                onLogout();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="admin-logo-text">QUIZ LAB</div>
          </div>
          <div className="admin-user-info">
            <button 
              className="admin-logout-btn" 
              onClick={() => setShowMyInfoModal(true)}
            >
              내정보
            </button>
            <button 
              className="admin-logout-btn" 
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

      {/* 메인 컨텐츠 */}
      <main className="admin-main">
        <div className="admin-container">
          {/* 제목 */}
          <div className="admin-title-section">
            <h1 className="admin-title">관리자 페이지</h1>
            <p className="admin-subtitle">학생, 강좌, 과제를 관리할 수 있습니다</p>
          </div>

          {/* 사이드바 */}
          <div className="admin-layout">
            <aside className="admin-sidebar">
              <nav className="admin-nav">
                <button
                  className={`admin-nav-item ${activeSection === 'students' ? 'active' : ''}`}
                  onClick={() => setActiveSection('students')}
                >
                  <span className="nav-icon">👥</span>
                  <span className="nav-text">학생 관리</span>
                </button>
                <button
                  className={`admin-nav-item ${activeSection === 'teachers' ? 'active' : ''}`}
                  onClick={() => setActiveSection('teachers')}
                >
                  <span className="nav-icon">👨‍🏫</span>
                  <span className="nav-text">강사 관리</span>
                </button>
                <button
                  className={`admin-nav-item ${activeSection === 'courses' ? 'active' : ''}`}
                  onClick={() => setActiveSection('courses')}
                >
                  <span className="nav-icon">📚</span>
                  <span className="nav-text">강좌 관리</span>
                </button>
                <button
                  className={`admin-nav-item ${activeSection === 'assignments' ? 'active' : ''}`}
                  onClick={() => setActiveSection('assignments')}
                >
                  <span className="nav-icon">🎯</span>
                  <span className="nav-text">과제 관리</span>
                </button>
              </nav>
            </aside>

            {/* 컨텐츠 영역 */}
            <div className="admin-content">
              {activeSection === 'students' && (
                <div className="admin-section">
                  <h2 className="section-title">학생 관리</h2>
                  <div className="section-actions">
                    <button 
                      className="admin-btn admin-btn-primary"
                      onClick={handleAddStudent}
                    >
                      + 학생 추가
                    </button>
                    <button 
                      className="admin-btn admin-btn-secondary"
                      onClick={fetchStudents}
                      disabled={loading}
                    >
                      🔄 새로고침
                    </button>
                    <input
                      type="text"
                      placeholder="이름, 아이디, 이메일, 학교명으로 검색..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>
                  <div className="admin-table-container">
                    {loading ? (
                      <div className="table-loading">
                        <p>로딩 중...</p>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="table-empty">
                        <p>{studentSearchTerm ? '검색 결과가 없습니다.' : '학생 목록이 비어있습니다.'}</p>
                      </div>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>이름</th>
                            <th>아이디</th>
                            <th>학년</th>
                            <th>학교</th>
                            <th>이메일</th>
                            <th>학생 연락처</th>
                            <th>작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedItems(filteredStudents, currentPageStudents).map((student) => (
                            <tr key={student._id}>
                              <td>{student.name}</td>
                              <td>{student.userId}</td>
                              <td>{student.grade}</td>
                              <td>{student.schoolName}</td>
                              <td>{student.email}</td>
                              <td>{student.studentPhone}</td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="action-btn edit-btn"
                                    onClick={() => handleEditStudent(student)}
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteStudent(student._id, student.name)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* 학생 페이지네이션 */}
                  {getTotalPages(filteredStudents) > 1 && (
                    <div className="admin-pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageStudents(currentPageStudents - 1)}
                        disabled={currentPageStudents === 1}
                      >
                        이전
                      </button>
                      <div className="pagination-pages">
                        {Array.from({ length: getTotalPages(filteredStudents) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            className={`pagination-page-btn ${currentPageStudents === page ? 'active' : ''}`}
                            onClick={() => setCurrentPageStudents(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageStudents(currentPageStudents + 1)}
                        disabled={currentPageStudents === getTotalPages(filteredStudents)}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'teachers' && (
                <div className="admin-section">
                  <h2 className="section-title">강사 관리</h2>
                  <div className="section-actions">
                    <button 
                      className="admin-btn admin-btn-primary"
                      onClick={handleAddTeacher}
                    >
                      + 강사 추가
                    </button>
                    <button 
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        fetchTeachers();
                        fetchTeacherList();
                      }}
                      disabled={teachersLoading}
                    >
                      🔄 새로고침
                    </button>
                    <input
                      type="text"
                      placeholder="이름, 아이디, 이메일, 학교명으로 검색..."
                      value={teacherSearchTerm}
                      onChange={(e) => setTeacherSearchTerm(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>
                  <div className="admin-table-container">
                    {teachersLoading ? (
                      <div className="table-loading">
                        <p>로딩 중...</p>
                      </div>
                    ) : filteredTeachers.length === 0 ? (
                      <div className="table-empty">
                        <p>{teacherSearchTerm ? '검색 결과가 없습니다.' : '강사 목록이 비어있습니다.'}</p>
                      </div>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>이름</th>
                            <th>아이디</th>
                            <th>작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedItems(filteredTeachers, currentPageTeachers).map((teacher) => (
                            <tr key={teacher._id}>
                              <td>{teacher.name}</td>
                              <td>{teacher.userId}</td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="action-btn edit-btn"
                                    onClick={() => handleEditTeacher(teacher)}
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteTeacher(teacher._id, teacher.name)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* 강사 페이지네이션 */}
                  {getTotalPages(filteredTeachers) > 1 && (
                    <div className="admin-pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageTeachers(currentPageTeachers - 1)}
                        disabled={currentPageTeachers === 1}
                      >
                        이전
                      </button>
                      <div className="pagination-pages">
                        {Array.from({ length: getTotalPages(filteredTeachers) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            className={`pagination-page-btn ${currentPageTeachers === page ? 'active' : ''}`}
                            onClick={() => setCurrentPageTeachers(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageTeachers(currentPageTeachers + 1)}
                        disabled={currentPageTeachers === getTotalPages(filteredTeachers)}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'courses' && (
                <div className="admin-section">
                  <h2 className="section-title">강좌 관리</h2>
                  <div className="section-actions">
                    <button 
                      className="admin-btn admin-btn-primary"
                      onClick={handleAddCourse}
                    >
                      + 강좌 추가
                    </button>
                    <button 
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        fetchCourses();
                        fetchTeacherList();
                        fetchAllAssignments();
                      }}
                      disabled={coursesLoading}
                    >
                      🔄 새로고침
                    </button>
                    <input
                      type="text"
                      placeholder="강좌명, 강사명으로 검색..."
                      value={courseSearchTerm}
                      onChange={(e) => setCourseSearchTerm(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>
                  <div className="admin-table-container">
                    {coursesLoading ? (
                      <div className="table-loading">
                        <p>로딩 중...</p>
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="table-empty">
                        <p>{courseSearchTerm ? '검색 결과가 없습니다.' : '강좌 목록이 비어있습니다.'}</p>
                      </div>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>강좌명</th>
                            <th>강사</th>
                            <th>수강생 수</th>
                            <th>생성일</th>
                            <th>작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedItems(filteredCourses, currentPageCourses).map((course) => (
                            <tr key={course._id}>
                              <td>{course.courseName}</td>
                              <td>
                                {course.teacherName || (course.teacher?.name || '')}
                                {course.teacher?.userId && ` (${course.teacher.userId})`}
                              </td>
                              <td>{course.students?.length || 0}명</td>
                              <td>
                                {course.createdAt 
                                  ? new Date(course.createdAt).toLocaleDateString('ko-KR')
                                  : '-'}
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="action-btn assignment-btn"
                                    onClick={async () => {
                                      setSelectedCourseForAssignment(course);
                                      // 모달 열기 전에 allAssignments 새로고침
                                      await fetchAllAssignments();
                                      setShowCourseAssignmentModal(true);
                                    }}
                                    title="과제 추가"
                                  >
                                    과제 추가
                                  </button>
                                  <button
                                    className="action-btn test-result-btn"
                                    onClick={() => {
                                      setSelectedCourseForTest(course);
                                      setShowTestResultModal(true);
                                    }}
                                    title="과제 조회"
                                  >
                                    과제 조회
                                  </button>
                                  <button
                                    className="action-btn report-btn"
                                    onClick={() => {
                                      setSelectedCourseForReport(course);
                                      setShowCourseReportModal(true);
                                    }}
                                    title="보고서"
                                  >
                                    보고서
                                  </button>
                                  <button
                                    className="action-btn edit-btn"
                                    onClick={() => handleEditCourse(course)}
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteCourse(course._id, course.courseName)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* 강좌 페이지네이션 */}
                  {getTotalPages(filteredCourses) > 1 && (
                    <div className="admin-pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageCourses(currentPageCourses - 1)}
                        disabled={currentPageCourses === 1}
                      >
                        이전
                      </button>
                      <div className="pagination-pages">
                        {Array.from({ length: getTotalPages(filteredCourses) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            className={`pagination-page-btn ${currentPageCourses === page ? 'active' : ''}`}
                            onClick={() => setCurrentPageCourses(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageCourses(currentPageCourses + 1)}
                        disabled={currentPageCourses === getTotalPages(filteredCourses)}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'assignments' && (
                <div className="admin-section">
                  <h2 className="section-title">과제 관리</h2>
                  <div className="section-actions">
                    <button 
                      className="admin-btn admin-btn-primary"
                      onClick={handleAddAssignment}
                    >
                      + 과제 추가
                    </button>
                    <button 
                      className="admin-btn admin-btn-secondary"
                      onClick={fetchAssignments}
                      disabled={assignmentsLoading}
                    >
                      🔄 새로고침
                    </button>
                    <input
                      type="text"
                      placeholder="과제명, 과목, 타입으로 검색..."
                      value={assignmentSearchTerm}
                      onChange={(e) => setAssignmentSearchTerm(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>
                  <div className="admin-table-container">
                    {assignmentsLoading ? (
                      <div className="table-loading">
                        <p>로딩 중...</p>
                      </div>
                    ) : filteredAssignments.length === 0 ? (
                      <div className="table-empty">
                        <p>{assignmentSearchTerm ? '검색 결과가 없습니다.' : '과제 목록이 비어있습니다.'}</p>
                      </div>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>과제명</th>
                            <th>과목</th>
                            <th>문항 수</th>
                            <th>과제 타입</th>
                            <th>시작일</th>
                            <th>제출일</th>
                            <th>작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedItems(filteredAssignments, currentPageAssignments).map((assignment) => (
                            <tr key={assignment._id}>
                              <td>{assignment.assignmentName}</td>
                              <td>{assignment.subject}</td>
                              <td>{assignment.questionCount}개</td>
                              <td>{assignment.assignmentType === '실전TEST' ? '클리닉' : assignment.assignmentType}</td>
                              <td>
                                {assignment.startDate 
                                  ? new Date(assignment.startDate).toLocaleDateString('ko-KR')
                                  : '-'}
                              </td>
                              <td>
                                {assignment.dueDate 
                                  ? new Date(assignment.dueDate).toLocaleDateString('ko-KR')
                                  : '-'}
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="action-btn edit-btn"
                                    onClick={() => handleEditAssignment(assignment)}
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteAssignment(assignment._id, assignment.assignmentName)}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* 과제 페이지네이션 */}
                  {getTotalPages(filteredAssignments) > 1 && (
                    <div className="admin-pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageAssignments(currentPageAssignments - 1)}
                        disabled={currentPageAssignments === 1}
                      >
                        이전
                      </button>
                      <div className="pagination-pages">
                        {Array.from({ length: getTotalPages(filteredAssignments) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            className={`pagination-page-btn ${currentPageAssignments === page ? 'active' : ''}`}
                            onClick={() => setCurrentPageAssignments(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPageAssignments(currentPageAssignments + 1)}
                        disabled={currentPageAssignments === getTotalPages(filteredAssignments)}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="admin-footer">
        <div className="footer-content">
          <div className="footer-copyright">
            <p>© 이창현수학. All rights reserved.</p>
          </div>
          <div className="footer-contact">
            <span>연락처 | 010-9903-7949</span>
          </div>
        </div>
      </footer>

      <StudentModal
        showModal={showStudentModal}
        onClose={() => {
          setShowStudentModal(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSave={handleSaveStudent}
        mode={studentModalMode}
      />

      <CourseModal
        showModal={showCourseModal}
        onClose={() => {
          setShowCourseModal(false);
          setSelectedCourse(null);
        }}
        course={selectedCourse}
        onSave={handleSaveCourse}
        mode={courseModalMode}
        teachers={teacherList}
        students={students.filter(s => s.role === 'student')}
        assignments={allAssignments}
      />

      <TeacherModal
        showModal={showTeacherModal}
        onClose={() => {
          setShowTeacherModal(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
        onSave={handleSaveTeacher}
        mode={teacherModalMode}
      />

      <AssignmentModal
        showModal={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        onSave={handleSaveAssignment}
        mode={assignmentModalMode}
      />

      <CourseAssignmentModal
        showModal={showCourseAssignmentModal}
        onClose={() => {
          setShowCourseAssignmentModal(false);
          setSelectedCourseForAssignment(null);
        }}
        course={selectedCourseForAssignment}
        allAssignments={allAssignments}
        onAddAssignment={handleAddAssignmentToCourse}
        onRemoveAssignment={handleRemoveAssignmentFromCourse}
        onCreateAssignment={(newAssignment) => {
          // 새로 생성된 과제를 allAssignments에 추가
          setAllAssignments(prev => [newAssignment, ...prev]);
          // 과제 목록 새로고침
          fetchAssignments();
          fetchAllAssignments(); // allAssignments도 새로고침
        }}
      />

      <TestResultModal
        showModal={showTestResultModal}
        onClose={() => {
          setShowTestResultModal(false);
          setSelectedCourseForTest(null);
        }}
        course={selectedCourseForTest}
        allAssignments={allAssignments}
      />

      <CourseReportModal
        showModal={showCourseReportModal}
        onClose={() => {
          setShowCourseReportModal(false);
          setSelectedCourseForReport(null);
        }}
        course={selectedCourseForReport}
      />

      <MyInfoModal
        showModal={showMyInfoModal}
        onClose={() => setShowMyInfoModal(false)}
        user={user}
        onUpdateUser={async (formData) => {
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

export default AdminDashboardPage;

