<template>
  <div class="video-learning-container">
    <!-- 页面头部 -->
    <div class="header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/video-history' }">视频历史</el-breadcrumb-item>
        <el-breadcrumb-item>学习模式</el-breadcrumb-item>
      </el-breadcrumb>
      <h2>{{ videoInfo.filename || '视频学习' }}</h2>
    </div>

    <!-- 学习进度 -->
    <el-card class="progress-card" v-if="sessionId">
      <div class="progress-header">
        <h3>学习进度</h3>
        <el-tag :type="getSessionStatusType(sessionStatus)">{{ getSessionStatusText(sessionStatus) }}</el-tag>
      </div>
      <el-steps :active="currentStep" finish-status="success" style="margin-top: 20px;">
        <el-step title="查看字幕" description="浏览视频字幕，识别学习单词"></el-step>
        <el-step title="回答问题" description="回答理解问题，巩固学习效果"></el-step>
        <el-step title="生成故事" description="用学习单词创作故事"></el-step>
        <el-step title="记忆测试" description="测试单词记忆情况"></el-step>
      </el-steps>
    </el-card>

    <!-- 第一步：字幕展示 -->
    <el-card v-if="currentStep === 0" class="step-card">
      <template #header>
        <div class="card-header">
          <span>第一步：字幕内容</span>
          <div class="header-actions">
            <el-switch
              v-model="showChinese"
              @change="onLanguageSettingsChange"
              active-text="显示中文"
              inactive-text="隐藏中文"
            />
            <el-switch
              v-model="showEnglish"
              @change="onLanguageSettingsChange"
              active-text="显示英文"
              inactive-text="隐藏英文"
              style="margin-left: 20px;"
            />
          </div>
        </div>
      </template>

      <div v-loading="subtitlesLoading" class="subtitles-container">
        <div v-if="subtitles.length === 0" class="no-subtitles">
          <el-empty description="暂无字幕数据" />
        </div>
        <div v-else class="subtitles-list">
          <div 
            v-for="subtitle in paginatedSubtitles" 
            :key="subtitle.id"
            class="subtitle-item"
          >
            <div class="time-info">
              {{ formatTime(subtitle.start_time) }} - {{ formatTime(subtitle.end_time) }}
            </div>
            <div v-if="showEnglish" class="subtitle-text english">
              <span v-html="subtitle.highlighted_english || subtitle.english_text"></span>
            </div>
            <div v-if="showChinese" class="subtitle-text chinese">
              {{ subtitle.chinese_text }}
            </div>
            <!-- 单词定义提示 -->
            <div v-if="subtitle.word_definitions && Object.keys(subtitle.word_definitions).length > 0" 
                 class="word-definitions">
              <div v-for="(definition, word) in subtitle.word_definitions" 
                   :key="word" 
                   class="word-definition">
                <strong>{{ word }}</strong>: {{ definition.translation }} 
                <span v-if="definition.phonetic" class="phonetic">{{ definition.phonetic }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <el-pagination
          v-if="subtitles.length > subtitlesPerPage"
          v-model:current-page="subtitlesCurrentPage"
          :page-size="subtitlesPerPage"
          :total="subtitles.length"
          layout="prev, pager, next, total"
          style="text-align: center; margin-top: 20px;"
        />

        <div class="step-actions">
          <el-button type="primary" @click="nextStep" :disabled="!sessionId">
            下一步：生成问题
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 第二步：问题回答 -->
    <el-card v-if="currentStep === 1" class="step-card">
      <template #header>
        <div class="card-header">
          <span>第二步：理解问题</span>
          <el-button v-if="questions.length === 0" type="primary" @click="generateQuestions" :loading="questionsLoading">
            生成问题
          </el-button>
        </div>
      </template>

      <div v-loading="questionsLoading" class="questions-container">
        <div v-if="questions.length === 0" class="no-questions">
          <el-empty description="点击上方按钮生成学习问题" />
        </div>
        <div v-else class="questions-list">
          <div v-for="(question, index) in questions" :key="question.id" class="question-item">
            <div class="question-header">
              <h4>问题 {{ index + 1 }}</h4>
              <el-tag :type="question.type === 'comprehension' ? 'primary' : 'success'">
                {{ question.type === 'comprehension' ? '理解题' : '词汇题' }}
              </el-tag>
            </div>
            <div class="question-content">
              <p class="question-text">{{ question.question }}</p>
              <p v-if="question.hint" class="question-hint">
                <el-icon><InfoFilled /></el-icon>
                提示：{{ question.hint }}
              </p>
            </div>
            <div class="answer-section">
              <el-input
                v-model="answers[question.id]"
                type="textarea"
                :rows="3"
                placeholder="请在这里输入你的答案..."
                style="margin-bottom: 10px;"
              />
              <el-button 
                type="primary" 
                size="small" 
                @click="submitAnswer(question.id, index)"
                :disabled="!answers[question.id] || answers[question.id].trim() === ''"
                :loading="submittingAnswers[question.id]"
              >
                提交答案
              </el-button>
              <div v-if="answerFeedbacks[question.id]" class="feedback">
                <el-alert
                  :title="answerFeedbacks[question.id].feedback"
                  type="success"
                  :closable="false"
                  show-icon
                  style="margin-top: 10px;"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions" v-if="questions.length > 0">
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="nextStep">
            下一步：生成故事
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 第三步：故事生成 -->
    <el-card v-if="currentStep === 2" class="step-card">
      <template #header>
        <div class="card-header">
          <span>第三步：学习故事</span>
          <el-button v-if="!story" type="primary" @click="generateStory" :loading="storyLoading">
            生成故事
          </el-button>
        </div>
      </template>

      <div v-loading="storyLoading" class="story-container">
        <div v-if="!story" class="no-story">
          <el-empty description="点击上方按钮生成学习故事" />
        </div>
        <div v-else class="story-content">
          <div class="story-section">
            <h4>英文故事</h4>
            <div class="story-text english" v-html="story.english_text"></div>
          </div>
          <div class="story-section">
            <h4>中文翻译</h4>
            <div class="story-text chinese">{{ story.chinese_text }}</div>
          </div>
          <div class="story-words">
            <h4>使用的单词</h4>
            <el-tag v-for="word in story.words_used" :key="word" style="margin-right: 10px; margin-bottom: 5px;">
              {{ word }}
            </el-tag>
          </div>
        </div>

        <div class="step-actions">
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="nextStep" :disabled="!story">
            下一步：记忆测试
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 第四步：单词记忆测试 -->
    <el-card v-if="currentStep === 3" class="step-card">
      <template #header>
        <div class="card-header">
          <span>第四步：单词记忆测试</span>
        </div>
      </template>

      <div class="memory-test-container">
        <div v-if="learnedWords.length === 0" class="no-words">
          <el-empty description="没有找到学习的单词" />
        </div>
        <div v-else>
          <p class="test-instruction">
            请标记以下单词的记忆情况，这将帮助系统更好地为您推荐学习内容。
          </p>
          <div class="words-list">
            <div v-for="word in learnedWords" :key="word" class="word-item">
              <div class="word-info">
                <span class="word-text">{{ word }}</span>
                <span v-if="getWordDefinition(word)" class="word-meaning">
                  {{ getWordDefinition(word).translation }}
                </span>
              </div>
              <div class="memory-options">
                <el-radio-group v-model="wordMemoryStatus[word]">
                  <el-radio :label="true">记住了</el-radio>
                  <el-radio :label="false">没记住</el-radio>
                </el-radio-group>
                <el-rate
                  v-if="wordMemoryStatus[word] !== undefined"
                  v-model="wordConfidenceLevel[word]"
                  :max="5"
                  show-text
                  :texts="['很不确定', '不太确定', '一般', '比较确定', '非常确定']"
                  style="margin-left: 20px;"
                />
              </div>
            </div>
          </div>

          <div class="step-actions">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="completeSession" :loading="completingSession">
              完成学习
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 学习完成 -->
    <el-card v-if="currentStep === 4" class="step-card completion-card">
      <div class="completion-content">
        <el-result
          icon="success"
          title="学习完成！"
          sub-title="恭喜你完成了这次视频学习任务"
        >
          <template #extra>
            <div class="completion-stats" v-if="completionStats">
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ completionStats.questions_answered }}</div>
                  <div class="stat-label">回答问题</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ completionStats.words_reviewed }}</div>
                  <div class="stat-label">复习单词</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ Math.round(completionStats.memory_rate || 0) }}%</div>
                  <div class="stat-label">记忆率</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ Math.round(completionStats.duration_minutes || 0) }}</div>
                  <div class="stat-label">学习时长(分钟)</div>
                </div>
              </div>
            </div>
            <div class="completion-actions">
              <el-button type="primary" @click="$router.push('/video-history')">
                返回视频历史
              </el-button>
              <el-button @click="restartLearning">
                重新学习
              </el-button>
            </div>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import apiService from '@/services/api'

export default {
  name: 'VideoLearning',
  components: {
    InfoFilled
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    
    // 基础数据
    const videoInfo = ref({ filename: '', id: '' })
    const sessionId = ref('')
    const sessionStatus = ref('active')
    const currentStep = ref(0)
    
    // 字幕相关
    const subtitles = ref([])
    const subtitlesLoading = ref(false)
    const showChinese = ref(true)
    const showEnglish = ref(true)
    const subtitlesCurrentPage = ref(1)
    const subtitlesPerPage = ref(10)
    
    // 问题相关
    const questions = ref([])
    const questionsLoading = ref(false)
    const answers = ref({})
    const answerFeedbacks = ref({})
    const submittingAnswers = ref({})
    
    // 故事相关
    const story = ref(null)
    const storyLoading = ref(false)
    
    // 单词记忆测试
    const learnedWords = ref([])
    const wordMemoryStatus = ref({})
    const wordConfidenceLevel = ref({})
    const wordDefinitions = ref({})
    const completingSession = ref(false)
    const completionStats = ref(null)

    // 计算属性
    const paginatedSubtitles = computed(() => {
      const start = (subtitlesCurrentPage.value - 1) * subtitlesPerPage.value
      const end = start + subtitlesPerPage.value
      return subtitles.value.slice(start, end)
    })

    // 初始化学习会话
    const initLearningSession = async () => {
      const videoId = route.query.videoId
      const filename = route.query.filename
      
      if (!videoId) {
        ElMessage.error('缺少视频ID参数')
        router.push('/video-history')
        return
      }
      
      videoInfo.value = { id: videoId, filename }
      
      try {
        const response = await apiService.createLearningSession(videoId, {
          show_chinese: showChinese.value,
          show_english: showEnglish.value
        })
        
        if (response.success) {
          sessionId.value = response.data.session_id
          sessionStatus.value = response.data.status
          await loadSubtitles()
        } else {
          throw new Error(response.error || '创建学习会话失败')
        }
      } catch (error) {
        console.error('初始化学习会话失败:', error)
        ElMessage.error('初始化学习会话失败: ' + error.message)
      }
    }

    // 加载字幕
    const loadSubtitles = async () => {
      if (!sessionId.value) return
      
      subtitlesLoading.value = true
      try {
        const response = await apiService.getLearningSubtitles(sessionId.value)
        if (response.success) {
          subtitles.value = response.data.subtitles || []
          // 提取已学单词用于后续步骤
          extractLearnedWords()
        } else {
          throw new Error(response.error || '获取字幕失败')
        }
      } catch (error) {
        console.error('加载字幕失败:', error)
        ElMessage.error('加载字幕失败: ' + error.message)
      } finally {
        subtitlesLoading.value = false
      }
    }

    // 提取已学单词
    const extractLearnedWords = () => {
      const words = new Set()
      const definitions = {}
      
      subtitles.value.forEach(subtitle => {
        if (subtitle.word_definitions) {
          Object.keys(subtitle.word_definitions).forEach(word => {
            words.add(word)
            definitions[word] = subtitle.word_definitions[word]
          })
        }
      })
      
      learnedWords.value = Array.from(words)
      wordDefinitions.value = definitions
      
      // 初始化记忆状态
      learnedWords.value.forEach(word => {
        wordMemoryStatus.value[word] = undefined
        wordConfidenceLevel.value[word] = 3
      })
    }

    // 语言设置变化
    const onLanguageSettingsChange = async () => {
      if (!sessionId.value) return
      
      try {
        await apiService.updateLearningSession(sessionId.value, {
          show_chinese: showChinese.value,
          show_english: showEnglish.value
        })
        await loadSubtitles()
      } catch (error) {
        console.error('更新语言设置失败:', error)
        ElMessage.error('更新设置失败')
      }
    }

    // 生成问题
    const generateQuestions = async () => {
      if (!sessionId.value) return
      
      questionsLoading.value = true
      try {
        const response = await apiService.generateLearningQuestions(sessionId.value, { count: 5 })
        if (response.success) {
          questions.value = response.data || []
        } else {
          throw new Error(response.error || '生成问题失败')
        }
      } catch (error) {
        console.error('生成问题失败:', error)
        ElMessage.error('生成问题失败: ' + error.message)
      } finally {
        questionsLoading.value = false
      }
    }

    // 提交答案
    const submitAnswer = async (questionId, index) => {
      const answer = answers.value[questionId]
      if (!answer || answer.trim() === '') return
      
      submittingAnswers.value[questionId] = true
      try {
        const response = await apiService.submitQuestionAnswer(questionId, {
          answer: answer.trim(),
          time_spent: 60 // 简化处理，可以后续优化
        })
        
        if (response.success) {
          answerFeedbacks.value[questionId] = response.data.evaluation
          ElMessage.success(`问题 ${index + 1} 答案已提交`)
        } else {
          throw new Error(response.error || '提交答案失败')
        }
      } catch (error) {
        console.error('提交答案失败:', error)
        ElMessage.error('提交答案失败: ' + error.message)
      } finally {
        submittingAnswers.value[questionId] = false
      }
    }

    // 生成故事
    const generateStory = async () => {
      if (!sessionId.value) return
      
      storyLoading.value = true
      try {
        const response = await apiService.generateLearningStory(sessionId.value)
        if (response.success) {
          story.value = response.data.story
        } else {
          throw new Error(response.error || '生成故事失败')
        }
      } catch (error) {
        console.error('生成故事失败:', error)
        ElMessage.error('生成故事失败: ' + error.message)
      } finally {
        storyLoading.value = false
      }
    }

    // 完成学习会话
    const completeSession = async () => {
      if (!sessionId.value) return
      
      // 收集单词记忆数据
      const memoryData = learnedWords.value.map(word => ({
        word,
        remembered: wordMemoryStatus.value[word],
        confidence_level: wordConfidenceLevel.value[word]
      })).filter(item => item.remembered !== undefined)
      
      if (memoryData.length === 0) {
        ElMessage.warning('请至少标记一些单词的记忆状态')
        return
      }
      
      completingSession.value = true
      try {
        // 提交单词记忆状态
        await apiService.recordWordMemory(sessionId.value, { words: memoryData })
        
        // 完成学习会话
        const response = await apiService.completeLearningSession(sessionId.value)
        if (response.success) {
          completionStats.value = response.data.statistics
          currentStep.value = 4
          ElMessage.success('学习完成！')
        } else {
          throw new Error(response.error || '完成学习失败')
        }
      } catch (error) {
        console.error('完成学习失败:', error)
        ElMessage.error('完成学习失败: ' + error.message)
      } finally {
        completingSession.value = false
      }
    }

    // 步骤导航
    const nextStep = () => {
      if (currentStep.value < 3) {
        currentStep.value++
      }
    }

    const prevStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--
      }
    }

    // 重新开始学习
    const restartLearning = () => {
      currentStep.value = 0
      sessionId.value = ''
      answers.value = {}
      answerFeedbacks.value = {}
      story.value = null
      wordMemoryStatus.value = {}
      wordConfidenceLevel.value = {}
      completionStats.value = null
      initLearningSession()
    }

    // 工具函数
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }

    const getWordDefinition = (word) => {
      return wordDefinitions.value[word]
    }

    const getSessionStatusText = (status) => {
      const statusMap = {
        'active': '进行中',
        'completed': '已完成',
        'paused': '已暂停'
      }
      return statusMap[status] || status
    }

    const getSessionStatusType = (status) => {
      const typeMap = {
        'active': 'primary',
        'completed': 'success',
        'paused': 'warning'
      }
      return typeMap[status] || 'info'
    }

    // 生命周期
    onMounted(() => {
      initLearningSession()
    })

    return {
      // 基础数据
      videoInfo,
      sessionId,
      sessionStatus,
      currentStep,
      
      // 字幕相关
      subtitles,
      subtitlesLoading,
      showChinese,
      showEnglish,
      subtitlesCurrentPage,
      subtitlesPerPage,
      paginatedSubtitles,
      onLanguageSettingsChange,
      
      // 问题相关
      questions,
      questionsLoading,
      answers,
      answerFeedbacks,
      submittingAnswers,
      generateQuestions,
      submitAnswer,
      
      // 故事相关
      story,
      storyLoading,
      generateStory,
      
      // 单词记忆
      learnedWords,
      wordMemoryStatus,
      wordConfidenceLevel,
      completingSession,
      completionStats,
      completeSession,
      
      // 导航
      nextStep,
      prevStep,
      restartLearning,
      
      // 工具函数
      formatTime,
      getWordDefinition,
      getSessionStatusText,
      getSessionStatusType
    }
  }
}
</script>

<style scoped>
.video-learning-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.header h2 {
  margin: 10px 0 0 0;
  color: #303133;
}

.progress-card {
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-header h3 {
  margin: 0;
}

.step-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

/* 字幕样式 */
.subtitles-container {
  min-height: 400px;
}

.subtitle-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
  background: #fff;
}

.time-info {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.subtitle-text {
  margin-bottom: 8px;
  line-height: 1.6;
}

.subtitle-text.english {
  color: #303133;
  font-size: 14px;
}

.subtitle-text.chinese {
  color: #606266;
  font-size: 13px;
}

.word-definitions {
  border-top: 1px solid #f4f4f5;
  padding-top: 10px;
  margin-top: 10px;
}

.word-definition {
  display: inline-block;
  margin-right: 15px;
  margin-bottom: 5px;
  font-size: 12px;
  color: #606266;
}

.phonetic {
  color: #909399;
  margin-left: 5px;
}

/* 问题样式 */
.questions-container {
  min-height: 400px;
}

.question-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background: #fff;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.question-header h4 {
  margin: 0;
  color: #303133;
}

.question-content {
  margin-bottom: 15px;
}

.question-text {
  font-size: 15px;
  color: #303133;
  margin-bottom: 10px;
  line-height: 1.6;
}

.question-hint {
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 5px;
}

.answer-section {
  border-top: 1px solid #f4f4f5;
  padding-top: 15px;
}

.feedback {
  margin-top: 10px;
}

/* 故事样式 */
.story-container {
  min-height: 400px;
}

.story-content {
  max-width: 800px;
}

.story-section {
  margin-bottom: 25px;
}

.story-section h4 {
  color: #303133;
  margin-bottom: 10px;
  border-left: 4px solid #409EFF;
  padding-left: 10px;
}

.story-text {
  line-height: 1.8;
  padding: 15px;
  border-radius: 6px;
  background: #f8f9fa;
}

.story-text.english {
  font-size: 15px;
  color: #303133;
}

.story-text.chinese {
  font-size: 14px;
  color: #606266;
}

.story-words {
  margin-top: 20px;
}

.story-words h4 {
  margin-bottom: 10px;
}

/* 单词记忆测试样式 */
.memory-test-container {
  min-height: 400px;
}

.test-instruction {
  color: #606266;
  margin-bottom: 20px;
  padding: 15px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 4px solid #409EFF;
}

.words-list {
  max-width: 800px;
}

.word-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 10px;
  background: #fff;
}

.word-info {
  flex: 1;
}

.word-text {
  font-weight: 500;
  color: #303133;
  margin-right: 10px;
}

.word-meaning {
  color: #606266;
  font-size: 13px;
}

.memory-options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

/* 完成页面样式 */
.completion-card {
  text-align: center;
}

.completion-stats {
  margin: 20px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 13px;
  color: #606266;
}

.completion-actions {
  margin-top: 20px;
}

/* 步骤操作按钮 */
.step-actions {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.step-actions .el-button {
  margin: 0 10px;
}

/* 高亮样式 */
:deep(.learned-word) {
  background-color: #fff5f5;
  color: #f56c6c;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: help;
  border-bottom: 1px dotted #f56c6c;
}

:deep(.highlight-word) {
  background-color: #e1f3d8;
  color: #67c23a;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .video-learning-container {
    padding: 10px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: space-between;
  }
  
  .word-item {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .memory-options {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .step-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .step-actions .el-button {
    margin: 0;
  }
}
</style> 