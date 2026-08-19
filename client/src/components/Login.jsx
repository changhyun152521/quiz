import { useState, useEffect } from 'react';
import { get, post } from '../utils/api';
import './Login.css';

// mathchang-quiz 로그인 컴포넌트
// 백엔드가 mathchang API를 프록시하여 인증 처리

function Login({ showModal, onClose, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFindUserId, setShowFindUserId] = useState(false);
  const [findUserIdData, setFindUserIdData] = useState({
    name: '',
    email: ''
  });
  const [foundUserId, setFoundUserId] = useState('');

  // 모달이 열릴 때 토큰 확인
  useEffect(() => {
    if (showModal) {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        // 토큰 유효성 검증
        get('/api/auth/verify')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              // 유효한 토큰이 있으면 모달을 닫고 바로 Dashboard로 이동
              onClose()
              if (onLoginSuccess) {
                onLoginSuccess(JSON.parse(userData))
              }
            } else {
              // 토큰이 유효하지 않으면 삭제
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              localStorage.removeItem('rememberMe')
            }
          })
          .catch(() => {
            // 네트워크 오류 시 토큰 삭제
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('rememberMe')
          })
      }
    }
  }, [showModal, onClose, onLoginSuccess])

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

  const handleFindUserIdChange = (e) => {
    const { name, value } = e.target;
    setFindUserIdData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.userId) {
      newErrors.userId = '아이디를 입력해주세요';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
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
      // mathchang-quiz 백엔드로 로그인 요청 (백엔드가 mathchang API를 프록시)
      const response = await post('/api/auth/login', {
          userId: formData.userId,
          password: formData.password,
          rememberMe: formData.rememberMe
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || '아이디 또는 비밀번호가 일치하지 않습니다.';
        alert(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // 로그인 성공 - 토큰과 사용자 정보 저장
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      alert('로그인에 성공했습니다!');

      onClose();
      if (onLoginSuccess) {
        const user = data.data.user;
        // 학생인 경우 (mathchang: userType이 '학생')
        const isStudent = user.userType === '학생';
        onLoginSuccess(user, isStudent);
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindUserId = async (e) => {
    e.preventDefault();

    if (!findUserIdData.name || !findUserIdData.email) {
      alert('이름과 이메일을 모두 입력해주세요.');
      return;
    }

    try {
      const response = await post('/api/auth/find-userid', findUserIdData);
      const data = await response.json();

      if (response.ok) {
        setFoundUserId(data.data.userId);
      } else {
        alert(data.message || '아이디를 찾을 수 없습니다.');
        setFoundUserId('');
      }
    } catch (error) {
      console.error('아이디 찾기 오류:', error);
      alert('아이디 찾기 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="login-modal-overlay" onClick={(e) => {
      if (!isSubmitting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="login-wrapper">
          <button
            className="login-close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>

          {!showFindUserId ? (
            <>
              <h1 className="login-title">로그인</h1>

              <div className="login-notice" style={{ marginBottom: '24px', marginTop: '0' }}>
                <p>※ 이창현수학 홈페이지 계정으로 로그인합니다</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* 아이디 */}
                <div className="form-group" style={{ margin: '0', padding: '0' }}>
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
                <div className="form-group" style={{ margin: '0', padding: '0' }}>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="비밀번호"
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

                {/* 자동로그인 및 아이디 찾기 */}
                <div className="login-options" style={{ margin: '0', padding: '0' }}>
                  <label className="remember-me-label">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <span>자동로그인</span>
                  </label>
                  <button
                    type="button"
                    className="find-userid-btn"
                    onClick={() => setShowFindUserId(true)}
                  >
                    아이디 찾기
                  </button>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리 중...' : '로그인'}
                </button>

                {/* 회원가입 안내 */}
                <div className="signup-link-section">
                  <p className="signup-link-text">계정이 없으신가요?</p>
                  <a
                    href="https://www.mathchang.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="signup-link-btn"
                  >
                    이창현수학에서 회원가입
                  </a>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="login-title">아이디 찾기</h1>
              <p className="login-subtitle">이름과 이메일을 입력해주세요</p>

              <form onSubmit={handleFindUserId} className="login-form">
                {/* 이름 */}
                <div className="form-group">
                  <div className="input-wrapper">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={findUserIdData.name}
                      onChange={handleFindUserIdChange}
                      placeholder="이름"
                    />
                  </div>
                </div>

                {/* 이메일 */}
                <div className="form-group">
                  <div className="input-wrapper">
                    <span className="input-icon">✉️</span>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={findUserIdData.email}
                      onChange={handleFindUserIdChange}
                      placeholder="이메일"
                    />
                  </div>
                </div>

                {/* 찾은 아이디 표시 */}
                {foundUserId && (
                  <div className="found-userid">
                    <p>찾은 아이디: <strong>{foundUserId}</strong></p>
                  </div>
                )}

                <div className="login-options">
                  <button
                    type="button"
                    className="back-btn"
                    onClick={() => {
                      setShowFindUserId(false);
                      setFoundUserId('');
                      setFindUserIdData({ name: '', email: '' });
                    }}
                  >
                    로그인으로 돌아가기
                  </button>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                >
                  아이디 찾기
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
