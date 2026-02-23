import { defineStore } from 'pinia';

function upsert(list, item, key = 'id') {
  const index = list.findIndex(existing => existing[key] === item[key]);
  if (index >= 0) {
    list.splice(index, 1, { ...list[index], ...item });
  } else {
    list.push(item);
  }
}

export const useJobStore = defineStore('job', {
  state: () => ({
    currentJob: null,
    segments: [],
    chunks: [],
    captions: [],
    events: [],
    loading: false,
    error: null,
    eventSource: null,
    pollTimer: null
  }),
  getters: {
    orderedSegments(state) {
      return [...state.segments].sort((a, b) => a.index - b.index);
    },
    chunksBySegment(state) {
      return state.chunks.reduce((acc, chunk) => {
        if (!acc[chunk.segment_id]) {
          acc[chunk.segment_id] = [];
        }
        acc[chunk.segment_id].push(chunk);
        return acc;
      }, {});
    },
    completedChunks(state) {
      return state.chunks.filter(chunk => chunk.status === 'completed');
    },
    segmentOffsets(state) {
      const sorted = [...state.segments].sort((a, b) => a.index - b.index);
      let offset = 0;
      const offsets = {};
      sorted.forEach((segment) => {
        offsets[segment.id] = offset;
        const duration = Number(segment.duration_seconds);
        const fallback = this.currentJob?.segment_seconds || 0;
        offset += Number.isFinite(duration) && duration > 0 ? duration : fallback;
      });
      return offsets;
    },
    subtitleEntries(state) {
      const defaultChunkDuration = this.currentJob?.chunk_seconds || 1;

      if (state.captions.length) {
        return [...state.captions]
          .map(caption => {
            const start = Number(caption.start_seconds) || 0;
            const endRaw = Number(caption.end_seconds);
            const end = Number.isFinite(endRaw) && endRaw > start ? endRaw : (start + 0.2);
            return {
              id: caption.id,
              segmentId: caption.segment_id,
              chunkId: caption.chunk_id,
              index: caption.index ?? 0,
              start,
              end,
              transcript: caption.transcript_text || '',
              translation: caption.translated_text || '',
              targetLang: this.currentJob?.target_lang || 'zh'
            };
          })
          .sort((a, b) => (a.start - b.start) || (a.end - b.end) || (a.index - b.index));
      }

      const offsets = this.segmentOffsets;
      const segmentsById = state.segments.reduce((acc, segment) => {
        acc[segment.id] = segment;
        return acc;
      }, {});

      return state.chunks
        .filter(chunk => chunk.status === 'completed' && (chunk.transcript_text || chunk.translated_text))
        .map(chunk => {
          const offset = offsets[chunk.segment_id] ?? 0;
          const start = offset + (Number(chunk.start_seconds) || 0);
          const duration = Number(chunk.duration_seconds);
          const end = start + (Number.isFinite(duration) && duration > 0 ? duration : defaultChunkDuration);
          const segment = segmentsById[chunk.segment_id];
          return {
            id: chunk.id,
            segmentId: chunk.segment_id,
            segmentIndex: segment?.index ?? 0,
            index: chunk.index ?? 0,
            start,
            end,
            transcript: chunk.transcript_text || '',
            translation: chunk.translated_text || '',
            targetLang: chunk.target_lang || this.currentJob?.target_lang || 'zh'
          };
        })
        .sort((a, b) => a.start - b.start);
    }
  },
  actions: {
    setLoading(flag) {
      this.loading = flag;
    },
    setError(message) {
      this.error = message;
    },
    resetState() {
      this.currentJob = null;
      this.segments = [];
      this.chunks = [];
      this.captions = [];
      this.events = [];
      this.error = null;
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    setJob(job) {
      this.currentJob = job;
    },
    upsertSegment(segment) {
      upsert(this.segments, segment);
    },
    replaceSegments(list) {
      this.segments = [...list];
    },
    upsertChunk(chunk) {
      upsert(this.chunks, chunk);
    },
    replaceChunks(list) {
      this.chunks = [...list];
    },
    upsertCaption(caption) {
      if (!caption?.id) return;
      upsert(this.captions, caption);
    },
    upsertCaptions(list) {
      (list || []).forEach(item => this.upsertCaption(item));
    },
    replaceCaptions(list) {
      this.captions = [...(list || [])];
    },
    appendEvent(event) {
      this.events.push({ ...event, timestamp: Date.now() });
      if (this.events.length > 400) {
        this.events.splice(0, this.events.length - 400);
      }
    },
    attachEventSource(es) {
      if (this.eventSource) {
        this.eventSource.close();
      }
      this.eventSource = es;
    },
    attachPollTimer(timer) {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
      }
      this.pollTimer = timer;
    },
    disconnectStreams() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    updateJobFields(fields) {
      if (!this.currentJob) {
        this.currentJob = { ...fields };
      } else {
        this.currentJob = { ...this.currentJob, ...fields };
      }
    },
    markJobFinished(status = 'completed') {
      if (this.currentJob) {
        const progress = status === 'completed' ? 1 : (this.currentJob.progress ?? 0);
        this.currentJob = { ...this.currentJob, status, progress };
      }
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    markSegmentStatus(segmentId, status, error = null) {
      const segment = this.segments.find(item => item.id === segmentId);
      if (segment) {
        segment.status = status;
        if (error !== undefined) segment.error = error;
      } else {
        this.segments.push({ id: segmentId, status, index: 0, error: error || null });
      }
    },
    markChunkStatus(chunkId, fields) {
      const chunk = this.chunks.find(item => item.id === chunkId);
      if (chunk) {
        Object.assign(chunk, fields);
      } else {
        this.chunks.push({ id: chunkId, ...fields });
      }
    },
    applyEvent(payload) {
      if (!payload || !payload.type) return;
      switch (payload.type) {
        case 'job_started':
          this.updateJobFields({ status: 'running', progress: this.currentJob?.progress ?? 0 });
          break;
        case 'job_failed':
          this.updateJobFields({ status: 'failed', error: payload.error });
          this.markJobFinished('failed');
          break;
        case 'job_completed':
          this.markJobFinished('completed');
          break;
        case 'job_progress':
          this.updateJobFields({ progress: payload.progress });
          break;
        case 'totals':
          this.updateJobFields({ total_segments: payload.segments, total_chunks: payload.total_chunks });
          break;
        case 'segment_started':
          this.markSegmentStatus(payload.segment_id, 'running');
          break;
        case 'segment_completed':
          this.markSegmentStatus(payload.segment_id, 'completed', null);
          break;
        case 'segment_failed':
          this.markSegmentStatus(payload.segment_id, 'failed', payload.error || null);
          break;
        case 'chunk_started':
          this.markChunkStatus(payload.chunk_id, {
            job_id: this.currentJob?.id,
            segment_id: payload.segment_id,
            index: payload.index,
            status: 'running',
            start_seconds: payload.start_seconds,
            duration_seconds: payload.duration_seconds,
            error: null
          });
          break;
        case 'chunk_completed':
          this.markChunkStatus(payload.chunk_id, {
            job_id: this.currentJob?.id,
            segment_id: payload.segment_id,
            index: payload.index,
            status: 'completed',
            start_seconds: payload.start_seconds,
            duration_seconds: payload.duration_seconds,
            transcript_text: payload.transcript,
            translated_text: payload.translation,
            target_lang: payload.target_lang,
            error: null
          });
          if (Array.isArray(payload.captions) && payload.captions.length) {
            this.upsertCaptions(payload.captions);
          }
          break;
        case 'chunk_failed':
          this.markChunkStatus(payload.chunk_id, {
            job_id: this.currentJob?.id,
            segment_id: payload.segment_id,
            index: payload.index,
            status: 'failed',
            start_seconds: payload.start_seconds,
            duration_seconds: payload.duration_seconds,
            error: payload.error
          });
          break;
        default:
          break;
      }
      this.appendEvent(payload);
    }
  }
});
