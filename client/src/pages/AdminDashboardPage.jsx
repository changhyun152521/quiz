import { useState, useEffect } from 'react';
import { get, post, put, del, patch } from '../utils/api';
import StudentModal from '../components/StudentModal';
import TeacherModal from '../components/TeacherModal';
import CourseModal from '../components/CourseModal';
import AssignmentModal from '../components/AssignmentModal';
import CourseAssignmentModal from '../components/CourseAssignmentModal';
import AnswerModal from '../components/AnswerModal';
import TestResultModal from '../components/TestResultModal';
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

  // 강사 관리 상태
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherModalMode, setTeacherModalMode] = useState('create');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

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

  // 과제 관리 상태
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentModalMode, setAssignmentModalMode] = useState('create');
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [allAssignments, setAllAssignments] = useState([]); // 강좌에 추가할 수 있는 모든 과제 목록
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedAssignmentForAnswer, setSelectedAssignmentForAnswer] = useState(null);
  const [showMyInfoModal, setShowMyInfoModal] = useState(false);

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

  useEffect(() => {
    if (activeSection === 'students') {
      fetchStudents();
    } else if (activeSection === 'teachers') {
      fetchTeachers();
    } else if (activeSection === 'courses') {
      fetchCourses();
      fetchTeacherList();
      fetchAllAssignments(); // 강좌에 추가할 수 있는 모든 과제 목록 가져오기
    } else if (activeSection === 'assignments') {
      fetchAssignments();
    }
  }, [activeSection]);

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
      if (response.ok) {
        alert(studentId ? '학생 정보가 수정되었습니다.' : '학생이 추가되었습니다.');
        fetchStudents();
      } else {
        alert(data.message || '저장에 실패했습니다.');
        throw new Error(data.message);
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
      if (response.ok) {
        alert(courseId ? '강좌 정보가 수정되었습니다.' : '강좌가 추가되었습니다.');
        fetchCourses();
      } else {
        alert(data.message || '저장에 실패했습니다.');
        throw new Error(data.message);
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
        fetchCourses();
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

  // 정답 입력 모달 열기
  const handleOpenAnswerModal = async (assignment) => {
    // 과제 정보를 그대로 사용 (answers 필드가 이미 포함되어 있음)
    setSelectedAssignmentForAnswer(assignment);
    setShowAnswerModal(true);
  };

  // 정답 저장 (과제에 직접 저장)
  const handleSaveAnswers = async (answers, assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      
      // answers 배열을 score 필드로 변환 (AnswerModal에서 score를 사용하므로)
      const formattedAnswers = answers.map(ans => ({
        questionNumber: ans.questionNumber,
        answer: ans.answer,
        score: ans.score || 1
      }));

      // Assignment 업데이트 API 호출
      const response = await put(`/api/assignments/${assignmentId}`, {
        answers: formattedAnswers
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('정답이 저장되었습니다.');
        // 과제 목록 새로고침
        fetchAssignments();
        setShowAnswerModal(false);
        setSelectedAssignmentForAnswer(null);
      } else {
        alert(data.message || '정답 저장에 실패했습니다.');
        throw new Error(data.message || '정답 저장 실패');
      }
    } catch (error) {
      console.error('정답 저장 오류:', error);
      alert('정답 저장 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
      throw error;
    }
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
      if (response.ok) {
        alert(teacherId ? '강사 정보가 수정되었습니다.' : '강사가 추가되었습니다.');
        fetchTeachers();
        fetchTeacherList(); // 강좌용 강사 목록도 업데이트
      } else {
        alert(data.message || '저장에 실패했습니다.');
        throw new Error(data.message);
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
                          {filteredStudents.map((student) => (
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
                          {filteredTeachers.map((teacher) => (
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
                          {filteredCourses.map((course) => (
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
                                    onClick={() => {
                                      setSelectedCourseForAssignment(course);
                                      setShowCourseAssignmentModal(true);
                                    }}
                                    title="과제 관리"
                                  >
                                    과제
                                  </button>
                                  <button
                                    className="action-btn test-result-btn"
                                    onClick={() => {
                                      setSelectedCourseForTest(course);
                                      setShowTestResultModal(true);
                                    }}
                                    title="테스트 조회"
                                  >
                                    테스트 조회
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
                          {filteredAssignments.map((assignment) => (
                            <tr key={assignment._id}>
                              <td>{assignment.assignmentName}</td>
                              <td>{assignment.subject}</td>
                              <td>{assignment.questionCount}개</td>
                              <td>{assignment.assignmentType}</td>
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
                                    className="action-btn answer-btn"
                                    onClick={() => handleOpenAnswerModal(assignment)}
                                    title="정답 입력"
                                  >
                                    정답
                                  </button>
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
      />

      <TestResultModal
        showModal={showTestResultModal}
        onClose={() => {
          setShowTestResultModal(false);
          setSelectedCourseForTest(null);
        }}
        course={selectedCourseForTest}
      />

      <TestResultModal
        showModal={showTestResultModal}
        onClose={() => {
          setShowTestResultModal(false);
          setSelectedCourseForTest(null);
        }}
        course={selectedCourseForTest}
      />

      <AnswerModal
        showModal={showAnswerModal}
        onClose={() => {
          setShowAnswerModal(false);
          setSelectedAssignmentForAnswer(null);
        }}
        assignment={selectedAssignmentForAnswer}
        onSave={handleSaveAnswers}
        mode="edit"
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

