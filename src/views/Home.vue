<template>
  <div class="home-container">
    <section class="hero-section">
      <h1 class="hero-title">英语学习助手</h1>
      <p class="hero-subtitle">视频字幕学习、单词积累、故事生成一站式完成</p>

      <el-card v-if="authStore.isAuthenticated" class="user-status-card">
        <div class="user-welcome">
          <el-avatar :size="48" :src="authStore.user?.avatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="user-info">
            <h3>欢迎回来，{{ authStore.user?.phone || '用户' }}</h3>
            <el-tag :type="authStore.isVip ? 'warning' : 'info'" size="small">
              {{ authStore.isVip ? 'VIP会员' : '免费用户' }}
            </el-tag>
          </div>
        </div>

        <div v-if="userDataStore.quotaInfo" class="quota-info">
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="quota-item">
                <div class="quota-label">视频处理</div>
                <el-progress :percentage="getQuotaPercentage('video_processing')" :color="getQuotaColor('video_processing')" />
              </div>
            </el-col>
            <el-col :span="8">
              <div class="quota-item">
                <div class="quota-label">故事生成</div>
                <el-progress :percentage="getQuotaPercentage('story_generation')" :color="getQuotaColor('story_generation')" />
              </div>
            </el-col>
            <el-col :span="8">
              <div class="quota-item">
                <div class="quota-label">单词查询</div>
                <el-progress :percentage="getQuotaPercentage('word_query')" :color="getQuotaColor('word_query')" />
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <el-card v-else class="login-guide-card">
        <div class="login-guide">
          <el-icon size="44" class="guide-icon"><UserFilled /></el-icon>
          <h3>登录后可保存学习记录与视频历史</h3>
          <el-button type="primary" @click="$router.push('/login')">登录/注册</el-button>
        </div>
      </el-card>
    </section>

    <section class="features-section">
      <h2>核心功能</h2>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/jobs')">
            <div class="feature-icon"><el-icon size="32"><VideoPlay /></el-icon></div>
            <h3>并行处理</h3>
            <p>多任务并行切分、转写、翻译，实时查看进度。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/video-history')">
            <div class="feature-icon"><el-icon size="32"><Collection /></el-icon></div>
            <h3>视频历史</h3>
            <p>查看处理结果，反复加载视频与字幕学习。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/word-book')">
            <div class="feature-icon"><el-icon size="32"><Notebook /></el-icon></div>
            <h3>单词本</h3>
            <p>沉淀生词、查询释义、形成个人词库。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/story-generator')">
            <div class="feature-icon"><el-icon size="32"><Document /></el-icon></div>
            <h3>故事生成</h3>
            <p>基于词库生成故事，强化记忆与输出。</p>
          </el-card>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { Collection, Document, Notebook, User, UserFilled, VideoPlay } from '@element-plus/icons-vue'

import { useAuthStore } from '../stores/authStore'
import { useUserDataStore } from '../stores/userDataStore'

export default {
  name: 'HomeView',
  components: {
    User,
    UserFilled,
    VideoPlay,
    Notebook,
    Document,
    Collection
  },
  setup() {
    const authStore = useAuthStore()
    const userDataStore = useUserDataStore()

    onMounted(async () => {
      if (!authStore.isAuthenticated) return
      try {
        await Promise.all([userDataStore.fetchQuotaInfo(), userDataStore.fetchLearningStats()])
      } catch (error) {
        console.error('load user data failed', error)
      }
    })

    const getQuotaPercentage = type => {
      const quota = userDataStore.quotaInfo?.[type]
      if (!quota || quota.limit === 0) return 0
      return Math.round((quota.used / quota.limit) * 100)
    }

    const getQuotaColor = type => {
      const percentage = getQuotaPercentage(type)
      if (percentage >= 90) return '#F56C6C'
      if (percentage >= 70) return '#E6A23C'
      return '#67C23A'
    }

    return {
      authStore,
      userDataStore,
      getQuotaPercentage,
      getQuotaColor
    }
  }
}
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.hero-section {
  text-align: center;
  margin-bottom: 36px;
}

.hero-title {
  font-size: 40px;
  margin-bottom: 10px;
}

.hero-subtitle {
  color: #606266;
  margin-bottom: 20px;
}

.user-status-card,
.login-guide-card {
  max-width: 700px;
  margin: 0 auto;
}

.user-welcome {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.user-info h3 {
  margin: 0 0 6px;
}

.quota-item {
  text-align: center;
}

.quota-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.login-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.guide-icon {
  color: #409eff;
}

.features-section h2 {
  text-align: center;
  margin-bottom: 20px;
}

.feature-card {
  text-align: center;
  cursor: pointer;
  min-height: 190px;
}

.feature-card:hover {
  transform: translateY(-2px);
  transition: 0.2s;
}

.feature-icon {
  color: #409eff;
  margin-bottom: 8px;
}

.feature-card p {
  color: #606266;
  font-size: 14px;
}
</style>
