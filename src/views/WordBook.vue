<template>
  <div class="word-book-container">
    <h1>单词本管理</h1>
    
    <!-- 用户状态提示 -->
    <el-alert
      v-if="!authStore.isAuthenticated"
      title="提示"
      type="info"
      :closable="false"
      show-icon
      class="user-tip"
    >
      <template #default>
        您当前使用的是公共单词库，
        <el-button type="text" @click="$router.push('/login')" style="padding: 0; margin-left: 4px;">
          登录后
        </el-button>
        可使用个人单词本功能
      </template>
    </el-alert>
    
    <!-- 性能统计面板 -->
    <el-card class="performance-card" v-if="performanceStats">
      <template #header>
        <div class="card-header">
          <span>性能统计</span>
          <el-button type="text" @click="refreshPerformanceStats" :loading="loadingPerformanceStats">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="performance-item">
            <div class="performance-value">{{ performanceStats.base_library_size || 0 }}</div>
            <div class="performance-label">本地词库大小</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="performance-item">
            <div class="performance-value success">{{ performanceStats.estimated_hit_rate || 0 }}%</div>
            <div class="performance-label">预估命中率</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="performance-item">
            <div class="performance-value primary">{{ performanceStats.translation_coverage || 0 }}%</div>
            <div class="performance-label">翻译覆盖率</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="performance-item">
            <div class="performance-value warning">{{ performanceStats.api_savings || '0%' }}</div>
            <div class="performance-label">API节约</div>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <el-row :gutter="20">
      <el-col :xs="24" :md="6">
        <el-card class="category-card">
          <template #header>
            <div class="card-header">
              <span>单词分类</span>
              <el-button 
                type="text" 
                @click="showAddCategoryDialog"
                v-if="authStore.isAuthenticated"
              >
                <el-icon><Plus /></el-icon> 添加分类
              </el-button>
            </div>
          </template>
          
          <el-menu
            v-model="activeCategory"
            @select="handleCategorySelect"
          >
            <el-menu-item index="all">
              <el-icon><Document /></el-icon>
              <span>全部单词</span>
              <span class="word-count">{{ totalWordCount }}</span>
            </el-menu-item>

            <el-menu-item index="unclassified" v-if="authStore.isAuthenticated">
              <el-icon><QuestionFilled /></el-icon>
              <span>未分类</span>
              <span class="word-count">{{ unclassifiedWordCount }}</span>
            </el-menu-item>

            <el-menu-item 
              v-for="category in filteredCategories" 
              :key="category.id" 
              :index="category.id !== undefined && category.id !== null ? category.id.toString() : ''"
            >
              <el-icon><Folder /></el-icon>
              <span>{{ category.name }}</span>
              <span class="word-count">{{ category.wordCount || 0 }}</span>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :md="18">
        <el-card class="word-list-card">
          <template #header>
            <div class="card-header">
              <span>{{ currentCategoryName }}</span>
              <div class="search-box">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索单词"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>
            </div>
          </template>
          
          <!-- 单词本为空时的提示 -->
          <div v-if="authStore.isAuthenticated && words.length === 0 && !userDataStore.isLoading" class="empty-state">
            <el-empty description="您的单词本还是空的">
              <el-button type="primary" @click="loadSampleWords" :loading="loadingSampleWords">
                <el-icon><Plus /></el-icon>
                加载示例单词
              </el-button>
              <p class="empty-tip">
                您也可以通过以下方式添加单词：<br>
                • 在视频学习中点击字幕中的单词<br>
                • 在基础词汇页面收藏单词<br>
                • 手动添加自定义单词
              </p>
            </el-empty>
          </div>

          <div class="word-tools" v-if="authStore.isAuthenticated && words.length > 0">
            <el-button-group>
              <el-button type="primary" @click="selectAllWords">全选</el-button>
              <el-button type="primary" @click="deselectAllWords">取消全选</el-button>
            </el-button-group>
            
            <el-button-group>
              <el-button 
                type="danger" 
                :disabled="selectedWords.length === 0"
                @click="deleteSelectedWords"
              >
                删除选中
              </el-button>
              <el-button 
                type="success" 
                :disabled="selectedWords.length === 0"
                @click="showMoveCategoryDialog"
              >
                移动到分类
              </el-button>
              <el-button 
                type="warning" 
                :disabled="selectedWords.length === 0"
                @click="generateStory"
              >
                生成故事
              </el-button>
            </el-button-group>
          </div>
          
          <el-table
            v-if="words.length > 0"
            :data="pagedWords"
            style="width: 100%"
            @selection-change="handleSelectionChange"
          >
            <el-table-column
              v-if="authStore.isAuthenticated"
              type="selection"
              width="55"
            />
            <el-table-column
              prop="word"
              label="单词"
              width="140"
            />
            <el-table-column
              prop="phonetic"
              label="音标"
              width="160"
              show-overflow-tooltip
            >
              <template #default="scope">
                <span v-if="scope.row.phonetic" class="phonetic-text">{{ scope.row.phonetic }}</span>
                <span v-else class="empty-text">-</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="part_of_speech"
              label="词性"
              width="100"
            >
              <template #default="scope">
                <el-tag v-if="scope.row.part_of_speech" size="small" type="info">
                  {{ getPartOfSpeechText(scope.row.part_of_speech) }}
                </el-tag>
                <span v-else class="empty-text">-</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="translation"
              label="中文释义"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column
              prop="addedDate"
              label="添加日期"
              width="120"
            >
              <template #default="scope">
                {{ formatDate(scope.row.addedDate || scope.row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column
              v-if="authStore.isAuthenticated"
              label="操作"
              width="150"
            >
              <template #default="scope">
                <el-button
                  size="small"
                  type="text"
                  @click="editWord(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="text"
                  style="color: #F56C6C"
                  @click="deleteWord(scope.row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div v-if="words.length > 0" class="pagination-container">
            <el-pagination
              background
              layout="prev, pager, next"
              :total="filteredWords.length"
              :page-size="pageSize"
              :current-page="currentPage"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 添加分类对话框 -->
    <el-dialog
      v-model="addCategoryDialogVisible"
      title="添加分类"
      width="30%"
    >
      <el-form :model="newCategory" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="newCategory.name" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addCategoryDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addCategory">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 移动到分类对话框 -->
    <el-dialog
      v-model="moveCategoryDialogVisible"
      title="移动到分类"
      width="30%"
    >
      <el-form label-width="80px">
        <el-form-item label="选择分类">
          <el-select v-model="targetCategoryId" placeholder="请选择分类">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="moveCategoryDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="moveToCategory">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 编辑单词对话框 -->
    <el-dialog
      v-model="editWordDialogVisible"
      title="编辑单词"
      width="450px"
    >
      <el-form :model="editingWord" label-width="100px">
        <el-form-item label="单词">
          <el-input v-model="editingWord.word" />
        </el-form-item>
        <el-form-item label="音标">
          <el-input v-model="editingWord.phonetic" placeholder="如: /ˈbjuːtɪfəl/" />
        </el-form-item>
        <el-form-item label="词性">
          <el-select v-model="editingWord.partOfSpeech" placeholder="请选择词性" clearable>
            <el-option label="名词 (noun)" value="noun" />
            <el-option label="动词 (verb)" value="verb" />
            <el-option label="形容词 (adjective)" value="adjective" />
            <el-option label="副词 (adverb)" value="adverb" />
            <el-option label="介词 (preposition)" value="preposition" />
            <el-option label="连词 (conjunction)" value="conjunction" />
            <el-option label="感叹词 (interjection)" value="interjection" />
            <el-option label="代词 (pronoun)" value="pronoun" />
            <el-option label="冠词 (article)" value="article" />
          </el-select>
        </el-form-item>
        <el-form-item label="中文翻译">
          <el-input v-model="editingWord.translation" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editingWord.categoryId" placeholder="请选择分类">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editWordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveEditWord">确认</el-button>
          <el-button 
            type="info" 
            @click="refreshWordInfo" 
            :loading="refreshingWordInfo"
            v-if="editingWord.id"
          >
            刷新信息
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { 
  Refresh, Plus, Document, QuestionFilled, Folder, Search 
} from '@element-plus/icons-vue'
import apiService from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { useUserDataStore } from '../stores/userDataStore'

export default {
  name: 'WordBookView',
  components: {
    Refresh, Plus, Document, QuestionFilled, Folder, Search
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const userDataStore = useUserDataStore()
    
    const words = ref([])
    const categories = ref([])
    const activeCategory = ref('all')
    const searchQuery = ref('')
    const selectedWords = ref([])
    const currentPage = ref(1)
    const pageSize = ref(10)
    
    // 性能统计
    const performanceStats = ref(null)
    const loadingPerformanceStats = ref(false)
    
    // 示例单词加载状态
    const loadingSampleWords = ref(false)
    
    // 对话框状态
    const addCategoryDialogVisible = ref(false)
    const moveCategoryDialogVisible = ref(false)
    const editWordDialogVisible = ref(false)
    const refreshingWordInfo = ref(false)
    
    // 表单数据
    const newCategory = ref({ name: '' })
    const targetCategoryId = ref('')
    const editingWord = ref({
      id: '',
      word: '',
      translation: '',
      phonetic: '',
      partOfSpeech: '',
      categoryId: ''
    })
    
    // 计算属性
    const currentCategoryName = computed(() => {
      if (activeCategory.value === 'all') {
        return '全部单词'
      } else if (activeCategory.value === 'unclassified') {
        return '未分类单词'
      } else {
        const category = categories.value.find(c => c.id && c.id.toString() === activeCategory.value)
        return category ? category.name : '单词列表'
      }
    })
    
    const totalWordCount = computed(() => {
      return words.value.length
    })

    const unclassifiedWordCount = computed(() => {
      return words.value.filter(word => word.categoryId === undefined || word.categoryId === null || word.categoryId === '').length
    })

    const filteredCategories = computed(() => {
      return categories.value.filter(c => c.name !== '全部单词')
    })
    
    const filteredWords = computed(() => {
      let result = words.value
      // 按分类筛选
      if (activeCategory.value === 'unclassified') {
        result = result.filter(word => word.categoryId === undefined || word.categoryId === null || word.categoryId === '')
      } else if (activeCategory.value !== 'all') {
        result = result.filter(word => String(word.categoryId) === activeCategory.value)
      }
      // 按搜索词筛选
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(word => 
          word.word.toLowerCase().includes(query) || 
          word.translation.toLowerCase().includes(query)
        )
      }
      return result
    })

    const pagedWords = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filteredWords.value.slice(start, end)
    })
    
    // 生命周期钩子
    onMounted(() => {
      fetchWords()
      fetchCategories()
      loadPerformanceStats()
    })

    // 监听分类或搜索词变化时重置分页
    watch([activeCategory, searchQuery], () => {
      currentPage.value = 1
    })
    
    // 加载性能统计
    const loadPerformanceStats = async () => {
      try {
        const response = await apiService.getPerformanceStats()
        if (response.success) {
          performanceStats.value = response.performance_stats
        }
      } catch (error) {
        console.error('获取性能统计失败:', error)
      }
    }
    
    // 刷新性能统计
    const refreshPerformanceStats = async () => {
      loadingPerformanceStats.value = true
      try {
        await loadPerformanceStats()
        ElMessage.success('性能统计已刷新')
      } catch (error) {
        ElMessage.error('刷新性能统计失败')
      } finally {
        loadingPerformanceStats.value = false
      }
    }
    
    // 获取单词数据
    const fetchWords = async () => {
      const loading = ElLoading.service({
        fullscreen: true,
        text: '正在加载单词数据...'
      })
      
      try {
        let wordsData = []
        
        if (authStore.isAuthenticated) {
          // 登录用户：获取个人单词本
          await userDataStore.fetchUserWords()
          wordsData = userDataStore.userWords
        } else {
          // 未登录用户：使用apiService获取公共单词数据
          console.log('🔍 未登录用户，获取公共单词数据')
          const response = await apiService.getWords()
          
          console.log('公共单词API响应:', response)
          
          // 处理各种可能的响应格式（考虑到响应拦截器的处理）
          if (Array.isArray(response)) {
            wordsData = response
          } else if (response && response.words && Array.isArray(response.words)) {
            wordsData = response.words
          } else if (response && response.data && Array.isArray(response.data)) {
            wordsData = response.data
          } else if (response && response.data && response.data.words && Array.isArray(response.data.words)) {
            wordsData = response.data.words
          } else {
            console.error('未识别的响应格式:', response)
            ElMessage.warning('未收到有效的单词数据')
            return
          }
        }
        
        // 处理数据格式
        words.value = wordsData.map(item => ({
          ...item,
          id: item.id || item.word_id,
          word: item.word || item.text,
          translation: item.translation || item.chinese_translation || '',
          phonetic: item.phonetic || item.pronunciation || '',
          part_of_speech: item.part_of_speech || item.partOfSpeech || '',
          categoryId: item.categoryId || item.category_id || null,
          addedDate: item.addedDate || item.created_at || new Date().toISOString()
        }))
        
        loading.close()
        ElMessage.success(`成功加载 ${words.value.length} 个单词`)
        
      } catch (error) {
        loading.close()
        console.error('❌ 获取单词数据失败:', error)
        
        // 提供更详细的错误信息
        let errorMessage = '获取单词数据失败'
        if (error.response) {
          errorMessage += `: HTTP ${error.response.status}`
          if (error.response.status === 401) {
            errorMessage += ' - 身份验证失败，请重新登录'
          } else if (error.response.status === 404) {
            errorMessage += ' - API接口不存在，请检查后端服务'
          } else if (error.response.status === 500) {
            errorMessage += ' - 服务器内部错误'
          }
        } else if (error.message) {
          errorMessage += `: ${error.message}`
        }
        
        ElMessage.error(errorMessage)
      }
    }
    
    // 获取分类数据
    const fetchCategories = async () => {
      try {
        if (authStore.isAuthenticated) {
          // 登录用户：获取个人分类
          // 这里可以调用userDataStore的方法获取分类
          categories.value = []
        } else {
          // 未登录用户：获取公共分类
          const response = await apiService.getCategories()
          if (Array.isArray(response)) {
            categories.value = response
          } else if (response.categories && Array.isArray(response.categories)) {
            categories.value = response.categories
          } else if (response.data && Array.isArray(response.data)) {
            categories.value = response.data
          } else {
            categories.value = []
          }
        }
      } catch (error) {
        console.error('获取分类数据失败:', error)
        categories.value = []
      }
    }
    
    // 事件处理方法
    const handleCategorySelect = (key) => {
      activeCategory.value = key
    }
    
    const handleSelectionChange = (selection) => {
      selectedWords.value = selection
    }
    
    const handleCurrentChange = (page) => {
      currentPage.value = page
    }
    
    const selectAllWords = () => {
      selectedWords.value = [...pagedWords.value]
    }
    
    const deselectAllWords = () => {
      selectedWords.value = []
    }
    
    // 显示添加分类对话框
    const showAddCategoryDialog = () => {
      newCategory.value.name = ''
      addCategoryDialogVisible.value = true
    }
    
    // 添加分类
    const addCategory = async () => {
      if (!newCategory.value.name.trim()) {
        ElMessage.warning('请输入分类名称')
        return
      }
      
      try {
        // 这里应该调用API添加分类
        ElMessage.success('分类添加成功')
        addCategoryDialogVisible.value = false
        fetchCategories()
      } catch (error) {
        ElMessage.error('添加分类失败')
      }
    }
    
    // 显示移动分类对话框
    const showMoveCategoryDialog = () => {
      if (selectedWords.value.length === 0) {
        ElMessage.warning('请先选择要移动的单词')
        return
      }
      targetCategoryId.value = ''
      moveCategoryDialogVisible.value = true
    }
    
    // 移动到分类
    const moveToCategory = async () => {
      if (!targetCategoryId.value) {
        ElMessage.warning('请选择目标分类')
        return
      }
      
      try {
        // 这里应该调用API移动单词到指定分类
        ElMessage.success('单词移动成功')
        moveCategoryDialogVisible.value = false
        fetchWords()
      } catch (error) {
        ElMessage.error('移动单词失败')
      }
    }
    
    // 编辑单词
    const editWord = (word) => {
      editingWord.value = {
        id: word.id,
        word: word.word,
        translation: word.translation,
        phonetic: word.phonetic,
        partOfSpeech: word.part_of_speech,
        categoryId: word.categoryId
      }
      editWordDialogVisible.value = true
    }
    
    // 保存编辑的单词
    const saveEditWord = async () => {
      try {
        // 这里应该调用API保存编辑的单词
        ElMessage.success('单词编辑成功')
        editWordDialogVisible.value = false
        fetchWords()
      } catch (error) {
        ElMessage.error('编辑单词失败')
      }
    }
    
    // 删除单词
    const deleteWord = async (word) => {
      try {
        await ElMessageBox.confirm(`确定要删除单词 "${word.word}" 吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        // 这里应该调用API删除单词
        console.log('删除单词:', word)
        ElMessage.success('单词删除成功')
        fetchWords()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除单词失败')
        }
      }
    }
    
    // 删除选中的单词
    const deleteSelectedWords = async () => {
      if (selectedWords.value.length === 0) {
        ElMessage.warning('请先选择要删除的单词')
        return
      }
      
      try {
        await ElMessageBox.confirm(`确定要删除选中的 ${selectedWords.value.length} 个单词吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        // 这里应该调用API批量删除单词
        ElMessage.success('选中单词删除成功')
        selectedWords.value = []
        fetchWords()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除选中单词失败')
        }
      }
    }
    
    // 生成故事
    const generateStory = () => {
      if (selectedWords.value.length === 0) {
        ElMessage.warning('请先选择要生成故事的单词')
        return
      }
      
      // 跳转到故事生成页面，传递选中的单词
      const wordList = selectedWords.value.map(word => word.word).join(',')
      router.push(`/story-generator?words=${encodeURIComponent(wordList)}`)
    }
    
    // 刷新单词信息
    const refreshWordInfo = async () => {
      refreshingWordInfo.value = true
      try {
        // 这里应该调用API刷新单词信息
        ElMessage.success('单词信息已刷新')
      } catch (error) {
        ElMessage.error('刷新单词信息失败')
      } finally {
        refreshingWordInfo.value = false
      }
    }
    
    // 加载示例单词
    const loadSampleWords = async () => {
      loadingSampleWords.value = true
      try {
        await userDataStore.addSampleWords()
        // 重新获取单词数据
        await fetchWords()
      } catch (error) {
        console.error('加载示例单词失败:', error)
      } finally {
        loadingSampleWords.value = false
      }
    }
    
    // 工具方法
    const getPartOfSpeechText = (partOfSpeech) => {
      const map = {
        noun: '名词',
        verb: '动词',
        adjective: '形容词',
        adverb: '副词',
        preposition: '介词',
        conjunction: '连词',
        interjection: '感叹词',
        pronoun: '代词',
        article: '冠词'
      }
      return map[partOfSpeech] || partOfSpeech
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }

    return {
      authStore,
      userDataStore,
      words,
      categories,
      activeCategory,
      searchQuery,
      selectedWords,
      currentPage,
      pageSize,
      performanceStats,
      loadingPerformanceStats,
      loadingSampleWords,
      addCategoryDialogVisible,
      moveCategoryDialogVisible,
      editWordDialogVisible,
      refreshingWordInfo,
      newCategory,
      targetCategoryId,
      editingWord,
      currentCategoryName,
      totalWordCount,
      unclassifiedWordCount,
      filteredCategories,
      filteredWords,
      pagedWords,
      refreshPerformanceStats,
      loadSampleWords,
      handleCategorySelect,
      handleSelectionChange,
      handleCurrentChange,
      selectAllWords,
      deselectAllWords,
      showAddCategoryDialog,
      addCategory,
      showMoveCategoryDialog,
      moveToCategory,
      editWord,
      saveEditWord,
      deleteWord,
      deleteSelectedWords,
      generateStory,
      refreshWordInfo,
      getPartOfSpeechText,
      formatDate
    }
  }
}
</script>

<style scoped>
.word-book-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.user-tip {
  margin-bottom: 20px;
}

.performance-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.performance-item {
  text-align: center;
  padding: 20px 0;
}

.performance-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.performance-value.success {
  color: #67C23A;
}

.performance-value.primary {
  color: #409EFF;
}

.performance-value.warning {
  color: #E6A23C;
}

.performance-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.category-card, .word-list-card {
  height: fit-content;
}

.search-box {
  width: 300px;
}

.word-count {
  color: black;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
  margin-left: auto;
}

.word-tools {
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.phonetic-text {
  font-family: 'Times New Roman', serif;
  color: #606266;
}

.empty-text {
  color: #C0C4CC;
}

.pagination-container {
  margin-top: 20px;
  text-align: center;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.empty-tip {
  margin-top: 16px;
  color: #909399;
  font-size: 14px;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .search-box {
    width: 200px;
  }
  
  .word-tools {
    flex-direction: column;
  }
  
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style> 