// mathchang-quiz는 mathchang의 사용자 관리 API를 프록시합니다.
// 모든 사용자 CRUD 작업은 mathchang 서버로 전달됩니다.

const MATHCHANG_API_URL = process.env.MATHCHANG_API_URL || 'https://api.mathchang.com';

// GET /api/users - 사용자 목록 조회
const getAllUsers = async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${MATHCHANG_API_URL}/api/users${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('사용자 목록 조회 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// GET /api/users/:id - 특정 사용자 조회
const getUserById = async (req, res) => {
  try {
    const response = await fetch(`${MATHCHANG_API_URL}/api/users/${req.params.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('사용자 조회 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 조회 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// POST /api/users - 사용자 생성
const createUser = async (req, res) => {
  try {
    const response = await fetch(`${MATHCHANG_API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('사용자 생성 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 생성 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// PUT /api/users/:id - 사용자 수정
const updateUser = async (req, res) => {
  try {
    const response = await fetch(`${MATHCHANG_API_URL}/api/users/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('사용자 수정 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 수정 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// DELETE /api/users/:id - 사용자 삭제
const deleteUser = async (req, res) => {
  try {
    const response = await fetch(`${MATHCHANG_API_URL}/api/users/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('사용자 삭제 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 삭제 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// PATCH /api/users/:id/password - 비밀번호 변경
const updatePassword = async (req, res) => {
  try {
    const response = await fetch(`${MATHCHANG_API_URL}/api/users/${req.params.id}/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('비밀번호 변경 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updatePassword
};
