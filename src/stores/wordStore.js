import { defineStore } from 'pinia'
import apiService from '@/services/api'

export const useWordStore = defineStore('word', {
  state: () => ({
    words: [],
    categories: [],
    isLoading: false,
    error: null
  }),
  
  getters: {
    getWordById: (state) => (id) => {
      return state.words.find(word => word.id === id)
    },
    
    getWordsByCategory: (state) => (categoryId) => {
      if (categoryId === 'all') {
        return state.words
      }
      return state.words.filter(word => word.categoryId === categoryId)
    },
    
    getCategoryById: (state) => (id) => {
      return state.categories.find(category => category.id === id)
    },
    
    totalWordCount: (state) => {
      return state.words.length
    }
  },
  
  actions: {
    async fetchWords() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.getWords()
        this.words = response.data
      } catch (error) {
        this.error = error.message || 'Failed to fetch words'
        console.error('Error fetching words:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchCategories() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.getCategories()
        this.categories = response.data
      } catch (error) {
        this.error = error.message || 'Failed to fetch categories'
        console.error('Error fetching categories:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async addWord(wordData) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.addWord(wordData)
        this.words.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to add word'
        console.error('Error adding word:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async updateWord(wordId, wordData) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.updateWord(wordId, wordData)
        const index = this.words.findIndex(word => word.id === wordId)
        if (index !== -1) {
          this.words[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to update word'
        console.error('Error updating word:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async deleteWord(wordId) {
      this.isLoading = true
      this.error = null
      
      try {
        await apiService.deleteWord(wordId)
        this.words = this.words.filter(word => word.id !== wordId)
      } catch (error) {
        this.error = error.message || 'Failed to delete word'
        console.error('Error deleting word:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async addCategory(categoryData) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.addCategory(categoryData)
        this.categories.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to add category'
        console.error('Error adding category:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async updateCategory(categoryId, categoryData) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.updateCategory(categoryId, categoryData)
        const index = this.categories.findIndex(category => category.id === categoryId)
        if (index !== -1) {
          this.categories[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.message || 'Failed to update category'
        console.error('Error updating category:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async deleteCategory(categoryId) {
      this.isLoading = true
      this.error = null
      
      try {
        await apiService.deleteCategory(categoryId)
        this.categories = this.categories.filter(category => category.id !== categoryId)
      } catch (error) {
        this.error = error.message || 'Failed to delete category'
        console.error('Error deleting category:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async moveWordsToCategory(wordIds, categoryId) {
      this.isLoading = true
      this.error = null
      
      try {
        await apiService.moveWordsToCategory(wordIds, categoryId)
        
        // Update local state
        this.words = this.words.map(word => {
          if (wordIds.includes(word.id)) {
            return { ...word, categoryId }
          }
          return word
        })
      } catch (error) {
        this.error = error.message || 'Failed to move words'
        console.error('Error moving words:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    }
  }
})
