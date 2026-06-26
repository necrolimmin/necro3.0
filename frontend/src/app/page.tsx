'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { favoritesApi, mediaApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Navbar } from '@/components/layout/Navbar'
import { HeroBanner } from '@/components/media/HeroBanner'
import { MediaRow } from '@/components/media/MediaRow'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/i18n'

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { t } = useLanguage()

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: () => mediaApi.featured().then(r => r.data),
    enabled: !!user,
  })

  const { data: continueWatching = [], isLoading: cwLoading } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => mediaApi.continueWatching().then(r => r.data),
    enabled: !!user,
  })

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.list().then(r => r.data),
    enabled: !!user,
  })

  const { data: movies, isLoading: moviesLoading } = useQuery({
    queryKey: ['movies'],
    queryFn: () => mediaApi.list({ type: 'movie', limit: 20 }).then(r => r.data.items),
    enabled: !!user,
  })

  const { data: latest, isLoading: latestLoading } = useQuery({
    queryKey: ['latest'],
    queryFn: () => mediaApi.list({ sort: '-created_at', limit: 20 }).then(r => r.data.items),
    enabled: !!user,
  })
  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => mediaApi.list({ type: 'series', limit: 20 }).then(r => r.data.items),
    enabled: !!user,
  })
  const { data: cartoons, isLoading: cartoonsLoading } = useQuery({
    queryKey: ['cartoons'],
    queryFn: () => mediaApi.list({ type: 'cartoon', limit: 20 }).then(r => r.data.items),
    enabled: !!user,
  })

  const { data: topRated, isLoading: trLoading } = useQuery({
    queryKey: ['top-rated'],
    queryFn: () => mediaApi.list({ sort: '-rating', limit: 20 }).then(r => r.data.items),
    enabled: !!user,
  })

  if (!user) return null

  return (
    <div className="page-canvas">
      <Navbar />

      {/* Hero */}
      {featuredLoading ? (
        <div className="w-full h-[85vh] skeleton" />
      ) : featured.length > 0 ? (
        <HeroBanner items={featured} />
      ) : (
        <div className="w-full h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-white/60">{t.welcome}</h2>
            <p className="text-white/40">{t.addMedia}</p>
          </div>
        </div>
      )}

      {/* Content Rows */}
      <div className="relative z-10 -mt-16 pb-20 flex flex-col gap-12">
        {continueWatching.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <MediaRow title={t.continueWatching} items={continueWatching} loading={cwLoading} />
          </motion.div>
        )}

        {favorites.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <MediaRow title={t.favorites} items={favorites} loading={favoritesLoading} />
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <MediaRow title={t.newReleases} items={latest || []} loading={latestLoading} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <MediaRow title={t.movies} items={movies || []} loading={moviesLoading} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <MediaRow title={t.tvSeries} items={series || []} loading={seriesLoading} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <MediaRow title={t.cartoons} items={cartoons || []} loading={cartoonsLoading} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <MediaRow title={t.topRated} items={topRated || []} loading={trLoading} />
        </motion.div>
      </div>
    </div>
  )
}
