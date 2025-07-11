<template>
  <div class="video-subtitles-container">
    <!-- 上传区域 -->
    <div class="upload-section" v-if="!videoReady">
      <h2>上传视频</h2>
      <div class="upload-area" @drop.prevent="handleFileDrop" @dragover.prevent>
        <input
          type="file"
          ref="fileInput"
          @change="handleFileChange"
          accept="video/*"
          style="display: none"
        />
        <div class="upload-options">
          <el-button type="primary" @click="triggerFileInput">
            <el-icon><Upload /></el-icon>
            选择视频文件
          </el-button>
        </div>
        <span class="or-text">或</span>
        <div class="drop-zone">
          <el-icon><Upload /></el-icon>
          <p>拖拽视频文件到此处</p>
        </div>
      </div>

      <div v-if="selectedFile" class="selected-file">
        <p>已选择: {{ selectedFile.name }}</p>
        <el-button type="success" @click="uploadVideo" :disabled="isUploading">
          开始处理
        </el-button>
      </div>

      <!-- 处理进度 -->
      <div v-if="isProcessing" class="processing-section">
        <h3>视频处理中</h3>
        <el-progress 
          :percentage="processingProgress" 
          :status="processingStatus"
          :stroke-width="18"
        ></el-progress>
        <p class="processing-message">{{ processingMessage }}</p>
      </div>
    </div>

    <!-- 视频播放区域 -->
    <div v-if="videoReady" class="video-player-section">
      <div class="video-container">
        <!-- 视频屏幕 -->
        <div class="mock-video-screen" ref="mockVideoScreen">
          <video 
            ref="videoElement" 
            class="video-element" 
            @timeupdate="onTimeUpdate" 
            @loadedmetadata="onVideoLoaded"
            @ended="onVideoEnded"
            controls
          >
            <source :src="videoUrl" type="video/mp4">
            您的浏览器不支持视频播放
          </video>
        </div>
        
        <!-- 播放控制 -->
        <div class="video-controls">
          <el-button class="play-button" @click="togglePlay" :icon="isPlaying ? 'Pause' : 'VideoPlay'">
            {{ isPlaying ? '暂停' : '播放' }}
          </el-button>
          
          <div class="progress-bar-container">
            <el-slider 
              v-model="currentTime" 
              :min="0" 
              :max="duration" 
              @change="seekTo"
            ></el-slider>
            <div class="time-display">
              <span>{{ formatTime(currentTime) }}</span>
              <span>/</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 字幕显示 -->
        <div class="subtitles-display">
          <div class="subtitle-controls">
            <el-checkbox v-model="showChineseSubtitles">显示中文字幕</el-checkbox>
            <el-checkbox v-model="showEnglishSubtitles">显示英文字幕</el-checkbox>
          </div>
          
          <div v-if="currentSubtitle" class="subtitle-text">
            <div v-if="showChineseSubtitles" class="chinese-subtitle">
              {{ currentSubtitle.chineseText }}
            </div>
            <div v-if="showEnglishSubtitles" class="english-subtitle">
              <template v-for="(word, index) in currentSubtitle.englishWords" :key="word.id">
                <span 
                  class="english-word" 
                  @click="addToWordBook(word)"
                >{{ word.text }}</span>
                <span v-if="index < currentSubtitle.englishWords.length - 1"> </span>
              </template>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 单词本按钮 -->
      <div class="wordbook-button-container">
        <el-button type="primary" @click="viewWordBook">
          <el-icon><Notebook /></el-icon> 查看单词本
        </el-button>
        <el-button type="success" @click="analyzeCoverage" :loading="analyzingCoverage">
          <el-icon><DataAnalysis /></el-icon> 词汇覆盖分析
        </el-button>
      </div>
    </div>

    <!-- 单词信息预览对话框 -->
    <el-dialog
      v-model="wordInfoDialogVisible"
      title="单词信息"
      width="450px"
      class="word-info-dialog"
    >
      <div class="word-info-content" v-if="currentWordInfo">
        <div class="word-header">
          <h3 class="word-title">{{ currentWordInfo.word }}</h3>
          <span v-if="currentWordInfo.phonetic" class="word-phonetic">{{ currentWordInfo.phonetic }}</span>
          <span v-if="currentWordInfo.source" class="source-badge" :class="getSourceBadgeClass(currentWordInfo.source)">
            {{ getSourceBadgeText(currentWordInfo.source) }}
          </span>
        </div>
        
        <div class="word-details">
          <div class="word-item" v-if="currentWordInfo.part_of_speech">
            <strong>词性：</strong>
            <el-tag type="info" size="small">{{ currentWordInfo.part_of_speech }}</el-tag>
          </div>
          
          <div class="word-item" v-if="currentWordInfo.chinese_translation">
            <strong>中文释义：</strong>
            <span>{{ currentWordInfo.chinese_translation }}</span>
          </div>
          
          <div class="word-item" v-if="currentWordInfo.contextSentence">
            <strong>语境：</strong>
            <span class="context-sentence">{{ currentWordInfo.contextSentence }}</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="wordInfoDialogVisible = false">关闭</el-button>
          <el-button 
            type="primary" 
            @click="confirmAddToWordBook"
            :loading="addingToWordBook"
          >
            添加到单词本
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 词汇覆盖分析对话框 -->
    <el-dialog
      v-model="coverageAnalysisVisible"
      title="词汇覆盖分析"
      width="600px"
      class="coverage-analysis-dialog"
    >
      <div v-if="coverageAnalysis" class="coverage-analysis-content">
        <!-- 覆盖率概览 -->
        <div class="coverage-overview">
          <h3>覆盖率概览</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="coverage-stat">
                <div class="stat-value">{{ coverageAnalysis.totalWords }}</div>
                <div class="stat-label">总词汇数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="coverage-stat">
                <div class="stat-value success">{{ coverageAnalysis.coveredWords }}</div>
                <div class="stat-label">已覆盖</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="coverage-stat">
                <div class="stat-value" :class="getCoverageRateClass(coverageAnalysis.coverageRate)">
                  {{ coverageAnalysis.coverageRate }}%
                </div>
                <div class="stat-label">覆盖率</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 建议 -->
        <div v-if="coverageRecommendations && coverageRecommendations.length > 0" class="coverage-recommendations">
          <h3>分析建议</h3>
          <ul>
            <li v-for="(rec, index) in coverageRecommendations" :key="index">{{ rec }}</li>
          </ul>
        </div>

        <!-- 缺失词汇 -->
        <div v-if="coverageAnalysis.missingWords && coverageAnalysis.missingWords.length > 0" class="missing-words-section">
          <h3>缺失词汇 ({{ coverageAnalysis.missingWords.length }}个)</h3>
          <div class="missing-words-container">
            <el-tag 
              v-for="word in coverageAnalysis.missingWords.slice(0, 50)" 
              :key="word" 
              size="small" 
              type="warning"
              class="missing-word-tag"
            >
              {{ word }}
            </el-tag>
            <span v-if="coverageAnalysis.missingWords.length > 50" class="more-words">
              ...还有 {{ coverageAnalysis.missingWords.length - 50 }} 个词汇
            </span>
          </div>
        </div>

        <!-- 覆盖词汇预览 -->
        <div v-if="coverageAnalysis.foundWords && coverageAnalysis.foundWords.length > 0" class="covered-words-section">
          <h3>已覆盖词汇 ({{ coverageAnalysis.foundWords.length }}个)</h3>
          <div class="covered-words-container">
            <el-tag 
              v-for="word in coverageAnalysis.foundWords.slice(0, 30)" 
              :key="word" 
              size="small" 
              type="success"
              class="covered-word-tag"
            >
              {{ word }}
            </el-tag>
            <span v-if="coverageAnalysis.foundWords.length > 30" class="more-words">
              ...还有 {{ coverageAnalysis.foundWords.length - 30 }} 个词汇
            </span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="coverageAnalysisVisible = false">关闭</el-button>
          <el-button 
            type="primary" 
            @click="addMissingWordsToLibrary"
            :disabled="!coverageAnalysis || !coverageAnalysis.missingWords || coverageAnalysis.missingWords.length === 0"
          >
            添加缺失词汇到基础词库
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElLoading } from 'element-plus'
import { Upload, Notebook, DataAnalysis } from '@element-plus/icons-vue'
import apiService from '../services/api'

export default {
  name: 'VideoSubtitles',
  components: { 
    Upload, 
    Notebook, 
    DataAnalysis 
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const isUploading = ref(false)
    const isProcessing = ref(false)
    const processingProgress = ref(0)
    const processingStatus = ref('')
    const processingMessage = ref('')
    const videoUrl = ref('')
    const subtitles = ref([])
    const currentSubtitle = ref(null)
    const showChineseSubtitles = ref(true)
    const showEnglishSubtitles = ref(true)
    const wordBook = ref([])
    const videoReady = ref(false)
    const mockVideoScreen = ref(null)
    const videoElement = ref(null)

    // 视频播放器状态
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(50)

    const wordInfoDialogVisible = ref(false)
    const currentWordInfo = ref(null)
    const addingToWordBook = ref(false)
    const analyzingCoverage = ref(false)

    const coverageAnalysisVisible = ref(false)
    const coverageAnalysis = ref(null)
    const coverageRecommendations = ref([])

    const triggerFileInput = () => {
      fileInput.value.click()
    }

    const handleFileChange = (event) => {
      const file = event.target.files[0]
      if (file) {
        console.log("File selected:", file.name)
        selectedFile.value = file
      } 
    }

    const handleFileDrop = (event) => {
      const file = event.dataTransfer.files[0];
      if (file) {
        console.log("File dropped:", file.name);
        selectedFile.value = file;
      }
    }

    // 智能上传函数 - 修复重复检测逻辑
    const uploadVideo = async () => {
      if (!selectedFile.value) {
        ElMessage.warning('请先选择视频文件')
        return
      }

      const loadingInstance = ElLoading.service({
        fullscreen: true,
        text: '正在分析视频文件...',
        background: 'rgba(0, 0, 0, 0.7)'
      })

      try {
        // 1. 首先检查视频是否已存在
        loadingInstance.setText('正在检查是否为重复视频...')
        
        try {
          const checkResult = await apiService.checkVideoByHash(selectedFile.value)
          console.log('重复检测结果:', checkResult)

          if (checkResult.success && checkResult.exists) {
            // 🔧 修复：从video对象中提取字段
            const video = checkResult.video
            const videoId = video?.id || video?.video_id || video?.videoId || 
                   checkResult.video_id || checkResult.videoId || checkResult.id
            const filename = video?.filename || video?.file_name || video?.name || 
                    checkResult.filename || selectedFile.value.name
            
            console.log('🔍 video对象:', video)
            console.log('📋 提取的videoId:', videoId)
            console.log('📋 提取的filename:', filename)
            
            if (!videoId) {
              console.error('❌ 无法从video对象中提取videoId:', checkResult)
              ElMessage.warning('重复检测成功但缺少视频ID，继续正常上传')
              // 继续执行正常上传流程
            } else {
              // ✅ 使用路由跳转方式
              ElMessage.success(`发现相同视频：${filename}，正在跳转到视频页面...`)
              
              // 清理loading状态
              loadingInstance.close()
              
              // 跳转到相同页面但带参数
              router.push({
                path: '/video-subtitles',
                query: { 
                  videoId: videoId,
                  filename: filename 
                }
              })
              return // 结束当前流程
            }
          } else {
            ElMessage.info('未发现重复视频，开始上传处理')
          }
        } catch (error) {
          console.log('重复检测失败，继续正常上传流程:', error.message)
          ElMessage.warning('重复检测失败，继续正常上传')
        }

        // 2. 没有发现重复，执行正常上传流程
        loadingInstance.setText('正在上传视频并生成字幕...')
        
        const formData = new FormData()
        formData.append('file', selectedFile.value)

        const response = await apiService.uploadVideo(formData)
        console.log('视频上传成功:', response)
        
        const videoId = response.videoId || response.video_id
        const taskId = response.taskId || response.task_id
        
        await checkVideoProcessingStatus(taskId)
        await fetchVideoSubtitles(videoId)
        
        // 创建本地视频URL（新上传的视频用本地文件播放）
        videoUrl.value = URL.createObjectURL(selectedFile.value)
        videoReady.value = true
        
        ElMessage.success('视频上传成功，字幕已生成')

      } catch (error) {
        console.error('视频处理失败:', error)
        ElMessage.error(`视频处理失败: ${error.message}`)
      } finally {
        loadingInstance.close()
      }
    }

    // 处理字幕数据的辅助函数
    const processSubtitles = (subtitleData) => {
      return subtitleData.map(sub => {
        // 确保英文字幕存在，如果不存在则使用占位符
        const englishText = sub.englishText || sub.english_text || "[EN] " + (sub.chineseText || sub.chinese_text)
        
        // 将英文文本拆分为单词
        const words = englishText.split(/\s+/).map((word, index) => {
          // 移除标点符号
          const cleanWord = word.replace(/[^\w'-]/g, '')
          return {
            id: `w${sub.id}-${index}`,
            text: word,
            cleanText: cleanWord,
            translation: cleanWord // 简单翻译
          }
        })
        
        return {
          ...sub,
          englishText: englishText, // 确保英文字幕存在
          englishWords: words
        }
      })
    }

    const checkVideoProcessingStatus = async (taskId) => {
      let isCompleted = false
      let retryCount = 0
      const maxRetries = 30 // 最多等待30次，每次3秒，共90秒
      
      while (!isCompleted && retryCount < maxRetries) {
        try {
          const status = await apiService.getVideoProcessingStatus(taskId)
          console.log('视频处理状态:', status)
          
          if (status.status === 'completed') {
            isCompleted = true
          } else if (status.status === 'failed') {
            throw new Error(status.message || '视频处理失败')
          } else {
            // 等待3秒后再次检查
            await new Promise(resolve => setTimeout(resolve, 3000))
            retryCount++
          }
        } catch (error) {
          console.error('检查视频处理状态失败:', error)
          throw error
        }
      }
      
      if (!isCompleted) {
        throw new Error('视频处理超时，请稍后再试')
      }
    }

    const fetchVideoSubtitles = async (videoId) => {
      try {
        // 调用API获取字幕
        const subtitleData = await apiService.getVideoSubtitles(videoId)
        console.log('获取字幕成功:', subtitleData)
        
        // 处理字幕数据，添加单词分析
        subtitles.value = processSubtitles(subtitleData)
        
        // 初始化当前字幕
        updateSubtitle()
      } catch (error) {
        console.error('获取字幕失败:', error)
        throw error
      }
    }

    // 支持从历史记录加载视频
    const loadVideoFromHistory = async (videoId) => {
      const loadingInstance = ElLoading.service({
        fullscreen: true,
        text: '正在加载历史视频...',
        background: 'rgba(0, 0, 0, 0.7)'
      })

      try {
        // 使用签名URL方案（推荐）
        loadingInstance.setText('正在获取视频播放地址...');
        const [signedUrlResponse, subtitleData] = await Promise.all([
          apiService.getVideoSignedUrl(videoId),
          apiService.getVideoSubtitles(videoId)
        ]);

        if (!signedUrlResponse || !signedUrlResponse.url) {
          throw new Error('获取视频播放地址失败');
        }

        // 【修改这一行】直接使用后端返回的URL，不要添加origin前缀
        videoUrl.value = signedUrlResponse.url;
        // 或者，如果后端返回的是相对路径，使用正确的base URL
        // videoUrl.value = `http://172.16.0.132:8081${signedUrlResponse.url}`;

        if (Array.isArray(subtitleData)) {
          subtitles.value = processSubtitles(subtitleData)
        } else if (subtitleData && Array.isArray(subtitleData.data)) {
          subtitles.value = processSubtitles(subtitleData.data)
        } else {
          subtitles.value = []
        }
        videoReady.value = true
        
        ElMessage.success('历史视频加载成功')
      } catch (error) {
        console.error('加载历史视频失败:', error)
        
        // 如果签名URL方案失败，回退到Blob方案
        try {
          loadingInstance.setText('正在下载视频数据...');
          const [videoBlob, subtitleData] = await Promise.all([
            apiService.getVideoStream(videoId),
            apiService.getVideoSubtitles(videoId)
          ]);
          
          videoUrl.value = URL.createObjectURL(videoBlob);
          
          if (Array.isArray(subtitleData)) {
            subtitles.value = processSubtitles(subtitleData)
          } else if (subtitleData && Array.isArray(subtitleData.data)) {
            subtitles.value = processSubtitles(subtitleData.data)
          } else {
            subtitles.value = []
          }
          videoReady.value = true
          
          ElMessage.success('历史视频加载成功（兼容模式）')
        } catch (fallbackError) {
          console.error('备用加载方案也失败:', fallbackError)
          let errorMessage = '加载历史视频失败';
          if (error.response?.status === 401) {
            errorMessage = '加载失败：无权访问该视频资源，请重新登录。';
          } else if (error.message) {
            errorMessage = `加载历史视频失败: ${error.message}`;
          }
          ElMessage.error(errorMessage);
        }
      } finally {
        loadingInstance.close()
      }
    }

    const updateSubtitle = () => {
      const current = subtitles.value.find(sub => 
        currentTime.value >= sub.startTime && currentTime.value < sub.endTime
      )
      currentSubtitle.value = current || null
    }

    const onTimeUpdate = () => {
      if (videoElement.value) {
        // 更新当前时间
        currentTime.value = videoElement.value.currentTime;
        
        // 查找当前时间对应的字幕
        const currentSub = subtitles.value.find(sub => 
          currentTime.value >= sub.startTime && currentTime.value < sub.endTime
        );
        
        // 只有当字幕变化时才更新，避免不必要的渲染
        if (currentSub && (!currentSubtitle.value || currentSub.id !== currentSubtitle.value.id)) {
          console.log('字幕更新:', currentSub.chineseText);
          currentSubtitle.value = currentSub;
        } else if (!currentSub && currentSubtitle.value) {
          // 如果当前没有字幕，但之前有字幕，则清空当前字幕
          currentSubtitle.value = null;
        }
      }
    };

    const togglePlay = () => {
      if (!videoReady.value || !videoElement.value) return;

      if (videoElement.value.paused) {
        startPlayback();
      } else {
        stopPlayback();
      }
    };

    const startPlayback = () => {
      if (videoElement.value) {
        console.log("开始播放视频:", videoUrl.value);
        const playPromise = videoElement.value.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("视频播放成功");
              isPlaying.value = true;
            })
            .catch(error => {
              // AbortError 是用户快速暂停导致的，属于正常操作，无需提示用户
              if (error.name !== 'AbortError') {
                console.error("视频播放失败:", error);
                ElMessage.error("视频播放失败: " + error.message);
              }
              // 播放失败，状态应为暂停
              isPlaying.value = false;
            });
        }
      }
    };

    const stopPlayback = () => {
      if (videoElement.value) {
        console.log("暂停视频播放");
        videoElement.value.pause();
        isPlaying.value = false; // 暂停时直接更新状态
      }
    };

    const seekTo = (value) => {
      currentTime.value = value;
      if (videoElement.value) {
        videoElement.value.currentTime = value;
      }
      updateSubtitle();
    };

    const formatTime = (seconds) => {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const onVideoLoaded = () => {
      if (videoElement.value) {
        duration.value = videoElement.value.duration;
        console.log('视频加载完成，时长:', duration.value);
      }
    };

    const onVideoEnded = () => {
      isPlaying.value = false;
      currentTime.value = 0;
      updateSubtitle();
    };

    const addToWordBook = async (word) => {
      // 检查单词是否有效
      if (!word || !word.text || word.text === "[EN]") {
        ElMessage.warning('无效的单词')
        return
      }
      
      // 清理单词文本，移除标点符号
      const cleanWord = word.text.replace(/[^\w'-]/g, '').toLowerCase()
      
      if (!cleanWord || cleanWord.length < 2) {
        ElMessage.warning('单词格式无效')
        return
      }
      
      // 显示加载状态
      const loading = ElLoading.service({
        lock: true,
        text: '正在获取单词信息...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })
      
      try {
        // 使用增强版单词信息API，优先从基础词库查询
        const response = await apiService.getWordInfo(cleanWord)
        
        if (response.success && response.word_info) {
          const wordInfo = response.word_info
          
          // 保存当前单词信息和原始单词对象，包含数据来源信息
          currentWordInfo.value = {
            ...wordInfo,
            originalWord: cleanWord,
            contextSentence: currentSubtitle.value?.englishText || '',
            source: response.source || wordInfo.source || 'unknown'
          }
          
          // 显示单词信息预览对话框
          wordInfoDialogVisible.value = true
          
          // 根据数据来源显示不同的成功消息
          const sourceMessages = {
            'base_library': '✨ 从本地词库获取信息成功',
            'deepseek_api': '🤖 通过AI服务获取信息成功',
            'fallback': '📝 获取基础信息成功'
          }
          
          ElMessage.success(sourceMessages[response.source] || '单词信息获取成功')
        } else {
          ElMessage.warning('未能获取到单词信息，将使用基本信息添加')
          
          // 如果获取信息失败，直接添加基本单词信息
          await addBasicWordToWordBook(cleanWord)
        }
        
      } catch (error) {
        console.error('获取单词信息失败:', error)
        
        let errorMessage = '获取单词信息失败'
        if (error.response) {
          if (error.response.status === 400) {
            errorMessage = '单词格式无效'
          } else if (error.response.status === 429) {
            errorMessage = '请求过于频繁，请稍后再试'
          } else if (error.response.status === 500) {
            errorMessage = 'AI服务暂时不可用，请稍后再试'
          } else if (error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error
          }
        } else if (error.request) {
          errorMessage = '网络连接错误，请检查网络'
        }
        
        ElMessage.error(errorMessage)
        
        // 如果API调用失败，提供fallback选项
        try {
          await addBasicWordToWordBook(cleanWord)
        } catch (fallbackError) {
          console.error('添加基本单词信息也失败:', fallbackError)
        }
      } finally {
        loading.close()
      }
    }
    
    // 确认添加单词到单词本
    const confirmAddToWordBook = async () => {
      if (!currentWordInfo.value) {
        ElMessage.error('没有可用的单词信息')
        return
      }
      
      addingToWordBook.value = true
      
      try {
        // 使用智能添加单词API
        const wordData = {
          text: currentWordInfo.value.originalWord,
          category_id: null // 可以后续支持选择分类
        }
        
        const response = await apiService.addWordWithInfo(wordData)
        
        if (response.success) {
          // 添加到本地单词本（如果需要）
          wordBook.value.push(response.word)
          
          wordInfoDialogVisible.value = false
          ElMessage.success(`单词 '${currentWordInfo.value.word}' 已成功添加到单词本`)
        } else {
          // 处理单词已存在的情况
          if (response.error === 'Word already exists' && response.word) {
            wordInfoDialogVisible.value = false
            ElMessage.info(`单词 '${currentWordInfo.value.word}' 已存在于单词本中`)
          } else {
            ElMessage.error(response.error || '添加单词失败')
          }
        }
        
      } catch (error) {
        console.error('添加单词失败:', error)
        
        let errorMessage = '添加单词失败'
        if (error.response) {
          if (error.response.status === 409) {
            // 单词已存在
            errorMessage = `单词 '${currentWordInfo.value.word}' 已存在于单词本中`
            ElMessage.info(errorMessage)
            wordInfoDialogVisible.value = false
            return
          } else if (error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error
          } else if (error.response.status === 500) {
            errorMessage = '服务器内部错误，请稍后再试'
          }
        } else if (error.request) {
          errorMessage = '网络连接错误，请检查网络'
        }
        
        ElMessage.error(errorMessage)
      } finally {
        addingToWordBook.value = false
      }
    }
    
    // 添加基本单词信息（fallback方法）
    const addBasicWordToWordBook = async (cleanWord) => {
      try {
        const basicWordData = {
          text: cleanWord,
          translation: '', // 空翻译，用户可后续编辑
          pronunciation: '',
          examples: currentSubtitle.value?.englishText ? 
            [`在视频字幕中: "${currentSubtitle.value.englishText}"`] : []
        }
        
        await apiService.addWord(basicWordData)
        wordBook.value.push(basicWordData)
        ElMessage.success(`单词 '${cleanWord}' 已添加到单词本（基本信息）`)
      } catch (error) {
        console.error('添加基本单词信息失败:', error)
        ElMessage.error('添加单词失败，请重试')
      }
    }
    
    // 获取难度标签类型
    const getDifficultyTagType = (level) => {
      switch (level) {
        case 'elementary': return 'success'
        case 'intermediate': return 'warning'
        case 'advanced': return 'danger'
        default: return 'info'
      }
    }
    
    // 获取难度文本
    const getDifficultyText = (level) => {
      switch (level) {
        case 'elementary': return '初级'
        case 'intermediate': return '中级'
        case 'advanced': return '高级'
        default: return '未知'
      }
    }
    
    // 获取数据来源标识文本
    const getSourceBadgeText = (source) => {
      const badges = {
        'base_library': '⚡ 本地词库',
        'deepseek_api': '🤖 AI查询',
        'fallback': '📝 基础信息'
      }
      return badges[source] || '📝 基础信息'
    }
    
    // 获取数据来源标识样式类
    const getSourceBadgeClass = (source) => {
      const classes = {
        'base_library': 'source-badge-success',
        'deepseek_api': 'source-badge-primary', 
        'fallback': 'source-badge-secondary'
      }
      return classes[source] || 'source-badge-secondary'
    }

    const viewWordBook = () => {
      router.push('/word-book')
    }

    const analyzeCoverage = async () => {
      if (!subtitles.value || subtitles.value.length === 0) {
        ElMessage.warning('没有可分析的字幕数据')
        return
      }
      
      analyzingCoverage.value = true
      
      try {
        const response = await apiService.analyzeVocabularyCoverage(subtitles.value)
        
        if (response.success) {
          coverageAnalysis.value = response.analysis
          coverageRecommendations.value = response.recommendations || []
          coverageAnalysisVisible.value = true
          
          ElMessage.success(`词汇覆盖分析完成！覆盖率：${response.analysis.coverageRate}%`)
        } else {
          ElMessage.error('词汇覆盖分析失败')
        }
      } catch (error) {
        console.error('词汇覆盖分析失败:', error)
        ElMessage.error('词汇覆盖分析失败: ' + (error.message || '网络错误'))
      } finally {
        analyzingCoverage.value = false
      }
    }

    // 获取覆盖率样式类
    const getCoverageRateClass = (rate) => {
      if (rate >= 90) return 'success'
      if (rate >= 70) return 'warning'
      return 'danger'
    }

    const addMissingWordsToLibrary = async () => {
      if (!coverageAnalysis.value || !coverageAnalysis.value.missingWords || coverageAnalysis.value.missingWords.length === 0) {
        ElMessage.warning('没有可添加的缺失词汇')
        return
      }
      
      const loading = ElLoading.service({
        lock: true,
        text: '正在添加缺失词汇到基础词库...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })

      try {
        const missingWords = coverageAnalysis.value.missingWords.slice(0, 50)
        const response = await apiService.addWords(missingWords.map(word => ({
          text: word,
          translation: '',
          pronunciation: '',
          examples: []
        })))
        
        if (response.success) {
          ElMessage.success(`成功添加 ${missingWords.length} 个缺失词汇到基础词库`)
          coverageAnalysis.value.missingWords = coverageAnalysis.value.missingWords.slice(50)
        } else {
          ElMessage.error(response.error || '添加词汇失败')
        }
      } catch (error) {
        console.error('添加词汇失败:', error)
        ElMessage.error('添加词汇失败: ' + error.message)
      } finally {
        loading.close()
      }
    }

    // 🔑 添加路由参数监听
    const handleVideoIdChange = () => {
      const videoId = route.query.videoId
      console.log('🔄 检测到videoId变化:', videoId)
      
      if (videoId) {
        console.log('📺 开始加载历史视频:', videoId)
        loadVideoFromHistory(videoId)
      }
    }

    // 初始加载
    onMounted(() => {
      handleVideoIdChange()
    })

    // 🔑 监听路由参数变化
    watch(
      () => route.query.videoId,
      (newVideoId, oldVideoId) => {
        console.log('🔄 videoId从', oldVideoId, '变更为', newVideoId)
        if (newVideoId && newVideoId !== oldVideoId) {
          handleVideoIdChange()
        }
      }
    )

    return {
      fileInput,
      selectedFile,
      isUploading,
      isProcessing,
      processingProgress,
      processingStatus,
      processingMessage,
      videoUrl,
      subtitles,
      currentSubtitle,
      showChineseSubtitles,
      showEnglishSubtitles,
      wordBook,
      videoReady,
      triggerFileInput,
      handleFileChange,
      handleFileDrop,
      uploadVideo,
      addToWordBook,
      viewWordBook,
      mockVideoScreen,
      videoElement,
      isPlaying,
      currentTime,
      duration,
      togglePlay,
      seekTo,
      formatTime,
      onTimeUpdate,
      onVideoLoaded,
      onVideoEnded,
      wordInfoDialogVisible,
      currentWordInfo,
      addingToWordBook,
      confirmAddToWordBook,
      getDifficultyTagType,
      getDifficultyText,
      getSourceBadgeText,
      getSourceBadgeClass,
      analyzingCoverage,
      analyzeCoverage,
      coverageAnalysisVisible,
      coverageAnalysis,
      coverageRecommendations,
      addMissingWordsToLibrary,
      getCoverageRateClass
    }
  }
}
</script>

<style scoped>
.video-subtitles-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 上传区域样式 */
.upload-section {
  text-align: center;
  padding: 40px 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 2px dashed #dcdfe6;
}

.upload-section h2 {
  margin-bottom: 20px;
  color: #303133;
}

.upload-area {
  padding: 40px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  background-color: #f0f0f0;
}

.or-text {
  display: block;
  margin: 15px 0;
  color: #909399;
}

.drop-zone {
  padding: 30px;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  margin: 15px 0;
  transition: all 0.3s;
}

.drop-zone:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.example-link {
  margin-top: 15px;
}

.selected-file {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f9eb;
  border-radius: 4px;
}

/* 处理进度样式 */
.processing-section {
  margin: 20px 0;
}

.processing-message {
  margin: 10px 0;
  font-size: 14px;
  color: #606266;
}

/* 视频播放区域样式 */
.video-player-section {
  margin: 20px 0;
}

.video-container {
  position: relative;
  margin-bottom: 20px;
}

.mock-video-screen {
  width: 100%;
  height: 400px;
  background-color: #000;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-controls {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
}

.play-button {
  margin-right: 10px;
}

.time-display {
  margin: 0 10px;
  font-size: 14px;
  color: #606266;
  min-width: 80px;
}

.progress-bar-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

/* 字幕区域样式 */
.subtitles-display {
  margin: 20px 0;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.subtitle-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.subtitle-text {
  margin: 10px 0;
  padding: 15px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chinese-subtitle {
  font-size: 18px;
  color: #303133;
  margin-bottom: 8px;
}

.english-subtitle {
  font-size: 16px;
  color: #606266;
  line-height: 1.6;
}

.english-word {
  display: inline-block;
  margin: 0 2px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.3s;
}

.english-word:hover {
  background-color: #ecf5ff;
  color: #409eff;
}

/* 单词本按钮 */
.wordbook-button-container {
  margin: 20px 0;
  text-align: center;
}

/* 单词信息预览对话框样式 */
.word-info-dialog .el-dialog__body {
  padding: 20px;
}

.word-info-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.word-header {
  display: flex;
  align-items: baseline;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
  flex-wrap: wrap;
}

.word-title {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.word-phonetic {
  font-size: 18px;
  color: #409eff;
  font-family: 'Times New Roman', serif;
  font-style: italic;
  font-weight: 500;
}

.source-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.source-badge-success {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.source-badge-primary {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.source-badge-secondary {
  background-color: #f4f4f5;
  color: #909399;
  border: 1px solid #d3d4d6;
}

.word-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.word-item {
  padding: 12px 0;
  line-height: 1.6;
}

.word-item strong {
  color: #303133;
  font-weight: 600;
  margin-right: 8px;
  display: inline-block;
  min-width: 80px;
}

.context-sentence {
  color: #606266;
  font-style: italic;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .word-info-dialog {
    width: 95% !important;
    margin: 0 !important;
  }
  
  .word-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .word-title {
    font-size: 24px;
  }
  
  .word-phonetic {
    font-size: 16px;
  }
}

/* 词汇覆盖分析对话框样式 */
.coverage-analysis-dialog .el-dialog__body {
  padding: 20px;
}

.coverage-analysis-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.coverage-overview {
  margin-bottom: 20px;
}

.coverage-stat {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.warning {
  color: #e6a23c;
}

.stat-value.danger {
  color: #f56c6c;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.coverage-recommendations {
  margin-bottom: 20px;
}

.missing-words-section {
  margin-bottom: 20px;
}

.missing-words-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.missing-word-tag {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.more-words {
  color: #909399;
  font-size: 14px;
}

.covered-words-section {
  margin-bottom: 20px;
}

.covered-words-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.covered-word-tag {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}
</style>
