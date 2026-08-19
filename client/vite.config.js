import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const stripApiPath = (value) => value.replace(/\/api\/?$/, '')

const loadProductionEnv = (cwd) => {
  const env = {}
  for (const fileName of ['.env', '.env.production']) {
    const filePath = path.join(cwd, fileName)
    if (fs.existsSync(filePath)) {
      Object.assign(env, dotenv.parse(fs.readFileSync(filePath)))
    }
  }
  return env
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const cwd = globalThis['process'].cwd()
  const isProductionBuild = mode === 'production'
  // 프로덕션 빌드가 .env.local의 로컬 URL을 삽입하지 않도록 일반 파일만 읽습니다.
  const fileEnv = isProductionBuild
    ? loadProductionEnv(cwd)
    : loadEnv(mode, cwd, '')
  const env = { ...fileEnv, ...(globalThis['process']?.env || {}) }
  const apiUrl = env.VITE_API_URL || '/api'
  const apiTarget = apiUrl.startsWith('http')
    ? stripApiPath(apiUrl)
    : (env.VITE_DEV_API_ORIGIN || 'http://localhost:55712')
  const devPort = Number(env.VITE_DEV_PORT || 55713)
  const productionDefine = isProductionBuild
    ? Object.fromEntries(
      Object.entries(env)
        .filter(([key]) => key.startsWith('VITE_'))
        .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
    )
    : undefined

  return {
    // 수동으로 읽은 프로덕션 환경 변수만 클라이언트 번들에 주입합니다.
    ...(isProductionBuild ? { envFile: false, define: productionDefine } : {}),
    plugins: [react()],
    server: {
      port: devPort,
      host: 'localhost',
      strictPort: true,
      hmr: {
        host: 'localhost',
        clientPort: devPort,
        protocol: 'ws',
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
