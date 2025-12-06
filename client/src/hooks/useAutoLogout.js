import { useEffect, useRef, useCallback } from 'react';

/**
 * 자동 로그아웃 훅
 * @param {Function} onLogout - 로그아웃 콜백 함수
 * @param {number} inactivityTimeout - 비활성 시간 (밀리초, 기본값: 30분)
 * @param {number} warningTime - 경고 표시 시간 (밀리초, 기본값: 5분)
 * @param {boolean} isLoggedIn - 로그인 상태 (기본값: true)
 */
const useAutoLogout = (onLogout, inactivityTimeout = 30 * 60 * 1000, warningTime = 5 * 60 * 1000, isLoggedIn = true) => {
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isWarningShownRef = useRef(false);

  // 로그아웃 실행
  const logout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    isWarningShownRef.current = false;
    onLogout();
  }, [onLogout]);

  // 활동 감지
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    isWarningShownRef.current = false;

    // 기존 타이머 클리어
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // 경고 타이머 설정
    warningTimeoutRef.current = setTimeout(() => {
      const remainingTime = inactivityTimeout - warningTime;
      const minutes = Math.floor(remainingTime / 60000);
      isWarningShownRef.current = true;
      
      // 경고 메시지 표시
      const shouldContinue = window.confirm(
        `활동이 없어 ${minutes}분 후 자동으로 로그아웃됩니다.\n\n계속 사용하시겠습니까?`
      );
      
      if (shouldContinue) {
        // 사용자가 계속 사용하기를 원하면 타이머 리셋
        resetTimer();
      } else {
        // 사용자가 취소하면 즉시 로그아웃
        logout();
      }
    }, inactivityTimeout - warningTime);

    // 자동 로그아웃 타이머 설정
    timeoutRef.current = setTimeout(() => {
      alert('장시간 활동이 없어 자동으로 로그아웃되었습니다.');
      logout();
    }, inactivityTimeout);
  }, [inactivityTimeout, warningTime, logout]);

  // 사용자 활동 이벤트 리스너
  useEffect(() => {
    // 로그인 상태가 아니면 타이머 비활성화
    if (!isLoggedIn) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (isLoggedIn) {
        resetTimer();
      }
    };

    // 이벤트 리스너 등록
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // 초기 타이머 설정
    resetTimer();

    // 클린업
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [resetTimer, isLoggedIn]);

  // 페이지 가시성 변경 감지 (탭 전환 등)
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const handleVisibilityChange = () => {
      if (!isLoggedIn) return;

      if (document.hidden) {
        // 탭이 숨겨지면 타이머 일시 중지
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
        }
      } else {
        // 탭이 다시 보이면 타이머 재시작
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity < inactivityTimeout) {
          resetTimer();
        } else {
          // 비활성 시간이 초과했으면 즉시 로그아웃
          logout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [inactivityTimeout, resetTimer, logout, isLoggedIn]);

  return { resetTimer };
};

export default useAutoLogout;

