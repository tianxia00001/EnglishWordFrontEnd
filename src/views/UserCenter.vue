<template>
  <div class="user-center">
    <div class="user-header">
      <div class="user-info">
        <el-avatar :size="80" :src="authStore.user?.avatar_url">
          {{ authStore.nickname.charAt(0) }}
        </el-avatar>
        <div class="info-content">
          <h2>{{ authStore.nickname }}</h2>
          <p>{{ authStore.user?.phone }}</p>
          <el-tag :type="authStore.isVip ? 'warning' : 'info'" effect="dark">
            {{ authStore.isVip ? 'VIP会员' : '免费用户' }}
          </el-tag>
        </div>
      </div>
      <div class="user-actions">
        <el-button type="primary" @click="editProfileVisible = true">
          编辑资料
        </el-button>
        <el-button @click="authStore.logout">
          退出登录
        </el-button>
      </div>
    </div>

    <!-- 学习统计 -->
    <div class="stats-section">
      <h3>学习统计</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ userDataStore.totalWordsCount }}</div>
          <div class="stat-label">收藏单词</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ userDataStore.learnedWordsCount }}</div>
          <div class="stat-label">已学会</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ userDataStore.learningProgress }}%</div>
          <div class="stat-label">学习进度</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ userDataStore.learningSessions.length }}</div>
          <div class="stat-label">学习会话</div>
        </div>
      </div>
    </div>

    <!-- 个人单词本 -->
    <div class="words-section">
      <div class="section-header">
        <h3>我的单词本</h3>
        <el-button type="primary" @click="addWordVisible = true">
          添加单词
        </el-button>
      </div>
      
      <!-- 搜索和筛选 -->
      <div class="search-filters">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索单词..."
          clearable
          class="search-input"
          @input="handleSearch"
        />
        
        <el-select
          v-model="filterStatus"
          placeholder="学习状态"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="学习中" :value="false" />
          <el-option label="已学会" :value="true" />
        </el-select>
      </div>

      <!-- 单词列表 -->
      <div class="words-list">
        <div
          v-for="word in filteredWords"
          :key="word.id"
          class="word-item"
          :class="{ learned: word.is_learned }"
        >
          <div class="word-content">
            <div class="word-text">{{ word.word_text }}</div>
            <div class="word-translation">{{ word.translation }}</div>
            <div v-if="word.phonetic" class="word-phonetic">{{ word.phonetic }}</div>
          </div>
          <div class="word-actions">
            <el-button
              :type="word.is_learned ? 'warning' : 'success'"
              size="small"
              @click="toggleWordStatus(word)"
            >
              {{ word.is_learned ? '标记为学习中' : '标记为已学会' }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteWord(word)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="userDataStore.pagination.words.pages > 1" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="20"
          :total="userDataStore.pagination.words.total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 编辑资料对话框 -->
    <el-dialog
      v-model="editProfileVisible"
      title="编辑个人资料"
      width="400px"
    >
      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-width="80px"
      >
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="profileForm.nickname" maxlength="20" />
        </el-form-item>
        <el-form-item label="头像" prop="avatar_url">
          <el-input v-model="profileForm.avatar_url" placeholder="头像URL（可选）" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="editProfileVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="authStore.isLoading"
          @click="updateProfile"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加单词对话框 -->
    <el-dialog
      v-model="addWordVisible"
      title="添加单词"
      width="400px"
    >
      <el-form
        ref="wordFormRef"
        :model="wordForm"
        :rules="wordRules"
        label-width="80px"
      >
        <el-form-item label="单词" prop="word_text">
          <el-input v-model="wordForm.word_text" placeholder="请输入英文单词" />
        </el-form-item>
        <el-form-item label="翻译" prop="translation">
          <el-input v-model="wordForm.translation" placeholder="中文翻译（可选，系统会自动获取）" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="addWordVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="userDataStore.isLoading"
          @click="addWord"
        >
          添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useUserDataStore } from '@/stores/userDataStore'

export default {
  name: 'UserCenter',
  setup() {
    const authStore = useAuthStore()
    const userDataStore = useUserDataStore()
    
    // 响应式数据
    const editProfileVisible = ref(false)
    const addWordVisible = ref(false)
    const searchKeyword = ref('')
    const filterStatus = ref('')
    const currentPage = ref(1)
    
    // 表单引用
    const profileFormRef = ref(null)
    const wordFormRef = ref(null)
    
    // 表单数据
    const profileForm = ref({
      nickname: '',
      avatar_url: ''
    })
    
    const wordForm = ref({
      word_text: '',
      translation: ''
    })
    
    // 表单验证规则
    const profileRules = {
      nickname: [
        { required: true, message: '请输入昵称', trigger: 'blur' },
        { max: 20, message: '昵称不能超过20个字符', trigger: 'blur' }
      ]
    }
    
    const wordRules = {
      word_text: [
        { required: true, message: '请输入单词', trigger: 'blur' },
        { pattern: /^[a-zA-Z\s'-]+$/, message: '请输入有效的英文单词', trigger: 'blur' }
      ]
    }
    
    // 计算属性
    const filteredWords = computed(() => {
      let words = userDataStore.userWords
      
      // 搜索过滤
      if (searchKeyword.value) {
        words = userDataStore.searchUserWords(searchKeyword.value)
      }
      
      // 状态过滤
      if (filterStatus.value !== '') {
        words = words.filter(word => word.is_learned === filterStatus.value)
      }
      
      return words
    })
    
    // 方法
    const handleSearch = () => {
      // 搜索逻辑已在计算属性中处理
    }
    
    const handleFilter = () => {
      // 筛选逻辑已在计算属性中处理
    }
    
    const handlePageChange = (page) => {
      currentPage.value = page
      userDataStore.fetchUserWords(page)
    }
    
    const toggleWordStatus = async (word) => {
      await userDataStore.updateWordStatus(word.id, !word.is_learned)
    }
    
    const deleteWord = async (word) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除单词 "${word.word_text}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        await userDataStore.deleteUserWord(word.id)
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除单词失败:', error)
        }
      }
    }
    
    const updateProfile = async () => {
      if (!profileFormRef.value) return
      
      try {
        const valid = await profileFormRef.value.validate()
        if (!valid) return
        
        const success = await authStore.updateUserInfo(profileForm.value)
        if (success) {
          editProfileVisible.value = false
        }
      } catch (error) {
        console.error('更新资料失败:', error)
      }
    }
    
    const addWord = async () => {
      if (!wordFormRef.value) return
      
      try {
        const valid = await wordFormRef.value.validate()
        if (!valid) return
        
        await userDataStore.addUserWord(
          wordForm.value.word_text,
          wordForm.value.translation || null
        )
        
        addWordVisible.value = false
        wordForm.value = { word_text: '', translation: '' }
        wordFormRef.value.resetFields()
      } catch (error) {
        console.error('添加单词失败:', error)
      }
    }
    
    // 生命周期
    onMounted(async () => {
      if (!authStore.isAuthenticated) {
        ElMessage.warning('请先登录')
        return
      }
      
      // 初始化表单数据
      profileForm.value = {
        nickname: authStore.user?.nickname || '',
        avatar_url: authStore.user?.avatar_url || ''
      }
      
      // 加载用户数据
      await Promise.all([
        userDataStore.fetchUserWords(),
        userDataStore.fetchUserStatistics(),
        userDataStore.fetchUserLearningSessions(),
        userDataStore.checkUserQuota()
      ])
    })
    
    return {
      authStore,
      userDataStore,
      editProfileVisible,
      addWordVisible,
      searchKeyword,
      filterStatus,
      currentPage,
      profileFormRef,
      wordFormRef,
      profileForm,
      wordForm,
      profileRules,
      wordRules,
      filteredWords,
      handleSearch,
      handleFilter,
      handlePageChange,
      toggleWordStatus,
      deleteWord,
      updateProfile,
      addWord
    }
  }
}
</script>

<style scoped>
.user-center {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 用户头部 */
.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
}

.info-content {
  margin-left: 20px;
}

.info-content h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.info-content p {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.user-actions {
  display: flex;
  gap: 10px;
}

/* 学习统计 */
.stats-section {
  margin-bottom: 30px;
}

.stats-section h3 {
  margin-bottom: 20px;
  font-size: 20px;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* 单词本部分 */
.words-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.search-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
}

.search-input {
  flex: 1;
  max-width: 300px;
}

/* 单词列表 */
.words-list {
  margin-bottom: 20px;
}

.word-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.word-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.word-item.learned {
  background: #f0f9ff;
  border-color: #67c23a;
}

.word-content {
  flex: 1;
}

.word-text {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.word-translation {
  color: #666;
  margin-bottom: 3px;
}

.word-phonetic {
  color: #999;
  font-size: 14px;
  font-style: italic;
}

.word-actions {
  display: flex;
  gap: 8px;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-center {
    padding: 15px;
  }
  
  .user-header {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .user-info {
    flex-direction: column;
  }
  
  .info-content {
    margin-left: 0;
    margin-top: 15px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .search-filters {
    flex-direction: column;
  }
  
  .search-input {
    max-width: none;
  }
  
  .word-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .word-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style> 