'use client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { mediaApi } from '@/lib/api'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { Loader2 } from 'lucide-react'

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const mediaId = params.id as string
  const episodeId = searchParams.get('episode') || undefined

  const { data: media, isLoading } = useQuery({
    queryKey: ['media', mediaId],
    queryFn: () => mediaApi.get(mediaId).then(r => r.data),
  })

  if (isLoading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <Loader2 size={48} className="animate-spin text-violet-400" />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <VideoPlayer
        mediaId={mediaId}
        episodeId={episodeId}
        title={media?.title || ''}
        onBack={() => router.back()}
      />
    </div>
  )
}
