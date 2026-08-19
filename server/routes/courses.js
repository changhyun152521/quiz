const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addStudentToCourse,
  removeStudentFromCourse,
  getTeachers,
  getStudents,
  getCoursesByStudent,
  addAssignmentToCourse,
  removeAssignmentFromCourse
} = require('../controllers/coursesController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/courses/teachers - 강사 목록 조회 (mathchang API 프록시)
router.get('/teachers', authenticate, authorize(['학생', '강사']), getTeachers);

// GET /api/courses/students - 학생 목록 조회 (mathchang API 프록시)
router.get('/students', authenticate, authorize(['강사']), getStudents);

// GET /api/courses/student/:studentId - 특정 학생이 등록된 강좌 목록 조회
router.get('/student/:studentId', authenticate, authorize(['학생', '강사']), getCoursesByStudent);

// GET /api/courses - 모든 강좌 조회 (페이지네이션 지원)
router.get('/', authenticate, authorize(['학생', '강사']), getAllCourses);

// GET /api/courses/:id - 특정 강좌 조회
router.get('/:id', authenticate, authorize(['학생', '강사']), getCourseById);

// POST /api/courses - 새 강좌 생성
router.post('/', authenticate, authorize(['강사']), createCourse);

// PUT /api/courses/:id - 강좌 정보 수정
router.put('/:id', authenticate, authorize(['강사']), updateCourse);

// DELETE /api/courses/:id - 강좌 삭제
router.delete('/:id', authenticate, authorize(['강사']), deleteCourse);

// POST /api/courses/:id/students - 학생 등록
router.post('/:id/students', authenticate, authorize(['강사']), addStudentToCourse);

// DELETE /api/courses/:id/students/:studentId - 학생 취소
router.delete('/:id/students/:studentId', authenticate, authorize(['강사']), removeStudentFromCourse);

// POST /api/courses/:id/assignments - 강좌에 과제 추가
router.post('/:id/assignments', authenticate, authorize(['강사']), addAssignmentToCourse);

// DELETE /api/courses/:id/assignments/:assignmentId - 강좌에서 과제 제거
router.delete('/:id/assignments/:assignmentId', authenticate, authorize(['강사']), removeAssignmentFromCourse);

module.exports = router;
