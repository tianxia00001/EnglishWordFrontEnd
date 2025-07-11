import { defineStore } from 'pinia'
import apiService from '@/services/api'

export const useVideoStore = defineStore('video', {
  state: () => ({
    videoUrl: '',
    subtitles: [],
    currentTaskId: null,
    processingStatus: null, // null, 'processing', 'completed', 'error'
    processingProgress: 0,
    processingMessage: '',
    isLoading: false,
    error: null
  }),
  
  getters: {
    isProcessing: (state) => {
      return state.processingStatus === 'processing'
    },
    
    isCompleted: (state) => {
      return state.processingStatus === 'completed'
    },
    
    hasError: (state) => {
      return state.processingStatus === 'error'
    },
    
    getSubtitleAtTime: (state) => (time) => {
      return state.subtitles.find(subtitle => 
        time >= subtitle.startTime && time <= subtitle.endTime
      ) || null
    }
  },
  
  actions: {
    async uploadVideo(formData) {
      this.isLoading = true
      this.error = null
      this.processingStatus = 'processing'
      this.processingProgress = 0
      this.processingMessage = '正在上传视频...'
      
      try {
        const response = await apiService.uploadVideo(formData)
        this.videoUrl = response.data.videoUrl
        this.currentTaskId = response.data.taskId
        
        // Start polling for processing status
        this.pollProcessingStatus()
        
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to upload video'
        this.processingStatus = 'error'
        this.processingMessage = '视频上传失败，请重试'
        console.error('Error uploading video:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async pollProcessingStatus() {
      if (!this.currentTaskId) return
      
      try {
        const response = await apiService.getVideoProcessingStatus(this.currentTaskId)
        const { status, progress, message } = response.data
        
        this.processingStatus = status
        this.processingProgress = progress
        this.processingMessage = message
        
        if (status === 'processing') {
          // Continue polling
          setTimeout(() => this.pollProcessingStatus(), 2000)
        } else if (status === 'completed') {
          // Fetch subtitles
          this.fetchSubtitles()
        }
      } catch (error) {
        this.error = error.message || 'Failed to get processing status'
        this.processingStatus = 'error'
        console.error('Error polling processing status:', error)
      }
    },
    
    async fetchSubtitles() {
      if (!this.videoUrl) return
      
      this.isLoading = true
      this.error = null
      
      try {
        // Extract video ID from URL or use task ID
        const videoId = this.currentTaskId
        
        const response = await apiService.getVideoSubtitles(videoId)
        this.subtitles = response.data
      } catch (error) {
        this.error = error.message || 'Failed to fetch subtitles'
        console.error('Error fetching subtitles:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    resetState() {
      this.videoUrl = ''
      this.subtitles = []
      this.currentTaskId = null
      this.processingStatus = null
      this.processingProgress = 0
      this.processingMessage = ''
      this.error = null
    }
  }
})
