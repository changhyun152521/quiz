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
  getDraft,
  getStudentStrokeData
} = require('../controllers/assignmentsController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/assignments - 모든 과제 조회 (페이지네이션 지원)
router.get('/', authenticate, authorize(['강사']), getAllAssignments);

// GET /api/assignments/:id - 특정 과제 조회
// 과제와 정답/제출 정보는 인증된 학생 또는 강사만 조회합니다.
router.get('/:id', authenticate, authorize(['학생', '강사']), getAssignmentById);

// POST /api/assignments - 새 과제 생성
router.post('/', authenticate, authorize(['강사']), createAssignment);

// PUT /api/assignments/:id - 과제 정보 수정
router.put('/:id', authenticate, authorize(['강사']), updateAssignment);

// DELETE /api/assignments/:id - 과제 삭제
router.delete('/:id', authenticate, authorize(['강사']), deleteAssignment);

// POST /api/assignments/:id/submit - 학생 답안 제출 및 채점
router.post('/:id/submit', authenticate, authorize(['학생']), submitAnswers);

// POST /api/assignments/:id/heartbeat - 체류 시간 업데이트
router.post('/:id/heartbeat', authenticate, authorize(['학생']), updateTimeSpent);

// POST /api/assignments/:id/save-draft - 풀이 임시저장
router.post('/:id/save-draft', authenticate, authorize(['학생']), saveDraft);

// GET /api/assignments/:id/draft - 임시저장된 풀이 조회
router.get('/:id/draft', authenticate, authorize(['학생']), getDraft);

// GET /api/assignments/:id/stroke-data/:studentId - 특정 학생의 strokeData 조회 (선생님용)
router.get('/:id/stroke-data/:studentId', authenticate, authorize(['강사']), getStudentStrokeData);

module.exports = router;
