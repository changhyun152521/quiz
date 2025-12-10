const express = require('express');
const router = express.Router();
const { getStudyReport } = require('../controllers/studentsController');
const { authenticate } = require('../middleware/auth');

// GET /api/students/:studentId/study-report - 학생 학습현황 보고서
router.get('/:studentId/study-report', authenticate, getStudyReport);

module.exports = router;

