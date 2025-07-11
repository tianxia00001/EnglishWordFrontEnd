<template>
  <div class="permission-test-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>用户权限测试页面</h1>
      <p>学习不同用户类型的权限控制</p>
    </div>

    <!-- 当前用户状态 -->
    <el-card class="status-card">
      <template #header>
        <span>当前用户状态</span>
      </template>
      
      <div class="status-info">
        <p>登录状态: 
          <el-tag :type="authStore.isAuthenticated ? 'success' : 'danger'">
            {{ authStore.isAuthenticated ? '已登录' : '未登录' }}
          </el-tag>
        </p>
        
        <p v-if="authStore.isAuthenticated">
          用户类型: 
          <el-tag :type="authStore.isVip ? 'warning' : 'success'">
            {{ authStore.isVip ? 'VIP用户' : '免费用户' }}
          </el-tag>
        </p>
      </div>
    </el-card>

    <!-- 权限测试区域 -->
    <div class="test-sections">
      
      <!-- 匿名用户区域 -->
      <el-card class="test-card">
        <template #header>
          <span>匿名用户内容 (所有人可见)</span>
        </template>
        <div class="content-box anonymous">
          <p>🌟 这是匿名用户可以看到的内容1</p>
          <el-button type="primary" size="small" @click="showMessage('匿名用户功能')">
            匿名功能
          </el-button>
        </div>
      </el-card>

      <!-- 免费用户区域 -->
      <el-card class="test-card">
        <template #header>
          <span>免费用户内容 (需要登录)</span>
        </template>
        <div v-if="authStore.isAuthenticated" class="content-box free-user">
          <p>🎉 这是免费用户可以看到的内容1</p>
          <p>您可以使用基础功能</p>
          <el-button type="success" size="small" @click="showMessage('免费用户功能')">
            免费功能
          </el-button>
        </div>
        <div v-else class="content-box locked">
          <p>🔒 需要登录才能查看</p>
          <el-button type="primary" size="small" @click="$router.push('/login')">
            去登录
          </el-button>
        </div>
      </el-card>

      <!-- VIP用户区域 -->
      <el-card class="test-card">
        <template #header>
          <span>VIP用户内容 (需要VIP)</span>
        </template>
        <div v-if="authStore.isAuthenticated && authStore.isVip" class="content-box vip-user">
          <p>👑 这是VIP用户专享内容1</p>
          <p>您拥有所有功能的无限制访问</p>
          <el-button type="warning" size="small" @click="showMessage('VIP专享功能')">
            VIP功能
          </el-button>
        </div>
        <div v-else-if="authStore.isAuthenticated" class="content-box locked">
          <p>🔒 需要VIP权限才能查看</p>
          <el-button type="warning" size="small" @click="$router.push('/membership')">
            升级VIP
          </el-button>
        </div>
        <div v-else class="content-box locked">
          <p>🔒 需要登录并升级VIP</p>
          <el-button type="primary" size="small" @click="$router.push('/login')">
            去登录
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 权限按钮测试 -->
    <el-card class="demo-card">
      <template #header>
        <span>权限按钮测试</span>
      </template>
      
      <div class="button-group">
        <el-button 
          type="primary" 
          @click="testFunction('基础功能')"
        >
          基础功能 (所有人)
        </el-button>
        
        <el-button 
          type="success" 
          @click="testFunction('用户功能')"
          :disabled="!authStore.isAuthenticated"
        >
          用户功能 (需登录)
        </el-button>
        
        <el-button 
          type="warning" 
          @click="testFunction('VIP功能')"
          :disabled="!authStore.isAuthenticated || !authStore.isVip"
        >
          VIP功能 (需VIP)
        </el-button>
      </div>
      
      <div v-if="testResult" class="test-result">
        <p><strong>测试结果:</strong> {{ testResult }}</p>
      </div>
    </el-card>


  </div>
</template>

<script>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'

export default {
  name: 'UserPermissionTest',
  setup() {
    const authStore = useAuthStore()
    const testResult = ref('')
    

    
    // 显示消息
    const showMessage = (type) => {
      ElMessage.success(`${type}演示成功！`)
    }
    
    // 测试功能
    const testFunction = (funcName) => {
      if (funcName === '基础功能') {
        testResult.value = '✓ 基础功能可以正常使用'
        ElMessage.success('基础功能测试成功')
      } else if (funcName === '用户功能') {
        if (authStore.isAuthenticated) {
          testResult.value = '✓ 用户功能可以正常使用'
          ElMessage.success('用户功能测试成功')
        } else {
          testResult.value = '✗ 需要登录才能使用'
          ElMessage.error('需要登录')
        }
      } else if (funcName === 'VIP功能') {
        if (authStore.isAuthenticated && authStore.isVip) {
          testResult.value = '✓ VIP功能可以正常使用'
          ElMessage.success('VIP功能测试成功')
        } else if (authStore.isAuthenticated) {
          testResult.value = '✗ 需要VIP权限'
          ElMessage.warning('需要VIP权限')
        } else {
          testResult.value = '✗ 需要登录并升级VIP'
          ElMessage.error('需要登录并升级VIP')
        }
      }
    }
    
    return {
      authStore,
      testResult,
      showMessage,
      testFunction
    }
  }
}
</script>

<style scoped>
.permission-test-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #303133;
  margin-bottom: 10px;
}

.status-card {
  margin-bottom: 30px;
}

.status-info p {
  margin: 10px 0;
  font-size: 16px;
}

.test-sections {
  margin-bottom: 30px;
}

.test-card {
  margin-bottom: 20px;
}

.content-box {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.content-box.anonymous {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 1px solid #2196f3;
}

.content-box.free-user {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  border: 1px solid #4caf50;
}

.content-box.vip-user {
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
  border: 1px solid #ff9800;
}

.content-box.locked {
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  border: 1px solid #9e9e9e;
  opacity: 0.8;
}

.content-box p {
  margin: 0 0 15px 0;
  font-size: 16px;
}

.demo-card {
  margin-bottom: 30px;
}

.button-group {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.test-result {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  text-align: center;
}



@media (max-width: 768px) {
  .permission-test-container {
    padding: 15px;
  }
  
  .button-group {
    flex-direction: column;
    align-items: center;
  }
  
  .button-group .el-button {
    width: 200px;
  }
}
</style>