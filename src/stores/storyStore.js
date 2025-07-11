import { defineStore } from 'pinia'
import apiService from '@/services/api'

export const useStoryStore = defineStore('story', {
  state: () => ({
    stories: [],
    currentStory: null,
    isLoading: false,
    error: null
  }),
  
  getters: {
    getStoryById: (state) => (id) => {
      return state.stories.find(story => story.id === id)
    }
  },
  
  actions: {
    async fetchStories() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.getStories()
        this.stories = response.data
      } catch (error) {
        this.error = error.message || 'Failed to fetch stories'
        console.error('Error fetching stories:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchStory(storyId) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.getStory(storyId)
        this.currentStory = response.data
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to fetch story'
        console.error('Error fetching story:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async generateStory(wordIds) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.generateStory(wordIds)
        this.currentStory = response.data
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to generate story'
        console.error('Error generating story:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async saveStory(storyData) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.saveStory(storyData)
        this.stories.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to save story'
        console.error('Error saving story:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async deleteStory(storyId) {
      this.isLoading = true
      this.error = null
      
      try {
        await apiService.deleteStory(storyId)
        this.stories = this.stories.filter(story => story.id !== storyId)
      } catch (error) {
        this.error = error.message || 'Failed to delete story'
        console.error('Error deleting story:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    clearCurrentStory() {
      this.currentStory = null
    }
  }
})
