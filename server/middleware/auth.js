// mathchang-quiz는 mathchang에서 발급한 JWT를 검증하고 원장 DB에서
// 현재 사용자/토큰 버전을 확인합니다. stale payload를 권한 정보로 신뢰하지 않습니다.

const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const getUser = require('../models/User');

const JWT_SECRET = getJwtSecret();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // 비밀번호 재설정으로 tokenVersion이 증가하면 이전 JWT는 즉시 폐기된다.
    const currentUser = await getUser()
      .findById(decoded.id)
      .select('tokenVersion passwordChangedAt userId userType name phone parentContact studentContact')
      .lean()
      .exec();
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 만료되었습니다'
      });
    }

    const tokenVersion = Number.isInteger(decoded.tokenVersion)
      ? decoded.tokenVersion
      : Number(decoded.tokenVersion || 0);
    const currentTokenVersion = Number.isInteger(currentUser.tokenVersion)
      ? currentUser.tokenVersion
      : Number(currentUser.tokenVersion || 0);
    const tokenPasswordChangedAt = Number(decoded.passwordChangedAt || 0);
    const currentPasswordChangedAt = currentUser.passwordChangedAt
      ? new Date(currentUser.passwordChangedAt).getTime()
      : 0;
    if (
      !Number.isInteger(tokenVersion)
      || tokenVersion !== currentTokenVersion
      || (currentPasswordChangedAt > 0 && tokenPasswordChangedAt < currentPasswordChangedAt)
    ) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 만료되었습니다'
      });
    }

    req.user = {
      _id: decoded.id,
      userId: currentUser.userId,
      userType: currentUser.userType,
      name: currentUser.name || currentUser.userId,
      phone: currentUser.phone,
      parentContact: currentUser.parentContact,
      studentContact: currentUser.studentContact,
      tokenVersion: currentTokenVersion,
    };

    return next();
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
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 만료되었습니다'
    });
  }
};

const authorize = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다'
      });
    }

    if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      if (!allowedTypes.includes(req.user.userType)) {
        return res.status(403).json({
          success: false,
          message: '접근 권한이 없습니다'
        });
      }
    }

    return next();
  };
};

module.exports = { authenticate, authorize };
