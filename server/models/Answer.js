const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  // 과제 ID (Assignment 모델 참조)
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, '과제 ID는 필수입니다']
  },

  // 강좌 ID (Course 모델 참조)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, '강좌 ID는 필수입니다']
  },

  // 문항 번호 (1부터 시작)
  questionNumber: {
    type: Number,
    required: [true, '문항 번호는 필수입니다'],
    min: [1, '문항 번호는 1 이상이어야 합니다']
  },

  // 정답
  answer: {
    type: String,
    required: [true, '정답은 필수입니다'],
    trim: true,
    maxlength: [50, '정답은 최대 50자까지 가능합니다']
  },

  // 배점 (선택사항)
  points: {
    type: Number,
    default: 1,
    min: [0, '배점은 0 이상이어야 합니다']
  }
}, {
  timestamps: true
});

// 복합 인덱스: 과제 + 강좌 + 문항 번호는 유일해야 함
answerSchema.index({ assignment: 1, course: 1, questionNumber: 1 }, { unique: true });

// 인덱스 추가
answerSchema.index({ assignment: 1 });
answerSchema.index({ course: 1 });
answerSchema.index({ questionNumber: 1 });

const Answer = mongoose.model('Answer', answerSchema);

module.exports = Answer;
