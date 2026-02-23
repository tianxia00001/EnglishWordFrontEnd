<template>
  <div class="segment-learning-page" v-loading="pageLoading">
    <div class="page-head">
      <div class="head-left">
        <el-button text @click="goBack">返回</el-button>
        <h2>视频学习闯关</h2>
      </div>
      <div class="head-right">
        <span class="filename">{{ videoFilename }}</span>
        <el-tag type="success">{{ completedSegments }}/{{ totalSegments }} 已完成</el-tag>
      </div>
    </div>

    <el-card class="segment-nav-card" shadow="never" v-if="segments.length">
      <div class="segment-nav">
        <button
          v-for="segment in segments"
          :key="segment.segment_id"
          type="button"
          class="segment-pill"
          :class="segmentPillClass(segment)"
          :disabled="segment.locked"
          @click="selectSegment(segment)"
        >
          <span class="segment-pill-title">片段 {{ segment.segment_index + 1 }}</span>
          <span class="segment-pill-meta">
            {{ formatRange(segment.start_seconds, segment.end_seconds - segment.start_seconds) }}
          </span>
        </button>
      </div>
    </el-card>

    <el-empty v-if="!segments.length && !pageLoading" description="该视频暂无可学习片段" />

    <el-card v-if="activeSegment" shadow="never" class="segment-main-card">
      <template #header>
        <div class="segment-main-head">
          <div class="left">
            <span class="segment-title">当前片段 {{ activeSegment.segment_index + 1 }}</span>
            <el-tag :type="activeSegment.locked ? 'info' : 'primary'" size="small">
              {{ activeSegment.locked ? '未解锁' : '可学习' }}
            </el-tag>
            <el-tag size="small" type="success">{{ activeSegment.caption_count }} 条字幕</el-tag>
          </div>
          <div class="right">
            <el-switch v-model="showChinese" active-text="显示中文翻译" inactive-text="隐藏中文翻译" />
          </div>
        </div>
      </template>

      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="片段总结" />
        <el-step title="片段字幕" />
        <el-step title="单词与故事" />
        <el-step title="记忆标注" />
      </el-steps>

      <div class="step-block" v-show="currentStep === 0">
        <div class="step-title">第一步：片段总结（默认隐藏）</div>
        <div class="step-actions-row">
          <el-button type="primary" :loading="summaryLoading" @click="showSummary">
            {{ isSummaryVisible ? '刷新总结' : '显示总结' }}
          </el-button>
        </div>
        <div v-if="isSummaryVisible" class="summary-content">
          <el-skeleton v-if="summaryLoading" :rows="4" animated />
          <template v-else-if="summaryData">
            <div class="summary-section">
              <h4>English Summary</h4>
              <p>{{ summaryData.english_summary }}</p>
            </div>
            <div class="summary-section">
              <h4>中文总结</h4>
              <p>{{ summaryData.chinese_summary }}</p>
            </div>
            <el-alert
              v-if="summaryData.status && summaryData.status !== 'ready'"
              :closable="false"
              type="warning"
              show-icon
              title="当前为降级总结结果（模型生成失败时的兜底内容）"
            />
          </template>
          <el-empty v-else description="暂无总结" />
        </div>
      </div>

      <div class="step-block" v-show="currentStep === 1">
        <div class="step-title">第二步：片段字幕（默认隐藏）</div>
        <div class="step-actions-row">
          <el-button type="primary" :loading="captionsLoading" @click="showCaptions">
            {{ isCaptionsVisible ? '刷新字幕' : '显示字幕' }}
          </el-button>
        </div>
        <div v-if="isCaptionsVisible" class="captions-content">
          <el-skeleton v-if="captionsLoading" :rows="6" animated />
          <template v-else>
            <div class="compact-row">
              <div
                v-for="caption in activeCaptions"
                :key="caption.id"
                class="compact-item"
              >
                <span class="compact-ts">{{ formatRange(caption.start_seconds, caption.end_seconds - caption.start_seconds) }}</span>
                <span class="compact-en">
                  <template v-for="part in splitTextParts(caption.english_text)" :key="part.key">
                    <span
                      v-if="part.type === 'word'"
                      :class="['word-token', { 'word-token-picked': isSegmentWord(part.normalized) }]"
                      @click.stop="handleWordClick(part.normalized)"
                    >
                      {{ part.text }}
                    </span>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </span>
                <span class="compact-divider">|</span>
              </div>
            </div>
            <div v-if="showChinese" class="compact-row zh">
              <div
                v-for="caption in activeCaptions"
                :key="`zh-${caption.id}`"
                class="compact-item"
              >
                <span class="compact-ts">{{ formatRange(caption.start_seconds, caption.end_seconds - caption.start_seconds) }}</span>
                <span class="compact-zh">{{ caption.chinese_text }}</span>
                <span class="compact-divider">|</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="step-block" v-show="currentStep === 2">
        <div class="step-title">第三步：当前片段单词与故事</div>
        <div class="step-actions-row">
          <el-button :loading="wordsLoading" @click="loadSegmentWords(true)">刷新片段单词</el-button>
          <el-button
            type="primary"
            :loading="storySubmitting"
            :disabled="availableWordIds.length === 0 || selectedWordIds.length === 0"
            @click="generateAndSaveStory"
          >
            生成并保存故事
          </el-button>
        </div>

        <div v-if="wordsLoading">
          <el-skeleton :rows="4" animated />
        </div>
        <div v-else-if="activeWords.length === 0">
          <el-alert type="info" :closable="false" show-icon title="本片段没有可用于故事的已选单词，可直接完成本片段。" />
        </div>
        <template v-else>
          <el-form label-width="80px" class="story-title-form">
            <el-form-item label="故事标题">
              <el-input v-model="storyTitle" />
            </el-form-item>
          </el-form>
          <el-checkbox-group v-model="selectedWordIds" class="word-grid">
            <el-checkbox
              v-for="word in activeWords"
              :key="word.word_text"
              :label="word.word_id"
              :disabled="!word.word_id"
              class="word-item"
            >
              <div class="word-main">{{ word.word_text }}</div>
              <div class="word-sub">{{ word.translation || '暂无释义' }}</div>
            </el-checkbox>
          </el-checkbox-group>
        </template>

        <div v-if="activeStory" class="story-preview">
          <div class="story-preview-title">当前片段故事预览</div>
          <div class="story-block">
            <h4>英文</h4>
            <p v-html="storyEnglishHtml"></p>
          </div>
          <div class="story-block">
            <h4>中文</h4>
            <p v-html="storyChineseHtml"></p>
          </div>
        </div>
      </div>

      <div class="step-block" v-show="currentStep === 3">
        <div class="step-title">第四步：单词记忆标记</div>
        <div class="step-actions-row">
          <el-button :loading="wordsLoading" @click="loadSegmentWords(true)">刷新单词状态</el-button>
          <el-button
            type="primary"
            :loading="memoryCompleteLoading"
            :disabled="activeWords.length > 0 && hasUnmarkedMemoryWords"
            @click="completeWordMemoryStep"
          >
            完成记忆标记步骤
          </el-button>
        </div>
        <el-alert
          v-if="activeWords.length > 0 && hasUnmarkedMemoryWords"
          type="warning"
          :closable="false"
          show-icon
          title="请先为每个单词选择“记住了”或“没记住”，再完成本步骤。"
        />
        <el-alert
          v-else-if="activeWords.length === 0"
          type="info"
          :closable="false"
          show-icon
          title="本片段暂无可标记单词，可直接完成本步骤。"
        />
        <div v-if="activeWords.length > 0" class="memory-grid">
          <div
            v-for="word in activeWords"
            :key="`memory-${word.word_text}`"
            class="memory-item"
          >
            <div class="memory-word">
              <div class="memory-main">{{ word.word_text }}</div>
              <div class="memory-sub">{{ word.translation || '暂无释义' }}</div>
            </div>
            <div class="memory-actions">
              <el-button
                size="small"
                type="success"
                plain
                :loading="Boolean(memorySavingMap[word.word_id])"
                @click="markWordMemory(word, true)"
              >
                记住了
              </el-button>
              <el-button
                size="small"
                type="warning"
                plain
                :loading="Boolean(memorySavingMap[word.word_id])"
                @click="markWordMemory(word, false)"
              >
                没记住
              </el-button>
            </div>
            <el-tag
              v-if="word.is_learned === true"
              type="success"
              size="small"
            >
              记住了
            </el-tag>
            <el-tag
              v-else-if="word.is_learned === false"
              type="warning"
              size="small"
            >
              没记住
            </el-tag>
            <el-tag
              v-else
              type="info"
              size="small"
            >
              未标记
            </el-tag>
          </div>
        </div>
      </div>

      <div class="footer-actions">
        <el-button :disabled="currentStep <= 0" @click="prevStep">上一步</el-button>
        <el-button :disabled="currentStep >= 3" @click="nextStep">下一步</el-button>
        <el-button type="success" :loading="completeLoading" @click="completeCurrentSegment">
          完成本片段
        </el-button>
      </div>
    </el-card>

    <el-result
      v-if="allCompleted && segments.length"
      icon="success"
      title="全部片段学习完成"
      sub-title="你已经完成此视频的全部分段学习，可以回到视频历史继续复习。"
    >
      <template #extra>
        <el-button type="primary" @click="goBack">返回视频历史</el-button>
      </template>
    </el-result>

    <el-dialog v-model="wordDialogVisible" title="单词信息" width="500px" destroy-on-close>
      <div v-if="wordDialogLoading">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else-if="currentWordInfo" class="word-dialog-body">
        <div class="word-head">
          <h3>{{ currentWordInfo.word }}</h3>
          <el-tag size="small" type="success">{{ sourceLabel }}</el-tag>
        </div>
        <div class="word-section" v-if="currentWordInfo.chinese_translation">
          <h4>中文释义</h4>
          <p>{{ currentWordInfo.chinese_translation }}</p>
        </div>
        <div class="word-section" v-if="currentWordInfo.definition">
          <h4>英文解释</h4>
          <p>{{ currentWordInfo.definition }}</p>
        </div>
      </div>
      <el-empty v-else description="未能获取单词信息" />
      <template #footer>
        <el-button @click="wordDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="wordActionLoading" @click="addWordToBook">
          添加到单词本
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import apiService from '@/services/api'
import legacyService from '@/services/legacyService'
import { getStoryContentHtml } from '@/utils/storyHighlight'
import { formatRange as formatRangeUtil } from '@/utils/text'

const route = useRoute()
const router = useRouter()

const pageLoading = ref(false)
const showChinese = ref(true)
const segments = ref([])
const activeSegmentId = ref('')
const currentStep = ref(0)

const summaryLoading = ref(false)
const captionsLoading = ref(false)
const wordsLoading = ref(false)
const storySubmitting = ref(false)
const completeLoading = ref(false)
const memoryCompleteLoading = ref(false)
const memorySavingMap = ref({})

const summaryVisibleMap = ref({})
const captionsVisibleMap = ref({})
const summaryMap = ref({})
const captionsMap = ref({})
const wordsMap = ref({})
const storyMap = ref({})

const storyTitle = ref('')
const selectedWordIds = ref([])

const wordDialogVisible = ref(false)
const wordDialogLoading = ref(false)
const wordActionLoading = ref(false)
const currentWordInfo = ref(null)
const pendingWord = ref('')
const wordInfoSource = ref('')

const videoId = computed(() => String(route.params.videoId || route.query.videoId || ''))
const videoFilename = ref(String(route.query.filename || `视频 ${videoId.value}`))
const totalSegments = computed(() => segments.value.length)
const completedSegments = computed(() => segments.value.filter(item => item.progress?.completed).length)
const allCompleted = computed(() => totalSegments.value > 0 && completedSegments.value === totalSegments.value)
const activeSegment = computed(() => segments.value.find(item => item.segment_id === activeSegmentId.value) || null)
const activeProgress = computed(() => activeSegment.value?.progress || {})

const isSummaryVisible = computed(() => Boolean(summaryVisibleMap.value[activeSegmentId.value]))
const isCaptionsVisible = computed(() => Boolean(captionsVisibleMap.value[activeSegmentId.value]))
const summaryData = computed(() => summaryMap.value[activeSegmentId.value] || null)
const activeCaptions = computed(() => captionsMap.value[activeSegmentId.value] || [])
const activeWords = computed(() => wordsMap.value[activeSegmentId.value] || [])
const activeStory = computed(() => storyMap.value[activeSegmentId.value] || null)
const availableWordIds = computed(() => activeWords.value.filter(item => item.word_id).map(item => item.word_id))
const segmentWordSet = computed(() => new Set(activeWords.value.map(item => normalizeWord(item.word_text))))
const hasUnmarkedMemoryWords = computed(() => {
  const markableWords = activeWords.value.filter(item => item.word_id)
  if (!markableWords.length) return false
  return markableWords.some(item => item.is_learned !== true && item.is_learned !== false)
})

const storyEnglishHtml = computed(() => getStoryContentHtml(activeStory.value, 'en'))
const storyChineseHtml = computed(() => getStoryContentHtml(activeStory.value, 'zh'))
const sourceLabel = computed(() => {
  const map = {
    base_library: '基础词库',
    deepseek_api: 'AI 生成',
    fallback: '兜底生成'
  }
  return map[wordInfoSource.value] || wordInfoSource.value || '未知来源'
})

watch(activeSegmentId, async () => {
  initializeStepByProgress()
  storyTitle.value = buildDefaultStoryTitle()
  selectedWordIds.value = activeWords.value.filter(item => item.word_id).map(item => item.word_id)
  if (currentStep.value >= 2) {
    await loadSegmentWords()
  }
})

watch(currentStep, async (next) => {
  if (next >= 2 && activeSegment.value) {
    await loadSegmentWords()
  }
})

onMounted(async () => {
  await fetchSegmentsSnapshot(false)
})

function normalizeWord(word) {
  return String(word || '').trim().toLowerCase()
}

function splitTextParts(text) {
  const source = String(text || '')
  const regex = /[A-Za-z][A-Za-z'-]*/g
  const parts = []
  let cursor = 0
  let idx = 0
  for (const match of source.matchAll(regex)) {
    const start = match.index ?? 0
    const word = match[0]
    if (start > cursor) {
      parts.push({ type: 'text', text: source.slice(cursor, start), key: `t-${idx++}` })
    }
    parts.push({ type: 'word', text: word, normalized: normalizeWord(word), key: `w-${idx++}` })
    cursor = start + word.length
  }
  if (cursor < source.length) {
    parts.push({ type: 'text', text: source.slice(cursor), key: `t-${idx++}` })
  }
  if (!parts.length) {
    return [{ type: 'text', text: source, key: 'empty' }]
  }
  return parts
}

function formatRange(start, duration) {
  return formatRangeUtil(start, duration)
}

function segmentPillClass(segment) {
  if (segment.progress?.completed) return 'done'
  if (segment.locked) return 'locked'
  if (segment.segment_id === activeSegmentId.value) return 'active'
  return 'todo'
}

function selectSegment(segment) {
  if (segment.locked) {
    ElMessage.warning('请先完成前一个片段')
    return
  }
  activeSegmentId.value = segment.segment_id
}

function initializeStepByProgress() {
  const progress = activeProgress.value
  const hasWords = Boolean(activeSegment.value?.has_words)
  if (!progress.summary_viewed) {
    currentStep.value = 0
    return
  }
  if (!progress.subtitles_viewed) {
    currentStep.value = 1
    return
  }
  if (hasWords && !progress.story_done) {
    currentStep.value = 2
    return
  }
  if (hasWords && !progress.word_memory_done) {
    currentStep.value = 3
    return
  }
  currentStep.value = hasWords ? 3 : 2
}

function buildDefaultStoryTitle() {
  const segment = activeSegment.value
  if (!segment) return ''
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  return `${videoFilename.value}-片段${segment.segment_index + 1}-故事-${mm}${dd}-${hh}${mi}`
}

async function fetchSegmentsSnapshot(keepActive = true, syncStep = true) {
  const id = videoId.value
  if (!id) return
  pageLoading.value = true
  try {
    const response = await apiService.getVideoLearningSegments(id)
    const payload = response?.data || {}
    segments.value = Array.isArray(payload.segments) ? payload.segments : []
    if (!keepActive || !segments.value.find(item => item.segment_id === activeSegmentId.value)) {
      activeSegmentId.value = payload.current_segment_id || (segments.value[0]?.segment_id || '')
    }
    if (!videoFilename.value && route.query.filename) {
      videoFilename.value = String(route.query.filename)
    }
    if (syncStep) {
      initializeStepByProgress()
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载学习片段失败')
  } finally {
    pageLoading.value = false
  }
}

async function applyProgress(action, payload = {}) {
  if (!activeSegment.value) return null
  const response = await apiService.updateVideoSegmentProgress(
    videoId.value,
    activeSegment.value.segment_id,
    action,
    payload
  )
  const snapshot = response?.data?.snapshot
  if (snapshot && Array.isArray(snapshot.segments)) {
    segments.value = snapshot.segments
    if (!segments.value.find(item => item.segment_id === activeSegmentId.value)) {
      activeSegmentId.value = snapshot.current_segment_id || (segments.value[0]?.segment_id || '')
    }
  }
  return response?.data || null
}

async function showSummary() {
  if (!activeSegment.value) return
  const segmentId = activeSegment.value.segment_id
  const force = Boolean(summaryVisibleMap.value[segmentId])
  summaryVisibleMap.value = { ...summaryVisibleMap.value, [segmentId]: true }
  summaryLoading.value = true
  try {
    const response = await apiService.getVideoSegmentSummary(videoId.value, segmentId, force)
    summaryMap.value = { ...summaryMap.value, [segmentId]: response?.data || null }
    if (!activeProgress.value.summary_viewed) {
      await applyProgress('view_summary')
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载片段总结失败')
  } finally {
    summaryLoading.value = false
  }
}

async function showCaptions() {
  if (!activeSegment.value) return
  const segmentId = activeSegment.value.segment_id
  captionsVisibleMap.value = { ...captionsVisibleMap.value, [segmentId]: true }
  captionsLoading.value = true
  try {
    const response = await apiService.getVideoSegmentCaptions(videoId.value, segmentId)
    captionsMap.value = { ...captionsMap.value, [segmentId]: Array.isArray(response?.data) ? response.data : [] }
    if (!activeProgress.value.subtitles_viewed) {
      await applyProgress('view_subtitles')
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载片段字幕失败')
  } finally {
    captionsLoading.value = false
  }
}

async function loadSegmentWords(force = false) {
  if (!activeSegment.value) return
  const segmentId = activeSegment.value.segment_id
  if (!force && Array.isArray(wordsMap.value[segmentId])) {
    selectedWordIds.value = wordsMap.value[segmentId].filter(item => item.word_id).map(item => item.word_id)
    return
  }
  wordsLoading.value = true
  try {
    const response = await apiService.getVideoSegmentWords(videoId.value, segmentId)
    const words = Array.isArray(response?.data) ? response.data : []
    wordsMap.value = { ...wordsMap.value, [segmentId]: words }
    selectedWordIds.value = words.filter(item => item.word_id).map(item => item.word_id)
    storyTitle.value = buildDefaultStoryTitle()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载片段单词失败')
  } finally {
    wordsLoading.value = false
  }
}

async function generateAndSaveStory() {
  if (!activeSegment.value) return
  if (!selectedWordIds.value.length) {
    ElMessage.warning('请先选择可用单词')
    return
  }
  storySubmitting.value = true
  try {
    const response = await apiService.saveStory({
      title: storyTitle.value || buildDefaultStoryTitle(),
      word_ids: selectedWordIds.value,
      source_video_id: videoId.value
    })
    const story = response || {}
    storyMap.value = { ...storyMap.value, [activeSegment.value.segment_id]: story }
    await applyProgress('complete_story', { story_id: story.id })
    ElMessage.success('故事已生成并保存')
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error?.response?.data?.message || '生成故事失败')
  } finally {
    storySubmitting.value = false
  }
}

async function markWordMemory(word, isLearned) {
  const wordId = Number(word?.word_id || 0)
  if (!wordId) {
    ElMessage.warning('该单词暂无可用 ID，无法标记')
    return
  }
  memorySavingMap.value = { ...memorySavingMap.value, [wordId]: true }
  try {
    await apiService.updateUserWordStatus(wordId, isLearned)
    const segmentId = activeSegment.value?.segment_id
    if (segmentId) {
      const currentWords = wordsMap.value[segmentId] || []
      wordsMap.value = {
        ...wordsMap.value,
        [segmentId]: currentWords.map(item => {
          if (Number(item.word_id || 0) !== wordId) return item
          return {
            ...item,
            is_learned: isLearned,
            learned_at: isLearned ? new Date().toISOString() : null
          }
        })
      }
    }
    ElMessage.success(isLearned ? '已标记为记住了' : '已标记为没记住')
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error?.response?.data?.message || '更新记忆状态失败')
  } finally {
    const nextMap = { ...memorySavingMap.value }
    delete nextMap[wordId]
    memorySavingMap.value = nextMap
  }
}

async function completeWordMemoryStep() {
  if (!activeSegment.value) return
  memoryCompleteLoading.value = true
  try {
    await applyProgress('complete_word_memory')
    ElMessage.success('记忆标记步骤已完成')
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '请先完成所有单词的记忆标记')
  } finally {
    memoryCompleteLoading.value = false
  }
}

async function completeCurrentSegment() {
  if (!activeSegment.value) return
  completeLoading.value = true
  try {
    const result = await applyProgress('complete_segment')
    const nextSegmentId = result?.next_unlocked_segment_id
    if (nextSegmentId && nextSegmentId !== activeSegmentId.value) {
      activeSegmentId.value = nextSegmentId
      currentStep.value = 0
      ElMessage.success('当前片段已完成，已解锁下一个片段')
    } else {
      ElMessage.success('当前片段已完成')
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '当前片段尚未满足完成条件')
  } finally {
    completeLoading.value = false
  }
}

function nextStep() {
  const hasWords = Boolean(activeSegment.value?.has_words)
  if (currentStep.value === 0 && !activeProgress.value.summary_viewed) {
    ElMessage.warning('请先点击“显示总结”完成第 1 步')
    return
  }
  if (currentStep.value === 1 && !activeProgress.value.subtitles_viewed) {
    ElMessage.warning('请先点击“显示字幕”完成第 2 步')
    return
  }
  if (currentStep.value === 2 && hasWords && !activeProgress.value.story_done) {
    ElMessage.warning('请先完成第 3 步故事生成')
    return
  }
  if (currentStep.value === 3 && hasWords && !activeProgress.value.word_memory_done) {
    ElMessage.warning('请先完成第 4 步记忆标记')
    return
  }
  currentStep.value = Math.min(3, currentStep.value + 1)
}

function prevStep() {
  currentStep.value = Math.max(0, currentStep.value - 1)
}

function isSegmentWord(word) {
  return segmentWordSet.value.has(normalizeWord(word))
}

function handleWordClick(word) {
  lookupWord(word)
}

async function lookupWord(word) {
  pendingWord.value = normalizeWord(word)
  if (!pendingWord.value) return
  wordDialogVisible.value = true
  wordDialogLoading.value = true
  currentWordInfo.value = null
  wordInfoSource.value = ''
  try {
    const response = await legacyService.getWordInfo(pendingWord.value)
    if (response?.success && response.word_info) {
      currentWordInfo.value = response.word_info
      wordInfoSource.value = response.source || response.word_info.source || ''
    } else {
      ElMessage.warning(response?.error || '未能获取单词信息')
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || '查询单词失败')
  } finally {
    wordDialogLoading.value = false
  }
}

async function addWordToBook() {
  if (!pendingWord.value) return
  wordActionLoading.value = true
  try {
    const response = await legacyService.addWordWithInfo({ text: pendingWord.value })
    if (response?.success && (response.word || response.word_info)) {
      const savedWord = response.word || response.word_info || {}
      await legacyService.saveVideoWordSelection(videoId.value, {
        word_text: savedWord.text || pendingWord.value,
        word_id: savedWord.id || undefined,
        translation: savedWord.translation || savedWord.chinese_translation || currentWordInfo.value?.chinese_translation || ''
      })
      await loadSegmentWords(true)
      await fetchSegmentsSnapshot(true, false)
      ElMessage.success('已添加到单词本')
    } else {
      ElMessage.warning(response?.error || '添加失败')
    }
  } catch (error) {
    if (error?.response?.status === 409) {
      await legacyService.saveVideoWordSelection(videoId.value, {
        word_text: pendingWord.value,
        translation: currentWordInfo.value?.chinese_translation || ''
      })
      await loadSegmentWords(true)
      await fetchSegmentsSnapshot(true, false)
      ElMessage.info('单词已存在，已关联到当前视频')
    } else {
      ElMessage.error(error?.response?.data?.error || '添加单词失败')
    }
  } finally {
    wordActionLoading.value = false
  }
}

function goBack() {
  router.push('/video-history')
}
</script>

<style scoped>
.segment-learning-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head-left h2 {
  margin: 0;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filename {
  color: #606266;
  max-width: 420px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.segment-nav-card {
  margin-bottom: 16px;
}

.segment-nav {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.segment-pill {
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  padding: 10px;
  text-align: left;
  background: #fff;
  cursor: pointer;
}

.segment-pill-title {
  display: block;
  font-weight: 700;
  color: #303133;
}

.segment-pill-meta {
  display: block;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.segment-pill.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.segment-pill.done {
  border-color: #67c23a;
  background: #f0f9eb;
}

.segment-pill.locked {
  opacity: 0.55;
  cursor: not-allowed;
}

.segment-main-card {
  margin-bottom: 16px;
}

.segment-main-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.segment-main-head .left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.segment-title {
  font-size: 16px;
  font-weight: 700;
}

.step-block {
  margin-top: 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 14px;
  background: #fafafa;
}

.step-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
}

.step-actions-row {
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-section h4 {
  margin: 0 0 4px;
}

.summary-section p {
  margin: 0;
  line-height: 1.75;
}

.captions-content {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.compact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  line-height: 1.7;
}

.compact-row.zh {
  margin-top: 10px;
}

.compact-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.compact-ts {
  font-size: 11px;
  color: #909399;
}

.compact-en,
.compact-zh {
  color: #303133;
}

.compact-divider {
  color: #c0c4cc;
}

.word-token {
  display: inline-block;
  border-radius: 4px;
  padding: 0 2px;
  cursor: pointer;
}

.word-token:hover {
  background: #dbeafe;
}

.word-token-picked {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.story-title-form {
  margin-bottom: 12px;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.word-item {
  width: 100%;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 0;
  min-height: 86px;
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

.word-main {
  font-weight: 700;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.word-sub {
  font-size: 12px;
  color: #909399;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.memory-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.memory-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.memory-word {
  min-width: 0;
}

.memory-main {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.memory-sub {
  margin-top: 2px;
  color: #909399;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.memory-actions {
  display: inline-flex;
  gap: 6px;
}

.story-preview {
  margin-top: 14px;
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}

.story-preview-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.story-block h4 {
  margin: 8px 0 4px;
}

.story-block p {
  margin: 0;
  line-height: 1.75;
}

.footer-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.word-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.word-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-section h4 {
  margin: 0 0 4px;
}

:deep(.selected-word-highlight) {
  color: #a16207;
  background: rgba(245, 158, 11, 0.25);
  border-radius: 4px;
  padding: 0 2px;
  font-weight: 700;
}

@media (max-width: 960px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .head-right {
    width: 100%;
    justify-content: space-between;
  }

  .filename {
    max-width: 68vw;
  }
}
</style>


