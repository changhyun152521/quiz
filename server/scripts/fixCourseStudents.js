// 강좌에서 잘못된 학생 ID 제거 스크립트
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGODB_URL = process.env.MONGODB_ATLAS_URL;

async function fixCourseStudents() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('MongoDB 연결 성공\n');

    const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');

    // 예비고1알파 강좌 찾기
    const course = await Course.findOne({ courseName: { $regex: '예비고1', $options: 'i' } });

    if (!course) {
      console.log('예비고1알파 강좌를 찾을 수 없습니다.');
      return;
    }

    console.log('=== 수정 전 ===');
    console.log(`강좌: ${course.courseName}`);
    console.log(`students: ${course.students?.length || 0}개`);

    // 잘못된 학생 ID 제거 - $pull 사용
    const orphanId = '693399aa1f4df1a6b5f6feef';

    const result = await Course.updateOne(
      { _id: course._id },
      { $pull: { students: new mongoose.Types.ObjectId(orphanId) } }
    );

    console.log(`\n업데이트 결과: ${JSON.stringify(result)}`);

    // 확인
    const updatedCourse = await Course.findById(course._id);
    console.log('\n=== 수정 후 ===');
    console.log(`students: ${updatedCourse.students?.length || 0}개`);

    // 해당 ID가 여전히 존재하는지 확인
    const stillExists = updatedCourse.students?.some(s => s.toString() === orphanId);
    console.log(`\n잘못된 ID 존재 여부: ${stillExists ? '있음 ⚠️' : '없음 ✅'}`);

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB 연결 종료');
  }
}

fixCourseStudents();
