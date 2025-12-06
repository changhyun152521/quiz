// 환경변수 로드 (가장 먼저 실행)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// 디버깅: .env 파일 로드 확인
console.log('=== Environment Variables Check ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || '5000 (default)');
console.log('MONGODB_ATLAS_URL:', process.env.MONGODB_ATLAS_URL ? '✓ SET' : '✗ NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ SET' : '✗ NOT SET');
console.log('===================================\n');

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어
// CORS 설정
const corsOptions = {
  origin: process.env.FRONTEND_URL || true, // 프로덕션에서는 FRONTEND_URL 사용, 없으면 모든 origin 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// OPTIONS 요청 처리 (CORS preflight)
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 포트 사용 가능 여부 확인 함수
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
};

// MongoDB 연결 및 서버 시작
const startServer = async () => {
  try {
    // 포트 사용 가능 여부 확인
    const portAvailable = await checkPort(PORT);
    if (!portAvailable) {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error('포트를 사용하는 프로세스를 종료하는 중...');
      
      // Windows에서 포트를 사용하는 프로세스 찾기 및 종료 시도
      const { exec } = require('child_process');
      exec(`netstat -ano | findstr :${PORT}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = new Set();
          lines.forEach(line => {
            const match = line.match(/\s+(\d+)$/);
            if (match) {
              pids.add(match[1]);
            }
          });
          
          pids.forEach(pid => {
            exec(`taskkill /PID ${pid} /F`, (err) => {
              if (!err) {
                console.log(`✓ 프로세스 ${pid} 종료됨`);
              }
            });
          });
          
          // 프로세스 종료 후 잠시 대기 후 재시도
          setTimeout(() => {
            console.log('\n서버를 다시 시작합니다...\n');
            startServer();
          }, 2000);
        } else {
          console.error('포트를 사용하는 프로세스를 찾을 수 없습니다.');
          console.error('수동으로 종료하세요: netstat -ano | findstr :' + PORT);
          process.exit(1);
        }
      });
      return;
    }
    
    // MongoDB 연결
    await connectDB();
    
    // 서버 시작
    const server = app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
    });
    
    // 포트 충돌 에러 핸들링
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error('서버를 재시작합니다...');
        setTimeout(() => startServer(), 2000);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    status: 'success'
  });
});

// API 라우트
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 유저 라우트
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// 인증 라우트
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 강좌 라우트
const courseRoutes = require('./routes/courses');
app.use('/api/courses', courseRoutes);

// 과제 라우트
const assignmentRoutes = require('./routes/assignments');
app.use('/api/assignments', assignmentRoutes);

// 정답 라우트
const answerRoutes = require('./routes/answers');
app.use('/api/answers', answerRoutes);

// Cloudinary 라우트
const cloudinaryRoutes = require('./routes/cloudinary');
app.use('/api/cloudinary', cloudinaryRoutes);


