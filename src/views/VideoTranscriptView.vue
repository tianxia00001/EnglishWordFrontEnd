<template>
  <div class="transcript-page" v-loading="pageLoading">
    <div class="top-bar">
      <el-page-header @back="goBack" content="视频字幕" />
      <div class="top-actions">
        <el-select
          v-if="segments.length"
          v-model="selectedSegmentId"
          size="small"
          style="width: 180px"
          placeholder="筛选片段"
        >
          <el-option label="全部片段" value="all" />
          <el-option
            v-for="segment in segments"
            :key="segment.id"
            :label="segment.title"
            :value="segment.id"
          />
        </el-select>
        <el-switch v-model="showChinese" active-text="显示中文" inactive-text="隐藏中文" />
      </div>
    </div>

    <el-card class="word-meaning-card" shadow="never">
      <div class="word-meaning-toolbar">
        <div class="left">
          <span class="panel-title">单词本释义联动</span>
          <span class="panel-meta">当前视频已加入 {{ videoWordItems.length }} 个</span>
        </div>
        <el-switch
          v-model="showSelectedWordMeanings"
          :disabled="!videoWordItems.length"
          active-text="显示单词含义"
          inactive-text="隐藏单词含义"
        />
      </div>
      <div v-if="videoWordItems.length" class="word-grid">
        <button
          v-for="item in videoWordItems"
          :key="item.word"
          type="button"
          :class="['word-card', { active: activeWord === item.word }]"
          @click="jumpToWord(item.word)"
        >
          <span class="word-main">{{ item.word }}</span>
          <span v-if="showSelectedWordMeanings" class="word-sub">{{ item.meaning || '—' }}</span>
        </button>
      </div>
      <el-empty v-else description="当前视频还没有加入单词本的单词" />
      <div class="panel-tip">
        点击单词可跳转到字幕首次出现位置并联动播放。
      </div>
    </el-card>

    <div v-if="filteredSegments.length" class="segment-list">
      <el-card
        v-for="segment in filteredSegments"
        :key="segment.id"
        class="segment-card"
        shadow="hover"
      >
        <template #header>
          <div class="segment-header">
            <div class="left">
              <span class="segment-title">{{ segment.title }}</span>
              <el-tag size="small" type="info">{{ formatRange(segment.start, segment.end - segment.start) }}</el-tag>
              <el-tag size="small" type="success">{{ segment.captions.length }} 条</el-tag>
            </div>
          </div>
        </template>

        <div v-if="segment.captions.length" class="caption-list">
          <div
            v-for="caption in segment.captions"
            :id="`caption-row-${caption.id}`"
            :key="caption.id"
            :class="['caption-row', { 'caption-row-focus': activeCaptionId === caption.id }]"
          >
            <div class="timestamp-col" @click="seekToTimestamp(caption.start)">
              <div class="ts-main">{{ formatRange(caption.start, caption.end - caption.start) }}</div>
              <div v-if="isSegmented" class="ts-sub">片段内 {{ formatRange(caption.relativeStart, caption.relativeEnd - caption.relativeStart) }}</div>
            </div>
            <div class="text-col">
              <div class="en-line">
                <template v-for="part in splitTextParts(caption.english)" :key="part.key">
                  <template v-if="part.type === 'word'">
                    <span
                      :class="['word-token', { 'word-token-picked': isVideoWordHighlighted(part.normalized) }]"
                      @click.stop="handleWordClick(part.normalized)"
                    >
                      {{ part.text }}
                    </span>
                  </template>
                  <span v-else>{{ part.text }}</span>
                </template>
              </div>
              <div v-if="showChinese && caption.chinese" class="zh-line">
                {{ caption.chinese }}
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else description="该片段暂无字幕" />
      </el-card>
    </div>

    <el-empty v-else description="暂无字幕数据" />

    <transition name="fab-fade">
      <el-button
        v-if="!playerVisible"
        class="player-fab"
        type="primary"
        round
        @click="openPlayer"
      >
        打开播放器
      </el-button>
    </transition>

    <el-backtop :right="22" :bottom="86" class="top-back-button">
      <div class="top-back-inner">
        <el-icon><Top /></el-icon>
      </div>
    </el-backtop>

    <transition name="floating-player">
      <div
        v-show="playerVisible"
        :class="['floating-player', { mobile: isMobile }]"
      >
        <div class="floating-player-header">
          <div class="title">联动播放</div>
          <div class="actions">
            <el-tag
              v-if="!isMobile"
              size="small"
              type="info"
            >
              点击时间戳可跳转
            </el-tag>
            <el-button text size="small" @click="closePlayer">关闭</el-button>
          </div>
        </div>
        <div v-if="videoUrl" class="player-wrapper">
          <video
            ref="videoRef"
            class="player"
            :src="videoUrl"
            controls
            preload="metadata"
            @loadedmetadata="handleVideoLoadedMetadata"
            @error="handleVideoError"
          />
        </div>
        <el-empty v-else :description="videoPlaceholderText" />
      </div>
    </transition>

    <el-dialog
      v-model="wordDialogVisible"
      title="单词信息"
      width="500px"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Top } from '@element-plus/icons-vue'

import apiService from '@/services/api'
import jobService from '@/services/jobService'
import legacyService from '@/services/legacyService'
import { useJobWordStore } from '@/stores/jobWordStore'
import { formatRange as formatRangeUtil } from '@/utils/text'

const route = useRoute()
const router = useRouter()
const wordStore = useJobWordStore()

const pageLoading = ref(false)
const showChinese = ref(true)
const segments = ref([])
const isSegmented = ref(false)
const selectedSegmentId = ref('all')
const loadedFromJob = ref(false)

const videoRef = ref(null)
const videoUrl = ref('')
const videoPreparing = ref(false)
const videoError = ref('')
const pendingSeekTime = ref(null)
const videoStatusTimer = ref(null)
const playerVisible = ref(false)
const isMobile = ref(false)

const wordDialogVisible = ref(false)
const wordDialogLoading = ref(false)
const wordActionLoading = ref(false)
const currentWordInfo = ref(null)
const pendingWord = ref('')
const savedWord = ref(null)
const wordInfoSource = ref('')
const videoWordItems = ref([])
const wordFirstStartMap = ref(new Map())
const wordFirstCaptionIdMap = ref(new Map())
const wordFirstSegmentIdMap = ref(new Map())
const showSelectedWordMeanings = ref(false)
const activeWord = ref('')
const activeCaptionId = ref(null)

const videoId = computed(() => route.params.videoId || route.query.videoId || '')
const filteredSegments = computed(() => {
  if (selectedSegmentId.value === 'all') return segments.value
  return segments.value.filter(item => item.id === selectedSegmentId.value)
})
const videoPlaceholderText = computed(() => {
  if (videoError.value) return videoError.value
  if (videoPreparing.value) return '视频准备中，请稍候...'
  return '未能获取视频播放地址'
})
const sourceLabel = computed(() => {
  if (!wordInfoSource.value) return '未知来源'
  const map = {
    base_library: '基础词库',
    deepseek_api: 'AI 生成',
    fallback: '兜底生成'
  }
  return map[wordInfoSource.value] || wordInfoSource.value
})
const videoWordLookup = computed(() => {
  const map = new Map()
  for (const item of videoWordItems.value) {
    map.set(item.word, item)
  }
  return map
})

watch(videoId, () => {
  loadTranscript()
})

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  loadTranscript()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
  if (videoStatusTimer.value) {
    clearTimeout(videoStatusTimer.value)
    videoStatusTimer.value = null
  }
})

async function loadTranscript() {
  const id = String(videoId.value || '').trim()
  if (!id) {
    ElMessage.error('缺少视频 ID')
    return
  }

  pageLoading.value = true
  segments.value = []
  selectedSegmentId.value = 'all'
  isSegmented.value = false
  loadedFromJob.value = false
  videoUrl.value = ''
  videoPreparing.value = false
  videoError.value = ''
  pendingSeekTime.value = null
  playerVisible.value = false
  videoWordItems.value = []
  wordFirstStartMap.value = new Map()
  wordFirstCaptionIdMap.value = new Map()
  wordFirstSegmentIdMap.value = new Map()
  showSelectedWordMeanings.value = false
  activeWord.value = ''
  activeCaptionId.value = null

  try {
    loadedFromJob.value = await tryLoadJobTranscript(id)
    if (!loadedFromJob.value) {
      await loadLegacyTranscript(id)
    }
    rebuildWordFirstStartMap()
    await loadVideoWordSelections(id)
    await loadVideoSource(id)

    if (!segments.value.length) {
      ElMessage.warning('该视频暂无字幕数据')
    }
  } catch (error) {
    const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || '加载字幕失败'
    ElMessage.error(message)
  } finally {
    pageLoading.value = false
  }
}

async function loadVideoSource(id) {
  if (!id) return

  if (loadedFromJob.value) {
    try {
      const status = await jobService.getJobVideoStatus(id)
      if (status?.ready) {
        videoUrl.value = jobService.jobVideoUrl(id)
        videoPreparing.value = false
        videoError.value = ''
        return
      }
      if (status?.status === 'failed') {
        videoError.value = status?.error || '视频转码失败'
        videoPreparing.value = false
      } else {
        videoPreparing.value = true
        videoError.value = ''
        scheduleVideoStatusRefresh(id)
      }
    } catch (_error) {
      // fallback below
    }
  }

  try {
    const signed = await apiService.getVideoSignedUrl(id)
    if (signed?.success && signed?.url) {
      videoUrl.value = signed.url
      videoPreparing.value = false
      videoError.value = ''
      return
    }
  } catch (_error) {
    // ignore and show placeholder
  }

  if (!videoUrl.value && !videoPreparing.value) {
    videoError.value = '视频地址获取失败'
  }
}

function scheduleVideoStatusRefresh(id) {
  if (videoStatusTimer.value) return
  videoStatusTimer.value = setTimeout(async () => {
    videoStatusTimer.value = null
    await loadVideoSource(id)
  }, 3000)
}

function handleVideoLoadedMetadata() {
  if (pendingSeekTime.value == null || !videoRef.value) return
  const t = Math.max(0, Number(pendingSeekTime.value) || 0)
  videoRef.value.currentTime = t
  pendingSeekTime.value = null
}

function handleVideoError() {
  if (loadedFromJob.value) {
    videoPreparing.value = true
    scheduleVideoStatusRefresh(String(videoId.value || ''))
    return
  }
  videoError.value = '视频播放失败'
}

async function seekToTimestamp(seconds) {
  await openPlayerAndSeek(seconds)
}

function syncViewport() {
  if (typeof window === 'undefined') return
  isMobile.value = window.innerWidth <= 900
}

async function openPlayer() {
  playerVisible.value = true
  const id = String(videoId.value || '')
  if (!videoUrl.value && !videoPreparing.value && id) {
    await loadVideoSource(id)
  }
}

function closePlayer() {
  playerVisible.value = false
}

async function openPlayerAndSeek(seconds) {
  const target = Math.max(0, Number(seconds) || 0)
  pendingSeekTime.value = target
  playerVisible.value = true

  if (!videoUrl.value) {
    await loadVideoSource(String(videoId.value || ''))
  }

  if (videoPreparing.value) {
    ElMessage.info('视频还在准备中，准备完成后会自动跳转')
    return
  }

  if (!videoRef.value) {
    ElMessage.info('视频尚未加载完成')
    return
  }

  try {
    videoRef.value.currentTime = target
    await videoRef.value.play()
    pendingSeekTime.value = null
  } catch (_error) {
    ElMessage.info('已记录跳转时间，等待视频可播放')
  }
}

async function tryLoadJobTranscript(id) {
  try {
    await jobService.getJob(id)
  } catch (_error) {
    return false
  }

  const [segmentRows, captionRows] = await Promise.all([
    jobService.getSegments(id),
    jobService.getCaptions(id)
  ])

  if (!Array.isArray(segmentRows) || segmentRows.length === 0) {
    return false
  }

  const captions = (captionRows || []).map(item => ({
    id: item.id,
    segmentId: item.segment_id,
    start: Number(item.start_seconds) || 0,
    end: Number(item.end_seconds) || (Number(item.start_seconds) || 0),
    english: item.transcript_text || '',
    chinese: item.translated_text || ''
  }))

  if (!captions.length) {
    const fallback = await fetchLegacySubtitleRows(id)
    if (fallback.length) {
      const mapped = fallback.map(item => ({ ...item, segmentId: null }))
      segments.value = buildSegments(segmentRows, mapped)
      isSegmented.value = segmentRows.length > 1
      return true
    }
  }

  segments.value = buildSegments(segmentRows, captions)
  isSegmented.value = segmentRows.length > 1
  return true
}

async function loadLegacyTranscript(id) {
  const rows = await fetchLegacySubtitleRows(id)
  if (!rows.length) {
    segments.value = []
    isSegmented.value = false
    return
  }

  const maxEnd = rows.reduce((max, item) => Math.max(max, item.end), 0)
  segments.value = [
    {
      id: `legacy-${id}`,
      title: '完整字幕',
      start: 0,
      end: maxEnd,
      captions: rows.map(item => ({
        ...item,
        relativeStart: item.start,
        relativeEnd: item.end
      }))
    }
  ]
  isSegmented.value = false
}

async function fetchLegacySubtitleRows(id) {
  const data = await apiService.getVideoSubtitles(id)
  const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
  return rows.map(item => ({
    id: item.id,
    start: Number(item.startTime ?? item.start_time ?? 0) || 0,
    end: Number(item.endTime ?? item.end_time ?? 0) || 0,
    english: item.englishText ?? item.english_text ?? '',
    chinese: item.chineseText ?? item.chinese_text ?? ''
  }))
}

function buildSegments(segmentRows, captionRows) {
  const sortedSegments = [...segmentRows].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  const normalized = []
  const byId = new Map()
  let offset = 0

  for (const row of sortedSegments) {
    const startRaw = Number(row.start_seconds)
    const start = Number.isFinite(startRaw) ? startRaw : offset
    const duration = Number(row.duration_seconds) || 0
    const end = start + Math.max(0, duration)
    const segment = {
      id: row.id,
      index: row.index ?? normalized.length,
      title: `片段 ${(row.index ?? normalized.length) + 1}`,
      start,
      end,
      captions: []
    }
    normalized.push(segment)
    byId.set(segment.id, segment)
    offset = Math.max(offset, end)
  }

  const sortedCaptions = [...captionRows].sort((a, b) => a.start - b.start)
  for (const item of sortedCaptions) {
    let target = null
    if (item.segmentId && byId.has(item.segmentId)) {
      target = byId.get(item.segmentId)
    }

    if (!target) {
      target = normalized.find(seg => item.start >= seg.start && item.start < (seg.end || Number.MAX_SAFE_INTEGER))
    }

    if (!target) {
      target = normalized[normalized.length - 1]
    }

    if (!target) {
      continue
    }

    target.captions.push({
      ...item,
      relativeStart: Math.max(0, item.start - target.start),
      relativeEnd: Math.max(0, item.end - target.start)
    })
  }

  for (const segment of normalized) {
    segment.captions.sort((a, b) => a.start - b.start)
  }

  return normalized
}

function normalizeWordValue(word) {
  return String(word || '').trim().toLowerCase()
}

function rebuildWordFirstStartMap() {
  const map = new Map()
  const captionMap = new Map()
  const segmentMap = new Map()
  const regex = /[A-Za-z][A-Za-z'-]*/g

  for (const segment of segments.value) {
    for (const caption of segment.captions || []) {
      const source = String(caption.english || '')
      for (const match of source.matchAll(regex)) {
        const normalized = normalizeWordValue(match[0])
        if (!normalized || map.has(normalized)) continue
        map.set(normalized, Number(caption.start) || 0)
        captionMap.set(normalized, caption.id)
        segmentMap.set(normalized, segment.id)
      }
    }
  }
  wordFirstStartMap.value = map
  wordFirstCaptionIdMap.value = captionMap
  wordFirstSegmentIdMap.value = segmentMap
}

async function loadVideoWordSelections(id) {
  try {
    const response = await legacyService.listVideoWordSelections(id)
    const rows = Array.isArray(response?.items)
      ? response.items
      : (Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []))
    const dedup = new Map()
    for (const row of rows) {
      const normalized = normalizeWordValue(row?.word_text || row?.word)
      if (!normalized || dedup.has(normalized)) continue
      dedup.set(normalized, {
        word: normalized,
        meaning: String(row?.translation || '').trim(),
        firstStart: Number(wordFirstStartMap.value.get(normalized)),
        firstCaptionId: wordFirstCaptionIdMap.value.get(normalized) ?? null,
        firstSegmentId: wordFirstSegmentIdMap.value.get(normalized) ?? null
      })
    }
    videoWordItems.value = [...dedup.values()]
  } catch (error) {
    console.warn('加载视频单词清单失败:', error)
    videoWordItems.value = []
  }
}

function upsertVideoWordItem(word, meaning = '') {
  const normalized = normalizeWordValue(word)
  if (!normalized) return
  const byWord = new Map(videoWordItems.value.map(item => [item.word, item]))
  const existing = byWord.get(normalized)
  byWord.set(normalized, {
    word: normalized,
    meaning: String(meaning || existing?.meaning || '').trim(),
    firstStart: Number(wordFirstStartMap.value.get(normalized)),
    firstCaptionId: wordFirstCaptionIdMap.value.get(normalized) ?? null,
    firstSegmentId: wordFirstSegmentIdMap.value.get(normalized) ?? null
  })
  videoWordItems.value = [...byWord.values()]
}

function isVideoWordHighlighted(word) {
  return videoWordLookup.value.has(normalizeWordValue(word))
}

async function scrollToCaptionRow(captionId) {
  if (!captionId) return
  await nextTick()
  const element = document.getElementById(`caption-row-${captionId}`)
  if (!element) return
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function jumpToWord(word) {
  const normalized = normalizeWordValue(word)
  const target = videoWordLookup.value.get(normalized)
  if (!target) return

  activeWord.value = normalized
  activeCaptionId.value = target.firstCaptionId || null

  if (target.firstSegmentId && selectedSegmentId.value !== 'all' && selectedSegmentId.value !== target.firstSegmentId) {
    selectedSegmentId.value = target.firstSegmentId
  }
  await scrollToCaptionRow(target.firstCaptionId)

  if (!Number.isFinite(target.firstStart)) {
    ElMessage.info('该词在当前字幕中未找到可跳转位置')
    return
  }
  await openPlayerAndSeek(target.firstStart)
}

async function saveVideoWordSelectionForCurrentVideo(word, wordId = null, translation = '') {
  const id = String(videoId.value || '').trim()
  const normalized = normalizeWordValue(word)
  if (!id || !normalized) return

  try {
    const response = await legacyService.saveVideoWordSelection(id, {
      word_text: normalized,
      word_id: wordId ?? undefined,
      translation: translation || undefined
    })
    const item = response?.item
    upsertVideoWordItem(
      item?.word_text || normalized,
      item?.translation || translation
    )
  } catch (error) {
    console.warn('保存视频单词关联失败:', error)
  }
}

function splitTextParts(text) {
  const source = String(text || '')
  if (!source) return [{ type: 'text', text: '', key: 'empty' }]

  const regex = /[A-Za-z][A-Za-z'-]*/g
  const parts = []
  let cursor = 0
  let index = 0

  for (const match of source.matchAll(regex)) {
    const word = match[0]
    const start = match.index ?? 0
    if (start > cursor) {
      parts.push({ type: 'text', text: source.slice(cursor, start), key: `t-${index++}` })
    }
    parts.push({
      type: 'word',
      text: word,
      normalized: word.toLowerCase(),
      key: `w-${index++}`
    })
    cursor = start + word.length
  }

  if (cursor < source.length) {
    parts.push({ type: 'text', text: source.slice(cursor), key: `t-${index++}` })
  }

  return parts
}

function formatRange(start, duration) {
  return formatRangeUtil(start, duration)
}

function handleWordClick(word) {
  if (!word) return
  lookupWord(word)
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
    const response = await legacyService.addWordWithInfo({ text: pendingWord.value })
    if (response.success && response.word) {
      savedWord.value = response.word
      await saveVideoWordSelectionForCurrentVideo(
        response.word.text || pendingWord.value,
        response.word.id || null,
        response.word.translation || response.word.chinese_translation || response.word_info?.chinese_translation || currentWordInfo.value?.chinese_translation || ''
      )
      ElMessage.success(`已加入单词本：${response.word.text}`)
    } else if (response.success && response.word_info) {
      await saveVideoWordSelectionForCurrentVideo(
        pendingWord.value,
        null,
        response.word_info.chinese_translation || currentWordInfo.value?.chinese_translation || ''
      )
      ElMessage.success('单词信息已更新')
    } else {
      ElMessage.warning(response.error || '未能添加到单词本')
    }
  } catch (error) {
    if (error?.response?.status === 409) {
      const existing = error.response.data?.word
      if (existing) {
        savedWord.value = existing
        await saveVideoWordSelectionForCurrentVideo(
          existing.text || pendingWord.value,
          existing.id || null,
          existing.translation || existing.chinese_translation || currentWordInfo.value?.chinese_translation || ''
        )
        ElMessage.info(`单词已存在：${existing.text}`)
      } else {
        await saveVideoWordSelectionForCurrentVideo(
          pendingWord.value,
          null,
          currentWordInfo.value?.chinese_translation || ''
        )
        ElMessage.info('单词已存在于单词本')
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
    return
  }

  if (currentWordInfo.value?.word) {
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
  router.push('/video-subtitles')
}
</script>

<style scoped>
.transcript-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 14px 220px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.word-meaning-card {
  margin-bottom: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.player-wrapper {
  background: #000;
  border-radius: 10px;
  overflow: hidden;
}

.player {
  width: 100%;
  max-height: 52vh;
}

.word-meaning-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.word-meaning-toolbar .left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panel-title {
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.panel-meta {
  color: #64748b;
  font-size: 12px;
}

.panel-tip {
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}

.word-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.word-card {
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: #ffffff;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.word-card:hover {
  border-color: #60a5fa;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
}

.word-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.word-main {
  display: block;
  color: #0f172a;
  font-weight: 700;
  line-height: 1.35;
}

.word-sub {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
}

.segment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.segment-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.caption-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.caption-row {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
}

.caption-row-focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.16);
}

.timestamp-col {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.timestamp-col:hover {
  border-color: #93c5fd;
  background: #f0f9ff;
}

.ts-main {
  color: #64748b;
  font-weight: 500;
  font-size: 12px;
}

.ts-sub {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 11px;
}

.en-line {
  color: #0f172a;
  line-height: 1.8;
  font-size: 15px;
}

.word-token {
  display: inline-block;
  padding: 0 2px;
  border-radius: 4px;
  color: #0f172a;
  cursor: pointer;
}

.word-token:hover {
  background: #dbeafe;
  color: #1d4ed8;
}

.word-token-picked {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.zh-line {
  margin-top: 6px;
  color: #334155;
  line-height: 1.7;
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

.player-fab {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 2200;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}

.top-back-inner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}

.floating-player {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: min(360px, calc(100vw - 28px));
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.24);
  z-index: 2201;
  overflow: hidden;
}

.floating-player.mobile {
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  border-radius: 14px 14px 0 0;
}

.floating-player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.floating-player-header .title {
  color: #0f172a;
  font-weight: 600;
}

.floating-player-header .actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.floating-player :deep(.el-empty) {
  padding: 18px 10px;
}

.floating-player .player {
  max-height: min(40vh, 260px);
}

.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: opacity 0.2s ease;
}

.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
}

.floating-player-enter-active,
.floating-player-leave-active {
  transition: all 0.24s ease;
}

.floating-player-enter-from,
.floating-player-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 900px) {
  .word-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .caption-row {
    grid-template-columns: 1fr;
  }

  .top-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .transcript-page {
    padding-bottom: 132px;
  }

  .player-fab {
    right: 12px;
    bottom: 12px;
  }

  .top-back-button {
    right: 12px !important;
    bottom: 74px !important;
  }

  .floating-player .player {
    max-height: min(44vh, 320px);
  }
}
</style>
