import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command }) => {
  // 开发环境用 '/'，生产环境（打包）用 '/byblog-vue/'
  const base = command === 'serve' ? '/' : '/byblog-vue/'

  return {
    plugins: [vue()],
    base: base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 5173,
      open: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia']
          }
        }
      }
    }
  }
})