'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profilesApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Tv2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const COLORS = ['#7c3aed', '#0891b2', '#059669', '#dc2626', '#d97706', '#db2777', '#2563eb', '#9333ea']

export default function ProfilesPage() {
  const router = useRouter()
  const { user, setProfile, activeProfile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => profilesApi.list().then(r => r.data),
  })

  const createProfile = useMutation({
    mutationFn: () => profilesApi.create(newName, newColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setShowCreate(false)
      setNewName('')
      toast.success('Profile created')
    },
  })

  const deleteProfile = useMutation({
    mutationFn: (id: string) => profilesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })

  const selectProfile = (profile: any) => {
    setProfile(profile)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center px-6">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-violet-900/12 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <motion.div className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/50">
            <Tv2 size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Who's watching?</h1>
          <p className="text-white/50">Select your profile to continue</p>
        </div>

        <div className="flex flex-wrap justify-center gap-5 mb-8">
          {profiles.map((profile: any, i: number) => (
            <motion.div key={profile.id}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              className="relative group"
            >
              <button onClick={() => selectProfile(profile)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/6 transition-all group-hover:scale-105">
                <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg transition-all group-hover:shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${profile.avatar_color}, ${profile.avatar_color}aa)` }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                    : profile.name.charAt(0).toUpperCase()
                  }
                  {activeProfile?.id === profile.id && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center border-2 border-[#030712]">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{profile.name}</span>
              </button>
              <button onClick={() => deleteProfile.mutate(profile.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30">
                <Trash2 size={10} className="text-red-400" />
              </button>
            </motion.div>
          ))}

          {profiles.length < 5 && (
            <motion.button onClick={() => setShowCreate(true)}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: profiles.length * 0.07 }}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/6 transition-all group hover:scale-105">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-violet-500/50 transition-colors">
                <Plus size={28} className="text-white/30 group-hover:text-violet-400 transition-colors" />
              </div>
              <span className="text-sm font-medium text-white/40 group-hover:text-white/70 transition-colors">Add Profile</span>
            </motion.button>
          )}
        </div>

        {/* Create profile modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
              <motion.div className="glass-card p-8 w-full max-w-sm"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <h2 className="text-xl font-bold mb-6">New Profile</h2>

                {/* Preview */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${newColor}, ${newColor}aa)` }}>
                    {newName.charAt(0).toUpperCase() || '?'}
                  </div>
                </div>

                <div className="space-y-4">
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Profile name"
                    className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 transition-all" />

                  <div>
                    <p className="text-xs text-white/50 mb-2">Color</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setNewColor(c)}
                          className={`w-8 h-8 rounded-full transition-all ${newColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#030712] scale-110' : 'hover:scale-105'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowCreate(false)}
                      className="flex-1 px-4 py-2.5 glass rounded-xl text-sm font-medium hover:bg-white/10 transition-all">
                      Cancel
                    </button>
                    <button onClick={() => createProfile.mutate()} disabled={!newName.trim()}
                      className="flex-1 btn-nova text-sm py-2.5 disabled:opacity-40">
                      Create
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
