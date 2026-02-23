<template>
  <div class="video-story-page">
    <div class="page-header">
      <div class="left">
        <el-button text @click="goBack">返回</el-button>
        <h2>视频故事</h2>
      </div>
      <div class="meta">
        <span class="filename">{{ videoFilename }}</span>
        <el-tag type="info">关联故事 {{ stories.length }} 条</el-tag>
      </div>
    </div>

    <el-card class="word-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>当前视频已选词</span>
          <el-button type="primary" :loading="submitting" :disabled="selectedWordIds.length === 0" @click="generateAndSaveStory">
            生成并保存故事
          </el-button>
        </div>
      </template>

      <div v-if="loadingWords" class="loading-block">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="videoWords.length === 0" class="empty-block">
        <el-empty description="该视频还没有已选词">
          <el-button type="primary" @click="goTranscript">去字幕页选词</el-button>
        </el-empty>
      </div>

      <div v-else>
        <el-alert
          v-if="unavailableWords.length > 0"
          type="warning"
          :closable="false"
          show-icon
          class="warn"
          title="部分词缺少 word_id，暂不可用于生成故事"
        >
          <template #default>
            <div class="warn-words">{{ unavailableWords.map((item) => item.word_text).join('、') }}</div>
          </template>
        </el-alert>

        <el-form label-width="90px" class="title-form">
          <el-form-item label="故事标题">
            <el-input v-model="storyTitle" placeholder="请输入故事标题" />
          </el-form-item>
        </el-form>

        <el-checkbox-group v-model="selectedWordIds" class="word-grid">
          <el-checkbox
            v-for="word in videoWords"
            :key="word.id"
            :label="word.word_id"
            :disabled="!word.word_id"
            class="word-item"
          >
            <div class="word-text">{{ word.word_text }}</div>
            <div v-if="word.translation" class="word-translation">{{ word.translation }}</div>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </el-card>

    <el-card class="story-list-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>关联故事列表</span>
          <el-button @click="fetchStories" :loading="loadingStories">刷新</el-button>
        </div>
      </template>

      <div v-if="loadingStories">
        <el-skeleton :rows="4" animated />
      </div>
      <el-empty v-else-if="stories.length === 0" description="暂无该视频关联故事" />
      <div v-else class="story-list">
        <div v-for="item in stories" :key="item.id" class="story-row">
          <div class="title-line">
            <span class="title">{{ item.title }}</span>
            <div class="title-tags">
              <el-tag v-if="item.source_video_id" type="warning" size="small">关联视频</el-tag>
              <span class="time">{{ formatTime(item.created_at) }}</span>
            </div>
          </div>
          <div class="preview">{{ item.englishText || item.english_text }}</div>
          <el-button text type="primary" @click="openStoryDetail(item)">查看详情</el-button>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="故事详情" width="720px">
      <div v-if="currentStory" class="story-detail">
        <div class="detail-title">{{ currentStory.title }}</div>
        <div class="detail-meta">
          <el-tag v-if="currentStory.source_video_id" type="warning" size="small">关联视频</el-tag>
          <span v-if="currentStory.source_video_filename" class="video-name">{{ currentStory.source_video_filename }}</span>
        </div>
        <div class="detail-section">
          <h4>英文</h4>
          <div v-html="getStoryContentHtml(currentStory, 'en')"></div>
        </div>
        <div class="detail-section">
          <h4>中文</h4>
          <div v-html="getStoryContentHtml(currentStory, 'zh')"></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import apiService from '@/services/api'
import legacyService from '@/services/legacyService'

const route = useRoute()
const router = useRouter()

const videoId = computed(() => String(route.params.videoId || ''))
const videoFilename = ref(String(route.query.filename || `视频 ${videoId.value}`))

const loadingWords = ref(false)
const loadingStories = ref(false)
const submitting = ref(false)

const videoWords = ref([])
const selectedWordIds = ref([])
const storyTitle = ref('')

const stories = ref([])
const detailVisible = ref(false)
const currentStory = ref(null)

const unavailableWords = computed(() => videoWords.value.filter((item) => !item.word_id))

function formatTime(value) {
  if (!value) return '--'
  return new Date(value).toLocaleString('zh-CN')
}

function escapeHtml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractChineseTerms(text) {
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

function replaceMarkedWords(htmlText, highlight = false) {
  return htmlText.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, (_match, p1, p2) => {
    const word = p1 || p2 || ''
    if (!highlight) return word
    return `<span class="selected-word-highlight">${word}</span>`
  })
}

function highlightByTerms(htmlText, terms, useWordBoundary = false) {
  let result = htmlText
  const sortedTerms = [...new Set(terms.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)

  sortedTerms.forEach((term) => {
    const escaped = escapeRegExp(term)
    const pattern = useWordBoundary ? `\\b${escaped}\\b` : escaped
    const regex = new RegExp(pattern, useWordBoundary ? 'gi' : 'g')
    result = result.replace(regex, '<span class="selected-word-highlight">$&</span>')
  })

  return result
}

function getStoryContentHtml(story, language = 'en') {
  if (language === 'en') {
    const highlightedEnglish = String(story?.highlightedEnglishText || '').trim()
    if (highlightedEnglish) {
      const normalized = replaceMarkedWords(
        highlightedEnglish
          .replace(/class="highlight-word"/g, 'class="selected-word-highlight"')
          .replace(/class="highlight"/g, 'class="selected-word-highlight"')
      )
      return normalized.replace(/\n/g, '<br>')
    }
  }

  const rawText = language === 'zh' ? (story?.chineseText || story?.chinese_text || '') : (story?.englishText || story?.english_text || '')
  const safeText = escapeHtml(rawText)
  const hasMarkers = /\*\*[^*]+\*\*|\*[^*]+\*/.test(rawText)
  let html = replaceMarkedWords(safeText, language === 'zh' && hasMarkers)
  if (!(language === 'zh' && hasMarkers) && Array.isArray(story?.words) && story.words.length > 0) {
    const terms = language === 'zh'
      ? story.words.flatMap((item) => extractChineseTerms(item.translation))
      : story.words.map((item) => item.text)
    html = highlightByTerms(html, terms, language === 'en')
  }

  return html.replace(/\n/g, '<br>')
}

function buildDefaultTitle() {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${videoFilename.value}-故事-${m}${d}-${h}${min}`
}

function goBack() {
  router.push({ name: 'VideoHistory' })
}

function goTranscript() {
  router.push({
    name: 'VideoTranscript',
    params: { videoId: videoId.value },
    query: {
      source: 'video-story',
      filename: videoFilename.value
    }
  })
}

async function fetchWordSelections() {
  loadingWords.value = true
  try {
    const response = await legacyService.listVideoWordSelections(videoId.value)
    const items = Array.isArray(response?.items) ? response.items : []
    videoWords.value = items
    selectedWordIds.value = items.filter((item) => item.word_id).map((item) => item.word_id)
    if (!storyTitle.value) {
      storyTitle.value = buildDefaultTitle()
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载视频已选词失败')
    videoWords.value = []
    selectedWordIds.value = []
  } finally {
    loadingWords.value = false
  }
}

async function fetchStories() {
  loadingStories.value = true
  try {
    const response = await apiService.getStories({ source_video_id: videoId.value })
    if (Array.isArray(response)) {
      stories.value = response
    } else if (Array.isArray(response?.data)) {
      stories.value = response.data
    } else {
      stories.value = []
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载视频故事失败')
    stories.value = []
  } finally {
    loadingStories.value = false
  }
}

async function generateAndSaveStory() {
  if (selectedWordIds.value.length === 0) {
    ElMessage.warning('请先选择至少一个单词')
    return
  }

  submitting.value = true
  try {
    const payload = {
      title: storyTitle.value || buildDefaultTitle(),
      word_ids: selectedWordIds.value,
      source_video_id: videoId.value
    }
    await apiService.saveStory(payload)
    ElMessage.success('故事已生成并保存')
    await fetchStories()
  } catch (error) {
    const backendMessage = error?.response?.data?.error || error?.response?.data?.message
    ElMessage.error(backendMessage || '生成故事失败')
  } finally {
    submitting.value = false
  }
}

async function openStoryDetail(story) {
  try {
    const detail = await apiService.getStory(story.id)
    currentStory.value = detail
    detailVisible.value = true
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载故事详情失败')
  }
}

onMounted(async () => {
  await Promise.all([fetchWordSelections(), fetchStories()])
})
</script>

<style scoped>
.video-story-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header .left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header .left h2 {
  margin: 0;
}

.meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filename {
  color: #606266;
  font-size: 13px;
  max-width: 440px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.word-card,
.story-list-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.warn {
  margin-bottom: 12px;
}

.warn-words {
  font-size: 12px;
  color: #e6a23c;
}

.title-form {
  margin-bottom: 12px;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.word-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0;
  width: 100%;
  min-height: 88px;
  box-sizing: border-box;
  align-items: flex-start;
}

.word-item :deep(.el-checkbox__input) {
  margin-top: 3px;
}

.word-item :deep(.el-checkbox__label) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  width: 100%;
  white-space: normal;
  line-height: 1.35;
  padding-left: 10px;
}

.word-text {
  font-weight: 600;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.word-translation {
  color: #909399;
  font-size: 12px;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.story-row {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
}

.title-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.title {
  font-weight: 600;
}

.title-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time {
  color: #909399;
  font-size: 12px;
}

.preview {
  color: #606266;
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.story-detail .detail-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.video-name {
  color: #606266;
  font-size: 13px;
}

.detail-section {
  margin-top: 10px;
}

.detail-section h4 {
  margin: 0 0 6px;
}

.story-detail :deep(.selected-word-highlight) {
  background: #fff2cc;
  color: #ad6800;
  font-weight: 600;
  border-radius: 4px;
  padding: 0 2px;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .filename {
    max-width: 100%;
  }
}
</style>
