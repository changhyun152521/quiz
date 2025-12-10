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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Request-Headers', 'Access-Control-Request-Method'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// OPTIONS 요청 처리 (CORS preflight) - 모든 경로에 대해
app.options('*', cors(corsOptions));

// JSON body parser - 큰 이미지 업로드를 위해 크기 제한 증가 (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 스케줄러 임포트
const { scheduleCleanup } = require('./jobs/cleanupOldSolutions');

// MongoDB 연결 및 서버 시작
const startServer = async () => {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 스케줄러 시작 (MongoDB 연결 후)
    scheduleCleanup();
    
    // 서버 시작 (포트 에러는 서버 시작 시 처리)
    const server = app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
    });
    
    // 포트 충돌 에러 핸들링
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error('포트를 사용하는 프로세스를 종료하는 중...');
        
        // Windows에서 포트를 사용하는 프로세스 찾기 및 종료
        const { exec } = require('child_process');
        exec(`netstat -ano | findstr :${PORT} | findstr LISTENING`, (err, stdout) => {
          if (stdout && stdout.trim().length > 0) {
            const lines = stdout.trim().split('\n').filter(line => line.trim());
            const pids = new Set();
            
            lines.forEach(line => {
              if (line.includes('LISTENING')) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && /^\d+$/.test(pid)) {
                  pids.add(pid);
                }
              }
            });
            
            if (pids.size > 0) {
              const killPromises = Array.from(pids).map(pid => {
                return new Promise((resolve) => {
                  exec(`taskkill /PID ${pid} /F`, (killErr) => {
                    if (!killErr) {
                      console.log(`✓ 프로세스 ${pid} 종료됨`);
                    }
                    resolve();
                  });
                });
              });
              
              Promise.all(killPromises).then(() => {
                console.log('프로세스 종료 완료. 서버를 다시 시작합니다...\n');
                setTimeout(() => {
                  startServer();
                }, 2000);
              });
            } else {
              console.error('LISTENING 상태인 프로세스를 찾을 수 없습니다.');
              console.error('수동으로 종료하세요: netstat -ano | findstr :' + PORT);
              process.exit(1);
            }
          } else {
            console.error('포트를 사용하는 프로세스를 찾을 수 없습니다.');
            console.error('수동으로 종료하세요: netstat -ano | findstr :' + PORT);
            process.exit(1);
          }
        });
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

// 학생 라우트
const studentRoutes = require('./routes/students');
app.use('/api/students', studentRoutes);

// 메시지 라우트
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);


