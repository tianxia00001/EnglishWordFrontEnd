/**
 * API Configuration
 * This file contains all API endpoint configurations for the application.
 * To change the backend API URL, just modify the BASE_URL constant.
 */

// Base URL for all API requests
// In development, empty string will use the proxy in vue.config.js
// In production, this will be the full URL
export const BASE_URL = process.env.NODE_ENV === 'development' ? '' : process.env.VUE_APP_API_URL;

// API endpoints grouped by feature
export const API_ENDPOINTS = {
  // Root API endpoint to check service status
  ROOT: '/',
  
  // Video subtitle related endpoints
  VIDEO: {
    UPLOAD: '/api/videos/upload',  
    CHECK_HASH: '/api/videos/check-hash',  // 添加这一行
    STATUS: (taskId) => `/api/videos/status/${taskId}`,
    SUBTITLES: (videoId) => `/api/videos/${videoId}/subtitles`,
    STREAM: (videoId) => `/api/videos/${videoId}/stream`
  },
  
  // Word book related endpoints
  WORDBOOK: {
    WORDS: '/api/words',
    WORD_DETAIL: (wordId) => `/api/words/${wordId}`,
    WORD_INFO: (word) => `/api/words/info/${word}`,
    ADD_WITH_INFO: '/api/words/add-with-info',
    BATCH_INFO: '/api/words/batch-info',
    REFRESH_INFO: (wordId) => `/api/words/${wordId}/refresh-info`,
    PERFORMANCE_STATS: '/api/words/performance-stats',
    CATEGORIES: '/api/categories',
    CATEGORY_DETAIL: (categoryId) => `/api/categories/${categoryId}`,
    MOVE_TO_CATEGORY: '/api/words/batch/move',
    BATCH_DELETE: '/api/words/batch',
  },
  
  // Base vocabulary library endpoints
  BASE_WORDS: {
    STATS: '/api/base-words/stats',
    SEARCH: '/api/base-words/search',
    WORD: (word) => `/api/base-words/word/${word}`,
    COVERAGE: '/api/base-words/coverage',
    DIFFICULTY: (level) => `/api/base-words/difficulty/${level}`,
    RANDOM: '/api/base-words/random',
    STATUS: '/api/base-words/status',
    ADD_WORD: '/api/base-words/word',
    BULK_IMPORT: '/api/base-words/bulk-import'
  },
  
  // Story generation related endpoints
  STORY: {
    GENERATE: '/api/stories/generate',
    LIST: '/api/stories/',
    DETAIL: (storyId) => `/api/stories/${storyId}`,
  },
  
  // Learning session related endpoints
  LEARNING: {
    CREATE_SESSION: (videoId) => `/api/learning/videos/${videoId}/learning-session`,
    GET_SUBTITLES: (sessionId) => `/api/learning/sessions/${sessionId}/subtitles`,
    GENERATE_QUESTIONS: (sessionId) => `/api/learning/sessions/${sessionId}/questions/generate`,
    SUBMIT_ANSWER: (questionId) => `/api/learning/questions/${questionId}/answer`,
    GENERATE_STORY: (sessionId) => `/api/learning/sessions/${sessionId}/story`,
    RECORD_MEMORY: (sessionId) => `/api/learning/sessions/${sessionId}/words/memory`,
    COMPLETE_SESSION: (sessionId) => `/api/learning/sessions/${sessionId}/complete`,
    GET_SESSION: (sessionId) => `/api/learning/sessions/${sessionId}`,
    GET_QUESTIONS: (sessionId) => `/api/learning/sessions/${sessionId}/questions`,
    HEALTH_CHECK: '/api/learning/health'
  },

  // User Authentication endpoints
  AUTH: {
    SEND_CODE: '/api/auth/send-code',
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    PROFILE: '/api/auth/profile',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout'
  },

  // Membership related endpoints
  MEMBERSHIP: {
    PLANS: '/api/membership/plans',
    ORDERS: '/api/membership/orders',
    PAYMENTS: '/api/membership/payments',
    PAYMENT_STATUS: (orderNo) => `/api/membership/payments/${orderNo}/status`,
    STATUS: '/api/membership/status'
  },

  // User data endpoints
  USER: {
    WORDS: '/api/user/words',
    WORD_STATUS: (wordId) => `/api/user/words/${wordId}/status`,
    DELETE_WORD: (wordId) => `/api/user/words/${wordId}`,
    STATISTICS: '/api/user/statistics',
    LEARNING_SESSIONS: '/api/user/learning/sessions',
    CREATE_LEARNING_SESSION: (videoId) => `/api/user/learning/videos/${videoId}/session`,
    QUOTA_CHECK: '/api/user/quota/check',
    ADD_SAMPLES: '/api/user/words/add-samples',
    
    // 用户视频相关端点
    VIDEOS: '/api/user/videos',
    VIDEO_DETAIL: (videoId) => `/api/user/videos/${videoId}`,
    DELETE_VIDEO: (videoId) => `/api/user/videos/${videoId}`
  }
};

export default {
  BASE_URL,
  API_ENDPOINTS
};
