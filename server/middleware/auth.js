const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

// JWT 토큰 검증 미들웨어
const authenticate = async (req, res, next) => {
  try {
    // 헤더에서 토큰 추출
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다'
      });
    }

    // 토큰 검증 (utils/jwt.js의 verifyToken 사용)
    const decoded = verifyToken(token);

    // 사용자 찾기
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '사용자를 찾을 수 없습니다'
      });
    }

    // 요청 객체에 사용자 정보 추가
    req.user = user;
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

// 역할 기반 권한 확인 미들웨어
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다'
      });
    }

    // roles가 배열이고, 사용자의 role이 포함되어 있는지 확인
    if (Array.isArray(roles) && roles.length > 0) {
      // User 모델의 role 필드와 비교 (예: 'admin', 'teacher', 'student')
      // roles 배열에 'admin'이 있으면 admin 역할 허용
      // roles 배열에 'teacher'가 있으면 teacher 역할 허용
      const userRole = req.user.role || 'student';
      
      if (!roles.includes(userRole)) {
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

