// StrokeData 모델 - 학생 풀이 스트로크 데이터 (별도 컬렉션)
// Assignment에서 분리하여 메모리 사용량 최적화

const mongoose = require('mongoose');

// 스트로크 포인트 스키마 (x, y 좌표)
const PointSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { _id: false });

// 개별 스트로크 스키마
const StrokeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['pen', 'eraser'], required: true },
  color: { type: String },  // eraser일 경우 null
  width: { type: Number, required: true },
  points: [PointSchema]
}, { _id: false });

// 페이지별 스트로크 데이터 스키마
const PageStrokesSchema = new mongoose.Schema({
  imageIndex: { type: Number, required: true },
  canvasSize: {
    width: { type: Number, default: 2100 },
    height: { type: Number, default: 2970 }
  },
  strokes: [StrokeSchema]
}, { _id: false });

const strokeDataSchema = new mongoose.Schema({
  // 과제 ID
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },

  // 학생 ID (mathchang 사용자 _id)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // 페이지별 스트로크 데이터
  pages: {
    type: [PageStrokesSchema],
    default: []
  },

  // 임시저장 시간
  draftSavedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 복합 인덱스 (과제 + 학생 조합으로 빠른 조회)
strokeDataSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
strokeDataSchema.index({ studentId: 1 });

const StrokeData = mongoose.model('StrokeData', strokeDataSchema);

module.exports = StrokeData;
