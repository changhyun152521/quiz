// mathchang-quiz에서 mathchang DB의 User 컬렉션을 읽기 위한 모델
// mathchang DB에 별도 연결하여 User를 조회합니다.
// 이 모델은 읽기 전용으로 사용됩니다. (회원가입/수정은 mathchang에서만)

const mongoose = require('mongoose');
const { getMathchangConnection } = require('../config/database');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    schoolName: {
      type: String,
      trim: true,
    },
    studentContact: {
      type: String,
      trim: true,
    },
    parentContact: {
      type: String,
      trim: true,
    },
    userType: {
      type: String,
      enum: ['학생', '학부모', '강사'],
      default: '학생',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// User 모델을 가져오는 함수 (mathchang DB 연결 사용)
let UserModel = null;

const getUser = () => {
  if (UserModel) return UserModel;

  const mathchangConn = getMathchangConnection();
  if (mathchangConn) {
    // mathchang DB 연결이 있으면 해당 연결에서 User 모델 생성
    UserModel = mathchangConn.model('User', userSchema);
    console.log('✓ User model created on mathchang DB');
  } else {
    // mathchang DB 연결이 없으면 기본 mongoose 연결 사용 (fallback)
    UserModel = mongoose.model('User', userSchema);
    console.log('⚠ User model created on default connection (quiz DB)');
  }

  return UserModel;
};

module.exports = getUser;
