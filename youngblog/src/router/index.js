import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/archive',
    name: 'Archive',
    component: () => import('../views/ArchiveView.vue')
  },
  {
    path: '/categories',
    name: 'Categories',
    component: () => import('../views/CategoriesView.vue')
  },
  {
    path: '/quick-links',
    name: 'QuickLinks',
    component: () => import('../views/QuickLinksView.vue')
  },
  {
    path: '/series',
    name: 'Series',
    component: () => import('../views/SeriesView.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutView.vue')
  },
  {
    path: '/announcements',
    name: 'Announcements',
    component: () => import('../views/AnnouncementsView.vue')
  },
  {
    path: '/blog/:id',
    name: 'BlogDetail',
    component: () => import('../views/BlogDetailView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

export default router