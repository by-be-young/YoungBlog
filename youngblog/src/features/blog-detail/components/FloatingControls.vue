<template>
  <!--
    浮动控制面板容器
    - 固定在页面右下角
    - 使用 flex column-reverse 布局：
      DOM 顺序（从上到下）：回到顶部 → 设置按钮 → 子菜单
      视觉顺序（从下到上）：回到顶部 → 设置按钮 → 子菜单
      因此：子菜单在设置按钮上方展开，回到顶部在设置按钮下方出现
  -->
  <div id="floating-controls" role="region" aria-label="浮动操作面板" :class="{ 'is-open': mobileOpen }" @click="handleGroupClick">
    <!-- 移动端总开关：默认只露这一枚，点开后再展开目录 / 设置 / 回到顶部 -->
    <button
      class="floating-btn mobile-fab-toggle"
      type="button"
      :aria-expanded="mobileOpen"
      aria-label="展开阅读工具"
      @click.stop="mobileOpen = !mobileOpen"
    >
      <i class="fas fa-sliders" aria-hidden="true"></i>
    </button>
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
import { useI18nStore } from '@/shared/stores/i18nStore'

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
/** 移动端工具组展开状态 */
const mobileOpen = ref(false)

function handleGroupClick(event) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.toc-fab') || target.closest('.back-to-top-btn')) {
    mobileOpen.value = false
  }
}

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
 *
 * 为什么把尺寸与偏移集中成 CSS 变量：
 * 下方"窄屏子菜单溢出保护"的 max-height 需要引用"按钮尺寸 + 间距 + 底部偏移"来预留空间，
 * 若各处硬编码就会出现"改了断点却忘了改计算式"的隐患；
 * 集中成令牌后，响应式断点只需覆盖变量值，尺寸/字号/间距/溢出自适应全部跟随。
 * 变量定义在容器上，因此也会被 TOC.vue 通过 Teleport 注入的同级目录球继承。
 */
#floating-controls {
  /* 按钮边长（默认桌面 48px，与改动前完全一致） */
  --fab-size: 48px;
  /* 按钮内图标字号 */
  --fab-icon-size: 1.2rem;
  /* 按钮之间的垂直间距 */
  --fab-gap: 10px;
  /* 一个"按钮 + 间距"的纵向占位，供窄屏的溢出保护复用（会自动跟随上方变量） */
  --fab-step: calc(var(--fab-size) + var(--fab-gap));
  /*
   * 窄屏子菜单最大高度里需要留给下方元素的空间：
   * 3 个球位（回到顶部 / 目录球 / 设置）+ 它们之间的间距 + 12px 余量。
   * 刻意只用加法串联而不写 "* 3"：加减法是 calc() 各实现一致支持的最小算子集合，
   * 避免乘法算子在某些解析实现中被丢弃，导致溢出保护静默失效却难以察觉。
   */
  --fab-reserved: calc(var(--fab-step) + var(--fab-step) + var(--fab-step) + 12px);
  /*
   * 底部 / 右侧偏移
   * - calc 中叠加 env(safe-area-inset-*)：桌面或没有安全区的设备取回退值 0px，
   *   结果与改动前的 40px / 32px 完全相同，所以桌面视觉不变；
   *   在带刘海、圆角或底部手势条的触屏设备上则自动向内让出安全区，避免按钮被遮挡。
   */
  --fab-offset-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
  --fab-offset-right: calc(32px + env(safe-area-inset-right, 0px));

  position: fixed;
  bottom: var(--fab-offset-bottom);
  right: var(--fab-offset-right);
  display: flex;
  flex-direction: column-reverse;
  gap: var(--fab-gap);
  /* 层级必须低于目录弹层（TOC.vue 中为 1099），否则手机上目录会被悬浮球压住 */
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
 * - 尺寸与字号取自容器上的 CSS 变量，便于响应式断点统一覆盖
 */
.floating-btn {
  width: var(--fab-size);
  height: var(--fab-size);
  /*
   * 触控最小热区兜底：任何断点都不得小于 44×44（WCAG 2.5.5 / iOS HIG 的推荐下限）。
   * 用 min-* 而非只改 width/height，是为了让将来有人误把 --fab-size 调小时也不会跌破可点按尺寸。
   */
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #00acff, #48dbbb, #ff6e9b);
  color: #fff;
  font-size: var(--fab-icon-size);
  box-shadow: 0 2px 12px rgba(52, 152, 219, 0.25);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  flex-shrink: 0;
  /*
   * 触控可用性（只影响触屏/点按，桌面鼠标渲染结果与改动前一致）：
   * - touch-action: manipulation 告诉浏览器本元素只做平移与捏合，取消双击缩放判定，
   *   从而避免移动端点击时等待"是否双击"的延迟；
   * - -webkit-tap-highlight-color: transparent 去掉 iOS/Android 点按时盖在圆形按钮上的灰色方块；
   * - user-select: none 防止长按图标时选中文本或弹出系统文本选择菜单。
   */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* 悬停：上浮 2px + 阴影加深 */
.floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.35);
}

/* 点击/触摸：缩小至 95% 模拟按压；不依赖 hover，所以在触屏上同样有反馈 */
.floating-btn:active {
  transform: scale(0.95);
}

/*
 * 键盘可见焦点环
 * 为什么用 :focus-visible 而不是 :focus：
 * 前者只在键盘（Tab）导航时出现，鼠标或触摸点击不会留下外圈，
 * 因此桌面观感与改动前一致，同时键盘用户能清楚看到当前焦点落在哪个悬浮球上。
 */
.floating-btn:focus-visible {
  outline: 3px solid rgba(0, 172, 255, 0.9);
  outline-offset: 2px;
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
  gap: var(--fab-gap);
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
   触屏下的子按钮层次增强
   =========================== */

/**
 * 触屏设备为子按钮补一条常驻的轻微描边 + 稍强的外阴影
 * 为什么需要：
 * 桌面靠 :hover 的上浮与阴影加深来提示"这是可点的子项"，
 * 而触屏既没有 hover、也无法通过鼠标位置区分按压态，子按钮未展开时的层次感偏弱；
 * 这里用媒体查询限定生效范围——只有"主指针没有悬停能力"（hover: none，
 * 如 iPad / 手机）或"主指针为粗粒度"（pointer: coarse）的设备才会命中，
 * 桌面鼠标环境（hover: hover + pointer: fine）完全不受影响，hover 行为与观感保持原样。
 */
@media (hover: none), (pointer: coarse) {
  .sub-btn {
    border: 1px solid rgba(255, 255, 255, 0.55);
    box-shadow: 0 4px 16px rgba(52, 152, 219, 0.3);
  }
}

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
   响应式适配（三档）
   =========================== */

/**
 * 触屏档位统一约定：
 * - 每个触屏档位的按钮边长都 ≥ 44px（触控最小热区）；
 * - 偏移一律写成 calc(<基础值> + env(safe-area-inset-*, 0px))，
 *   保证在刘海屏、圆角屏与底部手势条设备上不被遮挡；
 * - 档位只覆盖 CSS 变量，按钮尺寸 / 图标字号 / 间距 / 溢出保护会自动跟随，
 *   避免同一数值散落在多条规则里造成漏改。
 * 桌面（>1100px）不进入任何触屏档位，保持 48px / bottom 40px / right 32px 不变。
 */

/**
 * 档位一：手机（≤480px）
 * - 44px 是触控热区下限，比原来的 42px 略大，保证拇指点得准；
 * - 间距收到 8px、偏移收到 18/14px，让 4 个子按钮展开后仍完整留在矮视口内。
 */
.mobile-fab-toggle {
  display: none;
}

@media (max-width: 900px) {
  #floating-controls {
    flex-direction: column-reverse;
    gap: 8px;
  }

  #floating-controls .mobile-fab-toggle {
    display: inline-flex;
  }

  #floating-controls:not(.is-open) > .back-to-top-btn,
  #floating-controls:not(.is-open) > .control-btn,
  #floating-controls:not(.is-open) > .sub-btns-wrapper {
    display: none !important;
  }

  :global(#floating-controls:not(.is-open) > .toc-fab) {
    display: none !important;
  }

  #floating-controls.is-open > .toc-fab {
    display: inline-flex !important;
  }
}

@media (max-width: 480px) {
  #floating-controls {
    --fab-size: 44px;
    --fab-icon-size: 1rem;
    --fab-gap: 8px;
    --fab-offset-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    --fab-offset-right: calc(14px + env(safe-area-inset-right, 0px));
  }
}

/**
 * 档位二：小平板 / 横屏手机（481–900px，如 iPad 竖屏 820×1180）
 * - 按钮 46px：比桌面略小以少遮正文，又明显大于 44px 的下限；
 * - right 从 32px 收到 20px，配合安全区继续内让。
 * 注意：≤880px 时 TOC.vue 处于紧凑模式，会向本容器注入目录球，
 * 因此这一档实际可能有 4 个球叠在一起，底部偏移不宜过大。
 */
@media (min-width: 481px) and (max-width: 900px) {
  #floating-controls {
    --fab-size: 46px;
    --fab-offset-bottom: calc(28px + env(safe-area-inset-bottom, 0px));
    --fab-offset-right: calc(20px + env(safe-area-inset-right, 0px));
  }
}

/**
 * 档位三：平板（901–1100px，如 iPad 横屏 1024×768）
 * - 按钮沿用桌面 48px：手指点按更稳，也无需为了省空间牺牲热区；
 * - right 由 32px 收到 24px：平板可视宽度比桌面紧张，悬浮球更容易贴住正文，
 *   内收可减少遮挡；任务下限要求不小于 20px，取 24px 留出叠加安全区的余量；
 * - bottom 由 40px 收到 36px，兼顾底部手势条。
 */
@media (min-width: 901px) and (max-width: 1100px) {
  #floating-controls {
    --fab-size: 48px;
    --fab-offset-bottom: calc(36px + env(safe-area-inset-bottom, 0px));
    --fab-offset-right: calc(24px + env(safe-area-inset-right, 0px));
  }
}

/**
 * ≤1100px 时显式维持 z-index: 1000
 * 为什么单独再写一遍：目录弹层（TOC.vue 的 .blog-toc.in-overlay）使用 1099，
 * 这里把值写死并留下约束说明，防止后续调整平板/手机布局时顺手抬高层级把目录压住。
 */
@media (max-width: 1100px) {
  #floating-controls {
    z-index: 1000;
  }
}

/**
 * 窄屏（≤900px）子菜单溢出保护
 * 为什么需要：showBack 为 true 时子菜单有 4 个按钮（沉浸 / 导出 / 显示 / 返回上级），
 * 在横屏手机、分屏、地址栏+键盘占位等"矮视口"下，整列按钮可能超过可视高度而溢出屏幕顶部。
 * 给容器一个最大高度并允许内部滚动，保证每个按钮都仍可触达且不越出视口。
 * 预留高度由容器上的 --fab-reserved 提供（3 个球位 + 间距 + 余量），因此改断点不会漏算；
 * 100dvh 写在 100vh 之后：支持的浏览器用动态视口高度计算，移动端地址栏收放时也不会溢出。
 * 内边距用于给按钮外阴影留出空间（滚动容器会裁掉溢出内容），再用等量负外边距抵消，
 * 使子按钮依旧与母按钮保持右对齐（全局 * { box-sizing: border-box }，故 max-height 含内边距）。
 */
@media (max-width: 900px) {
  .sub-btns-wrapper {
    max-height: calc(100vh - var(--fab-offset-bottom) - var(--fab-reserved));
    max-height: calc(100dvh - var(--fab-offset-bottom) - var(--fab-reserved));
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px;
    margin-right: -6px;
    /* 隐藏滚动条：滚动只是矮视口的兜底交互，露出滚动条会破坏悬浮球组的圆形节奏 */
    scrollbar-width: none;
  }

  .sub-btns-wrapper::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
}
</style>