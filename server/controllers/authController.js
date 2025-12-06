const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

// POST /api/auth/login - 로그인
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

    // 사용자 찾기
    const user = await User.findOne({ userId });

    if (!user) {
      console.log(`로그인 실패: 사용자를 찾을 수 없음 - userId: ${userId}`);
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 일치하지 않습니다'
      });
    }

    console.log(`사용자 찾음: userId: ${userId}, name: ${user.name}`);
    console.log(`저장된 비밀번호 타입: ${typeof user.password}`);
    console.log(`저장된 비밀번호 길이: ${user.password ? user.password.length : 0}`);
    console.log(`저장된 비밀번호 시작: ${user.password ? user.password.substring(0, 10) : '없음'}`);

    // 비밀번호 확인
    try {
      // 비밀번호가 해시화되지 않은 경우 (레거시 데이터) 처리
      if (!user.password || !user.password.startsWith('$2')) {
        console.log(`경고: 비밀번호가 해시화되지 않은 형식입니다. userId: ${userId}`);
        // 직접 비교 (레거시 지원)
        if (user.password === password) {
          // 비밀번호를 해시화하여 업데이트
          const bcrypt = require('bcrypt');
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(password, salt);
          await user.save();
          console.log(`비밀번호를 해시화하여 업데이트했습니다. userId: ${userId}`);
        } else {
          console.log(`로그인 실패: 비밀번호 불일치 (레거시) - userId: ${userId}`);
          return res.status(401).json({
            success: false,
            message: '아이디 또는 비밀번호가 일치하지 않습니다'
          });
        }
      } else {
        // 정상적인 해시화된 비밀번호 비교
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
          console.log(`로그인 실패: 비밀번호 불일치 - userId: ${userId}`);
          return res.status(401).json({
            success: false,
            message: '아이디 또는 비밀번호가 일치하지 않습니다'
          });
        }
      }
    } catch (error) {
      console.error('비밀번호 비교 오류:', error);
      console.error('오류 스택:', error.stack);
      return res.status(500).json({
        success: false,
        message: '비밀번호 확인 중 오류가 발생했습니다',
        error: error.message
      });
    }

    console.log(`로그인 성공: userId: ${userId}, name: ${user.name}`);

    // JWT 토큰 생성 (자동로그인 여부에 따라 만료 시간 다르게 설정)
    const token = generateToken(user._id.toString(), rememberMe === true);

    // 비밀번호 제외하고 응답
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// POST /api/auth/find-userid - 아이디 찾기
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

    // 사용자 찾기
    const user = await User.findOne({ 
      name: name.trim(),
      email: email.trim().toLowerCase()
    }).select('userId name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '일치하는 사용자 정보를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '아이디 찾기 성공',
      data: {
        userId: user.userId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '아이디 찾기 처리 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// GET /api/auth/verify - 토큰 검증 (자동로그인용)
const verifyToken = async (req, res) => {
  try {
    // authenticate 미들웨어를 통해 이미 검증됨
    const user = req.user;

    // 비밀번호 제외하고 사용자 정보 반환
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: '토큰이 유효합니다',
      data: {
        user: userResponse
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

