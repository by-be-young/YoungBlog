<template>
  <nav class="navbar" :class="{ 'is-drawer-open': isMenuOpen }">
    <div class="nav-container">
      <!-- 品牌区 -->
      <div class="nav-brand">
        <router-link class="nav-avatar" to="/about">
          <img :src="resolveUrl('/assets/avatar.webp')" alt="头像" />
        </router-link>
        <router-link class="nav-brand-link" to="/">
          <span>{{ i18n.currentTranslations.brand }}</span>
        </router-link>
      </div>

      <!-- 桌面端内联导航（≤1100px 由 CSS 隐藏，改用下方抽屉） -->
      <ul class="nav-menu">
        <li v-for="item in menuItems" :key="item.path">
          <router-link :to="item.path" :class="{ active: route.path === item.path }">
            <i :class="item.icon"></i>
            <span>{{ i18n.currentTranslations[item.key] }}</span>
          </router-link>
        </li>
      </ul>

      <!-- 右侧操作区 -->
      <div class="nav-actions">
        <button class="nav-search-btn" @click="openSearch">
          <i class="fas fa-search"></i>
          <span>{{ i18n.currentTranslations.search }}</span>
        </button>

        <button
          class="nav-toggle"
          type="button"
          :class="{ 'is-open': isMenuOpen }"
          :aria-expanded="isMenuOpen ? 'true' : 'false'"
          :aria-label="
            isMenuOpen
              ? i18n.currentTranslations.nav_menu_close
              : i18n.currentTranslations.nav_menu_open
          "
          @click="toggleMenu"
        >
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
        </button>
      </div>
    </div>
  </nav>

  <!--
    移动端导航抽屉
    Teleport 到 body：.navbar 上的 backdrop-filter 会成为 fixed 后代的包含块，
    并限制毛玻璃取样范围，因此抽屉必须移出 .navbar 才能正常呈现玻璃质感。
  -->
  <Teleport to="body">
    <div
      class="nav-drawer-root"
      :class="{ 'is-open': isMenuOpen }"
      :inert="isMenuOpen ? undefined : true"
    >
      <div class="nav-drawer-backdrop" @click="closeMenu"></div>

      <aside class="nav-drawer" role="dialog" aria-modal="true" aria-label="站点导航">
        <nav class="nav-drawer-nav">
          <ul class="nav-drawer-menu">
            <li v-for="(item, index) in menuItems" :key="item.path" :style="{ '--i': index }">
              <router-link
                :to="item.path"
                :class="{ active: route.path === item.path }"
                @click="closeMenu"
              >
                <span class="nav-drawer-icon"><i :class="item.icon"></i></span>
                <span class="nav-drawer-label">{{ i18n.currentTranslations[item.key] }}</span>
                <i class="fas fa-chevron-right nav-drawer-arrow"></i>
              </router-link>
            </li>
          </ul>
        </nav>

        <footer class="nav-drawer-foot">
          <button class="nav-drawer-search" type="button" @click="openSearchFromDrawer">
            <i class="fas fa-search"></i>
            <span>{{ i18n.currentTranslations.search }}</span>
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18nStore'
import { resolveUrl } from '@/utils/url'

const route = useRoute()
const i18n = useI18nStore()
const isMenuOpen = ref(false)

const MOBILE_MAX_WIDTH = 1100

const menuItems = [
  { path: '/', key: 'home', icon: 'fas fa-home' },
  { path: '/archive', key: 'archive', icon: 'fas fa-archive' },
  { path: '/categories', key: 'categories', icon: 'fas fa-tags' },
  { path: '/series', key: 'series', icon: 'fas fa-layer-group' },
  { path: '/quick-links', key: 'quicklinks', icon: 'fas fa-link' },
]

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const openSearch = () => {
  window.dispatchEvent(new CustomEvent('toggle-search'))
}

// 抽屉里点搜索：先收起抽屉，避免抽屉层级盖住搜索面板
const openSearchFromDrawer = async () => {
  closeMenu()
  await nextTick()
  setTimeout(openSearch, 220)
}

// 打开时锁定背景滚动
watch(isMenuOpen, (open) => {
  document.body.classList.toggle('offcanvas-open', open)
})

// 路由变化后自动收起（浏览器前进/后退时也能关掉）
watch(() => route.fullPath, closeMenu)

const handleResize = () => {
  if (window.innerWidth > MOBILE_MAX_WIDTH) closeMenu()
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && isMenuOpen.value) closeMenu()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('offcanvas-open')
})
</script>

<style scoped>
/* 抽屉打开时锁定背景滚动 */
:global(body.offcanvas-open) {
  overflow: hidden;
}

/* 抽屉打开时导航栏稍微加强阴影，强调「当前处于导航态」 */
.navbar.is-drawer-open {
  box-shadow: 0 10px 30px rgba(24, 32, 54, 0.16);
}

/* ================= 汉堡按钮 ================= */
.nav-toggle {
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid rgba(23, 50, 79, 0.08);
  border-radius: 13px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(244, 249, 255, 0.7));
  box-shadow: 0 6px 16px rgba(24, 32, 54, 0.08);
  cursor: pointer;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 200ms ease,
    box-shadow 200ms ease,
    border-color 200ms ease;
}

.nav-toggle-bar {
  display: block;
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: #2b4c66;
  transition:
    transform 280ms cubic-bezier(0.22, 0.9, 0.24, 1),
    opacity 180ms ease,
    background 200ms ease;
}

.nav-toggle:active {
  background: linear-gradient(180deg, rgba(255, 220, 233, 0.9), rgba(255, 240, 246, 0.8));
}

.nav-toggle.is-open {
  border-color: rgba(85, 200, 255, 0.35);
}

.nav-toggle.is-open .nav-toggle-bar {
  background: linear-gradient(90deg, #ff8fb3, #55c8ff);
}

.nav-toggle.is-open .nav-toggle-bar:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}

.nav-toggle.is-open .nav-toggle-bar:nth-child(2) {
  opacity: 0;
  transform: scaleX(0.2);
}

.nav-toggle.is-open .nav-toggle-bar:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

/* ================= 抽屉根容器 ================= */
.nav-drawer-root {
  position: fixed;
  inset: 0;
  z-index: 1600;
  display: none;
  pointer-events: none;
}

/*
  注意：#app 由于入场动画形成了一个独立的层叠上下文，
  因此 Teleport 到 body 的抽屉一定绘制在 #app 之上，无法通过 z-index 把导航栏提到遮罩之上。
  解决办法：遮罩与面板都从导航栏下沿（60px）开始，root 本身不吃事件，
  这样顶部品牌与汉堡（此时已变成 ✕）始终可见可点。
*/
.nav-drawer-root.is-open {
  pointer-events: none;
}

.nav-drawer-backdrop {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(24, 32, 52, 0.32);
  -webkit-backdrop-filter: blur(4px) saturate(1.15);
  backdrop-filter: blur(4px) saturate(1.15);
  opacity: 0;
  transition: opacity 300ms ease;
}

.nav-drawer-root.is-open .nav-drawer-backdrop {
  opacity: 1;
  pointer-events: auto;
}

/* ================= 毛玻璃抽屉面板 ================= */
/* 面板从导航栏下沿开始，让顶部品牌与「✕」始终可见可点 */
.nav-drawer {
  position: absolute;
  top: 60px;
  left: 0;
  bottom: 0;
  width: min(84vw, 328px);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
  border-radius: 0 24px 24px 0;
  border-right: 1px solid rgba(255, 255, 255, 0.72);
  background: linear-gradient(
    165deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(243, 248, 255, 0.86) 46%,
    rgba(255, 245, 250, 0.9) 100%
  );
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  backdrop-filter: blur(24px) saturate(1.6);
  box-shadow: 18px 0 48px rgba(24, 32, 54, 0.22);
  transform: translateX(-102%);
  transition: transform 380ms cubic-bezier(0.22, 0.9, 0.24, 1);
  overflow: hidden;
  isolation: isolate;
}

/* 马卡龙光斑装饰 */
.nav-drawer::before,
.nav-drawer::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.nav-drawer::before {
  top: -70px;
  right: -80px;
  width: 210px;
  height: 210px;
  background: radial-gradient(circle, rgba(255, 182, 201, 0.42), rgba(255, 182, 201, 0) 70%);
}

.nav-drawer::after {
  bottom: -90px;
  left: -90px;
  width: 230px;
  height: 230px;
  background: radial-gradient(circle, rgba(154, 215, 255, 0.28), rgba(154, 215, 255, 0) 70%);
}

.nav-drawer-root.is-open .nav-drawer {
  transform: none;
}

/* ================= 抽屉导航项 ================= */
.nav-drawer-nav {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 14px 12px;
}

.nav-drawer-menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 交错入场：默认收起，打开时按 --i 依次浮入 */
.nav-drawer-menu li {
  opacity: 0;
  transform: translateX(-16px);
  transition:
    opacity 280ms ease,
    transform 320ms cubic-bezier(0.22, 0.9, 0.24, 1);
  transition-delay: 0ms;
}

.nav-drawer-root.is-open .nav-drawer-menu li {
  opacity: 1;
  transform: none;
  transition-delay: calc(var(--i, 0) * 55ms + 110ms);
}

.nav-drawer-menu a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border-radius: 14px;
  border: 1px solid transparent;
  text-decoration: none;
  color: #2b3440;
  font-weight: 700;
  font-size: 1rem;
  transition:
    background 200ms ease,
    border-color 200ms ease,
    box-shadow 200ms ease,
    transform 200ms ease,
    color 200ms ease;
}

.nav-drawer-menu a:hover {
  background: rgba(255, 255, 255, 0.86);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 22px rgba(24, 32, 54, 0.08);
  transform: translateX(2px);
}

.nav-drawer-menu a.active {
  color: #14304a;
  border-color: rgba(255, 255, 255, 0.86);
  background: linear-gradient(
    120deg,
    rgba(255, 182, 201, 0.44) 0%,
    rgba(167, 243, 208, 0.42) 55%,
    rgba(154, 215, 255, 0.44) 100%
  );
  box-shadow:
    0 12px 26px rgba(24, 32, 54, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.nav-drawer-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(23, 50, 79, 0.06);
  color: #55c8ff;
  font-size: 0.94rem;
  transition:
    color 200ms ease,
    background 200ms ease,
    transform 200ms ease;
}

.nav-drawer-menu a.active .nav-drawer-icon {
  color: #1e88c9;
  background: linear-gradient(135deg, #ffffff, #f1f9ff);
  transform: scale(1.04);
}

.nav-drawer-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-drawer-arrow {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: rgba(43, 52, 64, 0.3);
  transition:
    transform 200ms ease,
    color 200ms ease;
}

.nav-drawer-menu a:hover .nav-drawer-arrow,
.nav-drawer-menu a.active .nav-drawer-arrow {
  color: rgba(43, 52, 64, 0.7);
  transform: translateX(3px);
}

/* ================= 抽屉底部 ================= */
.nav-drawer-foot {
  position: relative;
  z-index: 1;
  padding: 12px 16px 0;
  border-top: 1px solid rgba(23, 50, 79, 0.08);
}

.nav-drawer-search {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  background: linear-gradient(
    120deg,
    rgba(255, 214, 232, 0.9),
    rgba(232, 255, 244, 0.85) 55%,
    rgba(243, 233, 255, 0.9)
  );
  color: #6b2b4a;
  font-weight: 700;
  font-size: 0.98rem;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(107, 43, 74, 0.08);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.nav-drawer-search:active {
  transform: scale(0.985);
}

/* ================= 响应式开关 ================= */
@media (max-width: 1100px) {
  .nav-drawer-root {
    display: block;
  }

  .nav-container > .nav-menu {
    display: none;
  }

  .nav-toggle {
    display: inline-flex;
  }

  .nav-avatar {
    display: inline-flex;
  }
}

@media (max-width: 600px) {
  .nav-container {
    gap: 6px;
    padding: 12px;
  }

  /*
    关键：.nav-brand 必须是 flex 且不可换行，
    否则内部的头像链接与标题链接（均为 inline-flex）会在窄屏折行，
    把 60px 高的导航栏撑高并溢出。
  */
  .nav-brand {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    flex: 1 1 auto;
    min-width: 0;
    margin-right: 0;
    gap: 6px;
    font-size: 1.16rem;
  }

  .nav-avatar img {
    width: 34px;
    height: 34px;
  }

  .nav-brand-link {
    min-width: 0;
    overflow: hidden;
  }

  .nav-brand-link span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-actions {
    flex: 0 0 auto;
    gap: 6px;
  }

  /* 窄屏只留搜索图标，把宽度让给站点标题 */
  .nav-search-btn {
    padding: 0;
    width: 40px;
    height: 40px;
    justify-content: center;
  }

  .nav-search-btn span {
    display: none;
  }

  .nav-search-btn i {
    font-size: 1rem;
  }

  .nav-toggle {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 380px) {
  .nav-brand {
    font-size: 1.04rem;
  }

  /* 极窄屏优先保证标题完整，头像已经在抽屉头部出现 */
  .nav-avatar {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-drawer,
  .nav-drawer-backdrop,
  .nav-drawer-menu li,
  .nav-toggle-bar {
    transition: none;
  }
}
</style>
