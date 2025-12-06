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
const { authenticate } = require('../middleware/auth');

// GET /api/assignments - 모든 과제 조회 (페이지네이션 지원)
router.get('/', getAllAssignments);

// GET /api/assignments/:id - 특정 과제 조회
router.get('/:id', getAssignmentById);

// POST /api/assignments - 새 과제 생성
router.post('/', createAssignment);

// PUT /api/assignments/:id - 과제 정보 수정
router.put('/:id', updateAssignment);

// DELETE /api/assignments/:id - 과제 삭제
router.delete('/:id', deleteAssignment);

// POST /api/assignments/:id/submit - 학생 답안 제출 및 채점
router.post('/:id/submit', authenticate, submitAnswers);

module.exports = router;

