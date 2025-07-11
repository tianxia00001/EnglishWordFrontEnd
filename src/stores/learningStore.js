import { defineStore } from 'pinia'
import apiService from '@/services/api'

export const useLearningStore = defineStore('learning', {
  state: () => ({
    // 当前学习会话
    currentSession: null,
    sessionId: null,
    sessionStatus: 'inactive',
    
    // 字幕数据
    subtitles: [],
    currentSubtitle: null,
    showChinese: true,
    showEnglish: true,
    
    // 问题数据
    questions: [],
    answers: {},
    answerFeedbacks: {},
    
    // 故事数据
    currentStory: null,
    
    // 单词记忆数据
    learnedWords: [],
    wordMemoryStatus: {},
    
    // 加载状态
    isLoading: false,
    isGeneratingQuestions: false,
    isGeneratingStory: false,
    isSubmittingAnswer: false,
    
    // 错误状态
    error: null,
    
    // 学习统计
    learningStats: {
      questionsAnswered: 0,
      wordsReviewed: 0,
      memoryRate: 0,
      sessionDuration: 0
    }
  }),
  
  getters: {
    // 获取当前步骤进度
    currentStep: (state) => {
      if (!state.sessionId) return 0
      if (state.questions.length === 0) return 1
      if (!state.currentStory) return 2
      if (Object.keys(state.wordMemoryStatus).length === 0) return 3
      return 4
    },
    
    // 获取已回答的问题数量
    answeredQuestionsCount: (state) => {
      return Object.keys(state.answers).length
    },
    
    // 获取记忆状态已标记的单词数量
    reviewedWordsCount: (state) => {
      return Object.values(state.wordMemoryStatus).filter(status => status !== undefined).length
    },
    
    // 计算记忆率
    memoryRate: (state) => {
      const reviewed = Object.values(state.wordMemoryStatus).filter(status => status !== undefined)
      const remembered = reviewed.filter(status => status === true)
      return reviewed.length > 0 ? (remembered.length / reviewed.length) * 100 : 0
    },
    
    // 获取会话是否已完成
    isSessionCompleted: (state) => {
      return state.sessionStatus === 'completed'
    }
  },
  
  actions: {
    // 创建学习会话
    async createSession(videoId, config = {}) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.createLearningSession(videoId, {
          show_chinese: config.showChinese !== false,
          show_english: config.showEnglish !== false,
          user_id: config.userId || null
        })
        
        if (response.success) {
          this.currentSession = response.data
          this.sessionId = response.data.session_id
          this.sessionStatus = response.data.status
          this.showChinese = response.data.config.show_chinese
          this.showEnglish = response.data.config.show_english
          
          // 自动加载字幕
          await this.loadSubtitles()
          
          return response.data
        } else {
          throw new Error(response.error || '创建学习会话失败')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    // 加载字幕
    async loadSubtitles(page = 1, perPage = 50) {
      if (!this.sessionId) {
        throw new Error('无有效的学习会话')
      }
      
      try {
        const response = await apiService.getLearningSubtitles(this.sessionId, page, perPage)
        
        if (response.success) {
          this.subtitles = response.data.subtitles || []
          
          // 提取学习单词
          this.extractLearnedWords()
          
          return response.data
        } else {
          throw new Error(response.error || '加载字幕失败')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 从字幕中提取已学单词
    extractLearnedWords() {
      const words = new Set()
      
      this.subtitles.forEach(subtitle => {
        if (subtitle.word_definitions) {
          Object.keys(subtitle.word_definitions).forEach(word => {
            words.add(word)
          })
        }
      })
      
      this.learnedWords = Array.from(words)
      
      // 初始化单词记忆状态
      this.learnedWords.forEach(word => {
        if (!(word in this.wordMemoryStatus)) {
          this.wordMemoryStatus[word] = undefined
        }
      })
    },
    
    // 生成学习问题
    async generateQuestions(count = 5) {
      if (!this.sessionId) {
        throw new Error('无有效的学习会话')
      }
      
      this.isGeneratingQuestions = true
      this.error = null
      
      try {
        const response = await apiService.generateLearningQuestions(this.sessionId, { count })
        
        if (response.success) {
          this.questions = response.data || []
          return this.questions
        } else {
          throw new Error(response.error || '生成问题失败')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isGeneratingQuestions = false
      }
    },
    
    // 提交问题答案
    async submitAnswer(questionId, answer, timeSpent = 60) {
      this.isSubmittingAnswer = true
      this.error = null
      
      try {
        const response = await apiService.submitQuestionAnswer(questionId, {
          answer: answer.trim(),
          time_spent: timeSpent
        })
        
        if (response.success) {
          this.answers[questionId] = answer
          this.answerFeedbacks[questionId] = response.data.evaluation
          this.learningStats.questionsAnswered = Object.keys(this.answers).length
          
          return response.data
        } else {
          throw new Error(response.error || '提交答案失败')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isSubmittingAnswer = false
      }
    },
    
    // 生成学习故事
    async generateStory(words = null) {
      if (!this.sessionId) {
        throw new Error('无有效的学习会话')
      }
      
      this.isGeneratingStory = true
      this.error = null
      
      try {
        const response = await apiService.generateLearningStory(this.sessionId, words)
        
        if (response.success) {
          this.currentStory = response.data.story
          return this.currentStory
        } else {
          throw new Error(response.error || '生成故事失败')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isGeneratingStory = false
      }
    },
    
    // 记录单词记忆状态
    async recordWordMemory(words) {
      if (!this.sessionId) {
        throw new Error('无有效的学习会话')
      }
      
      try {
        const response = await apiService.recordWordMemory(this.sessionId, { words })
        
        if (response.success) {
          // 更新本地状态
          words.forEach(wordData => {
            if (wordData.remembered !== undefined) {
              this.wordMemoryStatus[wordData.word] = wordData.remembered
            }
          })
          
          this.learningStats.wordsReviewed = response.data.words_remembered + response.data.words_not_remembered
          this.learningStats.memoryRate = response.data.memory_rate
          
          return response.data
        } else {
          throw new Error(response.error || '记录单词记忆状态失败')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 完成学习会话
    async completeSession() {
      if (!this.sessionId) {
        throw new Error('无有效的学习会话')
      }
      
      try {
        const response = await apiService.completeLearningSession(this.sessionId)
        
        if (response.success) {
          this.sessionStatus = 'completed'
          this.learningStats = {
            ...this.learningStats,
            ...response.data.statistics
          }
          
          return response.data
        } else {
          throw new Error(response.error || '完成学习会话失败')
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 重置学习状态
    resetLearningState() {
      this.currentSession = null
      this.sessionId = null
      this.sessionStatus = 'inactive'
      this.subtitles = []
      this.currentSubtitle = null
      this.questions = []
      this.answers = {}
      this.answerFeedbacks = {}
      this.currentStory = null
      this.learnedWords = []
      this.wordMemoryStatus = {}
      this.error = null
      this.learningStats = {
        questionsAnswered: 0,
        wordsReviewed: 0,
        memoryRate: 0,
        sessionDuration: 0
      }
    },
    
    // 更新语言显示设置
    updateLanguageSettings(showChinese, showEnglish) {
      this.showChinese = showChinese
      this.showEnglish = showEnglish
      // 重新加载字幕以应用新的设置
      if (this.sessionId) {
        this.loadSubtitles()
      }
    },
    
    // 设置当前字幕
    setCurrentSubtitle(subtitle) {
      this.currentSubtitle = subtitle
    }
  }
})

export default useLearningStore 