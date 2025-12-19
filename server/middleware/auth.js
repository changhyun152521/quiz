// mathchang-quiz는 mathchang에서 발급한 JWT 토큰을 검증합니다.
// JWT_SECRET은 mathchang과 동일하게 설정해야 합니다.
// DB는 분리되어 있으므로 토큰 payload만 사용합니다.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// JWT 토큰 검증 미들웨어
// mathchang에서 발급한 토큰을 검증하고, payload를 req.user에 저장
const authenticate = async (req, res, next) => {
  try {
    // 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다'
      });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증 (mathchang과 동일한 JWT_SECRET 사용)
    const decoded = jwt.verify(token, JWT_SECRET);

    // mathchang의 JWT payload 구조: { userId, id, userType, isAdmin }
    // DB 조회 없이 토큰 payload를 그대로 사용
    req.user = {
      _id: decoded.id,
      userId: decoded.userId,
      userType: decoded.userType,
      isAdmin: decoded.isAdmin,
      name: decoded.name || decoded.userId, // name이 있으면 사용, 없으면 userId
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '토큰이 만료되었습니다'
      });
    }
    res.status(500).json({
      success: false,
      message: '인증 처리 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// 역할 기반 권한 확인 미들웨어 (mathchang의 userType 사용)
const authorize = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다'
      });
    }

    // mathchang의 userType 기반 권한 확인 (학생, 학부모, 강사)
    // 관리자(강사)는 항상 허용
    if (req.user.isAdmin) {
      return next();
    }

    // allowedTypes에 사용자 유형이 포함되어 있는지 확인
    if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      if (!allowedTypes.includes(req.user.userType)) {
        return res.status(403).json({
          success: false,
          message: '접근 권한이 없습니다'
        });
      }
    }

    next();
  };
};

module.exports = { authenticate, authorize };
