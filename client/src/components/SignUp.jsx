import { useState } from 'react';
import './SignUp.css';
import TermsModal from './TermsModal';

function SignUp({ showModal, onClose, onShowLogin }) {
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    confirmPassword: '',
    name: '',
    studentPhone: '',
    parentPhone: '',
    email: '',
    schoolName: '',
    grade: '',
    privacyConsent: false,
    termsConsent: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState({ type: null, show: false });

  // 전체 동의
  const [agreeAll, setAgreeAll] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAgreeAll = (checked) => {
    setAgreeAll(checked);
    setFormData(prev => ({
      ...prev,
      privacyConsent: checked,
      termsConsent: checked
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // 아이디 검증
    if (!formData.userId) {
      newErrors.userId = '아이디를 입력해주세요';
    } else if (formData.userId.length < 4 || formData.userId.length > 20) {
      newErrors.userId = '아이디는 4자 이상 20자 이하여야 합니다';
    }

    // 비밀번호 검증 (7자 이상의 영문 숫자만)
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 7) {
      newErrors.password = '비밀번호는 최소 7자 이상이어야 합니다';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.password)) {
      newErrors.password = '비밀번호는 영문과 숫자만 사용할 수 있습니다';
    }

    // 비밀번호 확인
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    // 이름 검증
    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요';
    }

    // 학생 연락처 검증
    if (!formData.studentPhone) {
      newErrors.studentPhone = '학생 연락처를 입력해주세요';
    } else if (!/^[0-9]{10,11}$/.test(formData.studentPhone.replace(/-/g, ''))) {
      newErrors.studentPhone = '올바른 전화번호 형식이 아닙니다 (10-11자리 숫자)';
    }

    // 학부모 연락처 검증
    if (!formData.parentPhone) {
      newErrors.parentPhone = '학부모 연락처를 입력해주세요';
    } else if (!/^[0-9]{10,11}$/.test(formData.parentPhone.replace(/-/g, ''))) {
      newErrors.parentPhone = '올바른 전화번호 형식이 아닙니다 (10-11자리 숫자)';
    }

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    // 학교명 검증
    if (!formData.schoolName) {
      newErrors.schoolName = '학교명을 입력해주세요';
    }

    // 학년 검증
    if (!formData.grade) {
      newErrors.grade = '학년을 선택해주세요';
    } else if (!['초등', '중등', '고1', '고2', '고3'].includes(formData.grade)) {
      newErrors.grade = '학년은 초등, 중등, 고1, 고2, 고3 중 하나를 선택해주세요';
    }

    // 동의 검증
    if (!formData.privacyConsent) {
      newErrors.privacyConsent = '개인정보 수집 및 이용에 동의해주세요';
    }
    if (!formData.termsConsent) {
      newErrors.termsConsent = '서비스 이용약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/-/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatPhoneNumber(value.replace(/-/g, ''));
    setFormData(prev => ({
      ...prev,
      [name]: formatted
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 전화번호에서 하이픈 제거
      const submitData = {
        ...formData,
        studentPhone: formData.studentPhone.replace(/-/g, ''),
        parentPhone: formData.parentPhone.replace(/-/g, ''),
        confirmPassword: undefined // 서버로 보내지 않음
      };

      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('회원가입이 완료되었습니다!');
        // 로그인 페이지로 이동하거나 초기화
        setFormData({
          userId: '',
          password: '',
          confirmPassword: '',
          name: '',
          studentPhone: '',
          parentPhone: '',
          email: '',
          schoolName: '',
          grade: '',
          privacyConsent: false,
          termsConsent: false
        });
        setAgreeAll(false);
        onClose(); // 모달 닫기
      } else {
        alert(data.message || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      alert('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="signup-modal-overlay" onClick={onClose}>
      <div className="signup-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="signup-wrapper">
        <button 
          className="signup-close-btn"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <h1 className="signup-title">회원가입</h1>
        <p className="signup-subtitle">새로운 계정을 만들어 학습을 시작하세요</p>

        <form onSubmit={handleSubmit} className="signup-form">
          {/* 아이디 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                id="userId"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                placeholder="아이디"
                className={errors.userId ? 'error' : ''}
              />
            </div>
            {errors.userId && <span className="error-message">{errors.userId}</span>}
          </div>

          {/* 비밀번호 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요. (7자 이상, 영문, 숫자)"
                className={errors.password ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* 비밀번호 확인 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="비밀번호를 다시 입력하세요"
                className={errors.confirmPassword ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          {/* 이름 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름"
                className={errors.name ? 'error' : ''}
              />
            </div>
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* 학생 연락처 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">📱</span>
              <input
                type="tel"
                id="studentPhone"
                name="studentPhone"
                value={formData.studentPhone}
                onChange={handlePhoneChange}
                placeholder="학생 연락처를 입력해주세요"
                className={errors.studentPhone ? 'error' : ''}
              />
            </div>
            {errors.studentPhone && <span className="error-message">{errors.studentPhone}</span>}
          </div>

          {/* 학부모 연락처 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">📱</span>
              <input
                type="tel"
                id="parentPhone"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handlePhoneChange}
                placeholder="학부모 연락처를 입력해주세요"
                className={errors.parentPhone ? 'error' : ''}
              />
            </div>
            {errors.parentPhone && <span className="error-message">{errors.parentPhone}</span>}
          </div>

          {/* 이메일 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="이메일을 입력해주세요"
                className={errors.email ? 'error' : ''}
              />
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {/* 학교명 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">🏫</span>
              <input
                type="text"
                id="schoolName"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleChange}
                placeholder="학교명을 입력하세요"
                className={errors.schoolName ? 'error' : ''}
              />
            </div>
            {errors.schoolName && <span className="error-message">{errors.schoolName}</span>}
          </div>

          {/* 학년 */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">📚</span>
              <select
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className={errors.grade ? 'error' : ''}
                required
              >
                <option value="">학년을 선택하세요</option>
                <option value="초등">초등</option>
                <option value="중등">중등</option>
                <option value="고1">고1</option>
                <option value="고2">고2</option>
                <option value="고3">고3</option>
              </select>
            </div>
            {errors.grade && <span className="error-message">{errors.grade}</span>}
          </div>

          {/* 동의 체크박스 */}
          <div className="consent-section">
            <label className="consent-item agree-all">
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => handleAgreeAll(e.target.checked)}
              />
              <span>전체 동의</span>
            </label>

            <div className="consent-divider"></div>

            <label className="consent-item">
              <input
                type="checkbox"
                name="termsConsent"
                checked={formData.termsConsent}
                onChange={handleChange}
              />
              <span>서비스 이용약관 동의 <span className="required">(필수)</span></span>
              <button
                type="button"
                className="view-terms-btn"
                onClick={() => setShowTermsModal({ type: 'terms', show: true })}
              >
                보기
              </button>
            </label>

            <label className="consent-item">
              <input
                type="checkbox"
                name="privacyConsent"
                checked={formData.privacyConsent}
                onChange={handleChange}
              />
              <span>개인정보 수집 및 이용 동의 <span className="required">(필수)</span></span>
              <button
                type="button"
                className="view-terms-btn"
                onClick={() => setShowTermsModal({ type: 'privacy', show: true })}
              >
                보기
              </button>
            </label>

            {(errors.privacyConsent || errors.termsConsent) && (
              <span className="error-message">필수 약관에 동의해주세요</span>
            )}
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : '회원가입'}
          </button>

          {/* 로그인 링크 */}
          <div className="login-link-section">
            <p className="login-link-text">이미 계정이 있으신가요?</p>
            <button
              type="button"
              className="login-link-btn"
              onClick={() => {
                if (onShowLogin) {
                  onShowLogin();
                }
              }}
            >
              로그인
            </button>
          </div>
        </form>
      </div>

        {showTermsModal.show && (
          <TermsModal
            type={showTermsModal.type}
            onClose={() => setShowTermsModal({ type: null, show: false })}
          />
        )}
      </div>
    </div>
  );
}

export default SignUp;

