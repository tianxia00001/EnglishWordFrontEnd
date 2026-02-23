import { defineStore } from 'pinia';

export const useJobWordStore = defineStore('jobWordbook', {
  state: () => ({
    words: [],
    loading: false,
    error: null,
    selectedWords: [],
    pagination: {
      page: 1,
      perPage: 20,
      total: 0
    }
  }),
  getters: {
    selectedWordList(state) {
      return state.selectedWords;
    },
    selectionCount(state) {
      return state.selectedWords.length;
    },
    selectedWordIds(state) {
      return state.selectedWords.map(item => item.id);
    }
  },
  actions: {
    setWords(words, pagination = null) {
      this.words = words;
      if (pagination) {
        this.pagination = { ...this.pagination, ...pagination };
      }
    },
    setLoading(flag) {
      this.loading = flag;
    },
    setError(message) {
      this.error = message;
    },
    toggleSelection(word) {
      if (!word || !word.id) return;
      const exists = this.selectedWords.some(item => item.id === word.id);
      if (exists) {
        this.selectedWords = this.selectedWords.filter(item => item.id !== word.id);
      } else {
        this.selectedWords = [...this.selectedWords, word];
      }
    },
    replaceSelection(words) {
      this.selectedWords = [...words];
    },
    addToSelection(word) {
      if (!word || !word.id) return;
      if (!this.selectedWords.some(item => item.id === word.id)) {
        this.selectedWords = [...this.selectedWords, word];
      }
    },
    removeFromSelection(wordId) {
      this.selectedWords = this.selectedWords.filter(item => item.id !== wordId);
    },
    clearSelection() {
      this.selectedWords = [];
    }
  }
});
