import { defineStore } from 'pinia'

function upsertById(list, item) {
  const idx = list.findIndex(entry => entry.id === item.id)
  if (idx >= 0) {
    list.splice(idx, 1, { ...list[idx], ...item })
  } else {
    list.push(item)
  }
}

export const useSegmentStudyStore = defineStore('segmentStudy', {
  state: () => ({
    segmentsLive: [],
    segmentCaptionsMap: {},
    activePlayerSegmentId: null,
    loading: false,
    error: null,
    eventSource: null,
    pollTimer: null
  }),
  getters: {
    orderedSegments(state) {
      return [...state.segmentsLive].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    }
  },
  actions: {
    resetState() {
      this.segmentsLive = []
      this.segmentCaptionsMap = {}
      this.activePlayerSegmentId = null
      this.loading = false
      this.error = null
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    replaceSegments(list) {
      this.segmentsLive = [...(list || [])]
    },
    upsertSegment(segment) {
      if (!segment?.id) return
      upsertById(this.segmentsLive, segment)
    },
    setSegmentCaptions(segmentId, captions) {
      if (!segmentId) return
      this.segmentCaptionsMap[segmentId] = [...(captions || [])]
    },
    upsertSegmentCaptions(segmentId, captions) {
      if (!segmentId || !Array.isArray(captions) || !captions.length) return
      const existing = this.segmentCaptionsMap[segmentId] || []
      const merged = [...existing]
      captions.forEach(item => {
        const idx = merged.findIndex(c => c.id === item.id)
        if (idx >= 0) {
          merged.splice(idx, 1, { ...merged[idx], ...item })
        } else {
          merged.push(item)
        }
      })
      merged.sort((a, b) => (a.start_seconds - b.start_seconds) || (a.end_seconds - b.end_seconds) || ((a.index ?? 0) - (b.index ?? 0)))
      this.segmentCaptionsMap[segmentId] = merged
    },
    setActivePlayer(segmentId) {
      this.activePlayerSegmentId = segmentId || null
    },
    attachEventSource(es) {
      if (this.eventSource) {
        this.eventSource.close()
      }
      this.eventSource = es
    },
    attachPollTimer(timer) {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
      }
      this.pollTimer = timer
    },
    disconnectStreams() {
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    applyEvent(payload) {
      if (!payload || !payload.type) return

      if (payload.type === 'segment_started') {
        this.upsertSegment({ id: payload.segment_id, index: payload.segment_index ?? 0, status: 'running' })
        return
      }
      if (payload.type === 'segment_completed') {
        this.upsertSegment({ id: payload.segment_id, index: payload.segment_index ?? 0, status: 'completed' })
        return
      }
      if (payload.type === 'segment_failed') {
        this.upsertSegment({ id: payload.segment_id, index: payload.segment_index ?? 0, status: 'failed', error: payload.error || null })
        return
      }
      if (payload.type === 'segment_playback_preparing') {
        this.upsertSegment({ id: payload.segment_id, index: payload.segment_index ?? 0, playback_status: 'preparing', playback_error: null })
        return
      }
      if (payload.type === 'segment_playback_ready') {
        this.upsertSegment({
          id: payload.segment_id,
          index: payload.segment_index ?? 0,
          playback_status: 'ready',
          playback_error: null,
          playback_url: payload.playback_url || null
        })
        return
      }
      if (payload.type === 'segment_playback_failed') {
        this.upsertSegment({
          id: payload.segment_id,
          index: payload.segment_index ?? 0,
          playback_status: 'failed',
          playback_error: payload.error || null
        })
      }
    }
  }
})
