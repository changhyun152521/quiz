import { useState, useEffect, useRef } from 'react';
import './CourseModal.css';

function CourseModal({ showModal, onClose, course, onSave, mode, teachers = [], students = [], assignments = [] }) {
  const [formData, setFormData] = useState({
    courseName: '',
    teacher: '',
    students: [],
    assignments: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [currentStudentPage, setCurrentStudentPage] = useState(1);
  const [currentAssignmentPage, setCurrentAssignmentPage] = useState(1);
  const [selectedStudentSearchTerm, setSelectedStudentSearchTerm] = useState('');
  const [selectedAssignmentSearchTerm, setSelectedAssignmentSearchTerm] = useState('');
  const [currentSelectedStudentPage, setCurrentSelectedStudentPage] = useState(1);
  const [currentSelectedAssignmentPage, setCurrentSelectedAssignmentPage] = useState(1);
  const itemsPerPage = 5;
  const studentSelectRef = useRef(null);
  const [showStudentSelect, setShowStudentSelect] = useState(false);
  const assignmentSelectRef = useRef(null);
  const [showAssignmentSelect, setShowAssignmentSelect] = useState(false);

  useEffect(() => {
    if (showModal) {
      if (mode === 'edit' && course) {
        setFormData({
          courseName: course.courseName || '',
          teacher: course.teacher?._id || course.teacher || '',
          students: course.students?.map(s => s._id || s) || [],
          assignments: course.assignments?.map(a => a._id || a) || []
        });
      } else {
        setFormData({
          courseName: '',
          teacher: '',
          students: [],
          assignments: []
        });
      }
      setErrors({});
      setStudentSearchTerm('');
      setAssignmentSearchTerm('');
      setCurrentStudentPage(1);
      setCurrentAssignmentPage(1);
      setSelectedStudentSearchTerm('');
      setSelectedAssignmentSearchTerm('');
      setCurrentSelectedStudentPage(1);
      setCurrentSelectedAssignmentPage(1);
      setShowStudentSelect(false);
      setShowAssignmentSelect(false);
    }
  }, [showModal, course, mode]);

  // 날짜 포맷 함수
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  // 학생 검색 필터링 (이미 선택된 학생 제외)
  const filteredStudents = students
    .filter(student => !formData.students.includes(student._id)) // 이미 선택된 학생 제외
    .filter(student => {
      if (!studentSearchTerm) return true;
      const term = studentSearchTerm.toLowerCase();
      return (
        student.name?.toLowerCase().includes(term) ||
        student.userId?.toLowerCase().includes(term) ||
        student.schoolName?.toLowerCase().includes(term) ||
        student.studentPhone?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term)
      );
    });

  // 과제 검색 필터링 (이미 선택된 과제 제외)
  const filteredAssignments = assignments
    .filter(assignment => !formData.assignments.includes(assignment._id)) // 이미 선택된 과제 제외
    .filter(assignment => {
      if (!assignmentSearchTerm) return true;
      const term = assignmentSearchTerm.toLowerCase();
      return (
        assignment.assignmentName?.toLowerCase().includes(term) ||
        assignment.subject?.toLowerCase().includes(term) ||
        assignment.assignmentType?.toLowerCase().includes(term) ||
        formatDate(assignment.createdAt)?.toLowerCase().includes(term) ||
        formatDate(assignment.startDate)?.toLowerCase().includes(term) ||
        formatDate(assignment.dueDate)?.toLowerCase().includes(term)
      );
    });

  // 학생 페이지네이션
  const totalStudentPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startStudentIndex = (currentStudentPage - 1) * itemsPerPage;
  const endStudentIndex = startStudentIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startStudentIndex, endStudentIndex);

  // 과제 페이지네이션
  const totalAssignmentPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startAssignmentIndex = (currentAssignmentPage - 1) * itemsPerPage;
  const endAssignmentIndex = startAssignmentIndex + itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startAssignmentIndex, endAssignmentIndex);

  // 검색어 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentStudentPage(1);
  }, [studentSearchTerm]);

  useEffect(() => {
    setCurrentAssignmentPage(1);
  }, [assignmentSearchTerm]);

  // 선택된 학생 검색 필터링
  const filteredSelectedStudents = formData.students
    .map(studentId => students.find(s => s._id === studentId))
    .filter(student => {
      if (!student) return false;
      if (!selectedStudentSearchTerm) return true;
      const term = selectedStudentSearchTerm.toLowerCase();
      return (
        student.name?.toLowerCase().includes(term) ||
        student.userId?.toLowerCase().includes(term) ||
        student.schoolName?.toLowerCase().includes(term) ||
        student.studentPhone?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term)
      );
    });

  // 선택된 학생 페이지네이션
  const totalSelectedStudentPages = Math.ceil(filteredSelectedStudents.length / itemsPerPage);
  const startSelectedStudentIndex = (currentSelectedStudentPage - 1) * itemsPerPage;
  const endSelectedStudentIndex = startSelectedStudentIndex + itemsPerPage;
  const paginatedSelectedStudents = filteredSelectedStudents.slice(startSelectedStudentIndex, endSelectedStudentIndex);

  // 선택된 과제 검색 필터링 및 최신순 정렬
  const filteredSelectedAssignments = formData.assignments
    .map(assignmentId => assignments.find(a => a._id === assignmentId))
    .filter(assignment => {
      if (!assignment) return false;
      if (!selectedAssignmentSearchTerm) return true;
      const term = selectedAssignmentSearchTerm.toLowerCase();
      return (
        assignment.assignmentName?.toLowerCase().includes(term) ||
        assignment.subject?.toLowerCase().includes(term) ||
        assignment.assignmentType?.toLowerCase().includes(term) ||
        formatDate(assignment.createdAt)?.toLowerCase().includes(term) ||
        formatDate(assignment.startDate)?.toLowerCase().includes(term) ||
        formatDate(assignment.dueDate)?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      // 최신순 정렬 (createdAt 기준)
      const dateA = new Date(a.createdAt || a.startDate || 0);
      const dateB = new Date(b.createdAt || b.startDate || 0);
      return dateB - dateA;
    });

  // 선택된 과제 페이지네이션
  const totalSelectedAssignmentPages = Math.ceil(filteredSelectedAssignments.length / itemsPerPage);
  const startSelectedAssignmentIndex = (currentSelectedAssignmentPage - 1) * itemsPerPage;
  const endSelectedAssignmentIndex = startSelectedAssignmentIndex + itemsPerPage;
  const paginatedSelectedAssignments = filteredSelectedAssignments.slice(startSelectedAssignmentIndex, endSelectedAssignmentIndex);

  // 선택된 학생 검색어 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentSelectedStudentPage(1);
  }, [selectedStudentSearchTerm]);

  // 선택된 과제 검색어 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentSelectedAssignmentPage(1);
  }, [selectedAssignmentSearchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMultiSelect = (name, value) => {
    setFormData(prev => {
      const currentValues = prev[name] || [];
      const isSelected = currentValues.includes(value);
      
      return {
        ...prev,
        [name]: isSelected
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value]
      };
    });
  };

  // 전체 선택/해제 함수
  const handleSelectAll = (name, items) => {
    setFormData(prev => {
      const currentValues = prev[name] || [];
      const availableItems = items.map(item => item._id).filter(id => id);
      
      // 현재 페이지의 모든 항목이 선택되어 있는지 확인
      const allSelected = availableItems.every(id => currentValues.includes(id));
      
      if (allSelected) {
        // 모두 선택되어 있으면 현재 페이지 항목만 해제
        return {
          ...prev,
          [name]: currentValues.filter(id => !availableItems.includes(id))
        };
      } else {
        // 일부만 선택되어 있으면 현재 페이지 항목 모두 선택
        const newValues = [...currentValues];
        availableItems.forEach(id => {
          if (!newValues.includes(id)) {
            newValues.push(id);
          }
        });
        return {
          ...prev,
          [name]: newValues
        };
      }
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.courseName) {
      newErrors.courseName = '강좌 이름을 입력해주세요';
    } else if (formData.courseName.length > 100) {
      newErrors.courseName = '강좌 이름은 최대 100자까지 가능합니다';
    }

    if (!formData.teacher) {
      newErrors.teacher = '강사를 선택해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(formData, mode === 'edit' ? course._id : null);
      // 성공적으로 완료된 경우에만 모달 닫기
      setIsSubmitting(false);
      onClose();
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
    <div className="course-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isSubmitting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="course-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="course-modal-header">
          <h2 className="course-modal-title">
            {mode === 'edit' ? '강좌 정보 수정' : '강좌 추가'}
          </h2>
          <button className="course-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="course-modal-form">
          <div className="form-group">
            <label>강좌 이름 *</label>
            <input
              type="text"
              name="courseName"
              value={formData.courseName}
              onChange={handleChange}
              placeholder="강좌 이름"
              className={errors.courseName ? 'error' : ''}
            />
            {errors.courseName && <span className="error-message">{errors.courseName}</span>}
          </div>

          <div className="form-group">
            <label>강사 *</label>
            <select
              name="teacher"
              value={formData.teacher}
              onChange={handleChange}
              className={errors.teacher ? 'error' : ''}
            >
              <option value="">강사를 선택하세요</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.userId})
                </option>
              ))}
            </select>
            {errors.teacher && <span className="error-message">{errors.teacher}</span>}
          </div>

          <div className="form-group">
            <label>학생 선택</label>
            <div className="multi-select-container">
              {students.length === 0 ? (
                <p className="empty-message">등록된 학생이 없습니다.</p>
              ) : (
                <>
                  {/* 선택된 학생 목록 */}
                  <div className="selected-students-section">
                    <div className="selected-students-header">
                      <h4 className="selected-section-title">
                        선택된 학생 ({formData.students.length}명)
                      </h4>
                      <button
                        type="button"
                        className="add-student-btn"
                        onClick={() => {
                          setShowStudentSelect(!showStudentSelect);
                          if (!showStudentSelect && studentSelectRef.current) {
                            setTimeout(() => {
                              studentSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              setTimeout(() => {
                                const searchInput = studentSelectRef.current?.querySelector('.search-input');
                                if (searchInput) {
                                  searchInput.focus();
                                }
                              }, 300);
                            }, 100);
                          }
                        }}
                      >
                        {showStudentSelect ? '− 학생 선택 닫기' : '+ 학생 추가'}
                      </button>
                    </div>
                    {formData.students.length > 0 ? (
                      <>
                        <div className="selected-search-container">
                          <input
                            type="text"
                            className="selected-search-input"
                            placeholder="선택된 학생 검색..."
                            value={selectedStudentSearchTerm}
                            onChange={(e) => setSelectedStudentSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="selected-students-list">
                          {paginatedSelectedStudents.length > 0 ? (
                            paginatedSelectedStudents.map((student) => {
                              if (!student) return null;
                              return (
                                <div key={student._id} className="selected-student-item">
                                  <div className="selected-student-info">
                                    <div className="selected-student-main">
                                      <span className="selected-student-name">{student.name}</span>
                                      <span className="selected-student-id">({student.userId})</span>
                                    </div>
                                    <div className="selected-student-details">
                                      {student.schoolName && (
                                        <span className="selected-student-school">학교: {student.schoolName}</span>
                                      )}
                                      {student.studentPhone && (
                                        <span className="selected-student-phone">연락처: {student.studentPhone}</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="remove-student-btn"
                                    onClick={() => handleMultiSelect('students', student._id)}
                                    title="선택 해제"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="empty-message">검색 결과가 없습니다.</p>
                          )}
                        </div>
                        {totalSelectedStudentPages > 1 && (
                          <div className="pagination">
                            <button
                              type="button"
                              className="pagination-btn"
                              onClick={() => setCurrentSelectedStudentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentSelectedStudentPage === 1}
                            >
                              이전
                            </button>
                            <div className="pagination-pages">
                              {Array.from({ length: totalSelectedStudentPages }, (_, i) => i + 1).map(page => (
                                <button
                                  type="button"
                                  key={page}
                                  className={`pagination-page-btn ${currentSelectedStudentPage === page ? 'active' : ''}`}
                                  onClick={() => setCurrentSelectedStudentPage(page)}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="pagination-btn"
                              onClick={() => setCurrentSelectedStudentPage(prev => Math.min(totalSelectedStudentPages, prev + 1))}
                              disabled={currentSelectedStudentPage === totalSelectedStudentPages}
                            >
                              다음
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="no-selected-message">선택된 학생이 없습니다. 학생 추가 버튼을 클릭하여 학생을 선택해주세요.</p>
                    )}
                  </div>
                  {showStudentSelect && (
                    <div className="student-select-section" ref={studentSelectRef}>
                      <div className="search-container">
                        <input
                          type="text"
                          className="search-input"
                          placeholder="이름, 아이디, 학교, 연락처로 검색..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                        />
                      </div>
                      {paginatedStudents.length > 0 && (
                        <div className="select-all-container" style={{ padding: '8px 12px', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f5f5f5' }}>
                          <input
                            type="checkbox"
                            checked={paginatedStudents.length > 0 && paginatedStudents.every(student => formData.students.includes(student._id))}
                            onChange={() => handleSelectAll('students', paginatedStudents)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                          <label style={{ cursor: 'pointer', fontWeight: '500', userSelect: 'none', fontSize: '14px' }}>
                            현재 페이지 전체 선택 ({paginatedStudents.length}명)
                          </label>
                        </div>
                      )}
                <div className="checkbox-list">
                        {paginatedStudents.length > 0 ? (
                          paginatedStudents.map((student) => (
                            <label key={student._id} className="checkbox-item student-item">
                      <input
                        type="checkbox"
                        checked={formData.students.includes(student._id)}
                        onChange={() => handleMultiSelect('students', student._id)}
                      />
                              <div className="student-info">
                                <div className="student-main-info">
                                  <span className="student-name">{student.name}</span>
                                  <span className="student-id">({student.userId})</span>
                                </div>
                                <div className="student-details">
                                  {student.schoolName && (
                                    <span className="student-school">학교: {student.schoolName}</span>
                                  )}
                                  {student.studentPhone && (
                                    <span className="student-phone">연락처: {student.studentPhone}</span>
                                  )}
                                </div>
                              </div>
                    </label>
                          ))
                        ) : (
                          <p className="empty-message">검색 결과가 없습니다.</p>
                        )}
                      </div>
                      {totalStudentPages > 1 && (
                        <div className="pagination">
                          <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => setCurrentStudentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentStudentPage === 1}
                          >
                            이전
                          </button>
                          <div className="pagination-pages">
                            {Array.from({ length: totalStudentPages }, (_, i) => i + 1).map(page => (
                              <button
                                type="button"
                                key={page}
                                className={`pagination-page-btn ${currentStudentPage === page ? 'active' : ''}`}
                                onClick={() => setCurrentStudentPage(page)}
                              >
                                {page}
                              </button>
                  ))}
                </div>
                          <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => setCurrentStudentPage(prev => Math.min(totalStudentPages, prev + 1))}
                            disabled={currentStudentPage === totalStudentPages}
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>과제 선택</label>
            <div className="multi-select-container">
              {assignments.length === 0 ? (
                <p className="empty-message">등록된 과제가 없습니다.</p>
              ) : (
                <>
                  {/* 선택된 과제 목록 */}
                  <div className="selected-assignments-section">
                    <div className="selected-assignments-header">
                      <h4 className="selected-section-title">
                        선택된 과제 ({formData.assignments.length}개)
                      </h4>
                      <button
                        type="button"
                        className="add-assignment-btn"
                        onClick={() => {
                          setShowAssignmentSelect(!showAssignmentSelect);
                          if (!showAssignmentSelect && assignmentSelectRef.current) {
                            setTimeout(() => {
                              assignmentSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              setTimeout(() => {
                                const searchInput = assignmentSelectRef.current?.querySelector('.search-input');
                                if (searchInput) {
                                  searchInput.focus();
                                }
                              }, 300);
                            }, 100);
                          }
                        }}
                      >
                        {showAssignmentSelect ? '− 과제 선택 닫기' : '+ 과제 추가'}
                      </button>
                    </div>
                    {formData.assignments.length > 0 ? (
                      <>
                        <div className="selected-search-container">
                          <input
                            type="text"
                            className="selected-search-input"
                            placeholder="선택된 과제 검색..."
                            value={selectedAssignmentSearchTerm}
                            onChange={(e) => setSelectedAssignmentSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="selected-assignments-list">
                          {paginatedSelectedAssignments.length > 0 ? (
                            paginatedSelectedAssignments.map((assignment) => {
                              if (!assignment) return null;
                              return (
                                <div key={assignment._id} className="selected-assignment-item">
                                  <div className="selected-assignment-info">
                                    <span className="selected-assignment-name">{assignment.assignmentName}</span>
                                    {assignment.subject && (
                                      <span className="selected-assignment-subject">({assignment.subject})</span>
                                    )}
                                    {assignment.assignmentType && (
                                      <span className="selected-assignment-type">{assignment.assignmentType === '실전TEST' ? '클리닉' : assignment.assignmentType}</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="remove-assignment-btn"
                                    onClick={() => handleMultiSelect('assignments', assignment._id)}
                                    title="선택 해제"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="empty-message">검색 결과가 없습니다.</p>
                          )}
                        </div>
                        {totalSelectedAssignmentPages > 1 && (
                          <div className="pagination">
                            <button
                              type="button"
                              className="pagination-btn"
                              onClick={() => setCurrentSelectedAssignmentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentSelectedAssignmentPage === 1}
                            >
                              이전
                            </button>
                            <div className="pagination-pages">
                              {Array.from({ length: totalSelectedAssignmentPages }, (_, i) => i + 1).map(page => (
                                <button
                                  type="button"
                                  key={page}
                                  className={`pagination-page-btn ${currentSelectedAssignmentPage === page ? 'active' : ''}`}
                                  onClick={() => setCurrentSelectedAssignmentPage(page)}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="pagination-btn"
                              onClick={() => setCurrentSelectedAssignmentPage(prev => Math.min(totalSelectedAssignmentPages, prev + 1))}
                              disabled={currentSelectedAssignmentPage === totalSelectedAssignmentPages}
                            >
                              다음
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="no-selected-message">선택된 과제가 없습니다. 과제 추가 버튼을 클릭하여 과제를 선택해주세요.</p>
                    )}
                  </div>
                  {showAssignmentSelect && (
                    <div className="assignment-select-section" ref={assignmentSelectRef}>
                      <div className="search-container">
                        <input
                          type="text"
                          className="search-input"
                          placeholder="과제명, 과목, 타입, 날짜로 검색..."
                          value={assignmentSearchTerm}
                          onChange={(e) => setAssignmentSearchTerm(e.target.value)}
                        />
                      </div>
                      {paginatedAssignments.length > 0 && (
                        <div className="select-all-container" style={{ padding: '8px 12px', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={paginatedAssignments.every(assignment => formData.assignments.includes(assignment._id))}
                            onChange={() => handleSelectAll('assignments', paginatedAssignments)}
                            style={{ cursor: 'pointer' }}
                          />
                          <label style={{ cursor: 'pointer', fontWeight: '500', userSelect: 'none' }}>
                            현재 페이지 전체 선택 ({paginatedAssignments.length}개)
                          </label>
                        </div>
                      )}
                <div className="checkbox-list">
                        {paginatedAssignments.length > 0 ? (
                          paginatedAssignments.map((assignment) => (
                            <label key={assignment._id} className="checkbox-item assignment-item">
                      <input
                        type="checkbox"
                        checked={formData.assignments.includes(assignment._id)}
                        onChange={() => handleMultiSelect('assignments', assignment._id)}
                      />
                              <div className="assignment-info">
                                <div className="assignment-main-info">
                                  <span className="assignment-name">{assignment.assignmentName}</span>
                                  {assignment.subject && (
                                    <span className="assignment-subject">({assignment.subject})</span>
                                  )}
                                  {assignment.assignmentType && (
                                    <span className="assignment-type-badge">{assignment.assignmentType === '실전TEST' ? '클리닉' : assignment.assignmentType}</span>
                                  )}
                                </div>
                                <div className="assignment-details">
                                  {assignment.questionCount && (
                                    <span className="assignment-detail-item">문항: {assignment.questionCount}개</span>
                                  )}
                                  <div className="assignment-dates">
                                    <span className="assignment-date-item">
                                      등록일: {formatDate(assignment.createdAt)}
                                    </span>
                                    <span className="assignment-date-item">
                                      시작일: {formatDate(assignment.startDate)}
                                    </span>
                                    <span className="assignment-date-item">
                                      마감일: {formatDate(assignment.dueDate)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                    </label>
                          ))
                        ) : (
                          <p className="empty-message">검색 결과가 없습니다.</p>
                        )}
                      </div>
                      {totalAssignmentPages > 1 && (
                        <div className="pagination">
                          <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => setCurrentAssignmentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentAssignmentPage === 1}
                          >
                            이전
                          </button>
                          <div className="pagination-pages">
                            {Array.from({ length: totalAssignmentPages }, (_, i) => i + 1).map(page => (
                              <button
                                type="button"
                                key={page}
                                className={`pagination-page-btn ${currentAssignmentPage === page ? 'active' : ''}`}
                                onClick={() => setCurrentAssignmentPage(page)}
                              >
                                {page}
                              </button>
                  ))}
                </div>
                          <button
                            type="button"
                            className="pagination-btn"
                            onClick={() => setCurrentAssignmentPage(prev => Math.min(totalAssignmentPages, prev + 1))}
                            disabled={currentAssignmentPage === totalAssignmentPages}
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="course-modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : mode === 'edit' ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CourseModal;

