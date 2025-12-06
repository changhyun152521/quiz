import { useState, useEffect } from 'react'
import { get } from '../utils/api'
import SignUp from '../components/SignUp'
import Login from '../components/Login'
import '../App.css'

function MainPage({ onLoginSuccess, onBackToDashboard }) {
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [hasToken, setHasToken] = useState(false)

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

  // 토큰 확인하여 자동 로그인
  useEffect(() => {
    const checkTokenAndAutoLogin = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        try {
          // 토큰 유효성 검증
          const response = await get('/api/auth/verify')
          
          const data = await response.json()
          if (data.success) {
            // 유효한 토큰이 있으면 바로 대시보드로 이동
            // 서버에서 반환한 최신 사용자 정보 사용 (또는 localStorage의 정보 사용)
            const user = data.data?.user || JSON.parse(userData)
            onLoginSuccess(user)
            return
          } else {
            // 토큰이 유효하지 않으면 삭제
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('rememberMe')
            setHasToken(false)
          }
        } catch (error) {
          // 네트워크 오류 시 토큰이 있으면 일단 사용 (오프라인 상태일 수 있음)
          console.error('토큰 검증 오류:', error)
          // 네트워크 오류가 아닌 경우에만 토큰 삭제
          if (error.message && !error.message.includes('fetch')) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('rememberMe')
          }
          setHasToken(false)
        }
      } else {
        setHasToken(false)
      }
    }

    // 약간의 지연을 두어 App.jsx의 토큰 검증이 완료될 시간을 줌
    const timer = setTimeout(() => {
      checkTokenAndAutoLogin()
    }, 100)

    return () => clearTimeout(timer)
  }, [onLoginSuccess])

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
                // 로그인 상태일 때 (onBackToDashboard가 있으면) 바로 대시보드로 이동
                if (onBackToDashboard) {
                  onBackToDashboard()
                  return
                }

                // 토큰 확인
                const token = localStorage.getItem('token')
                const userData = localStorage.getItem('user')
                
                if (token && userData) {
                  try {
                    // 토큰 유효성 검증
                    const response = await get('/api/auth/verify')
                    
                    const data = await response.json()
                    if (data.success) {
                      // 유효한 토큰이 있으면 바로 Dashboard로 이동
                      // 서버에서 반환한 최신 사용자 정보 사용
                      const user = data.data?.user || JSON.parse(userData)
                      onLoginSuccess(user)
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

