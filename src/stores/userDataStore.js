import { defineStore } from 'pinia'
import apiService from '@/services/api'
import { ElMessage } from 'element-plus'

export const useUserDataStore = defineStore('userData', {
  state: () => ({
    // 用户单词本
    userWords: [],
    // 学习会话历史
    learningSessions: [],
    // 用户统计数据
    statistics: null,
    // 用户配额信息
    quotaInfo: null,
    // 分页信息
    pagination: {
      words: { page: 1, total: 0, pages: 0 },
      sessions: { page: 1, total: 0, pages: 0 }
    },
    // 加载状态
    isLoading: false,
    // 错误信息
    error: null
  }),

  getters: {
    // 已学会的单词数量
    learnedWordsCount: (state) => {
      return state.userWords.filter(word => word.is_learned).length
    },
    
    // 学习中的单词数量
    learningWordsCount: (state) => {
      return state.userWords.filter(word => !word.is_learned).length
    },
    
    // 单词总数
    totalWordsCount: (state) => {
      return state.userWords.length
    },
    
    // 学习进度百分比
    learningProgress: (state) => {
      if (state.userWords.length === 0) return 0
      return Math.round((state.learnedWordsCount / state.userWords.length) * 100)
    },
    
    // 今日学习统计
    todayStats: (state) => {
      if (!state.statistics?.daily_breakdown) return null
      const today = new Date().toISOString().split('T')[0]
      return state.statistics.daily_breakdown.find(day => day.date === today)
    },
    
    // 配额使用情况
    quotaUsage: (state) => {
      return state.quotaInfo?.quotas || {}
    },
    
    // 是否达到配额限制
    isQuotaExceeded: (state) => {
      const quotas = state.quotaInfo?.quotas || {}
      return Object.values(quotas).some(quota => quota.remaining <= 0)
    }
  },

  actions: {
    // 获取用户单词本
    async fetchUserWords(page = 1, perPage = 20, filters = {}) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.getUserWords(page, perPage, filters)
        
        console.log('API响应数据:', response) // 调试日志
        
        // 修复：由于响应拦截器返回 response.data，所以直接处理数组
        if (Array.isArray(response)) {
          // 后端返回的是数组格式（通过响应拦截器处理后）
          this.userWords = response
          this.pagination.words = {
            page: page,
            total: response.length,
            pages: Math.ceil(response.length / perPage)
          }
          console.log(`✅ 获取用户单词本成功: ${this.userWords.length} 个单词`)
        } else if (response && response.success) {
          // 某些API可能返回标准格式
          this.userWords = response.data?.words || []
          this.pagination.words = {
            page: response.data?.page || 1,
            total: response.data?.total || 0,
            pages: Math.ceil((response.data?.total || 0) / perPage)
          }
          console.log(`✅ 获取用户单词本成功: ${this.userWords.length} 个单词`)
        } else {
          // 未知格式，尝试处理
          console.warn('未知的响应格式:', response)
          this.userWords = []
          throw new Error('响应格式不正确')
        }
      } catch (error) {
        console.error('❌ 获取用户单词本失败:', error)
        this.error = error.response?.data?.message || error.message || '获取单词本失败'
        // 只有真正的错误才显示错误消息
        if (error.response?.status !== 200) {
          ElMessage.error(this.error)
        }
      } finally {
        this.isLoading = false
      }
    },

    // 添加示例单词到用户单词本
    async addSampleWords() {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.addUserSampleWords()
        
        if (response.success) {
          // 重新获取单词本
          await this.fetchUserWords()
          ElMessage.success(`已添加 ${response.data.added_count || 5} 个示例单词`)
          return response.data
        } else {
          throw new Error(response.message || '添加示例单词失败')
        }
      } catch (error) {
        console.error('添加示例单词失败:', error)
        this.error = error.response?.data?.message || error.message || '添加示例单词失败'
        ElMessage.error(this.error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 添加单词到用户单词本
    async addUserWord(wordText, translation = null, categoryId = null) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.addUserWord(wordText, translation, categoryId)
        
        if (response.success) {
          // 添加到本地状态
          this.userWords.unshift(response.data)
          this.pagination.words.total++
          
          ElMessage.success('单词添加成功')
          return response.data
        } else {
          throw new Error(response.message || '添加单词失败')
        }
      } catch (error) {
        console.error('添加用户单词失败:', error)
        this.error = error.response?.data?.message || error.message || '添加单词失败'
        
        // 处理配额超限错误
        if (error.response?.status === 429) {
          ElMessage.error('单词本已达上限，请升级VIP或删除部分单词')
        } else {
          ElMessage.error(this.error)
        }
        
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 更新单词学习状态
    async updateWordStatus(wordId, isLearned) {
      try {
        const response = await apiService.updateUserWordStatus(wordId, isLearned)
        
        if (response.success) {
          // 更新本地状态
          const wordIndex = this.userWords.findIndex(word => word.id === wordId)
          if (wordIndex !== -1) {
            this.userWords[wordIndex].is_learned = isLearned
            this.userWords[wordIndex].learned_at = isLearned ? new Date().toISOString() : null
          }
          
          ElMessage.success(isLearned ? '标记为已学会' : '标记为学习中')
        } else {
          throw new Error(response.message || '更新失败')
        }
      } catch (error) {
        console.error('更新单词状态失败:', error)
        ElMessage.error('更新单词状态失败')
      }
    },

    // 删除用户单词
    async deleteUserWord(wordId) {
      try {
        const response = await apiService.deleteUserWord(wordId)
        
        if (response.success) {
          // 从本地状态删除
          const wordIndex = this.userWords.findIndex(word => word.id === wordId)
          if (wordIndex !== -1) {
            this.userWords.splice(wordIndex, 1)
            this.pagination.words.total--
          }
          
          ElMessage.success('单词删除成功')
        } else {
          throw new Error(response.message || '删除失败')
        }
      } catch (error) {
        console.error('删除用户单词失败:', error)
        ElMessage.error('删除单词失败')
      }
    },

    // 批量删除用户单词
    async deleteUserWords(wordIds) {
      try {
        const promises = wordIds.map(wordId => apiService.deleteUserWord(wordId))
        await Promise.all(promises)
        
        // 从本地状态删除
        this.userWords = this.userWords.filter(word => !wordIds.includes(word.id))
        this.pagination.words.total -= wordIds.length
        
        ElMessage.success(`成功删除 ${wordIds.length} 个单词`)
      } catch (error) {
        console.error('批量删除单词失败:', error)
        ElMessage.error('批量删除失败')
      }
    },

    // 获取用户学习统计
    async fetchUserStatistics(period = 'week') {
      try {
        const response = await apiService.getUserStatistics(period)
        
        if (response.success) {
          this.statistics = response.data
        }
      } catch (error) {
        console.error('获取用户统计失败:', error)
      }
    },

    // 获取用户学习会话历史
    async fetchUserLearningSessions(page = 1, perPage = 10) {
      this.isLoading = true

      try {
        const response = await apiService.getUserLearningSessions(page, perPage)
        
        if (response.success) {
          this.learningSessions = response.data.sessions
          this.pagination.sessions = {
            page: response.data.page,
            total: response.data.total,
            pages: Math.ceil(response.data.total / perPage)
          }
        }
      } catch (error) {
        console.error('获取学习会话历史失败:', error)
        ElMessage.error('获取学习历史失败')
      } finally {
        this.isLoading = false
      }
    },

    // 检查用户配额
    async checkUserQuota() {
      try {
        const response = await apiService.checkUserQuota()
        
        if (response.success) {
          this.quotaInfo = response.data
        }
      } catch (error) {
        console.error('检查用户配额失败:', error)
      }
    },

    // 创建用户学习会话
    async createUserLearningSession(videoId, config) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.createUserLearningSession(videoId, config)
        
        if (response.success) {
          ElMessage.success('学习会话创建成功')
          
          // 更新配额信息
          this.checkUserQuota()
          
          return response.data
        } else {
          throw new Error(response.message || '创建学习会话失败')
        }
      } catch (error) {
        console.error('创建用户学习会话失败:', error)
        this.error = error.response?.data?.message || error.message || '创建学习会话失败'
        
        // 处理配额超限错误
        if (error.response?.status === 429) {
          ElMessage.error('今日学习次数已达上限，请升级VIP')
        } else {
          ElMessage.error(this.error)
        }
        
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 搜索用户单词
    searchUserWords(keyword) {
      if (!keyword) return this.userWords
      
      const lowerKeyword = keyword.toLowerCase()
      return this.userWords.filter(word => 
        word.word_text.toLowerCase().includes(lowerKeyword) ||
        word.translation?.toLowerCase().includes(lowerKeyword)
      )
    },

    // 按分类筛选单词
    filterWordsByCategory(categoryId) {
      if (!categoryId || categoryId === 'all') return this.userWords
      
      return this.userWords.filter(word => word.category_id === categoryId)
    },

    // 按学习状态筛选单词
    filterWordsByStatus(isLearned) {
      if (isLearned === null || isLearned === undefined) return this.userWords
      
      return this.userWords.filter(word => word.is_learned === isLearned)
    },

    // 获取配额提示信息
    getQuotaWarning() {
      const quotas = this.quotaInfo?.quotas || {}
      const warnings = []
      
      Object.entries(quotas).forEach(([key, quota]) => {
        if (quota.remaining <= 0) {
          const names = {
            learning_sessions: '学习会话',
            ai_questions: 'AI问题',
            story_generations: '故事生成',
            personal_words: '个人单词'
          }
          warnings.push(`${names[key] || key}已达上限`)
        } else if (quota.remaining <= 2) {
          const names = {
            learning_sessions: '学习会话',
            ai_questions: 'AI问题',
            story_generations: '故事生成',
            personal_words: '个人单词'
          }
          warnings.push(`${names[key] || key}仅剩${quota.remaining}次`)
        }
      })
      
      return warnings
    },

    // 清理状态
    clearUserData() {
      this.userWords = []
      this.learningSessions = []
      this.statistics = null
      this.quotaInfo = null
      this.pagination = {
        words: { page: 1, total: 0, pages: 0 },
        sessions: { page: 1, total: 0, pages: 0 }
      }
      this.error = null
    }
  }
}) 