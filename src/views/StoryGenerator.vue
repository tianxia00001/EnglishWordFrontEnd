<template>
  <div class="story-generator-container">
    <h1>故事生成功能</h1>
    
    <!-- 用户状态提示 -->
    <el-alert
      v-if="!authStore.isAuthenticated"
      title="提示"
      type="info"
      :closable="false"
      show-icon
      class="user-tip"
      style="margin-bottom: 20px;"
    >
      <template #default>
        您当前使用的是公共单词库，
        <el-button type="text" @click="$router.push('/login')" style="padding: 0; margin-left: 4px;">
          登录后
        </el-button>
        可使用个人单词本功能
      </template>
    </el-alert>
    
    <el-card class="word-selection-card">
      <template #header>
        <div class="card-header">
          <span>选择单词</span>
          <el-button type="primary" @click="generateStory" :disabled="selectedWords.length === 0">
            生成故事
          </el-button>
        </div>
      </template>
      
      <div class="word-selection-info">
        <p v-if="authStore.isAuthenticated">
          从您的个人单词本中选择单词，系统将生成包含这些单词的故事，帮助您更好地记忆单词。
        </p>
        <p v-else>
          从公共单词库中选择单词，系统将生成包含这些单词的故事，帮助您更好地记忆单词。
        </p>
        <p>已选择 <span class="word-count">{{ selectedWords.length }}</span> 个单词</p>
      </div>
      
      <!-- 个人单词本为空时的提示 -->
      <div v-if="authStore.isAuthenticated && words.length === 0 && !userDataStore.isLoading" class="empty-state" style="margin-bottom: 20px;">
        <el-empty description="您的单词本还是空的">
          <p class="empty-tip">
            您可以通过以下方式添加单词：<br>
            • 在视频学习中点击字幕中的单词<br>
            • 在基础词汇页面收藏单词<br>
            • 在个人中心手动添加单词
          </p>
        </el-empty>
      </div>
      
      <div class="word-search">
        <el-input
          v-model="searchQuery"
          placeholder="搜索单词"
          prefix-icon="el-icon-search"
          clearable
        />
      </div>
      
      <div class="word-list">
        <el-checkbox-group v-model="selectedWordIds">
          <el-checkbox 
            v-for="word in filteredWords" 
            :key="word.id" 
            :label="word.id"
            class="word-item"
          >
            <span class="word-text">{{ getWordText(word) }}</span> - <span class="word-translation">{{ getWordTranslation(word) }}</span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </el-card>
    
    <el-card v-if="story" class="story-card">
      <!-- 生成的故事内容 -->
      <template #header>
        <div class="card-header">
          <span>生成的故事</span>
          <div class="story-controls">
            <el-switch
              v-model="showEnglishStory"
              active-text="显示英文"
            />
            <el-switch
              v-model="showChineseStory"
              active-text="显示中文"
            />
            <el-button type="primary" @click="saveStory">
              保存故事
            </el-button>
          </div>
        </div>
      </template>
      <div class="story-content">
        <div v-if="showEnglishStory" class="english-story">
          <h3>English Story</h3>
          <p v-html="getStoryContentHtml(story, 'en')"></p>
        </div>
        <div v-if="showChineseStory" class="chinese-story">
          <h3>中文故事</h3>
          <p v-html="getStoryContentHtml(story, 'zh')"></p>
        </div>
      </div>
    </el-card>

    <!-- 已保存故事区域，始终展示 -->
    <el-card class="saved-stories-card" style="margin-top: 30px;">
      <template #header>
        <div class="card-header">
          <span>已保存的故事</span>
          <el-button type="primary" size="small" @click="fetchStories">刷新</el-button>
        </div>
      </template>
      <div v-if="savedStories.length === 0" style="color: #999;">暂无已保存故事</div>
      <el-timeline v-else>
        <el-timeline-item
          v-for="item in savedStories"
          :key="item.id"
          :timestamp="item.created_at ? item.created_at : ''"
        >
          <div style="font-weight:bold">{{ item.title }}</div>
          <div style="margin-top: 6px;">
            <el-tag v-if="item.source_video_id" size="small" type="warning">关联视频</el-tag>
          </div>
          <div style="margin: 6px 0; color: #666; max-width: 90vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ item.englishText || item.english_text }}
          </div>
          <el-button size="mini" type="primary" @click="showStoryDetail(item)" style="margin-top:6px;">故事详情</el-button>
        </el-timeline-item>

        <!-- 故事详情弹窗 -->
        <el-dialog v-model="storyDetailDialogVisible" title="故事详情" width="40%">
          <div v-if="currentStoryDetail">
            <div style="margin-bottom: 12px; font-weight: bold;">{{ currentStoryDetail.title }}</div>
            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <el-tag v-if="currentStoryDetail.source_video_id" size="small" type="warning">关联视频</el-tag>
              <span v-if="currentStoryDetail.source_video_filename" style="color: #666; font-size: 12px;">
                {{ currentStoryDetail.source_video_filename }}
              </span>
            </div>
            <div style="margin-bottom: 8px; color: #333;">
              <span style="font-weight:bold">英文原文：</span>
              <div style="white-space: pre-line;" v-html="getStoryContentHtml(currentStoryDetail, 'en')"></div>
            </div>
            <div style="margin-top: 12px; color: #333;">
              <span style="font-weight:bold">中文翻译：</span>
              <div style="white-space: pre-line;" v-html="getStoryContentHtml(currentStoryDetail, 'zh')"></div>
            </div>
          </div>
          <template #footer>
            <el-button @click="storyDetailDialogVisible = false">关闭</el-button>
          </template>
        </el-dialog>
      </el-timeline>
    </el-card>

    <el-card v-if="story" class="story-card">
      <template #header>
        <div class="card-header">
          <span>生成的故事</span>
          <div class="story-controls">
            <el-switch
              v-model="showEnglishStory"
              active-text="显示英文"
            />
            <el-switch
              v-model="showChineseStory"
              active-text="显示中文"
            />
            <el-button type="primary" @click="saveStory">
              保存故事
            </el-button>
          </div>
        </div>
      </template>
      <div class="story-content">
        <div v-if="showEnglishStory" class="english-story">
          <h3>English Story</h3>
          <p v-html="getStoryContentHtml(story, 'en')"></p>
        </div>
        <div v-if="showChineseStory" class="chinese-story">
          <h3>中文故事</h3>
          <p v-html="getStoryContentHtml(story, 'zh')"></p>
        </div>
      </div>
    </el-card>

    
    <el-dialog
      v-model="saveDialogVisible"
      title="保存故事"
      width="30%"
    >
      <el-form :model="saveForm" label-width="80px">
        <el-form-item label="故事标题">
          <el-input v-model="saveForm.title" placeholder="请输入故事标题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="saveDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSaveStory">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useUserDataStore } from '@/stores/userDataStore'
import apiService from '../services/api'
import '../assets/highlight.css'

export default {
  name: 'StoryGeneratorView',
  setup() {
    // Store 引用
    const authStore = useAuthStore()
    const userDataStore = useUserDataStore()
    
    const words = ref([])
    const selectedWordIds = ref([])
    const searchQuery = ref('')
    const story = ref(null)
    const showEnglishStory = ref(true)
    const showChineseStory = ref(true)
    const saveDialogVisible = ref(false)
    const saveForm = ref({ title: '' })
    const savedStories = ref([]) // 已保存故事列表
    const storyDetailDialogVisible = ref(false)
    const currentStoryDetail = ref(null)
    const showStoryDetail = (item) => {
      apiService.getStory(item.id)
        .then(response => {
          currentStoryDetail.value = {
            ...response,
            highlightedEnglishText: response.highlightedEnglishText
          }
          storyDetailDialogVisible.value = true
        })
        .catch(error => {
          ElMessage.error('获取故事详情失败')
          console.error(error)
        })
    }

    
    // 工具方法
    const getWordText = (word) => {
      // 兼容个人单词本和公共单词库的不同字段名
      return word.word_text || word.text || word.word || ''
    }
    
    const getWordTranslation = (word) => {
      return word.translation || ''
    }

    const escapeHtml = (raw) => {
      return String(raw || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }

    const escapeRegExp = (text) => {
      return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    const extractChineseTerms = (text) => {
      const raw = String(text || '').trim()
      if (!raw) return []

      const normalized = raw
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[A-Za-z]+\./g, ' ')

      const chunks = normalized.match(/[\u4e00-\u9fff]{2,16}/g) || []
      const terms = []
      chunks.forEach((chunk) => {
        const value = chunk.trim()
        if (value.length >= 2) {
          terms.push(value)
        }
        value.split(/[的了和与及并将把]/g).forEach((part) => {
          const item = part.trim()
          if (item.length >= 2) {
            terms.push(item)
          }
        })
      })

      return [...new Set(terms)]
    }

    const replaceMarkedWords = (text, highlight = false) => {
      return text.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, (_match, p1, p2) => {
        const word = p1 || p2 || ''
        if (!highlight) return word
        return `<span class="selected-word-highlight">${word}</span>`
      })
    }

    const resolveStoryWords = (storyData) => {
      if (Array.isArray(storyData?.words) && storyData.words.length > 0) {
        return storyData.words
      }
      return selectedWords.value.map((word) => ({
        text: getWordText(word),
        translation: getWordTranslation(word)
      }))
    }

    const highlightByTerms = (text, terms, useWordBoundary = false) => {
      let highlighted = text
      const normalized = [...new Set((terms || []).map(item => String(item || '').trim()).filter(Boolean))]
        .sort((a, b) => b.length - a.length)

      normalized.forEach((term) => {
        const escaped = escapeRegExp(term)
        const pattern = useWordBoundary ? `\\b${escaped}\\b` : escaped
        const reg = new RegExp(pattern, useWordBoundary ? 'gi' : 'g')
        highlighted = highlighted.replace(reg, '<span class="selected-word-highlight">$&</span>')
      })

      return highlighted
    }

    const getStoryContentHtml = (storyData, language = 'en') => {
      if (language === 'en') {
        const highlightedEnglish = String(storyData?.highlightedEnglishText || '').trim()
        if (highlightedEnglish) {
          const normalized = replaceMarkedWords(
            highlightedEnglish
            .replace(/class="highlight-word"/g, 'class="selected-word-highlight"')
            .replace(/class="highlight"/g, 'class="selected-word-highlight"')
          )
          return normalized
            .replace(/\n/g, '<br>')
        }
      }

      const rawText = language === 'zh'
        ? (storyData?.chineseText || storyData?.chinese_text || '')
        : (storyData?.englishText || storyData?.english_text || '')

      const safeText = escapeHtml(rawText)
      const hasMarkers = /\*\*[^*]+\*\*|\*[^*]+\*/.test(rawText)
      let highlighted = replaceMarkedWords(safeText, language === 'zh' && hasMarkers)

      if (!(language === 'zh' && hasMarkers)) {
        const storyWords = resolveStoryWords(storyData)
        const terms = language === 'zh'
          ? storyWords.flatMap((item) => extractChineseTerms(item.translation))
          : storyWords.map((item) => item.text)
        highlighted = highlightByTerms(highlighted, terms, language === 'en')
      }

      return highlighted.replace(/\n/g, '<br>')
    }
    
    // 计算属性
    const filteredWords = computed(() => {
      if (!searchQuery.value) {
        return words.value
      }
      
      const query = searchQuery.value.toLowerCase()
      return words.value.filter(word => {
        const wordText = getWordText(word)
        const wordTranslation = getWordTranslation(word)
        return wordText.toLowerCase().includes(query) || 
               wordTranslation.toLowerCase().includes(query)
      })
    })
    
    const selectedWords = computed(() => {
      return words.value.filter(word => selectedWordIds.value.includes(word.id))
    })
    
    // 生命周期钩子
    onMounted(() => {
      fetchWords()
      checkForSelectedWords()
      fetchStories()
    })
    
    // 方法
    // 获取已保存故事
    const fetchStories = () => {
      apiService.getStories()
        .then(response => {
          if (Array.isArray(response)) {
            savedStories.value = response
          } else if (response && Array.isArray(response.data)) {
            savedStories.value = response.data
          } else {
            savedStories.value = []
          }
        })
        .catch(() => {
          savedStories.value = []
        })
    }

    const fetchWords = async () => {
      ElMessage({
        message: '正在加载单词数据...',
        type: 'info'
      })
      
      try {
        let wordsData = []
        
        if (authStore.isAuthenticated) {
          // 登录用户：获取个人单词本
          await userDataStore.fetchUserWords()
          wordsData = userDataStore.userWords
          ElMessage.success(`个人单词本加载成功，共 ${wordsData.length} 个单词`)
        } else {
          // 未登录用户：使用公共单词库
          const response = await apiService.getWords()
          
          if (Array.isArray(response)) {
            wordsData = response
          } else if (response && Array.isArray(response.data)) {
            wordsData = response.data
          } else {
            ElMessage.warning('未收到有效的单词数据')
            console.warn('未收到有效的单词数据:', response)
            return
          }
          ElMessage.success(`公共单词库加载成功，共 ${wordsData.length} 个单词`)
        }
        
        words.value = wordsData
      } catch (error) {
        console.error('获取单词数据失败:', error)
        let errorMessage = '获取单词数据失败，请重试'
        
        if (error.response) {
          if (error.response.data && error.response.data.message) {
            errorMessage = `获取单词数据失败: ${error.response.data.message}`
          } else {
            errorMessage = `获取单词数据失败: 服务器返回错误 (${error.response.status})`
          }
        } else if (error.request) {
          errorMessage = '获取单词数据失败: 服务器无响应，请检查网络连接'
        } else {
          errorMessage = `获取单词数据失败: ${error.message}`
        }
        
        ElMessage.error(errorMessage)
      }
    }
    
    const checkForSelectedWords = () => {
      const storedWordIds = localStorage.getItem('selectedWordIds')
      if (storedWordIds) {
        try {
          selectedWordIds.value = JSON.parse(storedWordIds)
          localStorage.removeItem('selectedWordIds')
        } catch (e) {
          console.error('Error parsing selected word IDs', e)
        }
      }
    }
    
    const generateStory = () => {
      if (selectedWordIds.value.length === 0) {
        ElMessage.warning('请至少选择一个单词')
        return
      }
      
      const loadingInstance = ElLoading.service({
        fullscreen: true,
        text: '正在生成故事，请稍候...'
      })
      
      apiService.generateStory(selectedWordIds.value)
        .then(response => {
          loadingInstance.close()
          
          if (response && (response.englishText || response.english_story) && (response.chineseText || response.chinese_story)) {
            story.value = {
              englishText: response.englishText || response.english_story,
              highlightedEnglishText: response.highlightedEnglishText || highlightWords(response.englishText || response.english_story),
              chineseText: response.chineseText || response.chinese_story,
              words: response.words || []
            }
            ElMessage.success('故事生成成功')
          } else {
            ElMessage.warning('未收到有效的故事数据')
            console.warn('未收到有效的故事数据:', response)
          }
        })
        .catch(error => {
          loadingInstance.close()
          console.error('生成故事失败:', error)
          let errorMessage = '生成故事失败，请重试'
          
          if (error.response) {
            if (error.response.data && error.response.data.message) {
              errorMessage = `生成故事失败: ${error.response.data.message}`
            } else {
              errorMessage = `生成故事失败: 服务器返回错误 (${error.response.status})`
            }
          } else if (error.request) {
            errorMessage = '生成故事失败: 服务器无响应，请检查网络连接'
          } else {
            errorMessage = `生成故事失败: ${error.message}`
          }
          
          ElMessage.error(errorMessage)
        })
    }
    
    const highlightWords = (text) => {
      if (!text) return '';
      // 支持 *word* 形式的高亮
      let highlighted = text.replace(/\*([A-Za-z0-9'-]+)\*/g, '<span class="highlight-word">$1</span>');
      const wordList = selectedWords.value.map(w => getWordText(w)).filter(Boolean);
      if (wordList.length === 0) return highlighted;
      const escaped = wordList.map(w => w.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'));
      const pattern = escaped.join('|');
      const reg = new RegExp(`\\b(?:${pattern})(?:[A-Za-z]*)\\b`, 'gi');
      highlighted = highlighted.replace(reg, match => `<span class="highlight-word">${match}</span>`);
      return highlighted;
    }

    const highlightWordsByIds = (text, wordIds) => {
      if (!text || !Array.isArray(wordIds) || wordIds.length === 0) return text;
      // 支持 *word* 形式的高亮
      let highlighted = text.replace(/\*([A-Za-z0-9'-]+)\*/g, '<span class="highlight-word">$1</span>');
      // 从全局 words 列表查找单词文本
      const wordList = words.value.filter(w => wordIds.includes(w.id)).map(w => w.text || w.word).filter(Boolean).sort((a, b) => b.length - a.length);
      wordList.forEach(word => {
        // 匹配单词边界或标点，忽略大小写
        const reg = new RegExp(`(^|\\W)(${word.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')})(?:[A-Za-z]*)\\b`, 'gi');
        highlighted = highlighted.replace(reg, (match, p1, p2) => `${p1}<span class="highlight-word">${p2}</span>`);
      });
      return highlighted;
    }

    const saveStory = () => {
      if (!story.value) return;
      
      saveForm.value = {
        title: `Story with ${selectedWords.value.length} words - ${new Date().toLocaleDateString()}`
      };
      saveDialogVisible.value = true;
    }
    
    const confirmSaveStory = () => {
      if (!saveForm.value.title) {
        ElMessage.warning('请输入故事标题')
        return
      }
      
      // 只在有选中单词时才传递 word_ids 字段，并加调试日志
      const storyData = {
        title: saveForm.value.title,
        englishText: story.value.englishText,
        chineseText: story.value.chineseText
      };
      if (selectedWordIds.value && selectedWordIds.value.length > 0) {
        storyData.word_ids = selectedWordIds.value
      }
      console.log('保存故事参数', storyData);
      
      const loading = ElLoading.service({
        fullscreen: true,
        text: '正在保存故事...'
      });
      
      apiService.saveStory(storyData)
        .then(() => {
          loading.close()
          saveDialogVisible.value = false
          ElMessage.success(`故事 "${saveForm.value.title}" 已保存`)
          fetchStories() // 保存成功后刷新故事列表
        })
        .catch(error => {
          loading.close()
          console.error('保存故事失败:', error)
          let errorMessage = '保存故事失败，请重试'
          
          if (error.response) {
            if (error.response.data && error.response.data.message) {
              errorMessage = `保存故事失败: ${error.response.data.message}`
            } else {
              errorMessage = `保存故事失败: 服务器返回错误 (${error.response.status})`
            }
          } else if (error.request) {
            errorMessage = '保存故事失败: 服务器无响应，请检查网络连接'
          } else {
            errorMessage = `保存故事失败: ${error.message}`
          }
          
          ElMessage.error(errorMessage)
        })
    }
    
    return {
      // Store
      authStore,
      userDataStore,
      
      // 数据
      words,
      selectedWordIds,
      savedStories,
      searchQuery,
      story,
      showEnglishStory,
      showChineseStory,
      saveDialogVisible,
      saveForm,
      storyDetailDialogVisible,
      currentStoryDetail,
      
      // 计算属性
      filteredWords,
      selectedWords,
      
      // 方法
      getWordText,
      getWordTranslation,
      fetchStories,
      showStoryDetail,
      getStoryContentHtml,
      highlightWordsByIds,
      generateStory,
      highlightWords,
      saveStory,
      confirmSaveStory
    }
  }
}
</script>

<style scoped>
.highlight-word {
  background: #ffe58f;
  color: #d48806;
  font-weight: bold;
  border-radius: 3px;
  padding: 0 2px;
}

:deep(.selected-word-highlight) {
  background: #fff2cc;
  color: #ad6800;
  font-weight: 600;
  border-radius: 4px;
  padding: 0 2px;
}

:deep(.highlight),
:deep(.highlight-word) {
  background: #fff2cc;
  color: #ad6800;
  font-weight: 600;
  border-radius: 4px;
  padding: 0 2px;
}
</style>

<style scoped>
.story-generator-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-selection-card {
  margin-bottom: 30px;
}

.word-selection-info {
  margin-bottom: 20px;
}

.word-count {
  font-weight: bold;
  color: #409EFF;
}

.word-search {
  margin-bottom: 20px;
}

.word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
}

.word-item {
  display: flex;
  flex-direction: row;
  margin-right: 15px;
  margin-bottom: 10px;
  padding: 5px 10px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  transition: all 0.3s;
  align-items: center;
}

.word-item:hover {
  background-color: #F5F7FA;
}

.word-text {
  font-weight: bold;
  margin-left: 4px;
}

.word-translation {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

.story-card {
  margin-top: 30px;
}

.story-controls {
  display: flex;
  gap: 15px;
  align-items: center;
}

.story-content {
  padding: 20px;
}

.english-story, .chinese-story {
  margin-bottom: 30px;
}

.english-story h3, .chinese-story h3 {
  margin-bottom: 15px;
  border-bottom: 1px solid #EBEEF5;
  padding-bottom: 10px;
}

.highlighted-word {
  color: #409EFF;
  font-weight: bold;
  text-decoration: underline;
}

.empty-state {
  text-align: center;
  padding: 20px;
  border: 1px dashed #DCDFE6;
  border-radius: 4px;
  background-color: #FAFAFA;
}

.empty-tip {
  margin-top: 10px;
  font-size: 14px;
  color: #909399;
  line-height: 1.6;
}

.user-tip {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .story-controls {
    margin-top: 10px;
    flex-wrap: wrap;
  }
}
</style>
