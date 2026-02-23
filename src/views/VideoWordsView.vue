<template>
  <div class="video-words-page">
    <div class="page-header">
      <div class="left">
        <el-button text @click="goBack">返回</el-button>
        <h2>视频单词</h2>
      </div>
      <div class="right">
        <span class="filename">{{ videoFilename }}</span>
        <el-tag type="info">共 {{ words.length }} 个</el-tag>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filters">
        <el-select v-model="selectedSegmentId" placeholder="按片段筛选" class="segment-select">
          <el-option label="全部片段" value="all" />
          <el-option
            v-for="segment in segments"
            :key="segment.segment_id"
            :label="segmentLabel(segment)"
            :value="segment.segment_id"
          />
        </el-select>
        <el-button @click="reload" :loading="loading">刷新</el-button>
      </div>
      <div class="summary">
        <el-tag type="success">记住了 {{ rememberedCount }}</el-tag>
        <el-tag type="warning">没记住 {{ unrememberedCount }}</el-tag>
        <el-tag>未标记 {{ unmarkedCount }}</el-tag>
      </div>
    </el-card>

    <el-card shadow="never">
      <div v-if="loading" class="loading-block">
        <el-skeleton :rows="6" animated />
      </div>

      <el-empty
        v-else-if="filteredWords.length === 0"
        :description="words.length === 0 ? '该视频还没有已加入单词本的单词' : '当前筛选条件下没有单词'"
      />

      <el-table v-else :data="filteredWords" style="width: 100%">
        <el-table-column prop="word_text" label="单词" min-width="160" />
        <el-table-column prop="translation" label="中文释义" min-width="200">
          <template #default="{ row }">
            {{ row.translation || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="所在片段" min-width="220">
          <template #default="{ row }">
            <div class="segment-tags">
              <el-tag
                v-for="hit in row.segment_hits"
                :key="`${row.word_text}-${hit.segment_id}`"
                size="small"
                type="info"
              >
                片段 {{ Number(hit.segment_index || 0) + 1 }}
              </el-tag>
              <span v-if="!row.segment_hits || row.segment_hits.length === 0">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="记忆状态" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.is_learned === true" type="success" size="small">记住了</el-tag>
            <el-tag v-else-if="row.is_learned === false" type="warning" size="small">没记住</el-tag>
            <el-tag v-else size="small">未标记</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button
              size="small"
              type="success"
              plain
              :loading="Boolean(savingWordMap[row.word_id])"
              :disabled="!row.word_id"
              @click="markWord(row, true)"
            >
              记住了
            </el-button>
            <el-button
              size="small"
              type="warning"
              plain
              :loading="Boolean(savingWordMap[row.word_id])"
              :disabled="!row.word_id"
              @click="markWord(row, false)"
            >
              没记住
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import apiService from '@/services/api'
import { formatRange as formatRangeUtil } from '@/utils/text'

const route = useRoute()
const router = useRouter()

const videoId = computed(() => String(route.params.videoId || ''))
const videoFilename = ref(String(route.query.filename || `视频 ${videoId.value}`))

const loading = ref(false)
const selectedSegmentId = ref('all')
const savingWordMap = ref({})

const segments = ref([])
const words = ref([])

const filteredWords = computed(() => {
  if (selectedSegmentId.value === 'all') return words.value
  return words.value.filter((item) => Array.isArray(item.segment_ids) && item.segment_ids.includes(selectedSegmentId.value))
})

const rememberedCount = computed(() => filteredWords.value.filter((item) => item.is_learned === true).length)
const unrememberedCount = computed(() => filteredWords.value.filter((item) => item.is_learned === false).length)
const unmarkedCount = computed(() => filteredWords.value.filter((item) => item.is_learned !== true && item.is_learned !== false).length)

function segmentLabel(segment) {
  const start = Number(segment.start_seconds || 0)
  const end = Number(segment.end_seconds || start)
  return `片段 ${Number(segment.segment_index || 0) + 1} (${formatRangeUtil(start, end - start)})`
}

function goBack() {
  router.push({ name: 'VideoHistory' })
}

async function loadData() {
  if (!videoId.value) return
  loading.value = true
  try {
    const response = await apiService.getVideoWords(videoId.value)
    const data = response?.data || {}
    segments.value = Array.isArray(data.segments) ? data.segments : []
    words.value = Array.isArray(data.words) ? data.words : []
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '加载视频单词失败')
    segments.value = []
    words.value = []
  } finally {
    loading.value = false
  }
}

async function markWord(word, isLearned) {
  const wordId = Number(word?.word_id || 0)
  if (!wordId) {
    ElMessage.warning('该单词暂无可用 ID，无法标记')
    return
  }
  savingWordMap.value = { ...savingWordMap.value, [wordId]: true }
  try {
    await apiService.updateUserWordStatus(wordId, isLearned)
    words.value = words.value.map((item) => {
      if (Number(item.word_id || 0) !== wordId) return item
      return {
        ...item,
        is_learned: isLearned,
        learned_at: isLearned ? new Date().toISOString() : null,
      }
    })
    ElMessage.success(isLearned ? '已标记为记住了' : '已标记为没记住')
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || error?.response?.data?.message || '更新记忆状态失败')
  } finally {
    const next = { ...savingWordMap.value }
    delete next[wordId]
    savingWordMap.value = next
  }
}

function reload() {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.video-words-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.left h2 {
  margin: 0;
}

.right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filename {
  color: #606266;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-card {
  margin-bottom: 14px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.segment-select {
  width: 320px;
}

.summary {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.loading-block {
  padding: 12px;
}

.segment-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .right {
    width: 100%;
    justify-content: space-between;
  }

  .filename {
    max-width: 68vw;
  }
}
</style>
