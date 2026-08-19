// 환경변수 로드 (가장 먼저 실행)
require('./config/loadEnv');
const { validateJwtSecret } = require('./config/security');

// mathchang에서 발급한 토큰을 검증하므로 시작 시 동일한 강한 비밀키가 필요합니다.
validateJwtSecret();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const {
  getCorsOptions,
  requestLogger,
  responseSanitizer,
  errorHandler,
} = require('./middleware/operationalSecurity');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어: 명시적 Origin 목록과 기본 보안 헤더를 사용한다.
const corsOptions = getCorsOptions();
app.use(helmet());
app.use(cors(corsOptions));

// OPTIONS 요청 처리 (CORS preflight) - 모든 경로에 대해
app.options('*', cors(corsOptions));

// 일반 API 본문은 작게 제한하고, 이미지 base64가 필요한 업로드 경로만
// 별도 상한을 사용한다.
const defaultJsonParser = express.json({ limit: '1mb' });
const uploadJsonParser = express.json({ limit: '8mb' });
app.use(responseSanitizer);
app.use(requestLogger);
app.use((req, res, next) => {
  if (req.path === '/api/upload' || req.path.startsWith('/api/upload/')) {
    return uploadJsonParser(req, res, next);
  }
  return defaultJsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// MongoDB 연결 및 서버 시작
const startServer = async () => {
  try {
    // MongoDB 연결
    await connectDB();
    
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

// 유저 라우트 (mathchang API 프록시)
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

// 업로드 라우트 (R2/Cloudinary 통합)
const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);

// 학생 라우트
const studentRoutes = require('./routes/students');
app.use('/api/students', studentRoutes);

// 메시지 라우트
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: '라우트를 찾을 수 없습니다' });
});

app.use(errorHandler);
