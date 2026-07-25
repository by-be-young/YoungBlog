import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 全局音乐状态 Store
 * 音频实例和播放状态在此统一管理，FloatingControls 和 SettingsModal 共享
 */
export const useMusicStore = defineStore('music', () => {
  // ============ State ============
  const audio = ref(null)          // HTMLAudioElement 实例
  const currentTrack = ref('')     // 当前选中的曲目文件名（用户选择，不一定已加载）
  const isPlaying = ref(false)     // 是否正在播放
  const currentTime = ref(0)       // 当前播放位置（秒）
  const duration = ref(0)          // 曲目总时长（秒）
  const volume = ref(0.2)          // 音量 0-1，默认 20%
  const isInitialized = ref(false) // 是否已初始化（用户手势后）

  /** 实际已加载到 <audio> 的曲目名（避免 URL 编码导致比较失败） */
  let loadedTrack = ''

  // ============ Getters ============
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  // ============ Actions ============

  /** 创建 Audio 实例（必须在用户手势后调用，满足浏览器自动播放策略） */
  function initAudio() {
    if (audio.value) return
    audio.value = new Audio()
    audio.value.loop = true
    audio.value.volume = volume.value

    // 进度更新
    audio.value.addEventListener('timeupdate', () => {
      currentTime.value = audio.value.currentTime
      duration.value = audio.value.duration || 0
    })
    // 播放状态同步
    audio.value.addEventListener('play', () => { isPlaying.value = true })
    audio.value.addEventListener('pause', () => { isPlaying.value = false })
    audio.value.addEventListener('ended', () => { isPlaying.value = false })
    // 加载失败处理（音乐文件可能不存在）
    audio.value.addEventListener('error', () => {
      isPlaying.value = false
      loadedTrack = '' // 重置，下次点击可以重试加载
    })

    isInitialized.value = true
  }

  /** 播放 / 暂停切换
   *  @param {string} [trackName] - 可选，指定要播放的曲目文件名（SettingsModal 使用）
   *                               不传则使用当前已选的曲目；无曲目时默认播放第一首
   */
  function togglePlay(trackName) {
    if (!audio.value) initAudio()

    // 如果传入了曲目名（来自 SettingsModal 的「播放」按钮），更新选中
    if (trackName) {
      currentTrack.value = trackName
    }

    // 仍未选中曲目 → 默认播放第一首（来自悬浮球点击）
    if (!currentTrack.value) {
      currentTrack.value = '抹不去的记忆.mp3'
    }

    // 仅当曲目确实切换时才重新加载（避免 URL 编码导致的误判）
    if (currentTrack.value !== loadedTrack) {
      audio.value.src = `/music/${currentTrack.value}`
      audio.value.load()
      loadedTrack = currentTrack.value
    }

    if (audio.value.paused) {
      audio.value.play().catch(() => {
        // 浏览器阻止自动播放 — 静默失败，用户下次点击会重试
      })
    } else {
      audio.value.pause()
    }
  }

  /** 停止播放并重置进度 */
  function stop() {
    if (audio.value) {
      audio.value.pause()
      audio.value.currentTime = 0
      currentTime.value = 0
    }
  }

  /** 跳转到指定进度位置 */
  function seek(value) {
    if (audio.value && duration.value > 0) {
      audio.value.currentTime = (value / 100) * duration.value
    }
  }

  /** 设置音量 */
  function setVolume(value) {
    volume.value = value
    if (audio.value) {
      audio.value.volume = value
    }
  }

  /** 切换曲目（只更新选中，不自动播放）
   *  如果正在播放，则切换到新曲目并继续播放
   */
  function setTrack(trackName) {
    currentTrack.value = trackName
    if (!trackName) {
      // 选为「无」时重置状态
      isPlaying.value = false
      currentTime.value = 0
      duration.value = 0
    }
  }

  /** 格式化秒数为 MM:SS */
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return {
    // state
    audio,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isInitialized,
    // getters
    progress,
    // actions
    initAudio,
    togglePlay,
    stop,
    seek,
    setVolume,
    setTrack,
    formatTime,
  }
})
