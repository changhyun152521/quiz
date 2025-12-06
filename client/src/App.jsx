import { useState, useEffect } from 'react'
import MainPage from './pages/MainPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import TeacherDashboardPage from './pages/TeacherDashboardPage'
import useAutoLogout from './hooks/useAutoLogout'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showMainPage, setShowMainPage] = useState(false)

  // 페이지 로드 시 토큰 확인하여 자동 로그인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        try {
          // 토큰 유효성 검증
          const response = await fetch('http://localhost:5000/api/auth/verify', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          const data = await response.json()
          if (data.success) {
            // 서버에서 반환한 최신 사용자 정보 사용
            const userInfo = data.data?.user || JSON.parse(userData)
            setIsLoggedIn(true)
            setUser(userInfo)
            // localStorage의 사용자 정보도 업데이트
            localStorage.setItem('user', JSON.stringify(userInfo))
          } else {
            // 토큰이 유효하지 않으면 삭제
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('rememberMe')
            setIsLoggedIn(false)
            setUser(null)
          }
        } catch (error) {
          console.error('토큰 검증 오류:', error)
          // 네트워크 오류 시 토큰 유지 (오프라인 상태일 수 있음)
          // 하지만 검증 실패로 간주
          setIsLoggedIn(false)
          setUser(null)
        }
      } else {
        setIsLoggedIn(false)
        setUser(null)
      }
      
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [])

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    setIsLoggedIn(false)
    setUser(null)
    setShowMainPage(false)
  }

  const handleGoToMainPage = () => {
    setShowMainPage(true)
  }

  const handleBackToDashboard = () => {
    setShowMainPage(false)
  }

  // 자동 로그아웃 훅 (로그인 상태일 때만 활성화)
  // 30분 비활성 시 자동 로그아웃, 5분 전 경고
  useAutoLogout(
    handleLogout, 
    30 * 60 * 1000, // 30분
    5 * 60 * 1000,  // 5분 전 경고
    isLoggedIn      // 로그인 상태 전달
  )

  // 토큰 만료 감지 및 주기적 검증
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    // 5분마다 토큰 유효성 검증
    const tokenCheckInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        handleLogout();
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (!data.success) {
          // 토큰이 만료되었거나 유효하지 않으면 로그아웃
          alert('세션이 만료되어 자동으로 로그아웃되었습니다.');
          handleLogout();
        }
      } catch (error) {
        console.error('토큰 검증 오류:', error);
        // 네트워크 오류는 무시 (오프라인 상태일 수 있음)
      }
    }, 5 * 60 * 1000); // 5분마다 체크

    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [isLoggedIn, user, handleLogout]);

  // 인증 확인 중이면 로딩 표시 (또는 아무것도 표시하지 않음)
  if (isCheckingAuth) {
    return null // 또는 로딩 스피너
  }

  // 로그인 상태이고 메인페이지를 보여주지 않으면 Dashboard, AdminDashboard, 또는 TeacherDashboard 표시
  if (isLoggedIn && user && !showMainPage) {
    // 관리자 계정인지 확인 (role이 'admin'이거나 userId가 'admin'인 경우)
    if (user.role === 'admin' || user.userId === 'admin') {
      return <AdminDashboardPage user={user} onLogout={handleLogout} onGoToMainPage={handleGoToMainPage} />
    }
    // 강사 계정인지 확인
    if (user.role === 'teacher') {
      return <TeacherDashboardPage user={user} onLogout={handleLogout} onGoToMainPage={handleGoToMainPage} />
    }
    return <DashboardPage user={user} onLogout={handleLogout} onGoToMainPage={handleGoToMainPage} />
  }

  // 메인페이지 표시 (로그인 상태이면서 showMainPage가 true이거나, 로그인하지 않은 경우)
  return <MainPage onLoginSuccess={handleLoginSuccess} onBackToDashboard={isLoggedIn ? handleBackToDashboard : null} />
}

export default App
