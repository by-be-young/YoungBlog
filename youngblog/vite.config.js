import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  // 根据 mode 判断：'github' 模式用子路径，其他（默认）用根路径
  let base = '/'
  if (mode === 'github') {
    base = '/YoungBlog/'
  }

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