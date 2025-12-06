const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // 아이디
  userId: {
    type: String,
    required: [true, '아이디는 필수입니다'],
    unique: true,
    trim: true,
    minlength: [4, '아이디는 최소 4자 이상이어야 합니다'],
    maxlength: [20, '아이디는 최대 20자까지 가능합니다']
  },
  
  // 비밀번호
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다'],
    minlength: [7, '비밀번호는 최소 7자 이상이어야 합니다'],
    match: [/^[a-zA-Z0-9]+$/, '비밀번호는 영문과 숫자만 사용할 수 있습니다']
  },
  
  // 이름
  name: {
    type: String,
    required: [true, '이름은 필수입니다'],
    trim: true,
    maxlength: [50, '이름은 최대 50자까지 가능합니다']
  },
  
  // 학생 연락처
  studentPhone: {
    type: String,
    required: [true, '학생 연락처는 필수입니다'],
    trim: true,
    match: [/^[0-9]{10,11}$/, '올바른 전화번호 형식이 아닙니다']
  },
  
  // 학부모 연락처
  parentPhone: {
    type: String,
    required: [true, '학부모 연락처는 필수입니다'],
    trim: true,
    match: [/^[0-9]{10,11}$/, '올바른 전화번호 형식이 아닙니다']
  },
  
  // 이메일
  email: {
    type: String,
    required: [true, '이메일은 필수입니다'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, '올바른 이메일 형식이 아닙니다']
  },
  
  // 학교명
  schoolName: {
    type: String,
    required: [true, '학교명은 필수입니다'],
    trim: true,
    maxlength: [100, '학교명은 최대 100자까지 가능합니다']
  },
  
  // 학년
  grade: {
    type: String,
    required: [true, '학년은 필수입니다'],
    enum: ['초등', '중등', '고1', '고2', '고3'],
    validate: {
      validator: function(value) {
        return ['초등', '중등', '고1', '고2', '고3'].includes(value);
      },
      message: '학년은 초등, 중등, 고1, 고2, 고3 중 하나여야 합니다'
    }
  },
  
  // 개인정보 수집 및 이용 동의
  privacyConsent: {
    type: Boolean,
    required: [true, '개인정보 수집 및 이용 동의는 필수입니다'],
    default: false,
    validate: {
      validator: function(value) {
        return value === true;
      },
      message: '개인정보 수집 및 이용에 동의해야 합니다'
    }
  },
  
  // 서비스 이용약관 동의
  termsConsent: {
    type: Boolean,
    required: [true, '서비스 이용약관 동의는 필수입니다'],
    default: false,
    validate: {
      validator: function(value) {
        return value === true;
      },
      message: '서비스 이용약관에 동의해야 합니다'
    }
  },

  // 역할 (관리자/학생/강사)
  role: {
    type: String,
    enum: ['student', 'admin', 'teacher'],
    default: 'student'
  }
}, {
  // timestamps 옵션으로 createdAt, updatedAt 자동 생성
  timestamps: true
});

// 비밀번호 해시화 (저장 전)
userSchema.pre('save', async function(next) {
  // 비밀번호가 변경되지 않았거나 이미 해시화되어 있으면 해시화하지 않음
  if (!this.isModified('password')) {
    return next();
  }

  // 이미 해시화된 비밀번호인지 확인 ($2로 시작하는 bcrypt 해시)
  if (this.password && this.password.startsWith('$2')) {
    return next();
  }

  try {
    // 비밀번호 해시화 (salt rounds: 10)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 비교 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 참고: userId와 email은 unique: true로 이미 인덱스가 자동 생성되므로
// 별도로 인덱스를 추가할 필요가 없습니다.

// 모델 생성 및 export
const User = mongoose.model('User', userSchema);

module.exports = User;

