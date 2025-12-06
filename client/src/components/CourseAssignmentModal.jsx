import { useState, useEffect } from 'react';
import './CourseAssignmentModal.css';

function CourseAssignmentModal({ showModal, onClose, course, allAssignments, onAddAssignment, onRemoveAssignment }) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

  // 이미 강좌에 등록된 과제 ID 목록
  const registeredAssignmentIds = course?.assignments?.map(a => a._id || a) || [];

  // 등록 가능한 과제 목록 (아직 등록되지 않은 과제들)
  const availableAssignments = allAssignments.filter(
    assignment => !registeredAssignmentIds.includes(assignment._id)
  );

  useEffect(() => {
    if (showModal) {
      setSelectedAssignmentId('');
    }
  }, [showModal]);

  const handleAdd = () => {
    if (!selectedAssignmentId) {
      alert('과제를 선택해주세요.');
      return;
    }

    onAddAssignment(course._id, selectedAssignmentId);
    setSelectedAssignmentId('');
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="course-assignment-modal-overlay" onClick={onClose}>
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
            {course?.assignments && course.assignments.length > 0 ? (
              <div className="assignment-list">
                {course.assignments.map((assignment) => (
                  <div key={assignment._id || assignment} className="assignment-item">
                    <div className="assignment-info">
                      <span className="assignment-name">
                        {assignment.assignmentName || assignment}
                      </span>
                      {assignment.subject && (
                        <span className="assignment-subject">({assignment.subject})</span>
                      )}
                      {assignment.assignmentType && (
                        <span className="assignment-type">{assignment.assignmentType}</span>
                      )}
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
            ) : (
              <p className="empty-message">등록된 과제가 없습니다.</p>
            )}
          </div>

          {/* 과제 추가 */}
          <div className="assignment-section">
            <h3 className="section-title">과제 추가</h3>
            {availableAssignments.length > 0 ? (
              <div className="add-assignment-form">
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="assignment-select"
                >
                  <option value="">과제를 선택하세요</option>
                  {availableAssignments.map((assignment) => (
                    <option key={assignment._id} value={assignment._id}>
                      {assignment.assignmentName} ({assignment.subject}) - {assignment.assignmentType}
                    </option>
                  ))}
                </select>
                <button
                  className="add-btn"
                  onClick={handleAdd}
                  disabled={!selectedAssignmentId}
                >
                  추가
                </button>
              </div>
            ) : (
              <p className="empty-message">추가할 수 있는 과제가 없습니다.</p>
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

