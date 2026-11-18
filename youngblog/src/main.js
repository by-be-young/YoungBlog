import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './app/App.vue'
import router from './router'
import './assets/styles/base.css'

import '@fortawesome/fontawesome-free/css/all.min.css'

// 从 src/assets/styles/ 导入
import './assets/styles/global.css'
import './assets/styles/butterfly.css'
import './assets/styles/responsive.css'
import './assets/styles/search.css'
import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'

const app = createApp(App)

// 入场加载屏：在挂载前给 <html> 打上标记，
// 以便锁定滚动、并让首页元素等揭幕后再播放入场动画
if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('entry-loading')
}

app.use(createPinia())
app.use(router)
app.mount('#app')