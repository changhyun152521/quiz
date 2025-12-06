import { useState, useEffect } from 'react';
import './MyInfoModal.css';

function MyInfoModal({ showModal, onClose, user, onUpdateUser, onUpdatePassword, onDeleteUser }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    email: '',
    schoolName: '',
    studentPhone: '',
    parentPhone: ''
  });
  const [originalFormData, setOriginalFormData] = useState({
    userId: '',
    email: '',
    schoolName: '',
    studentPhone: '',
    parentPhone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (showModal && user) {
      const initialData = {
        userId: user.userId || '',
        email: user.email || '',
        schoolName: user.schoolName || '',
        studentPhone: user.studentPhone || '',
        parentPhone: user.parentPhone || ''
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
      setPasswordErrors({});
      setShowPasswordSection(false);
      setIsEditMode(false); // 모달 열 때마다 조회 모드로 초기화
    }
  }, [showModal, user]);

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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.userId || formData.userId.trim() === '') {
      newErrors.userId = '아이디를 입력해주세요';
    } else if (formData.userId.length < 4 || formData.userId.length > 20) {
      newErrors.userId = '아이디는 4~20자 사이여야 합니다';
    }

    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (user?.role === 'student') {
      if (!formData.schoolName || formData.schoolName.trim() === '') {
        newErrors.schoolName = '학교명을 입력해주세요';
      }
      if (!formData.studentPhone || formData.studentPhone.trim() === '') {
        newErrors.studentPhone = '학생 연락처를 입력해주세요';
      }
      if (!formData.parentPhone || formData.parentPhone.trim() === '') {
        newErrors.parentPhone = '학부모 연락처를 입력해주세요';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.currentPassword || passwordData.currentPassword.trim() === '') {
      newErrors.currentPassword = '현재 비밀번호를 입력해주세요';
    }

    if (!passwordData.newPassword || passwordData.newPassword.trim() === '') {
      newErrors.newPassword = '새 비밀번호를 입력해주세요';
    } else if (passwordData.newPassword.length < 7) {
      newErrors.newPassword = '비밀번호는 최소 7자 이상이어야 합니다';
    } else if (!/^[a-zA-Z0-9]+$/.test(passwordData.newPassword)) {
      newErrors.newPassword = '비밀번호는 영문과 숫자만 사용할 수 있습니다';
    }

    if (!passwordData.confirmPassword || passwordData.confirmPassword.trim() === '') {
      newErrors.confirmPassword = '새 비밀번호 확인을 입력해주세요';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = '새 비밀번호가 일치하지 않습니다';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateUser(formData);
      alert('정보가 성공적으로 수정되었습니다.');
      setOriginalFormData(formData);
      setIsEditMode(false); // 수정 완료 후 조회 모드로 전환
    } catch (error) {
      console.error('정보 수정 오류:', error);
      alert('정보 수정에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    // 원본 데이터로 복원
    setFormData(originalFormData);
    setErrors({});
    setIsEditMode(false);
  };

  const handleDeleteAccount = async () => {
    // 경고 메시지
    const confirmMessage = `정말 회원탈퇴를 하시겠습니까?\n\n회원탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.\n\n회원탈퇴를 진행하시려면 "탈퇴"를 입력해주세요.`;
    const userInput = window.prompt(confirmMessage);
    
    if (userInput !== '탈퇴') {
      if (userInput !== null) {
        alert('회원탈퇴가 취소되었습니다.');
      }
      return;
    }

    // 최종 확인
    if (!window.confirm('정말로 회원탈퇴를 진행하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteUser();
      alert('회원탈퇴가 완료되었습니다.');
      onClose();
      // 로그아웃 처리 (부모 컴포넌트에서 처리)
      window.location.href = '/';
    } catch (error) {
      console.error('회원탈퇴 오류:', error);
      alert('회원탈퇴에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setIsChangingPassword(true);
    try {
      await onUpdatePassword({
        password: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('비밀번호가 성공적으로 변경되었습니다.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      alert('비밀번호 변경에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!showModal || !user) {
    return null;
  }

  const isStudent = user.role === 'student';

  return (
    <div className="myinfo-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isSubmitting && !isChangingPassword && !isDeleting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="myinfo-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="myinfo-modal-header">
          <h2 className="myinfo-modal-title">내 정보</h2>
          <button className="myinfo-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="myinfo-modal-body">
          {/* 기본 정보 조회/수정 */}
          <div className="info-section">
            <div className="info-section-header">
              <h3 className="info-section-title">기본 정보</h3>
              {!isEditMode && (
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => setIsEditMode(true)}
                >
                  정보 수정
                </button>
              )}
            </div>

            {isEditMode ? (
              <form onSubmit={handleSubmit} className="myinfo-form">
                <div className="form-group">
                  <label>아이디 *</label>
                  <input
                    type="text"
                    name="userId"
                    value={formData.userId}
                    onChange={handleChange}
                    placeholder="아이디"
                    className={errors.userId ? 'error' : ''}
                    maxLength={20}
                  />
                  {errors.userId && <span className="error-message">{errors.userId}</span>}
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

                {isStudent && (
                  <>
                    <div className="form-group">
                      <label>학교명 *</label>
                      <input
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        placeholder="학교명"
                        className={errors.schoolName ? 'error' : ''}
                        maxLength={100}
                      />
                      {errors.schoolName && <span className="error-message">{errors.schoolName}</span>}
                    </div>

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
                  </>
                )}

                <div className="myinfo-modal-actions">
                  <button type="button" className="btn-cancel" onClick={handleCancelEdit}>취소</button>
                  <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="info-view">
                <div className="info-item">
                  <span className="info-label">아이디</span>
                  <span className="info-value">{formData.userId || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">이메일</span>
                  <span className="info-value">{formData.email || '-'}</span>
                </div>
                {isStudent && (
                  <>
                    <div className="info-item">
                      <span className="info-label">학교명</span>
                      <span className="info-value">{formData.schoolName || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">학생 연락처</span>
                      <span className="info-value">{formData.studentPhone || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">학부모 연락처</span>
                      <span className="info-value">{formData.parentPhone || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 비밀번호 변경 섹션 */}
          <div className="password-section">
            <div className="password-section-header">
              <h3 className="password-section-title">비밀번호 변경</h3>
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {showPasswordSection ? '접기' : '비밀번호 변경하기'}
              </button>
            </div>

            {showPasswordSection && (
              <form onSubmit={handlePasswordSubmit} className="password-form">
                <div className="form-group">
                  <label>현재 비밀번호 *</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="현재 비밀번호"
                    className={passwordErrors.currentPassword ? 'error' : ''}
                  />
                  {passwordErrors.currentPassword && (
                    <span className="error-message">{passwordErrors.currentPassword}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>새 비밀번호 *</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="새 비밀번호 (7자 이상, 영문, 숫자)"
                    className={passwordErrors.newPassword ? 'error' : ''}
                  />
                  {passwordErrors.newPassword && (
                    <span className="error-message">{passwordErrors.newPassword}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>새 비밀번호 확인 *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="새 비밀번호 확인"
                    className={passwordErrors.confirmPassword ? 'error' : ''}
                  />
                  {passwordErrors.confirmPassword && (
                    <span className="error-message">{passwordErrors.confirmPassword}</span>
                  )}
                </div>

                <div className="password-form-actions">
                  <button type="submit" className="btn-submit" disabled={isChangingPassword}>
                    {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 회원탈퇴 섹션 */}
          <div className="delete-section">
            <div className="delete-section-header">
              <h3 className="delete-section-title">회원탈퇴</h3>
            </div>
            <div className="delete-section-content">
              <p className="delete-warning">
                회원탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>
              <button
                type="button"
                className="btn-delete"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? '처리 중...' : '회원탈퇴'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyInfoModal;

