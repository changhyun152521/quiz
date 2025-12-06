const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  getUserByUserId,
  createUser,
  updateUser,
  updatePassword,
  resetUserPassword,
  deleteUser
} = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/users - 모든 유저 조회 (페이지네이션 지원)
router.get('/', getAllUsers);

// GET /api/users/userId/:userId - userId로 유저 조회 (이 라우트를 :id 라우트보다 먼저 배치)
router.get('/userId/:userId', getUserByUserId);

// GET /api/users/:id - 특정 유저 조회
router.get('/:id', getUserById);

// POST /api/users - 새 유저 생성
router.post('/', createUser);

// PUT /api/users/:id - 유저 정보 수정
router.put('/:id', updateUser);

// PATCH /api/users/:id/password - 비밀번호 변경
router.patch('/:id/password', updatePassword);

// PATCH /api/users/:id/reset-password - 관리자가 사용자 비밀번호 강제 재설정
router.patch('/:id/reset-password', authenticate, authorize(['admin']), resetUserPassword);

// DELETE /api/users/:id - 유저 삭제
router.delete('/:id', deleteUser);

module.exports = router;

