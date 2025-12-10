const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  // 과제명
  assignmentName: {
    type: String,
    required: [true, '과제명은 필수입니다'],
    trim: true,
    maxlength: [100, '과제명은 최대 100자까지 가능합니다']
  },

  // 과목
  subject: {
    type: String,
    required: [true, '과목은 필수입니다'],
    trim: true,
    maxlength: [50, '과목은 최대 50자까지 가능합니다'],
    enum: ['중1-1', '중1-2', '중2-1', '중2-2', '중3-1', '중3-2', '공통수학1', '공통수학2', '대수', '미적분1', '미적분2', '확률과통계', '기하']
  },

  // 대단원
  mainUnit: {
    type: String,
    required: [true, '대단원은 필수입니다'],
    trim: true,
    maxlength: [100, '대단원은 최대 100자까지 가능합니다']
  },

  // 소단원
  subUnit: {
    type: String,
    required: [true, '소단원은 필수입니다'],
    trim: true,
    maxlength: [100, '소단원은 최대 100자까지 가능합니다']
  },

  // 문항 수
  questionCount: {
    type: Number,
    required: [true, '문항 수는 필수입니다'],
    min: [1, '문항 수는 최소 1개 이상이어야 합니다']
  },

  // 과제 타입 (QUIZ, 클리닉)
  assignmentType: {
    type: String,
    required: [true, '과제 타입은 필수입니다'],
    enum: ['QUIZ', '클리닉'],
    default: 'QUIZ'
  },

  // 과제 시작일
  startDate: {
    type: Date,
    required: [true, '과제 시작일은 필수입니다']
  },

  // 과제 제출일
  dueDate: {
    type: Date,
    required: [true, '과제 제출일은 필수입니다'],
    validate: {
      validator: function(value) {
        // 제출일은 시작일 이후여야 함
        return !this.startDate || value >= this.startDate;
      },
      message: '과제 제출일은 시작일 이후여야 합니다'
    }
  },

  // 업로드된 파일 URL 배열 (Cloudinary) - 여러 파일 지원 (하위 호환성 유지)
  fileUrl: {
    type: [String],
    default: []
  },

  // 파일 타입 배열 (image/pdf) - 여러 파일 지원 (하위 호환성 유지)
  fileType: {
    type: [String],
    enum: ['image', 'pdf'],
    default: []
  },

  // 문제지 파일 URL 배열 (Cloudinary) - 여러 파일 지원
  questionFileUrl: {
    type: [String],
    default: []
  },

  // 문제지 파일 타입 배열 (image/pdf) - 여러 파일 지원
  questionFileType: {
    type: [String],
    enum: ['image', 'pdf'],
    default: []
  },

  // 해설지 파일 URL 배열 (Cloudinary) - 여러 파일 지원
  solutionFileUrl: {
    type: [String],
    default: []
  },

  // 해설지 파일 타입 배열 (image/pdf) - 여러 파일 지원
  solutionFileType: {
    type: [String],
    enum: ['image', 'pdf'],
    default: []
  },

  // 정답 배열 (문항별 정답과 배점)
  answers: {
    type: [{
      questionNumber: {
        type: Number,
        required: true,
        min: 1
      },
      answer: {
        type: String,
        required: true,
        trim: true
      },
      score: {
        type: Number,
        required: true,
        min: 0,
        default: 1
      }
    }],
    default: []
  },

  // 학생 제출 답안 및 채점 결과
  submissions: {
    type: [{
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      studentAnswers: {
        type: [{
          questionNumber: {
            type: Number,
            required: true
          },
          answer: {
            type: String,
            required: true,
            trim: true
          }
        }],
        default: []
      },
      correctCount: {
        type: Number,
        default: 0
      },
      wrongCount: {
        type: Number,
        default: 0
      },
      submittedAt: {
        type: Date,
        default: Date.now
      },
      // 학생 풀이 이미지 URL 배열 (Cloudinary)
      solutionImages: {
        type: [String],
        default: []
      }
    }],
    default: []
  }
}, {
  // timestamps 옵션으로 createdAt, updatedAt 자동 생성
  timestamps: true
});

// 인덱스 추가 (검색 성능 향상)
assignmentSchema.index({ assignmentName: 1 });
assignmentSchema.index({ assignmentType: 1 });
assignmentSchema.index({ startDate: 1 });
assignmentSchema.index({ dueDate: 1 });

// 모델 생성 및 export
const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;

