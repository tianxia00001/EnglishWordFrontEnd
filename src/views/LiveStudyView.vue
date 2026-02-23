<template>
  <div class="live-study" v-loading="pageLoading">
    <div class="header">
      <el-page-header @back="goBack" content="实时字幕课堂" />
      <div v-if="currentJob" class="job-summary">
        <el-tag size="small" type="info">任务 ID: {{ currentJob.id }}</el-tag>
        <el-tag size="small" :type="statusTagType">{{ jobStatusLabel }}</el-tag>
        <span class="progress-text">进度 {{ jobProgress }}%</span>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :md="15">
        <el-card class="video-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>原始视频</span>
              <el-tag v-if="currentSubtitle" size="small" type="success">
                {{ formatRange(currentSubtitle.start, currentSubtitle.end - currentSubtitle.start) }}
              </el-tag>
            </div>
          </template>
          <div v-if="videoUrl" class="video-wrapper">
            <video
              ref="videoRef"
              class="video-element"
              :src="videoUrl"
              controls
              preload="auto"
              @timeupdate="handleTimeUpdate"
              @loadedmetadata="handleLoadedMetadata"
              @error="handleVideoError"
              @play="isPlaying = true"
              @pause="isPlaying = false"
            >
              <track
                v-if="vttUrl"
                kind="subtitles"
                srclang="en"
                label="自动字幕"
                :src="vttUrl"
                default
              />
            </video>
            <div class="caption-overlay" v-if="currentSubtitle">
              <div class="caption-english">
                <span
                  v-for="token in currentSubtitle.words"
                  :key="token.key"
                  class="caption-word"
                  @click="handleWordClick(token)"
                >
                  {{ token.text }}
                </span>
              </div>
              <div v-if="showTranslation && currentSubtitle.translation" class="caption-translation">
                {{ currentSubtitle.translation }}
              </div>
            </div>
          </div>
          <div v-else class="video-placeholder">
            <el-empty :description="videoPlaceholderText" />
          </div>
          <div class="video-controls">
            <el-button type="primary" @click="togglePlay" :disabled="!videoUrl || videoPreparing">
              {{ isPlaying ? '暂停' : '播放' }}
            </el-button>
            <el-switch v-model="showTranslation" active-text="显示翻译" inactive-text="隐藏翻译" />
            <span class="time-info">{{ formatClock(currentTime) }} / {{ formatClock(totalDuration) }}</span>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="9">
        <el-card class="subtitle-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>字幕时间线</span>
              <el-tag size="small">实时刷新</el-tag>
            </div>
          </template>
          <div v-if="subtitles.length" class="subtitle-list">
            <div
              v-for="item in subtitles"
              :key="item.id"
              :class="['subtitle-item', { active: currentSubtitle && item.id === currentSubtitle.id }]"
              @click="seekTo(item)"
            >
              <div class="subtitle-time">{{ formatRange(item.start, item.end - item.start) }}</div>
              <div class="subtitle-text">{{ item.englishText }}</div>
              <div v-if="item.translation" class="subtitle-translation">{{ item.translation }}</div>
            </div>
          </div>
          <el-empty v-else description="等待字幕生成" />
        </el-card>

        <el-card class="status-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>任务状态</span>
              <el-tag size="small" :type="statusTagType">{{ jobStatusLabel }}</el-tag>
            </div>
          </template>
          <div v-if="currentJob" class="status-body">
            <div class="status-row">
              <span>目标语言：</span>
              <span>{{ currentJob.target_lang }}</span>
            </div>
            <div class="status-row">
              <span>分段 / 切片：</span>
              <span>{{ currentJob.total_segments ?? '--' }} / {{ currentJob.total_chunks ?? '--' }}</span>
            </div>
            <div class="status-row">
              <span>进度：</span>
              <el-progress :percentage="jobProgress" :status="jobProgressStatus" :stroke-width="12" />
            </div>
          </div>
          <el-empty v-else description="等待任务数据" />
        </el-card>

        <el-card class="events-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>实时事件</span>
              <el-tag size="small">最新 30 条</el-tag>
            </div>
          </template>
          <div v-if="jobEvents.length" class="event-list">
            <el-timeline>
              <el-timeline-item
                v-for="event in jobEvents"
                :key="event.timestamp + event.type"
                :timestamp="formatEventTime(event.timestamp)"
                :type="eventType(event.type)"
                size="large"
              >
                <span class="event-type">{{ event.type }}</span>
                <span class="event-detail">{{ eventDetail(event) }}</span>
              </el-timeline-item>
            </el-timeline>
          </div>
          <el-empty v-else description="暂无事件" />
        </el-card>
      </el-col>
    </el-row>

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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import jobService from '@/services/jobService';
import legacyService from '@/services/legacyService';
import { useJobStore } from '@/stores/jobStore';
import { useJobWordStore } from '@/stores/jobWordStore';
import { tokenizeWords, formatRange as formatRangeUtil, formatDuration } from '@/utils/text';

const route = useRoute();
const router = useRouter();
const jobStore = useJobStore();
const wordStore = useJobWordStore();

const jobId = computed(() => route.params.jobId);

const pageLoading = ref(true);
const videoUrl = ref('');
const vttUrl = ref('');
const videoRef = ref(null);
const isPlaying = ref(false);
const showTranslation = ref(true);
const currentTime = ref(0);
const duration = ref(0);
const currentSubtitle = ref(null);
const videoPreparing = ref(false);
const videoPrepareError = ref('');
const videoStatusTimer = ref(null);
const pendingSeekTime = ref(null);

const wordDialogVisible = ref(false);
const wordDialogLoading = ref(false);
const wordActionLoading = ref(false);
const currentWordInfo = ref(null);
const pendingWord = ref('');
const savedWord = ref(null);
const wordInfoSource = ref('');

const reconnectTimer = ref(null);

const currentJob = computed(() => jobStore.currentJob);

const jobProgress = computed(() => {
  const progress = currentJob.value?.progress ?? 0;
  return Math.min(100, Math.round(progress * 100));
});

const jobProgressStatus = computed(() => {
  if (!currentJob.value) return 'success';
  if (currentJob.value.status === 'failed') return 'exception';
  if (currentJob.value.status === 'completed') return 'success';
  return 'active';
});

const jobStatusLabel = computed(() => {
  switch (currentJob.value?.status) {
    case 'running':
      return '处理中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'queued':
      return '排队中';
    default:
      return '未开始';
  }
});

const statusTagType = computed(() => {
  switch (currentJob.value?.status) {
    case 'running':
      return 'warning';
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'queued':
      return 'info';
    default:
      return 'info';
  }
});

const subtitles = computed(() => {
  const entries = jobStore.subtitleEntries;
  return entries.map(entry => {
    const englishText = entry.transcript || '';
    const translation = entry.translation || '';
    const words = tokenizeWords(englishText).map((token, index) => ({
      ...token,
      key: `${entry.id}-${index}`
    }));
    return {
      id: entry.id,
      start: entry.start,
      end: entry.end,
      englishText,
      translation,
      targetLang: entry.targetLang,
      words
    };
  });
});

const totalDuration = computed(() => {
  const lastSubtitle = subtitles.value[subtitles.value.length - 1];
  const subtitlesDuration = lastSubtitle ? lastSubtitle.end : 0;
  return Math.max(duration.value, subtitlesDuration);
});

const jobEvents = computed(() => [...jobStore.events].slice(-30).reverse());

const sourceLabel = computed(() => {
  if (!wordInfoSource.value) return '未知来源';
  const map = {
    base_library: '基础词库',
    deepseek_api: 'AI 生成',
    fallback: '兜底生成'
  };
  return map[wordInfoSource.value] || wordInfoSource.value;
});

const videoPlaceholderText = computed(() => {
  if (videoPrepareError.value) return videoPrepareError.value;
  if (videoPreparing.value) return '正在准备可播放视频（首次可能需要 1-3 分钟）';
  return '正在准备视频...';
});

watch(subtitles, () => {
  rebuildVtt();
  updateCurrentSubtitle();
}, { immediate: true });

watch(currentTime, () => {
  updateCurrentSubtitle();
});

onMounted(async () => {
  try {
    await initialize();
  } finally {
    pageLoading.value = false;
  }
});

onBeforeUnmount(() => {
  cleanupMedia();
  jobStore.disconnectStreams();
  if (reconnectTimer.value) {
    clearTimeout(reconnectTimer.value);
  }
  clearVideoStatusTimer();
});

async function initialize() {
  const id = jobId.value;
  if (!id) {
    ElMessage.error('无法识别任务 ID');
    router.push('/jobs');
    return;
  }

  try {
    const [jobDetail, segments, chunks, captions] = await Promise.all([
      jobService.getJob(id),
      jobService.getSegments(id),
      jobService.getChunks(id),
      jobService.getCaptions(id)
    ]);
    jobStore.setJob(jobDetail);
    jobStore.replaceSegments(segments || []);
    jobStore.replaceChunks(chunks || []);
    jobStore.replaceCaptions(captions || []);
  } catch (error) {
    ElMessage.error('加载任务信息失败');
  }

  connectStream();
  startPolling();
  await loadVideo();
  rebuildVtt();
}
async function loadVideo() {
  try {
    currentTime.value = 0;
    duration.value = 0;
    pendingSeekTime.value = null;
    await refreshVideoSource();
  } catch (error) {
    ElMessage.error('视频加载失败');
  }
}

async function refreshVideoSource() {
  try {
    const status = await jobService.getJobVideoStatus(jobId.value);
    if (status.ready) {
      videoPreparing.value = false;
      videoPrepareError.value = '';
      clearVideoStatusTimer();
      const nextUrl = jobService.jobVideoUrl(jobId.value);
      if (videoUrl.value !== nextUrl) {
        cleanupVideoUrl();
        videoUrl.value = nextUrl;
        await nextTick();
        videoRef.value?.load();
      }
      applyPendingSeek();
      return;
    }

    cleanupVideoUrl();
    videoPreparing.value = true;
    if (status.status === 'failed') {
      videoPrepareError.value = status.error || '视频转码失败';
      return;
    }
    videoPrepareError.value = '';
    scheduleVideoStatusCheck();
  } catch (error) {
    cleanupVideoUrl();
    videoPreparing.value = true;
    videoPrepareError.value = '视频准备中，请稍后自动重试';
    scheduleVideoStatusCheck();
  }
}

function scheduleVideoStatusCheck(delay = 3000) {
  if (videoStatusTimer.value) return;
  videoStatusTimer.value = setTimeout(async () => {
    videoStatusTimer.value = null;
    await refreshVideoSource();
  }, delay);
}

function clearVideoStatusTimer() {
  if (!videoStatusTimer.value) return;
  clearTimeout(videoStatusTimer.value);
  videoStatusTimer.value = null;
}

function connectStream() {
  jobStore.disconnectStreams();
  const es = jobService.streamJob(jobId.value);
  jobStore.attachEventSource(es);
  es.onmessage = (event) => {
    if (!event?.data || event.data === ': ping') return;
    try {
      const payload = JSON.parse(event.data);
      jobStore.applyEvent(payload);
    } catch (error) {
      console.warn('解析事件失败', event.data, error);
    }
  };
  es.onerror = () => {
    es.close();
    jobStore.attachEventSource(null);
    if (currentJob.value && currentJob.value.status !== 'completed' && currentJob.value.status !== 'failed') {
      reconnectTimer.value = setTimeout(connectStream, 2000);
    }
  };
}

function startPolling() {
  if (jobStore.pollTimer) return;
  const timer = setInterval(async () => {
    await refreshSnapshot();
    if (currentJob.value && (currentJob.value.status === 'completed' || currentJob.value.status === 'failed')) {
      clearInterval(timer);
      jobStore.attachPollTimer(null);
    }
  }, 6000);
  jobStore.attachPollTimer(timer);
}

async function refreshSnapshot() {
  try {
    const [jobDetail, segments, chunks, captions] = await Promise.all([
      jobService.getJob(jobId.value),
      jobService.getSegments(jobId.value),
      jobService.getChunks(jobId.value),
      jobService.getCaptions(jobId.value)
    ]);
    jobStore.setJob(jobDetail);
    jobStore.replaceSegments(segments || []);
    jobStore.replaceChunks(chunks || []);
    jobStore.replaceCaptions(captions || []);
  } catch (error) {
    console.warn('刷新任务状态失败', error);
  }
}
function rebuildVtt() {
  const entries = subtitles.value;
  if (!entries.length) {
    cleanupVttUrl();
    return;
  }
  const lines = ['WEBVTT', ''];
  entries.forEach((item, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatVttTimestamp(item.start)} --> ${formatVttTimestamp(item.end)}`);
    const text = (item.translation || item.englishText || ' ').replace(/\r?\n/g, '\n');
    lines.push(text || ' ');
    lines.push('');
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/vtt' });
  cleanupVttUrl();
  vttUrl.value = URL.createObjectURL(blob);
}

function cleanupMedia() {
  cleanupVideoUrl();
  cleanupVttUrl();
}

function cleanupVideoUrl() {
  if (videoUrl.value) {
    if (videoUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl.value);
    }
    videoUrl.value = '';
  }
}

function cleanupVttUrl() {
  if (vttUrl.value) {
    URL.revokeObjectURL(vttUrl.value);
    vttUrl.value = '';
  }
}

function handleLoadedMetadata() {
  if (videoRef.value) {
    duration.value = videoRef.value.duration || 0;
    applyPendingSeek();
  }
}

function handleVideoError() {
  videoPreparing.value = true;
  videoPrepareError.value = '视频仍在准备中，请稍后重试';
  scheduleVideoStatusCheck(1500);
}

function handleTimeUpdate(event) {
  currentTime.value = event.target.currentTime || 0;
}

function updateCurrentSubtitle(time = currentTime.value) {
  const entries = subtitles.value;
  if (!entries.length) {
    currentSubtitle.value = null;
    return;
  }

  let left = 0;
  let right = entries.length - 1;
  let candidate = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (entries[mid].start <= time) {
      candidate = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (candidate < 0) {
    currentSubtitle.value = null;
    return;
  }

  const current = entries[candidate];
  if (time >= current.start && time < current.end - 0.03) {
    currentSubtitle.value = current;
    return;
  }

  const next = entries[candidate + 1];
  if (next && time >= next.start && time < next.end - 0.03) {
    currentSubtitle.value = next;
    return;
  }

  if (time >= entries[entries.length - 1].end) {
    currentSubtitle.value = entries[entries.length - 1];
    return;
  }

  currentSubtitle.value = null;
}
function togglePlay() {
  if (!videoRef.value || videoPreparing.value) {
    ElMessage.info('视频尚未就绪，请稍候');
    return;
  }
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {});
  } else {
    videoRef.value.pause();
  }
}

function seekTo(item) {
  if (!item) return;
  if (!videoRef.value || !videoUrl.value || videoPreparing.value) {
    pendingSeekTime.value = item.start;
    ElMessage.info('视频准备完成后将自动跳转到该字幕');
    scheduleVideoStatusCheck(1000);
    return;
  }
  try {
    videoRef.value.currentTime = item.start;
    videoRef.value.play().catch(() => {});
  } catch (error) {
    pendingSeekTime.value = item.start;
    ElMessage.info('视频尚未就绪，已记录跳转位置');
  }
}

function applyPendingSeek() {
  if (!videoRef.value || pendingSeekTime.value == null) return;
  try {
    videoRef.value.currentTime = pendingSeekTime.value;
    pendingSeekTime.value = null;
  } catch (error) {
    // metadata not ready yet; keep pending seek
  }
}

function handleWordClick(token) {
  if (!token?.normalized) return;
  lookupWord(token.normalized);
}

async function lookupWord(word) {
  pendingWord.value = word;
  wordDialogVisible.value = true;
  wordDialogLoading.value = true;
  wordInfoSource.value = '';
  savedWord.value = null;
  currentWordInfo.value = null;
  try {
    const response = await legacyService.getWordInfo(word);
    if (response.success && response.word_info) {
      currentWordInfo.value = response.word_info;
      wordInfoSource.value = response.source || response.word_info.source || 'unknown';
    } else {
      ElMessage.warning(response.error || '未能获取单词信息');
    }
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || '获取单词信息失败';
    ElMessage.error(message);
  } finally {
    wordDialogLoading.value = false;
  }
}

async function addWordToBook() {
  if (!pendingWord.value) {
    ElMessage.warning('没有可添加的单词');
    return;
  }
  wordActionLoading.value = true;
  try {
    const response = await legacyService.addWordWithInfo({ text: pendingWord.value });
    if (response.success && response.word) {
      savedWord.value = response.word;
      ElMessage.success(`已加入单词本：${response.word.text}`);
    } else if (response.success && response.word_info) {
      ElMessage.success('单词信息已更新');
    } else {
      ElMessage.warning(response.error || '未能添加到单词本');
    }
  } catch (error) {
    if (error?.response?.status === 409) {
      const existing = error.response.data?.word;
      if (existing) {
        savedWord.value = existing;
        ElMessage.info(`单词已存在：${existing.text}`);
      } else {
        ElMessage.info('单词已存在于单词本');
      }
    } else {
      const message = error?.response?.data?.error || error?.message || '添加失败';
      ElMessage.error(message);
    }
  } finally {
    wordActionLoading.value = false;
  }
}

function addWordToSelection() {
  if (savedWord.value) {
    wordStore.addToSelection(savedWord.value);
    ElMessage.success(`已放入故事候选：${savedWord.value.text}`);
  } else if (currentWordInfo.value?.word) {
    wordStore.addToSelection({ id: currentWordInfo.value.word, text: currentWordInfo.value.word });
    ElMessage.success(`已放入故事候选：${currentWordInfo.value.word}`);
  }
}

function closeWordDialog() {
  wordDialogVisible.value = false;
  savedWord.value = null;
  pendingWord.value = '';
}

function formatClock(value) {
  return formatDuration(value);
}

function formatRange(start, duration) {
  return formatRangeUtil(start, duration);
}

function formatVttTimestamp(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.floor((total - Math.floor(total)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function formatEventTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

function eventType(type) {
  if (type === 'chunk_failed' || type === 'segment_failed' || type === 'job_failed') return 'danger';
  if (type === 'chunk_completed' || type === 'job_completed') return 'success';
  return 'info';
}

function eventDetail(event) {
  switch (event.type) {
    case 'chunk_completed':
      return `切片完成 (段${(event.segment_index ?? 0) + 1}, 片${(event.index ?? 0) + 1})`;
    case 'chunk_failed':
      return `切片失败：${event.error || '未知原因'}`;
    case 'segment_completed':
      return `分段 ${(event.segment_index ?? 0) + 1} 完成`;
    case 'segment_failed':
      return `分段 ${(event.segment_index ?? 0) + 1} 失败：${event.error || '未知原因'}`;
    case 'job_completed':
      return '任务已完成';
    case 'job_failed':
      return `任务失败：${event.error || '未知原因'}`;
    default:
      return JSON.stringify(event);
  }
}

function goBack() {
  if (route.query.source === 'history') {
    router.push('/video-history');
    return;
  }
  router.push('/jobs');
}
</script>

<style scoped>
.live-study {
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.job-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.video-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.video-wrapper {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.video-element {
  width: 100%;
  max-height: 60vh;
}

.caption-overlay {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  background: rgba(15, 23, 42, 0.8);
  color: #f8fafc;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.caption-word {
  display: inline-block;
  margin-right: 4px;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
}

.caption-word:hover {
  background: rgba(148, 163, 184, 0.3);
}

.caption-translation {
  font-size: 16px;
  color: #d1fae5;
}

.video-controls {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.time-info {
  font-size: 13px;
  color: #475569;
}

.subtitle-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subtitle-item {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.subtitle-item.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
}

.subtitle-time {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.subtitle-text {
  font-weight: 600;
  color: #1f2937;
}

.subtitle-translation {
  margin-top: 4px;
  color: #0f172a;
  opacity: 0.8;
}

.status-card .status-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-list {
  max-height: 300px;
  overflow-y: auto;
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

@media (max-width: 768px) {
  .live-study {
    padding: 16px 12px;
  }

  .caption-overlay {
    left: 12px;
    right: 12px;
  }
}
</style>





