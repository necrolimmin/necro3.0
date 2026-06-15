'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { watchlistApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Navbar } from '@/components/layout/Navbar'
import { MediaCard } from '@/components/media/MediaCard'

export default function MyListPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.list().then(r => r.data),
    enabled: !!user,
  })

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#030712]">
      <Navbar />
      <main className="pt-24 pb-20 max-w-[1600px] mx-auto px-6 md:px-12">
        <motion.div className="mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="section-kicker mb-3">Saved for later</div>
          <div className="flex items-center gap-3">
            <Bookmark size={28} className="text-violet-300" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My List</h1>
          </div>
          <p className="text-white/50 mt-2">Your saved movies and series in one place.</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="animate-spin text-violet-400" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {items.map((item: any, i: number) => <MediaCard key={item.id} {...item} index={i} />)}
          </div>
        ) : (
          <div className="min-h-[45vh] flex items-center justify-center text-center">
            <div>
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl glass flex items-center justify-center text-white/35">
                <Bookmark size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2">Your list is empty</h2>
              <p className="text-white/45 max-w-sm">Tap the plus button on any title to save it here.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}