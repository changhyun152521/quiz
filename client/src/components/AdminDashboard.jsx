import { useState } from 'react';
import './AdminDashboard.css';

function AdminDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('students');

  return (
    <div className="admin-dashboard">
      {/* 헤더 */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <div className="admin-logo-text">QUIZ LAB</div>
          </div>
          <div className="admin-user-info">
            <span className="admin-user-name">관리자</span>
            <button 
              className="admin-logout-btn" 
              onClick={() => {
                if (window.confirm('정말 로그아웃 하시겠습니까?')) {
                  onLogout();
                }
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="admin-main">
        <div className="admin-container">
          {/* 제목 */}
          <div className="admin-title-section">
            <h1 className="admin-title">관리자 페이지</h1>
            <p className="admin-subtitle">학생, 강좌, 트랙을 관리할 수 있습니다</p>
          </div>

          {/* 사이드바 */}
          <div className="admin-layout">
            <aside className="admin-sidebar">
              <nav className="admin-nav">
                <button
                  className={`admin-nav-item ${activeSection === 'students' ? 'active' : ''}`}
                  onClick={() => setActiveSection('students')}
                >
                  <span className="nav-icon">👥</span>
                  <span className="nav-text">학생 관리</span>
                </button>
                <button
                  className={`admin-nav-item ${activeSection === 'courses' ? 'active' : ''}`}
                  onClick={() => setActiveSection('courses')}
                >
                  <span className="nav-icon">📚</span>
                  <span className="nav-text">강좌 관리</span>
                </button>
                <button
                  className={`admin-nav-item ${activeSection === 'tracks' ? 'active' : ''}`}
                  onClick={() => setActiveSection('tracks')}
                >
                  <span className="nav-icon">🎯</span>
                  <span className="nav-text">트랙 관리</span>
                </button>
              </nav>
            </aside>

            {/* 컨텐츠 영역 */}
            <div className="admin-content">
              {activeSection === 'students' && (
                <div className="admin-section">
                  <h2 className="section-title">학생 관리</h2>
                  <div className="section-actions">
                    <button className="admin-btn admin-btn-primary">
                      + 학생 추가
                    </button>
                    <button className="admin-btn admin-btn-secondary">
                      검색
                    </button>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>아이디</th>
                          <th>학년</th>
                          <th>학교</th>
                          <th>연락처</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan="6" className="table-empty">
                            학생 목록이 여기에 표시됩니다
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSection === 'courses' && (
                <div className="admin-section">
                  <h2 className="section-title">강좌 관리</h2>
                  <div className="section-actions">
                    <button className="admin-btn admin-btn-primary">
                      + 강좌 추가
                    </button>
                    <button className="admin-btn admin-btn-secondary">
                      검색
                    </button>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>강좌명</th>
                          <th>학년</th>
                          <th>수강생 수</th>
                          <th>상태</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan="5" className="table-empty">
                            강좌 목록이 여기에 표시됩니다
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSection === 'tracks' && (
                <div className="admin-section">
                  <h2 className="section-title">트랙 관리</h2>
                  <div className="section-actions">
                    <button className="admin-btn admin-btn-primary">
                      + 트랙 추가
                    </button>
                    <button className="admin-btn admin-btn-secondary">
                      검색
                    </button>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>트랙명</th>
                          <th>강좌</th>
                          <th>과제 수</th>
                          <th>상태</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan="5" className="table-empty">
                            트랙 목록이 여기에 표시됩니다
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="admin-footer">
        <div className="footer-content">
          <div className="footer-copyright">
            <p>© 이창현수학. All rights reserved.</p>
          </div>
          <div className="footer-contact">
            <span>연락처 | 010-9903-7949</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;

