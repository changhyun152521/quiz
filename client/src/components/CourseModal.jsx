import { useState, useEffect } from 'react';
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
    }
  }, [showModal, course, mode]);

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
      onClose();
    } catch (error) {
      console.error('저장 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="course-modal-overlay" onClick={onClose}>
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
                <div className="checkbox-list">
                  {students.map((student) => (
                    <label key={student._id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.students.includes(student._id)}
                        onChange={() => handleMultiSelect('students', student._id)}
                      />
                      <span>{student.name} ({student.userId})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>과제 선택</label>
            <div className="multi-select-container">
              {assignments.length === 0 ? (
                <p className="empty-message">등록된 과제가 없습니다.</p>
              ) : (
                <div className="checkbox-list">
                  {assignments.map((assignment) => (
                    <label key={assignment._id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.assignments.includes(assignment._id)}
                        onChange={() => handleMultiSelect('assignments', assignment._id)}
                      />
                      <span>{assignment.assignmentName} ({assignment.subject})</span>
                    </label>
                  ))}
                </div>
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

