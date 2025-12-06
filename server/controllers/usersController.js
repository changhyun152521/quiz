const User = require('../models/User');

// GET /api/users - 모든 유저 조회 (페이지네이션 지원)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password') // 비밀번호 제외
      .sort({ createdAt: -1 }) // 최신순 정렬
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '유저 목록 조회 실패',
      error: error.message
    });
  }
};

// GET /api/users/:id - 특정 유저 조회
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '유저 조회 실패',
      error: error.message
    });
  }
};

// GET /api/users/userId/:userId - userId로 유저 조회
const getUserByUserId = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '유저 조회 실패',
      error: error.message
    });
  }
};

// POST /api/users - 새 유저 생성
const createUser = async (req, res) => {
  try {
    const {
      userId,
      password,
      name,
      studentPhone,
      parentPhone,
      email,
      schoolName,
      grade,
      privacyConsent,
      termsConsent,
      role
    } = req.body;

    // 기본 필수 필드 검증
    if (!userId || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '아이디, 비밀번호, 이름은 필수입니다'
      });
    }

    // 강사가 아닌 경우 추가 필수 필드 검증
    if (role !== 'teacher') {
      if (!studentPhone || !parentPhone || !email || !schoolName || !grade) {
        return res.status(400).json({
          success: false,
          message: '필수 필드가 누락되었습니다'
        });
      }

      // 동의 필드 검증
      if (privacyConsent !== true || termsConsent !== true) {
        return res.status(400).json({
          success: false,
          message: '개인정보 수집 및 이용 동의와 서비스 이용약관 동의가 필요합니다'
        });
      }
    }

    // 중복 체크
    const existingUser = await User.findOne({
      $or: role === 'teacher' 
        ? [{ userId }] 
        : [{ userId }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.userId === userId 
          ? '이미 사용 중인 아이디입니다' 
          : '이미 사용 중인 이메일입니다'
      });
    }

    // 새 유저 생성
    const newUser = new User({
      userId,
      password, // pre-save hook에서 자동으로 해시화됨
      name,
      studentPhone: role === 'teacher' ? studentPhone || '00000000000' : studentPhone,
      parentPhone: role === 'teacher' ? parentPhone || '00000000000' : parentPhone,
      email: role === 'teacher' ? email || `${userId}@teacher.com` : email,
      schoolName: role === 'teacher' ? schoolName || '강사' : schoolName,
      grade: role === 'teacher' ? grade || '초등' : grade,
      privacyConsent: role === 'teacher' ? true : privacyConsent,
      termsConsent: role === 'teacher' ? true : termsConsent,
      role: role || 'student'
    });

    // 데이터베이스에 저장
    const savedUser = await newUser.save();

    // 비밀번호 제외하고 응답
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: '유저가 성공적으로 생성되었습니다',
      data: userResponse
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '입력 데이터 검증 실패',
        error: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 아이디 또는 이메일입니다'
      });
    }

    res.status(500).json({
      success: false,
      message: '유저 생성 실패',
      error: error.message
    });
  }
};

// PUT /api/users/:id - 유저 정보 수정
const updateUser = async (req, res) => {
  try {
    const {
      userId,
      name,
      studentPhone,
      parentPhone,
      email,
      schoolName,
      grade
    } = req.body;

    // 수정 가능한 필드만 추출
    const updateData = {};
    if (userId) updateData.userId = userId;
    if (name) updateData.name = name;
    if (studentPhone) updateData.studentPhone = studentPhone;
    if (parentPhone) updateData.parentPhone = parentPhone;
    if (email) updateData.email = email;
    if (schoolName) updateData.schoolName = schoolName;
    if (grade !== undefined) {
      // 학년은 초등, 중등, 고1, 고2, 고3만 허용
      if (['초등', '중등', '고1', '고2', '고3'].includes(grade)) {
        updateData.grade = grade;
      } else {
        return res.status(400).json({
          success: false,
          message: '학년은 초등, 중등, 고1, 고2, 고3 중 하나여야 합니다'
        });
      }
    }

    // 수정할 데이터가 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 데이터가 없습니다'
      });
    }

    // userId 중복 체크 (다른 유저가 사용 중인지)
    if (updateData.userId) {
      const existingUser = await User.findOne({
        userId: updateData.userId,
        _id: { $ne: req.params.id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 아이디입니다'
        });
      }
    }

    // 이메일 중복 체크 (다른 유저가 사용 중인지)
    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: req.params.id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 이메일입니다'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '유저 정보가 성공적으로 수정되었습니다',
      data: updatedUser
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '입력 데이터 검증 실패',
        error: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 이메일입니다'
      });
    }

    res.status(500).json({
      success: false,
      message: '유저 정보 수정 실패',
      error: error.message
    });
  }
};

// PATCH /api/users/:id/password - 비밀번호 변경
const updatePassword = async (req, res) => {
  try {
    const { password, newPassword } = req.body;

    if (!password || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호와 새 비밀번호가 필요합니다'
      });
    }

    if (newPassword.length < 7) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 최소 7자 이상이어야 합니다'
      });
    }

    if (!/^[a-zA-Z0-9]+$/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 영문과 숫자만 사용할 수 있습니다'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다'
      });
    }

    // 현재 비밀번호 검증
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '현재 비밀번호가 일치하지 않습니다'
      });
    }

    // 새 비밀번호 설정 (pre-save hook에서 자동으로 해시화됨)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '비밀번호 변경 실패',
      error: error.message
    });
  }
};

// PATCH /api/users/:id/reset-password - 관리자가 사용자 비밀번호 강제 재설정
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호가 필요합니다'
      });
    }

    if (newPassword.length < 7) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 최소 7자 이상이어야 합니다'
      });
    }

    if (!/^[a-zA-Z0-9]+$/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 영문과 숫자만 사용할 수 있습니다'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다'
      });
    }

    // 새 비밀번호 설정 (pre-save hook에서 자동으로 해시화됨)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 재설정되었습니다'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '입력 데이터 검증 실패',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '비밀번호 재설정 실패',
      error: error.message
    });
  }
};

// DELETE /api/users/:id - 유저 삭제
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '유저가 성공적으로 삭제되었습니다',
      data: {
        id: deletedUser._id,
        userId: deletedUser.userId,
        name: deletedUser.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '유저 삭제 실패',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserByUserId,
  createUser,
  updateUser,
  updatePassword,
  resetUserPassword,
  deleteUser
};

