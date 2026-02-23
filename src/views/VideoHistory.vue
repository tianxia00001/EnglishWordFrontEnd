<template>
  <div class="video-history-container">
    <div v-if="!authStore.isAuthenticated" class="login-required">
      <el-card>
        <div class="login-prompt">
          <el-icon size="64" color="#909399"><User /></el-icon>
          <h3>请先登录</h3>
          <p>登录后可查看你处理过的视频历史。</p>
          <el-button type="primary" @click="router.push('/login')">去登录</el-button>
        </div>
      </el-card>
    </div>

    <div v-else>
      <div class="header">
        <h2>我的视频历史</h2>
        <div class="header-actions">
          <el-button type="primary" @click="refreshList">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <el-card>
        <div class="stats-row">
          <el-statistic title="累计视频" :value="totalVideos" />
          <el-statistic title="当前页" :value="videos.length" />
        </div>

        <el-table :data="videos" v-loading="loading" style="width: 100%">
          <el-table-column prop="filename" label="视频名称" min-width="220">
            <template #default="{ row }">
              <div class="video-info">
                <div class="file-name">{{ row.filename }}</div>
                <div class="file-meta">
                  {{ formatFileSize(row.file_size) }} | {{ formatDuration(row.duration) }}
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="subtitles_count" label="字幕数" width="100">
            <template #default="{ row }">
              <el-tag type="info">{{ row.subtitles_count || 0 }} 条</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" effect="light">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="created_at" label="处理时间" width="190">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="650">
            <template #default="{ row }">
              <el-button size="small" type="primary" :disabled="row.status !== 'completed'" @click="loadVideo(row)">
                加载视频
              </el-button>
              <el-button size="small" type="success" :disabled="row.status !== 'completed'" @click="startLearning(row)">
                开始学习
              </el-button>
              <el-button size="small" type="warning" :disabled="row.status !== 'completed'" @click="startSegmentLearning(row)">
                视频学习
              </el-button>
              <el-button size="small" type="primary" plain :disabled="row.status !== 'completed'" @click="viewVideoWords(row)">
                视频单词
              </el-button>
              <el-button size="small" type="info" :disabled="row.status !== 'completed'" @click="viewSubtitles(row)">
                视频字幕
              </el-button>
              <el-button size="small" type="warning" plain :disabled="row.status !== 'completed'" @click="viewVideoStories(row)">
                视频故事
              </el-button>
              <el-button size="small" type="danger" @click="deleteVideo(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="totalVideos > 0"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalVideos"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          style="margin-top: 20px; text-align: center"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />

        <div v-if="videos.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无视频处理记录">
            <el-button type="primary" @click="router.push('/video-subtitles')">上传第一个视频</el-button>
          </el-empty>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, User } from '@element-plus/icons-vue'

import apiService from '@/services/api'
import jobService from '@/services/jobService'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const videos = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalVideos = ref(0)

async function fetchVideoList(page = 1, perPage = 20) {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    return
  }

  loading.value = true
  try {
    const response = await apiService.getUserVideoList(page, perPage)
    if (response.success) {
      videos.value = response.data?.videos || response.videos || []
      totalVideos.value = response.data?.pagination?.total || response.total || 0
      currentPage.value = response.data?.pagination?.page || response.page || page
      pageSize.value = response.data?.pagination?.per_page || response.per_page || perPage
      return
    }
    ElMessage.error(response.message || '加载视频列表失败')
  } catch (error) {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      authStore.clearAuth()
      router.push('/login')
    } else {
      ElMessage.error(`加载视频列表失败: ${error.message}`)
    }
  } finally {
    loading.value = false
  }
}

async function openVideoInBestView(video, fallbackPath = '/video-subtitles') {
  try {
    await jobService.getJob(video.id)
    const segmentsLive = await jobService.getSegmentsLive(video.id)
    if (Array.isArray(segmentsLive) && segmentsLive.length > 0) {
      router.push({
        path: `/jobs/${video.id}/segments-live`,
        query: {
          source: 'history',
          filename: video.filename
        }
      })
      return
    }
    router.push({
      path: `/jobs/${video.id}/live`,
      query: {
        source: 'history',
        filename: video.filename
      }
    })
    return
  } catch (error) {
    console.warn('job live route unavailable, fallback to legacy page', error?.message || error)
    try {
      router.push({
        path: `/jobs/${video.id}/live`,
        query: {
          source: 'history',
          filename: video.filename
        }
      })
      return
    } catch (_innerError) {
      // fallback below
    }
  }

  router.push({
    path: fallbackPath,
    query: {
      videoId: video.id,
      filename: video.filename
    }
  })
}

async function loadVideo(video) {
  if (video.status !== 'completed') {
    ElMessage.warning('视频尚未处理完成')
    return
  }

  if (!video.subtitles_count) {
    ElMessage.warning('该视频暂无字幕，仍可先尝试加载')
  }

  await openVideoInBestView(video, '/video-subtitles')
}

async function startLearning(video) {
  if (video.status !== 'completed') {
    ElMessage.warning('视频尚未处理完成')
    return
  }

  if (!video.subtitles_count) {
    ElMessage.warning('该视频暂无字幕，无法开始学习')
    return
  }

  await openVideoInBestView(video, '/video-learning')
}

function startSegmentLearning(video) {
  if (video.status !== 'completed') {
    ElMessage.warning('视频尚未处理完成')
    return
  }
  router.push({
    name: 'VideoSegmentLearning',
    params: { videoId: video.id },
    query: {
      source: 'history',
      filename: video.filename
    }
  })
}

function viewSubtitles(video) {
  if (video.status !== 'completed') {
    ElMessage.warning('视频尚未处理完成')
    return
  }
  router.push({
    name: 'VideoTranscript',
    params: { videoId: video.id },
    query: {
      source: 'history',
      filename: video.filename
    }
  })
}

function viewVideoStories(video) {
  if (video.status !== 'completed') {
    ElMessage.warning('视频尚未处理完成')
    return
  }
  router.push({
    name: 'VideoStory',
    params: { videoId: video.id },
    query: {
      source: 'history',
      filename: video.filename
    }
  })
}

function viewVideoWords(video) {
  if (video.status !== 'completed') {
    ElMessage.warning('视频尚未处理完成')
    return
  }
  router.push({
    name: 'VideoWords',
    params: { videoId: video.id },
    query: {
      source: 'history',
      filename: video.filename
    }
  })
}

async function deleteVideo(video) {
  try {
    await ElMessageBox.confirm(`确认删除视频 "${video.filename}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const loadingInstance = ElLoading.service({
      fullscreen: true,
      text: '正在删除视频...'
    })

    try {
      const result = await apiService.deleteUserVideo(video.id)
      if (result.success) {
        ElMessage.success('视频删除成功')
        await fetchVideoList(currentPage.value, pageSize.value)
      } else {
        ElMessage.error(result.message || '删除失败')
      }
    } finally {
      loadingInstance.close()
    }
  } catch (error) {
    if (error === 'cancel') return

    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      authStore.clearAuth()
      router.push('/login')
      return
    }
    if (error.response?.status === 403) {
      ElMessage.error('无权限删除该视频')
      return
    }
    if (error.response?.status === 404) {
      ElMessage.error('视频不存在或已删除')
      await fetchVideoList(currentPage.value, pageSize.value)
      return
    }

    ElMessage.error(`删除失败: ${error.message}`)
  }
}

function refreshList() {
  fetchVideoList(currentPage.value, pageSize.value)
}

function handlePageChange(page) {
  fetchVideoList(page, pageSize.value)
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  fetchVideoList(1, size)
}

function formatFileSize(bytes) {
  if (!bytes) return '未知'
  const sizes = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let index = 0
  while (size >= 1024 && index < sizes.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(1)} ${sizes[index]}`
}

function formatDuration(seconds) {
  if (!seconds) return '未知'
  const minutes = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${minutes}:${String(sec).padStart(2, '0')}`
}

function formatDate(value) {
  if (!value) return '未知'
  return new Date(value).toLocaleString('zh-CN')
}

function getStatusText(status) {
  const map = {
    completed: '已完成',
    processing: '处理中',
    failed: '失败',
    pending: '排队中'
  }
  return map[status] || status || '未知'
}

function getStatusType(status) {
  const map = {
    completed: 'success',
    processing: 'warning',
    failed: 'danger',
    pending: 'info'
  }
  return map[status] || 'info'
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    fetchVideoList()
  }
})
</script>

<style scoped>
.video-history-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-row {
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 500;
  color: #303133;
}

.file-meta {
  font-size: 12px;
  color: #909399;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.login-required {
  max-width: 500px;
  margin: 0 auto;
  padding: 40px 20px;
}

.login-prompt {
  text-align: center;
  padding: 40px 20px;
}

.login-prompt h3 {
  margin: 20px 0 10px;
  color: #303133;
}

.login-prompt p {
  color: #909399;
  margin-bottom: 30px;
}

@media (max-width: 768px) {
  .video-history-container {
    padding: 10px;
  }

  .header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .stats-row {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
