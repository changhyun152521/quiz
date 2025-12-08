import { useState } from 'react';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('all');

  // 임시 데이터 (나중에 API로 대체)
  const allData = {
    inProgress: 5,
    total: 9,
    completed: 4
  };

  const quizData = {
    inProgress: 3,
    total: 5,
    completed: 2
  };

  const testData = {
    inProgress: 2,
    total: 4,
    completed: 2
  };

  const getCurrentData = () => {
    if (activeTab === 'all') return allData;
    if (activeTab === 'quiz') return quizData;
    return testData;
  };

  const currentData = getCurrentData();

  return (
    <div className="dashboard">
      {/* 헤더 */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div 
            className="dashboard-logo"
            onClick={() => {
              onLogout();
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="dashboard-logo-text">QUIZ LAB</div>
          </div>
          <button 
            className="dashboard-logout-btn" 
            onClick={() => {
              if (window.confirm('정말 로그아웃 하시겠습니까?')) {
                onLogout();
              }
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* 제목 */}
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">
              {user?.name || '학생'}학생의 과제현황
            </h1>
          </div>

          {/* 탭 */}
          <div className="dashboard-tabs">
            <button
              className={`dashboard-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              전체보기
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              QUIZ
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'test' ? 'active' : ''}`}
              onClick={() => setActiveTab('test')}
            >
              클리닉
            </button>
          </div>

          {/* 통계 카드 */}
          <div className="dashboard-stats">
            <div className="stat-card stat-card-progress">
              <div className="stat-card-header">
                <span className="stat-card-icon">📝</span>
                <span className="stat-card-label">진행중인 과제</span>
              </div>
              <div className="stat-card-content">
                <span className="stat-card-number">{currentData.inProgress}</span>
                <span className="stat-card-total">/ {currentData.total}</span>
              </div>
            </div>

            <div className="stat-card stat-card-completed">
              <div className="stat-card-header">
                <span className="stat-card-icon">✓</span>
                <span className="stat-card-label">완료된 과제</span>
              </div>
              <div className="stat-card-content">
                <span className="stat-card-number">{currentData.completed}</span>
                <span className="stat-card-total">/ {currentData.total}</span>
              </div>
            </div>
          </div>

          {/* 과제 목록 영역 (추후 구현) */}
          <div className="dashboard-content">
            <div className="dashboard-placeholder">
              <p>과제 목록이 여기에 표시됩니다</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
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

export default Dashboard;

