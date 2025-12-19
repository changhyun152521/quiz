import { useState, useEffect } from 'react';
import './MyInfoModal.css';

// 내 정보 조회 전용 모달
// 회원 정보 수정, 비밀번호 변경, 회원탈퇴는 mathchang.com에서 처리

function MyInfoModal({ showModal, onClose, user }) {
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    phone: '',
    userType: '',
    schoolName: '',
    studentContact: '',
    parentContact: ''
  });

  useEffect(() => {
    if (showModal && user) {
      setFormData({
        userId: user.userId || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        userType: user.userType || '',
        schoolName: user.schoolName || '',
        studentContact: user.studentContact || '',
        parentContact: user.parentContact || ''
      });
    }
  }, [showModal, user]);

  if (!showModal || !user) {
    return null;
  }

  const isStudent = user.userType === '학생';

  return (
    <div className="myinfo-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="myinfo-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="myinfo-modal-header">
          <h2 className="myinfo-modal-title">내 정보</h2>
          <button className="myinfo-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="myinfo-modal-body">
          {/* 기본 정보 조회 */}
          <div className="info-section">
            <div className="info-section-header">
              <h3 className="info-section-title">기본 정보</h3>
            </div>

            <div className="info-view">
              <div className="info-item">
                <span className="info-label">아이디</span>
                <span className="info-value">{formData.userId || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">이름</span>
                <span className="info-value">{formData.name || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">이메일</span>
                <span className="info-value">{formData.email || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">연락처</span>
                <span className="info-value">{formData.phone || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">회원 유형</span>
                <span className="info-value">{formData.userType || '-'}</span>
              </div>
              {isStudent && (
                <>
                  <div className="info-item">
                    <span className="info-label">학교명</span>
                    <span className="info-value">{formData.schoolName || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">학생 연락처</span>
                    <span className="info-value">{formData.studentContact || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">학부모 연락처</span>
                    <span className="info-value">{formData.parentContact || '-'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* mathchang 안내 섹션 */}
          <div className="mathchang-section">
            <div className="mathchang-notice">
              <p>회원 정보 수정, 비밀번호 변경, 회원탈퇴는<br />이창현수학 홈페이지에서 가능합니다.</p>
              <a
                href="https://www.mathchang.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-mathchang"
              >
                이창현수학 바로가기
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyInfoModal;
