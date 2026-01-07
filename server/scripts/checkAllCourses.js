/**
 * 모든 강좌의 고아 학생 ID 확인 스크립트
 *
 * 실행 방법:
 * 1. SSH 터널 열기: ssh -i ~/mathchang-server-keypair.pem -L 27017:localhost:27017 ec2-user@43.203.76.158 -N
 * 2. 스크립트 실행: node scripts/checkAllCourses.js
 */

const mongoose = require('mongoose');

const QUIZ_URI = 'mongodb://changhyun617:a5277949a5277949@localhost:27017/quiz?authSource=quiz';
const MATHCHANG_URI = 'mongodb://changhyun617:a5277949a5277949@localhost:27017/mathchang?authSource=mathchang';

async function checkAllCourses() {
  console.log('데이터베이스 연결 중...');

  const quizConn = mongoose.createConnection(QUIZ_URI);
  const mathchangConn = mongoose.createConnection(MATHCHANG_URI);

  await quizConn.asPromise();
  await mathchangConn.asPromise();

  console.log('연결 완료!\n');

  // mathchang DB의 모든 User ID 수집
  const mathchangUsers = await mathchangConn.db.collection('users').find({}).toArray();
  const validUserIds = new Set(mathchangUsers.map(u => u._id.toString()));

  console.log(`mathchang DB 총 사용자 수: ${mathchangUsers.length}\n`);
  console.log('========================================');
  console.log('강좌별 학생 검증');
  console.log('========================================\n');

  // 모든 강좌 조회
  const courses = await quizConn.db.collection('courses').find({}).toArray();

  let totalOrphans = 0;
  const orphansByCourse = [];

  for (const course of courses) {
    const studentCount = course.students?.length || 0;
    const orphanIds = [];

    if (course.students && course.students.length > 0) {
      for (const studentId of course.students) {
        const studentIdStr = studentId.toString();
        if (!validUserIds.has(studentIdStr)) {
          orphanIds.push(studentIdStr);
        }
      }
    }

    if (orphanIds.length > 0) {
      console.log(`❌ ${course.courseName}`);
      console.log(`   학생 수: ${studentCount}, 고아 ID: ${orphanIds.length}개`);
      orphanIds.forEach(id => console.log(`   - ${id}`));
      console.log('');

      orphansByCourse.push({
        courseId: course._id,
        courseName: course.courseName,
        orphanIds: orphanIds
      });
      totalOrphans += orphanIds.length;
    } else {
      console.log(`✓ ${course.courseName} - 학생 ${studentCount}명 (정상)`);
    }
  }

  console.log('\n========================================');
  console.log('요약');
  console.log('========================================');
  console.log(`총 강좌 수: ${courses.length}`);
  console.log(`문제 있는 강좌 수: ${orphansByCourse.length}`);
  console.log(`총 고아 학생 ID 수: ${totalOrphans}`);

  if (orphansByCourse.length > 0) {
    console.log('\n정리가 필요한 강좌:');
    orphansByCourse.forEach(c => {
      console.log(`  - ${c.courseName}: ${c.orphanIds.length}개의 고아 ID`);
    });
  }

  await quizConn.close();
  await mathchangConn.close();

  return orphansByCourse;
}

checkAllCourses()
  .then(() => {
    console.log('\n확인 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('오류 발생:', err);
    process.exit(1);
  });
