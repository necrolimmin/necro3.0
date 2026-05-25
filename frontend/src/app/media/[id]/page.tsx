'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { Play, Plus, Star, Clock, Calendar, Bookmark, Heart, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { mediaApi } from '@/lib/api'
import { Navbar } from '@/components/layout/Navbar'
import { Loader2 } from 'lucide-react'

export default function MediaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const mediaId = params.id as string
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null)

  const { data: media, isLoading } = useQuery({
    queryKey: ['media', mediaId],
    queryFn: () => mediaApi.get(mediaId).then(r => r.data),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <Loader2 size={48} className="animate-spin text-violet-400" />
    </div>
  )
  if (!media) return null

  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />

      {/* Backdrop Hero */}
      <div className="relative h-[65vh] min-h-[500px]">
        {media.backdrop_url && (
          <Image src={media.backdrop_url} alt={media.title} fill className="object-cover object-top" />
        )}
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute bottom-0 left-0 right-0 h-64 cinematic-bottom" />
        <div className="absolute top-0 left-0 right-0 h-32 cinematic-top" />
      </div>

      {/* Main Content */}
      <div className="relative -mt-32 z-10 max-w-[1400px] mx-auto px-6 md:px-12 pb-20">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Poster */}
          <motion.div className="shrink-0 w-44 md:w-60 mx-auto md:mx-0"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-cinematic border border-white/10">
              {media.poster_url ? (
                <Image
                  src={media.poster_url}
                  alt={media.title}
                  width={240}
                  height={360}
                  className="object-cover w-full h-full"
                  style={{ objectPosition: `${media.poster_position_x ?? 50}% ${media.poster_position_y ?? 50}%` }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-900/40 to-slate-800 flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/20">{media.title.charAt(0)}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Info */}
          <motion.div className="flex-1 pt-0 md:pt-24"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {media.genres?.map((g: string) => (
                <span key={g} className="badge badge-nova">{g}</span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">{media.title}</h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-white/60">
              {media.rating && (
                <span className="flex items-center gap-1.5 text-white">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <strong>{media.rating.toFixed(1)}</strong>
                </span>
              )}
              {media.runtime && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {Math.floor(media.runtime/60)}h {media.runtime%60}m
                </span>
              )}
              {media.release_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} /> {new Date(media.release_date).getFullYear()}
                </span>
              )}
              <span className="badge badge-hd">HD</span>
            </div>

            {/* Description */}
            {media.description && (
              <p className="text-white/70 text-base leading-relaxed max-w-2xl mb-8">{media.description}</p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                onClick={() => router.push(`/watch/${mediaId}`)}
                className="btn-nova flex items-center gap-2.5"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                <Play size={18} className="fill-white" /> Play Now
              </motion.button>

              <motion.button className="flex items-center gap-2 px-5 py-3 glass rounded-xl text-sm font-medium hover:bg-white/12 transition-all"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Plus size={16} /> Watchlist
              </motion.button>

              <motion.button className="w-11 h-11 glass rounded-xl flex items-center justify-center hover:bg-white/12 transition-all"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Heart size={18} className="text-white/70" />
              </motion.button>

              <motion.button className="w-11 h-11 glass rounded-xl flex items-center justify-center hover:bg-white/12 transition-all"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Bookmark size={18} className="text-white/70" />
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Seasons & Episodes */}
        {media.seasons && media.seasons.length > 0 && (
          <motion.div className="mt-16"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-2xl font-bold mb-6">Episodes</h2>
            <div className="flex flex-col gap-3">
              {media.seasons.map((season: any) => (
                <div key={season.id} className="glass-card overflow-hidden">
                  <button
                    onClick={() => setExpandedSeason(expandedSeason === season.id ? null : season.id)}
                    className="w-full flex items-center justify-between p-5 hover:bg-white/4 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {season.poster_url && (
                        <Image src={season.poster_url} alt={season.name || ''} width={48} height={72} className="rounded-lg object-cover" />
                      )}
                      <div className="text-left">
                        <p className="font-semibold">{season.name || `Season ${season.season_number}`}</p>
                        <p className="text-sm text-white/50">{season.episodes?.length || 0} episodes</p>
                      </div>
                    </div>
                    {expandedSeason === season.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  <AnimatePresence>
                    {expandedSeason === season.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden border-t border-white/8">
                        {season.episodes?.map((ep: any) => (
                          <div key={ep.id}
                            onClick={() => router.push(`/watch/${mediaId}?episode=${ep.id}`)}
                            className="flex items-start gap-4 p-4 hover:bg-white/4 cursor-pointer transition-colors border-b border-white/4 last:border-0"
                          >
                            <div className="w-8 h-8 shrink-0 rounded-lg bg-white/8 flex items-center justify-center text-sm font-bold text-white/50">
                              {ep.episode_number}
                            </div>
                            {ep.thumbnail_url && (
                              <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0">
                                <Image src={ep.thumbnail_url} alt={ep.title} fill className="object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
                                  <Play size={20} className="fill-white" />
                                </div>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1 truncate">{ep.title}</p>
                              <p className="text-xs text-white/50 line-clamp-2">{ep.description}</p>
                              {ep.runtime && <p className="text-xs text-white/40 mt-1">{ep.runtime}m</p>}
                            </div>
                            <Play size={18} className="shrink-0 text-white/30 mt-1" />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
