# Quiz Application

퀴즈 애플리케이션 - React + Vite 프론트엔드, Node.js + Express + MongoDB 백엔드

## 프로젝트 구조

```
quiz/
├── client/          # React + Vite 프론트엔드
└── server/          # Node.js + Express 백엔드
```

## 기술 스택

### Frontend
- React 18
- Vite
- CSS Modules

### Backend
- Node.js
- Express
- MongoDB (MongoDB Atlas)
- Mongoose
- JWT (인증)
- bcrypt (비밀번호 암호화)
- Cloudinary (이미지 업로드)

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/changhyun152521/quiz.git
cd quiz
```

### 2. 백엔드 설정

```bash
cd server
npm install
cp env.example .env
```

`.env` 파일을 열어서 다음 환경 변수를 설정하세요:

```env
PORT=5000
MONGODB_ATLAS_URL=your_mongodb_atlas_connection_string
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REMEMBER_ME_EXPIRES_IN=30d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=unsigned
```

### 3. 프론트엔드 설정

```bash
cd ../client
npm install
```

프로덕션 환경에서는 `.env` 파일을 생성하여 API URL을 설정하세요:

```env
VITE_API_URL=https://your-heroku-app.herokuapp.com
```

### 4. 개발 서버 실행

**백엔드:**
```bash
cd server
npm run dev
```

**프론트엔드:**
```bash
cd client
npm run dev
```

## 배포

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

### Heroku (백엔드)

1. Heroku CLI 설치 및 로그인
2. Heroku 앱 생성
3. 환경 변수 설정
4. Git 푸시

```bash
cd server
heroku create your-app-name
heroku config:set MONGODB_ATLAS_URL=your_mongodb_atlas_url
heroku config:set JWT_SECRET=your-secret-key
heroku config:set CLOUDINARY_CLOUD_NAME=your-cloud-name
heroku config:set CLOUDINARY_API_KEY=your-api-key
heroku config:set CLOUDINARY_API_SECRET=your-api-secret
heroku config:set CLOUDINARY_UPLOAD_PRESET=unsigned
git subtree push --prefix server heroku main
```

### Vercel (프론트엔드)

1. Vercel 계정 생성 및 로그인
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL`: Heroku 백엔드 URL

또는 Vercel CLI 사용:

```bash
cd client
npm i -g vercel
vercel
```

## API 엔드포인트

- `GET /api/health` - 서버 상태 확인
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/users` - 사용자 목록
- `GET /api/courses` - 강좌 목록
- `GET /api/assignments` - 과제 목록
- `POST /api/assignments` - 과제 생성
- `GET /api/answers` - 정답 목록

## 라이선스

ISC

