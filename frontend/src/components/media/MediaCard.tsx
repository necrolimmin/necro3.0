'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, Film, Heart, Play, Plus, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { favoritesApi, watchlistApi } from '@/lib/api'

interface MediaCardProps {
  id: string
  title: string
  poster_url?: string
  poster_position_x?: number
  poster_position_y?: number
  backdrop_url?: string
  rating?: number
  runtime?: number
  release_date?: string
  genres?: string[]
  type: string
  watch_percentage?: number
  in_watchlist?: boolean
  in_favorite?: boolean
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
  release_date,
  genres = [],
  type,
  watch_percentage,
  in_watchlist = false,
  in_favorite = false,
  index = 0,
}: MediaCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(in_watchlist)
  const [liked, setLiked] = useState(in_favorite)
  const releaseYear = release_date ? new Date(release_date).getFullYear() : null
  const primaryGenre = genres[0]

  useEffect(() => setSaved(in_watchlist), [in_watchlist])
  useEffect(() => setLiked(in_favorite), [in_favorite])

  const refreshMediaQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    queryClient.invalidateQueries({ queryKey: ['favorites'] })
    queryClient.invalidateQueries({ queryKey: ['featured'] })
    queryClient.invalidateQueries({ queryKey: ['continue-watching'] })
    queryClient.invalidateQueries({ queryKey: ['movies'] })
    queryClient.invalidateQueries({ queryKey: ['latest'] })
    queryClient.invalidateQueries({ queryKey: ['series'] })
    queryClient.invalidateQueries({ queryKey: ['top-rated'] })
    queryClient.invalidateQueries({ queryKey: ['browse'] })
    queryClient.invalidateQueries({ queryKey: ['media', id] })
  }

  const toggleWatchlist = useMutation({
    mutationFn: async () => saved ? watchlistApi.remove(id) : watchlistApi.add(id),
    onSuccess: () => {
      const next = !saved
      setSaved(next)
      toast.success(next ? 'Added to My List' : 'Removed from My List')
      refreshMediaQueries()
    },
    onError: () => toast.error('Could not update My List'),
  })

  const toggleFavorite = useMutation({
    mutationFn: async () => liked ? favoritesApi.remove(id) : favoritesApi.add(id),
    onSuccess: () => {
      const next = !liked
      setLiked(next)
      toast.success(next ? 'Added to Favorites' : 'Removed from Favorites')
      refreshMediaQueries()
    },
    onError: () => toast.error('Could not update Favorites'),
  })

  return (
    <motion.div
      className="media-card group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/media/${id}`)}
    >
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

        <div className="media-card-overlay">
          <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2">
            {watch_percentage && watch_percentage > 0 && (
              <div className="progress-bar mb-1">
                <div className="progress-fill" style={{ width: `${watch_percentage}%` }} />
              </div>
            )}
            <p className="text-xs font-semibold text-white line-clamp-2 drop-shadow">{title}</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-xs text-white/60">
                {rating && <span className="flex items-center gap-1"><Star size={10} className="fill-yellow-400 text-yellow-400" />{rating.toFixed(1)}</span>}
                {runtime && <span className="hidden sm:flex items-center gap-1"><Clock size={10} />{runtime}m</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); router.push(`/watch/${id}`) }}
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-violet-100 transition-colors"
                  aria-label={`Play ${title}`}>
                  <Play size={12} className="fill-black text-black ml-0.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate() }}
                  disabled={toggleFavorite.isPending}
                  className={`w-7 h-7 glass rounded-full flex items-center justify-center transition-colors ${liked ? 'bg-rose-500/25 text-rose-200' : 'hover:bg-white/20'}`}
                  aria-label={liked ? `Remove ${title} from Favorites` : `Add ${title} to Favorites`}>
                  <Heart size={12} className={liked ? 'fill-current' : ''} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleWatchlist.mutate() }}
                  disabled={toggleWatchlist.isPending}
                  className={`w-7 h-7 glass rounded-full flex items-center justify-center transition-colors ${saved ? 'bg-violet-500/25 text-violet-200' : 'hover:bg-white/20'}`}
                  aria-label={saved ? `Remove ${title} from My List` : `Add ${title} to My List`}>
                  {saved ? <Check size={12} /> : <Plus size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="badge badge-nova text-[9px]">{type}</span>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-[13px] font-semibold text-white/82 truncate">{title}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-white/38">
          <span className="capitalize">{type}</span>
          {releaseYear && <span>{releaseYear}</span>}
          {primaryGenre && <span className="truncate">{primaryGenre}</span>}
          {rating && <span>{rating.toFixed(1)} IMDb</span>}
        </div>      </div>
    </motion.div>
  )
}

