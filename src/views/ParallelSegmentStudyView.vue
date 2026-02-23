<template>
  <div class="segment-live-page" v-loading="pageLoading">
    <div class="page-header">
      <el-page-header @back="goBack" content="并行片段实时学习" />
      <div v-if="currentJob" class="job-summary">
        <el-tag size="small" type="info">任务 ID: {{ currentJob.id }}</el-tag>
        <el-tag size="small" :type="statusTagType">{{ jobStatusLabel }}</el-tag>
        <span class="progress-text">进度 {{ jobProgress }}%</span>
        <span class="progress-text">片段 {{ segments.length }}</span>
      </div>
    </div>

    <el-alert
      class="hint"
      type="info"
      :closable="false"
      show-icon
      title="先完成先可播：任一片段完成翻译并可播后可立即学习，同一时间仅允许一个片段播放。"
    />

    <div ref="listContainerRef" class="segment-list" @scroll="handleListScroll">
      <div :style="{ height: `${topSpacerHeight}px` }" />
      <el-card
        v-for="segment in visibleSegments"
        :key="segment.id"
        :ref="el => registerSegmentCardRef(segment.id, el)"
        class="segment-card"
        shadow="hover"
      >
        <template #header>
          <div class="segment-header">
            <div class="left">
              <span class="title">片段 {{ (segment.index ?? 0) + 1 }}</span>
              <el-tag size="small" :type="segmentTagType(segment)">{{ segmentStatusLabel(segment) }}</el-tag>
              <el-tag size="small" type="info">{{ formatRange(segment.start_seconds || 0, segment.duration_seconds || 0) }}</el-tag>
            </div>
            <div class="right">
              <el-button
                size="small"
                text
                :disabled="!isSegmentReady(segment)"
                @click="playSegment(segment.id)"
              >
                立即播放
              </el-button>
            </div>
          </div>
        </template>

        <div class="segment-body">
          <div class="video-pane">
            <div v-if="isSegmentReady(segment)" class="video-wrapper">
              <video
                :ref="el => setVideoRef(segment.id, el)"
                class="video"
                :src="segmentPlaybackUrl(segment)"
                controls
                preload="metadata"
                @play="handleVideoPlay(segment.id)"
                @pause="handleVideoPause(segment.id)"
                @timeupdate="event => handleTimeUpdate(segment.id, event)"
              />
              <div class="overlay" v-if="currentCaptionForSegment(segment.id)">
                <div class="overlay-en">
                  <span
                    v-for="token in captionTokens(currentCaptionForSegment(segment.id).transcript_text)"
                    :key="`${segment.id}-${token.id}`"
                    class="overlay-word"
                    @click.stop="handleWordClick(token)"
                  >
                    {{ token.text }}
                  </span>
                </div>
                <div v-if="showTranslation" class="overlay-zh">
                  {{ currentCaptionForSegment(segment.id).translated_text }}
                </div>
              </div>
            </div>
            <div v-else class="video-placeholder">
              <el-empty :description="segmentStatusLabel(segment)" />
              <div v-if="segment.playback_error" class="error-text">{{ segment.playback_error }}</div>
            </div>

            <div class="video-actions">
              <el-switch v-model="showTranslation" active-text="显示翻译" inactive-text="隐藏翻译" />
              <span class="clock">{{ formatClock(currentTimeBySegment[segment.id] || 0) }}</span>
            </div>
          </div>

          <div class="caption-pane">
            <div class="caption-title">实时字幕</div>
            <el-alert
              v-if="segmentHasLowQuality(segment.id)"
              class="caption-quality-alert"
              type="warning"
              :closable="false"
              show-icon
            >
              <template #title>
                <div class="quality-alert-title">
                  <span>该片段时间戳质量较低，可触发重对齐修复。</span>
                  <el-button
                    size="small"
                    type="warning"
                    plain
                    :loading="realignLoading"
                    @click.stop="triggerRealignFix"
                  >
                    立即重对齐
                  </el-button>
                </div>
              </template>
            </el-alert>
            <div v-if="captionLoadingBySegment[segment.id]" class="caption-loading">
              <el-skeleton :rows="4" animated />
            </div>
            <div v-else-if="captionsBySegment(segment.id).length" class="caption-list">
              <div
                v-for="cap in captionsBySegment(segment.id)"
                :key="cap.id"
                class="caption-item"
                :class="{ active: isCaptionActive(segment.id, cap) }"
                @click="seekToCaption(segment.id, cap)"
              >
                <div class="cap-time">{{ formatRange(cap.start_seconds, cap.end_seconds - cap.start_seconds) }}</div>
                <div class="cap-en">{{ cap.transcript_text }}</div>
                <div v-if="cap.timing_quality === 'low'" class="cap-quality">时间轴低置信度</div>
                <div class="cap-words">
                  <span
                    v-for="token in captionTokens(cap.transcript_text)"
                    :key="`${cap.id}-${token.id}`"
                    class="cap-word"
                    @click.stop="handleWordClick(token)"
                  >
                    {{ token.text }}
                  </span>
                </div>
                <div v-if="showTranslation && cap.translated_text" class="cap-zh">{{ cap.translated_text }}</div>
              </div>
            </div>
            <el-empty v-else description="等待该片段字幕" />
          </div>
        </div>
      </el-card>
      <div :style="{ height: `${bottomSpacerHeight}px` }" />
    </div>

    <el-dialog
      v-model="wordDialogVisible"
      title="单词信息"
      width="480px"
      destroy-on-close
    >
      <div v-if="wordDialogLoading">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else-if="currentWordInfo" class="word-dialog-body">
        <div class="word-head">
          <div>
            <h2>{{ currentWordInfo.word }}</h2>
            <p v-if="currentWordInfo.phonetic" class="phonetic">/{{ currentWordInfo.phonetic }}/</p>
            <el-tag v-if="currentWordInfo.part_of_speech" type="info" size="small">{{ currentWordInfo.part_of_speech }}</el-tag>
          </div>
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
        <div class="word-section" v-if="currentWordInfo.example_sentence">
          <h4>示例</h4>
          <p>{{ currentWordInfo.example_sentence }}</p>
        </div>
        <el-alert v-if="savedWord" :closable="false" type="success" :title="`已加入单词本：${savedWord.text}`" show-icon />
      </div>
      <div v-else>
        <el-empty description="未能获取单词信息" />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeWordDialog">关闭</el-button>
          <el-button type="primary" :loading="wordActionLoading" @click="addWordToBook">
            添加到单词本
          </el-button>
          <el-button type="success" :disabled="!savedWord" @click="addWordToSelection">
            放入故事词池
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import apiService from '@/services/api'
import jobService from '@/services/jobService'
import legacyService from '@/services/legacyService'
import { useJobStore } from '@/stores/jobStore'
import { useJobWordStore } from '@/stores/jobWordStore'
import { useSegmentStudyStore } from '@/stores/segmentStudyStore'
import { formatDuration, formatRange as formatRangeUtil, tokenizeWords } from '@/utils/text'

const route = useRoute()
const router = useRouter()

const jobStore = useJobStore()
const segmentStore = useSegmentStudyStore()
const wordStore = useJobWordStore()

const pageLoading = ref(true)
const showTranslation = ref(true)
const listContainerRef = ref(null)

const reconnectTimer = ref(null)
const intersectionObserver = ref(null)

const videoRefs = new Map()
const observedSegmentIds = new Set()
const captionsRequested = new Set()

const captionLoadingBySegment = ref({})
const currentTimeBySegment = ref({})
const wordDialogVisible = ref(false)
const wordDialogLoading = ref(false)
const wordActionLoading = ref(false)
const realignLoading = ref(false)
const currentWordInfo = ref(null)
const pendingWord = ref('')
const savedWord = ref(null)
const wordInfoSource = ref('')

const virtualStart = ref(0)
const virtualEnd = ref(8)
const CARD_EST_HEIGHT = 560
const OVERSCAN = 2

const jobId = computed(() => route.params.jobId)
const currentJob = computed(() => jobStore.currentJob)
const segments = computed(() => segmentStore.orderedSegments)

const jobProgress = computed(() => {
  const progress = currentJob.value?.progress ?? 0
  return Math.min(100, Math.round(progress * 100))
})

const jobStatusLabel = computed(() => {
  switch (currentJob.value?.status) {
    case 'running':
      return '处理中'
    case 'completed':
      return '已完成'
    case 'failed':
      return '失败'
    case 'queued':
      return '排队中'
    default:
      return '未开始'
  }
})

const statusTagType = computed(() => {
  switch (currentJob.value?.status) {
    case 'running':
      return 'warning'
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    case 'queued':
      return 'info'
    default:
      return 'info'
  }
})

const visibleSegments = computed(() => segments.value.slice(virtualStart.value, virtualEnd.value))
const topSpacerHeight = computed(() => Math.max(0, virtualStart.value * CARD_EST_HEIGHT))
const bottomSpacerHeight = computed(() => Math.max(0, (segments.value.length - virtualEnd.value) * CARD_EST_HEIGHT))
const sourceLabel = computed(() => {
  if (!wordInfoSource.value) return '未知来源'
  const map = {
    base_library: '基础词库',
    deepseek_api: 'AI 生成',
    fallback: '兜底生成'
  }
  return map[wordInfoSource.value] || wordInfoSource.value
})

onMounted(async () => {
  try {
    await initialize()
  } finally {
    pageLoading.value = false
  }
})

onBeforeUnmount(() => {
  segmentStore.disconnectStreams()
  pauseAllVideos()
  if (reconnectTimer.value) {
    clearTimeout(reconnectTimer.value)
  }
  if (intersectionObserver.value) {
    intersectionObserver.value.disconnect()
  }
})

async function initialize() {
  const id = jobId.value
  if (!id) {
    ElMessage.error('无法识别任务 ID')
    router.push('/jobs')
    return
  }

  segmentStore.resetState()

  try {
    const [jobDetail, segmentsLive] = await Promise.all([
      jobService.getJob(id),
      jobService.getSegmentsLive(id)
    ])
    jobStore.setJob(jobDetail)
    segmentStore.replaceSegments(segmentsLive || [])
  } catch (error) {
    ElMessage.error('加载任务信息失败')
  }

  connectEventStream()
  startPolling()
  setupIntersectionObserver()
  await nextTick()
  updateVirtualRange()
}

function connectEventStream() {
  segmentStore.disconnectStreams()

  const es = jobService.streamJob(jobId.value)
  segmentStore.attachEventSource(es)

  es.onmessage = event => {
    if (!event?.data || event.data === ': ping') return
    try {
      const payload = JSON.parse(event.data)
      jobStore.applyEvent(payload)
      segmentStore.applyEvent(payload)
      if (payload.type === 'chunk_completed' && Array.isArray(payload.captions) && payload.captions.length) {
        upsertCaptionsFromEvent(payload)
      }
    } catch (error) {
      console.warn('parse stream event failed', error)
    }
  }

  es.onerror = () => {
    es.close()
    segmentStore.attachEventSource(null)
    if (currentJob.value && currentJob.value.status !== 'completed' && currentJob.value.status !== 'failed') {
      reconnectTimer.value = setTimeout(connectEventStream, 2000)
    }
  }
}

function startPolling() {
  if (segmentStore.pollTimer) return
  const timer = setInterval(async () => {
    await refreshSnapshot()
    if (currentJob.value && (currentJob.value.status === 'completed' || currentJob.value.status === 'failed')) {
      clearInterval(timer)
      segmentStore.attachPollTimer(null)
    }
  }, 5000)
  segmentStore.attachPollTimer(timer)
}

async function refreshSnapshot() {
  try {
    const [jobDetail, segmentsLive] = await Promise.all([
      jobService.getJob(jobId.value),
      jobService.getSegmentsLive(jobId.value)
    ])
    jobStore.setJob(jobDetail)
    segmentStore.replaceSegments(segmentsLive || [])

    const ids = [...observedSegmentIds]
    if (ids.length) {
      await Promise.all(ids.map(id => loadSegmentCaptions(id, true)))
    }
  } catch (error) {
    console.warn('refresh snapshot failed', error)
  }
}

function setupIntersectionObserver() {
  intersectionObserver.value = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const segmentId = entry.target?.dataset?.segmentId
        if (!segmentId) return
        observedSegmentIds.add(segmentId)
        loadSegmentCaptions(segmentId)
      })
    },
    {
      root: listContainerRef.value,
      rootMargin: '120px 0px 120px 0px',
      threshold: 0.05
    }
  )
}

function registerSegmentCardRef(segmentId, cardInstance) {
  if (!segmentId || !intersectionObserver.value) return

  let el = null
  if (cardInstance?.$el) {
    el = cardInstance.$el
  } else if (cardInstance instanceof HTMLElement) {
    el = cardInstance
  }

  if (!el) return
  el.dataset.segmentId = segmentId
  intersectionObserver.value.observe(el)
}

async function loadSegmentCaptions(segmentId, force = false) {
  if (!segmentId) return
  if (!force && captionsRequested.has(segmentId)) return

  captionsRequested.add(segmentId)
  captionLoadingBySegment.value = { ...captionLoadingBySegment.value, [segmentId]: true }

  try {
    const rows = await jobService.getSegmentCaptions(segmentId, true)
    segmentStore.setSegmentCaptions(
      segmentId,
      (rows || []).map(item => normalizeCaptionForSegment(item, segmentId))
    )
  } catch (error) {
    console.warn(`load segment captions failed: ${segmentId}`, error)
  } finally {
    captionLoadingBySegment.value = { ...captionLoadingBySegment.value, [segmentId]: false }
  }
}

function upsertCaptionsFromEvent(payload) {
  const segmentId = payload.segment_id
  if (!segmentId || !observedSegmentIds.has(segmentId)) return

  const mapped = payload.captions.map(item => normalizeCaptionForSegment(item, segmentId, payload))
  segmentStore.upsertSegmentCaptions(segmentId, mapped)
}

function normalizeCaptionForSegment(caption, segmentId, payload = null) {
  const segment = segmentStore.segmentsLive.find(item => item.id === segmentId)
  const segmentBase = Number(
    payload?.segment_start_seconds ?? segment?.start_seconds ?? 0
  )
  const sourceDomain = String(
    caption?.time_domain || payload?.time_domain || 'absolute'
  ).toLowerCase()

  let start = Number(caption?.start_seconds || 0)
  let end = Number(caption?.end_seconds || 0)
  if (sourceDomain === 'absolute') {
    start = Math.max(0, start - segmentBase)
    end = Math.max(start, end - segmentBase)
  } else {
    start = Math.max(0, start)
    end = Math.max(start, end)
  }

  return {
    ...caption,
    start_seconds: start,
    end_seconds: end,
    time_domain: 'relative'
  }
}

function captionsBySegment(segmentId) {
  return segmentStore.segmentCaptionsMap[segmentId] || []
}

function segmentHasLowQuality(segmentId) {
  const list = captionsBySegment(segmentId)
  return list.some(item => item?.timing_quality === 'low')
}

async function triggerRealignFix() {
  if (!jobId.value) return
  realignLoading.value = true
  try {
    await jobService.triggerRealign(jobId.value)
    ElMessage.success('已触发重对齐任务，稍后将自动刷新字幕')
    await refreshSnapshot()
  } catch (error) {
    const message = error?.response?.data?.detail || error?.message || '触发重对齐失败'
    ElMessage.error(message)
  } finally {
    realignLoading.value = false
  }
}

function isSegmentReady(segment) {
  return segment?.status === 'completed' && segment?.playback_status === 'ready'
}

function segmentStatusLabel(segment) {
  if (segment.status === 'failed') return '处理失败'
  if (segment.playback_status === 'failed') return '可播准备失败'
  if (isSegmentReady(segment)) return '可播放'
  if (segment.playback_status === 'preparing') return '转码中'
  if (segment.status === 'running') return '处理中'
  if (segment.status === 'queued') return '排队中'
  return '处理中'
}

function segmentTagType(segment) {
  if (segment.status === 'failed' || segment.playback_status === 'failed') return 'danger'
  if (isSegmentReady(segment)) return 'success'
  if (segment.status === 'queued') return 'info'
  return 'warning'
}

function segmentPlaybackUrl(segment) {
  if (!segment?.id) return ''
  return jobService.segmentPlaybackUrl(segment.id)
}

function setVideoRef(segmentId, el) {
  if (!segmentId) return
  if (el) {
    videoRefs.set(segmentId, el)
  } else {
    videoRefs.delete(segmentId)
  }
}

function handleVideoPlay(segmentId) {
  if (!segmentId) return
  const activeId = segmentStore.activePlayerSegmentId
  if (activeId && activeId !== segmentId) {
    const prev = videoRefs.get(activeId)
    if (prev && !prev.paused) {
      prev.pause()
    }
  }
  segmentStore.setActivePlayer(segmentId)
}

function handleVideoPause(segmentId) {
  if (segmentStore.activePlayerSegmentId === segmentId) {
    segmentStore.setActivePlayer(null)
  }
}

function handleTimeUpdate(segmentId, event) {
  const value = event?.target?.currentTime || 0
  currentTimeBySegment.value = {
    ...currentTimeBySegment.value,
    [segmentId]: value
  }
}

function currentCaptionForSegment(segmentId) {
  const list = captionsBySegment(segmentId)
  if (!list.length) return null
  const current = Number(currentTimeBySegment.value[segmentId] || 0)

  let left = 0
  let right = list.length - 1
  let candidate = -1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if ((list[mid].start_seconds || 0) <= current) {
      candidate = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  if (candidate < 0) return null
  const row = list[candidate]
  if (current >= row.start_seconds && current < row.end_seconds) {
    return row
  }
  const next = list[candidate + 1]
  if (next && current >= next.start_seconds && current < next.end_seconds) {
    return next
  }
  return null
}

function isCaptionActive(segmentId, caption) {
  const current = currentCaptionForSegment(segmentId)
  return Boolean(current && caption && current.id === caption.id)
}

function seekToCaption(segmentId, caption) {
  if (!caption) return
  const video = videoRefs.get(segmentId)
  if (!video) {
    ElMessage.info('片段视频尚未加载完成')
    return
  }
  video.currentTime = Number(caption.start_seconds || 0)
  video.play().catch(() => {})
}

function playSegment(segmentId) {
  const video = videoRefs.get(segmentId)
  if (!video) {
    ElMessage.info('片段视频尚未加载完成')
    return
  }
  video.play().catch(() => {})
}

function pauseAllVideos() {
  videoRefs.forEach(video => {
    if (video && !video.paused) {
      video.pause()
    }
  })
}

function handleListScroll() {
  updateVirtualRange()
}

function updateVirtualRange() {
  const container = listContainerRef.value
  if (!container) {
    virtualStart.value = 0
    virtualEnd.value = Math.min(segments.value.length, 8)
    return
  }

  const scrollTop = container.scrollTop || 0
  const viewportHeight = container.clientHeight || 0
  const start = Math.max(0, Math.floor(scrollTop / CARD_EST_HEIGHT) - OVERSCAN)
  const visibleCount = Math.max(6, Math.ceil(viewportHeight / CARD_EST_HEIGHT) + OVERSCAN * 2)
  const end = Math.min(segments.value.length, start + visibleCount)

  virtualStart.value = start
  virtualEnd.value = Math.max(start, end)
}

function formatClock(seconds) {
  return formatDuration(seconds)
}

function formatRange(start, duration) {
  return formatRangeUtil(start, duration)
}

function captionTokens(text) {
  return tokenizeWords(text || '')
}

function handleWordClick(token) {
  if (!token?.normalized) return
  lookupWord(token.normalized)
}

async function lookupWord(word) {
  pendingWord.value = word
  wordDialogVisible.value = true
  wordDialogLoading.value = true
  wordInfoSource.value = ''
  savedWord.value = null
  currentWordInfo.value = null
  try {
    const response = await legacyService.getWordInfo(word)
    if (response.success && response.word_info) {
      currentWordInfo.value = response.word_info
      wordInfoSource.value = response.source || response.word_info.source || 'unknown'
    } else {
      ElMessage.warning(response.error || '未能获取单词信息')
    }
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || '获取单词信息失败'
    ElMessage.error(message)
  } finally {
    wordDialogLoading.value = false
  }
}

async function addWordToBook() {
  if (!pendingWord.value) {
    ElMessage.warning('没有可添加的单词')
    return
  }
  wordActionLoading.value = true
  try {
    const normalizedWord = String(pendingWord.value || '').trim().toLowerCase()
    const fallbackTranslation = String(currentWordInfo.value?.chinese_translation || '').trim()
    const response = await legacyService.addWordWithInfo({ text: pendingWord.value })
    let resolvedWord = null

    if (response.success && response.word) {
      resolvedWord = response.word
      savedWord.value = response.word
      ElMessage.success(`已加入单词本：${response.word.text}`)
    } else if (response.success && response.word_info) {
      ElMessage.success('单词信息已更新')
    } else {
      ElMessage.warning(response.error || '未能添加到单词本')
      return
    }

    // 双保险：确保写入“个人单词本”（auth required），避免落到匿名词库。
    if (normalizedWord) {
      try {
        const ensured = await apiService.addUserWord(
          normalizedWord,
          String((resolvedWord?.translation || fallbackTranslation || normalizedWord)).trim() || normalizedWord
        )
        if (ensured && ensured.id) {
          resolvedWord = ensured
          savedWord.value = {
            ...(savedWord.value || {}),
            ...ensured,
            text: ensured.text || normalizedWord
          }
        }
      } catch (ensureError) {
        if (ensureError?.response?.status !== 409) {
          console.warn('ensure user word failed', ensureError?.response?.data || ensureError?.message)
        }
      }
    }

    // 并行学习页也写入当前视频词关联，便于后续“视频单词/视频故事/片段学习”直接可见。
    if (jobId.value) {
      try {
        await legacyService.saveVideoWordSelection(jobId.value, {
          word_text: normalizedWord || (savedWord.value?.text || pendingWord.value),
          word_id: Number(savedWord.value?.id || resolvedWord?.id || 0) || undefined,
          translation:
            String(
              savedWord.value?.translation ||
              resolvedWord?.translation ||
              currentWordInfo.value?.chinese_translation ||
              ''
            ).trim()
        })
      } catch (selectionError) {
        if (selectionError?.response?.status !== 404) {
          console.warn('save video word selection failed', selectionError?.response?.data || selectionError?.message)
        }
      }
    }
  } catch (error) {
    if (error?.response?.status === 409) {
      const existing = error.response.data?.word
      if (existing) {
        savedWord.value = existing
        ElMessage.info(`单词已存在：${existing.text}`)
      } else {
        ElMessage.info('单词已存在于单词本')
      }
      if (jobId.value) {
        try {
          await legacyService.saveVideoWordSelection(jobId.value, {
            word_text: String(pendingWord.value || '').trim().toLowerCase(),
            word_id: Number(savedWord.value?.id || existing?.id || 0) || undefined,
            translation:
              String(
                savedWord.value?.translation ||
                existing?.translation ||
                currentWordInfo.value?.chinese_translation ||
                ''
              ).trim()
          })
        } catch (selectionError) {
          if (selectionError?.response?.status !== 404) {
            console.warn('save video word selection on conflict failed', selectionError?.response?.data || selectionError?.message)
          }
        }
      }
    } else {
      const message = error?.response?.data?.error || error?.message || '添加失败'
      ElMessage.error(message)
    }
  } finally {
    wordActionLoading.value = false
  }
}

function addWordToSelection() {
  if (savedWord.value) {
    wordStore.addToSelection(savedWord.value)
    ElMessage.success(`已放入故事候选：${savedWord.value.text}`)
  } else if (currentWordInfo.value?.word) {
    wordStore.addToSelection({ id: currentWordInfo.value.word, text: currentWordInfo.value.word })
    ElMessage.success(`已放入故事候选：${currentWordInfo.value.word}`)
  }
}

function closeWordDialog() {
  wordDialogVisible.value = false
  savedWord.value = null
  pendingWord.value = ''
}

function goBack() {
  if (route.query.source === 'history') {
    router.push('/video-history')
    return
  }
  router.push('/jobs')
}
</script>

<style scoped>
.segment-live-page {
  padding: 18px 14px 28px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.job-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.progress-text {
  color: #334155;
  font-size: 13px;
}

.hint {
  margin-bottom: 12px;
}

.segment-list {
  height: calc(100vh - 220px);
  overflow-y: auto;
  padding-right: 6px;
}

.segment-card {
  margin-bottom: 12px;
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.segment-header .left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.segment-header .title {
  font-weight: 600;
  color: #0f172a;
}

.segment-body {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 14px;
}

.video-pane,
.caption-pane {
  min-width: 0;
}

.video-wrapper {
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.video {
  width: 100%;
  display: block;
  max-height: 340px;
}

.overlay {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  background: rgba(2, 6, 23, 0.82);
  color: #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  pointer-events: none;
}

.overlay-en {
  font-weight: 600;
}

.overlay-word {
  pointer-events: auto;
  display: inline-block;
  margin-right: 6px;
  cursor: pointer;
}

.overlay-word:hover {
  text-decoration: underline;
}

.overlay-zh {
  margin-top: 4px;
  color: #d1fae5;
}

.video-placeholder {
  min-height: 240px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 12px;
}

.error-text {
  color: #dc2626;
  font-size: 12px;
}

.video-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.clock {
  color: #475569;
  font-size: 13px;
}

.caption-title {
  margin-bottom: 8px;
  color: #0f172a;
  font-weight: 600;
}

.caption-quality-alert {
  margin-bottom: 8px;
}

.quality-alert-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.caption-list {
  height: 330px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px;
}

.caption-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.caption-item:last-child {
  margin-bottom: 0;
}

.caption-item.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
}

.cap-time {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.cap-en {
  font-weight: 600;
  color: #1e293b;
}

.cap-quality {
  margin-top: 4px;
  font-size: 12px;
  color: #b45309;
}

.cap-words {
  margin-top: 6px;
}

.cap-word {
  display: inline-block;
  margin-right: 6px;
  margin-bottom: 4px;
  padding: 1px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  font-size: 12px;
  color: #334155;
}

.cap-word:hover {
  border-color: #2563eb;
  color: #1d4ed8;
}

.cap-zh {
  margin-top: 4px;
  color: #334155;
}

.word-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.word-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.phonetic {
  margin: 4px 0;
  color: #475569;
}

.word-section h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #1e293b;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 1024px) {
  .segment-body {
    grid-template-columns: 1fr;
  }

  .segment-list {
    height: auto;
    max-height: none;
  }
}
</style>
