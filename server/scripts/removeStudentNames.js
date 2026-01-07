// 모든 강좌에서 studentNames 필드 제거 마이그레이션 스크립트
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGODB_URL = process.env.MONGODB_ATLAS_URL;

async function removeStudentNames() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('MongoDB 연결 성공\n');

    const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');

    // 모든 강좌 조회
    const courses = await Course.find({});
    console.log(`총 ${courses.length}개 강좌 발견\n`);

    let updatedCount = 0;

    for (const course of courses) {
      if (course.studentNames !== undefined) {
        console.log(`강좌: ${course.courseName}`);
        console.log(`  - studentNames 필드 제거 (${course.studentNames?.length || 0}개 항목)`);

        // studentNames 필드 제거
        await Course.updateOne(
          { _id: course._id },
          { $unset: { studentNames: '' } }
        );
        updatedCount++;
      }
    }

    console.log(`\n✅ ${updatedCount}개 강좌에서 studentNames 필드 제거 완료`);

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB 연결 종료');
  }
}

removeStudentNames();
