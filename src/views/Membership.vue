<template>
  <div class="membership-container">
    <!-- 会员状态卡片 -->
    <div class="membership-status">
      <div class="status-card">
        <div class="status-info">
          <div class="user-avatar">
            <el-avatar :size="60" :src="authStore.user?.avatar_url">
              {{ authStore.nickname.charAt(0) }}
            </el-avatar>
          </div>
          <div class="user-details">
            <h3>{{ authStore.nickname }}</h3>
            <div class="membership-badge">
              <el-tag
                :type="membershipStore.isVip ? 'warning' : 'info'"
                size="large"
                effect="dark"
              >
                {{ membershipStore.isVip ? 'VIP会员' : '免费用户' }}
              </el-tag>
            </div>
            <p v-if="membershipStore.isVip" class="expire-info">
              到期时间: {{ membershipStore.formatDate(membershipStore.vipExpiresAt) }}
              (剩余{{ membershipStore.vipDaysRemaining }}天)
            </p>
          </div>
        </div>
        
        <!-- 配额信息 -->
        <div v-if="userDataStore.quotaInfo" class="quota-info">
          <h4>今日配额使用情况</h4>
          <div class="quota-grid">
            <div
              v-for="(quota, key) in userDataStore.quotaUsage"
              :key="key"
              class="quota-item"
            >
              <div class="quota-label">{{ getQuotaLabel(key) }}</div>
              <el-progress
                :percentage="getQuotaPercentage(quota)"
                :color="getQuotaColor(quota)"
                :stroke-width="8"
              />
              <div class="quota-text">
                {{ quota.used }}/{{ quota.limit === 999 ? '∞' : quota.limit }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 会员套餐 -->
    <div class="membership-plans">
      <h2>升级VIP，解锁全部功能</h2>
      <div class="plans-grid">
        <div
          v-for="plan in membershipStore.sortedPlans"
          :key="plan.id"
          class="plan-card"
          :class="{ popular: plan.is_popular }"
        >
          <div v-if="plan.is_popular" class="popular-badge">推荐</div>
          
          <div class="plan-header">
            <h3>{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="current-price">¥{{ plan.current_price }}</span>
              <span v-if="plan.original_price !== plan.current_price" class="original-price">
                ¥{{ plan.original_price }}
              </span>
            </div>
            <div v-if="plan.discount_text" class="discount-text">
              {{ plan.discount_text }}
            </div>
          </div>
          
          <div class="plan-features">
            <ul>
              <li v-for="feature in plan.features" :key="feature">
                <el-icon><Check /></el-icon>
                {{ feature }}
              </li>
            </ul>
          </div>
          
          <div class="plan-actions">
            <el-button
              v-if="!membershipStore.isVip"
              type="primary"
              size="large"
              class="purchase-button"
              @click="showPaymentDialog(plan)"
            >
              立即购买
            </el-button>
            <el-button
              v-else
              disabled
              size="large"
              class="purchase-button"
            >
              已是VIP
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 订单历史 -->
    <div class="order-history">
      <h2>订单历史</h2>
      <el-table
        v-loading="membershipStore.isLoading"
        :data="membershipStore.orders"
        style="width: 100%"
      >
        <el-table-column prop="order_no" label="订单号" width="200" />
        <el-table-column prop="plan_name" label="套餐名称" />
        <el-table-column prop="amount" label="金额">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="getOrderStatusType(row.status)">
              {{ getOrderStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      
      <div v-if="membershipStore.orders.length === 0" class="empty-orders">
        <el-empty description="暂无订单记录" />
      </div>
    </div>

    <!-- 支付对话框 -->
    <el-dialog
      v-model="paymentDialogVisible"
      title="选择支付方式"
      width="400px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedPlan" class="payment-info">
        <div class="order-summary">
          <h4>订单信息</h4>
          <div class="summary-item">
            <span>套餐名称:</span>
            <span>{{ selectedPlan.name }}</span>
          </div>
          <div class="summary-item">
            <span>有效期:</span>
            <span>{{ selectedPlan.duration_days }}天</span>
          </div>
          <div class="summary-item total">
            <span>支付金额:</span>
            <span class="amount">¥{{ selectedPlan.current_price }}</span>
          </div>
        </div>
        
        <div class="payment-methods">
          <h4>支付方式</h4>
          <div class="method-buttons">
            <el-button
              type="primary"
              size="large"
              class="payment-method-btn"
              @click="handlePayment('alipay')"
            >
              支付宝支付
            </el-button>
            <el-button
              type="success"
              size="large"
              class="payment-method-btn"
              @click="handlePayment('wechat')"
            >
              微信支付
            </el-button>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/authStore'
import { useMembershipStore } from '@/stores/membershipStore'
import { useUserDataStore } from '@/stores/userDataStore'

export default {
  name: 'MembershipCenter',
  components: {
    Check
  },
  setup() {
    const authStore = useAuthStore()
    const membershipStore = useMembershipStore()
    const userDataStore = useUserDataStore()
    
    // 响应式数据
    const paymentDialogVisible = ref(false)
    const selectedPlan = ref(null)
    
    // 方法
    const showPaymentDialog = (plan) => {
      selectedPlan.value = plan
      paymentDialogVisible.value = true
    }
    
    const handlePayment = async (paymentMethod) => {
      if (!selectedPlan.value) return
      
      try {
        const success = await membershipStore.handlePurchase(
          selectedPlan.value.id,
          paymentMethod
        )
        
        if (success) {
          paymentDialogVisible.value = false
          ElMessage.success('支付流程已启动，请完成支付')
        }
      } catch (error) {
        console.error('支付失败:', error)
      }
    }
    
    const getQuotaLabel = (key) => {
      const labels = {
        learning_sessions: '学习会话',
        ai_questions: 'AI问题',
        story_generations: '故事生成',
        personal_words: '个人单词'
      }
      return labels[key] || key
    }
    
    const getQuotaPercentage = (quota) => {
      if (quota.limit === 999) return 0 // 无限制
      return Math.round((quota.used / quota.limit) * 100)
    }
    
    const getQuotaColor = (quota) => {
      const percentage = getQuotaPercentage(quota)
      if (percentage >= 90) return '#f56c6c'
      if (percentage >= 70) return '#e6a23c'
      return '#67c23a'
    }
    
    const getOrderStatusType = (status) => {
      const types = {
        pending: 'warning',
        success: 'success',
        failed: 'danger',
        expired: 'info'
      }
      return types[status] || 'info'
    }
    
    const getOrderStatusText = (status) => {
      const texts = {
        pending: '待支付',
        success: '已支付',
        failed: '支付失败',
        expired: '已过期'
      }
      return texts[status] || status
    }
    
    const formatDateTime = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }
    
    // 组件挂载时加载数据
    onMounted(async () => {
      console.log('📄 会员页面加载，当前认证状态:', authStore.isAuthenticated)
      
      if (!authStore.isAuthenticated) {
        console.log('❌ 用户未登录，跳转到登录页面')
        ElMessage.warning('请先登录')
        return
      }

      console.log('🔄 开始加载会员相关数据...')
      
      // 串行加载关键数据，并行加载非关键数据
      try {
        // 首先加载会员套餐（核心功能）
        await membershipStore.fetchMembershipPlans()
        console.log('✅ 会员套餐加载完成')
        
        // 并行加载其他数据
        const additionalDataPromises = [
          membershipStore.fetchMembershipStatus(),
          membershipStore.fetchOrderHistory(),
          userDataStore.checkUserQuota()
        ]
        
        const results = await Promise.allSettled(additionalDataPromises)
        
        results.forEach((result, index) => {
          const labels = ['会员状态', '订单历史', '用户配额']
          if (result.status === 'fulfilled') {
            console.log(`✅ ${labels[index]}加载完成`)
          } else {
            console.warn(`⚠️ ${labels[index]}加载失败:`, result.reason?.message)
          }
        })
        
        console.log('🎉 会员页面数据加载完成')
      } catch (error) {
        console.error('❌ 加载会员套餐失败:', error)
        ElMessage.error('加载页面数据失败，请刷新重试')
      }
    })
    
    return {
      authStore,
      membershipStore,
      userDataStore,
      paymentDialogVisible,
      selectedPlan,
      showPaymentDialog,
      handlePayment,
      getQuotaLabel,
      getQuotaPercentage,
      getQuotaColor,
      getOrderStatusType,
      getOrderStatusText,
      formatDateTime
    }
  }
}
</script>

<style scoped>
.membership-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 会员状态卡片 */
.membership-status {
  margin-bottom: 30px;
}

.status-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 30px;
  color: white;
}

.status-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.user-avatar {
  margin-right: 20px;
}

.user-details h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 600;
}

.membership-badge {
  margin-bottom: 8px;
}

.expire-info {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.quota-info h4 {
  margin: 0 0 15px 0;
  font-size: 18px;
}

.quota-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.quota-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
}

.quota-label {
  font-size: 14px;
  margin-bottom: 8px;
  opacity: 0.9;
}

.quota-text {
  font-size: 12px;
  text-align: center;
  margin-top: 5px;
  opacity: 0.8;
}

/* 会员套餐 */
.membership-plans {
  margin-bottom: 40px;
}

.membership-plans h2 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  color: #333;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.plan-card {
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.plan-card:hover {
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.1);
}

.plan-card.popular {
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
}

.popular-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #409eff;
  color: white;
  padding: 5px 15px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
}

.plan-header h3 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #333;
}

.plan-price {
  margin-bottom: 10px;
}

.current-price {
  font-size: 36px;
  font-weight: 700;
  color: #409eff;
}

.original-price {
  font-size: 18px;
  color: #999;
  text-decoration: line-through;
  margin-left: 10px;
}

.discount-text {
  color: #e6a23c;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
}

.plan-features ul {
  list-style: none;
  padding: 0;
  margin: 20px 0;
}

.plan-features li {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 10px;
  color: #666;
}

.plan-features li .el-icon {
  color: #67c23a;
  margin-right: 8px;
}

.plan-actions {
  margin-top: auto;
  padding-top: 20px;
}

.purchase-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

/* 订单历史 */
.order-history h2 {
  margin-bottom: 20px;
  font-size: 24px;
  color: #333;
}

.empty-orders {
  text-align: center;
  padding: 40px;
}

/* 支付对话框 */
.payment-info {
  padding: 10px 0;
}

.order-summary {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.order-summary h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #666;
}

.summary-item.total {
  border-top: 1px solid #ddd;
  padding-top: 8px;
  margin-top: 15px;
  font-weight: 600;
  color: #333;
}

.summary-item .amount {
  color: #409eff;
  font-size: 18px;
  font-weight: 700;
}

.payment-methods h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.method-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.payment-method-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .membership-container {
    padding: 15px;
  }
  
  .status-info {
    flex-direction: column;
    text-align: center;
  }
  
  .user-avatar {
    margin-right: 0;
    margin-bottom: 15px;
  }
  
  .quota-grid {
    grid-template-columns: 1fr;
  }
  
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .method-buttons {
    gap: 15px;
  }
}
</style> 