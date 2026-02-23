<template>
  <div class="job-dashboard">
    <el-row :gutter="24">
      <el-col :xs="24" :md="10">
        <el-card class="upload-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>创建新的处理任务</span>
              <el-tag size="small" type="info">TestVideoSplit 后端</el-tag>
            </div>
          </template>
          <el-form label-width="96px" class="upload-form" @submit.prevent>
            <el-form-item label="视频文件">
              <div class="file-picker">
                <input
                  ref="fileInput"
                  type="file"
                  accept="video/*"
                  class="hidden-file-input"
                  @change="handleFileChange"
                />
                <el-button type="primary" @click="triggerFileInput" :disabled="uploading">
                  <el-icon><UploadFilled /></el-icon>
                  选择文件
                </el-button>
                <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
              </div>
            </el-form-item>

            <el-form-item label="目标语言">
              <el-select v-model="targetLang" placeholder="请选择">
                <el-option label="简体中文 (zh)" value="zh" />
                <el-option label="English (en)" value="en" />
              </el-select>
            </el-form-item>

            <el-form-item label="分段时长">
              <el-input-number v-model="segmentSeconds" :min="60" :step="30" />
              <span class="form-hint">单位：秒，默认 300 秒</span>
            </el-form-item>

            <el-form-item label="切片时长">
              <el-input-number v-model="chunkSeconds" :min="10" :step="10" />
              <span class="form-hint">单位：秒，建议 30~90 秒</span>
            </el-form-item>

            <el-form-item>
              <el-button type="success" :disabled="!selectedFile || uploading" @click="submitJob">
                <el-icon><VideoCameraFilled /></el-icon>
                开始处理
              </el-button>
              <el-button plain @click="resetSelection" :disabled="uploading">重置</el-button>
            </el-form-item>
          </el-form>

          <div v-if="uploading" class="upload-progress">
            <el-progress :percentage="uploadProgress" :stroke-width="14" />
            <div class="progress-stats">
              <span>已上传：{{ uploadStats.transferred }}</span>
              <span>速度：{{ uploadStats.speed }}/s</span>
              <span>剩余：{{ uploadStats.remaining }}s</span>
            </div>
          </div>
        </el-card>

        <el-card v-if="currentJob" class="status-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近任务</span>
              <el-tag :type="statusTagType" size="small">{{ jobStatusLabel }}</el-tag>
            </div>
          </template>
          <div class="status-content">
            <div class="status-row">
              <span>任务 ID：</span>
              <span class="mono">{{ currentJob.id }}</span>
            </div>
            <div class="status-row">
              <span>进度：</span>
              <el-progress :percentage="jobProgress" :status="jobProgressStatus" :stroke-width="12" />
            </div>
            <div class="status-row">
              <span>统计：</span>
              <span>分段 {{ currentJob.total_segments ?? '--' }} · 切片 {{ currentJob.total_chunks ?? '--' }}</span>
            </div>
            <el-button type="primary" @click="openLiveStudy" class="launch-btn">
              进入实时字幕课堂
            </el-button>
          </div>
        </el-card>

        <el-card class="diagnostics-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>后端诊断</span>
              <el-button text size="small" :loading="diagnosticsLoading" @click="loadDiagnostics">刷新</el-button>
            </div>
          </template>
          <div class="diagnostics-grid">
            <div class="diag-item" v-for="item in diagnosticList" :key="item.key">
              <span class="diag-label">{{ item.label }}</span>
              <el-tag :type="item.ok ? 'success' : 'danger'">{{ item.ok ? '正常' : '异常' }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="14">
        <el-card class="tips-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>处理记录</span>
              <el-tag size="small">自动更新</el-tag>
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
          <el-empty v-else description="暂无事件记录" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { UploadFilled, VideoCameraFilled } from '@element-plus/icons-vue';

import jobService from '@/services/jobService';
import { useJobStore } from '@/stores/jobStore';

const router = useRouter();
const jobStore = useJobStore();

const fileInput = ref(null);
const selectedFile = ref(null);
const targetLang = ref('zh');
const segmentSeconds = ref(300);
const chunkSeconds = ref(60);

const uploading = ref(false);
const uploadProgress = ref(0);
const uploadStats = reactive({ transferred: '0 B', speed: '0 B', remaining: '0' });
const uploadStart = ref(0);

const diagnostics = ref({});
const diagnosticsLoading = ref(false);

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

const jobEvents = computed(() => [...jobStore.events].slice(-30).reverse());

const diagnosticList = computed(() => {
  const entries = [
    { key: 'ffmpeg', label: 'FFmpeg' },
    { key: 'ffprobe', label: 'FFprobe' },
    { key: 'database', label: '数据库' },
    { key: 'redis', label: 'Redis' }
  ];
  return entries.map(item => ({ ...item, ok: Boolean(diagnostics.value?.[item.key]) }));
});

function triggerFileInput() {
  fileInput.value?.click();
}

function resetSelection() {
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

function handleFileChange(event) {
  const files = event.target.files;
  if (files && files.length > 0) {
    selectedFile.value = files[0];
  }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatSeconds(sec) {
  if (!sec || !Number.isFinite(sec)) return '未知';
  return sec < 1 ? '不到 1' : sec.toFixed(1);
}

async function submitJob() {
  if (!selectedFile.value) {
    ElMessage.warning('请选择视频文件');
    return;
  }

  try {
    uploading.value = true;
    uploadProgress.value = 0;
    uploadStart.value = Date.now();

    const job = await jobService.createJob({
      file: selectedFile.value,
      targetLang: targetLang.value,
      segmentSeconds: segmentSeconds.value,
      chunkSeconds: chunkSeconds.value
    }, {
      onUploadProgress: (event) => {
        if (!event.total) return;
        uploadProgress.value = Math.min(100, Math.round((event.loaded / event.total) * 100));
        const elapsed = (Date.now() - uploadStart.value) / 1000;
        const speed = elapsed > 0 ? event.loaded / elapsed : 0;
        const remainingBytes = event.total - event.loaded;
        const remainingTime = speed > 0 ? remainingBytes / speed : 0;
        uploadStats.transferred = `${formatBytes(event.loaded)} / ${formatBytes(event.total)}`;
        uploadStats.speed = formatBytes(speed);
        uploadStats.remaining = formatSeconds(remainingTime);
      }
    });

    jobStore.setJob(job);
    jobStore.replaceSegments([]);
    jobStore.replaceChunks([]);
    jobStore.events = [];
    if (job.reused) {
      ElMessage.info(`检测到相同文件，已复用任务 ID：${job.id}`);
    } else {
      ElMessage.success(`任务已创建，任务 ID：${job.id}`);
    }
    router.push({ name: 'JobSegmentsLiveStudy', params: { jobId: job.id } });
  } catch (error) {
    const message = error?.response?.data?.detail || error?.message || '任务创建失败';
    ElMessage.error(message);
  } finally {
    uploading.value = false;
  }
}

async function loadDiagnostics() {
  diagnosticsLoading.value = true;
  try {
    diagnostics.value = await jobService.diagnostics();
  } catch (error) {
    ElMessage.error('诊断信息获取失败');
  } finally {
    diagnosticsLoading.value = false;
  }
}

function openLiveStudy() {
  if (currentJob.value) {
    router.push({ name: 'JobSegmentsLiveStudy', params: { jobId: currentJob.value.id } });
  }
}

function formatEventTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

function eventType(type) {
  if (type === 'chunk_failed' || type === 'job_failed') return 'danger';
  if (type === 'chunk_completed' || type === 'job_completed') return 'success';
  return 'info';
}

function eventDetail(event) {
  switch (event.type) {
    case 'chunk_completed':
      return `切片完成 (段 ${(event.segment_index ?? 0) + 1}, 片 ${(event.index ?? 0) + 1})`;
    case 'chunk_failed':
      return `切片失败：${event.error || '未知原因'}`;
    case 'segment_completed':
      return `分段 ${(event.segment_index ?? 0) + 1} 完成`;
    case 'job_completed':
      return '任务已完成';
    case 'job_failed':
      return `任务失败：${event.error || '未知原因'}`;
    default:
      return JSON.stringify(event);
  }
}

onMounted(() => {
  jobStore.resetState();
  loadDiagnostics();
});
</script>

<style scoped>
.job-dashboard {
  padding: 24px 16px 48px;
}

.upload-card,
.status-card,
.diagnostics-card,
.tips-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.upload-form .form-hint {
  margin-left: 12px;
  color: #6b7280;
  font-size: 12px;
}

.file-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hidden-file-input {
  display: none;
}

.file-name {
  color: #1f2937;
  font-size: 13px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-progress {
  margin-top: 16px;
}

.progress-stats {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-row .mono {
  font-family: 'Fira Code', 'SFMono-Regular', Menlo, monospace;
}

.launch-btn {
  align-self: flex-start;
}

.diagnostics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 8px;
}

.diag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #1f2933;
}

.event-list {
  max-height: 360px;
  overflow-y: auto;
}

.event-type {
  font-weight: 600;
  margin-right: 8px;
}

.event-detail {
  color: #475569;
}

@media (max-width: 768px) {
  .job-dashboard {
    padding: 16px 12px;
  }
}
</style>
