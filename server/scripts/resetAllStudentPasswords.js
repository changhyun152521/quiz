require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const connectDB = require('../config/database');

async function resetAllStudentPasswords() {
  try {
    // MongoDB 연결
    await connectDB();
    console.log('MongoDB 연결 성공\n');

    // 학생 계정만 조회 (admin, teacher 제외)
    const students = await User.find({ role: 'student' });
    console.log(`총 ${students.length}명의 학생을 찾았습니다.\n`);

    let fixedCount = 0;

    for (const student of students) {
      const passwordIsHashed = student.password && student.password.startsWith('$2');
      
      console.log(`[${student.userId}] ${student.name}`);
      console.log(`  비밀번호 해시 여부: ${passwordIsHashed ? '✅ 해시됨' : '❌ 해시 안됨'}`);
      
      if (!passwordIsHashed) {
        // 비밀번호를 아이디 + "123" 형식으로 재설정
        const tempPassword = student.userId + '123';
        
        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(tempPassword, salt);
        await student.save();
        
        console.log(`  ✅ 비밀번호를 해시화하여 재설정했습니다.`);
        console.log(`  새 비밀번호: ${tempPassword}`);
        fixedCount++;
      } else {
        console.log(`  ✅ 비밀번호가 이미 해시화되어 있습니다.`);
      }
      console.log('');
    }

    console.log('\n=== 요약 ===');
    console.log(`총 학생: ${students.length}명`);
    console.log(`수정된 계정: ${fixedCount}명`);
    
    if (fixedCount > 0) {
      console.log('\n✅ 수정 완료!');
      console.log('재설정된 계정의 비밀번호는 "아이디 + 123" 형식입니다.');
      console.log('예: 아이디가 "student1"이면 비밀번호는 "student1123"');
    } else {
      console.log('\n✅ 모든 계정의 비밀번호가 이미 해시화되어 있습니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

resetAllStudentPasswords();

