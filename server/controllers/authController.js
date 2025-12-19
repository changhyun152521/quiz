// mathchang-quiz는 mathchang의 인증 API를 프록시하여 사용합니다.
// 로그인 요청은 mathchang 서버로 전달되고, 발급받은 토큰을 반환합니다.

const MATHCHANG_API_URL = process.env.MATHCHANG_API_URL || 'https://api.mathchang.com';

// POST /api/auth/login - 로그인 (mathchang API 프록시)
const login = async (req, res) => {
  try {
    const { userId, password, rememberMe } = req.body;

    // 필수 필드 검증
    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: '아이디와 비밀번호를 입력해주세요'
      });
    }

    // mathchang API로 로그인 요청 전달
    const response = await fetch(`${MATHCHANG_API_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, password, rememberMe }),
    });

    const data = await response.json();

    // 디버깅: mathchang 응답 로그
    console.log('mathchang 로그인 응답:', JSON.stringify(data, null, 2));

    // mathchang 응답을 그대로 반환
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // 학부모는 로그인 차단
    const user = data.data;
    if (user.userType === '학부모') {
      return res.status(403).json({
        success: false,
        message: '학부모 계정은 퀴즈 시스템을 이용할 수 없습니다. 학생 계정으로 로그인해주세요.'
      });
    }

    // 로그인 성공 - mathchang 응답 구조 변환
    // mathchang: { success, message, token, data: userObject }
    // quiz 클라이언트 기대: { success, message, data: { token, user } }
    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        token: data.token,
        user: user
      }
    });
  } catch (error) {
    console.error('로그인 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// POST /api/auth/find-userid - 아이디 찾기 (mathchang API 프록시)
const findUserId = async (req, res) => {
  try {
    const { name, email } = req.body;

    // 필수 필드 검증
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: '이름과 이메일을 입력해주세요'
      });
    }

    // mathchang API로 아이디 찾기 요청 전달
    const response = await fetch(`${MATHCHANG_API_URL}/api/users/find-userid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email }),
    });

    const data = await response.json();

    // mathchang 응답을 그대로 반환
    res.status(response.status).json(data);
  } catch (error) {
    console.error('아이디 찾기 프록시 오류:', error);
    res.status(500).json({
      success: false,
      message: '아이디 찾기 처리 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// GET /api/auth/verify - 토큰 검증
// 토큰은 mathchang에서 발급되었으므로 동일한 JWT_SECRET으로 검증
const verifyToken = async (req, res) => {
  try {
    // authenticate 미들웨어를 통해 이미 검증됨
    // req.user에는 토큰 payload가 들어있음 (DB 조회 없음)
    const user = req.user;

    res.json({
      success: true,
      message: '토큰이 유효합니다',
      data: {
        user: user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '토큰 검증 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

module.exports = {
  login,
  findUserId,
  verifyToken
};
