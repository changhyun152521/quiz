require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const connectDB = require('../config/database');

async function fixAllPasswords() {
  try {
    // MongoDB 연결
    await connectDB();
    console.log('MongoDB 연결 성공\n');

    // 모든 사용자 조회
    const users = await User.find({});
    console.log(`총 ${users.length}명의 사용자를 찾았습니다.\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const passwordIsHashed = user.password && user.password.startsWith('$2');
      
      console.log(`[${user.userId}] ${user.name} (${user.role})`);
      console.log(`  비밀번호 해시 여부: ${passwordIsHashed ? '✅ 해시됨' : '❌ 해시 안됨'}`);
      
      if (!passwordIsHashed) {
        console.log(`  ⚠️  비밀번호가 해시화되지 않았습니다.`);
        console.log(`  현재 비밀번호: ${user.password ? user.password.substring(0, 20) + '...' : '없음'}`);
        
        // 비밀번호가 해시화되지 않은 경우, 임시 비밀번호로 재설정
        // 원래 비밀번호를 알 수 없으므로, userId를 기반으로 임시 비밀번호 생성
        const tempPassword = user.userId + '123'; // 예: admin123, student123 등
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(tempPassword, salt);
        await user.save();
        
        console.log(`  ✅ 비밀번호를 해시화하여 재설정했습니다.`);
        console.log(`  새 비밀번호: ${tempPassword}`);
        fixedCount++;
      } else {
        console.log(`  ✅ 비밀번호가 이미 해시화되어 있습니다.`);
        skippedCount++;
      }
      console.log('');
    }

    console.log('\n=== 요약 ===');
    console.log(`총 사용자: ${users.length}명`);
    console.log(`수정된 계정: ${fixedCount}명`);
    console.log(`건너뛴 계정: ${skippedCount}명`);
    
    if (fixedCount > 0) {
      console.log('\n⚠️  수정된 계정의 비밀번호는 다음과 같습니다:');
      console.log('  - 아이디 + "123" 형식 (예: admin123, student123)');
      console.log('  - 로그인 후 비밀번호를 변경해주세요.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

fixAllPasswords();

