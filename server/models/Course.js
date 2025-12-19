// mathchang-quiz는 mathchang의 인증을 사용합니다.
// 사용자 정보는 mathchang의 사용자 ID(문자열)로만 참조합니다.
// 사용자 상세 정보가 필요한 경우 mathchang API를 호출합니다.

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // 강좌 이름
  courseName: {
    type: String,
    required: [true, '강좌 이름은 필수입니다'],
    trim: true,
    maxlength: [100, '강좌 이름은 최대 100자까지 가능합니다']
  },

  // 강사 ID (mathchang 사용자 _id, ref 없이 ObjectId만 저장)
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, '강사는 필수입니다']
  },

  // 강사 이름 (표시용 - 비정규화)
  teacherName: {
    type: String,
    required: [true, '강사 이름은 필수입니다'],
    trim: true
  },

  // 등록된 학생들 (mathchang 사용자 _id 배열, ref 없이 ObjectId만 저장)
  students: [{
    type: mongoose.Schema.Types.ObjectId
  }],

  // 학생 이름 배열 (표시용 - 비정규화)
  studentNames: [{
    type: String
  }],

  // 등록된 과제들 (Assignment 모델 참조 배열)
  assignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  }]
}, {
  // timestamps 옵션으로 createdAt, updatedAt 자동 생성
  timestamps: true
});

// 인덱스 추가 (검색 성능 향상)
courseSchema.index({ courseName: 1 });
courseSchema.index({ teacher: 1 });
courseSchema.index({ 'students': 1 });

// 모델 생성 및 export
const Course = mongoose.model('Course', courseSchema);

module.exports = Course;

