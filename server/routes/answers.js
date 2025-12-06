const express = require('express');
const router = express.Router();
const {
  getAllAnswers,
  getAnswerById,
  getAnswersByAssignmentAndCourse,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  deleteAnswersByAssignmentAndCourse
} = require('../controllers/answersController');
const { authenticate, authorize } = require('../middleware/auth');

// 라우트 순서 중요: 구체적인 라우트가 먼저 와야 함
// GET /api/answers/assignment/:assignmentId/course/:courseId - 특정 과제와 강좌의 모든 정답 조회
router.get('/assignment/:assignmentId/course/:courseId', authenticate, authorize(['admin', 'teacher']), getAnswersByAssignmentAndCourse);

// GET /api/answers/assignment/:assignmentId - 특정 과제의 모든 정답 조회 (강좌 무관)
router.get('/assignment/:assignmentId', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const Answer = require('../models/Answer');
    const { assignmentId } = req.params;
    const answers = await Answer.find({ assignment: assignmentId })
      .populate('assignment', 'assignmentName questionCount')
      .populate('course', 'courseName')
      .sort({ questionNumber: 1 });
    res.json({ success: true, data: answers });
  } catch (error) {
    res.status(500).json({ success: false, message: '정답 조회 실패', error: error.message });
  }
});

// GET /api/answers - 모든 정답 조회
router.get('/', authenticate, authorize(['admin', 'teacher']), getAllAnswers);

// GET /api/answers/:id - 특정 정답 조회
router.get('/:id', authenticate, authorize(['admin', 'teacher']), getAnswerById);

// POST /api/answers - 새 정답 생성 (또는 여러 정답 일괄 생성)
router.post('/', authenticate, authorize(['admin', 'teacher']), createAnswer);

// PUT /api/answers/:id - 정답 수정
router.put('/:id', authenticate, authorize(['admin', 'teacher']), updateAnswer);

// DELETE /api/answers/assignment/:assignmentId/course/:courseId - 특정 과제와 강좌의 모든 정답 삭제
router.delete('/assignment/:assignmentId/course/:courseId', authenticate, authorize(['admin', 'teacher']), deleteAnswersByAssignmentAndCourse);

// DELETE /api/answers/:id - 정답 삭제
router.delete('/:id', authenticate, authorize(['admin', 'teacher']), deleteAnswer);

module.exports = router;
