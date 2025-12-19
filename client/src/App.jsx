import { useState, useEffect } from 'react'
import { get } from './utils/api'
import MainPage from './pages/MainPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import TeacherDashboardPage from './pages/TeacherDashboardPage'
import CourseSelectionModal from './components/CourseSelectionModal'
import useAutoLogout from './hooks/useAutoLogout'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showMainPage, setShowMainPage] = useState(false)
  const [showCourseSelection, setShowCourseSelection] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)

  // 페이지 로드 시 토큰 확인하여 자동 로그인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        try {
          // 토큰 유효성 검증
          const response = await get('/api/auth/verify')
          
          const data = await response.json()
          if (data.success) {
            // 서버에서 반환한 최신 사용자 정보 사용
            const userInfo = data.data?.user || JSON.parse(userData)
            // localStorage의 사용자 정보도 업데이트
            localStorage.setItem('user', JSON.stringify(userInfo))
            // 강좌 선택 모달을 명시적으로 false로 설정
            setShowCourseSelection(false)
            // handleLoginSuccess를 호출하여 상태를 올바르게 설정 (강좌 선택 모달은 표시하지 않음)
            handleLoginSuccess(userInfo, false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 사용자 역할 확인 헬퍼 함수 (mathchang의 userType 사용)
  const isStudent = (user) => {
    if (!user) return false;
    // mathchang: userType이 '학생' 또는 없는 경우
    // 기존 호환성: role이 'student' 또는 없는 경우
    return user.userType === '학생' || user.role === 'student' || (!user.userType && !user.role);
  };

  const isAdmin = (user) => {
    if (!user) return false;
    // mathchang: isAdmin이 true이거나 userType이 '강사'
    // 기존 호환성: role이 'admin' 또는 userId가 'admin'
    return user.isAdmin || user.userType === '강사' || user.role === 'admin' || user.userId === 'admin';
  };

  const isTeacher = (user) => {
    if (!user) return false;
    // mathchang: userType이 '강사'
    // 기존 호환성: role이 'teacher'
    return user.userType === '강사' || user.role === 'teacher';
  };

  const handleLoginSuccess = (userData, showCourseModal = false) => {
    setIsLoggedIn(true)
    setUser(userData)

    // 학생인 경우 로그인 성공 시 바로 강좌 선택 모달 표시
    if (userData && isStudent(userData)) {
      if (showCourseModal) {
        // 학습하기 버튼을 클릭했을 때 강좌 선택 모달 표시
        setShowCourseSelection(true)
        setShowMainPage(true) // 메인페이지는 계속 표시
      } else {
        // 로그인 성공 시 바로 강좌 선택 모달 표시 (메인페이지 숨김)
        setShowCourseSelection(true)
        setShowMainPage(false) // 메인페이지 숨김
      }
    } else if (userData && (isAdmin(userData) || isTeacher(userData))) {
      // 관리자나 강사는 바로 대시보드로
      setShowMainPage(false)
      setShowCourseSelection(false) // 명시적으로 false 설정
    } else {
      // 기타 경우
      setShowMainPage(true)
      setShowCourseSelection(false) // 명시적으로 false 설정
    }
  }

  const handleCourseSelected = (course) => {
    setSelectedCourse(course)
    setShowCourseSelection(false)
    setShowMainPage(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    setIsLoggedIn(false)
    setUser(null)
    setShowMainPage(false)
    setShowCourseSelection(false) // 강좌 선택 모달도 닫기
  }

  const handleGoToMainPage = () => {
    setShowMainPage(true)
  }

  const handleBackToDashboard = () => {
    setShowMainPage(false)
  }

  // 페이지 전환 시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [isLoggedIn, showMainPage, user])

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
        const response = await get('/api/auth/verify');

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
  // 단, 강좌 선택 모달이 표시 중일 때는 제외
  if (isLoggedIn && user && !showMainPage && !showCourseSelection) {
    // 관리자 계정인지 확인 (mathchang: isAdmin 또는 userId가 'admin')
    if (isAdmin(user) && !isTeacher(user)) {
      return <AdminDashboardPage user={user} onLogout={handleLogout} onGoToMainPage={handleGoToMainPage} />
    }
    // 강사 계정인지 확인 (mathchang: userType이 '강사')
    if (isTeacher(user)) {
      return <TeacherDashboardPage user={user} onLogout={handleLogout} onGoToMainPage={handleGoToMainPage} />
    }
    return <DashboardPage user={user} onLogout={handleLogout} onGoToMainPage={handleGoToMainPage} selectedCourse={selectedCourse} />
  }

  // 메인페이지 표시 (로그인 상태이면서 showMainPage가 true이거나, 로그인하지 않은 경우)
  return (
    <>
      <MainPage 
        onLoginSuccess={handleLoginSuccess} 
        onBackToDashboard={isLoggedIn ? handleBackToDashboard : null} 
        onLogout={handleLogout}
        onShowCourseSelection={() => {
          // 학습하기 버튼을 클릭했을 때만 강좌 선택 모달 표시
          // user가 없으면 먼저 로그인해야 함
          if (!user) {
            return;
          }
          if (isStudent(user)) {
            setShowCourseSelection(true)
            setShowMainPage(true) // 메인페이지는 계속 표시
          }
        }} 
      />
      {/* 강좌 선택 모달은 showCourseSelection이 명시적으로 true이고 user가 학생일 때만 표시 */}
      {/* 조건을 더 엄격하게: showCourseSelection이 정확히 true이고, user가 존재하고, user._id가 있을 때만 */}
      {showCourseSelection === true &&
       user !== null &&
       user !== undefined &&
       user._id &&
       isStudent(user) && (
        <CourseSelectionModal
          showModal={true}
          onClose={() => {
            setShowCourseSelection(false)
          }}
          user={user}
          onCourseSelected={handleCourseSelected}
        />
      )}
    </>
  )
}

export default App
