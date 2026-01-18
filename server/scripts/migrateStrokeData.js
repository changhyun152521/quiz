/**
 * StrokeData 마이그레이션 스크립트
 *
 * Assignment.submissions.strokeData를 별도의 StrokeData 컬렉션으로 이동합니다.
 *
 * 실행 방법:
 * cd quiz/server
 * node scripts/migrateStrokeData.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');

// 스키마 정의 (마이그레이션용)
const PointSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { _id: false });

const StrokeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['pen', 'eraser'], required: true },
  color: { type: String },
  width: { type: Number, required: true },
  points: [PointSchema]
}, { _id: false });

const PageStrokesSchema = new mongoose.Schema({
  imageIndex: { type: Number, required: true },
  canvasSize: {
    width: { type: Number, default: 2100 },
    height: { type: Number, default: 2970 }
  },
  strokes: [StrokeSchema]
}, { _id: false });

// 새로운 StrokeData 모델
const strokeDataSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  pages: { type: [PageStrokesSchema], default: [] },
  draftSavedAt: { type: Date, default: null }
}, { timestamps: true });

strokeDataSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const StrokeData = mongoose.model('StrokeData', strokeDataSchema);

async function migrateStrokeData() {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_ATLAS_URL || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_ATLAS_URL 또는 MONGODB_URI 환경변수가 설정되지 않았습니다.');
    }

    console.log('MongoDB에 연결 중...');
    await mongoose.connect(mongoUri);
    console.log('✓ MongoDB 연결 성공\n');

    // assignments 컬렉션 직접 접근 (기존 스키마와 무관하게)
    const db = mongoose.connection.db;
    const assignmentsCollection = db.collection('assignments');

    // strokeData가 있는 submissions을 가진 과제들 조회
    console.log('strokeData가 있는 과제 검색 중...');
    const assignmentsWithStrokeData = await assignmentsCollection.find({
      'submissions.strokeData': { $exists: true, $ne: [] }
    }).toArray();

    console.log(`✓ ${assignmentsWithStrokeData.length}개의 과제에서 strokeData 발견\n`);

    if (assignmentsWithStrokeData.length === 0) {
      console.log('마이그레이션할 strokeData가 없습니다.');
      await mongoose.disconnect();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const assignment of assignmentsWithStrokeData) {
      console.log(`과제 처리 중: ${assignment.assignmentName} (${assignment._id})`);

      for (const submission of assignment.submissions) {
        // strokeData가 있는 submission만 처리
        if (!submission.strokeData || submission.strokeData.length === 0) {
          continue;
        }

        const studentId = submission.studentId;
        const assignmentId = assignment._id;

        try {
          // 이미 마이그레이션된 데이터가 있는지 확인
          const existing = await StrokeData.findOne({ assignmentId, studentId });
          if (existing) {
            console.log(`  - 학생 ${studentId}: 이미 마이그레이션됨 (스킵)`);
            skippedCount++;
            continue;
          }

          // 새 StrokeData 문서 생성
          const strokeDataDoc = new StrokeData({
            assignmentId,
            studentId,
            pages: submission.strokeData,
            draftSavedAt: submission.draftSavedAt || submission.submittedAt || new Date()
          });

          await strokeDataDoc.save();
          migratedCount++;
          console.log(`  - 학생 ${studentId}: ✓ 마이그레이션 완료 (${submission.strokeData.length}페이지)`);
        } catch (err) {
          errorCount++;
          console.error(`  - 학생 ${studentId}: ✗ 오류 - ${err.message}`);
        }
      }
    }

    console.log('\n========== 마이그레이션 완료 ==========');
    console.log(`✓ 마이그레이션 성공: ${migratedCount}건`);
    console.log(`- 스킵 (이미 존재): ${skippedCount}건`);
    console.log(`✗ 오류: ${errorCount}건`);

    // 선택적: 기존 Assignment에서 strokeData 필드 제거
    console.log('\n기존 Assignment에서 strokeData 필드를 제거하시겠습니까?');
    console.log('이 작업은 별도로 수행하는 것을 권장합니다.');
    console.log('제거하려면 다음 명령을 MongoDB에서 실행하세요:');
    console.log(`
db.assignments.updateMany(
  {},
  { $unset: { "submissions.$[].strokeData": "" } }
);
`);

    await mongoose.disconnect();
    console.log('\n✓ MongoDB 연결 종료');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
migrateStrokeData();
