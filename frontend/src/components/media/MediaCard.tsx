'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Play, Star, Clock, Plus, Film } from 'lucide-react'
import { motion } from 'framer-motion'

interface MediaCardProps {
  id: string
  title: string
  poster_url?: string
  poster_position_x?: number
  poster_position_y?: number
  backdrop_url?: string
  rating?: number
  runtime?: number
  type: string
  watch_percentage?: number
  index?: number
}

export function MediaCard({
  id,
  title,
  poster_url,
  poster_position_x = 50,
  poster_position_y = 50,
  rating,
  runtime,
  type,
  watch_percentage,
  index = 0,
}: MediaCardProps) {
  const router = useRouter()

  return (
    <motion.div
      className="media-card group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/media/${id}`)}
    >
      {/* Poster */}
      <div className="poster-shell relative aspect-[2/3] bg-white/5 rounded-xl overflow-hidden">
        {poster_url ? (
          <Image
            src={poster_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: `${poster_position_x}% ${poster_position_y}%` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 via-slate-900 to-cyan-950/30 flex flex-col items-center justify-center gap-3">
            <Film size={28} className="text-white/20" />
            <span className="text-4xl font-bold text-white/20">{title.charAt(0)}</span>
          </div>
        )}

        {/* Overlay */}
        <div className="media-card-overlay">
          <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2">
            {/* Progress bar */}
            {watch_percentage && watch_percentage > 0 && (
              <div className="progress-bar mb-1">
                <div className="progress-fill" style={{ width: `${watch_percentage}%` }} />
              </div>
            )}
            <p className="text-xs font-semibold text-white line-clamp-2 drop-shadow">{title}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/60">
                {rating && <span className="flex items-center gap-1"><Star size={10} className="fill-yellow-400 text-yellow-400" />{rating.toFixed(1)}</span>}
                {runtime && <span className="flex items-center gap-1"><Clock size={10} />{runtime}m</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); router.push(`/watch/${id}`) }}
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-violet-100 transition-colors">
                  <Play size={12} className="fill-black text-black ml-0.5" />
                </button>
                <button onClick={(e) => e.stopPropagation()}
                  className="w-7 h-7 glass rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="badge badge-nova text-[9px]">{type}</span>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-[13px] font-semibold text-white/82 truncate">{title}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-white/38">
          <span className="capitalize">{type}</span>
          {rating && <span>{rating.toFixed(1)} IMDb</span>}
        </div>
      </div>
    </motion.div>
  )
}
