<template>
  <div class="home-container">
    <div class="hero-section">
      <h1 class="hero-title">英语学习助手</h1>
      <p class="hero-subtitle">智能化英语学习，让学习更高效</p>
      
      <!-- 用户状态卡片 -->
      <el-card class="user-status-card" v-if="authStore.isAuthenticated">
        <div class="user-welcome">
          <el-avatar :size="50" :src="authStore.user?.avatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="user-info">
            <h3>欢迎回来，{{ authStore.user?.phone || '用户' }}！</h3>
            <el-tag 
              :type="authStore.isVip ? 'warning' : 'info'"
              size="small"
            >
              {{ authStore.isVip ? 'VIP会员' : '免费用户' }}
            </el-tag>
          </div>
        </div>
        
        <!-- 配额使用情况 -->
        <div class="quota-info" v-if="userDataStore.quotaInfo">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="quota-item">
                <div class="quota-label">视频处理</div>
                <el-progress 
                  :percentage="getQuotaPercentage('video_processing')"
                  :color="getQuotaColor('video_processing')"
                />
                <div class="quota-text">
                  {{ userDataStore.quotaInfo.video_processing?.used || 0 }} / 
                  {{ userDataStore.quotaInfo.video_processing?.limit || 0 }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="quota-item">
                <div class="quota-label">故事生成</div>
                <el-progress 
                  :percentage="getQuotaPercentage('story_generation')"
                  :color="getQuotaColor('story_generation')"
                />
                <div class="quota-text">
                  {{ userDataStore.quotaInfo.story_generation?.used || 0 }} / 
                  {{ userDataStore.quotaInfo.story_generation?.limit || 0 }}
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="quota-item">
                <div class="quota-label">单词查询</div>
                <el-progress 
                  :percentage="getQuotaPercentage('word_query')"
                  :color="getQuotaColor('word_query')"
                />
                <div class="quota-text">
                  {{ userDataStore.quotaInfo.word_query?.used || 0 }} / 
                  {{ userDataStore.quotaInfo.word_query?.limit || 0 }}
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
        
        <!-- 快速操作 -->
        <div class="quick-actions">
          <el-button type="primary" @click="$router.push('/user-center')">
            <el-icon><User /></el-icon>
            个人中心
          </el-button>
          <el-button type="warning" @click="$router.push('/membership')">
            <el-icon><Star /></el-icon>
            会员中心
          </el-button>
        </div>
      </el-card>
      
      <!-- 未登录用户引导 -->
      <el-card class="login-guide-card" v-else>
        <div class="login-guide">
          <el-icon class="guide-icon" size="48"><UserFilled /></el-icon>
          <h3>登录后享受更多功能</h3>
          <p>个人单词本、学习记录、无限制使用等更多功能等您体验！</p>
          <el-button type="primary" size="large" @click="$router.push('/login')">
            立即登录/注册
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 功能特色 -->
    <div class="features-section">
      <h2>核心功能</h2>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/video-subtitles')">
            <div class="feature-icon">
              <el-icon size="32"><VideoPlay /></el-icon>
            </div>
            <h3>视频字幕生成</h3>
            <p>智能提取视频字幕，支持多种格式，让学习更便捷</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/word-book')">
            <div class="feature-icon">
              <el-icon size="32"><Notebook /></el-icon>
            </div>
            <h3>智能单词本</h3>
            <p>个性化单词管理，支持分类、搜索和学习记录</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/story-generator')">
            <div class="feature-icon">
              <el-icon size="32"><Document /></el-icon>
            </div>
            <h3>故事生成</h3>
            <p>基于单词生成有趣故事，寓教于乐的学习方式</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="feature-card" @click="$router.push('/basic-vocabulary')">
            <div class="feature-icon">
              <el-icon size="32"><Collection /></el-icon>
            </div>
            <h3>基础词库</h3>
            <p>丰富的基础词汇库，系统化的英语学习资源</p>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 会员特权介绍 -->
    <div class="membership-section" v-if="!authStore.isAuthenticated || !authStore.isVip">
      <h2>VIP会员特权</h2>
      <el-row :gutter="20">
        <el-col :xs="24" :md="12">
          <div class="privilege-list">
            <div class="privilege-item">
              <el-icon class="privilege-icon"><Check /></el-icon>
              <span>无限制视频处理</span>
            </div>
            <div class="privilege-item">
              <el-icon class="privilege-icon"><Check /></el-icon>
              <span>无限制故事生成</span>
            </div>
            <div class="privilege-item">
              <el-icon class="privilege-icon"><Check /></el-icon>
              <span>个人单词本无限容量</span>
            </div>
            <div class="privilege-item">
              <el-icon class="privilege-icon"><Check /></el-icon>
              <span>学习数据分析报告</span>
            </div>
            <div class="privilege-item">
              <el-icon class="privilege-icon"><Check /></el-icon>
              <span>优先客服支持</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :md="12">
          <div class="membership-cta">
            <h3>立即升级VIP</h3>
            <p>解锁全部功能，享受无限制学习体验</p>
            <el-button 
              type="warning" 
              size="large" 
              @click="authStore.isAuthenticated ? $router.push('/membership') : $router.push('/login')"
            >
              {{ authStore.isAuthenticated ? '查看套餐' : '登录后升级' }}
            </el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 学习统计 -->
    <div class="stats-section" v-if="authStore.isAuthenticated && userDataStore.learningStats">
      <h2>我的学习统计</h2>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-value">{{ userDataStore.learningStats.total_words || 0 }}</div>
            <div class="stat-label">学习单词数</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-value">{{ userDataStore.learningStats.study_days || 0 }}</div>
            <div class="stat-label">学习天数</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-value">{{ userDataStore.learningStats.video_count || 0 }}</div>
            <div class="stat-label">处理视频数</div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { 
  User, UserFilled, Star, VideoPlay, Notebook, Document, Collection, Check 
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/authStore'
import { useUserDataStore } from '../stores/userDataStore'

export default {
  name: 'HomeView',
  components: {
    User, UserFilled, Star, VideoPlay, Notebook, Document, Collection, Check
  },
  setup() {
    const authStore = useAuthStore()
    const userDataStore = useUserDataStore()

    onMounted(async () => {
      // 如果用户已登录，获取用户数据
      if (authStore.isAuthenticated) {
        try {
          await Promise.all([
            userDataStore.fetchQuotaInfo(),
            userDataStore.fetchLearningStats()
          ])
        } catch (error) {
          console.error('获取用户数据失败:', error)
        }
      }
    })

    const getQuotaPercentage = (type) => {
      const quota = userDataStore.quotaInfo?.[type]
      if (!quota || quota.limit === 0) return 0
      return Math.round((quota.used / quota.limit) * 100)
    }

    const getQuotaColor = (type) => {
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
  margin-bottom: 60px;
}

.hero-title {
  font-size: 3rem;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #666;
  margin-bottom: 40px;
}

.user-status-card, .login-guide-card {
  max-width: 600px;
  margin: 0 auto 40px;
}

.user-welcome {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.user-info h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.quota-info {
  margin-bottom: 20px;
}

.quota-item {
  text-align: center;
}

.quota-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.quota-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.login-guide {
  text-align: center;
  padding: 20px;
}

.guide-icon {
  color: #409EFF;
  margin-bottom: 16px;
}

.login-guide h3 {
  margin: 0 0 12px 0;
  color: #303133;
}

.login-guide p {
  color: #606266;
  margin-bottom: 20px;
}

.features-section, .membership-section, .stats-section {
  margin-bottom: 60px;
}

.features-section h2, .membership-section h2, .stats-section h2 {
  text-align: center;
  margin-bottom: 40px;
  color: #303133;
}

.feature-card {
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  color: #409EFF;
  margin-bottom: 16px;
}

.feature-card h3 {
  margin: 0 0 12px 0;
  color: #303133;
}

.feature-card p {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.privilege-list {
  padding: 20px 0;
}

.privilege-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 16px;
}

.privilege-icon {
  color: #67C23A;
  font-size: 18px;
}

.membership-cta {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  border-radius: 8px;
}

.membership-cta h3 {
  margin: 0 0 12px 0;
  color: #2d3436;
}

.membership-cta p {
  margin-bottom: 20px;
  color: #636e72;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .user-welcome {
    flex-direction: column;
    text-align: center;
  }
  
  .quick-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .feature-card {
    margin-bottom: 20px;
  }
}
</style>
