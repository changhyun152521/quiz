/**
 * 마이그레이션 대상 데이터 분석 스크립트
 *
 * quiz DB의 studentId를 mathchang DB의 User _id로 매핑하기 위한 분석
 *
 * 실행 방법:
 * 1. SSH 터널 열기: ssh -i ~/mathchang-server-keypair.pem -L 27017:localhost:27017 ec2-user@43.203.76.158 -N
 * 2. 스크립트 실행: node scripts/analyzeMigration.js
 */

const mongoose = require('mongoose');

const QUIZ_URI = 'mongodb://changhyun617:a5277949a5277949@localhost:27017/quiz?authSource=quiz';
const MATHCHANG_URI = 'mongodb://changhyun617:a5277949a5277949@localhost:27017/mathchang?authSource=mathchang';

async function analyze() {
  console.log('데이터베이스 연결 중...');

  // quiz DB 접속
  const quizConn = mongoose.createConnection(QUIZ_URI);
  const mathchangConn = mongoose.createConnection(MATHCHANG_URI);

  // 연결 대기
  await quizConn.asPromise();
  await mathchangConn.asPromise();

  console.log('연결 완료!\n');

  // quiz DB의 User 목록 (quiz _id -> userId 매핑)
  const quizUsers = await quizConn.db.collection('users').find({}).toArray();
  const quizIdToUserId = {};
  quizUsers.forEach(u => {
    quizIdToUserId[u._id.toString()] = u.userId;
  });

  console.log('quiz DB User 수:', quizUsers.length);

  // mathchang DB의 User 목록 (userId -> mathchang _id 매핑)
  const mathchangUsers = await mathchangConn.db.collection('users').find({}).toArray();
  const userIdToMathchangId = {};
  mathchangUsers.forEach(u => {
    userIdToMathchangId[u.userId] = u._id.toString();
  });

  console.log('mathchang DB User 수:', mathchangUsers.length);

  console.log('\n========================================');
  console.log('마이그레이션 대상 데이터 분석');
  console.log('========================================');

  // Course.students 분석
  console.log('\n[1] Course.students 마이그레이션');
  const courses = await quizConn.db.collection('courses').find({}).toArray();
  let courseUpdateCount = 0;
  const courseUpdates = [];

  for (const course of courses) {
    if (!course.students || course.students.length === 0) continue;

    console.log('\n강좌:', course.courseName);
    const newStudents = [];
    let hasChanges = false;

    for (const studentId of course.students) {
      const studentIdStr = studentId.toString();
      const quizUserId = quizIdToUserId[studentIdStr];
      const mathchangId = userIdToMathchangId[quizUserId];

      if (quizUserId && mathchangId && studentIdStr !== mathchangId) {
        console.log('  변경필요:', studentIdStr, '->', mathchangId, '(' + quizUserId + ')');
        newStudents.push(new mongoose.Types.ObjectId(mathchangId));
        hasChanges = true;
        courseUpdateCount++;
      } else if (!quizUserId) {
        // quiz DB에 없는 ID - 이미 mathchang ID일 수 있음
        const existsInMathchang = mathchangUsers.find(u => u._id.toString() === studentIdStr);
        if (existsInMathchang) {
          console.log('  유지(이미 mathchang ID):', studentIdStr, '(' + existsInMathchang.name + ')');
          newStudents.push(studentId);
        } else {
          console.log('  경고(매핑불가):', studentIdStr);
          newStudents.push(studentId); // 일단 유지
        }
      } else {
        newStudents.push(studentId);
      }
    }

    if (hasChanges) {
      courseUpdates.push({
        courseId: course._id,
        courseName: course.courseName,
        newStudents: newStudents
      });
    }
  }

  // Assignment.submissions 분석
  console.log('\n[2] Assignment.submissions.studentId 마이그레이션');
  const assignments = await quizConn.db.collection('assignments').find({}).toArray();
  let submissionUpdateCount = 0;
  const assignmentUpdates = [];

  for (const assignment of assignments) {
    if (!assignment.submissions || assignment.submissions.length === 0) continue;

    console.log('\n과제:', assignment.assignmentName);
    const newSubmissions = [];
    let hasChanges = false;

    for (const sub of assignment.submissions) {
      const studentIdStr = sub.studentId?.toString();
      if (!studentIdStr) {
        newSubmissions.push(sub);
        continue;
      }

      const quizUserId = quizIdToUserId[studentIdStr];
      const mathchangId = userIdToMathchangId[quizUserId];

      if (quizUserId && mathchangId && studentIdStr !== mathchangId) {
        console.log('  변경필요:', studentIdStr, '->', mathchangId, '(' + quizUserId + ')');
        newSubmissions.push({
          ...sub,
          studentId: new mongoose.Types.ObjectId(mathchangId)
        });
        hasChanges = true;
        submissionUpdateCount++;
      } else if (!quizUserId) {
        const existsInMathchang = mathchangUsers.find(u => u._id.toString() === studentIdStr);
        if (existsInMathchang) {
          console.log('  유지(이미 mathchang ID):', studentIdStr, '(' + existsInMathchang.name + ')');
        } else {
          console.log('  경고(매핑불가):', studentIdStr);
        }
        newSubmissions.push(sub);
      } else {
        newSubmissions.push(sub);
      }
    }

    if (hasChanges) {
      assignmentUpdates.push({
        assignmentId: assignment._id,
        assignmentName: assignment.assignmentName,
        newSubmissions: newSubmissions
      });
    }
  }

  console.log('\n========================================');
  console.log('요약');
  console.log('========================================');
  console.log('Course.students 변경 필요:', courseUpdateCount, '건');
  console.log('Assignment.submissions 변경 필요:', submissionUpdateCount, '건');
  console.log('\n변경될 강좌 수:', courseUpdates.length);
  console.log('변경될 과제 수:', assignmentUpdates.length);

  await quizConn.close();
  await mathchangConn.close();

  return { courseUpdates, assignmentUpdates };
}

analyze()
  .then(() => {
    console.log('\n분석 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('오류 발생:', err);
    process.exit(1);
  });
