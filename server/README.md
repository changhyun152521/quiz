# Server

Node.js + Express + MongoDB 서버 프로젝트

## 설치 방법

1. 의존성 설치
```bash
npm install
```

2. 환경변수 설정
```bash
cp .env.example .env
```

`.env` 파일을 열어서 MongoDB 연결 문자열을 입력하세요.

## 실행 방법

### 개발 모드 (nodemon 사용 - 자동 재시작)
```bash
npm run dev
```

nodemon이 파일 변경을 감지하면 자동으로 서버를 재시작합니다.

**nodemon 기능:**
- 파일 변경 시 자동 재시작
- `server.js`, `config`, `routes`, `models`, `controllers`, `middleware` 폴더 감시
- `.js`, `.json` 파일 변경 감지
- 수동 재시작: 터미널에서 `rs` 입력 후 Enter

### 디버그 모드
```bash
npm run dev:debug
```

### 프로덕션 모드
```bash
npm start
```

## 환경변수

- `PORT`: 서버 포트 (기본값: 5000)
- `MONGODB_URI`: MongoDB 연결 문자열

## 프로젝트 구조

```
server/
├── config/
│   └── database.js      # MongoDB 연결 설정
├── .env.example         # 환경변수 예시 파일
├── .gitignore          # Git 제외 파일
├── nodemon.json        # nodemon 설정 파일
├── package.json        # 프로젝트 설정
├── server.js           # 메인 서버 파일
└── README.md           # 프로젝트 설명
```


