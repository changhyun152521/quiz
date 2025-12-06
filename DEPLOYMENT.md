# 배포 가이드

이 문서는 Heroku(백엔드)와 Vercel(프론트엔드)에 배포하는 방법을 안내합니다.

## 사전 준비

1. GitHub 저장소 생성 및 코드 푸시
2. Heroku 계정 생성
3. Vercel 계정 생성

## 1. GitHub에 코드 푸시

```bash
# Git 초기화 (아직 안 했다면)
git init

# 원격 저장소 추가
git remote add origin https://github.com/changhyun152521/quiz.git

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit"

# 푸시
git branch -M main
git push -u origin main
```

## 2. Heroku 배포 (백엔드)

### 2.1 Heroku CLI 설치 및 로그인

```bash
# Heroku CLI 설치 (이미 설치되어 있다면 생략)
# Windows: https://devcenter.heroku.com/articles/heroku-cli

# 로그인
heroku login
```

### 2.2 Heroku 앱 생성

```bash
cd server
heroku create your-app-name
# 예: heroku create quiz-backend
```

### 2.3 환경 변수 설정

Heroku 대시보드에서 또는 CLI로 환경 변수를 설정하세요:

```bash
heroku config:set MONGODB_ATLAS_URL=your_mongodb_atlas_connection_string
heroku config:set JWT_SECRET=your-secret-key-change-in-production
heroku config:set JWT_EXPIRES_IN=7d
heroku config:set JWT_REMEMBER_ME_EXPIRES_IN=30d
heroku config:set CLOUDINARY_CLOUD_NAME=your-cloud-name
heroku config:set CLOUDINARY_API_KEY=your-api-key
heroku config:set CLOUDINARY_API_SECRET=your-api-secret
heroku config:set CLOUDINARY_UPLOAD_PRESET=unsigned
heroku config:set NODE_ENV=production
```

또는 Heroku 대시보드에서:
1. 앱 선택 → Settings → Config Vars → Reveal Config Vars
2. 위의 환경 변수들을 추가

### 2.4 코드 배포

**방법 1: Git subtree 사용 (권장)**

```bash
# 루트 디렉토리에서
git subtree push --prefix server heroku main
```

**방법 2: Heroku Git 사용**

```bash
cd server
heroku git:remote -a your-app-name
git subtree push --prefix server heroku main
```

### 2.5 배포 확인

```bash
heroku open
# 또는
curl https://your-app-name.herokuapp.com/api/health
```

## 3. Vercel 배포 (프론트엔드)

### 3.1 Vercel CLI 설치 및 로그인

```bash
npm i -g vercel
vercel login
```

### 3.2 환경 변수 설정

프로젝트 루트에 `client/.env` 파일을 생성하거나, Vercel 대시보드에서 설정:

```env
VITE_API_URL=https://your-heroku-app.herokuapp.com
```

### 3.3 Vercel 배포

**방법 1: Vercel 대시보드 사용 (권장)**

1. https://vercel.com 접속
2. "Add New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 설정:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Environment Variables 추가:
   - `VITE_API_URL`: `https://your-heroku-app.herokuapp.com`
6. "Deploy" 클릭

**방법 2: Vercel CLI 사용**

```bash
cd client
vercel
```

프롬프트에 따라 설정:
- Set up and deploy? Yes
- Which scope? 본인 계정 선택
- Link to existing project? No
- Project name? quiz-frontend (또는 원하는 이름)
- Directory? `./`
- Override settings? No

환경 변수 설정:
```bash
vercel env add VITE_API_URL
# 프롬프트에 https://your-heroku-app.herokuapp.com 입력
```

### 3.4 프로덕션 배포

```bash
vercel --prod
```

## 4. 프론트엔드 API URL 설정

프로덕션 환경에서 API URL을 환경 변수로 사용하도록 코드를 수정해야 합니다.

### 4.1 API 유틸리티 사용

`client/src/utils/api.js` 파일이 생성되어 있습니다. 이를 사용하여 API 호출을 변경하세요.

**변경 전:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

**변경 후:**
```javascript
import { post } from '../utils/api';

const response = await post('/api/auth/login', data);
```

### 4.2 주요 파일 수정 필요

다음 파일들에서 `http://localhost:5000`을 찾아 API 유틸리티를 사용하도록 수정하세요:

- `client/src/App.jsx`
- `client/src/components/Login.jsx`
- `client/src/components/SignUp.jsx`
- `client/src/pages/MainPage.jsx`
- `client/src/pages/DashboardPage.jsx`
- `client/src/pages/AdminDashboardPage.jsx`
- `client/src/pages/TeacherDashboardPage.jsx`
- `client/src/pages/AssignmentDetailPage.jsx`
- `client/src/components/AssignmentModal.jsx`
- `client/src/components/TestResultModal.jsx`

### 4.3 자동 변경 스크립트 (선택사항)

모든 파일을 한 번에 변경하려면:

```bash
# Windows PowerShell
cd client/src
Get-ChildItem -Recurse -Include *.jsx,*.js | ForEach-Object {
    (Get-Content $_.FullName) -replace "http://localhost:5000", "import.meta.env.VITE_API_URL || 'http://localhost:5000'" | Set-Content $_.FullName
}
```

하지만 이 방법보다는 API 유틸리티를 사용하는 것이 더 깔끔합니다.

## 5. CORS 설정 확인

백엔드의 CORS 설정이 프론트엔드 도메인을 허용하는지 확인하세요.

`server/server.js`에서:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || true, // 개발 환경에서는 모든 origin 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

프로덕션에서는 Heroku 환경 변수에 `FRONTEND_URL`을 설정하세요:

```bash
heroku config:set FRONTEND_URL=https://your-vercel-app.vercel.app
```

## 6. 배포 후 확인 사항

- [ ] Heroku 앱이 정상적으로 실행되는지 확인
- [ ] Vercel 앱이 정상적으로 빌드되고 배포되는지 확인
- [ ] API 엔드포인트가 정상적으로 응답하는지 확인
- [ ] 프론트엔드에서 백엔드 API를 호출할 수 있는지 확인
- [ ] CORS 오류가 없는지 확인
- [ ] 환경 변수가 제대로 설정되었는지 확인

## 7. 문제 해결

### Heroku 배포 실패

```bash
# 로그 확인
heroku logs --tail

# 환경 변수 확인
heroku config
```

### Vercel 빌드 실패

1. Vercel 대시보드에서 빌드 로그 확인
2. 환경 변수 설정 확인
3. `package.json`의 빌드 스크립트 확인

### CORS 오류

1. 백엔드 CORS 설정 확인
2. `FRONTEND_URL` 환경 변수 확인
3. 브라우저 콘솔에서 정확한 오류 메시지 확인

## 참고 자료

- [Heroku Node.js 가이드](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Vercel 배포 가이드](https://vercel.com/docs)
- [Vite 환경 변수](https://vitejs.dev/guide/env-and-mode.html)

