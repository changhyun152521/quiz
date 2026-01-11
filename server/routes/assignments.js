const express = require('express');
const router = express.Router();
const {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAnswers,
  updateTimeSpent,
  saveDraft,
  getDraft
} = require('../controllers/assignmentsController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/assignments - 모든 과제 조회 (페이지네이션 지원)
router.get('/', getAllAssignments);

// GET /api/assignments/:id - 특정 과제 조회
// 인증은 선택적 (토큰이 있으면 사용자 정보 사용, 없으면 비회원으로 처리)
router.get('/:id', async (req, res, next) => {
  // 토큰이 있으면 JWT 검증하여 사용자 정보 추출
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
      const decoded = jwt.verify(token, JWT_SECRET);
      // JWT payload에서 사용자 정보 추출 (DB 조회 없음)
      req.user = {
        _id: decoded.id,
        userId: decoded.userId,
        userType: decoded.userType,
        isAdmin: decoded.isAdmin,
        name: decoded.name || decoded.userId
      };
    } catch (error) {
      // 토큰이 유효하지 않아도 계속 진행 (비회원으로 처리)
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

// POST /api/assignments/:id/heartbeat - 체류 시간 업데이트
router.post('/:id/heartbeat', authenticate, updateTimeSpent);

// POST /api/assignments/:id/save-draft - 풀이 임시저장
router.post('/:id/save-draft', authenticate, saveDraft);

// GET /api/assignments/:id/draft - 임시저장된 풀이 조회
router.get('/:id/draft', authenticate, getDraft);

module.exports = router;

