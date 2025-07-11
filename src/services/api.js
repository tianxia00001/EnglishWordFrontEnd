import axios from 'axios'
import { BASE_URL, API_ENDPOINTS } from '../config/api.config'
import { fileHashCalculator } from '../utils/fileHash'  // 添加这行

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 增加到120秒超时，视频上传需要更长时间
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Add request interceptor for authentication if needed
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    console.log('发送请求:', config.url, config.method, config.data)
    return config
  },
  error => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor to extract data
apiClient.interceptors.response.use(
  response => {
    console.log(`✅ API响应成功 [${response.config.method?.toUpperCase()}] ${response.config.url}:`, {
      status: response.status,
      data: response.data
    })
    // Return just the data part of the response
    return response.data
  },
  async error => {
    const config = error.config || {}
    const status = error.response?.status
    const url = config.url || 'unknown'
    const method = config.method?.toUpperCase() || 'unknown'
    
    console.error(`❌ API请求失败 [${method}] ${url}:`, {
      status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })

    if (status === 401) {
      console.warn('🔐 检测到401认证错误，可能是token过期')
      
      // 只有在非登录API且确实是认证过期时才清除token
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        const errorData = error.response?.data
        const isTokenExpired = errorData?.code === 'TOKEN_EXPIRED' || 
                              errorData?.message?.includes('token') ||
                              errorData?.message?.includes('过期') ||
                              errorData?.message?.includes('expired')
        
        if (isTokenExpired) {
          console.warn('⏰ Token确实已过期，清除本地认证信息')
          localStorage.removeItem('access_token')
          localStorage.removeItem('user_info')
          // Emit event for components to handle
          window.dispatchEvent(new CustomEvent('auth-expired'))
        } else {
          console.warn('⚠️  401错误但可能不是token过期，不清除认证信息')
        }
      }
    }

    return Promise.reject(error)
  }
)

// API service object
const apiService = {
  // 检查服务状态
  checkServiceStatus() {
    return apiClient.get(API_ENDPOINTS.ROOT);
  },

  // Video subtitle related endpoints
  uploadVideo(formData) {
    console.log('上传视频文件，FormData内容:', formData.get('file') ? formData.get('file').name : '无文件');
    
    // 检查文件是否存在
    const file = formData.get('file');
    if (!file) {
      console.error('FormData中没有找到文件!');
      return Promise.reject(new Error('没有选择文件'));
    }
    
    console.log('准备上传文件:', file.name, '大小:', file.size, '类型:', file.type);
    
    // 使用FormData对象，确保键名为"file"
    const newFormData = new FormData();
    newFormData.append('file', file);
    
    // 关键修改：统一使用apiClient进行上传，并为FormData正确设置headers
    return apiClient.post(API_ENDPOINTS.VIDEO.UPLOAD, newFormData, {
      headers: {
        // 关键：当使用FormData时，必须让浏览器自动设置Content-Type，
        // 这样它才能包含正确的multipart boundary。
        // 我们通过将其设置为 undefined 来移除实例的默认 'application/json'。
        'Content-Type': undefined
      },
      timeout: 1800000 // 30分钟超时以支持大文件上传
    })
    .then(data => {
      console.log('上传成功，服务器响应数据:', data);
      // 确保返回的数据包含必要的字段
      if (!data.videoId && !data.video_id) {
        console.error('服务器响应缺少videoId字段:', data);
        throw new Error('服务器响应格式错误: 缺少videoId字段');
      }
      if (!data.taskId && !data.task_id) {
        console.error('服务器响应缺少taskId字段:', data);
        throw new Error('服务器响应格式错误: 缺少taskId字段');
      }
      return data;
    })
    .catch(error => {
      console.error('上传失败:', error);
      // axios的错误对象结构不同，但我们的拦截器已经处理了大部分日志
      // 这里可以根据需要进行更具体的错误处理
      const message = error.response?.data?.message || error.message || '上传失败';
      if (message.includes('Network Error') || message.includes('timeout')) {
        throw new Error('上传失败: 网络连接问题，请检查服务器是否可达');
      }
      throw new Error(`上传失败: ${message}`);
    });
  },
  
  // 新增：获取视频签名URL
  getVideoSignedUrl(videoId) {
    return apiClient.get(`/api/videos/${videoId}/signed-stream-url`);
  },
  
  // 保留：获取视频流（作为备用方案）
  getVideoStream(videoId) {
    const cacheBuster = `_t=${new Date().getTime()}`;
    const url = `${API_ENDPOINTS.VIDEO.STREAM(videoId)}?${cacheBuster}`;
    
    return apiClient.get(url, {
      responseType: 'blob'
    });
  },
  
  // 获取视频处理状态
  getVideoProcessingStatus(taskId) {
    // 正常API调用 - 不再使用模拟模式
    console.log('获取视频处理状态，任务ID:', taskId);
    const url = API_ENDPOINTS.VIDEO.STATUS(taskId);
    console.log('请求URL:', url);
    
    return apiClient.get(url)
      .then(data => {
        console.log('获取处理状态成功:', data);
        return data;
      })
      .catch(error => {
        console.error('获取处理状态失败:', error);
        throw error;
      });
  },
  
  // 获取视频字幕
  getVideoSubtitles(videoId) {
    // 正常API调用 - 不再使用模拟模式
    console.log('获取视频字幕，视频ID:', videoId);
    const url = API_ENDPOINTS.VIDEO.SUBTITLES(videoId);
    console.log('请求URL:', url);
    
    return apiClient.get(url)
      .then(data => {
        console.log('获取字幕成功:', data);
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn('获取到的字幕数据为空或不是数组:', data);
        }
        return data;
      })
      .catch(error => {
        console.error('获取字幕失败:', error);
        throw error;
      });
  },
  
  // Word book related endpoints
  addCategory(data) {
    return apiClient.post(API_ENDPOINTS.WORDBOOK.CATEGORIES, data);
  },
  
  getWords() {
    return apiClient.get(API_ENDPOINTS.WORDBOOK.WORDS);
  },
  
  getWordDetail(wordId) {
    return apiClient.get(API_ENDPOINTS.WORDBOOK.WORD_DETAIL(wordId));
  },
  
  // 新增：获取单词详细信息（不添加到单词本）
  getWordInfo(word) {
    return apiClient.get(API_ENDPOINTS.WORDBOOK.WORD_INFO(encodeURIComponent(word)));
  },
  
  // 新增：智能添加单词（自动获取详细信息）
  addWordWithInfo(data) {
    return apiClient.post(API_ENDPOINTS.WORDBOOK.ADD_WITH_INFO, data);
  },
  
  // 新增：批量获取多个单词的详细信息
  getBatchWordInfo(words) {
    return apiClient.post(API_ENDPOINTS.WORDBOOK.BATCH_INFO, { words });
  },
  
  // 新增：刷新已存在单词的详细信息
  refreshWordInfo(wordId) {
    return apiClient.post(API_ENDPOINTS.WORDBOOK.REFRESH_INFO(wordId));
  },
  
  getCategories() {
    return apiClient.get(API_ENDPOINTS.WORDBOOK.CATEGORIES);
  },
  
  getCategoryDetail(categoryId) {
    return apiClient.get(API_ENDPOINTS.WORDBOOK.CATEGORY_DETAIL(categoryId));
  },
  
  moveWordsToCategory(data) {
    return apiClient.post(API_ENDPOINTS.WORDBOOK.MOVE_TO_CATEGORY, data);
  },
  
  addWord(data) {
    return apiClient.post(API_ENDPOINTS.WORDBOOK.WORDS, data);
  },
  
  updateWord(wordId, data) {
    return apiClient.put(API_ENDPOINTS.WORDBOOK.WORD_DETAIL(wordId), data);
  },
  
  deleteWord(wordId) {
    return apiClient.delete(API_ENDPOINTS.WORDBOOK.WORD_DETAIL(wordId));
  },
  
  // Story generation related endpoints
  generateStory(wordIds) {
    return apiClient.post(API_ENDPOINTS.STORY.GENERATE, { word_ids: wordIds });
  },
  
  saveStory(storyData) {
    return apiClient.post(API_ENDPOINTS.STORY.LIST, storyData);
  },
  
  getStories() {
    return apiClient.get(API_ENDPOINTS.STORY.LIST);
  },
  
  getStory(storyId) {
    return apiClient.get(API_ENDPOINTS.STORY.DETAIL(storyId));
  },
  
  deleteStory(storyId) {
    return apiClient.delete(API_ENDPOINTS.STORY.DETAIL(storyId));
  },

  // 修改：检查视频是否已存在（通过文件哈希）
  async checkVideoByHash(file) {
    console.log('检查视频重复，文件:', file.name, '大小:', file.size);
    
    try {
      // 1. 使用现有工具计算文件hash
      const fileHash = await fileHashCalculator.calculateSHA256(file);
      console.log('文件hash:', fileHash);
      
      // 2. 发送JSON格式数据（不是FormData）
      return apiClient.post(API_ENDPOINTS.VIDEO.CHECK_HASH, {
        hash: fileHash,
        filename: file.name,
        size: file.size
      })
      .then(data => {
        console.log('重复检测结果:', data);
        return data;
      });
      
    } catch (error) {
      console.error('检查视频重复失败:', error);
      throw error;
    }
  },

  // 新增：获取已处理的视频列表
  getVideoList(page = 1, perPage = 10) {
    console.log('获取视频列表，页码:', page, '每页:', perPage);
    
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString()
    });
    
    return apiClient.get(`/api/videos?${params}`)
      .then(data => {
        console.log('获取视频列表成功:', data);
        return data;
      })
      .catch(error => {
        console.error('获取视频列表失败:', error);
        throw error;
      });
  },

  // 新增：获取视频详情
  getVideoDetail(videoId) {
    console.log('获取视频详情，视频ID:', videoId);
    
    return apiClient.get(`/api/videos/${videoId}`)
      .then(data => {
        console.log('获取视频详情成功:', data);
        return data;
      })
      .catch(error => {
        console.error('获取视频详情失败:', error);
        throw error;
      });
  },

  // 新增：删除视频
  deleteVideoById(videoId) {
    console.log('删除视频，视频ID:', videoId);
    
    return apiClient.delete(`/api/videos/${videoId}`)
      .then(data => {
        console.log('删除视频成功:', data);
        return data;
      })
      .catch(error => {
        console.error('删除视频失败:', error);
        throw error;
      });
  },

  // 新增：更新分类
  updateCategory(categoryId, data) {
    return apiClient.put(API_ENDPOINTS.WORDBOOK.CATEGORY_DETAIL(categoryId), data);
  },
  
  // 新增：删除分类
  deleteCategory(categoryId) {
    return apiClient.delete(API_ENDPOINTS.WORDBOOK.CATEGORY_DETAIL(categoryId));
  },
  
  // 新增：批量删除单词
  deleteWordsBatch(wordIds) {
    return apiClient.delete(API_ENDPOINTS.WORDBOOK.BATCH_DELETE, { 
      data: { word_ids: wordIds }
    });
  },

  // 新增：获取性能统计
  getPerformanceStats() {
    return apiClient.get(API_ENDPOINTS.WORDBOOK.PERFORMANCE_STATS);
  },

  // ==================== 基础词库相关接口 ====================
  
  // 获取基础词库统计信息
  getBaseWordsStats() {
    return apiClient.get(API_ENDPOINTS.BASE_WORDS.STATS);
  },

  // 搜索基础词库
  searchBaseWords(query, limit = 50) {
    const params = new URLSearchParams();
    params.append('query', query);
    if (limit) params.append('limit', limit.toString());
    
    return apiClient.get(`${API_ENDPOINTS.BASE_WORDS.SEARCH}?${params}`);
  },

  // 获取特定单词（从基础词库）
  getBaseWord(word) {
    return apiClient.get(API_ENDPOINTS.BASE_WORDS.WORD(encodeURIComponent(word)));
  },

  // 检查词汇覆盖率
  checkWordsCoverage(words) {
    return apiClient.post(API_ENDPOINTS.BASE_WORDS.COVERAGE, { words });
  },

  // 按难度获取单词
  getWordsByDifficulty(level, limit = 100) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    return apiClient.get(`${API_ENDPOINTS.BASE_WORDS.DIFFICULTY(level)}?${params}`);
  },

  // 获取随机单词
  getRandomWords(count = 10, difficulty = null) {
    const params = new URLSearchParams();
    if (count) params.append('count', count.toString());
    if (difficulty) params.append('difficulty', difficulty.toString());
    
    return apiClient.get(`${API_ENDPOINTS.BASE_WORDS.RANDOM}?${params}`);
  },

  // 获取基础词库状态
  getBaseWordsStatus() {
    return apiClient.get(API_ENDPOINTS.BASE_WORDS.STATUS);
  },

  // 添加单词到基础词库
  addWordToBaseLibrary(wordData) {
    return apiClient.post(API_ENDPOINTS.BASE_WORDS.ADD_WORD, wordData);
  },

  // 批量导入单词到基础词库
  bulkImportWords(words, source = 'manual_batch_import') {
    return apiClient.post(API_ENDPOINTS.BASE_WORDS.BULK_IMPORT, { words, source });
  },

  // ==================== 辅助功能方法 ====================
  
  // 分析字幕词汇覆盖率
  async analyzeVocabularyCoverage(subtitles) {
    try {
      // 从字幕中提取所有唯一的英文单词
      const allWords = new Set();
      
      subtitles.forEach(subtitle => {
        const englishText = subtitle.englishText || subtitle.english_text || '';
        // 分词并清理
        const words = englishText
          .toLowerCase()
          .split(/\s+/)
          .map(word => word.replace(/[^\w'-]/g, ''))
          .filter(word => word.length > 1 && !/^\d+$/.test(word)); // 过滤数字和单字符
        
        words.forEach(word => allWords.add(word));
      });
      
      const uniqueWords = Array.from(allWords);
      console.log(`从字幕中提取到 ${uniqueWords.length} 个唯一词汇`);
      
      // 检查词汇覆盖率
      const coverageResponse = await this.checkWordsCoverage(uniqueWords);
      
      if (coverageResponse.success) {
        const coverage = coverageResponse.coverage;
        
        return {
          success: true,
          analysis: {
            totalWords: coverage.total_words,
            coveredWords: coverage.covered_words,
            coverageRate: coverage.coverage_rate,
            foundWords: coverage.found_words || [],
            missingWords: coverage.missing_words || [],
            detailedCoverage: coverage.detailed_coverage || []
          },
          recommendations: this.generateCoverageRecommendations(coverage)
        };
      } else {
        throw new Error('词汇覆盖率检查失败');
      }
    } catch (error) {
      console.error('词汇覆盖分析失败:', error);
      throw error;
    }
  },
  
  // 生成覆盖率建议
  generateCoverageRecommendations(coverage) {
    const recommendations = [];
    
    if (coverage.coverage_rate >= 90) {
      recommendations.push('✅ 优秀！基础词库覆盖率很高，大部分词汇可快速查询');
    } else if (coverage.coverage_rate >= 70) {
      recommendations.push('✨ 良好！基础词库覆盖了大部分词汇');
      recommendations.push('💡 建议：可以将缺失的常用词汇添加到基础词库');
    } else {
      recommendations.push('⚠️ 覆盖率较低，建议扩充基础词库');
      recommendations.push('🔧 可以使用批量导入功能添加缺失词汇');
    }
    
    if (coverage.missing_words && coverage.missing_words.length > 0) {
      recommendations.push(`📝 发现 ${coverage.missing_words.length} 个未覆盖词汇`);
    }
    
    return recommendations;
  },

  // ==================== 学习功能相关接口 ====================
  
  // 创建学习会话
  createLearningSession(videoId, config) {
    console.log('创建学习会话，视频ID:', videoId, '配置:', config);
    return apiClient.post(API_ENDPOINTS.LEARNING.CREATE_SESSION(videoId), config);
  },
  
  // 获取学习会话的增强字幕
  getLearningSubtitles(sessionId, page = 1, perPage = 50) {
    console.log('获取学习字幕，会话ID:', sessionId);
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    
    return apiClient.get(`${API_ENDPOINTS.LEARNING.GET_SUBTITLES(sessionId)}?${params}`);
  },
  
  // 更新学习会话设置（如语言显示设置）
  updateLearningSession(sessionId, config) {
    console.log('更新学习会话设置，会话ID:', sessionId, '配置:', config);
    // 由于API文档中没有明确的更新接口，这里可能需要重新创建会话或者通过其他方式实现
    // 暂时先使用获取字幕接口，在实际实现中需要根据后端提供的接口调整
    return this.getLearningSubtitles(sessionId);
  },
  
  // 生成学习问题
  generateLearningQuestions(sessionId, options = {}) {
    console.log('生成学习问题，会话ID:', sessionId, '选项:', options);
    const data = {
      count: options.count || 5
    };
    return apiClient.post(API_ENDPOINTS.LEARNING.GENERATE_QUESTIONS(sessionId), data);
  },
  
  // 提交问题答案
  submitQuestionAnswer(questionId, answerData) {
    console.log('提交问题答案，问题ID:', questionId, '答案数据:', answerData);
    return apiClient.post(API_ENDPOINTS.LEARNING.SUBMIT_ANSWER(questionId), answerData);
  },
  
  // 生成学习故事
  generateLearningStory(sessionId, words = null) {
    console.log('生成学习故事，会话ID:', sessionId, '单词:', words);
    const data = words ? { words } : {};
    return apiClient.post(API_ENDPOINTS.LEARNING.GENERATE_STORY(sessionId), data);
  },
  
  // 记录单词记忆状态
  recordWordMemory(sessionId, memoryData) {
    console.log('记录单词记忆状态，会话ID:', sessionId, '记忆数据:', memoryData);
    return apiClient.post(API_ENDPOINTS.LEARNING.RECORD_MEMORY(sessionId), memoryData);
  },
  
  // 完成学习会话
  completeLearningSession(sessionId) {
    console.log('完成学习会话，会话ID:', sessionId);
    return apiClient.post(API_ENDPOINTS.LEARNING.COMPLETE_SESSION(sessionId));
  },
  
  // 获取学习会话信息
  getLearningSession(sessionId) {
    console.log('获取学习会话信息，会话ID:', sessionId);
    return apiClient.get(API_ENDPOINTS.LEARNING.GET_SESSION(sessionId));
  },
  
  // 获取学习会话的问题列表
  getLearningQuestions(sessionId) {
    console.log('获取学习问题列表，会话ID:', sessionId);
    return apiClient.get(API_ENDPOINTS.LEARNING.GET_QUESTIONS(sessionId));
  },
  
  // 学习服务健康检查
  checkLearningHealth() {
    console.log('检查学习服务健康状态');
    return apiClient.get(API_ENDPOINTS.LEARNING.HEALTH_CHECK);
  },

  // ==================== 用户认证相关接口 ====================
  
  // 发送验证码
  sendVerificationCode(phone) {
    console.log('发送验证码，手机号:', phone);
    return apiClient.post(API_ENDPOINTS.AUTH.SEND_CODE, { phone });
  },

  // 用户注册
  register(phone, verificationCode, nickname = null) {
    console.log('用户注册，手机号:', phone, '昵称:', nickname);
    return apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
      phone,
      verification_code: verificationCode,
      nickname
    });
  },

  // 用户登录
  login(phone, verificationCode) {
    console.log('用户登录，手机号:', phone);
    return apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      phone,
      verification_code: verificationCode
    });
  },

  // 获取用户信息
  getUserProfile() {
    console.log('获取用户信息');
    return apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
  },

  // 更新用户信息
  updateUserProfile(data) {
    console.log('更新用户信息:', data);
    return apiClient.put(API_ENDPOINTS.AUTH.PROFILE, data);
  },

  // 刷新Token
  refreshToken() {
    console.log('刷新Token');
    return apiClient.post(API_ENDPOINTS.AUTH.REFRESH);
  },

  // 用户登出
  logout() {
    console.log('用户登出');
    return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  // ==================== 会员体系相关接口 ====================

  // 获取会员套餐
  getMembershipPlans() {
    console.log('获取会员套餐');
    return apiClient.get(API_ENDPOINTS.MEMBERSHIP.PLANS);
  },

  // 创建订单
  createOrder(planId) {
    console.log('创建订单，套餐ID:', planId);
    return apiClient.post(API_ENDPOINTS.MEMBERSHIP.ORDERS, { plan_id: planId });
  },

  // 发起支付
  initiatePayment(orderNo, paymentMethod) {
    console.log('发起支付，订单号:', orderNo, '支付方式:', paymentMethod);
    return apiClient.post(API_ENDPOINTS.MEMBERSHIP.PAYMENTS, {
      order_no: orderNo,
      payment_method: paymentMethod
    });
  },

  // 查询支付状态
  getPaymentStatus(orderNo) {
    console.log('查询支付状态，订单号:', orderNo);
    return apiClient.get(API_ENDPOINTS.MEMBERSHIP.PAYMENT_STATUS(orderNo));
  },

  // 获取订单历史
  getOrderHistory(page = 1, perPage = 10) {
    console.log('获取订单历史，页码:', page);
    return apiClient.get(`${API_ENDPOINTS.MEMBERSHIP.ORDERS}?page=${page}&per_page=${perPage}`);
  },

  // 获取会员状态
  getMembershipStatus() {
    console.log('获取会员状态');
    return apiClient.get(API_ENDPOINTS.MEMBERSHIP.STATUS);
  },

  // ==================== 用户数据相关接口 ====================

  // 获取用户单词本
  getUserWords(page = 1, perPage = 20, filters = {}) {
    console.log('获取用户单词本，页码:', page, '过滤条件:', filters);
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      ...filters
    });
    return apiClient.get(`${API_ENDPOINTS.USER.WORDS}?${params}`);
  },

  // 添加单词到用户单词本
  addUserWord(wordText, translation = null, categoryId = null) {
    console.log('添加用户单词:', wordText, '翻译:', translation);
    return apiClient.post(API_ENDPOINTS.USER.WORDS, {
      word_text: wordText,
      translation,
      category_id: categoryId
    });
  },

  // 更新单词学习状态
  updateUserWordStatus(wordId, isLearned) {
    console.log('更新单词学习状态，单词ID:', wordId, '是否已学会:', isLearned);
    return apiClient.put(API_ENDPOINTS.USER.WORD_STATUS(wordId), {
      is_learned: isLearned
    });
  },

  // 删除用户单词
  deleteUserWord(wordId) {
    console.log('删除用户单词，单词ID:', wordId);
    return apiClient.delete(API_ENDPOINTS.USER.DELETE_WORD(wordId));
  },

  // 获取用户学习统计
  getUserStatistics(period = 'week') {
    console.log('获取用户学习统计，周期:', period);
    return apiClient.get(`${API_ENDPOINTS.USER.STATISTICS}?period=${period}`);
  },

  // 获取用户学习会话历史
  getUserLearningSessions(page = 1, perPage = 10) {
    console.log('获取用户学习会话历史，页码:', page);
    return apiClient.get(`${API_ENDPOINTS.USER.LEARNING_SESSIONS}?page=${page}&per_page=${perPage}`);
  },

  // 创建用户学习会话
  createUserLearningSession(videoId, config) {
    console.log('创建用户学习会话，视频ID:', videoId, '配置:', config);
    return apiClient.post(API_ENDPOINTS.USER.CREATE_LEARNING_SESSION(videoId), config);
  },

  // 检查用户配额
  checkUserQuota() {
    console.log('检查用户配额');
    return apiClient.get(API_ENDPOINTS.USER.QUOTA_CHECK);
  },

  // 添加示例单词到用户单词本
  addUserSampleWords() {
    console.log('添加示例单词到用户单词本');
    return apiClient.post(API_ENDPOINTS.USER.ADD_SAMPLES);
  },

  // 新增：获取用户专属视频列表
  getUserVideoList(page = 1, perPage = 10) {
    console.log('获取用户视频列表，页码:', page, '每页:', perPage);
    
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString()
    });
    
    return apiClient.get(`${API_ENDPOINTS.USER.VIDEOS}?${params}`)
      .then(data => {
        console.log('获取用户视频列表成功:', data);
        return data;
      })
      .catch(error => {
        console.error('获取用户视频列表失败:', error);
        throw error;
      });
  },

  // 新增：获取用户视频详情
  getUserVideoDetail(videoId) {
    console.log('获取用户视频详情，视频ID:', videoId);
    
    return apiClient.get(API_ENDPOINTS.USER.VIDEO_DETAIL(videoId))
      .then(data => {
        console.log('获取用户视频详情成功:', data);
        return data;
      })
      .catch(error => {
        console.error('获取用户视频详情失败:', error);
        throw error;
      });
  },

  // 新增：删除用户视频
  deleteUserVideo(videoId) {
    console.log('删除用户视频，视频ID:', videoId);
    
    return apiClient.delete(API_ENDPOINTS.USER.DELETE_VIDEO(videoId))
      .then(data => {
        console.log('删除用户视频成功:', data);
        return data;
      })
      .catch(error => {
        console.error('删除用户视频失败:', error);
        throw error;
      });
  }
};

export default apiService;
