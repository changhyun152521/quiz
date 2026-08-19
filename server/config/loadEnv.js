const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
const localEnvPath = path.resolve(__dirname, '..', '.env.local');
const sharedLocalEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
const realEnvironment = new Set(Object.keys(process.env));

// .env를 먼저 읽고, 실제 환경변수는 보호한 채 .env.local이 파일 값을 덮어씁니다.
// 우선순위: 실제 환경변수 > .env.local > .env
dotenv.config({ path: envPath });

if (fs.existsSync(localEnvPath)) {
  const localValues = dotenv.parse(fs.readFileSync(localEnvPath));
  Object.entries(localValues).forEach(([key, value]) => {
    if (!realEnvironment.has(key)) {
      process.env[key] = value;
    }
  });
}

// 로컬 개발 JWT는 두 서버가 저장소 루트의 단일 값만 사용하도록 합니다.
if (
  !realEnvironment.has('JWT_SECRET')
  && process.env.NODE_ENV === 'development'
  && fs.existsSync(sharedLocalEnvPath)
) {
  const sharedValues = dotenv.parse(fs.readFileSync(sharedLocalEnvPath));
  if (sharedValues.JWT_SECRET_LOCAL) {
    process.env.JWT_SECRET = sharedValues.JWT_SECRET_LOCAL;
  }
}

module.exports = process.env;
