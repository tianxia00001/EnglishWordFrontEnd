import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 导入用户认证store
import { useAuthStore } from './stores/authStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 开发环境调试工具
if (process.env.NODE_ENV === 'development') {
  import('@/utils/apiDebugger').then(({ apiDebugger }) => {
    // 将调试器绑定到window对象供开发使用
    window.apiDebugger = apiDebugger
    console.log('🛠️ 开发环境已加载API调试工具')
    console.log('使用方法:')
    console.log('  - window.apiDebugger.testAuth() // 测试认证状态')
    console.log('  - window.apiDebugger.testMembershipAPIs() // 测试会员API')
    console.log('  - window.apiDebugger.generateReport() // 生成调试报告')
  })
}

// 在应用挂载前初始化用户认证状态
const initApp = async () => {
  const authStore = useAuthStore()
  
  console.log('🚀 开始初始化应用...')
  
  // 初始化认证状态（同步）
  authStore.initAuth()
  
  // 如果有认证信息，尝试刷新用户信息（异步，但不阻塞应用启动）
  if (authStore.isAuthenticated) {
    console.log('🔄 检测到已登录状态，异步验证用户信息...')
    // 不等待验证结果，让应用正常启动
    authStore.verifyTokenAsync().catch(error => {
      console.warn('应用启动时验证用户信息失败:', error)
    })
  }
  
  console.log('✅ 应用初始化完成，挂载到DOM')
  app.mount('#app')
}

initApp()
