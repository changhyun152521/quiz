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

// GET /api/users - 사용자 목록 조회 (mathchang API 프록시)
router.get('/', getAllUsers);

// GET /api/users/:id - 특정 사용자 조회 (mathchang API 프록시)
router.get('/:id', getUserById);

// POST /api/users - 사용자 생성 (mathchang API 프록시)
router.post('/', createUser);

// PUT /api/users/:id - 사용자 수정 (mathchang API 프록시)
router.put('/:id', updateUser);

// DELETE /api/users/:id - 사용자 삭제 (mathchang API 프록시)
router.delete('/:id', deleteUser);

// PATCH /api/users/:id/password - 비밀번호 변경 (mathchang API 프록시)
router.patch('/:id/password', updatePassword);

module.exports = router;
