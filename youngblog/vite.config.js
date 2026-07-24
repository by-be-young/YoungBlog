import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command }) => {
  // 开发环境用 '/'，生产环境（GitHub Pages）用仓库名
  const base = command === 'serve' ? '/' : '/YoungBlog/'

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
          // rolldown（Vite 8）要求 manualChunks 为函数，不支持对象格式
          manualChunks(id) {
            if (
              id.includes('node_modules/vue/') ||
              id.includes('node_modules/vue-router/') ||
              id.includes('node_modules/pinia/')
            ) {
              return 'vendor'
            }
          }
        }
      }
    }
  }
})