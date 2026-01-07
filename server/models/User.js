// mathchang-quiz에서 mathchang의 User 컬렉션을 읽기 위한 모델
// 동일한 MongoDB를 사용하므로 populate가 가능합니다.
// 이 모델은 읽기 전용으로 사용됩니다. (회원가입/수정은 mathchang에서만)

const mongoose = require('mongoose');

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

// mathchang과 동일한 'User' 모델명 사용 (같은 컬렉션 참조)
const User = mongoose.model('User', userSchema);

module.exports = User;
