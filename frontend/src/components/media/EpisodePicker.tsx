'use client'

import { AlertCircle, CheckCircle2, Clock3, Play, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

type EpisodePickerProps = {
  media: any
  onSelect: (episodeId: string) => void
  onClose?: () => void
  fullScreen?: boolean
}

export function EpisodePicker({ media, onSelect, onClose, fullScreen = false }: EpisodePickerProps) {
  const { t } = useLanguage()
  const seasons = media?.seasons || []
  const episodeCount = seasons.reduce(
    (total: number, season: any) => total + (season.episodes?.length || 0),
    0,
  )

  return (
    <div className={`${fullScreen ? 'fixed inset-0' : 'fixed inset-0'} z-[80] overflow-y-auto bg-[#030712]/96 backdrop-blur-xl`}>
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-8 md:px-10">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-violet-300">{media?.title}</p>
            <h1 className="text-2xl font-bold md:text-3xl">{t.chooseEpisode}</h1>
            <p className="mt-2 text-sm text-white/45">{t.chooseEpisodeHint}</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/60 transition-all hover:bg-white/10 hover:text-white"
              aria-label={t.cancel}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {episodeCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
            <Clock3 size={42} className="text-violet-300/70" />
            <p className="text-lg font-semibold text-white/75">{t.noEpisodesReady}</p>
          </div>
        ) : (
          <div className="space-y-6 pb-10">
            {seasons.map((season: any) => (
              <section key={season.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                <div className="border-b border-white/8 px-5 py-4">
                  <h2 className="font-semibold">{season.name || `${t.season} ${season.season_number}`}</h2>
                  <p className="mt-0.5 text-xs text-white/40">
                    {season.episodes?.length || 0} {t.episodes.toLowerCase()}
                  </p>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {(season.episodes || []).map((episode: any) => {
                    const ready = episode.status === 'ready'
                    const failed = episode.status === 'error'
                    return (
                      <button
                        key={episode.id}
                        type="button"
                        disabled={!ready}
                        onClick={() => ready && onSelect(episode.id)}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors enabled:hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-65"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-200">
                          {episode.episode_number}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-white/90">{episode.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
                            {episode.runtime ? <span>{episode.runtime} min</span> : null}
                            {ready ? (
                              <span className="flex items-center gap-1 text-emerald-300">
                                <CheckCircle2 size={12} /> {t.readyToWatch}
                              </span>
                            ) : failed ? (
                              <span className="flex items-center gap-1 text-rose-300">
                                <AlertCircle size={12} /> {t.episodeFailed}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-300">
                                <Clock3 size={12} /> {t.episodeProcessing}
                              </span>
                            )}
                          </span>
                        </span>
                        {ready && <Play size={18} className="shrink-0 fill-current text-white/70" />}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
