import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/archive',
    name: 'Archive',
    component: () => import('../views/ArchiveView.vue'),
    meta: { title: '归档' }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: () => import('../views/CategoriesView.vue'),
    meta: { title: '分类' }
  },
  {
    path: '/quick-links',
    name: 'QuickLinks',
    component: () => import('../views/QuickLinksView.vue'),
    meta: { title: '快速链接' }
  },
  {
    path: '/series',
    name: 'Series',
    component: () => import('../views/SeriesView.vue'),
    meta: { title: '系列' }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutView.vue'),
    meta: { title: '关于' }
  },
  {
    path: '/announcements',
    name: 'Announcements',
    component: () => import('../views/AnnouncementsView.vue'),
    meta: { title: '公告' }
  },
  {
    path: '/blog/:id',
    name: 'BlogDetail',
    component: () => import('../views/BlogDetailView.vue'),
    meta: { title: '博客详情' }
  },
  // 兼容旧链接：/blog-detail.html?id=xxx → /blog/xxx
  {
    path: '/blog-detail.html',
    name: 'BlogDetailLegacy',
    redirect: to => {
      const id = to.query.id
      if (id) {
        return { path: `/blog/${id}` }
      }
      return { path: '/' }
    }
  },
  // 404 重定向
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  }
})

// 全局前置守卫：设置页面标题
router.beforeEach((to, from) => {
  const defaultTitle = 'YoungBlog'
  const title = to.meta?.title
  document.title = title ? `${title} | YoungBlog` : defaultTitle
})

export default router