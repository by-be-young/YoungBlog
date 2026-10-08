<template>
  <!--
    博客详情页主容器
    - 使用 ref 引用以便在 JS 中操作 DOM（如切换沉浸模式类名）
    - 包含文章内容、目录导航、悬浮控制栏及各类弹窗
  -->
  <main ref="mainRef" class="blog-detail-page">
    <div class="container">
      <!--
        目录导航组件 (Table of Contents)
        - 传入渲染后的 HTML 字符串，组件内部解析标题层级生成目录
        - 通过具名插槽 #footer 在目录底部嵌入上一篇/下一篇导航
      -->
      <TOC :content-html="renderedHtml">
        <template #footer>
          <!--
            文章导航组件
            @prop prev    - 上一篇博客对象（可能为 null）
            @prop next    - 下一篇博客对象（可能为 null）
            @prop similar - 相似博客对象（可能为 null）
            @event navigate - 导航跳转事件，携带目标路径
          -->
          <PostNav :prev="prevBlog" :next="nextBlog" :similar="similarBlog" @navigate="navigate" />
        </template>
      </TOC>

      <!--
        文章主体区域
        - 动态绑定 wide-mode 类：当设置中 isImmersive 为 true 时启用宽屏模式
      -->
      <article class="blog-article" :class="{ 'wide-mode': settings.isImmersive }">
        <!-- 文章头部：标题、元信息、标签 -->
        <header class="article-header">
          <!-- 文章标题，博客数据未加载时显示占位文本 -->
          <h1 class="article-title">{{ blog?.title || '加载中...' }}</h1>

          <div class="article-meta">
            <!--
              发布日期
              - 使用可选链操作符避免 blog 为 null 时报错
              - 调用 formatDate 函数进行本地化格式化
            -->
            <span class="date"><i class="far fa-calendar"></i> {{ blog ? formatDate(blog.date) : '' }}</span>

            <!--
              最后编辑日期
              - 仅在 lastEditedDate 存在时渲染
            -->
            <span v-if="blog?.lastEditedDate" class="date">
              <i class="fas fa-pencil-alt"></i> {{ formatDate(blog.lastEditedDate) }}
            </span>

            <!-- 文章指标数据：字数、PV、UV -->
            <div class="article-metrics">
              <!-- 字数统计 -->
              <span class="article-metric-item"><i class="far fa-file-lines"></i> {{ wordCount }}</span>
              <!-- 页面浏览量 (Page View)，仅在有数据时显示 -->
              <span class="article-metric-item" v-if="pv"><i class="far fa-eye"></i> {{ pv }}</span>
              <!-- 独立访客数 (Unique Visitor)，仅在有数据时显示 -->
              <span class="article-metric-item" v-if="uv"><i class="far fa-user"></i> {{ uv }}</span>
            </div>

            <!-- 标签列表，每个标签链接到分类页面并携带标签参数 -->
            <div class="tags" v-if="blog?.tags">
              <router-link v-for="tag in blog.tags" :key="tag" class="tag"
                :to="`/categories?tags=${encodeURIComponent(JSON.stringify([tag]))}`">
                {{ tag }}
              </router-link>
            </div>
          </div>
        </header>

        <!--
          文章内容渲染组件
          - 接收已通过 Markdown 渲染为 HTML 的字符串
          - 组件内部负责安全渲染（如 v-html）及代码高亮等
        -->
        <BlogContent :html="renderedHtml" :article-id="blog?.id || ''" />

        <!--
          版权声明组件
          - 传入当前文章的永久链接，用于生成版权信息
        -->
        <LicenseNotice :permalink="permalink" />
      </article>
    </div>

    <!--
      悬浮控制栏组件
      @event toggle-immersive - 切换沉浸阅读模式
      @event open-export      - 打开导出弹窗
      @event open-display     - 打开显示设置弹窗
      @event back             - 返回引用来源位置
    -->
    <FloatingControls @toggle-immersive="toggleImmersive" @open-export="openExportModal"
      @open-display="openDisplayModal" @back="backToPrevious" />

    <!--
      导出弹窗组件
      - 通过 ref 获取组件实例以便调用其 open() 方法
      - 传入原始 Markdown 内容作为导出源
    -->
    <ExportModal ref="exportModalRef" :markdown-content="rawMarkdown" :md-source-path="blog?.contentFile || ''" :article-title="blog?.title || 'post'" />

    <!-- 显示设置弹窗组件 -->
    <DisplayModal ref="displayModalRef" />

    <!--
      沉浸阅读模式提示
      - 动态绑定 CSS 类名控制显示/隐藏及淡入淡出动画
      - 文案按设备分流：桌面读 immersive_hint_esc（按 Esc 退出），
        触屏读 immersive_hint_touch（轻点下方按钮退出）——触屏没有 Esc 键，写死 Esc 是错的
      - 文案里的 Esc 关键字仍以原「彩色关键字」样式渲染，桌面端视觉与改动前一致
    -->
    <div id="immersive-read-hint" :class="hintClass">
      <span class="immersive-hint-line">
        <span v-for="(seg, idx) in hintSegments" :key="idx"
          :class="{ 'immersive-key': seg.highlight }">{{ seg.text }}</span>
      </span>
    </div>

    <!--
      移动端沉浸阅读「退出胶囊」
      - 触屏设备没有 Esc 键：没有常驻可点的退出入口，用户会被困在沉浸模式里
      - 单击「立即」退出沉浸模式（不做「先展开、再点第二次」的两段式交互）
      - 仅触屏/平板可见：桌面端的显隐完全交给 CSS 媒体查询（默认 display: none），
        桌面端仍沿用顶部提示 + Esc 退出，交互不变
    -->
    <button v-if="settings.isImmersive" type="button" class="immersive-exit-fab"
      :class="{ 'is-collapsed': pillCollapsed }" :aria-label="i18n.get('immersive_exit')"
      @click="exitImmersive">
      <i class="fas fa-compress-arrows-alt" aria-hidden="true"></i>
      <span class="immersive-exit-fab-text">{{ i18n.get('immersive_exit') }}</span>
    </button>
  </main>
</template>

<script setup>
/**
 * 博客详情页 - 脚本逻辑
 * 
 * 功能概述：
 * 1. 根据路由参数加载博客文章及其 Markdown 内容
 * 2. 渲染 Markdown 为 HTML 并统计字数
 * 3. 计算上一篇/下一篇/相似文章导航
 * 4. 提供沉浸阅读模式切换（含键盘 Esc 退出）
 * 5. 管理导出弹窗、显示设置弹窗的打开
 * 6. 处理内部引用返回逻辑
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blogStore'
import { useI18nStore } from '@/stores/i18nStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMarkdown } from '@/composables/useMarkdown'
import { resolveUrl } from '@/utils/url'

// ==================== 组件导入 ====================
import TOC from '@/components/blog-detail/TOC.vue'
import BlogContent from '@/components/blog-detail/BlogContent.vue'
import LicenseNotice from '@/components/common/LicenseNotice.vue'
import PostNav from '@/components/blog-detail/PostNav.vue'
import FloatingControls from '@/components/blog-detail/FloatingControls.vue'
import ExportModal from '@/components/blog-detail/ExportModal.vue'
import DisplayModal from '@/components/blog-detail/DisplayModal.vue'

/**
 * 详情页背景图片 URL
 * - 使用 resolveUrl 处理资源路径，确保在不同部署环境下正确加载
 */
const detailBgImg = `url(${resolveUrl('/assets/detail_bg.webp')})`

// ==================== 路由与状态管理 ====================
const route = useRoute()           // 当前路由对象，用于获取文章 ID
const router = useRouter()         // 路由器实例，用于编程式导航
const blogStore = useBlogStore()   // 博客数据仓库（Pinia store）
const i18n = useI18nStore()        // 国际化仓库
const settings = useSettingsStore()// 用户设置仓库（含沉浸模式状态）
const { renderMarkdown, stripFrontMatter } = useMarkdown() // Markdown 渲染组合式函数

// ==================== 文章相关响应式数据 ====================
/** 当前博客元数据对象（来自 blogStore） */
const blog = ref(null)
/** 原始 Markdown 字符串（从文件加载） */
const rawMarkdown = ref('')
/** 渲染后的 HTML 字符串 */
const renderedHtml = ref('')
/** 文章字数统计 */
const wordCount = ref(0)
/** 页面浏览量 (Page View) */
const pv = ref(0)
/** 独立访客数 (Unique Visitor) */
const uv = ref(0)
/** 组件是否仍然活跃（防止异步回调在卸载后继续执行） */
let isActive = true

// ==================== 导航文章响应式数据 ====================
/** 上一篇博客对象，无则为 null */
const prevBlog = ref(null)
/** 下一篇博客对象，无则为 null */
const nextBlog = ref(null)
/** 相似博客对象（基于标签匹配），无则为 null */
const similarBlog = ref(null)

// ==================== 弹窗组件引用 ====================
/** 导出弹窗组件实例 */
const exportModalRef = ref(null)
/** 显示设置弹窗组件实例 */
const displayModalRef = ref(null)

// ==================== 沉浸阅读提示相关状态 ====================
/**
 * 沉浸阅读提示的 CSS 类名
 * - 'is-visible'   : 提示可见
 * - 'is-fading'    : 提示淡出动画中
 * - ''（空字符串） : 提示隐藏
 */
const hintClass = ref('')
/**
 * 沉浸阅读提示自动淡出定时器 ID
 * - 进入沉浸模式后 3 秒触发淡出
 */
let hintTimer = null
/**
 * 页面主元素 DOM 引用
 * - 用于在切换沉浸模式时动态添加/移除 CSS 类
 */
const mainRef = ref(null)

/**
 * 页面主元素的「普通变量」副本
 * - Vue 卸载组件子树时就会把模板 ref 置空，而 onUnmounted 里仍需要清理它身上的类名
 *   （路由离开动画期间旧 DOM 还会短暂停留在页面上，带着沉浸样式播放离场动画），
 *   因此在挂载时另存一份引用
 */
let mainEl = null

// ==================== 移动端退出胶囊相关状态 ====================
/**
 * 退出胶囊是否处于「收起」态
 * - false：完整显示（刚进入沉浸模式，或被用户轻点「呼出」之后）
 * - true ：半透明 + 略微缩小，但仍然保持可点按（进入沉浸模式约 3.2 秒后自动进入）
 */
const pillCollapsed = ref(false)
/**
 * 胶囊自动收起定时器 ID
 * - 进入沉浸模式（或用户轻点呼出）后 3.2 秒把胶囊切到收起态
 */
let pillCollapseTimer = null

// ==================== 设备形态（触屏）判定 ====================
/**
 * 是否为触屏/无精确指针设备
 * - 用媒体查询而非 UA 嗅探：UA 可被伪装，媒体特性反映的是浏览器真实的输入能力
 * - 顶部沉浸提示的文案按它分流（触屏没有 Esc 键），不能写死
 */
const isTouchDevice = ref(false)
/** 触屏判定媒体查询对象（保留引用，卸载时需要移除 change 监听） */
let touchPointerQuery = null
/**
 * 触屏判定的兜底媒体查询（平板及以下宽度）
 * - 原因一：部分触屏笔记本只报告 hover:hover + pointer:coarse，只看指针特性会漏判；
 * - 原因二：只切换视口宽度的预览/自动化环境不会改变指针媒体特性，
 *   若只认指针特性，这些场景会同时丢掉触屏文案和退出入口；
 * - 注意：1100px 必须与下方 CSS 中控制胶囊显隐的媒体查询保持一致
 */
let narrowViewportQuery = null

/**
 * 媒体查询变化回调
 * - 任一判定命中即视为触屏形态；外接鼠标、平板接键盘等场景可实时切换提示文案
 */
function onTouchMediaChange() {
  isTouchDevice.value = !!(touchPointerQuery?.matches || narrowViewportQuery?.matches)
}

// ==================== 计算属性 ====================

/**
 * 文章的永久链接
 * - 基于当前页面的 origin 构建完整 URL
 * - 用于版权声明、分享等功能
 * - 仅在 blog 数据加载后计算
 */
const permalink = computed(() => {
  if (!blog.value) return ''
  return new URL(`/blog-detail?id=${blog.value.id}`, window.location.origin).href
})

/**
 * 顶部沉浸提示的文案分段
 *
 * 背景：提示文案此前写死中文「按 Esc 退出」，触屏设备没有 Esc 键，提示内容本身就是错的。
 * 现在按设备读取 i18n：
 * - 桌面：immersive_hint_esc（沉浸阅读模式 · 按 Esc 退出）
 * - 触屏：immersive_hint_touch（沉浸阅读模式 · 轻点下方按钮退出）
 *
 * 桌面文案里原本就把 Esc 高亮成彩色关键字，为了不改动桌面端既有视觉，
 * 这里按关键字 'Esc' 把整句切成「普通文本 / 高亮文本」若干段渲染：
 * 既不写死中英文案，又保留原有的强调效果。
 *
 * @returns {Array<{ text: string, highlight: boolean }>} 文案分段
 */
const hintSegments = computed(() => {
  const text = i18n.get(isTouchDevice.value ? 'immersive_hint_touch' : 'immersive_hint_esc')
  const keyword = 'Esc'
  const idx = text.indexOf(keyword)
  // 找不到关键字（某些语言可能不出现 Esc）时整句按普通文本渲染，保证不会丢字
  if (idx === -1) return [{ text, highlight: false }]
  return [
    { text: text.slice(0, idx), highlight: false },
    { text: keyword, highlight: true },
    { text: text.slice(idx + keyword.length), highlight: false },
  ]
})

// ==================== 工具函数 ====================

/**
 * 格式化日期字符串为本地化显示
 * 
 * @param {string} dateStr - ISO 日期字符串
 * @returns {string} 格式化后的日期文本
 * 
 * 语言映射：
 * - 中文 (zh-CN): 2024年1月15日
 * - 英文 (en):    Jan 15, 2024
 * - 日文 (ja):    2024年1月15日
 * - 其他/异常情况: 返回原始字符串
 */
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const lang = i18n.lang
  try {
    if (lang === 'en') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (lang === 'ja') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    // 兜底：日期对象无效或格式化失败时返回原始输入
    return dateStr
  }
}

// ==================== 核心功能函数 ====================

/**
 * 加载博客文章
 * 
 * 执行流程：
 * 1. 从路由参数获取文章 ID
 * 2. 在 blogStore 中查找对应博客（若缓存为空则先拉取数据）
 * 3. 加载 Markdown 文件内容
 * 4. 剥离 Front Matter 并渲染为 HTML
 * 5. 统计字数（排除代码块和 Markdown 语法字符）
 * 6. 计算上一篇/下一篇/相似文章
 * 7. 更新页面标题
 * 
 * 异常处理：
 * - 博客不存在时重定向到首页
 * - Markdown 加载失败时显示错误提示
 */
async function loadBlog() {
  const id = route.params.id
  if (!id) return  // 导航离开后不再加载

  // 步骤 1-2: 查找博客元数据
  let found = blogStore.getBlogById(id)
  if (!found) {
    // 缓存未命中，异步拉取博客列表
    await blogStore.fetchBlogs()
    if (!isActive) return
    found = blogStore.getBlogById(id)
    if (!found) {
      // 拉取后仍未找到，重定向至首页
      router.push('/')
      return
    }
  }
  blog.value = found

  // 步骤 3-5: 加载并渲染 Markdown 内容
  if (found.contentFile) {
    try {
      // 发起 HTTP 请求获取 Markdown 文件
      const res = await fetch(resolveUrl(found.contentFile))
      if (!isActive) return
      const text = await res.text()
      rawMarkdown.value = text

      // 剥离 YAML Front Matter（位于文件开头，由 --- 包裹的元数据）
      const cleaned = stripFrontMatter(text)

      /**
       * 字数统计算法
       * - 移除代码块（```...```）避免统计代码
       * - 移除 Markdown 语法字符（#, >, *, ~, - 等）
       * - 移除空白字符后统计剩余字符数
       */
      const cleanText = cleaned
        .replace(/```[\s\S]*?```/g, ' ')   // 替换代码块为空格
        .replace(/[#>*~-]/g, ' ')           // 移除 Markdown 语法标记（'-' 在字符类末尾无需转义）
        .replace(/\s+/g, '')                // 移除所有空白字符
      wordCount.value = cleanText.length

      // 将 Markdown 渲染为 HTML
      const html = await renderMarkdown(cleaned, found.contentFile)
      if (!isActive) return
      renderedHtml.value = html

      // 注意：TOC 组件会监听 content-html prop 的变化自动生成目录
      // 无需手动调用生成方法

      // 更新浏览器标签页标题
      document.title = found.title || '博客详情'
    } catch (e) {
      // Markdown 加载或渲染失败
      console.error('[BlogDetail] 加载失败', e)
      renderedHtml.value = '<p>文章加载失败</p>'
    }
  }

  // 步骤 6: 计算导航文章
  const allBlogs = blogStore.blogs
  const series = found.series || ''
  // 两个分支都会立即赋值，这里不预设初值，避免一次马上被覆盖的无用赋值（静态检查会报错）
  let sorted

  if (series) {
    // 有系列归属：按系列筛选并按 order 字段排序
    sorted = allBlogs
      .filter(b => b.series === series)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  } else {
    // 无系列归属：按发布日期排序
    sorted = allBlogs.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // 在排序列表中找到当前文章的位置索引
  const idx = sorted.findIndex(b => String(b.id) === String(found.id))
  if (idx > -1) {
    prevBlog.value = sorted[idx - 1] || null  // 前一篇（索引 -1 时为 null）
    nextBlog.value = sorted[idx + 1] || null  // 后一篇（超出范围时为 null）
  }

  // 相似文章计算（仅对非系列文章生效）
  if (!series) {
    const tags = found.tags || []
    let similar = null

    /**
     * 相似度匹配策略（按优先级降级）：
     * 1. 前 3 个标签完全匹配
     * 2. 前 2 个标签匹配
     * 3. 第 1 个标签匹配
     * 匹配到即停止降级
     */
    if (tags.length >= 3) {
      similar = allBlogs.find(
        b => String(b.id) !== String(found.id) &&
          b.tags && b.tags[0] === tags[0] &&
          b.tags[1] === tags[1] && b.tags[2] === tags[2]
      )
    }
    if (!similar && tags.length >= 2) {
      similar = allBlogs.find(
        b => String(b.id) !== String(found.id) &&
          b.tags && b.tags[0] === tags[0] &&
          b.tags[1] === tags[1]
      )
    }
    if (!similar && tags.length >= 1) {
      similar = allBlogs.find(
        b => String(b.id) !== String(found.id) &&
          b.tags && b.tags[0] === tags[0]
      )
    }
    similarBlog.value = similar
  }
}

/**
 * 导航跳转处理函数
 * 
 * @param {string} href - 目标路径
 * 
 * 优先使用全局的 navigateWithTransition（带页面过渡动画），
 * 若不存在则回退到 vue-router 的 push 方法
 */
function navigate(href) {
  if (window.navigateWithTransition) {
    window.navigateWithTransition(href)
  } else {
    router.push(href)
  }
}

// ==================== 沉浸阅读模式 ====================

/**
 * 切换沉浸阅读模式
 * 
 * 执行操作：
 * 1. 在 Pinia store 中切换 isImmersive 状态
 * 2. 在 body 和主元素上同步切换 CSS 类名
 *    - 'immersive-reading-active': 沉浸阅读样式
 *    - 'wide-mode-active': 宽屏布局样式
 *    - 'immersive-mobile-mode': 移动端沉浸形态（安全区留白等）
 * 3. 进入时隐藏顶部导航栏并显示提示；触屏下额外启动底部退出胶囊的收起节奏
 * 4. 退出时恢复导航栏、隐藏提示并复位胶囊
 */
function toggleImmersive() {
  const isNowImmersive = !settings.isImmersive
  settings.toggleImmersive()

  // 同步 body 元素的类名（部分全局样式依赖 body 选择器）
  document.body.classList.toggle('immersive-reading-active', isNowImmersive)
  document.body.classList.toggle('wide-mode-active', isNowImmersive)

  // 同步主元素的类名（组件作用域样式依赖）
  // - immersive-mobile-mode：标记「移动端沉浸」形态，其中的安全区留白样式只在移动端媒体查询下生效，
  //   因此桌面端加上它也不会有任何视觉影响
  const rootEl = mainEl || mainRef.value
  if (rootEl) {
    rootEl.classList.toggle('immersive-reading-active', isNowImmersive)
    rootEl.classList.toggle('wide-mode-active', isNowImmersive)
    rootEl.classList.toggle('immersive-mobile-mode', isNowImmersive)
  }

  if (isNowImmersive) {
    // === 进入沉浸模式 ===
    // 隐藏顶部导航栏（导航栏位于 App.vue，非当前组件后代，需直接操作 DOM）
    const navbar = document.querySelector('.navbar')
    if (navbar) {
      navbar.style.transition = 'transform 0.28s ease, opacity 0.22s ease'
      navbar.style.transform = 'translateY(calc(-100% - 24px))'  // 向上移出视口（含额外间距）
      navbar.style.opacity = '0'
      navbar.style.pointerEvents = 'none'  // 防止隐藏后仍可点击
    }
    // 显示沉浸阅读提示
    showImmersiveHint()
    // 触屏下启动退出胶囊的「先完整显示、再自动收起」节奏
    // 桌面端不显示胶囊（纯 CSS 隐藏），无需计时
    if (isTouchDevice.value) {
      schedulePillCollapse()
    }
  } else {
    // === 退出沉浸模式 ===
    // 恢复顶部导航栏
    const navbar = document.querySelector('.navbar')
    if (navbar) {
      navbar.style.transform = ''       // 恢复原始位置
      navbar.style.opacity = ''         // 恢复原始透明度
      navbar.style.pointerEvents = ''   // 恢复交互能力
      // transition 保留，确保恢复过程也有动画效果
    }
    // 立即隐藏提示
    hideImmersiveHint()
    // 停掉收起定时器并复位胶囊形态，避免下一次进入沉浸模式时残留「收起」态
    clearPillTimer()
    pillCollapsed.value = false
  }
}

/**
 * 显示沉浸阅读提示
 * 
 * 行为：
 * - 立即可见（添加 'is-visible' 类）
 * - 3 秒后触发淡出（切换到 'is-fading' 类）
 * - 淡出动画完成后（350ms）移除所有类名，隐藏元素
 */
function showImmersiveHint() {
  clearTimeout(hintTimer)          // 清除可能存在的旧定时器
  hintClass.value = 'is-visible'   // 显示提示
  hintTimer = setTimeout(() => {
    hintClass.value = 'is-fading'  // 开始淡出
    setTimeout(() => {
      hintClass.value = ''         // 完全隐藏
    }, 350) // 350ms 对应 CSS 中 is-fading 的过渡时长
  }, 3000)
}

/**
 * 立即隐藏沉浸阅读提示
 * - 清除定时器防止后续状态变更
 * - 直接重置类名
 */
function hideImmersiveHint() {
  clearTimeout(hintTimer)
  hintClass.value = ''
}

// ==================== 移动端退出胶囊逻辑 ====================

/**
 * 启动退出胶囊的收起节奏
 * 
 * 行为：
 * - 先恢复完整显示：用户刚进入沉浸模式时必须一眼看到「怎么退出」
 * - 3.2 秒后转为收起态（半透明 + 略微缩小），避免长期遮挡正文；收起态依旧可点按
 */
function schedulePillCollapse() {
  clearPillTimer()
  pillCollapsed.value = false
  pillCollapseTimer = setTimeout(() => {
    // 异步回调里再确认一次是否仍在沉浸模式：这 3.2 秒内用户可能已经退出
    if (settings.isImmersive) pillCollapsed.value = true
  }, 3200) // 3.2s：比顶部提示的 3s 稍晚，避免两个提示同一瞬间变化，显得突兀
}

/**
 * 清除胶囊自动收起定时器
 * - 退出沉浸模式与组件卸载时都必须调用，防止定时器在界面已变化后仍去改状态
 */
function clearPillTimer() {
  clearTimeout(pillCollapseTimer)
  pillCollapseTimer = null
}

/**
 * 全局轻点处理：轻点屏幕任意位置（含胶囊自身）都把胶囊「呼出」为完整显示
 * - 等价于「点一下就能看清退出按钮」，随后重新按 3.2 秒节奏收起
 * - 用 pointerdown 统一鼠标/触屏/触控笔，无需分别监听 mousedown 与 touchstart
 */
function onGlobalTap() {
  if (!settings.isImmersive || !isTouchDevice.value) return
  schedulePillCollapse()
}

/**
 * 退出沉浸模式（供移动端退出胶囊调用）
 * - 与 toggleImmersive 的区别：只有当前确实处于沉浸模式才退出，
 *   避免与 Esc / 其他入口并发触发时把状态又切回沉浸模式
 */
function exitImmersive() {
  if (settings.isImmersive) toggleImmersive()
}

/**
 * 全局键盘事件处理器
 * 
 * @param {KeyboardEvent} e - 键盘事件对象
 * 
 * 当用户按下 Escape 键且当前处于沉浸模式时，退出沉浸模式
 */
function onKeyDown(e) {
  if (e.key === 'Escape' && settings.isImmersive) {
    toggleImmersive()
  }
}

// ==================== 弹窗控制函数 ====================

/**
 * 打开导出弹窗
 * - 通过组件实例引用调用其 open 方法
 */
function openExportModal() {
  exportModalRef.value?.open()
}

/**
 * 打开显示设置弹窗
 */
function openDisplayModal() {
  displayModalRef.value?.open()
}

/**
 * 返回引用来源位置
 * 
 * 背景：当用户从其他页面通过内部引用跳转到当前文章时，
 * 系统会在 window 上存储引用状态，包含来源页面的滚动位置。
 * 此函数恢复该滚动位置，实现"返回引用位置"功能。
 */
function backToPrevious() {
  if (window.__internalRefBackState?.available) {
    const state = window.__internalRefBackState
    // 平滑滚动到来源位置
    window.scrollTo({ top: state.scrollY, behavior: 'smooth' })
    // 恢复 URL 中的 hash（如果有）
    if (state.hash) history.replaceState(null, '', state.hash)
    // 标记状态已消费（不可再次使用）
    state.available = false
    // 派发自定义事件通知其他组件状态已变更
    window.dispatchEvent(new CustomEvent('internal-ref:back-state-change'))
  }
}

// ==================== 生命周期钩子 ====================

/**
 * 组件挂载时：
 * 1. 保存主元素引用（onUnmounted 里模板 ref 已被置空，见 mainEl 注释）
 * 2. 读取并监听设备形态媒体查询（触屏提示文案 / 退出胶囊节奏都依赖它）
 * 3. 注册全局键盘事件监听（用于 Esc 退出沉浸模式）
 * 4. 注册全局轻点监听（触屏下「点击呼出」底部退出胶囊）
 * 5. 加载博客数据（若 store 中已有数据则直接加载，否则先拉取）
 */
onMounted(() => {
  mainEl = mainRef.value
  // 设备形态判定：挂载时读取一次并持续监听，外接鼠标/平板接键盘时提示文案能实时切换
  if (typeof window.matchMedia === 'function') {
    touchPointerQuery = window.matchMedia('(hover: none) and (pointer: coarse)')
    narrowViewportQuery = window.matchMedia('(max-width: 1100px)')
    onTouchMediaChange()
    touchPointerQuery.addEventListener('change', onTouchMediaChange)
    narrowViewportQuery.addEventListener('change', onTouchMediaChange)
  }
  document.addEventListener('keydown', onKeyDown)
  // 轻点「呼出」胶囊：在捕获阶段监听，保证页面内任何元素（即便子组件里 stopPropagation）都能触发
  document.addEventListener('pointerdown', onGlobalTap, true)
  if (!blogStore.blogs.length) {
    // 博客列表为空，先异步获取再加载文章
    blogStore.fetchBlogs().then(loadBlog)
  } else {
    // 已有缓存，直接加载
    loadBlog()
  }
})

/**
 * 组件卸载时清理：
 * 1. 移除键盘/轻点事件监听与媒体查询监听
 * 2. 清除沉浸提示、退出胶囊的定时器
 * 3. 清理所有可能残留的全局状态（body class、主元素 class、navbar 样式等）
 * 4. 复位 store 中的沉浸状态
 */
onUnmounted(() => {
  isActive = false
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('pointerdown', onGlobalTap, true)
  clearTimeout(hintTimer)
  clearPillTimer()
  // 移除媒体查询监听，避免组件销毁后回调仍去改动已卸载的响应式状态
  if (typeof window.matchMedia === 'function') {
    touchPointerQuery?.removeEventListener('change', onTouchMediaChange)
    narrowViewportQuery?.removeEventListener('change', onTouchMediaChange)
  }
  pillCollapsed.value = false
  // 清理 body 上可能残留的 class
  document.body.classList.remove(
    'immersive-reading-active', 'wide-mode-active',
    'image-viewer-open', 'mermaid-viewer-open',
    'export-modal-open', 'display-modal-open'
  )
  // 清理主元素上的沉浸/宽屏类名
  // - 离开详情页有过渡动画，旧 DOM 会短暂留在页面上，不清掉会带着沉浸样式播完离场动画
  const rootEl = mainEl || mainRef.value
  if (rootEl) {
    rootEl.classList.remove('immersive-reading-active', 'wide-mode-active', 'immersive-mobile-mode')
  }
  // 恢复导航栏内联样式（如果被沉浸模式修改过）
  const navbar = document.querySelector('.navbar')
  if (navbar) {
    navbar.style.cssText = ''
  }
  // 复位 store 中的沉浸状态：不做这一步的话，离开详情页后 isImmersive 仍为 true，
  // 沉浸状态会被带到其他页面（实测表现为导航栏/悬浮元素在别的页面也不正常）
  // 注意：settingsStore 未提供 setter，此处按 Pinia setup store 的写法直接赋值
  settings.isImmersive = false
})

// ==================== 路由监听 ====================

/**
 * 监听路由参数中文章 ID 的变化
 * - 当用户在详情页之间导航时（如点击上一篇/下一篇），
 *   组件不会重新挂载，需通过 watch 手动触发重新加载
 */
watch(() => route.params.id, (newId) => {
  if (newId) loadBlog()
})
</script>


<style scoped>
/* ===== 页面背景（伪元素） ===== */
.blog-detail-page {
  --h3-heading-color: #ff8f9e;
  --primary-color: #55c8ff;
  --secondary-color: #a7f3d0;
  --detail-pink: #ffb6c9;
  --detail-peach: #ffd2a6;
  --detail-mint: #a7f3d0;
  --detail-sky: #9ad7ff;
  --detail-text: #2b3440;
  --detail-muted: #5f6b7a;
  --detail-shadow: 0 16px 34px rgba(44, 62, 80, 0.14);
  --detail-border: linear-gradient(135deg, rgba(255, 182, 201, 0.95), rgba(154, 215, 255, 0.92), rgba(167, 243, 208, 0.92));
  position: relative;
  z-index: 2;
  min-height: 100vh;
  background: none;
}

.blog-detail-page::before {
  content: '';
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100vh;
  height: 100svh;
  background-image: v-bind(detailBgImg);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  transform: scale(1);
  opacity: 1;
  transition: opacity 1.05s cubic-bezier(0.22, 1, 0.36, 1), transform 1.05s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 0;
}

.blog-detail-page::after {
  content: '';
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100vh;
  height: 100svh;
  background: linear-gradient(135deg,
      rgba(255, 182, 201, 0.18) 0%,
      rgba(167, 243, 208, 0.18) 45%,
      rgba(199, 182, 255, 0.16) 100%);
  opacity: 1;
  transition: opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1), background 0.95s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 1;
}

/* 沉浸阅读：淡出背景图 */
.blog-detail-page.immersive-reading-active::before {
  opacity: 0;
  transform: scale(1.04);
}

.blog-detail-page.immersive-reading-active::after {
  background: rgba(247, 250, 253, 0.96);
}

/* ===== 容器 ===== */
.container {
  display: flex;
  gap: 32px;
  position: relative;
  z-index: 2;
}

/* ===== 文章卡片 ===== */
.blog-article {
  flex: 1;
  max-width: 900px;
  width: 100%;
  min-width: 0;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 16px;
  box-shadow: var(--detail-shadow);
  padding: 40px 32px 32px 32px;
  margin-top: 40px;
  margin-bottom: 40px;
  border: 5px solid transparent;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)),
    var(--detail-border);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
}

/* 宽屏模式 */
.blog-article.wide-mode {
  max-width: 1200px;
  width: calc(100% - 96px);
  margin-left: auto;
  margin-right: auto;
  transition: max-width 0.28s ease, width 0.28s ease, box-shadow 0.28s ease;
}

/* ===== 文章头部 ===== */
.article-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  margin-bottom: 28px;
  padding-bottom: 18px;
}

.article-title {
  font-size: 2.2rem;
  margin-bottom: 10px;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(90deg, #00acff 0%, #48dbbb 50%, #ff6e9b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 6px 12px rgba(0, 172, 255, 0.12));
}

.article-meta {
  color: var(--gray-color, #5f6b7a);
  font-size: 1rem;
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 8px;
}

.article-metrics {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 1.6em;
}

.article-metric-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5f6b7a;
  font-size: 0.96rem;
}

.article-metric-item i {
  font-size: 0.95rem;
  opacity: 0.88;
}

.tags {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag {
  background: rgba(52, 152, 219, 0.08);
  color: var(--primary-color, #2d8cf0);
  border-radius: 12px;
  padding: 3px 12px;
  font-size: 0.92rem;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
  transition: background 160ms ease, transform 120ms ease, color 120ms ease;
  color: #18313a;
  font-weight: 600;
}

a.tag:hover {
  background: rgba(52, 152, 219, 0.14);
  transform: translateY(-2px);
  text-decoration: none;
}

/* 沉浸阅读 & 宽屏：文章轮廓与阴影 */
.blog-detail-page.immersive-reading-active .blog-article,
.blog-detail-page.wide-mode-active .blog-article {
  outline: 4px solid rgba(255, 110, 155, 0.9);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
}

/* 沉浸阅读 & 宽屏：容器居中对齐 */
.blog-detail-page.immersive-reading-active .container,
.blog-detail-page.wide-mode-active .container {
  justify-content: center;
}

/* 沉浸模式：隐藏目录（PC 端侧栏）
   必须用 :deep() 穿透：.blog-toc 渲染在子组件 TOC.vue 内部（且不是该组件根元素），
   scoped 样式不穿透时选择器匹配不到它，规则会静默失效（此前 PC 端沉浸态目录侧栏一直未隐藏）。
   移动端弹层在打开时由 TOC.vue 的 .blog-toc.in-overlay.is-open { display: flex } 以更高权重恢复显示，不受影响。 */
.blog-detail-page.immersive-reading-active :deep(.blog-toc) {
  display: none;
}


/* ============================================
   沉浸阅读全局样式（:deep 穿透子组件作用域）
   ============================================ */

/* 浮动控件过渡基础（#floating-controls 是子组件根元素，无需 :deep 即可作用） */
#floating-controls {
  transition: transform 0.28s ease, opacity 0.22s ease, visibility 0.22s ease !important;
}

.blog-detail-page :deep(.toc-fab) {
  transition: transform 0.28s ease, opacity 0.22s ease, visibility 0.22s ease !important;
}

/*
 * 沉浸模式：隐藏浮动控件
 * - 说明：这里刻意不带 `:not(.immersive-mobile-mode)` 一类的排除条件。
 *   改动前那个排除条件依赖一个从未被添加过的类名，等价于「无条件生效」；
 *   现在 immersive-mobile-mode 会真实出现在主元素上，若保留排除条件反而会
 *   改变移动端的实际表现（悬浮球在沉浸模式下不再隐藏），所以只保留有效选择器。
 * - 移动端沉浸时的退出入口由底部常驻胶囊承担（见 .immersive-exit-fab），不依赖悬浮球
 */
.blog-detail-page.immersive-reading-active #floating-controls {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(28px) scale(0.96) !important;
}

/* 沉浸模式：隐藏目录 FAB（移动端目录按钮被注入在悬浮球组里，需要单独隐藏） */
.blog-detail-page.immersive-reading-active :deep(.toc-fab) {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(28px) scale(0.96) !important;
}

/* 沉浸模式：隐藏目录覆盖层（沉浸时应只剩正文，弹层不允许再出现） */
.blog-detail-page.immersive-reading-active :deep(.toc-overlay) {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* ===== 沉浸阅读提示 ===== */
#immersive-read-hint {
  position: fixed;
  /* 叠加安全区高度：viewport-fit=cover 后刘海/状态栏会覆盖内容，提示不能顶到刘海下面
     （桌面端 env() 为 0，位置数值与改动前完全一致） */
  top: calc(14px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translate(-50%, -10px);
  z-index: 1205;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(24, 49, 58, 0.16);
  background: rgba(255, 255, 255, 0.88);
  color: #18313a;
  font-size: 0.92rem;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(24, 49, 58, 0.12);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.32s ease, visibility 0.3s ease;
  text-align: center;
  line-height: 1.35;
}

#immersive-read-hint.is-visible {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}

#immersive-read-hint.is-fading {
  opacity: 0;
  transform: translate(-50%, -8px);
}

#immersive-read-hint .immersive-key {
  color: #ff6e9b;
  font-weight: 800;
}

#immersive-read-hint .immersive-hint-line {
  display: block;
}

/* ============================================
   移动端沉浸阅读：底部常驻「退出胶囊」
   ============================================ */
/*
 * 设计意图：
 * - 触屏设备没有 Esc 键，沉浸模式必须有一个常驻可点的退出入口，否则用户会被困住；
 * - 固定在底部居中：不抢占右下角悬浮球的位置，也不遮挡右上角的显示设置弹窗；
 * - bottom 叠加 env(safe-area-inset-bottom)：避开 iPhone 底部手势条（依赖 index.html 的 viewport-fit=cover）；
 * - z-index 取 1205：高于悬浮球组(1000)与目录弹层(1099)，低于弹窗(1210)与导航抽屉(1600)。
 *
 * 默认 display: none —— 桌面端不出现胶囊，仍沿用顶部提示 + Esc 退出，交互与改动前一致；
 * 只在下方媒体查询命中触屏/平板时才显示。
 */
.immersive-exit-fab {
  display: none;
  position: fixed;
  left: 50%;
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  z-index: 1205;
  /* 触控热区不小于 44×44 CSS px：纵向用 min-height 保证，横向由文字长度 + 左右内边距保证 */
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  /* 文案不换行、且不超出视口：其它语言（如英文 Exit immersive reading）文案更长，
     换行会把胶囊撑成两块而不是一个「胶囊」；
     width: max-content 让盒子按内容收缩，配合 translateX(-50%) 才能精确居中 */
  white-space: nowrap;
  width: max-content;
  max-width: calc(100vw - 24px);
  /* 玻璃拟态：半透明深色底 + 背景模糊，在深浅两种阅读背景上都清晰可读 */
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 999px;
  background: rgba(35, 47, 58, 0.62);
  color: #ffffff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 10px 26px rgba(24, 49, 58, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(10px) saturate(1.4);
  -webkit-backdrop-filter: blur(10px) saturate(1.4);
  cursor: pointer;
  opacity: 1;
  transform: translateX(-50%) scale(1);
  /* 触屏可用性：去掉双击缩放延迟与点击高亮块，避免点按时页面闪一下 */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: opacity 0.28s ease, transform 0.28s ease, background 0.2s ease;
}

/*
 * 收起态：整体半透明并略微缩小（长期不遮挡正文），但绝不可设 pointer-events: none，
 * 否则胶囊会变成看得见点不动的「假按钮」，用户依然出不去
 */
.immersive-exit-fab.is-collapsed {
  opacity: 0.62;
  transform: translateX(-50%) scale(0.94);
}

/* 按压反馈：触屏没有 hover，用缩小的 :active 给出「点到了」的确认 */
.immersive-exit-fab:active {
  transform: translateX(-50%) scale(0.9);
}

/* 键盘可达性：平板外接键盘用 Tab 找到胶囊时必须有清晰焦点环 */
.immersive-exit-fab:focus-visible {
  outline: 3px solid #ff6e9b;
  outline-offset: 3px;
}

.immersive-exit-fab i {
  font-size: 0.95rem;
}

/*
 * 胶囊显示条件：触屏（无悬停 + 粗指针）或平板及以下宽度（1100px）
 * 之所以叠加宽度条件：
 * 1. 部分触屏笔记本只报告 hover:hover + pointer:coarse，只看指针特性会漏判；
 * 2. 只切换视口宽度的预览/自动化环境不会改变指针媒体特性，
 *    只认指针会让这些环境（含验收用的 390×844 / 820×1180 视口）丢失退出入口。
 * 注意：1100px 必须与 script 中 narrowViewportQuery 的取值保持一致。
 */
@media (hover: none) and (pointer: coarse), (max-width: 1100px) {
  .immersive-exit-fab {
    display: inline-flex;
  }
}

/* 移动端适配 */
@media (max-width: 880px) {
  /* 目录改为左下角按钮 + 弹层（见 TOC.vue），正文占满整行 */
  .blog-detail-page .container {
    padding: 52px 14px 24px 14px;
    gap: 0;
  }

  /*
   * 移动端沉浸：导航栏已被隐藏，正文不需要再为它预留 52px，
   * 改为「安全区高度（刘海/状态栏）+ 少量呼吸空间」，避免正文顶到刘海区域
   */
  .blog-detail-page.immersive-mobile-mode .container {
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
  }

  .blog-article {
    max-width: 100%;
    margin-top: 8px;
    margin-bottom: 20px;
    padding: 22px 15px 18px 15px;
    border-width: 3px;
    border-radius: 14px;
  }

  .blog-article.wide-mode {
    width: 100%;
    max-width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

  .article-title {
    font-size: 1.6rem;
    line-height: 1.35;
    gap: 6px;
  }

  .article-header {
    margin-bottom: 20px;
    padding-bottom: 14px;
  }

  /* 移动端不需要外发光轮廓，避免窄屏出现横向滚动 */
  .blog-detail-page.immersive-reading-active .blog-article,
  .blog-detail-page.wide-mode-active .blog-article {
    outline: none;
  }

  #immersive-read-hint {
    /* 同样叠加安全区高度：移动端刘海屏上提示不能被状态栏压住 */
    top: calc(10px + env(safe-area-inset-top, 0px));
    padding: 7px 12px;
    font-size: 0.86rem;
    max-width: calc(100vw - 24px);
  }
}

@media (max-width: 720px) {
  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .article-meta>* {
    width: 100%;
  }

  .article-metrics {
    justify-content: flex-start;
  }

  .tags {
    flex-basis: auto;
  }

  .tag {
    font-size: 0.86rem;
    padding: 3px 10px;
  }
}
</style>