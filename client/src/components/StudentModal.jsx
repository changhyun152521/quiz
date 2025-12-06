import { useState, useEffect } from 'react';
import './StudentModal.css';

function StudentModal({ showModal, onClose, student, onSave, mode }) {
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    name: '',
    studentPhone: '',
    parentPhone: '',
    email: '',
    schoolName: '',
    grade: '',
    privacyConsent: false,
    termsConsent: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showModal) {
      if (mode === 'edit' && student) {
        setFormData({
          userId: student.userId || '',
          password: '',
          name: student.name || '',
          studentPhone: student.studentPhone || '',
          parentPhone: student.parentPhone || '',
          email: student.email || '',
          schoolName: student.schoolName || '',
          grade: student.grade || '',
          privacyConsent: student.privacyConsent || false,
          termsConsent: student.termsConsent || false
        });
      } else {
        setFormData({
          userId: '',
          password: '',
          name: '',
          studentPhone: '',
          parentPhone: '',
          email: '',
          schoolName: '',
          grade: '',
          privacyConsent: false,
          termsConsent: false
        });
      }
      setErrors({});
    }
  }, [showModal, student, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

    if (!formData.studentPhone) {
      newErrors.studentPhone = '학생 연락처를 입력해주세요';
    } else if (!/^[0-9]{10,11}$/.test(formData.studentPhone.replace(/-/g, ''))) {
      newErrors.studentPhone = '올바른 전화번호 형식이 아닙니다';
    }

    if (!formData.parentPhone) {
      newErrors.parentPhone = '학부모 연락처를 입력해주세요';
    } else if (!/^[0-9]{10,11}$/.test(formData.parentPhone.replace(/-/g, ''))) {
      newErrors.parentPhone = '올바른 전화번호 형식이 아닙니다';
    }

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!formData.schoolName) {
      newErrors.schoolName = '학교명을 입력해주세요';
    }

    if (!formData.grade) {
      newErrors.grade = '학년을 선택해주세요';
    }

    if (!formData.privacyConsent) {
      newErrors.privacyConsent = '개인정보 수집 및 이용에 동의해야 합니다';
    }

    if (!formData.termsConsent) {
      newErrors.termsConsent = '서비스 이용약관에 동의해야 합니다';
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
        ...formData,
        studentPhone: formData.studentPhone.replace(/-/g, ''),
        parentPhone: formData.parentPhone.replace(/-/g, '')
      };

      if (mode === 'edit' && !submitData.password) {
        delete submitData.password;
      }

      await onSave(submitData, mode === 'edit' ? student._id : null);
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
    <div className="student-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isSubmitting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="student-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="student-modal-header">
          <h2 className="student-modal-title">
            {mode === 'edit' ? '학생 정보 수정' : '학생 추가'}
          </h2>
          <button className="student-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="student-modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>아이디 *</label>
              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                placeholder="아이디 (4~20자)"
                disabled={mode === 'edit'}
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
          </div>

          <div className="form-row">
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

            <div className="form-group">
              <label>학년 *</label>
              <select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className={errors.grade ? 'error' : ''}
              >
                <option value="">학년을 선택하세요</option>
                <option value="초등">초등</option>
                <option value="중등">중등</option>
                <option value="고1">고1</option>
                <option value="고2">고2</option>
                <option value="고3">고3</option>
              </select>
              {errors.grade && <span className="error-message">{errors.grade}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>학교명 *</label>
              <input
                type="text"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleChange}
                placeholder="학교명"
                className={errors.schoolName ? 'error' : ''}
              />
              {errors.schoolName && <span className="error-message">{errors.schoolName}</span>}
            </div>

            <div className="form-group">
              <label>이메일 *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="이메일"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>학생 연락처 *</label>
              <input
                type="tel"
                name="studentPhone"
                value={formData.studentPhone}
                onChange={handleChange}
                placeholder="학생 연락처"
                className={errors.studentPhone ? 'error' : ''}
              />
              {errors.studentPhone && <span className="error-message">{errors.studentPhone}</span>}
            </div>

            <div className="form-group">
              <label>학부모 연락처 *</label>
              <input
                type="tel"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleChange}
                placeholder="학부모 연락처"
                className={errors.parentPhone ? 'error' : ''}
              />
              {errors.parentPhone && <span className="error-message">{errors.parentPhone}</span>}
            </div>
          </div>

          <div className="form-group consent-group">
            <label className="consent-label">
              <input
                type="checkbox"
                name="privacyConsent"
                checked={formData.privacyConsent}
                onChange={handleChange}
                className={errors.privacyConsent ? 'error' : ''}
              />
              <span>개인정보 수집 및 이용 동의 *</span>
            </label>
            {errors.privacyConsent && <span className="error-message">{errors.privacyConsent}</span>}
          </div>

          <div className="form-group consent-group">
            <label className="consent-label">
              <input
                type="checkbox"
                name="termsConsent"
                checked={formData.termsConsent}
                onChange={handleChange}
                className={errors.termsConsent ? 'error' : ''}
              />
              <span>서비스 이용약관 동의 *</span>
            </label>
            {errors.termsConsent && <span className="error-message">{errors.termsConsent}</span>}
          </div>

          <div className="student-modal-actions">
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

export default StudentModal;

