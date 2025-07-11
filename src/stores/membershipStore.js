import { defineStore } from 'pinia'
import apiService from '@/services/api'
import { ElMessage, ElLoading } from 'element-plus'

export const useMembershipStore = defineStore('membership', {
  state: () => ({
    // 会员套餐列表
    plans: [],
    // 当前用户会员状态
    membershipStatus: null,
    // 订单历史
    orders: [],
    // 当前订单
    currentOrder: null,
    // 支付状态
    paymentStatus: null,
    // 加载状态
    isLoading: false,
    // 支付轮询定时器
    paymentTimer: null,
    // 错误信息
    error: null
  }),

  getters: {
    // 是否为VIP
    isVip: (state) => {
      return state.membershipStatus?.is_vip_active || false
    },
    
    // VIP到期时间
    vipExpiresAt: (state) => {
      return state.membershipStatus?.vip_expires_at
    },
    
    // VIP剩余天数
    vipDaysRemaining: (state) => {
      if (!state.membershipStatus?.vip_expires_at) return 0
      const expireDate = new Date(state.membershipStatus.vip_expires_at)
      const now = new Date()
      const diffTime = expireDate - now
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    },
    
    // 热门套餐
    popularPlan: (state) => {
      return state.plans.find(plan => plan.is_popular)
    },
    
    // 按价格排序的套餐
    sortedPlans: (state) => {
      return [...state.plans].sort((a, b) => a.current_price - b.current_price)
    }
  },

  actions: {
    // 获取会员套餐
    async fetchMembershipPlans() {
      this.isLoading = true
      this.error = null

      try {
        console.log('开始获取会员套餐...')
        const response = await apiService.getMembershipPlans()
        console.log('会员套餐API响应:', response)
        
        // 适配后端实际返回的格式
        if (response && response.data && Array.isArray(response.data.plans)) {
          // 后端实际格式：{ "data": { "plans": [...] } }
          this.plans = response.data.plans
          console.log(`成功获取 ${this.plans.length} 个会员套餐`)
        } else if (response && response.success && Array.isArray(response.data)) {
          // 文档格式：{ "success": true, "data": [...] }
          this.plans = response.data
          console.log(`标准格式：获取 ${this.plans.length} 个会员套餐`)
        } else if (Array.isArray(response)) {
          // 直接数组格式：[...]
          this.plans = response
          console.log(`直接数组：获取 ${this.plans.length} 个会员套餐`)
        } else {
          this.plans = []
          console.error('未识别的API响应格式:', response)
          throw new Error('获取套餐失败：响应格式不匹配')
        }
      } catch (error) {
        console.error('获取会员套餐失败:', error)
        console.error('错误详情:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        this.error = error.message || '获取套餐失败'
        ElMessage.error(this.error)
      } finally {
        this.isLoading = false
      }
    },

    // 获取会员状态
    async fetchMembershipStatus() {
      try {
        console.log('开始获取会员状态...')
        const response = await apiService.getMembershipStatus()
        console.log('会员状态API响应:', response)
        
        // 适配后端实际返回的格式
        if (response && response.data) {
          // 后端实际格式或标准格式
          this.membershipStatus = response.data
          console.log('成功获取会员状态')
        } else if (response && response.success) {
          // 文档格式
          this.membershipStatus = response.data
          console.log('成功获取会员状态')
        } else {
          console.warn('会员状态API响应格式未知:', response)
          this.membershipStatus = response || null
        }
      } catch (error) {
        console.error('获取会员状态失败:', error)
        // 401错误是正常的，表示需要登录
        if (error.response?.status !== 401) {
          console.error('会员状态错误详情:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          })
        }
      }
    },

    // 创建订单
    async createOrder(planId) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.createOrder(planId)
        
        if (response.success) {
          this.currentOrder = response.data
          ElMessage.success('订单创建成功')
          return response.data
        } else {
          throw new Error(response.message || '创建订单失败')
        }
      } catch (error) {
        console.error('创建订单失败:', error)
        this.error = error.response?.data?.message || error.message || '创建订单失败'
        ElMessage.error(this.error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 发起支付
    async initiatePayment(orderNo, paymentMethod) {
      this.isLoading = true
      this.error = null

      try {
        const response = await apiService.initiatePayment(orderNo, paymentMethod)
        
        if (response.success) {
          const paymentData = response.data
          
          if (paymentMethod === 'alipay' && paymentData.payment_url) {
            // 支付宝支付 - 打开支付页面
            window.open(paymentData.payment_url, '_blank')
          } else if (paymentMethod === 'wechat' && paymentData.qr_code) {
            // 微信支付 - 显示二维码
            this.showWechatQRCode(paymentData.qr_code)
          }
          
          // 开始轮询支付状态
          this.startPaymentPolling(orderNo)
          
          return paymentData
        } else {
          throw new Error(response.message || '发起支付失败')
        }
      } catch (error) {
        console.error('发起支付失败:', error)
        this.error = error.response?.data?.message || error.message || '发起支付失败'
        ElMessage.error(this.error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 显示微信支付二维码
    showWechatQRCode(qrCode) {
      // 创建二维码显示弹窗
      const div = document.createElement('div')
      div.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.5); z-index: 9999; display: flex; 
                    align-items: center; justify-content: center;" id="wechat-pay-modal">
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <h3>微信支付</h3>
            <img src="${qrCode}" alt="微信支付二维码" style="width: 200px; height: 200px;" />
            <p>请使用微信扫码支付</p>
            <button onclick="document.getElementById('wechat-pay-modal').remove()" 
                    style="margin-top: 10px; padding: 8px 16px; background: #409EFF; 
                           color: white; border: none; border-radius: 4px; cursor: pointer;">
              关闭
            </button>
          </div>
        </div>
      `
      document.body.appendChild(div)
    },

    // 开始支付状态轮询
    startPaymentPolling(orderNo) {
      // 清除之前的定时器
      if (this.paymentTimer) {
        clearInterval(this.paymentTimer)
      }

      const loadingInstance = ElLoading.service({
        fullscreen: true,
        text: '等待支付完成...'
      })

      this.paymentTimer = setInterval(async () => {
        try {
          const response = await apiService.getPaymentStatus(orderNo)
          
          if (response.success) {
            const status = response.data.status
            
            if (status === 'success') {
              // 支付成功
              this.handlePaymentSuccess(response.data)
              this.stopPaymentPolling()
              loadingInstance.close()
            } else if (status === 'failed' || status === 'expired') {
              // 支付失败或过期
              this.handlePaymentFailed(status)
              this.stopPaymentPolling()
              loadingInstance.close()
            }
            // pending状态继续轮询
          }
        } catch (error) {
          console.error('查询支付状态失败:', error)
        }
      }, 3000) // 每3秒查询一次

      // 5分钟后停止轮询
      setTimeout(() => {
        if (this.paymentTimer) {
          this.stopPaymentPolling()
          loadingInstance.close()
          ElMessage.warning('支付超时，请手动刷新页面查看支付状态')
        }
      }, 300000)
    },

    // 停止支付轮询
    stopPaymentPolling() {
      if (this.paymentTimer) {
        clearInterval(this.paymentTimer)
        this.paymentTimer = null
      }
      
      // 关闭微信支付二维码弹窗
      const modal = document.getElementById('wechat-pay-modal')
      if (modal) {
        modal.remove()
      }
    },

    // 处理支付成功
    handlePaymentSuccess(paymentData) {
      ElMessage({
        message: '支付成功！VIP已激活',
        type: 'success',
        duration: 5000
      })
      
      // 更新会员状态
      this.fetchMembershipStatus()
      
      // 保存支付信息
      this.paymentStatus = paymentData
      
      // 通知其他组件更新用户信息
      window.dispatchEvent(new CustomEvent('membership-updated'))
    },

    // 处理支付失败
    handlePaymentFailed(status) {
      const message = status === 'expired' ? '支付已过期' : '支付失败'
      ElMessage.error(message)
    },

    // 获取订单历史
    async fetchOrderHistory(page = 1, perPage = 10) {
      this.isLoading = true

      try {
        console.log('开始获取订单历史...')
        const response = await apiService.getOrderHistory(page, perPage)
        console.log('订单历史API响应:', response)
        
        // 适配后端实际返回的格式
        if (response && response.data && response.data.orders) {
          // 标准格式：{ data: { orders: [...] } }
          this.orders = response.data.orders
          console.log(`成功获取 ${this.orders.length} 个订单`)
        } else if (response && response.success && response.data.orders) {
          // 文档格式：{ success: true, data: { orders: [...] } }
          this.orders = response.data.orders
          console.log(`标准格式：获取 ${this.orders.length} 个订单`)
        } else if (Array.isArray(response)) {
          // 直接数组格式：[...]
          this.orders = response
          console.log(`直接数组：获取 ${this.orders.length} 个订单`)
        } else {
          console.warn('订单历史API响应格式未知:', response)
          this.orders = []
        }
      } catch (error) {
        console.error('获取订单历史失败:', error)
        console.error('订单历史错误详情:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        ElMessage.error('获取订单历史失败')
      } finally {
        this.isLoading = false
      }
    },

    // 处理购买流程
    async handlePurchase(planId, paymentMethod) {
      try {
        // 1. 创建订单
        const order = await this.createOrder(planId)
        
        // 2. 发起支付
        await this.initiatePayment(order.order_no, paymentMethod)
        
        return true
      } catch (error) {
        console.error('购买流程失败:', error)
        return false
      }
    },

    // 格式化价格
    formatPrice(price) {
      return `¥${price.toFixed(2)}`
    },

    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '永久'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN')
    },

    // 清理状态
    clearState() {
      this.stopPaymentPolling()
      this.currentOrder = null
      this.paymentStatus = null
      this.error = null
    }
  }
}) 