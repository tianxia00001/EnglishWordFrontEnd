<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>{{ isLogin ? '用户登录' : '用户注册' }}</h2>
        <p>{{ isLogin ? '欢迎回来，继续您的英语学习之旅' : '加入我们，开启个性化英语学习' }}</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleSubmit"
      >
        <!-- 手机号输入 -->
        <el-form-item prop="phone">
          <el-input
            v-model="loginForm.phone"
            placeholder="请输入手机号"
            size="large"
            :prefix-icon="Phone"
            maxlength="11"
            @input="onPhoneInput"
          />
        </el-form-item>

        <!-- 验证码输入 -->
        <el-form-item prop="verificationCode">
          <div class="verification-input">
            <el-input
              v-model="loginForm.verificationCode"
              placeholder="请输入验证码"
              size="large"
              :prefix-icon="Key"
              maxlength="6"
            />
            <el-button
              :disabled="!canSendCode || authStore.codeSending || authStore.codeCountdown > 0"
              :loading="authStore.codeSending"
              type="primary"
              size="large"
              class="code-button"
              @click="sendVerificationCode"
            >
              {{ getCodeButtonText }}
            </el-button>
          </div>
        </el-form-item>

        <!-- 昵称输入（仅注册时显示） -->
        <el-form-item v-if="!isLogin" prop="nickname">
          <el-input
            v-model="loginForm.nickname"
            placeholder="请输入昵称（可选）"
            size="large"
            :prefix-icon="User"
            maxlength="20"
          />
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button
            :loading="authStore.isLoading"
            type="primary"
            size="large"
            class="submit-button"
            @click="handleSubmit"
          >
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>

        <!-- 切换登录/注册 -->
        <div class="form-switch">
          <span>{{ isLogin ? '还没有账号？' : '已有账号？' }}</span>
          <el-button type="text" @click="toggleMode">
            {{ isLogin ? '立即注册' : '立即登录' }}
          </el-button>
        </div>
      </el-form>

      <!-- 服务条款 -->
      <div class="terms">
        <p>
          {{ isLogin ? '登录' : '注册' }}即表示您同意我们的
          <a href="#" @click.prevent>服务条款</a>
          和
          <a href="#" @click.prevent>隐私政策</a>
        </p>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="login-bg">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, Key, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/authStore'

export default {
  name: 'UserLogin',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    // 表单引用
    const loginFormRef = ref(null)
    
    // 登录模式（true: 登录, false: 注册）
    const isLogin = ref(true)
    
    // 表单数据
    const loginForm = ref({
      phone: '',
      verificationCode: '',
      nickname: ''
    })
    
    // 表单验证规则
    const loginRules = {
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      verificationCode: [
        { required: true, message: '请输入验证码', trigger: 'blur' },
        { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
      ],
      nickname: [
        { max: 20, message: '昵称不能超过20个字符', trigger: 'blur' }
      ]
    }
    
    // 计算属性
    const canSendCode = computed(() => {
      return /^1[3-9]\d{9}$/.test(loginForm.value.phone)
    })
    
    const getCodeButtonText = computed(() => {
      if (authStore.codeSending) return '发送中...'
      if (authStore.codeCountdown > 0) return `${authStore.codeCountdown}s`
      return '获取验证码'
    })
    
    // 方法
    const onPhoneInput = (value) => {
      // 只允许输入数字
      loginForm.value.phone = value.replace(/\D/g, '')
    }
    
    const sendVerificationCode = async () => {
      if (!canSendCode.value) {
        ElMessage.warning('请输入正确的手机号')
        return
      }
      
      await authStore.sendVerificationCode(loginForm.value.phone)
    }
    
    const handleSubmit = async () => {
      if (!loginFormRef.value) return
      
      try {
        const valid = await loginFormRef.value.validate()
        if (!valid) return
        
        let success = false
        
        if (isLogin.value) {
          // 登录
          success = await authStore.login(
            loginForm.value.phone,
            loginForm.value.verificationCode
          )
        } else {
          // 注册
          success = await authStore.register(
            loginForm.value.phone,
            loginForm.value.verificationCode,
            loginForm.value.nickname || null
          )
        }
        
        if (success) {
          // 登录/注册成功，跳转到首页
          router.push('/')
        }
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }
    
    const toggleMode = () => {
      isLogin.value = !isLogin.value
      // 清空表单
      loginForm.value = {
        phone: '',
        verificationCode: '',
        nickname: ''
      }
      // 清空验证错误
      if (loginFormRef.value) {
        loginFormRef.value.clearValidate()
      }
    }
    
    // 生命周期
    onMounted(() => {
      // 如果已经登录，直接跳转到首页
      if (authStore.isAuthenticated) {
        router.push('/')
      }
    })
    
    return {
      loginFormRef,
      isLogin,
      loginForm,
      loginRules,
      authStore,
      canSendCode,
      getCodeButtonText,
      onPhoneInput,
      sendVerificationCode,
      handleSubmit,
      toggleMode,
      Phone,
      Key,
      User
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  color: #333;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.login-header p {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.login-form {
  margin-bottom: 20px;
}

.verification-input {
  display: flex;
  gap: 10px;
}

.verification-input .el-input {
  flex: 1;
}

.code-button {
  width: 190px;
  flex-shrink: 0;
}

.submit-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.form-switch {
  text-align: center;
  margin-top: 20px;
}

.form-switch span {
  color: #666;
  font-size: 14px;
}

.form-switch .el-button {
  font-size: 14px;
  padding: 0;
  margin-left: 5px;
}

.terms {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.terms p {
  color: #999;
  font-size: 12px;
  line-height: 1.5;
}

.terms a {
  color: #409eff;
  text-decoration: none;
}

.terms a:hover {
  text-decoration: underline;
}

/* 背景装饰 */
.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 10%;
  animation-delay: 2s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-card {
    margin: 20px;
    padding: 30px 20px;
  }
  
  .login-header h2 {
    font-size: 24px;
  }
  
  .verification-input {
    flex-direction: column;
  }
  
  .code-button {
    width: 100%;
  }
}
</style> 