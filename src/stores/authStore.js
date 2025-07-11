import { defineStore } from 'pinia'
import apiService from '@/services/api'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // 用户信息
    user: null,
    // 认证状态
    isAuthenticated: false,
    // 加载状态
    isLoading: false,
    // 错误信息
    error: null,
    // 验证码发送状态
    codeSending: false,
    // 验证码倒计时
    codeCountdown: 0,
    // 倒计时定时器
    countdownTimer: null
  }),

  getters: {
    // 是否为VIP用户
    isVip: (state) => {
      return state.user?.is_vip_active || false
    },
    
    // 用户等级
    membershipType: (state) => {
      return state.user?.membership_type || 'free'
    },
    
    // 用户昵称
    nickname: (state) => {
      return state.user?.nickname || state.user?.phone || '未登录'
    },
    
    // 日配额信息
    dailyQuotas: (state) => {
      return state.user?.daily_quotas || {}
    },
    
    // VIP到期时间
    vipExpiresAt: (state) => {
      return state.user?.vip_expires_at
    }
  },

  actions: {
    // 初始化认证状态
    initAuth() {
      const token = localStorage.getItem('access_token')
      const userInfo = localStorage.getItem('user_info')
      
      console.log('🔄 初始化认证状态:', { 
        hasToken: !!token, 
        hasUserInfo: !!userInfo 
      })
      
      if (token && userInfo) {
        try {
          this.user = JSON.parse(userInfo)
          this.isAuthenticated = true
          console.log('✅ 从本地存储恢复用户状态:', this.user.nickname || this.user.phone)
          
          // 异步验证token有效性，不阻塞初始化
          this.verifyTokenAsync()
        } catch (error) {
          console.error('❌ 解析本地用户信息失败:', error)
          this.clearAuth()
        }
      } else {
        console.log('📭 未找到有效的本地认证信息')
      }
      
      // 监听token过期事件
      window.addEventListener('auth-expired', this.handleAuthExpired)
    },

    // 异步验证token有效性
    async verifyTokenAsync() {
      try {
        console.log('🔍 验证token有效性...')
        await this.refreshUserInfo()
        console.log('✅ Token验证通过，用户信息已更新')
      } catch (error) {
        console.warn('⚠️ Token验证失败，但保持当前状态:', error.message)
        // 不立即清除认证状态，让用户操作触发401时再处理
      }
    },

    // 发送验证码
    async sendVerificationCode(phone) {
      if (this.codeCountdown > 0) {
        ElMessage.warning('验证码已发送，请稍后再试')
        return false
      }

      this.codeSending = true
      this.error = null

      try {
        const response = await apiService.sendVerificationCode(phone)
        
        if (response.success) {
          ElMessage.success('验证码发送成功')
          this.startCountdown()
          
          // 测试环境可能直接返回验证码
          if (response.data?.verification_code) {
            console.log('测试环境验证码:', response.data.verification_code)
            ElMessage.info(`测试环境验证码: ${response.data.verification_code}`)
          }
          
          return true
        } else {
          throw new Error(response.message || '发送验证码失败')
        }
      } catch (error) {
        console.error('发送验证码失败:', error)
        this.error = error.message || '发送验证码失败'
        ElMessage.error(this.error)
        return false
      } finally {
        this.codeSending = false
      }
    },

    // 用户注册
    async register(phone, verificationCode, nickname = null) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.register(phone, verificationCode, nickname)
        
        if (response.success) {
          this.setUserInfo(response.data)
          ElMessage.success('注册成功')
          return true
        } else {
          throw new Error(response.message || '注册失败')
        }
      } catch (error) {
        console.error('注册失败:', error)
        this.error = error.response?.data?.message || error.message || '注册失败'
        ElMessage.error(this.error)
        return false
      } finally {
        this.isLoading = false
      }
    },

    // 用户登录
    async login(phone, verificationCode) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.login(phone, verificationCode)
        
        if (response.success) {
          this.setUserInfo(response.data)
          ElMessage.success('登录成功')
          return true
        } else {
          throw new Error(response.message || '登录失败')
        }
      } catch (error) {
        console.error('登录失败:', error)
        this.error = error.response?.data?.message || error.message || '登录失败'
        ElMessage.error(this.error)
        return false
      } finally {
        this.isLoading = false
      }
    },

    // 用户登出
    async logout() {
      try {
        await apiService.logout()
      } catch (error) {
        console.error('登出请求失败:', error)
      } finally {
        this.clearAuth()
        ElMessage.success('已退出登录')
      }
    },

    // 刷新用户信息
    async refreshUserInfo() {
      try {
        const response = await apiService.getUserProfile()
        
        if (response.success) {
          this.user = { ...this.user, ...response.data }
          localStorage.setItem('user_info', JSON.stringify(this.user))
        }
      } catch (error) {
        console.error('刷新用户信息失败:', error)
        if (error.response?.status === 401) {
          this.clearAuth()
        }
      }
    },

    // 更新用户信息
    async updateUserInfo(data) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.updateUserProfile(data)
        
        if (response.success) {
          this.user = { ...this.user, ...response.data }
          localStorage.setItem('user_info', JSON.stringify(this.user))
          ElMessage.success('用户信息更新成功')
          return true
        } else {
          throw new Error(response.message || '更新失败')
        }
      } catch (error) {
        console.error('更新用户信息失败:', error)
        this.error = error.response?.data?.message || error.message || '更新失败'
        ElMessage.error(this.error)
        return false
      } finally {
        this.isLoading = false
      }
    },

    // 设置用户信息
    setUserInfo(userData) {
      this.user = userData
      this.isAuthenticated = true
      
      // 保存到本地存储
      if (userData.access_token) {
        localStorage.setItem('access_token', userData.access_token)
      }
      localStorage.setItem('user_info', JSON.stringify(userData))
    },

    // 清除认证信息
    clearAuth() {
      this.user = null
      this.isAuthenticated = false
      this.error = null
      
      // 清除本地存储
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_info')
      
      // 清除倒计时
      this.clearCountdown()
    },

    // 处理token过期
    handleAuthExpired() {
      this.clearAuth()
      ElMessage.warning('登录已过期，请重新登录')
    },

    // 开始验证码倒计时
    startCountdown() {
      this.codeCountdown = 60
      this.countdownTimer = setInterval(() => {
        this.codeCountdown--
        if (this.codeCountdown <= 0) {
          this.clearCountdown()
        }
      }, 1000)
    },

    // 清除倒计时
    clearCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
      }
      this.codeCountdown = 0
    },

    // 检查是否需要登录
    requireAuth() {
      if (!this.isAuthenticated) {
        ElMessage.warning('请先登录')
        return false
      }
      return true
    }
  }
}) 