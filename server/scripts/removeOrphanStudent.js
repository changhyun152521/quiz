/**
 * 고아 학생 ID 제거 스크립트
 *
 * "예비고1 알파" 강좌에서 존재하지 않는 학생 ID를 제거합니다.
 *
 * 실행 방법:
 * 1. SSH 터널 열기: ssh -i ~/mathchang-server-keypair.pem -L 27017:localhost:27017 ec2-user@43.203.76.158 -N
 * 2. 스크립트 실행: node scripts/removeOrphanStudent.js
 */

const mongoose = require('mongoose');

const QUIZ_URI = 'mongodb://changhyun617:a5277949a5277949@localhost:27017/quiz?authSource=quiz';

// 제거할 고아 학생 ID
const ORPHAN_STUDENT_ID = '69423132b661fe5e491b613d';

async function removeOrphanStudent() {
  console.log('데이터베이스 연결 중...');

  const quizConn = mongoose.createConnection(QUIZ_URI);
  await quizConn.asPromise();

  console.log('연결 완료!\n');

  // 해당 학생 ID가 포함된 강좌 찾기
  const courses = await quizConn.db.collection('courses').find({
    students: new mongoose.Types.ObjectId(ORPHAN_STUDENT_ID)
  }).toArray();

  console.log(`고아 학생 ID ${ORPHAN_STUDENT_ID}가 포함된 강좌 수: ${courses.length}`);

  for (const course of courses) {
    console.log(`\n강좌: ${course.courseName}`);
    console.log(`  현재 학생 수: ${course.students.length}`);

    // 고아 학생 ID 제거
    const result = await quizConn.db.collection('courses').updateOne(
      { _id: course._id },
      { $pull: { students: new mongoose.Types.ObjectId(ORPHAN_STUDENT_ID) } }
    );

    if (result.modifiedCount > 0) {
      // 업데이트 후 확인
      const updatedCourse = await quizConn.db.collection('courses').findOne({ _id: course._id });
      console.log(`  ✓ 제거 완료! 새 학생 수: ${updatedCourse.students.length}`);
    } else {
      console.log('  ⚠ 변경 없음');
    }
  }

  await quizConn.close();
  console.log('\n완료!');
}

removeOrphanStudent()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('오류 발생:', err);
    process.exit(1);
  });
