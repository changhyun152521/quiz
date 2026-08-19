const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updatePassword
} = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/users - 사용자 목록 조회 (mathchang API 프록시)
router.get('/', authenticate, authorize(['강사']), getAllUsers);

// GET /api/users/:id - 특정 사용자 조회 (mathchang API 프록시)
router.get('/:id', authenticate, authorize(['강사']), getUserById);

// POST /api/users - 사용자 생성 (mathchang API 프록시)
router.post('/', authenticate, authorize(['강사']), createUser);

// PUT /api/users/:id - 사용자 수정 (mathchang API 프록시)
router.put('/:id', authenticate, authorize(['강사']), updateUser);

// DELETE /api/users/:id - 사용자 삭제 (mathchang API 프록시)
router.delete('/:id', authenticate, authorize(['강사']), deleteUser);

// PATCH /api/users/:id/password - 비밀번호 변경 (mathchang API 프록시)
router.patch('/:id/password', authenticate, authorize(['강사']), updatePassword);

module.exports = router;
