import { useState, useEffect } from 'react';
import './TeacherModal.css';

function TeacherModal({ showModal, onClose, teacher, onSave, mode }) {
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showModal) {
      if (mode === 'edit' && teacher) {
        setFormData({
          userId: teacher.userId || '',
          password: '',
          name: teacher.name || ''
        });
      } else {
        setFormData({
          userId: '',
          password: '',
          name: ''
        });
      }
      setErrors({});
    }
  }, [showModal, teacher, mode]);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.userId) {
      newErrors.userId = '아이디를 입력해주세요';
    } else if (formData.userId.length < 4 || formData.userId.length > 20) {
      newErrors.userId = '아이디는 4~20자여야 합니다';
    }

    if (mode === 'create' && !formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password && formData.password.length < 7) {
      newErrors.password = '비밀번호는 7자 이상이어야 합니다';
    } else if (formData.password && !/^[a-zA-Z0-9]+$/.test(formData.password)) {
      newErrors.password = '비밀번호는 영문과 숫자만 사용할 수 있습니다';
    }

    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요';
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
      const submitData = {
        ...formData
      };

      if (mode === 'edit' && !submitData.password) {
        delete submitData.password;
      }

      await onSave(submitData, mode === 'edit' ? teacher._id : null);
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
    <div className="teacher-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isSubmitting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="teacher-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="teacher-modal-header">
          <h2 className="teacher-modal-title">
            {mode === 'edit' ? '강사 정보 수정' : '강사 추가'}
          </h2>
          <button className="teacher-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="teacher-modal-form">
          <div className="form-group">
            <label>아이디 *</label>
            <input
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              placeholder="아이디 (4~20자)"
              className={errors.userId ? 'error' : ''}
            />
            {errors.userId && <span className="error-message">{errors.userId}</span>}
          </div>

          <div className="form-group">
            <label>비밀번호 {mode === 'create' ? '*' : ''}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={mode === 'edit' ? '변경 시에만 입력' : '비밀번호 (7자 이상, 영문, 숫자)'}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>이름 *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="이름"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="teacher-modal-actions">
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

export default TeacherModal;

