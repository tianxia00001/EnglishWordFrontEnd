<template>
  <div class="header-container">
    <el-menu
      :default-active="activeIndex"
      mode="horizontal"
      router
      background-color="#545c64"
      text-color="#fff"
      active-text-color="#ffd04b"
    >
      <div class="logo">英语学习助手</div>
      <el-menu-item index="/">首页</el-menu-item>
      <el-menu-item index="/video-subtitles">视频字幕</el-menu-item>
      <el-menu-item index="/video-history">视频历史</el-menu-item>
      <el-menu-item index="/word-book">单词本</el-menu-item>
      <el-menu-item index="/basic-vocabulary">基础词库</el-menu-item>
      <el-menu-item index="/story-generator">故事生成</el-menu-item>
      <el-menu-item index="/permission-test">权限测试</el-menu-item>
      
      <!-- 用户相关菜单 -->
      <div class="user-menu">
        <template v-if="!authStore.isAuthenticated">
          <el-button type="primary" size="small" @click="$router.push('/login')">
            登录/注册
          </el-button>
        </template>
        <template v-else>
          <!-- 会员状态显示 -->
          <div class="user-info">
            <el-tag 
              :type="authStore.isVip ? 'warning' : 'info'"
              size="small"
            >
              {{ authStore.isVip ? 'VIP会员' : '免费用户' }}
            </el-tag>
            <span class="username">{{ authStore.user?.phone || '用户' }}</span>
          </div>
          
          <!-- 用户下拉菜单 -->
          <el-dropdown @command="handleCommand" class="user-dropdown">
            <span class="el-dropdown-link">
              <el-icon><User /></el-icon>
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="user-center">个人中心</el-dropdown-item>
                <el-dropdown-item command="membership">会员中心</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </div>
    </el-menu>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { User, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'AppHeader',
  components: {
    User,
    ArrowDown
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()
    
    const activeIndex = computed(() => {
      return route.path
    })

    const handleCommand = async (command) => {
      switch (command) {
        case 'user-center':
          router.push('/user-center')
          break
        case 'membership':
          router.push('/membership')
          break
        case 'logout':
          try {
            await authStore.logout()
            ElMessage.success('退出登录成功')
            router.push('/')
          } catch (error) {
            ElMessage.error('退出登录失败')
          }
          break
      }
    }

    return {
      activeIndex,
      authStore,
      handleCommand
    }
  }
}
</script>

<style scoped>
.header-container {
  width: 100%;
}

.logo {
  float: left;
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  margin: 0 20px;
  line-height: 60px;
}

.el-menu {
  border-bottom: none;
  position: relative;
}

.user-menu {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
}

.username {
  font-size: 14px;
}

.user-dropdown {
  cursor: pointer;
}

.el-dropdown-link {
  color: #fff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.el-dropdown-link:hover {
  color: #ffd04b;
}
</style>
