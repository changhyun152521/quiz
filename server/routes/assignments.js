const express = require('express');
const router = express.Router();
const {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAnswers
} = require('../controllers/assignmentsController');
const { authenticate, authorize } = require('../middleware/auth');
const { cleanupOldSolutions } = require('../jobs/cleanupOldSolutions');

// GET /api/assignments - 모든 과제 조회 (페이지네이션 지원)
router.get('/', getAllAssignments);

// GET /api/assignments/:id - 특정 과제 조회
// 인증은 선택적 (토큰이 있으면 사용자 정보 사용, 없으면 비회원으로 처리)
router.get('/:id', async (req, res, next) => {
  // 토큰이 있으면 authenticate 미들웨어 실행
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const { verifyToken } = require('../utils/jwt');
      const User = require('../models/User');
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // 토큰이 유효하지 않아도 계속 진행 (비회원으로 처리)
      console.log('[getAssignmentById] 토큰 검증 실패, 비회원으로 처리:', error.message);
    }
  }
  next();
}, getAssignmentById);

// POST /api/assignments - 새 과제 생성
router.post('/', createAssignment);

// PUT /api/assignments/:id - 과제 정보 수정
router.put('/:id', updateAssignment);

// DELETE /api/assignments/:id - 과제 삭제
router.delete('/:id', deleteAssignment);

// POST /api/assignments/:id/submit - 학생 답안 제출 및 채점
router.post('/:id/submit', authenticate, submitAnswers);

// POST /api/assignments/cleanup-old-solutions - 오래된 풀이 이미지 수동 삭제 (관리자/강사만)
router.post('/cleanup-old-solutions', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    await cleanupOldSolutions();
    res.json({
      success: true,
      message: '오래된 풀이 이미지 삭제 작업이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '삭제 작업 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;

