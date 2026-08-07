<template>
  <!--
    浮动控制面板容器
    - 固定在页面右下角
    - 使用 flex column-reverse 布局：
      DOM 顺序（从上到下）：回到顶部 → 设置按钮 → 子菜单
      视觉顺序（从下到上）：回到顶部 → 设置按钮 → 子菜单
      因此：子菜单在设置按钮上方展开，回到顶部在设置按钮下方出现
  -->
  <div id="floating-controls" role="region" aria-label="浮动操作面板">
    <!--
      回到顶部按钮
      - DOM 中最靠前的元素，在 column-reverse 下视觉上显示在最下方
      - 当页面滚动超过 300px 时显示
    -->
    <button v-show="showTop" class="floating-btn back-to-top-btn" :title="i18n.t('back_to_top').value" @click="scrollToTop">
      <i class="fas fa-arrow-up" aria-hidden="true"></i>
      <span class="sr-only">{{ i18n.t('back_to_top').value }}</span>
    </button>

    <!--
      母按钮：设置
      - 始终显示
      - 在 column-reverse 下视觉上显示在中间位置
      - 点击切换子菜单的展开/收起状态
      - aria-expanded 指示辅助技术当前状态
    -->
    <button class="floating-btn control-btn" :title="i18n.t('settings').value" @click.stop="toggleSubMenu"
      :aria-expanded="subVisible" aria-haspopup="true" aria-controls="sub-btns-wrapper">
      <i class="fas fa-cog" aria-hidden="true"></i>
      <span class="sr-only">{{ i18n.t('settings').value }}</span>
    </button>

    <!--
      子菜单按钮组容器
      - DOM 中最靠后的元素，在 column-reverse 下视觉上显示在最上方
      - 通过 CSS 控制淡入滑出动画
      - 默认不可见且不可交互
    -->
    <div class="sub-btns-wrapper" :class="{ 'is-visible': subVisible }" role="group" aria-label="子功能菜单">
      <!-- 沉浸式阅读按钮 -->
      <button class="floating-btn sub-btn" :title="i18n.t('immersive_read').value" @click="handleImmersive">
        <i class="fas fa-expand" aria-hidden="true"></i>
        <span class="sr-only">{{ i18n.t('immersive_read').value }}</span>
      </button>

      <!-- 导出按钮 -->
      <button class="floating-btn sub-btn" :title="i18n.t('export_action').value" @click="handleExport">
        <i class="fas fa-download" aria-hidden="true"></i>
        <span class="sr-only">{{ i18n.t('export_action').value }}</span>
      </button>

      <!-- 显示管理按钮 -->
      <button class="floating-btn sub-btn" :title="i18n.t('display_manage').value" @click="handleDisplay">
        <i class="fas fa-eye" aria-hidden="true"></i>
        <span class="sr-only">{{ i18n.t('display_manage').value }}</span>
      </button>

      <!--
        返回上级按钮
        - 仅在父组件传入 showBack=true 时渲染
        - 使用自定义 SVG 图标（带箭头的回退符号）
      -->
      <button v-if="props.showBack" class="floating-btn sub-btn" :title="i18n.t('back_to_previous').value"
        @click="handleBack">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <!-- 左侧弯箭头 -->
          <path d="M10 7L5 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
            stroke-linejoin="round" />
          <!-- 水平线和右端小箭头 -->
          <path d="M6 12h8.5a4.5 4.5 0 1 1 0 9H13" fill="none" stroke="currentColor" stroke-width="2.4"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="sr-only">{{ i18n.t('back_to_previous').value }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * 浮动控制面板组件
 *
 * 功能说明：
 * - 提供固定在右下角的快捷操作按钮组
 * - 主按钮（设置）始终显示，点击展开/收起子菜单
 * - 子菜单包含：沉浸式阅读、导出、显示管理、返回上级（可选）
 * - 回到顶部按钮在页面滚动一定距离后出现
 *
 * 视觉布局（从下到上）：
 *   回到顶部按钮 → 设置按钮 → 子菜单按钮组
 *
 * 交互逻辑：
 * - 点击设置按钮切换子菜单的展开/收起状态
 * - 点击子菜单项触发对应操作，并自动收起子菜单
 * - 点击组件外部区域自动收起子菜单
 * - 页面滚动监听控制"回到顶部"按钮的显隐
 *
 * @emits {void} toggle-immersive - 切换沉浸式阅读模式
 * @emits {void} open-export - 打开导出界面
 * @emits {void} open-display - 打开显示管理界面
 * @emits {void} back - 返回上级页面
 */

// ==================== 依赖导入 ====================
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18nStore } from '@/stores/i18nStore'

// ==================== 组件声明 ====================
/**
 * 组件触发的事件列表
 * 父组件通过 @事件名 监听并处理
 */
const emit = defineEmits([
  'toggle-immersive', // 切换沉浸式阅读
  'open-export',      // 打开导出面板
  'open-display',     // 打开显示设置
  'back'              // 返回上一级
])

// ==================== Props 声明 ====================
/**
 * 组件接收的外部数据
 */
const props = defineProps({
  /**
   * 是否显示"返回上级"按钮
   * 通常在有导航层级时由父组件控制为 true
   */
  showBack: {
    type: Boolean,
    default: false
  }
})

// ==================== Store 实例 ====================
/** 国际化翻译存储 */
const i18n = useI18nStore()

// ==================== 响应式状态 ====================
/** 子菜单展开/收起状态，true 表示子菜单可见 */
const subVisible = ref(false)
/** "回到顶部"按钮的显隐状态，true 表示可见 */
const showTop = ref(false)

// ==================== 方法：子菜单控制 ====================
/**
 * 切换子菜单的展开/收起状态
 * 切换后若为展开状态，注册全局点击监听以支持点击外部关闭
 */
function toggleSubMenu() {
  subVisible.value = !subVisible.value
  if (subVisible.value) {
    // 延迟注册监听，避免当前点击事件触发关闭
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
    })
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
}

/**
 * 收起子菜单并清理全局点击监听
 */
function closeSubMenu() {
  subVisible.value = false
  document.removeEventListener('click', handleClickOutside)
}

/**
 * 全局点击事件处理：点击组件外部时关闭子菜单
 * @param {MouseEvent} event - 鼠标点击事件对象
 */
function handleClickOutside(event) {
  const controls = document.getElementById('floating-controls')
  // 如果点击的元素不在浮动控件容器内，则关闭子菜单
  if (controls && !controls.contains(event.target)) {
    closeSubMenu()
  }
}

// ==================== 方法：子菜单操作 ====================
/**
 * 处理沉浸式阅读切换
 * 切换 settings 中的沉浸式状态，通知父组件，并关闭子菜单
 */
function handleImmersive() {
  emit('toggle-immersive')
  closeSubMenu()
}

/**
 * 处理导出操作
 * 通知父组件打开导出面板，并关闭子菜单
 */
function handleExport() {
  emit('open-export')
  closeSubMenu()
}

/**
 * 处理显示管理操作
 * 通知父组件打开显示设置面板，并关闭子菜单
 */
function handleDisplay() {
  emit('open-display')
  closeSubMenu()
}

/**
 * 处理返回上级操作
 * 通知父组件执行返回逻辑，并关闭子菜单
 */
function handleBack() {
  emit('back')
  closeSubMenu()
}

// ==================== 方法：回到顶部 ====================
/**
 * 平滑滚动到页面顶部
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ==================== 滚动监听 ====================
/**
 * 滚动事件处理函数
 * 根据滚动距离控制"回到顶部"按钮的显隐
 * 阈值：超过 300px 时显示
 */
function onScroll() {
  showTop.value = window.scrollY > 300
}

// ==================== 生命周期 ====================
/**
 * 组件挂载后注册滚动事件监听
 */
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

/**
 * 组件卸载前清理事件监听，避免内存泄漏
 */
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ===========================
   容器布局
   =========================== */

/**
 * 浮动控件容器
 * - 固定在视口右下角
 * - 使用 flex column-reverse 使 DOM 顺序与视觉顺序相反：
 *   DOM 顺序（从上到下）：回到顶部 → 设置按钮 → 子菜单
 *   视觉顺序（从下到上）：回到顶部 → 设置按钮 → 子菜单
 *   因此：子菜单在设置按钮上方展开，回到顶部在设置按钮下方出现
 */
#floating-controls {
  position: fixed;
  bottom: 40px;
  right: 32px;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  z-index: 1000;
  align-items: flex-end;
}

/* ===========================
   按钮基础样式
   =========================== */

/**
 * 浮动按钮通用样式
 * - 所有按钮（母按钮、子按钮、回到顶部）共用此基础样式
 * - 圆形按钮，带渐变背景
 * - 悬停时轻微上浮并增强阴影
 * - 点击时缩小产生按压反馈
 */
.floating-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #00acff, #48dbbb, #ff6e9b);
  color: #fff;
  font-size: 1.2rem;
  box-shadow: 0 2px 12px rgba(52, 152, 219, 0.25);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  flex-shrink: 0;
}

/* 悬停：上浮 2px + 阴影加深 */
.floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.35);
}

/* 点击：缩小至 95% 模拟按压 */
.floating-btn:active {
  transform: scale(0.95);
}

/* 屏幕阅读器专用文本，视觉上隐藏 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ===========================
   设置按钮（母按钮）样式
   =========================== */

/**
 * 母按钮使用基础样式
 * 在 column-reverse 布局下视觉上位于中间
 */
.control-btn {
  /* 直接继承 .floating-btn 的完整样式，无需覆盖 */
}

/* ===========================
   子菜单按钮组
   =========================== */

/**
 * 子按钮组容器
 * - DOM 中最靠后的元素，在 column-reverse 下视觉上显示在最上方
 * - 通过 opacity 和 pointer-events 控制交互
 * - 默认透明且不可点击，展开后可见可交互
 */
.sub-btns-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;

  /* 初始状态：隐藏 */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

/* 展开状态：完全可见且可交互 */
.sub-btns-wrapper.is-visible {
  opacity: 1;
  pointer-events: auto;
}

/**
 * 子按钮样式
 * - 与母按钮样式完全一致（尺寸、背景、阴影等）
 * - 默认透明且向右偏移 8px，展开时淡入并滑入原位
 */
.sub-btn {
  /* 初始动画状态：透明 + 右移 8px */
  opacity: 0;
  transform: translateX(8px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* 子菜单展开时，子按钮逐个淡入并从右侧滑入原位 */
.sub-btns-wrapper.is-visible .sub-btn {
  opacity: 1;
  transform: translateX(0);
}

/**
 * 子按钮动画延迟（stagger 效果）
 * 为每个子按钮设置不同的延迟，产生逐个出现的视觉节奏
 */
.sub-btn:nth-child(1) {
  transition-delay: 0.04s;
}

/* 沉浸式阅读 */
.sub-btn:nth-child(2) {
  transition-delay: 0.08s;
}

/* 导出 */
.sub-btn:nth-child(3) {
  transition-delay: 0.12s;
}

/* 显示管理 */
.sub-btn:nth-child(4) {
  transition-delay: 0.16s;
}

/* 返回上级（如有） */

/* ===========================
   回到顶部按钮
   =========================== */

/**
 * 回到顶部按钮
 * - DOM 中最靠前的元素，在 column-reverse 下视觉上显示在最下方
 * - 使用基础样式，与其他按钮完全一致
 */
.back-to-top-btn {
  /* 直接继承 .floating-btn 的完整样式，无需覆盖 */
}

/* ===========================
   响应式适配
   =========================== */

/**
 * 移动端（宽度 ≤ 720px）调整按钮大小和位置
 */
@media (max-width: 720px) {
  #floating-controls {
    bottom: 24px;
    right: 16px;
  }

  .floating-btn {
    width: 42px;
    height: 42px;
    font-size: 1rem;
  }
}
</style>