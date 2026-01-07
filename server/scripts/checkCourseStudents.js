// 강좌 데이터 확인 스크립트
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGODB_URL = process.env.MONGODB_ATLAS_URL;

async function checkCourseStudents() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('MongoDB 연결 성공\n');

    const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');

    // 모든 강좌 조회
    const courses = await Course.find({});
    console.log(`총 ${courses.length}개 강좌 발견\n`);

    console.log('=== 전체 강좌 목록 ===');
    courses.forEach((c, i) => {
      const hasStudentNames = c.studentNames !== undefined;
      console.log(`${i + 1}. ${c.courseName}`);
      console.log(`   - students: ${c.students?.length || 0}명`);
      console.log(`   - studentNames 필드: ${hasStudentNames ? '있음 ⚠️' : '없음 ✅'}`);

      // 예비고1 알파 강좌의 학생 목록 출력
      if (c.courseName?.includes('예비고1')) {
        console.log(`   - 학생 ID 목록:`);
        c.students?.forEach((s, idx) => {
          console.log(`     ${idx + 1}. ${s}`);
        });
      }
    });

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB 연결 종료');
  }
}

checkCourseStudents();
