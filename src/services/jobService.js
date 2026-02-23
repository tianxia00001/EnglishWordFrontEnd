import axios from 'axios';

const JOB_BASE = process.env.VUE_APP_JOB_API_URL || '';

const jobClient = axios.create({
  baseURL: JOB_BASE,
  timeout: 180000
});

jobClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

function normalizeBase(base) {
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

const normalizedBase = normalizeBase(JOB_BASE);

export default {
  healthCheck() {
    return jobClient.get('/api/health').then(resp => resp.data);
  },
  diagnostics() {
    return jobClient.get('/api/diagnostics').then(resp => resp.data);
  },
  async createJob({ file, targetLang, segmentSeconds, chunkSeconds }, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (targetLang) formData.append('target_lang', targetLang);
    if (segmentSeconds) formData.append('segment_seconds', String(segmentSeconds));
    if (chunkSeconds) formData.append('chunk_seconds', String(chunkSeconds));

    const response = await jobClient.post('/api/jobs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: options.timeout ?? 3600000,
      onUploadProgress: options.onUploadProgress
    });
    return response.data;
  },
  async getJob(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}`);
    return response.data;
  },
  async getSegments(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}/segments`);
    return response.data;
  },
  async getSegmentsLive(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}/segments-live`);
    return response.data;
  },
  async getChunks(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}/chunks`);
    return response.data;
  },
  async getCaptions(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}/captions`);
    return response.data;
  },
  async getSegmentCaptions(segmentId, relative = true) {
    const relativeFlag = relative ? 1 : 0;
    const response = await jobClient.get(`/api/segments/${segmentId}/captions?relative=${relativeFlag}`);
    return response.data;
  },
  async getSyncReport(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}/sync-report`);
    return response.data;
  },
  async triggerRealign(jobId) {
    const response = await jobClient.post(`/api/jobs/${jobId}/realign`);
    return response.data;
  },
  streamJob(jobId) {
    const url = `${normalizedBase}/api/jobs/${jobId}/stream`;
    return new EventSource(url);
  },
  segmentVideoUrl(segmentId) {
    return `${normalizedBase}/api/segments/${segmentId}/video`;
  },
  segmentPlaybackUrl(segmentId) {
    return `${normalizedBase}/api/segments/${segmentId}/playback`;
  },
  async getSegmentPlaybackStatus(segmentId) {
    const response = await jobClient.get(`/api/segments/${segmentId}/playback/status`);
    return response.data;
  },
  async fetchJobVideo(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}/source`, { responseType: 'blob' });
    return response.data;
  },
  async getJobVideoStatus(jobId) {
    const response = await jobClient.get(`/api/jobs/${jobId}/source/status`);
    return response.data;
  },
  jobVideoUrl(jobId) {
    return `${normalizedBase}/api/jobs/${jobId}/source`;
  }
};
