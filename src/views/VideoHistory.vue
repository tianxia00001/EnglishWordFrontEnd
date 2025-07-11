<template>
  <div class="video-history-container">
    <!-- 检查登录状态 -->
    <div v-if="!authStore.isAuthenticated" class="login-required">
      <el-card>
        <div class="login-prompt">
          <el-icon size="64" color="#909399"><User /></el-icon>
          <h3>请先登录</h3>
          <p>登录后即可查看您的视频处理历史</p>
          <el-button type="primary" @click="$router.push('/login')">
            去登录
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 原有内容，添加用户检查 -->
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
          <el-statistic title="我的已处理视频" :value="totalVideos" />
        <el-statistic title="当前页视频" :value="videos.length" />
      </div>

      <el-table :data="videos" v-loading="loading" style="width: 100%">
        <el-table-column prop="filename" label="视频名称" min-width="200">
          <template #default="{ row }">
            <div class="video-info">
              <div class="file-info">
                <div class="file-name">{{ row.filename }}</div>
                <div class="file-meta">
                  {{ formatFileSize(row.file_size) }} | 
                  {{ formatDuration(row.duration) }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="subtitles_count" label="字幕数量" width="100">
          <template #default="{ row }">
            <el-tag type="info">{{ row.subtitles_count || 0 }} 条</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getStatusType(row.status)"
              effect="light"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="处理时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="300">
          <template #default="{ row }">
            <el-button 
              size="small" 
              type="primary" 
              @click="loadVideo(row)"
              :disabled="row.status !== 'completed'"
            >
              加载视频
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="startLearning(row)"
              :disabled="row.status !== 'completed'"
            >
              开始学习
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteVideo(row)"
            >
              删除
            </el-button>
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
          <el-button type="primary" @click="$router.push('/video-subtitles')">
            上传第一个视频
          </el-button>
        </el-empty>
      </div>
    </el-card>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { Refresh, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/authStore'
import apiService from '@/services/api'

export default {
  name: 'VideoHistory',
  components: {
    Refresh,
    User
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const videos = ref([])
    const loading = ref(false)
    const currentPage = ref(1)
    const pageSize = ref(20)
    const totalVideos = ref(0)

    // 获取用户专属视频列表
    const fetchVideoList = async (page = 1, perPage = 20) => {
      // 确保用户已登录
      if (!authStore.isAuthenticated) {
        ElMessage.warning('请先登录')
        return
      }

      loading.value = true
      try {
        // 使用新的用户专属接口
        const response = await apiService.getUserVideoList(page, perPage)
        console.log('获取用户视频列表响应:', response)
        
        if (response.success) {
          videos.value = (response.data && response.data.videos) || response.videos || []
          totalVideos.value = (response.data && response.data.pagination && response.data.pagination.total) || response.total || 0
          
          // 更新分页信息
          currentPage.value = (response.data && response.data.pagination && response.data.pagination.page) || response.page || page
          pageSize.value = (response.data && response.data.pagination && response.data.pagination.per_page) || response.per_page || perPage
        } else {
          ElMessage.error('获取视频列表失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        console.error('获取视频列表失败:', error)
          // 处理认证错误
          if (error.response && error.response.status === 401) {
            ElMessage.error('登录已过期，请重新登录')
            authStore.clearAuth()
            router.push('/login')
          } else {
        ElMessage.error('获取视频列表失败: ' + error.message)
          }
      } finally {
        loading.value = false
      }
    }

    const refreshList = () => {
      fetchVideoList(currentPage.value, pageSize.value)
    }

    const handlePageChange = (page) => {
      fetchVideoList(page, pageSize.value)
    }

    const handleSizeChange = (size) => {
      pageSize.value = size
      currentPage.value = 1
      fetchVideoList(1, size)
    }

    const loadVideo = (video) => {
        // 检查视频状态
      if (video.status !== 'completed') {
        ElMessage.warning('视频尚未处理完成，无法播放')
        return
      }
      
      // 检查是否有字幕
      if (!video.subtitles_count || video.subtitles_count === 0) {
        ElMessage.warning('该视频暂无字幕数据')
      }
      
      // 跳转到视频播放页面，携带视频ID和额外信息
      router.push({
        path: '/video-subtitles',
        query: { 
          videoId: video.id,
          filename: video.filename 
        }
      })
    }

    const startLearning = (video) => {
      // 检查视频状态
      if (video.status !== 'completed') {
        ElMessage.warning('视频尚未处理完成，无法开始学习')
        return
      }
      
      // 检查是否有字幕
      if (!video.subtitles_count || video.subtitles_count === 0) {
        ElMessage.warning('该视频暂无字幕数据，无法开始学习')
        return
      }
      
      // 跳转到学习页面
      router.push({
        path: '/video-learning',
        query: { 
          videoId: video.id,
          filename: video.filename 
        }
      })
    }

    const deleteVideo = async (video) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除视频 "${video.filename}" 吗？删除后将无法恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const loadingInstance = ElLoading.service({
          fullscreen: true,
          text: '正在删除视频...'
        })

        try {
          // 使用新的用户专属删除接口
          const result = await apiService.deleteUserVideo(video.id)
          
          if (result.success) {
            ElMessage.success('视频删除成功')
            
            // 显示删除详情
            if (result.data && result.data.failed_files && result.data.failed_files.length > 0) {
              console.warn('部分文件删除失败:', result.data.failed_files)
              ElMessage.warning('视频已删除，但部分关联文件删除失败')
            }
            
            // 刷新列表
            await fetchVideoList(currentPage.value, pageSize.value)
          } else {
            ElMessage.error('删除失败: ' + (result.message || '未知错误'))
          }
        } finally {
          loadingInstance.close()
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除视频失败:', error)
          // 处理认证错误
          if (error.response && error.response.status === 401) {
            ElMessage.error('登录已过期，请重新登录')
            authStore.clearAuth()
            router.push('/login')
          } else if (error.response && error.response.status === 403) {
            ElMessage.error('无权限删除此视频')
          } else if (error.response && error.response.status === 404) {
            ElMessage.error('视频不存在或已被删除')
            // 刷新列表
            await fetchVideoList(currentPage.value, pageSize.value)
          } else {
          ElMessage.error('删除视频失败: ' + error.message)
          }
        }
      }
    }

    // 格式化函数
    const formatFileSize = (bytes) => {
      if (!bytes) return '未知'
      const sizes = ['B', 'KB', 'MB', 'GB']
      let size = bytes
      let unitIndex = 0
      
      while (size >= 1024 && unitIndex < sizes.length - 1) {
        size /= 1024
        unitIndex++
      }
      
      return `${size.toFixed(1)} ${sizes[unitIndex]}`
    }

    const formatDuration = (seconds) => {
      if (!seconds) return '未知'
      const minutes = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }

    const formatDate = (dateString) => {
      if (!dateString) return '未知'
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const getStatusText = (status) => {
      const statusMap = {
        'completed': '已完成',
        'processing': '处理中',
        'failed': '失败',
        'pending': '等待中'
      }
      return statusMap[status] || status || '未知'
    }

    const getStatusType = (status) => {
      const typeMap = {
        'completed': 'success',
        'processing': 'warning',
        'failed': 'danger',
        'pending': 'info'
      }
      return typeMap[status] || 'info'
    }

    // 生命周期
    onMounted(() => {
      // 只有登录用户才获取视频列表
      if (authStore.isAuthenticated) {
      fetchVideoList()
      }
    })

    return {
      authStore,
      videos,
      loading,
      currentPage,
      pageSize,
      totalVideos,
      refreshList,
      handlePageChange,
      handleSizeChange,
      loadVideo,
      startLearning,
      deleteVideo,
      formatFileSize,
      formatDuration,
      formatDate,
      getStatusText,
      getStatusType
    }
  }
}
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
  align-items: center;
  gap: 10px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  margin-bottom: 4px;
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

/* 登录提示样式 */
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

/* 响应式设计 */
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
  
  .video-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .login-required {
    padding: 20px 10px;
  }
}
</style> 