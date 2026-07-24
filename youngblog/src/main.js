import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

import '@fortawesome/fontawesome-free/css/all.min.css'

// 从 src/css/ 导入
import './css/style.css'
import './css/butterfly.css'
import './css/responsive.css'
import './css/search.css'
import 'highlight.js/styles/atom-one-dark.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')