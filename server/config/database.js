const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MONGODB_ATLAS_URL을 우선적으로 사용, 없으면 MONGODB_URI 사용, 둘 다 없으면 로컬 주소 사용
    let mongoURI;
    
    // 디버깅: 환경변수 확인
    console.log('Environment variables check:');
    console.log('MONGODB_ATLAS_URL:', process.env.MONGODB_ATLAS_URL ? 'SET' : 'NOT SET');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    
    if (process.env.MONGODB_ATLAS_URL) {
      mongoURI = process.env.MONGODB_ATLAS_URL;
      console.log('✓ Using MongoDB Atlas URL');
      // 보안을 위해 URL의 일부만 표시 (사용자명과 비밀번호는 숨김)
      const maskedURL = mongoURI.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://***:***@');
      console.log('  Connection string:', maskedURL);
    } else if (process.env.MONGODB_URI) {
      mongoURI = process.env.MONGODB_URI;
      console.log('✓ Using MONGODB_URI');
      // 보안을 위해 URL의 일부만 표시
      const maskedURL = mongoURI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@');
      console.log('  Connection string:', maskedURL);
    } else {
      // 기본 로컬 MongoDB 주소
      mongoURI = 'mongodb://localhost:27017/quiz';
      console.log('⚠ Using default local MongoDB: mongodb://localhost:27017/quiz');
      console.log('  Note: Set MONGODB_ATLAS_URL in .env file to use MongoDB Atlas');
    }

    const conn = await mongoose.connect(mongoURI, {
      // 연결 옵션 추가 (타임아웃 등)
      serverSelectionTimeoutMS: 5000, // 5초 타임아웃
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Please check:');
    console.error('1. MongoDB is running (if using local MongoDB)');
    console.error('2. MONGODB_ATLAS_URL or MONGODB_URI in .env file is correct');
    console.error('3. Network connection is available');
    throw error; // 에러를 다시 throw하여 상위에서 처리
  }
};

module.exports = connectDB;


