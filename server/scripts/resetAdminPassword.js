require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const connectDB = require('../config/database');

async function resetAdminPassword() {
  try {
    // MongoDB 연결
    await connectDB();
    console.log('MongoDB 연결 성공');

    // admin 계정 찾기
    const admin = await User.findOne({ userId: 'admin' });
    
    if (!admin) {
      console.log('❌ admin 계정을 찾을 수 없습니다.');
      console.log('관리자 계정을 생성합니다...');
      
      // 관리자 계정 생성
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const newAdmin = new User({
        userId: 'admin',
        password: hashedPassword,
        name: '관리자',
        studentPhone: '01000000000',
        parentPhone: '01000000000',
        email: 'admin@quizlab.com',
        schoolName: '관리자',
        grade: '초등',
        privacyConsent: true,
        termsConsent: true,
        role: 'admin'
      });
      
      await newAdmin.save();
      console.log('✅ 관리자 계정이 생성되었습니다.');
      console.log('아이디: admin');
      console.log('비밀번호: admin123');
    } else {
      console.log('✅ admin 계정을 찾았습니다.');
      console.log(`이름: ${admin.name}`);
      console.log(`역할: ${admin.role}`);
      console.log(`비밀번호 해시 시작: ${admin.password ? admin.password.substring(0, 10) : '없음'}`);
      
      // 비밀번호 재설정
      console.log('\n비밀번호를 재설정합니다...');
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash('admin123', salt);
      await admin.save();
      
      console.log('✅ 비밀번호가 재설정되었습니다.');
      console.log('새 비밀번호: admin123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

resetAdminPassword();

