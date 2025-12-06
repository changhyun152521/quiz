import { useState, useEffect } from 'react'
import { get } from '../utils/api'
import SignUp from '../components/SignUp'
import Login from '../components/Login'
import '../App.css'

function MainPage({ onLoginSuccess, onBackToDashboard, onShowCourseSelection }) {
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  // 페이지 마운트 시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [])

  // 초기 로딩 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
      setTimeout(() => {
        setShowContent(true)
      }, 300)
    }, 1500) // 1.5초 로딩 애니메이션

    return () => clearTimeout(timer)
  }, [])

  // MainPage에서는 자동 로그인을 하지 않음 (App.jsx에서 처리)
  // 자동 로그인은 App.jsx의 useEffect에서만 처리

  return (
    <div className="App">
      {/* 초기 로딩 애니메이션 */}
      {isLoading && (
        <div className="initial-loader">
          {/* 배경 패턴 */}
          <div className="loader-background">
            <div className="loader-circle circle-1"></div>
            <div className="loader-circle circle-2"></div>
            <div className="loader-circle circle-3"></div>
          </div>
          
          <div className="loader-content">
            {/* 아이콘 */}
            <div className="loader-icon-wrapper">
              <svg className="loader-icon" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect x="30" y="25" width="60" height="70" fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="2.5" rx="2"/>
                <line x1="40" y1="45" x2="80" y2="45" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="40" y1="60" x2="80" y2="60" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="40" y1="75" x2="70" y2="75" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M 75 20 L 85 30 L 80 35 L 70 25 Z" fill="rgba(255, 255, 255, 0.9)"/>
                <line x1="85" y1="30" x2="90" y2="25" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M 45 50 L 52 57 L 65 42" fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <div className="loader-logo">
              <div className="loader-text">QUIZ LAB</div>
              <img 
                src="/창현수학 로고.png" 
                alt="창현수학 로고" 
                className="loader-logo-img"
              />
            </div>
            
            {/* 진행 바 */}
            <div className="loader-progress-wrapper">
              <div className="loader-progress">
                <div className="progress-bar"></div>
              </div>
              <div className="loader-dots">
                <span className="dot dot-1"></span>
                <span className="dot dot-2"></span>
                <span className="dot dot-3"></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className={`main-wrapper ${showContent ? 'show' : ''}`}>
        {/* 상단 배너 */}
        <header className="top-banner">
        <div className="banner-content">
          <div className="banner-text">QUIZ LAB</div>
          <a 
            href="https://www.mathchang.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="banner-home-link"
          >
            이창현수학 돌아가기
          </a>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="main-container">
        <div className="main-content">
          <h1 className="main-title">QUIZ LAB</h1>
          <p className="main-subtitle">학생들의 수업 및 TEST 관리</p>
          
          {/* 테스트 아이콘 */}
          <div className="math-icon-container">
            <div className="math-icon">
              <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                {/* 시험지/문서 */}
                <rect x="30" y="25" width="60" height="70" fill="none" stroke="#1a1a1a" strokeWidth="2.5" rx="2"/>
                {/* 줄 */}
                <line x1="40" y1="45" x2="80" y2="45" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
                <line x1="40" y1="60" x2="80" y2="60" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
                <line x1="40" y1="75" x2="70" y2="75" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
                {/* 연필 */}
                <path d="M 75 20 L 85 30 L 80 35 L 70 25 Z" fill="#1a1a1a"/>
                <line x1="85" y1="30" x2="90" y2="25" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
                {/* 체크마크 */}
                <path d="M 45 50 L 52 57 L 65 42" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* 학습 시작하기 버튼 */}
          <div className="button-group">
            <button 
              className="start-button"
              onClick={async () => {
                // 토큰 확인
                const token = localStorage.getItem('token')
                const userData = localStorage.getItem('user')
                
                if (token && userData) {
                  try {
                    // 토큰 유효성 검증
                    const response = await get('/api/auth/verify')
                    
                    const data = await response.json()
                    if (data.success) {
                      // 유효한 토큰이 있으면 강좌 선택 모달 표시
                      const user = data.data?.user || JSON.parse(userData)
                      if (onShowCourseSelection && (user.role === 'student' || !user.role)) {
                        // 먼저 로그인 상태 업데이트
                        onLoginSuccess(user, false)
                        // 그 다음 강좌 선택 모달 표시
                        onShowCourseSelection()
                      } else {
                        onLoginSuccess(user, false)
                      }
                      return
                    } else {
                      // 토큰이 유효하지 않으면 삭제하고 로그인 모달 열기
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                      localStorage.removeItem('rememberMe')
                      setHasToken(false)
                      setShowLoginModal(true)
                    }
                  } catch (error) {
                    // 네트워크 오류 시에도 로그인 모달 열기
                    console.error('토큰 검증 오류:', error)
                    setShowLoginModal(true)
                  }
                } else {
                  // 토큰이 없으면 로그인 모달 열기
                  setShowLoginModal(true)
                }
              }}
            >
              학습 시작하기
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-copyright">
            <p>© 이창현수학. All rights reserved.</p>
          </div>
          <div className="footer-contact">
            <span>연락처 | 010-9903-7949</span>
          </div>
        </div>
      </footer>

      <Login 
        showModal={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onShowSignUp={() => {
          setShowLoginModal(false);
          setShowSignUpModal(true);
        }}
        onLoginSuccess={onLoginSuccess}
      />

      <SignUp 
        showModal={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)}
        onShowLogin={() => {
          setShowSignUpModal(false);
          setShowLoginModal(true);
        }}
      />
      </div>
    </div>
  )
}

export default MainPage

