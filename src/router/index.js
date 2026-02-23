import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录注册', requiresGuest: true }
  },
  {
    path: '/user-center',
    name: 'UserCenter',
    component: () => import('../views/UserCenter.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/membership',
    name: 'Membership',
    component: () => import('../views/Membership.vue'),
    meta: { title: '会员中心', requiresAuth: true }
  },
  {
    path: '/video-subtitles',
    name: 'VideoSubtitles',
    component: () => import('../views/VideoSubtitles.vue')
  },
  {
    path: '/jobs',
    name: 'JobDashboard',
    component: () => import('../views/JobDashboard.vue')
  },
  {
    path: '/jobs/:jobId/live',
    name: 'JobLiveStudy',
    component: () => import('../views/LiveStudyView.vue'),
    props: true
  },
  {
    path: '/jobs/:jobId/segments-live',
    name: 'JobSegmentsLiveStudy',
    component: () => import('../views/ParallelSegmentStudyView.vue'),
    props: true
  },
  {
    path: '/video-history',
    name: 'VideoHistory',
    component: () => import('../views/VideoHistory.vue'),
    meta: { title: '视频历史' }
  },
  {
    path: '/videos/:videoId/transcript',
    name: 'VideoTranscript',
    component: () => import('../views/VideoTranscriptView.vue'),
    props: true,
    meta: { title: 'Video Transcript' }
  },
  {
    path: '/videos/:videoId/stories',
    name: 'VideoStory',
    component: () => import('../views/VideoStoryView.vue'),
    props: true,
    meta: { title: '视频故事' }
  },
  {
    path: '/videos/:videoId/words',
    name: 'VideoWords',
    component: () => import('../views/VideoWordsView.vue'),
    props: true,
    meta: { title: '视频单词' }
  },
  {
    path: '/videos/:videoId/segment-learning',
    name: 'VideoSegmentLearning',
    component: () => import('../views/VideoSegmentLearningView.vue'),
    props: true,
    meta: { title: '视频学习' }
  },
  {
    path: '/word-book',
    name: 'WordBook',
    component: () => import('../views/WordBook.vue')
  },
  {
    path: '/basic-vocabulary',
    name: 'BasicVocabulary',
    component: () => import('../views/BasicVocabulary.vue'),
    meta: { title: '基础词库' }
  },
  {
    path: '/story-generator',
    name: 'StoryGenerator',
    component: () => import('../views/StoryGenerator.vue')
  },
  {
    path: '/video-learning',
    name: 'VideoLearning',
    component: () => import('../views/VideoLearning.vue'),
    meta: { title: '视频学习' }
  },
  {
    path: '/permission-test',
    name: 'UserPermissionTest',
    component: () => import('../views/UserPermissionTest.vue'),
    meta: { title: '权限测试' }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // 需要登录的页面
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }
  
  // 只有未登录用户可以访问的页面（如登录页）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/')
    return
  }
  
  next()
})

export default router
