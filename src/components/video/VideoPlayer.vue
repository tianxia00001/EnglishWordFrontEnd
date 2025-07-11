<template>
  <div class="video-player-wrapper">
    <div data-vjs-player>
      <video
        ref="videoPlayer"
        class="video-js vjs-big-play-centered"
      ></video>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

export default {
  name: 'VideoPlayer',
  props: {
    options: {
      type: Object,
      required: true
    }
  },
  emits: ['timeupdate', 'ready'],
  setup(props, { emit }) {
    const videoPlayer = ref(null)
    let player = null
    
    const initializePlayer = () => {
      if (!videoPlayer.value) return
      
      // Initialize video.js player
      player = videojs(videoPlayer.value, props.options, () => {
        // Player is ready
        emit('ready', player)
        
        // Add event listeners
        player.on('timeupdate', () => {
          emit('timeupdate', player)
        })
      })
    }
    
    // Watch for changes in options (e.g., video source)
    watch(() => props.options.sources, (newSources) => {
      if (player && newSources && newSources.length > 0) {
        player.src(newSources)
        player.load()
      }
    }, { deep: true })
    
    // Lifecycle hooks
    onMounted(() => {
      initializePlayer()
    })
    
    onBeforeUnmount(() => {
      if (player) {
        player.dispose()
      }
    })
    
    // Expose methods to parent component
    const play = () => {
      if (player) player.play()
    }
    
    const pause = () => {
      if (player) player.pause()
    }
    
    const currentTime = () => {
      return player ? player.currentTime() : 0
    }
    
    const duration = () => {
      return player ? player.duration() : 0
    }
    
    const setCurrentTime = (time) => {
      if (player) player.currentTime(time)
    }
    
    return {
      videoPlayer,
      play,
      pause,
      currentTime,
      duration,
      setCurrentTime
    }
  }
}
</script>

<style scoped>
.video-player-wrapper {
  width: 100%;
  position: relative;
}

.video-js {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}
</style>
