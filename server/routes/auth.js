const express = require('express');
const router = express.Router();
const { login, findUserId, verifyToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login - 로그인 (mathchang API 프록시)
router.post('/login', login);

// POST /api/auth/find-userid - 아이디 찾기 (mathchang API 프록시)
router.post('/find-userid', findUserId);

// GET /api/auth/verify - 토큰 검증
router.get('/verify', authenticate, verifyToken);

module.exports = router;
