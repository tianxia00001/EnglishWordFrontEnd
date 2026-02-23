import axios from 'axios';

const legacyClient = axios.create({
  baseURL: '',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

legacyClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default {
  async listWords(params = {}) {
    const query = new URLSearchParams();
    if (params.categoryId && params.categoryId !== 'all') {
      query.set('category_id', params.categoryId);
    }
    if (params.detailed === false) {
      query.set('detailed', 'false');
    }
    const suffix = query.toString();
    const response = await legacyClient.get(`/api/words${suffix ? `?${suffix}` : ''}`);
    return response.data;
  },
  async listVideoWordSelections(videoId) {
    const response = await legacyClient.get(`/api/videos/${encodeURIComponent(videoId)}/word-selections`);
    return response.data;
  },
  async saveVideoWordSelection(videoId, payload) {
    const response = await legacyClient.post(`/api/videos/${encodeURIComponent(videoId)}/word-selections`, payload);
    return response.data;
  },
  async getWordInfo(word) {
    const response = await legacyClient.get(`/api/words/info/${encodeURIComponent(word)}`);
    return response.data;
  },
  async addWordWithInfo(payload) {
    const response = await legacyClient.post('/api/words/add-with-info', payload);
    return response.data;
  },
  async addWordBasic(payload) {
    const response = await legacyClient.post('/api/words', payload);
    return response.data;
  },
  async deleteWord(wordId) {
    const response = await legacyClient.delete(`/api/words/${wordId}`);
    return response.data;
  },
  async refreshWord(wordId) {
    const response = await legacyClient.post(`/api/words/${wordId}/refresh-info`);
    return response.data;
  },
  async listStories() {
    const response = await legacyClient.get('/api/stories/');
    return response.data;
  },
  async generateStory(wordIds, options = {}) {
    const response = await legacyClient.post('/api/stories/', {
      word_ids: wordIds,
      title: options.title,
      is_public: options.isPublic ?? false
    });
    return response.data;
  }
};
