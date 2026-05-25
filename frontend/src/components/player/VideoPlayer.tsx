'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, ChevronLeft,
  Loader2, AlertCircle
} from 'lucide-react'
import { mediaApi } from '@/lib/api'

interface VideoPlayerProps {
  mediaId: string
  episodeId?: string
  title: string
  onBack?: () => void
  initialPosition?: number
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

export function VideoPlayer({ mediaId, episodeId, title, onBack, initialPosition = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimeout = useRef<NodeJS.Timeout>()
  const progressSaveTimeout = useRef<NodeJS.Timeout>()

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [quality, setQuality] = useState('auto')
  const [qualities, setQualities] = useState<string[]>([])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  // Load HLS stream
  useEffect(() => {
    const loadStream = async () => {
      try {
        const { data } = await mediaApi.stream(mediaId, episodeId)
        const hlsUrl = data.hls_url || data.url
        const video = videoRef.current
        if (!video) return
        const isHls = hlsUrl.includes('.m3u8') || hlsUrl.includes('/hls/')

        if (!isHls) {
          video.src = hlsUrl
          video.currentTime = initialPosition
          video.play().catch(() => {})
        } else if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
          hlsRef.current = hls
          hls.loadSource(hlsUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            const qs = data.levels.map((l: any) => `${l.height}p`)
            setQualities(['auto', ...qs])
            video.currentTime = initialPosition
            video.play().catch(() => {})
          })
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setError('Stream error. Please try again.')
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl
          video.currentTime = initialPosition
          video.play().catch(() => {})
        } else {
          setError('HLS not supported in this browser.')
        }
      } catch {
        setError('Failed to load stream.')
      }
    }
    loadStream()
    return () => { hlsRef.current?.destroy() }
  }, [mediaId, episodeId, initialPosition])

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onCanPlay = () => setLoading(false)
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime)
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
      // Save progress every 10s
      clearTimeout(progressSaveTimeout.current)
      progressSaveTimeout.current = setTimeout(() => {
        mediaApi.updateProgress(mediaId, v.currentTime, v.duration, episodeId).catch(() => {})
      }, 10000)
    }
    const onDurationChange = () => setDuration(v.duration)
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement)

    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('durationchange', onDurationChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('durationchange', onDurationChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [mediaId, episodeId])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    playing ? v.pause() : v.play()
    resetControlsTimer()
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    v.currentTime = pct * duration
    resetControlsTimer()
  }

  const skip = (secs: number) => {
    if (videoRef.current) videoRef.current.currentTime += secs
    resetControlsTimer()
  }

  const handleVolume = (val: number) => {
    if (videoRef.current) {
      videoRef.current.volume = val
      videoRef.current.muted = val === 0
    }
    setVolume(val)
    setMuted(val === 0)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !muted
      videoRef.current.muted = newMuted
      setMuted(newMuted)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyF','KeyM'].includes(e.code)) {
      e.preventDefault()
      resetControlsTimer()
    }
    if (e.code === 'Space') togglePlay()
    if (e.code === 'ArrowLeft') skip(-10)
    if (e.code === 'ArrowRight') skip(10)
    if (e.code === 'KeyF') toggleFullscreen()
    if (e.code === 'KeyM') toggleMute()
  }, [playing])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const progress = duration ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration ? (buffered / duration) * 100 : 0

  if (error) return (
    <div className="w-full aspect-video bg-black flex items-center justify-center rounded-2xl">
      <div className="text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
        <p className="text-white/70">{error}</p>
        <button onClick={() => setError(null)} className="mt-4 btn-nova text-sm px-4 py-2">Retry</button>
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group select-none"
      onMouseMove={resetControlsTimer}
      onClick={togglePlay}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline />

      {/* Loading spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 size={48} className="animate-spin text-violet-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div className="absolute inset-0 z-20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 px-6 pt-5 pb-16 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-4">
              {onBack && (
                <button onClick={onBack} className="w-9 h-9 glass rounded-full flex items-center justify-center hover:bg-white/15 transition-all">
                  <ChevronLeft size={20} />
                </button>
              )}
              <h2 className="text-base font-semibold truncate">{title}</h2>
            </div>

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center gap-12 pointer-events-none">
              <motion.button className="w-12 h-12 glass rounded-full flex items-center justify-center pointer-events-auto"
                whileTap={{ scale: 0.85 }} onClick={() => skip(-10)}>
                <SkipBack size={20} />
              </motion.button>
              <motion.button className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center pointer-events-auto border border-white/20"
                whileTap={{ scale: 0.85 }} onClick={togglePlay}>
                {playing ? <Pause size={28} className="fill-white" /> : <Play size={28} className="fill-white ml-1" />}
              </motion.button>
              <motion.button className="w-12 h-12 glass rounded-full flex items-center justify-center pointer-events-auto"
                whileTap={{ scale: 0.85 }} onClick={() => skip(10)}>
                <SkipForward size={20} />
              </motion.button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-16 bg-gradient-to-t from-black/90 to-transparent">
              {/* Seek bar */}
              <div className="mb-4 relative h-1.5 group/seek cursor-pointer rounded-full bg-white/15 hover:h-3 transition-all duration-200"
                onClick={seek}>
                {/* Buffered */}
                <div className="absolute left-0 top-0 h-full rounded-full bg-white/20 transition-all"
                  style={{ width: `${bufferedPct}%` }} />
                {/* Progress */}
                <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                  style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="text-white hover:text-violet-300 transition-colors">
                    {playing ? <Pause size={22} className="fill-white" /> : <Play size={22} className="fill-white ml-0.5" />}
                  </button>
                  <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-colors">
                    <SkipBack size={18} />
                  </button>
                  <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-colors">
                    <SkipForward size={18} />
                  </button>
                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                      {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                      onChange={e => handleVolume(parseFloat(e.target.value))}
                      className="w-20 accent-violet-500 cursor-pointer" />
                  </div>
                  <span className="text-sm text-white/70 tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  {qualities.length > 1 && (
                    <div className="relative">
                      <button onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm">
                        <Settings size={16} /> {quality}
                      </button>
                      <AnimatePresence>
                        {showSettings && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                            className="absolute bottom-full right-0 mb-2 glass-strong rounded-xl overflow-hidden min-w-[100px]">
                            {qualities.map(q => (
                              <button key={q} onClick={() => { setQuality(q); setShowSettings(false) }}
                                className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${quality === q ? 'text-violet-400' : 'text-white/80'}`}>
                                {q}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <button className="text-white/70 hover:text-white transition-colors">
                    <Subtitles size={18} />
                  </button>
                  <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
                    {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
