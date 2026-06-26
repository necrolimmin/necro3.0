'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Play, Info, Star, Clock, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/i18n'

interface MediaItem {
  id: string
  title: string
  description?: string
  backdrop_url?: string
  poster_url?: string
  poster_position_x?: number
  poster_position_y?: number
  rating?: number
  runtime?: number
  release_date?: string
  type: string
  genres: string[]
}

interface HeroBannerProps {
  items: MediaItem[]
}

export function HeroBanner({ items }: HeroBannerProps) {
  const [current, setCurrent] = useState(0)
  const [muted, setMuted] = useState(true)
  const router = useRouter()
  const { t } = useLanguage()
  const item = items[current]

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % items.length), 8000)
    return () => clearInterval(t)
  }, [items.length])

  if (!item) return null

  return (
    <div className="relative w-full h-[88vh] min-h-[620px] max-h-[920px] overflow-hidden">
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div key={item.id} className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {item.backdrop_url ? (
            <Image src={item.backdrop_url} alt={item.title} fill className="object-cover object-top" priority />
          ) : item.poster_url ? (
            <Image
              src={item.poster_url}
              alt={item.title}
              fill
              className="object-cover scale-110 blur-sm opacity-45"
              style={{ objectPosition: `${item.poster_position_x ?? 50}% ${item.poster_position_y ?? 50}%` }}
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-slate-900" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Gradients */}
      <div className="absolute inset-0 hero-bg z-10" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_72%_44%,rgba(124,58,237,0.24),transparent_20rem)]" />
      <div className="absolute top-0 left-0 right-0 h-32 cinematic-top z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-48 cinematic-bottom z-10" />

      {/* Content */}
      <div className="absolute inset-0 z-20 flex items-end pb-20 md:pb-24">
        <div className="w-full max-w-[1600px] mx-auto px-6 md:px-12 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-10 items-end">
          <AnimatePresence mode="wait">
            <motion.div key={item.id}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl"
            >
              {/* Badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className="section-kicker">{t.featured}</span>
                <span className="badge badge-nova">
                  {item.type === 'series' ? t.series : item.type === 'documentary' ? t.documentary : item.type === 'anime' ? t.anime : item.type === 'cartoon' ? t.cartoons : t.movie}
                </span>
                {item.genres.slice(0, 2).map(g => (
                  <span key={g} className="text-xs text-white/50 font-medium">{g}</span>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none mb-4"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                {item.title}
              </h1>

              {/* Meta */}
              <div className="flex items-center gap-4 mb-5 text-sm text-white/60">
                {item.rating && (
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-white font-semibold">{item.rating.toFixed(1)}</span>
                  </div>
                )}
                {item.runtime && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{Math.floor(item.runtime / 60)}h {item.runtime % 60}m</span>
                  </div>
                )}
                {item.release_date && (
                  <span>{new Date(item.release_date).getFullYear()}</span>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 line-clamp-3 max-w-xl"
                  style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
                  {item.description}
                </p>
              )}

              {/* CTA Buttons */}
              <div className="flex items-center gap-4">
                <motion.button
                  onClick={() => router.push(`/watch/${item.id}`)}
                  className="btn-nova flex items-center gap-2.5 text-base"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  <Play size={18} className="fill-white" />
                  {t.playNow}
                </motion.button>

                <motion.button
                  onClick={() => router.push(`/media/${item.id}`)}
                  className="flex items-center gap-2.5 px-6 py-3 glass rounded-xl text-sm font-semibold hover:bg-white/12 transition-all"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  <Info size={17} />
                  {t.moreInfo}
                </motion.button>

                <button onClick={() => setMuted(!muted)}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/12 transition-all">
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {item.poster_url && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${item.id}-poster`}
                initial={{ opacity: 0, x: 32, rotate: 2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:block justify-self-end"
              >
                <div className="poster-shell relative w-64 aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 shadow-cinematic">
                  <Image
                    src={item.poster_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    style={{ objectPosition: `${item.poster_position_x ?? 50}% ${item.poster_position_y ?? 50}%` }}
                    priority
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Slide Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-8 right-8 md:right-12 z-30 flex items-center gap-2">
          {items.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`transition-all duration-300 rounded-full ${
                i === current ? 'w-6 h-2 bg-violet-400' : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
