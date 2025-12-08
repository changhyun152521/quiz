import { useState, useEffect } from 'react';
import { post } from '../utils/api';
import './CourseAssignmentModal.css';

function CourseAssignmentModal({ showModal, onClose, course, allAssignments, onAddAssignment, onRemoveAssignment, onCreateAssignment }) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    assignmentName: '',
    subject: '',
    questionCount: '',
    assignmentType: 'QUIZ',
    startDate: '',
    dueDate: '',
    answers: [] // 정답 배열 추가
  });
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPageForSelection, setCurrentPageForSelection] = useState(1);
  const itemsPerPageForSelection = 5;
  const [createFormErrors, setCreateFormErrors] = useState({});

  // 이미 강좌에 등록된 과제 ID 목록
  const registeredAssignmentIds = course?.assignments?.map(a => a._id || a) || [];

  // 등록 가능한 과제 목록 (아직 등록되지 않은 과제들)
  const availableAssignments = allAssignments.filter(
    assignment => !registeredAssignmentIds.includes(assignment._id)
  );

  // 검색어로 필터링된 과제 목록
  const filteredAvailableAssignments = availableAssignments.filter(assignment => {
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

  // 정렬된 과제 목록
  const sortedAvailableAssignments = filteredAvailableAssignments.sort((a, b) => {
    // 최신순으로 정렬 (등록일 우선, 없으면 시작일)
    const dateA = new Date(a.createdAt || a.startDate || 0);
    const dateB = new Date(b.createdAt || b.startDate || 0);
    return dateB - dateA;
  });

  // 페이지네이션 계산
  const totalPagesForSelection = Math.ceil(sortedAvailableAssignments.length / itemsPerPageForSelection);
  const startIndexForSelection = (currentPageForSelection - 1) * itemsPerPageForSelection;
  const endIndexForSelection = startIndexForSelection + itemsPerPageForSelection;
  const paginatedAvailableAssignments = sortedAvailableAssignments.slice(startIndexForSelection, endIndexForSelection);

  // 등록된 과제를 최신순으로 정렬
  // allAssignments에서 실제 과제 정보를 찾아서 정렬
  const sortedRegisteredAssignments = course?.assignments ? [...course.assignments]
    .map(assignment => {
      // assignment가 ID만 있는 경우 allAssignments에서 찾기
      const assignmentId = assignment._id || assignment;
      const fullAssignment = allAssignments.find(a => a._id === assignmentId) || assignment;
      return fullAssignment;
    })
    .sort((a, b) => {
      // createdAt 우선, 없으면 startDate 사용
      const dateA = new Date(a.createdAt || a.startDate || 0);
      const dateB = new Date(b.createdAt || b.startDate || 0);
      return dateB - dateA; // 최신 것이 먼저
    }) : [];

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedRegisteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssignments = sortedRegisteredAssignments.slice(startIndex, endIndex);

  useEffect(() => {
    if (showModal) {
      setSelectedAssignmentId('');
      setCurrentPage(1); // 모달 열 때 첫 페이지로
      setCurrentPageForSelection(1); // 과제 선택 첫 페이지로
      setShowCreateForm(false);
      setSearchTerm(''); // 검색어 초기화
      setCreateFormData({
        assignmentName: '',
        subject: '',
        questionCount: '',
        assignmentType: 'QUIZ',
        startDate: '',
        dueDate: '',
        answers: []
      });
      setCreateFormErrors({});
    }
  }, [showModal, course]); // course가 변경될 때도 첫 페이지로

  // 검색어 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPageForSelection(1);
  }, [searchTerm]);

  // questionCount가 변경될 때 answers 배열 동적 생성
  useEffect(() => {
    if (createFormData.questionCount && parseInt(createFormData.questionCount) > 0) {
      const questionCount = parseInt(createFormData.questionCount);
      const currentAnswers = createFormData.answers || [];
      
      // 기존 정답이 있으면 유지, 없으면 새로 생성
      const newAnswers = [];
      for (let i = 1; i <= questionCount; i++) {
        const existing = currentAnswers.find(ans => ans.questionNumber === i);
        newAnswers.push({
          questionNumber: i,
          answer: existing?.answer || '',
          score: existing?.score || 1
        });
      }
      
      // questionCount가 줄어든 경우에만 answers 업데이트
      if (newAnswers.length !== currentAnswers.length) {
        setCreateFormData(prev => ({
          ...prev,
          answers: newAnswers
        }));
      }
    } else {
      // questionCount가 0이거나 비어있으면 answers 초기화
      setCreateFormData(prev => ({
        ...prev,
        answers: []
      }));
    }
  }, [createFormData.questionCount]);

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAdd = () => {
    if (!selectedAssignmentId) {
      alert('과제를 선택해주세요.');
      return;
    }

    onAddAssignment(course._id, selectedAssignmentId);
    setSelectedAssignmentId('');
  };

  // 정답 입력 핸들러
  const handleAnswerChange = (index, field, value) => {
    setCreateFormData(prev => {
      const newAnswers = [...(prev.answers || [])];
      if (newAnswers[index]) {
        newAnswers[index] = {
          ...newAnswers[index],
          [field]: field === 'score' ? (parseFloat(value) || 0) : value
        };
      }
      return {
        ...prev,
        answers: newAnswers
      };
    });

    // 에러 제거
    if (createFormErrors[`answer_${index + 1}`]) {
      setCreateFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`answer_${index + 1}`];
        return newErrors;
      });
    }
  };

  const handleCreateAssignment = async () => {
    // 기본 필드 검증
    if (!createFormData.assignmentName || !createFormData.subject || !createFormData.questionCount || !createFormData.startDate || !createFormData.dueDate) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    // 정답 필수 검증
    const newErrors = {};
    const answers = createFormData.answers || [];
    if (answers.length === 0) {
      newErrors.answers = '문항 수를 입력하면 정답을 입력할 수 있습니다';
    } else {
      answers.forEach((ans, index) => {
        if (!ans.answer || ans.answer.trim() === '') {
          newErrors[`answer_${index + 1}`] = `${index + 1}번 문항의 정답을 입력해주세요`;
        } else if (ans.answer.length > 50) {
          newErrors[`answer_${index + 1}`] = '정답은 최대 50자까지 가능합니다';
        }
        if (ans.score < 0) {
          newErrors[`score_${index + 1}`] = '배점은 0 이상이어야 합니다';
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setCreateFormErrors(newErrors);
      alert('정답을 모두 입력해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await post('/api/assignments', createFormData);
      const data = await response.json();

      if (response.ok && data.success) {
        const newAssignment = data.data;
        // 생성된 과제를 강좌에 추가
        await onAddAssignment(course._id, newAssignment._id);
        // onCreateAssignment 콜백 호출 (과제 관리 리스트 업데이트용)
        if (onCreateAssignment) {
          onCreateAssignment(newAssignment);
        }
        // 폼 초기화
        setCreateFormData({
          assignmentName: '',
          subject: '',
          questionCount: '',
          assignmentType: 'QUIZ',
          startDate: '',
          dueDate: '',
          answers: []
        });
        setCreateFormErrors({});
        setShowCreateForm(false);
        alert('과제가 생성되고 강좌에 추가되었습니다.');
      } else {
        alert(data.message || '과제 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('과제 생성 오류:', error);
      alert('과제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="course-assignment-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isCreating && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="course-assignment-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="course-assignment-modal-header">
          <h2 className="course-assignment-modal-title">
            {course?.courseName} - 과제 관리
          </h2>
          <button className="course-assignment-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="course-assignment-modal-body">
          {/* 등록된 과제 목록 */}
          <div className="assignment-section">
            <h3 className="section-title">등록된 과제</h3>
            {sortedRegisteredAssignments.length > 0 ? (
              <>
              <div className="assignment-list">
                  {paginatedAssignments.map((assignment) => (
                  <div key={assignment._id || assignment} className="assignment-item">
                    <div className="assignment-info">
                        <div className="assignment-main-info">
                      <span className="assignment-name">
                        {assignment.assignmentName || assignment}
                      </span>
                      {assignment.subject && (
                        <span className="assignment-subject">({assignment.subject})</span>
                      )}
                      {assignment.assignmentType && (
                        <span className="assignment-type">{assignment.assignmentType === '실전TEST' ? '클리닉' : assignment.assignmentType}</span>
                      )}
                        </div>
                        <div className="assignment-dates">
                          <span className="assignment-date-item">
                            <span className="date-label">등록일:</span>
                            <span className="date-value">{formatDate(assignment.createdAt)}</span>
                          </span>
                          <span className="assignment-date-item">
                            <span className="date-label">시작일:</span>
                            <span className="date-value">{formatDate(assignment.startDate)}</span>
                          </span>
                          <span className="assignment-date-item">
                            <span className="date-label">마감일:</span>
                            <span className="date-value">{formatDate(assignment.dueDate)}</span>
                          </span>
                        </div>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => onRemoveAssignment(
                        course._id,
                        assignment._id || assignment,
                        assignment.assignmentName || '과제'
                      )}
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
                
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="course-assignment-pagination">
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
            ) : (
              <p className="empty-message">등록된 과제가 없습니다.</p>
            )}
          </div>

          {/* 과제 추가 */}
          <div className="assignment-section">
            <div className="section-header">
            <h3 className="section-title">과제 추가</h3>
              <button
                className="create-assignment-btn"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? '취소' : '+ 새 과제 생성'}
              </button>
            </div>

            {/* 과제 생성 폼 */}
            {showCreateForm && (
              <div className="create-assignment-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>과제명 *</label>
                    <input
                      type="text"
                      value={createFormData.assignmentName}
                      onChange={(e) => setCreateFormData({ ...createFormData, assignmentName: e.target.value })}
                      placeholder="과제명을 입력하세요"
                    />
                  </div>
                  <div className="form-group">
                    <label>과목 *</label>
                    <input
                      type="text"
                      value={createFormData.subject}
                      onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
                      placeholder="과목을 입력하세요"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>문항 수 *</label>
                    <input
                      type="number"
                      value={createFormData.questionCount}
                      onChange={(e) => setCreateFormData({ ...createFormData, questionCount: e.target.value })}
                      placeholder="문항 수"
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>과제 타입 *</label>
                    <select
                      value={createFormData.assignmentType}
                      onChange={(e) => setCreateFormData({ ...createFormData, assignmentType: e.target.value })}
                    >
                      <option value="QUIZ">QUIZ</option>
                      <option value="클리닉">클리닉</option>
                      <option value="HOMEWORK">HOMEWORK</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>시작일 *</label>
                    <input
                      type="date"
                      value={createFormData.startDate}
                      onChange={(e) => setCreateFormData({ ...createFormData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>마감일 *</label>
                    <input
                      type="date"
                      value={createFormData.dueDate}
                      onChange={(e) => setCreateFormData({ ...createFormData, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* 정답 입력 섹션 */}
                {createFormData.questionCount && parseInt(createFormData.questionCount) > 0 && (
                  <div className="form-group answers-section">
                    <label className="answers-section-label">정답 입력 <span className="required-mark">*</span></label>
                    {createFormErrors.answers && (
                      <span className="error-message" style={{ display: 'block', marginBottom: '12px' }}>{createFormErrors.answers}</span>
                    )}
                    <div className="answers-list">
                      {(createFormData.answers || []).map((ans, index) => (
                        <div key={index} className="answer-item">
                          <div className="question-header">
                            <span className="question-number">{index + 1}번</span>
                            {createFormErrors[`answer_${index + 1}`] && (
                              <span className="error-message">{createFormErrors[`answer_${index + 1}`]}</span>
                            )}
                          </div>
                          <div className="answer-inputs">
                            <div className="answer-input-group">
                              <label>정답 <span className="required-mark">*</span></label>
                              <input
                                type="text"
                                value={ans.answer || ''}
                                onChange={(e) => handleAnswerChange(index, 'answer', e.target.value)}
                                placeholder={`${index + 1}번 문항 정답`}
                                className={createFormErrors[`answer_${index + 1}`] ? 'error' : ''}
                                maxLength={50}
                              />
                            </div>
                            <div className="points-input-group">
                              <label>배점</label>
                              <input
                                type="number"
                                value={ans.score || 1}
                                onChange={(e) => handleAnswerChange(index, 'score', e.target.value)}
                                placeholder="배점"
                                min="0"
                                step="0.5"
                                className={createFormErrors[`score_${index + 1}`] ? 'error' : ''}
                              />
                            </div>
                          </div>
                          {createFormErrors[`score_${index + 1}`] && (
                            <span className="error-message">{createFormErrors[`score_${index + 1}`]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="create-submit-btn"
                  onClick={handleCreateAssignment}
                  disabled={isCreating}
                >
                  {isCreating ? '생성 중...' : '과제 생성 및 추가'}
                </button>
              </div>
            )}

            {/* 기존 과제 선택 */}
            {!showCreateForm && (
              <>
            {availableAssignments.length > 0 ? (
                  <div className="add-assignment-section">
                    <h4 className="add-assignment-label">과제 선택</h4>
                    <div className="assignment-search-container">
                      <input
                        type="text"
                        className="assignment-search-input"
                        placeholder="과제명, 과목, 타입, 날짜로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="available-assignment-list">
                      {paginatedAvailableAssignments.length > 0 ? (
                        paginatedAvailableAssignments.map((assignment) => {
                          const isSelected = selectedAssignmentId === assignment._id;
                          return (
                            <div
                              key={assignment._id}
                              className={`available-assignment-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedAssignmentId(assignment._id)}
                            >
                              <div className="assignment-card-header">
                                <span className="assignment-card-name">{assignment.assignmentName}</span>
                                <span className="assignment-card-type">{assignment.assignmentType === '실전TEST' ? '클리닉' : assignment.assignmentType}</span>
                              </div>
                              <div className="assignment-card-details">
                                <span className="assignment-card-subject">과목: {assignment.subject}</span>
                                <div className="assignment-card-dates">
                                  <span className="assignment-card-date">
                                    등록일: {formatDate(assignment.createdAt)}
                                  </span>
                                  <span className="assignment-card-date">
                                    시작일: {formatDate(assignment.startDate)}
                                  </span>
                                  <span className="assignment-card-date">
                                    마감일: {formatDate(assignment.dueDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="empty-message">검색 결과가 없습니다.</p>
                      )}
                    </div>
                    {/* 과제 선택 페이지네이션 */}
                    {totalPagesForSelection > 1 && (
                      <div className="course-assignment-pagination">
                        <button
                          className="pagination-btn"
                          onClick={() => setCurrentPageForSelection(currentPageForSelection - 1)}
                          disabled={currentPageForSelection === 1}
                        >
                          이전
                        </button>
                        <div className="pagination-pages">
                          {Array.from({ length: totalPagesForSelection }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              className={`pagination-page-btn ${currentPageForSelection === page ? 'active' : ''}`}
                              onClick={() => setCurrentPageForSelection(page)}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          className="pagination-btn"
                          onClick={() => setCurrentPageForSelection(currentPageForSelection + 1)}
                          disabled={currentPageForSelection === totalPagesForSelection}
                        >
                          다음
                        </button>
                      </div>
                    )}
                    <div className="add-assignment-actions">
                <button
                  className="add-btn"
                  onClick={handleAdd}
                  disabled={!selectedAssignmentId}
                >
                        선택한 과제 추가
                </button>
                    </div>
              </div>
            ) : (
              <p className="empty-message">추가할 수 있는 과제가 없습니다.</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="course-assignment-modal-actions">
          <button type="button" className="btn-close" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default CourseAssignmentModal;

