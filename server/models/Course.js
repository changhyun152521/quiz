const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // 강좌 이름
  courseName: {
    type: String,
    required: [true, '강좌 이름은 필수입니다'],
    trim: true,
    maxlength: [100, '강좌 이름은 최대 100자까지 가능합니다']
  },

  // 강사 (User 모델 참조)
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '강사는 필수입니다']
  },

  // 강사 이름 (검색 및 표시용)
  teacherName: {
    type: String,
    required: [true, '강사 이름은 필수입니다'],
    trim: true
  },

  // 등록된 학생들 (User 모델 참조 배열)
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 학생 이름 배열 (검색 및 표시용)
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

