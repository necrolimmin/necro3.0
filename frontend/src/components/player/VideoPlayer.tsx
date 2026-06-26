'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, ChevronLeft,
  Loader2, AlertCircle, Gauge, PictureInPicture2, RotateCcw, RotateCw
} from 'lucide-react'
import { mediaApi } from '@/lib/api'
import { useLanguage } from '@/lib/i18n'

type QualityOption = { label: string; level: number }

type SkipHint = { side: 'left' | 'right'; amount: number; key: number } | null

interface VideoPlayerProps {
  mediaId: string
  episodeId?: string
  title: string
  onBack?: () => void
  initialPosition?: number
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function VideoPlayer({ mediaId, episodeId, title, onBack, initialPosition = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimeout = useRef<NodeJS.Timeout>()
  const progressSaveTimeout = useRef<NodeJS.Timeout>()
  const clickTimeout = useRef<NodeJS.Timeout>()

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
  const [qualities, setQualities] = useState<QualityOption[]>([])
  const [playbackRate, setPlaybackRate] = useState(1)
  const [skipHint, setSkipHint] = useState<SkipHint>(null)
  const [settingsTab, setSettingsTab] = useState<'quality' | 'speed'>('quality')
  const { t } = useLanguage()

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  const saveProgressSoon = useCallback(() => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    clearTimeout(progressSaveTimeout.current)
    progressSaveTimeout.current = setTimeout(() => {
      mediaApi.updateProgress(mediaId, v.currentTime, v.duration, episodeId).catch(() => {})
    }, 8000)
  }, [mediaId, episodeId])

  useEffect(() => {
    const loadStream = async () => {
      try {
        setError(null)
        setLoading(true)
        setQualities([])
        setQuality('auto')
        hlsRef.current?.destroy()
        hlsRef.current = null

        const { data } = await mediaApi.stream(mediaId, episodeId)
        const hlsUrl = data.hls_url || data.url
        const video = videoRef.current
        if (!video || !hlsUrl) return
        const isHls = hlsUrl.includes('.m3u8') || hlsUrl.includes('/hls/')

        if (!isHls) {
          video.src = hlsUrl
          video.currentTime = initialPosition
          video.playbackRate = playbackRate
          video.play().catch(() => {})
        } else if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
          hlsRef.current = hls
          hls.loadSource(hlsUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            const seen = new Set<string>()
            const levelOptions = data.levels
              .map((level: any, index: number) => ({ label: `${level.height}p`, level: index, height: level.height }))
              .filter((item: any) => {
                if (!item.height || seen.has(item.label)) return false
                seen.add(item.label)
                return true
              })
              .sort((a: any, b: any) => a.height - b.height)
              .map(({ label, level }: any) => ({ label, level }))
            setQualities([{ label: 'auto', level: -1 }, ...levelOptions])
            video.currentTime = initialPosition
            video.playbackRate = playbackRate
            video.play().catch(() => {})
          })
          hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
            if (hls.autoLevelEnabled) setQuality('auto')
            const level = hls.levels[data.level]
            if (level?.height && !hls.autoLevelEnabled) setQuality(`${level.height}p`)
          })
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setError(t.streamError)
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl
          video.currentTime = initialPosition
          video.playbackRate = playbackRate
          video.play().catch(() => {})
        } else {
          setError('HLS not supported in this browser.')
        }
      } catch {
        setError(t.loadStreamError)
      }
    }
    loadStream()
    return () => {
      hlsRef.current?.destroy()
      clearTimeout(clickTimeout.current)
      clearTimeout(controlsTimeout.current)
      clearTimeout(progressSaveTimeout.current)
    }
  }, [mediaId, episodeId, initialPosition])

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
      saveProgressSoon()
    }
    const onDurationChange = () => setDuration(Number.isFinite(v.duration) ? v.duration : 0)
    const onVolumeChange = () => {
      setMuted(v.muted)
      setVolume(v.muted ? 0 : v.volume)
    }
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement)

    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('durationchange', onDurationChange)
    v.addEventListener('volumechange', onVolumeChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('durationchange', onDurationChange)
      v.removeEventListener('volumechange', onVolumeChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [saveProgressSoon])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = playbackRate
  }, [playbackRate])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
    resetControlsTimer()
  }, [resetControlsTimer])

  const seekToPercent = (pct: number) => {
    const v = videoRef.current
    if (!v || !duration) return
    v.currentTime = clamp(pct, 0, 1) * duration
    setCurrentTime(v.currentTime)
    resetControlsTimer()
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    seekToPercent((e.clientX - rect.left) / rect.width)
  }

  const skip = useCallback((secs: number, side?: 'left' | 'right') => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = clamp(v.currentTime + secs, 0, duration || Number.MAX_SAFE_INTEGER)
    setCurrentTime(v.currentTime)
    if (side) setSkipHint({ side, amount: Math.abs(secs), key: Date.now() })
    resetControlsTimer()
  }, [duration, resetControlsTimer])

  const handleVolume = (val: number) => {
    const v = videoRef.current
    if (!v) return
    const next = clamp(val, 0, 1)
    v.volume = next
    v.muted = next === 0
    setVolume(next)
    setMuted(next === 0)
  }

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    if (!v.muted && v.volume === 0) handleVolume(0.5)
    resetControlsTimer()
  }, [resetControlsTimer])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
    resetControlsTimer()
  }, [resetControlsTimer])

  const togglePictureInPicture = async () => {
    const v = videoRef.current
    if (!v || !document.pictureInPictureEnabled) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
    resetControlsTimer()
  }

  const handleQualityChange = (option: QualityOption) => {
    const hls = hlsRef.current
    if (hls) hls.currentLevel = option.level
    setQuality(option.label)
    setShowSettings(false)
    resetControlsTimer()
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed)
    setShowSettings(false)
    resetControlsTimer()
  }

  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-player-control="true"]')) return
    clearTimeout(clickTimeout.current)
    clickTimeout.current = setTimeout(() => togglePlay(), 180)
  }

  const handleSurfaceDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-player-control="true"]')) return
    clearTimeout(clickTimeout.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right'
    skip(side === 'left' ? -10 : 10, side)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
    if (['Space', 'KeyK', 'KeyJ', 'KeyL', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyF', 'KeyM', 'Comma', 'Period'].includes(e.code)) {
      e.preventDefault()
      resetControlsTimer()
    }
    if (e.code === 'Space' || e.code === 'KeyK') togglePlay()
    if (e.code === 'KeyJ' || e.code === 'ArrowLeft') skip(-10, 'left')
    if (e.code === 'KeyL' || e.code === 'ArrowRight') skip(10, 'right')
    if (e.code === 'ArrowUp') handleVolume(volume + 0.05)
    if (e.code === 'ArrowDown') handleVolume(volume - 0.05)
    if (e.code === 'KeyF') toggleFullscreen()
    if (e.code === 'KeyM') toggleMute()
    if (e.code === 'Comma') handleSpeedChange(Math.max(0.5, playbackRate - 0.25))
    if (e.code === 'Period') handleSpeedChange(Math.min(2, playbackRate + 0.25))
  }, [playbackRate, resetControlsTimer, skip, toggleFullscreen, toggleMute, togglePlay, volume])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const progress = duration ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration ? (buffered / duration) * 100 : 0
  const speedLabel = playbackRate === 1 ? t.normal : `${playbackRate}x`

  if (error) return (
    <div className="w-full aspect-video bg-black flex items-center justify-center rounded-2xl">
      <div className="text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
        <p className="text-white/70">{error}</p>
        <button onClick={() => { setError(null); window.location.reload() }} className="mt-4 btn-nova text-sm px-4 py-2">{t.retry}</button>
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden group select-none"
      onMouseMove={resetControlsTimer}
      onClick={handleSurfaceClick}
      onDoubleClick={handleSurfaceDoubleClick}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline />

      <AnimatePresence>
        {loading && (
          <motion.div className="absolute inset-0 flex items-center justify-center bg-black/35 z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 size={48} className="animate-spin text-violet-400" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {skipHint && (
          <motion.div
            key={skipHint.key}
            className={`pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 ${skipHint.side === 'left' ? 'left-16' : 'right-16'}`}
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.12 }}
            onAnimationComplete={() => setTimeout(() => setSkipHint(null), 350)}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl">
              {skipHint.side === 'left' ? <RotateCcw size={18} /> : <RotateCw size={18} />}
              {skipHint.amount}s
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div className="absolute inset-0 z-20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute top-0 left-0 right-0 px-4 md:px-6 pt-4 pb-16 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-4">
              {onBack && (
                <button data-player-control="true" onClick={onBack} className="w-10 h-10 rounded-full border border-white/12 bg-white/8 backdrop-blur-xl flex items-center justify-center hover:bg-white/15 transition-all">
                  <ChevronLeft size={21} />
                </button>
              )}
              <h2 className="text-sm md:text-base font-semibold truncate drop-shadow">{title}</h2>
              <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-white/55">
                {quality !== 'auto' && <span className="rounded-full bg-white/10 px-2 py-1">{quality}</span>}
                {playbackRate !== 1 && <span className="rounded-full bg-white/10 px-2 py-1">{playbackRate}x</span>}
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center gap-10 pointer-events-none">
              <motion.button data-player-control="true" className="w-12 h-12 rounded-full border border-white/15 bg-black/35 backdrop-blur-xl flex items-center justify-center pointer-events-auto hover:bg-white/12 transition-all"
                whileTap={{ scale: 0.85 }} onClick={() => skip(-10, 'left')}>
                <SkipBack size={20} />
              </motion.button>
              <motion.button data-player-control="true" className="w-16 h-16 bg-white/18 backdrop-blur-xl rounded-full flex items-center justify-center pointer-events-auto border border-white/20 shadow-[0_0_40px_rgba(124,58,237,0.35)] hover:bg-white/24 transition-all"
                whileTap={{ scale: 0.85 }} onClick={togglePlay}>
                {playing ? <Pause size={28} className="fill-white" /> : <Play size={28} className="fill-white ml-1" />}
              </motion.button>
              <motion.button data-player-control="true" className="w-12 h-12 rounded-full border border-white/15 bg-black/35 backdrop-blur-xl flex items-center justify-center pointer-events-auto hover:bg-white/12 transition-all"
                whileTap={{ scale: 0.85 }} onClick={() => skip(10, 'right')}>
                <SkipForward size={20} />
              </motion.button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-3 md:px-6 pb-4 pt-20 bg-gradient-to-t from-black via-black/78 to-transparent">
              <div data-player-control="true" className="mb-4 relative h-2 group/seek cursor-pointer rounded-full bg-white/[0.12] hover:bg-white/30 hover:h-3 transition-all duration-200"
                onClick={seek}>
                <div className="absolute left-0 top-0 h-full rounded-full bg-white/25 transition-all group-hover/seek:bg-white/40" style={{ width: `${bufferedPct}%` }} />
                <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div data-player-control="true" className="flex min-w-0 items-center gap-2 md:gap-3">
                  <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center text-white hover:text-violet-300 transition-colors">
                    {playing ? <Pause size={23} className="fill-white" /> : <Play size={23} className="fill-white ml-0.5" />}
                  </button>
                  <button onClick={() => skip(-10, 'left')} className="hidden sm:flex w-8 h-8 items-center justify-center text-white/70 hover:text-white transition-colors">
                    <SkipBack size={18} />
                  </button>
                  <button onClick={() => skip(10, 'right')} className="hidden sm:flex w-8 h-8 items-center justify-center text-white/70 hover:text-white transition-colors">
                    <SkipForward size={18} />
                  </button>
                  <div className="hidden md:flex items-center gap-2">
                    <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                      {muted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
                    </button>
                    <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                      onChange={e => handleVolume(parseFloat(e.target.value))}
                      className="player-volume w-24 cursor-pointer" />
                  </div>
                  <span className="truncate text-xs md:text-sm text-white/75 tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div data-player-control="true" className="flex shrink-0 items-center gap-2">
                  <div className="relative">
                    <button onClick={() => setShowSettings(!showSettings)}
                      className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-white/75 hover:bg-white/10 hover:text-white transition-colors text-sm">
                      <Settings size={17} /> <span className="hidden sm:inline">{quality}</span>
                    </button>
                    <AnimatePresence>
                      {showSettings && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                          className="absolute bottom-full right-0 mb-3 w-52 overflow-hidden rounded-xl border border-white/12 bg-black/82 shadow-2xl backdrop-blur-2xl">
                          <div className="grid grid-cols-2 border-b border-white/10 p-1">
                            <button onClick={() => setSettingsTab('quality')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${settingsTab === 'quality' ? 'bg-white/12 text-white' : 'text-white/55 hover:text-white'}`}>{t.quality}</button>
                            <button onClick={() => setSettingsTab('speed')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${settingsTab === 'speed' ? 'bg-white/12 text-white' : 'text-white/55 hover:text-white'}`}>{t.speed}</button>
                          </div>
                          {settingsTab === 'quality' ? (
                            <div className="max-h-64 overflow-y-auto py-1">
                              {(qualities.length > 1 ? qualities : [{ label: 'auto', level: -1 }]).map(q => (
                                <button key={q.label} onClick={() => handleQualityChange(q)}
                                  className={`flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-white/10 transition-colors ${quality === q.label ? 'text-violet-300' : 'text-white/80'}`}>
                                  <span>{q.label}</span>
                                  {quality === q.label && <span className="h-2 w-2 rounded-full bg-violet-400" />}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="max-h-64 overflow-y-auto py-1">
                              {SPEEDS.map(speed => (
                                <button key={speed} onClick={() => handleSpeedChange(speed)}
                                  className={`flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-white/10 transition-colors ${playbackRate === speed ? 'text-violet-300' : 'text-white/80'}`}>
                                  <span>{speed === 1 ? t.normal : `${speed}x`}</span>
                                  {playbackRate === speed && <span className="h-2 w-2 rounded-full bg-violet-400" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg px-2 text-white/75 hover:bg-white/10 hover:text-white transition-colors text-sm" onClick={() => { setSettingsTab('speed'); setShowSettings(true) }}>
                    <Gauge size={17} /> {speedLabel}
                  </button>
                  <button className="text-white/70 hover:text-white transition-colors">
                    <Subtitles size={18} />
                  </button>
                  <button onClick={togglePictureInPicture} className="hidden sm:block text-white/70 hover:text-white transition-colors">
                    <PictureInPicture2 size={18} />
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
